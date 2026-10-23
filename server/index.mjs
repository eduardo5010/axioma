import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { initializeApp as iniciarFirebase, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import {
  dbPronto,
  prepararBanco,
  listarPropostas,
  criarProposta,
  gravarAnalise,
  alternarVoto,
  alterarStatus,
  buscarAutor,
  buscarProposta,
  propostasSemAnalise,
  contarPropostasDispositivo,
  excluirProposta,
  excluirConta,
  gravarVinculo,
  buscaVinculo,
  STATUS_VALIDOS,
} from './db.mjs';
import { analisarProposta, iaDisponivel } from './ia.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const FRONT_BASE = (process.env.MP_BACK_URL ?? 'http://localhost:5174').replace(/\/+$/, '').split('#')[0];
const LIMITE_SEM_CONTA = Number(process.env.PROPOSTAS_DISPOSITIVO_DIA ?? 3);

// O Mercado Pago recusa "localhost" em back_url; 127.0.0.1 é aceito (mesmo host).
function BACK_URL_API() {
  const u = new URL(FRONT_BASE);
  if (u.hostname === 'localhost') u.hostname = '127.0.0.1';
  return u.toString().replace(/\/$/, '');
}
const PRECO = Number(process.env.MP_PRECO_DEFAULT ?? 5);
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';
// Em sandbox (credenciais de teste), o pagador precisa ser um USUÁRIO DE TESTE do Mercado Pago.
// Se MP_SANDBOX_PAYER_EMAIL estiver definido, ele substitui o email enviado pelo app (que, sendo
// uma conta real, quebra a regra "pagador e cobrador devem ser reais ou ambos de teste").
const MP_SANDBOX_PAYER_EMAIL = process.env.MP_SANDBOX_PAYER_EMAIL ?? '';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';
const MP_PUBLIC_KEY = process.env.MP_PUBLIC_KEY ?? '';

const ADMINS = new Set(
  String(process.env.ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

// Firebase Admin: usado SOMENTE para verificar o token de login (Auth). O banco é o Postgres (Neon).
// A conta de serviço pode vir de um arquivo (GOOGLE_APPLICATION_CREDENTIALS, dev) ou do JSON
// direto em GOOGLE_APPLICATION_CREDENTIALS_JSON (nuvem/Paas, onde não existe caminho de arquivo).
let authAdmin = null;
try {
  const jsonInline = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const caminhoConta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const conta = jsonInline
    ? JSON.parse(jsonInline)
    : caminhoConta
      ? JSON.parse(fs.readFileSync(caminhoConta, 'utf8'))
      : null;
  const app = conta
    ? iniciarFirebase({ credential: cert(conta) })
    : iniciarFirebase();
  authAdmin = getAuth(app);
} catch (e) {
  console.warn('firebase-admin indisponível:', e.message);
}

if (dbPronto) {
  prepararBanco()
    .then(() => reanalisarPendentes())
    .catch((e) => console.warn('postgres prepararBanco:', e?.message ?? e));
}

// Refaz a análise de propostas que ficaram pendentes/falharam (ex.: chave da IA ativada depois).
async function reanalisarPendentes() {
  if (!iaDisponivel) return;
  try {
    const pendentes = await propostasSemAnalise();
    if (!pendentes.length) return;
    console.log(`[axioma-server] Analisando ${pendentes.length} proposta(s) pendente(s)…`);
    for (const p of pendentes) {
      try {
        const a = await analisarProposta(p.titulo, p.descricao);
        await gravarAnalise(p.id, a, a ? 'pronta' : 'pendente');
      } catch (e) {
        console.warn(`[axioma-server] análise da proposta ${p.id}:`, e?.message ?? e);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch (e) {
    console.warn('[axioma-server] backfill de análises:', e?.message ?? e);
  }
}

const mp = MP_ACCESS_TOKEN ? new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN }) : null;
const preApproval = mp ? new PreApproval(mp) : null;

function erroPublico(e) {
  return e?.publico ? e.message : 'Falha interna no servidor.';
}

async function autorizarUID(req) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (authAdmin && token) {
    try {
      const verificado = await authAdmin.verifyIdToken(token);
      return String(verificado.uid);
    } catch {
      return null;
    }
  }
  return String(req.body?.uid ?? '');
}

function conferirAssinatura(req, dataId) {
  if (!WEBHOOK_SECRET) return true;
  const xSig = req.headers['x-signature'];
  const xReq = req.headers['x-request-id'] ?? '';
  if (typeof xSig !== 'string') return false;
  const partes = xSig.split(',');
  const ts = partes.find((p) => p.startsWith('ts='))?.slice(3) ?? '';
  const hash = partes.find((p) => p.startsWith('v1='))?.slice(3) ?? '';
  const manifesto = `id:${dataId};request-id:${xReq};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifesto).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(hash));
  } catch {
    return false;
  }
}

function aplicarStatusMembro(p) {
  const uid = String(p?.external_reference ?? '');
  if (!uid) return;
  const status = String(p?.status ?? '');
  void gravarVinculo(uid, {
    preapproval_id: String(p?.id ?? ''),
    ativo: status === 'authorized',
    estado: status,
    desde: status === 'authorized' ? new Date().toISOString() : null,
    atualizadoEm: new Date().toISOString(),
  });
}

const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? '*').split(','), methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json());

// --- Propostas (Roteiro & Votações) -------------------------------------------

app.get('/api/propostas', async (_req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  try {
    res.json(await listarPropostas());
  } catch (e) {
    res.status(502).json({ erro: `Falha ao ler as propostas: ${erroPublico(e)}` });
  }
});

app.post('/api/propostas', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uid = await autorizarUID(req);
  const deviceId = String(req.body?.device_id ?? '').slice(0, 80).trim();
  if (!uid && !deviceId) {
    return res.status(400).json({ erro: 'Autenticação ou identificador de dispositivo necessário.' });
  }
  const titulo = String(req.body?.titulo ?? '').trim().slice(0, 140);
  const descricao = String(req.body?.descricao ?? '').trim().slice(0, 1000);
  const nome = String(req.body?.nome ?? '').trim().slice(0, 120);
  if (titulo.length < 5 || descricao.length < 5) {
    return res.status(422).json({ erro: 'Título e descrição precisam de pelo menos 5 caracteres.' });
  }
  if (!uid) {
    try {
      const jaCriadas = await contarPropostasDispositivo(deviceId);
      if (jaCriadas >= LIMITE_SEM_CONTA) {
        return res.status(429).json({
          erro: `Sem conta, são até ${LIMITE_SEM_CONTA} propostas por dispositivo por dia. Entre com o Google para propor mais.`,
        });
      }
    } catch (e) {
      console.warn('limite sem conta:', e?.message ?? e);
    }
  }
  let criada;
  try {
    criada = await criarProposta({
      titulo,
      descricao,
      autorUid: uid,
      autorNome: nome || 'Anônimo',
      deviceId: uid ? null : deviceId,
    });
  } catch (e) {
    return res.status(502).json({ erro: `Não foi possível publicar a proposta: ${erroPublico(e)}` });
  }

  // Análise por IA, assíncrona: não bloqueia a criação nem o leitor.
  void (async () => {
    try {
      const analise = await analisarProposta(titulo, descricao);
      if (analise) await gravarAnalise(criada.id, analise, 'pronta');
    } catch (e) {
      console.warn('analise IA:', e?.message ?? e);
      await gravarAnalise(criada.id, null, 'erro').catch(() => undefined);
    }
  })();

  res.status(201).json(criada);
});

app.post('/api/propostas/:id/votar', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uid = await autorizarUID(req);
  if (!uid) return res.status(400).json({ erro: 'Autenticação necessária.' });
  try {
    const r = await alternarVoto(req.params.id, uid);
    if (!r.ok) return res.status(404).json({ erro: r.erro });
    res.json({ ok: true, acao: r.acao });
  } catch (e) {
    res.status(502).json({ erro: `Não foi possível registrar o voto: ${erroPublico(e)}` });
  }
});

app.patch('/api/propostas/:id/status', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uid = await autorizarUID(req);
  const deviceId = String(req.body?.device_id ?? '').slice(0, 80).trim();
  const status = String(req.body?.status ?? '');
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(422).json({ erro: 'Status inválido.' });
  }
  try {
    const linha = await buscarAutor(req.params.id);
    if (!linha) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    const eAutor = (uid && linha.autor_uid === uid) || (deviceId && linha.device_id === deviceId);
    if (!eAutor && !(uid && ADMINS.has(uid))) {
      return res.status(403).json({ erro: 'Só o autor (ou um administrador) muda o status.' });
    }
    const nova = await alterarStatus(req.params.id, status);
    res.json(nova);
  } catch (e) {
    res.status(502).json({ erro: `Não foi possível mudar o status: ${erroPublico(e)}` });
  }
});

app.delete('/api/propostas/:id', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uid = await autorizarUID(req);
  const deviceId = String(req.body?.device_id ?? '').slice(0, 80).trim();
  try {
    const linha = await buscarAutor(req.params.id);
    if (!linha) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    const eAutor = (uid && linha.autor_uid === uid) || (deviceId && linha.device_id === deviceId);
    if (!eAutor) return res.status(403).json({ erro: 'Só o autor pode excluir a proposta.' });
    await excluirProposta(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ erro: `Não foi possível excluir: ${erroPublico(e)}` });
  }
});

app.post('/api/propostas/:id/analisar', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  if (!iaDisponivel) {
    return res.status(503).json({ erro: 'Análise por IA não configurada (GEMINI_API_KEY ausente).' });
  }
  const uid = await autorizarUID(req);
  const deviceId = String(req.body?.device_id ?? '').slice(0, 80).trim();
  try {
    const linha = await buscarProposta(req.params.id);
    if (!linha) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    const eAutor = (uid && linha.autor_uid === uid) || (deviceId && linha.device_id === deviceId);
    if (!eAutor && !(uid && ADMINS.has(uid))) {
      return res.status(403).json({ erro: 'Só o autor (ou um administrador) reanalisa a proposta.' });
    }
  } catch (e) {
    return res.status(502).json({ erro: `Não foi possível agendar a análise: ${erroPublico(e)}` });
  }

  void (async () => {
    try {
      const linha = await buscarProposta(req.params.id);
      if (!linha) return;
      await gravarAnalise(linha.id, null, 'pendente');
      const a = await analisarProposta(linha.titulo, linha.descricao);
      await gravarAnalise(linha.id, a, a ? 'pronta' : 'pendente');
    } catch (e) {
      console.warn(`reanálise ${req.params.id}:`, e?.message ?? e);
      await gravarAnalise(req.params.id, null, 'erro').catch(() => undefined);
    }
  })();

  res.status(202).json({ ok: true });
});

// --- Conta (LGPD: exportar / excluir) -----------------------------------------

app.post('/api/conta/excluir', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uid = await autorizarUID(req);
  if (!uid) return res.status(400).json({ erro: 'Autenticação necessária.' });
  try {
    await excluirConta(uid);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ erro: `Não foi possível excluir os dados: ${erroPublico(e)}` });
  }
});

// --- Membros (status de assinatura) -------------------------------------------

app.get('/api/membros/:uid', async (req, res) => {
  if (!dbPronto) return res.status(503).json({ erro: 'Banco de dados não configurado no servidor.' });
  const uidToken = await autorizarUID(req);
  const uid = req.params.uid;
  if (!uidToken || uidToken !== uid) return res.status(403).json({ erro: 'Não autorizado.' });
  res.json(await buscaVinculo(uid));
});

// --- Mercado Pago -------------------------------------------------------------

app.get('/api/mp/config', (_req, res) => {
  res.json({
    habilitado: Boolean(preApproval && MP_PUBLIC_KEY),
    preco: PRECO,
    moeda: 'BRL',
    razao: `Assinatura mensal — R$ ${PRECO.toFixed(2)}/mês`,
    backUrl: BACK_URL_API(),
  });
});

app.post('/api/mp/assinar', async (req, res) => {
  const uid = await autorizarUID(req);
  const email = String(req.body?.email ?? '');
  if (!uid) return res.status(400).json({ erro: 'Autenticação necessária.' });
  if (!preApproval) return res.status(503).json({ erro: 'Mercado Pago não configurado no servidor.' });
  try {
    const criado = await preApproval.create({
      body: {
        reason: `Apoio mensal ao Axioma (R$ ${PRECO}/mês)`,
        external_reference: String(uid),
        ...(email || MP_SANDBOX_PAYER_EMAIL ? { payer_email: MP_SANDBOX_PAYER_EMAIL || email } : {}),
        back_url: BACK_URL_API(),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECO,
          currency_id: 'BRL',
        },
      },
    });
    const id = criado?.id ?? criado?.other?.id;
    const initPoint = criado?.init_point ?? criado?.other?.init_point;
    if (!initPoint) {
      return res.status(502).json({ erro: 'O Mercado Pago não retornou o link de pagamento.' });
    }
    await gravarVinculo(uid, {
      preapproval_id: String(id ?? ''),
      ativo: false,
      estado: 'pendente',
      atualizadoEm: new Date().toISOString(),
    });
    return res.json({ init_point: String(initPoint), preapproval_id: id });
  } catch (e) {
    const msg = e?.message ?? String(e);
    console.error('assinar:', msg);
    return res.status(502).json({ erro: `Falha no Mercado Pago: ${msg}` });
  }
});

app.post('/api/mp/cancelar', async (req, res) => {
  const uid = await autorizarUID(req);
  if (!uid) return res.status(400).json({ erro: 'Autenticação necessária.' });
  try {
    const vinculo = await buscaVinculo(uid);
    const preId = vinculo?.preapproval_id;
    if (preId && preApproval) {
      await preApproval.cancel({ id: String(preId) }).catch((e) => console.warn('cancelar MP:', e?.message));
    }
    if (preId || vinculo) {
      await gravarVinculo(uid, {
        ativo: false,
        estado: 'cancelada_pelo_usuario',
        atualizadoEm: new Date().toISOString(),
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(502).json({ erro: `Falha ao cancelar: ${e?.message ?? e}` });
  }
});

app.get('/api/mp/webhook', (_req, res) => {
  res.sendStatus(200);
});

app.post('/api/mp/webhook', (req, res) => {
  res.sendStatus(200);
  void (async () => {
    try {
      const body = req.body ?? {};
      const tipo = String(body?.type ?? req.query.type ?? '');
      const dataId = String(body?.data?.id ?? req.query.data_id ?? '');
      if (!dataId) return;
      if (!conferirAssinatura(req, dataId)) {
        console.warn('webhook recusado: assinatura inválida');
        return;
      }
      if (tipo === 'preapproval') {
        const p = await preApproval?.get({ id: dataId });
        aplicarStatusMembro(p);
      }
    } catch (e) {
      console.error('webhook:', e?.message ?? e);
    }
  })();
});

// Em produção, o mesmo processo serve o frontend pronto (dist/) + a API (um único serviço).
// Em dev (sem dist/), apenas a API responde; o Vite cuida da interface.
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIST = process.env.STATIC_DIR ?? path.resolve(AQUI, '../dist');
const INDEX_HTML = path.join(DIST, 'index.html');
if (fs.existsSync(INDEX_HTML)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(INDEX_HTML);
  });
}
app.use('/api', (_req, res) => res.status(404).json({ erro: 'rota não encontrada' }));

app.listen(PORT, () => {
  console.log(`[axioma-server] http://localhost:${PORT}`);
  console.log(`[axioma-server] MP configurado: ${Boolean(preApproval)} | Postgres: ${dbPronto}`);
  console.log(`[axioma-server] Frontend estático: ${fs.existsSync(INDEX_HTML) ? `servindo ${DIST}` : 'desligado (dev)'}`);
});