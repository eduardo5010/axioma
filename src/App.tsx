import { useEffect, useState } from 'react';
import { useGame, jogador, paisDoSave } from './store/game';
import type { World, Country } from './engine/types';
import { SEMENTES } from './engine/data/countries';
import type { CountrySeed } from './engine/data/countries';
import { LEIS_DEFS } from './engine/data/normas/catalogo';
import { MODELOS } from './engine/data/modelos';
import { fmtBilhoes, fmtNum, fmtPct, fmtPop, fmtMes } from './engine/util';
import { Globo } from './ui/globe';
import { Bandeira } from './ui/components';
import { useAuth } from './ui/auth';
import Landing from './ui/Landing';
import PainelJogador from './ui/jogador';
import { PainelPropostas } from './ui/propostas';
import { Assinar } from './ui/assinatura';
import {
  PanelVisaoGeral, PanelEconomia, PanelFinancas, PanelPolitica,
  PanelDiplomacia, PanelMilitar, PanelMundo, PanelSociedade, PanelMercado,
  PanelGoverno, PanelIndicadores, PanelReformas,
} from './ui/panels';
import { PanelObras, PanelPesquisa } from './ui/civil';
import { EspacoStage } from './ui/espaco';
import { OrbitalStage } from './ui/orbital';
import { MapStage } from './ui/map';
import {
  PosVisaoGeral, PosEconomia, PosFinancas, PosSociedade, PosGovernanca,
  PosRelacoes, PosSeguranca, DissolucaoPainel, PosDossieDireita,
  DissolucaoMonitor, PressaoEstadoSection,
} from './ui/pos';
import { posEstadoDossie, estabilidadeSocial, evolucaoPos, pressaoDissolucao } from './engine/dissolucao';
import { CerimoniaModal, PlenarioModal } from './ui/votacao';
import { useUi } from './store/ui';
import type { AbaId } from './store/ui';
import { CausaEfeito } from './ui/components';

const Metric = ({ val, label, tom }: { val: string; label: string; tom?: string }) => (
  <div className={`metric ${tom ? `m-${tom}` : ''}`}><span className="metric-val">{val}</span><span className="metric-label">{label}</span></div>
);

interface MenuItem { key: string; label: string; icone: string }

const MENUS: MenuGroup[] = [
  {
    grupo: 'Estado', emoji: '🏛️',
    itens: [
      { key: 'visao', label: 'Visão Geral', icone: '👤' },
      { key: 'governo', label: 'Executivo & Instituições', icone: '🏛️' },
      { key: 'politica', label: 'Política & Partidos', icone: '🗳️' },
      { key: 'reformas', label: 'Legislação', icone: '📜' },
    ],
  },
  {
    grupo: 'Economia', emoji: '📈',
    itens: [
      { key: 'economia', label: 'Economia', icone: '📈' },
      { key: 'financas', label: 'Finanças', icone: '💰' },
      { key: 'mercado', label: 'Mercado', icone: '🛒' },
      { key: 'indicadores', label: 'Indicadores', icone: '📊' },
    ],
  },
  {
    grupo: 'Infra & Ciência', emoji: '🚀',
    itens: [
      { key: 'obras', label: 'Obras Públicas', icone: '🏗️' },
      { key: 'pesquisa', label: 'Pesquisa', icone: '🔬' },
      { key: 'espaco', label: 'Programa Espacial', icone: '🛰️' },
    ],
  },
  {
    grupo: 'Sociedade', emoji: '👥',
    itens: [
      { key: 'sociedade', label: 'Sociedade', icone: '👥' },
    ],
  },
  {
    grupo: 'Relações', emoji: '🌐',
    itens: [
      { key: 'diplomacia', label: 'Diplomacia', icone: '🌐' },
      { key: 'militar', label: 'Militar', icone: '🪖' },
      { key: 'mundo', label: 'Mundo', icone: '🌍' },
    ],
  },
  {
    grupo: 'Comunidade', emoji: '🧑‍🤝‍🧑',
    itens: [
      { key: 'votacoes', label: 'Roteiro & Votações', icone: '🗳️' },
      { key: 'apoio', label: 'Apoio ao projeto', icone: '💜' },
    ],
  },
];
type MenuGroup = { grupo: string; emoji: string; itens: MenuItem[] };

