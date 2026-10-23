import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ErroLogin, tokenAtual, useAuth, entrarComGoogle } from './auth';
import { deviceId } from '../lib/device';
import '../propostas.css';

export interface AnaliseQuebra {
  campo?: string;
  risco?: 'alta' | 'media' | 'baixa' | string;
  descricao?: string;
}

export interface AnaliseProposta {
  resumo?: string;
  mudancas?: string[];
  quebras?: AnaliseQuebra[];
  afeta?: string[];
}

export type StatusProposta = 'votacao' | 'aprovada' | 'desenvolvimento' | 'implementada' | 'recusada';

export interface Proposta {
  id: string;
  titulo: string;
  descricao: string;
  autorUid: string;
  autorNome: string;
  status: StatusProposta;
  votos: number;
  votosPor: string[];
  criadaEm: Date;
  analise: AnaliseProposta | null;
  analiseStatus: string;
}

interface ApiProposta {
  id: string;
  titulo: string;
  descricao: string;
  autor_uid: string;
  autor_nome: string;
  status: string;
  votos: number;
  votos_por: string[];
  criada_em: string;
  analise: AnaliseProposta | null;
  analise_status: string;
}

const STATUS_ORDEM: StatusProposta[] = ['votacao', 'aprovada', 'desenvolvimento', 'implementada', 'recusada'];
const STATUS_VALIDO = (v: unknown): v is StatusProposta =>
  STATUS_ORDEM.some((s) => s === v);

const STATUS_LABEL: Record<StatusProposta, string> = {
  votacao: 'Em votação',
  aprovada: 'Aprovada',
  desenvolvimento: 'Em desenvolvimento',
  implementada: 'Implementada',
  recusada: 'Recusada',
};

const STATUS_DESC: Record<StatusProposta, string> = {
  votacao: 'Na fila: votos da comunidade decidem o que entra no simulador.',
  aprovada: 'Passou na votação — aguardando priorização no roteiro.',
  desenvolvimento: 'Em construção dentro do motor do Axioma.',
  implementada: 'Já roda no simulador. Teste e reaja.',
  recusada: 'Não entra no momento. Quem sabe no próximo ciclo.',
};

