import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? '';

export let sql = null;
export const dbPronto = Boolean(url);

if (dbPronto) {
  sql = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
  const { host, database, user } = sql.options;
  console.log(`[axioma-server] Postgres Neo: ${user}@${host}/${database}`);
}

export async function prepararBanco() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS propostas (
      id BIGSERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      autor_uid TEXT,
      autor_nome TEXT NOT NULL,
      device_id TEXT,
      status TEXT NOT NULL DEFAULT 'votacao'
        CHECK (status IN ('votacao','aprovada','desenvolvimento','implementada','recusada')),
      votos INTEGER NOT NULL DEFAULT 0,
      votos_por TEXT[] NOT NULL DEFAULT '{}',
      analise JSONB,
      analise_status TEXT NOT NULL DEFAULT 'pendente',
      criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    ALTER TABLE propostas
      ADD COLUMN IF NOT EXISTS device_id TEXT,
      ADD COLUMN IF NOT EXISTS analise JSONB,
      ADD COLUMN IF NOT EXISTS analise_status TEXT NOT NULL DEFAULT 'pendente';
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS membros (
      uid TEXT PRIMARY KEY,
      preapproval_id TEXT,
      ativo BOOLEAN NOT NULL DEFAULT false,
      estado TEXT,
      desde TIMESTAMPTZ,
      atualizado_em TIMESTAMPTZ
    );
  `;
  console.log('[axioma-server] Esquema do banco pronto.');
}

export const STATUS_VALIDOS = ['votacao', 'aprovada', 'desenvolvimento', 'implementada', 'recusada'];

export async function listarPropostas() {
  return sql`
    SELECT id::text AS id, titulo, descricao, autor_uid, autor_nome, device_id, status, votos, votos_por, analise, analise_status, criada_em
    FROM propostas
    ORDER BY criada_em DESC;
  `;
}

export async function criarProposta({ titulo, descricao, autorUid, autorNome, deviceId }) {
  const [linha] = await sql`
    INSERT INTO propostas (titulo, descricao, autor_uid, autor_nome, device_id)
    VALUES (${titulo}, ${descricao}, ${autorUid ?? null}, ${autorNome}, ${deviceId ?? null})
    RETURNING id::text AS id, titulo, descricao, autor_uid, autor_nome, device_id, status, votos, votos_por, analise, analise_status, criada_em;
  `;
  return linha;
}

export async function gravarAnalise(id, analise, status) {
  await sql`
    UPDATE propostas
    SET analise = ${analise ?? null}, analise_status = ${status}
    WHERE id = ${id}::bigint;
  `;
}

export async function buscarAutor(id) {
  const [linha] = await sql`
    SELECT id::text AS id, autor_uid, device_id FROM propostas WHERE id = ${id}::bigint;
  `;
  return linha ?? null;
}

export async function buscarProposta(id) {
  const [linha] = await sql`
    SELECT id::text AS id, titulo, descricao, autor_uid, device_id, autor_nome
    FROM propostas
    WHERE id = ${id}::bigint;
  `;
  return linha ?? null;
}

export async function propostasSemAnalise(limite = 50) {
  return sql`
    SELECT id::text AS id, titulo, descricao, analise_status
    FROM propostas
    WHERE analise_status IS DISTINCT FROM 'pronta'
    ORDER BY criada_em DESC
    LIMIT ${limite};
  `;
}

export async function contarPropostasDispositivo(deviceId, dias = 1) {
  if (!deviceId) return 0;
  const [r] = await sql`
    SELECT count(*)::int AS total
    FROM propostas
    WHERE device_id = ${deviceId} AND criada_em > now() - (${dias} * interval '1 day');
  `;
  return r?.total ?? 0;
}

export async function alternarVoto(id, uid) {
  const resultado = { voto: null };
  const ok = await sql.begin(async (tx) => {
    const [linha] = await tx`
      SELECT id::text AS id, autor_uid, votos_por
      FROM propostas
      WHERE id = ${id}::bigint
      FOR UPDATE;
    `;
    if (!linha) throw Object.assign(new Error('Proposta não encontrada.'), { publico: true });
    if (linha.autor_uid === uid) {
      throw Object.assign(new Error('Você não vota na própria proposta.'), { publico: true });
    }
    const votosPor = Array.isArray(linha.votos_por) ? linha.votos_por : [];
    const jaVotou = votosPor.includes(uid);
    const novo = jaVotou ? votosPor.filter((v) => v !== uid) : [...votosPor, uid];
    await tx`
      UPDATE propostas SET votos_por = ${novo}, votos = ${novo.length}
      WHERE id = ${id}::bigint;
    `;
    resultado.voto = jaVotou ? 'removido' : 'adicionado';
    return true;
  });
  if (!ok) return { ok: false, erro: 'Falha ao registrar o voto.' };
  return { ok: true, acao: resultado.voto };
}

export async function alterarStatus(id, status) {
  const [linha] = await sql`
    UPDATE propostas SET status = ${status}
    WHERE id = ${id}::bigint
    RETURNING id::text AS id, status;
  `;
  return linha;
}

export async function excluirProposta(id) {
  await sql`DELETE FROM propostas WHERE id = ${id}::bigint;`;
}

export async function excluirConta(uid) {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM propostas WHERE autor_uid = ${uid};`;
    const afetadas = await tx`
      SELECT id, votos_por FROM propostas WHERE ${uid} = ANY(votos_por);
    `;
    for (const a of afetadas) {
      const novo = Array.isArray(a.votos_por) ? a.votos_por.filter((v) => v !== uid) : [];
      await tx`
        UPDATE propostas SET votos_por = ${novo}, votos = ${novo.length}
        WHERE id = ${a.id};
      `;
    }
    await tx`DELETE FROM membros WHERE uid = ${uid};`;
  });
}

export async function gravarVinculo(uid, dados) {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO membros (uid, preapproval_id, ativo, estado, desde, atualizado_em)
      VALUES (
        ${uid},
        ${dados.preapproval_id ?? null},
        ${Boolean(dados.ativo ?? false)},
        ${dados.estado ?? null},
        ${dados.desde ?? null},
        ${new Date().toISOString()}
      )
      ON CONFLICT (uid) DO UPDATE SET
        preapproval_id = EXCLUDED.preapproval_id,
        ativo = EXCLUDED.ativo,
        estado = EXCLUDED.estado,
        desde = EXCLUDED.desde,
        atualizado_em = EXCLUDED.atualizado_em;
    `;
  } catch (e) {
    console.warn('postgres gravarVinculo:', e?.message ?? e);
  }
}

export async function buscaVinculo(uid) {
  if (!sql) return null;
  try {
    const [linha] = await sql`SELECT * FROM membros WHERE uid = ${uid};`;
    if (!linha) return null;
    return {
      preapproval_id: linha.preapproval_id ? String(linha.preapproval_id) : null,
      ativo: Boolean(linha.ativo),
      estado: linha.estado ?? null,
      desde: linha.desde ? new Date(linha.desde).toISOString() : null,
      atualizado_em: linha.atualizado_em ? new Date(linha.atualizado_em).toISOString() : null,
    };
  } catch (e) {
    console.warn('postgres buscaVinculo:', e?.message ?? e);
    return null;
  }
}

export async function fecharBanco() {
  if (sql) await sql.end({ timeout: 5 }).catch(() => undefined);
}