const MENUS_POS: MenuGroup[] = [
  {
    grupo: 'Economia', emoji: '📈',
    itens: [
      { key: 'economia', label: 'Economia Local', icone: '📈' },
      { key: 'financas', label: 'Finanças Comunitárias', icone: '💰' },
      { key: 'indicadores', label: 'Indicadores', icone: '📊' },
    ],
  },
  {
    grupo: 'Infra & Ciência', emoji: '🚀',
    itens: [
      { key: 'obras', label: 'Obras Comunitárias', icone: '🏗️' },
      { key: 'pesquisa', label: 'Pesquisa Comunitária', icone: '🔬' },
      { key: 'espaco', label: 'Programa Espacial', icone: '🛰️' },
    ],
  },
  {
    grupo: 'Comunidades', emoji: '🏘️',
    itens: [
      { key: 'sociedade', label: 'Comunidades', icone: '👥' },
      { key: 'governo', label: 'Assembleias & Arbitragem', icone: '🏛️' },
    ],
  },
  {
    grupo: 'Relações Externas', emoji: '🌐',
    itens: [
      { key: 'diplomacia', label: 'Relações Externas', icone: '🌐' },
      { key: 'militar', label: 'Segurança Comunitária', icone: '🛡️' },
      { key: 'mundo', label: 'Territórios', icone: '🌍' },
    ],
  },
  {
    grupo: 'Comunidade', emoji: '🧑‍🤝‍🧑',
    itens: [
      { key: 'votacoes', label: 'Roteiro & Votações', icone: '🗳️' },
      { key: 'apoio', label: 'Apoio ao projeto', icone: '💜' },
    ],
  },
];

const TITULO_POS: Record<string, string> = {
  visao: 'Visão Geral do Território',
  economia: 'Economia Local',
  financas: 'Finanças Comunitárias',
  indicadores: 'Indicadores do Território',
  obras: 'Obras Comunitárias',
  pesquisa: 'Pesquisa Comunitária',
  espaco: 'Programa Espacial',
  sociedade: 'Comunidades',
  governo: 'Assembleias & Arbitragem',
  diplomacia: 'Relações Externas',
  militar: 'Segurança Comunitária',
  mundo: 'Territórios',
  votacoes: 'Roteiro & Votações',
  apoio: 'Apoio ao projeto',
  causaefeito: 'Causa & efeito',
};

const TITULO: Record<string, string> = {
  visao: 'Visão Geral',
  governo: 'Governo & Instituições',
  politica: 'Política & Partidos',
  reformas: 'Legislação',
  obras: 'Obras Públicas',
  pesquisa: 'Pesquisa & Investimento',
  espaco: 'Programa Espacial',
  economia: 'Economia',
  financas: 'Finanças',
  mercado: 'Mercado',
  indicadores: 'Indicadores',
  sociedade: 'Sociedade',
  diplomacia: 'Diplomacia',
  militar: 'Militar',
  mundo: 'Mundo',
  votacoes: 'Roteiro & Votações',
  apoio: 'Apoio ao projeto',
  causaefeito: 'Causa & efeito',
};