const ADMINS = new Set(
  String(import.meta.env.VITE_ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const POLL_MS = 10000;

function mapearProposta(a: ApiProposta): Proposta | null {
  const titulo = typeof a.titulo === 'string' ? a.titulo.trim() : '';
  const descricao = typeof a.descricao === 'string' ? a.descricao.trim() : '';
  if (!titulo || !descricao) return null;
  const votosPor = Array.isArray(a.votos_por)
    ? a.votos_por.filter((v): v is string => typeof v === 'string')
    : [];
  const criada = new Date(a.criada_em);
  const analise = a.analise && typeof a.analise === 'object' ? a.analise : null;
  return {
    id: String(a.id ?? ''),
    titulo,
    descricao,
    autorUid: typeof a.autor_uid === 'string' ? a.autor_uid : '',
    autorNome: typeof a.autor_nome === 'string' && a.autor_nome ? a.autor_nome : 'Anônimo',
    status: STATUS_VALIDO(a.status) ? a.status : 'votacao',
    votos: typeof a.votos === 'number' ? a.votos : votosPor.length,
    votosPor,
    criadaEm: Number.isNaN(criada.getTime()) ? new Date() : criada,
    analise,
    analiseStatus: typeof a.analise_status === 'string' ? a.analise_status : 'pendente',
  };
}

function usePropostas() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useMemo(
    () => () => {
      fetch('/api/propostas')
        .then((r) => {
          if (!r.ok) throw new Error('Falha ao conectar com o servidor.');
          return r.json() as Promise<ApiProposta[]>;
        })
        .then((lista) => {
          const arr: Proposta[] = [];
          for (const a of lista) {
            const p = mapearProposta(a);
            if (p) arr.push(p);
          }
          setPropostas(arr);
          setErro(null);
        })
        .catch((e) => {
          setErro(e instanceof Error ? e.message : 'Falha ao ler as propostas.');
        })
        .finally(() => setCarregando(false));
    },
    [],
  );

  useEffect(() => {
    recarregar();
    const t = setInterval(recarregar, POLL_MS);
    return () => clearInterval(t);
  }, [recarregar]);

  return { propostas, carregando, erro, recarregar };
}

async function criarProposta(
  titulo: string,
  descricao: string,
  autor: { uid?: string; nome?: string },
): Promise<void> {
  const token = await tokenAtual();
  const payload: Record<string, unknown> = {
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    nome: autor.nome ?? '',
  };
  if (!autor.uid) payload.device_id = deviceId();
  const r = await fetch('/api/propostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
    throw new Error(dados?.erro ?? 'Falha ao publicar a proposta.');
  }
}

async function reanalisarProposta(id: string): Promise<void> {
  const token = await tokenAtual();
  const payload: Record<string, unknown> = {};
  if (!token) payload.device_id = deviceId();
  const r = await fetch(`/api/propostas/${id}/analisar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
    throw new Error(dados?.erro ?? 'Falha ao reanalisar a proposta.');
  }
}

async function alternarVoto(id: string): Promise<void> {
  const token = await tokenAtual();
  const r = await fetch(`/api/propostas/${id}/votar`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!r.ok) {
    const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
    throw new Error(dados?.erro ?? 'Falha ao registrar o voto.');
  }
}

async function alterarStatusProposta(id: string, status: StatusProposta): Promise<void> {
  const token = await tokenAtual();
  const r = await fetch(`/api/propostas/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
    throw new Error(dados?.erro ?? 'Falha ao mudar o status.');
  }
}

interface ItemPropostaProps {
  p: Proposta;
  logado: boolean;
  uid: string | undefined;
  ocupadoId: string | null;
  reanalisandoId: string | null;
  aoVotar: (p: Proposta) => void;
  aoMudarStatus: (id: string, s: StatusProposta) => void;
  aoReanalisar: (p: Proposta) => void;
  podeGerir: (p: Proposta) => boolean;
}

const RISCO_LABEL: Record<string, string> = {
  alta: 'risco alto',
  media: 'risco médio',
  baixa: 'risco baixo',
};

function BlocoAnalise({
  p,
  podeGerir,
  reanalisando,
  aoReanalisar,
}: {
  p: Proposta;
  podeGerir: boolean;
  reanalisando: boolean;
  aoReanalisar: (p: Proposta) => void;
}) {
  const pronta = p.analiseStatus === 'pronta' && !!p.analise;
  if (!pronta) {
    return (
      <div className="prp-analise prp-analise-pendente">
        <span className="prp-analise-titulo">ANÁLISE DO MOTOR</span>
        <p className="prp-dim">
          {p.analiseStatus === 'erro'
            ? 'A análise automática falhou e ainda não pegou.'
            : 'A IA está avaliando as mudanças necessárias — isso leva alguns segundos.'}
        </p>
        {podeGerir && (
          <button type="button" className="prp-bt" disabled={reanalisando} onClick={() => aoReanalisar(p)}>
            {reanalisando ? 'Analisando…' : 'Gerar análise'}
          </button>
        )}
      </div>
    );
  }

  const a = p.analise as AnaliseProposta;
  const mudancas = Array.isArray(a.mudancas) ? a.mudancas.filter(Boolean) : [];
  const quebras = Array.isArray(a.quebras) ? a.quebras.filter((q) => q?.campo || q?.descricao) : [];
  const afeta = Array.isArray(a.afeta) ? a.afeta.filter(Boolean) : [];

  return (
    <div className="prp-analise">
      <div className="prp-analise-topo">
        <span className="prp-analise-titulo">ANÁLISE DO MOTOR</span>
        {podeGerir && (
          <button type="button" className="prp-bt prp-bt-mini" disabled={reanalisando} onClick={() => aoReanalisar(p)}>
            {reanalisando ? 'Analisando…' : 'Reanalisar'}
          </button>
        )}
      </div>
      {a.resumo && <p className="prp-analise-resumo">{a.resumo}</p>}
      {mudancas.length > 0 && (
        <div className="prp-analise-secao">
          <h5>Mudanças necessárias no motor</h5>
          <ul className="prp-analise-lista">
            {mudancas.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {quebras.length > 0 && (
        <div className="prp-analise-secao">
          <h5>Possíveis quebras de save</h5>
          <ul className="prp-analise-quebras">
            {quebras.map((q, i) => (
              <li key={i}>
                <span className={`prp-risco prp-risco-${q?.risco ?? 'media'}`}>
                  {RISCO_LABEL[q?.risco ?? 'media'] ?? 'risco'}
                </span>
                {q?.campo && <b className="prp-analise-campo">{q.campo}</b>}
                {q?.descricao && <span>{q.descricao}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {afeta.length > 0 && (
        <div className="prp-analise-afeta">
          {afeta.map((mod) => (
            <span key={mod} className="prp-chip">
              {mod}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemProposta({
  p,
  logado,
  uid,
  ocupadoId,
  reanalisandoId,
  aoVotar,
  aoMudarStatus,
  aoReanalisar,
  podeGerir,
}: ItemPropostaProps) {
  const meuVoto = !!uid && p.votosPor.includes(uid);
  const propria = !!uid && p.autorUid === uid;
  const ocupado = ocupadoId === p.id;
  return (
    <li className="prp-item">
      <div className="prp-item-topo">
        <span className={`prp-badge prp-b-${p.status}`}>{STATUS_LABEL[p.status]}</span>
        <span className="prp-item-votos">
          <b>{p.votos}</b> {p.votos === 1 ? 'voto' : 'votos'}
        </span>
      </div>
      <h4>{p.titulo}</h4>
      <p className="prp-item-desc">{p.descricao}</p>
      <div className="prp-item-meta prp-dim">
        <span>por {p.autorNome}</span>
        <span aria-hidden="true">·</span>
        <span>{p.criadaEm.toLocaleDateString('pt-BR')}</span>
      </div>
      <div className="prp-item-acoes">
        {logado ? (
          <button
            type="button"
            className={`prp-bt ${meuVoto ? 'prp-bt-votado' : 'prp-bt-primario'}`}
            disabled={ocupado || propria}
            onClick={() => aoVotar(p)}
            title={propria ? 'Você não vota na própria proposta' : undefined}
          >
            {ocupado ? 'Registrando…' : meuVoto ? 'Desfazer voto' : 'Votar'}
          </button>
        ) : (
          <span className="prp-dim">Entre para votar.</span>
        )}
        {propria && <span className="prp-tag">sua proposta</span>}
      </div>
      <BlocoAnalise
        p={p}
        podeGerir={podeGerir(p)}
        reanalisando={reanalisandoId === p.id}
        aoReanalisar={aoReanalisar}
      />
      {podeGerir(p) && (
        <label className="prp-gerencia">
          <span className="prp-dim">Status</span>
          <select
            value={p.status}
            onChange={(e) => aoMudarStatus(p.id, e.target.value as StatusProposta)}
          >
            {STATUS_ORDEM.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  );
}

function CtaLogin() {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      await entrarComGoogle();
    } catch (e) {
      if (e instanceof ErroLogin && e.contexto !== 'cancelado') setErro(e.message);
    } finally {
      setOcupado(false);
    }
  };
  return (
    <div className="prp-entra">
      <button type="button" className="prp-bt prp-bt-primario" onClick={entrar} disabled={ocupado}>
        {ocupado ? 'Entrando…' : 'Entrar com Google para votar'}
      </button>
      {erro && (
        <p className="prp-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

export function PainelPropostas() {
  const { propostas, carregando, erro, recarregar } = usePropostas();
  const { status, usuario } = useAuth();
  const logado = status === 'logado' && !!usuario;
  const uid = usuario?.uid;
  const [formAberto, setFormAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [reanalisandoId, setReanalisandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const m = new Map<StatusProposta, Proposta[]>();
    for (const s of STATUS_ORDEM) m.set(s, []);
    for (const p of propostas) m.get(p.status)?.push(p);
    for (const s of STATUS_ORDEM) {
      m.get(s)?.sort((a, b) => b.votos - a.votos || b.criadaEm.getTime() - a.criadaEm.getTime());
    }
    return m;
  }, [propostas]);

  const total = propostas.length;
  const totalVotos = propostas.reduce((s, p) => s + p.votos, 0);

  const aoEnviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAviso(null);
    setOcupado(true);
    try {
      await criarProposta(titulo, descricao, {
        uid: usuario?.uid,
        nome: usuario?.nome ?? nome ?? '',
      });
      setTitulo('');
      setDescricao('');
      setNome('');
      setFormAberto(false);
      setAviso('Proposta lançada em votação. A análise do motor chega em instantes.');
      recarregar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível publicar a proposta.');
    } finally {
      setOcupado(false);
    }
  };

  const aoVotar = async (p: Proposta) => {
    if (!uid) return;
    if (p.autorUid === uid) {
      setAviso('Você não pode votar na própria proposta.');
      return;
    }
    setAviso(null);
    setOcupadoId(p.id);
    try {
      await alternarVoto(p.id);
      recarregar();
    } catch {
      setAviso('Não foi possível registrar o voto.');
    } finally {
      setOcupadoId(null);
    }
  };

  const aoMudarStatus = async (id: string, s: StatusProposta) => {
    setAviso(null);
    try {
      await alterarStatusProposta(id, s);
      recarregar();
    } catch {
      setAviso('Não foi possível mudar o status da proposta.');
    }
  };

  const aoReanalisar = async (p: Proposta) => {
    setAviso(null);
    setReanalisandoId(p.id);
    try {
      await reanalisarProposta(p.id);
      setAviso('Análise reagendada. Atualize em instantes.');
      setTimeout(recarregar, 2500);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível reanalisar a proposta.');
    } finally {
      setReanalisandoId(null);
    }
  };

  const podeGerir = (p: Proposta): boolean => !!uid && (p.autorUid === uid || ADMINS.has(uid));

  if (erro) {
    return (
      <div className="prp prp-erro-grande">
        <p className="prp-rotulo">ROTEIRO & VOTAÇÕES</p>
        <p>Não foi possível conectar ao servidor de propostas.</p>
        <p className="prp-dim">{erro}</p>
        <p className="prp-dim">
          Verifique se o backend está no ar (npm run server) e se o banco de dados está configurado
          (DATABASE_URL no server/.env).
        </p>
      </div>
    );
  }

  return (
    <div className="prp">
      <div className="prp-cab">
        <div>
          <p className="prp-rotulo">PROPOSTA → VOTAÇÃO → IMPLEMENTAÇÃO</p>
          <h3>O Axioma é melhorado por quem joga.</h3>
          <p className="prp-dim">Proponha uma ideia, ganhe votos e veja ela entrar no simulador.</p>
          <div className="prp-fluxo">
            <span>1 · Proponha</span>
            <i>→</i>
            <span>2 · Votação da comunidade</span>
            <i>→</i>
            <span>3 · Implementada</span>
          </div>
        </div>
        <div className="prp-stats">
          <span className="prp-stat">
            <b>{total}</b> propostas
          </span>
          <span className="prp-stat">
            <b>{totalVotos}</b> votos
          </span>
        </div>
      </div>

      <div className="prp-caixa">
        <button
          type="button"
          className="prp-bt"
          onClick={() => setFormAberto((v) => !v)}
          aria-expanded={formAberto}
        >
          {formAberto ? 'Fechar formulário' : '＋ Lançar nova proposta'}
        </button>
        {formAberto && (
          <form className="prp-form" onSubmit={aoEnviar}>
            {!logado && (
              <label className="prp-campo">
                <span>Seu nome (opcional)</span>
                <input
                  value={nome}
                  maxLength={80}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ou fica como 'Anônimo' — não precisa de conta"
                />
              </label>
            )}
            <label className="prp-campo">
              <span>Título</span>
              <input
                value={titulo}
                maxLength={140}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Painel de diplomacia para o seu país"
                required
              />
            </label>
            <label className="prp-campo">
              <span>Descrição</span>
              <textarea
                value={descricao}
                rows={3}
                maxLength={1000}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que você quer ver dentro do simulador? Quanto mais específico, melhor."
                required
              />
            </label>
            {!logado && (
              <p className="prp-dim">
                Sem conta, sua proposta fica vinculada a este navegador. A IA analisa e mostra as
                mudanças necessárias — inclusive as que podem quebrar saves.
              </p>
            )}
            <button
              type="submit"
              className="prp-bt prp-bt-primario"
              disabled={ocupado || titulo.trim().length < 5 || descricao.trim().length < 5}
            >
              {ocupado ? 'Publicando…' : 'Lançar em votação'}
            </button>
          </form>
        )}
      </div>

      {!logado && (
        <div className="prp-caixa">
          <p className="prp-dim">Para votar e gerenciar suas propostas, entre com o Google.</p>
          <CtaLogin />
        </div>
      )}

      {aviso && (
        <p className="prp-aviso" role="status">
          {aviso}
        </p>
      )}

      {carregando && <div className="prp-carrega">Carregando propostas…</div>}

      {!carregando && total === 0 && (
        <div className="prp-carrega">
          Ainda não há propostas. Seja quem lança a primeira.
        </div>
      )}

      <div className="prp-grupos">
        {STATUS_ORDEM.map((st) => {
          const lista = grupos.get(st) ?? [];
          if (!lista.length) return null;
          return (
            <section key={st} className="prp-grupo">
              <h3 className="prp-grupo-titulo">
                {STATUS_LABEL[st]}
                <span className="prp-grupo-qtd">{lista.length}</span>
              </h3>
              <p className="prp-grupo-desc prp-dim">{STATUS_DESC[st]}</p>
              <ul className="prp-lista">
                {lista.map((p) => (
                  <ItemProposta
                    key={p.id}
                    p={p}
                    logado={logado}
                    uid={uid}
                    ocupadoId={ocupadoId}
                    reanalisandoId={reanalisandoId}
                    aoVotar={aoVotar}
                    aoMudarStatus={aoMudarStatus}
                    aoReanalisar={aoReanalisar}
                    podeGerir={podeGerir}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}