const renderConteudo = (key: string, c: Country, w: World, pos: boolean) => {
  switch (key) {
    case 'visao': return c.dissolucao ? <DissolucaoPainel c={c} /> : pos ? <PosVisaoGeral c={c} /> : <PanelVisaoGeral c={c} w={w} />;
    case 'economia': return pos ? <PosEconomia c={c} w={w} /> : <PanelEconomia c={c} w={w} />;
    case 'mercado': return pos ? <PosEconomia c={c} w={w} /> : <PanelMercado c={c} w={w} />;
    case 'financas': return pos ? <PosFinancas c={c} /> : <PanelFinancas c={c} w={w} />;
    case 'politica': return pos ? <PosVisaoGeral c={c} /> : <PanelPolitica c={c} w={w} />;
    case 'reformas': return pos ? <PosGovernanca c={c} /> : <PanelReformas c={c} w={w} />;
    case 'obras': return <PanelObras c={c} w={w} />;
    case 'pesquisa': return <PanelPesquisa c={c} w={w} />;
    case 'espaco': return <EspacoStage w={w} />;
    case 'sociedade': return pos ? <PosSociedade c={c} /> : <PanelSociedade c={c} w={w} />;
    case 'governo': return pos ? <PosGovernanca c={c} /> : <PanelGoverno c={c} w={w} />;
    case 'indicadores': return <PanelIndicadores c={c} w={w} />;
    case 'diplomacia': return pos ? <PosRelacoes c={c} w={w} /> : <PanelDiplomacia c={c} w={w} />;
    case 'militar': return pos ? <PosSeguranca c={c} /> : <PanelMilitar c={c} w={w} />;
    case 'mundo': return <PanelMundo w={w} />;
    case 'votacoes': return <PainelPropostas />;
    case 'apoio': return <Assinar />;
    default: return null;
  }
};

function PainelSelecionado({ sel, salvoId, novoJogo, carregar }: {
  sel: CountrySeed | null;
  salvoId: string | null;
  novoJogo: (id: string) => void;
  carregar: () => boolean;
}) {
  const cx = `menu-painel ${sel ? '' : 'menu-painel-vazio'}`;
  if (!sel) {
    return (
      <aside className={cx}>
        <div className="menu-vazio-icone">🌍</div>
        <b>Selecione um país</b>
        <p className="dim">Clique em um país no globo ou na lista ao lado.</p>
      </aside>
    );
  }
  const regimeLabel = (r: string) => (r === 'democracia' ? 'Democracia' : r === 'híbrido' ? 'Híbrido' : 'Autoritário');
  return (
    <aside className={cx}>
      <div className="menu-pais-enc">
        <span className="pais-flag"><Bandeira e={sel.flag} /></span>
        <div>
          <b className="menu-pais-nome">{sel.nome}</b>
          <small className="dim">{sel.regiao} · <span className={`regime regime-${sel.regime}`}>{regimeLabel(sel.regime)}</span></small>
        </div>
      </div>
      <div className="menu-kpis">
        <Metric val={fmtPop(sel.pop)} label="População" />
        <Metric val={fmtBilhoes(sel.gdp)} label="PIB" />
        <Metric val={`$${fmtNum(sel.gdp / sel.pop, 0)}`} label="PIB/hab" />
        <Metric val={fmtPct(sel.crescimento)} label="Crescimento" />
        <Metric val={fmtPct(sel.inflacao)} label="Inflação" />
        <Metric val={fmtPct(sel.desemprego ?? 0)} label="Desemprego" />
        <Metric val={fmtPct(sel.divida)} label="Dívida" />
        <Metric val={fmtNum(sel.gini, 2)} label="Gini" />
      </div>
      <div className="menu-detalhes">
        <div className="sit-linha"><span>Educação</span><b>{fmtPct(sel.educ)}</b></div>
        <div className="sit-linha"><span>Saúde</span><b>{fmtPct(sel.saude)}</b></div>
        <div className="sit-linha"><span>Infraestrutura</span><b>{fmtPct(sel.infra / 100)}</b></div>
        <div className="sit-linha"><span>Urbanização</span><b>{fmtPct(sel.urbano)}</b></div>
        <div className="sit-linha"><span>Idade média</span><b>{fmtNum(sel.idade, 1)} anos</b></div>
        <div className="sit-linha"><span>Felicidade</span><b>{fmtNum(sel.felicidade, 0)}</b></div>
        <div className="sit-linha"><span>Militares ativos</span><b>{sel.militar.ativo ? fmtNum(sel.militar.ativo, 0) + ' k' : '—'}</b></div>
        <div className="sit-linha"><span>Recurso</span><b>{sel.recurso === 'nenhum' ? 'Diversificado' : sel.recurso}</b></div>
      </div>
      <div className="menu-acoes">
        <button className="btn btn-jogar" onClick={() => novoJogo(sel.id)}>▶ Assumir o governo</button>
        <button
          className="btn"
          disabled={salvoId !== sel.id}
          onClick={() => { if (salvoId === sel.id) carregar(); }}
          title={salvoId !== sel.id ? 'Nenhuma partida salva neste país' : 'Carregar partida salva'}
        >
          💾 Carregar salvo
        </button>
        {salvoId === sel.id && <small className="dim menu-aviso">Partida salva encontrada.</small>}
      </div>
    </aside>
  );
}

function StartScreen() {
  const novoJogo = useGame((s) => s.novoJogo);
  const carregar = useGame((s) => s.carregar);
  const { usuario } = useAuth();
  const [selId, setSelId] = useState<string | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [sideAberta, setSideAberta] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(max-width: 1100px)').matches : true,
  );

  useEffect(() => {
    setSalvoId(paisDoSave());
  }, []);

  const sel = SEMENTES.find((s) => s.id === selId) ?? null;
  const regimeLabel = (r: string) => (r === 'democracia' ? 'Democracia' : r === 'híbrido' ? 'Híbrido' : 'Autoritário');
  const filtrados = SEMENTES.filter((s) => busca.trim() === '' || s.nome.toLowerCase().includes(busca.trim().toLowerCase()));
  const regioes = Array.from(new Set(filtrados.map((s) => s.regiao)));

  return (
    <div className="menu">
      <Globo onSelecionar={setSelId} selecionado={selId} />

      <header className="menu-hd">
        <div className="menu-titulo">
          <h1><span className="menu-sigla" aria-hidden="true">Λ</span> AXIOMA</h1>
          <p className="dim">Simulador de Chefe de Estado e Geopolítica · mundo real, a partir de 2026 · 196 países jogáveis</p>
        </div>
        {usuario && <PainelJogador usuario={usuario} />}
      </header>

      <div className="menu-dica dim">
        🌍 Gire e arraste o globo · <b>clique em um país</b> para assumir o governo
        {salvoId && <span className="menu-save">· 💾 partida salva: {SEMENTES.find((s) => s.id === salvoId)?.nome}</span>}
      </div>

      <button className="btn menu-side-bt" onClick={() => setSideAberta((v) => !v)}>
        {sideAberta ? '✕ Ocultar lista' : '📑 Lista de países'}
      </button>

      <div className={`menu-side ${sideAberta ? 'aberta' : ''}`}>
        <div className="menu-side-busca">
          <input
            className="menu-busca"
            placeholder="Buscar país…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="dim menu-side-count">{filtrados.length} países</span>
        </div>
        <div className="menu-side-scroll">
          {regioes.map((r) => (
            <section key={r} className="menu-side-regiao">
              <h3>{r} <span className="dim">{filtrados.filter((s) => s.regiao === r).length}</span></h3>
              <div className="pais-grid">
                {filtrados.filter((s) => s.regiao === r).map((s) => (
                  <button key={s.id} className={`pais-card ${s.id === selId ? 'ativo' : ''}`} onClick={() => setSelId(s.id)}>
                    <span className="pais-flag"><Bandeira e={s.flag} /></span>
                    <b>{s.nome}</b>
                    <small className={s.regime === 'democracia' ? 'regime regime-democracia' : s.regime === 'híbrido' ? 'regime regime-híbrido' : 'regime regime-autoritário'}>{regimeLabel(s.regime)}</small>
                    <small className="dim">Cresc. {fmtNum(s.crescimento, 1)}% · ${fmtNum(Math.round(s.gdp / s.pop), 0)}/hab</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <PainelSelecionado sel={sel} salvoId={salvoId} novoJogo={novoJogo} carregar={carregar} />
    </div>
  );
}

function GameOver({ w }: { w: World }) {
  const reiniciar = useGame((s) => s.reiniciar);
  const p = w.paises[w.jogadorId];
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h1>🔚 Fim do Governo</h1>
        <p>{w.motivoFim}</p>
        <div className="kpis">
          <Metric val={`${fmtNum(w.mesesPoder / 12, 1)}`} label="anos no poder" />
          <Metric val={fmtPct(p?.crescimento ?? 0)} label="crescimento final" />
          <Metric val={fmtBilhoes(p?.gdp ?? 0)} label="PIB ao final" />
        </div>
        <button className="btn btn-grande" onClick={reiniciar}>Começar novo governo</button>
      </div>
    </div>
  );
}

function HeaderBar({ w, c }: { w: World; c: Country }) {
  const vel = useGame((s) => s.vel);
  const rodando = useGame((s) => s.rodando);
  const setVel = useGame((s) => s.setVel);
  const setRodando = useGame((s) => s.setRodando);
  const avancar = useGame((s) => s.avancar);
  const salvar = useGame((s) => s.salvar);
  const reiniciar = useGame((s) => s.reiniciar);
  const aprovarImediato = useGame((s) => s.aprovarImediato);
  const anexarPlaneta = useGame((s) => s.anexarPlaneta);
  const rascunho = useGame((s) => s.rascunho);
  const submeterPolitica = useGame((s) => s.submeterPolitica);
  const descartarPolitica = useGame((s) => s.descartarPolitica);
  const alternarCe = useUi((s) => s.alternar);

  const nRasc = Object.keys(rascunho ?? {}).length;
  const pos = !!c.posEstado;
  const diss = c.dissolucao;
  const dossie = pos ? posEstadoDossie(c) : null;
  const estPos = pos ? estabilidadeSocial(c) : 0;
  const evo = pos ? evolucaoPos(c) : { rotulo: '', emoji: '' };

  return (
    <>
      <header className="hud-top">
      <div className="head-pais">
        <span className="pais-flag"><Bandeira e={c.flag} /></span>
        <div>
          <b>{c.name}</b>
          <small className="dim">
            {pos
              ? `🌎 TERRITÓRIO PÓS-ESTATAL · ${evo.emoji} ${evo.rotulo}`
              : diss
                ? `⚠️ DISSOLUÇÃO EM ANDAMENTO · ${Math.round(diss.progresso)}% concluída`
                : c.lider}
          </small>
        </div>
      </div>

      <div className="head-datas">
        {pos && dossie ? (
          <>
            <Metric val={fmtNum(dossie.coesao, 0)} label="Coesão" />
            <Metric val={fmtNum(estPos, 0)} label="Estab. Social" tom={estPos >= 50 ? 'bom' : estPos < 20 ? 'ruim' : undefined} />
            <Metric val={fmtNum(dossie.autonomia, 0)} label="Autonomia" />
            <Metric val={fmtNum(dossie.conflito, 0)} label="Conflito" tom={dossie.conflito > 50 ? 'ruim' : dossie.conflito < 30 ? 'bom' : undefined} />
            <Metric val={fmtPop(c.populacao)} label="População" />
          </>
        ) : diss ? (
          <>
            <Metric val={fmtNum(pressaoDissolucao(c), 0)} label="Pressão abolic." />
            <Metric val={fmtNum(diss.apoioPopular, 0)} label="Apoio popular" />
            <Metric val={fmtNum(diss.apoioInstituicoes, 0)} label="Apoio inst." />
            <Metric val={`${Math.round(diss.progresso)}%`} label="Progresso" />
            <Metric val={fmtPop(c.populacao)} label="População" />
          </>
        ) : (
          <>
            <Metric val={fmtNum(c.aprovacao, 0)} label="Aprovação" />
            <Metric val={fmtPct(c.crescimento)} label="Cresc." />
            <Metric val={fmtPct(c.inflacao)} label="Infl." />
            <Metric val={fmtPct(c.desemprego)} label="Desemp." />
            <Metric val={fmtPct(c.dividaPct)} label="Dívida" />
            <Metric val={`${fmtNum(c.receitaPct, 1)}/${fmtNum(c.gastoPct, 1)}`} label="Rec./Desp." />
          </>
        )}
      </div>

      <div className="head-time">
        <span className="data-atual">{fmtMes(w.ano, w.mes)}</span>
        <div className="vel-box">
          <button className="btn" onClick={() => { setRodando(false); }}>⏸</button>
          <button className={`btn ${!rodando && vel === 1 ? 'ativo' : ''}`} onClick={() => { setRodando(false); setVel(1); }}>1×</button>
          <button className={`btn ${rodando && vel === 3 ? 'ativo' : ''}`} onClick={() => { setRodando(true); setVel(3); }}>3×</button>
          <button className={`btn ${rodando && vel === 10 ? 'ativo' : ''}`} onClick={() => { setRodando(true); setVel(10); }}>10×</button>
          <button className="btn btn-avancar" onClick={avancar}>Próximo mês ▸</button>
        </div>
        <div className="head-acoes">
          <button className="btn" onClick={() => alternarCe('causaefeito')} title="Causa & efeito entre abas">🕸️</button>
          <button className="btn" onClick={salvar}>💾</button>
          <button className="btn" onClick={reiniciar}>🔁</button>
        </div>
        <div className="head-comandos">
          <button className="btn btn-comando" onClick={aprovarImediato} title="Aprovar todas as medidas pendentes por decreto imediato, sem tramitar em nenhum órgão">⚡ Decreto</button>
          <button
            className="btn btn-comando btn-anexar"
            onClick={() => {
              if (window.confirm('Anexar todo o planeta? Todas as outras nações serão absorvidas pelo seu Estado (população, economia, sociedade, militar e ciência) e o mundo passará a ter um único governo. Esta ação é irreversível.')) anexarPlaneta();
            }}
            title="Anexar todas as nações do planeta em um único comando"
          >
            🌍 Anexar planeta
          </button>
        </div>
      </div>
    </header>
    {nRasc > 0 && (
      <div className="rascunho-bar">
        <span className="rascunho-info">
          ✍️ <b>{nRasc}</b> {nRasc === 1 ? 'ajuste pendente' : 'ajustes pendentes'} — só entra em votação ao confirmar.
        </span>
        <div className="rascunho-acoes">
          <button className="btn btn-avancar" onClick={submeterPolitica}>📨 Submeter à votação</button>
          <button className="btn" onClick={descartarPolitica}>Descartar</button>
        </div>
      </div>
    )}
    </>
  );
}

const GaugeMini = ({ valor, max = 100, min = -100, cor, rotulo, invert = false }: {
  valor: number; max?: number; min?: number; cor: string; rotulo: string; invert?: boolean;
}) => {
  const pct = ((valor - min) / (max - min)) * 100;
  return (
    <div className="sit-gauge">
      <div className="gauge-row"><span>{rotulo}</span><b>{fmtNum(valor, 1)}</b></div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: invert ? '#f87171' : cor }} />
      </div>
    </div>
  );
};

function SituacaoDireita({ c }: { c: Country }) {
  if (c.posEstado) return <PosDossieDireita c={c} />;
  if (c.dissolucao) return <DissolucaoMonitor c={c} />;
  const ativas = Object.entries(c.reformas ?? {}).filter(([, v]) => v > 0).length;
  const togAtivos = Object.values(c.alternadores ?? {}).filter(Boolean).length;
  const modelo = MODELOS.find((m) => m.id === c.governo.modeloId);
  const integridade = c.indicadores['integridade_territorial'] ?? 50;
  return (
    <aside className="hud-dir">
      <h4 className="hud-sec-titulo">📋 Dossiê do Estado</h4>
      <div className="sit-bloco">
        <GaugeMini valor={c.aprovacao} cor={c.aprovacao >= 0 ? '#34d399' : '#f87171'} rotulo="Aprovação" />
        <GaugeMini valor={c.estabilidade} max={100} min={-30} cor="#c9962e" rotulo="Estabilidade" />
        <GaugeMini valor={c.governo.apoioLegislativo} max={100} min={0} cor="#fbbf24" rotulo="Legitimidade" />
        <GaugeMini valor={integridade} max={100} min={0} cor="#a78bfa" rotulo="Integridade territorial" />
        <GaugeMini valor={c.democracia * 100} max={100} min={0} cor="#fb923c" rotulo="Democracia" />
      </div>

      <PressaoEstadoSection c={c} />

      <h4 className="hud-sec-titulo">👥 Sociedade</h4>
      <div className="sit-bloco">
        <GaugeMini valor={c.pops.sol} max={100} min={0} cor="#34d399" rotulo="Padrão de vida" />
        <GaugeMini valor={c.pops.alfabetizacao} max={100} min={0} cor="#c9962e" rotulo="Alfabetização" />
        <GaugeMini valor={c.pops.radicalizacao} max={100} min={0} cor="#f87171" rotulo="Radicalização" />
        <GaugeMini valor={c.pops.lealismo} max={100} min={0} cor="#facc15" rotulo="Lealdade" />
        <GaugeMini valor={c.pops.migracaoLiquida} max={45} min={-30} cor="#a78bfa" rotulo="Migração (% ano)" />
      </div>

      <h4 className="hud-sec-titulo">📜 Ordenamento Jurídico</h4>
      <div className="sit-bloco sit-leis">
        <div className="sit-linha"><span>Modelo</span><b>{modelo?.nome ?? c.governo.modeloId}</b></div>
        <div className="sit-linha"><span>Leis institucionais</span><b>{Object.keys(c.leis ?? {}).length}</b></div>
        <div className="sit-linha"><span>Reformas ativas</span><b>{ativas}</b></div>
        <div className="sit-linha"><span>Alavancas ativas</span><b>{togAtivos}</b></div>
        <div className="sit-leis-lista">
          {LEIS_DEFS.slice(0, 3).map((l) => {
            const opc = l.opcoes[c.leis?.[l.id] ?? 0];
            return <small key={l.id}>· {l.nome}: <b>{opc.nome}</b></small>;
          })}
        </div>
      </div>
    </aside>
  );
}

function PainelLateralEsquerdo({ abertas, abrir, pos }: { abertas: Record<string, boolean>; abrir: (k: string) => void; pos: boolean }) {
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const abrirPlenario = useUi((s) => s.abrirPlenario);
  const menus = pos ? MENUS_POS : MENUS;
  return (
    <aside className="hud-esq">
      <h4 className="hud-sec-titulo">{pos ? '🏘️ Conselhos do Território' : '🗂 Ministérios do Estado'}</h4>
      {menus.map((g) => (
        <div key={g.grupo} className="menu-grupo">
          <button className="menu-grupo-hd" onClick={() => setColapsados((s) => ({ ...s, [g.grupo]: !s[g.grupo] }))}>
            <b>{g.emoji} {g.grupo}</b>
            <span>{colapsados[g.grupo] ? '▸' : '▾'}</span>
          </button>
          {!colapsados[g.grupo] && (
            <div className="menu-itens">
              {g.itens.map((it) => (
                <button key={it.key} className={`menu-item ${abertas[it.key] ? 'ativo' : ''}`} onClick={() => abrir(it.key)}>
                  <span>{it.icone}</span>
                  <b>{it.label}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {!pos && (
        <>
          <h4 className="hud-sec-titulo">📖 Consultas</h4>
          <div className="menu-itens">
            <button className="menu-item" onClick={() => abrirPlenario('legislativo')}>
              <span>🏛️</span>
              <b>Plenário & Tribunal</b>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

function TelaEntrada() {
  return (
    <div className="menu">
      <div className="entrada-cartao">
        <h1 className="entrada-titulo"><span aria-hidden="true">Λ</span> AXIOMA</h1>
        <p className="entrada-status dim">carregando sessão…</p>
      </div>
    </div>
  );
}

function Aplicacao() {
  const w = useGame((s) => s.w);
  const vel = useGame((s) => s.vel);
  const rodando = useGame((s) => s.rodando);
  const resolverDecisao = useGame((s) => s.resolverDecisao);
  const nRascHud = useGame((s) => Object.keys(s.rascunho ?? {}).length);
  const abertas = useUi((s) => s.abertas);
  const fechar = useUi((s) => s.fechar);
  const focoUi = useUi((s) => s.foco);
  const telaOrbital = useUi((s) => s.telaOrbital);

  useEffect(() => {
    if (!rodando) return;
    const iv = setInterval(() => {
      const st = useGame.getState();
      if (!st.rodando) return;
      if (st.w?.decisao) return;
      st.avancar();
    }, Math.max(150, 1400 / vel));
    return () => clearInterval(iv);
  }, [vel, rodando]);

  if (!w) return <StartScreen />;
  const c = jogador(w);
  if (!c) return <StartScreen />;

  if (telaOrbital) return <OrbitalStage w={w} c={c} />;

  const pos = !!c.posEstado;
  const menusAtivos = pos ? MENUS_POS : MENUS;
  const janelas = menusAtivos.flatMap((g) => g.itens).filter((i) => abertas[i.key]);
  const focoAba: AbaId = (focoUi && focoUi !== 'causaefeito' ? focoUi : (janelas[0]?.key ?? 'visao')) as AbaId;

  const dec = w.decisao;
  return (
    <div className={`hud ${nRascHud > 0 ? 'com-rascunho' : ''}`}>
      <MapStage w={w} />

      <HeaderBar w={w} c={c} />

      <PainelLateralEsquerdo abertas={abertas} abrir={useUi.getState().alternar} pos={pos} />

      <SituacaoDireita c={c} />

      <div className="hud-janelas">
        {janelas.map((it) => (
          <section key={it.key} className={`hud-win ${it.key === 'espaco' ? 'hud-win-espaco' : ''}`}>
            <div className="hud-win-head">
              <b><span className="pasta-marca" aria-hidden="true">❧</span>{it.icone} {(pos && TITULO_POS[it.key]) || TITULO[it.key] || it.key}</b>
              <button className="btn btn-fechar" onClick={() => fechar(it.key)}>✕</button>
            </div>
            <div className="hud-win-body">{renderConteudo(it.key, c, w, pos)}</div>
          </section>
        ))}
        {abertas['causaefeito'] && (
          <section key="causaefeito" className="hud-win hud-win-ce">
            <div className="hud-win-head">
              <b><span className="pasta-marca" aria-hidden="true">❧</span>🕸️ {TITULO['causaefeito']}</b>
              <button className="btn btn-fechar" onClick={() => fechar('causaefeito')}>✕</button>
            </div>
            <div className="hud-win-body">
              <CausaEfeito aba={focoAba} cor="#c9962e" />
              {janelas.length === 0 && <p className="dim">Nenhuma aba aberta. Abra um painel no menu à esquerda para ver suas conexões.</p>}
            </div>
          </section>
        )}
      </div>

      {dec && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>📢 {dec.titulo}</h2>
            <p>{dec.texto}</p>
            <div className="modal-opcoes">
              {dec.opcoes.map((o, i) => (
                <button key={i} className="btn btn-escolha" onClick={() => resolverDecisao(i)}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="dim">A simulação fica pausada até você decidir.</p>
          </div>
        </div>
      )}
      <CerimoniaModal />
      <PlenarioModal />
      {w.gameOver && <GameOver w={w} />}
    </div>
  );
}

export default function App() {
  const { status } = useAuth();
  if (status === 'carregando') return <TelaEntrada />;
  if (status === 'deslogado') return <Landing />;
  return <Aplicacao />;
}