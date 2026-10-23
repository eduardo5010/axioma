import { useMemo } from 'react';
import type { World } from '../engine/types';
import { distSistema, sistemasRevelados, PROGRAMA_TIPOS, capacidadeEspacial, espacoResumo, espacoRecomendado, ESCOPO_INFO } from '../engine/space';
import { fmtNum } from '../engine/util';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { Panel, Metric, Gauge, CausaEfeito } from './components';

const SYS_COLORS: Record<string, string> = {
  amarela: '#ffd27f',
  vermelha: '#ff6b4a',
  azul: '#7fc4ff',
  nebulosa: '#b98aff',
  buraco: '#663a8a',
  gemini: '#4affd0',
};

const PALETA_PAISES = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#64748b'];
const corDe = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return PALETA_PAISES[(h >>> 0) % PALETA_PAISES.length];
};

/** Janela de gestão do programa espacial (gestão; a vista orbital abre em tela cheia). */
export const EspacoStage = ({ w }: { w: World }) => {
  const c = w.paises[w.jogadorId];
  const modo = useUi((s) => s.modoEspaco);
  const setModoEspaco = useUi((s) => s.setModoEspaco);
  const abrirOrbital = useUi((s) => s.abrirOrbital);

  const lancarExploracao = useGame((s) => s.lancarExploracao);
  const expandirColonia = useGame((s) => s.expandirColonia);

  const scope = w.espaco;
  const revelados = useMemo(() => sistemasRevelados(scope), [scope]);
  const resumo = useMemo(() => espacoResumo(w, modo), [w, modo]);
  const recomendado = espacoRecomendado(w);
  const cap = capacidadeEspacial(c);
  const alcance = resumo.alcance;

  const aDescobrir = scope.sistemas.filter((s) => !s.revelado && distSistema(s) <= alcance).sort((a, b) => distSistema(a) - distSistema(b)).slice(0, 12);
  const foraDeAlcance = scope.sistemas.filter((s) => !s.revelado && distSistema(s) > alcance).length;

  const emExploracao = (sistemaId: string) => scope.explorando.some((x) => x.sistemaId === sistemaId);
  const recom = ESCOPO_INFO[recomendado];

  return (
    <div className="espaco-painel">
      <button className="orbital-cta" onClick={() => abrirOrbital()} title="Mapa estratégico heliocêntrico em tela cheia">
        🪐 <b>Abrir Sala Orbital</b>
        <small>mapa heliocêntrico em tela cheia — sistemas, planetas e Terra em 3D</small>
      </button>

      <Panel titulo="Escopo do programa">
        <div className="espaco-toggle">
          {(Object.keys(ESCOPO_INFO) as (keyof typeof ESCOPO_INFO)[]).map((k) => (
            <button key={k} className={`et-btn ${modo === k ? 'ativo' : ''} ${k === 'bloco' ? 'bloco' : ''} ${k === 'terra' ? 'terra' : ''}`} onClick={() => setModoEspaco(k)} title={ESCOPO_INFO[k].desc}>
              {ESCOPO_INFO[k].icon} {ESCOPO_INFO[k].curto}
            </button>
          ))}
        </div>
        <span className="et-recom">
          {modo === recomendado
            ? `${recom.icon} ${ESCOPO_INFO[modo].desc} — ${resumo.membros.length} países no consórcio`
            : `${recom.icon} Sugerido: ${recom.curto} (${recom.desc})`}
        </span>
        <div className="membros-chips">
          {resumo.membros.map((m) => (
            <span key={m.id} className="membro-chip">
              <i className="dot" style={{ background: corDe(m.id) }} />
              {m.flag} {m.name}
            </span>
          ))}
        </div>
      </Panel>

      <Panel titulo="Setor de Exploração Espacial">
        <div className="espaco-metrics">
          <Metric label="Faixa explorada" valor={`${scope.faixa.toFixed(1)} ua`} />
          <Metric label="Descobrimentos" valor={fmtNum(scope.descobrimentos, 0)} />
          <Metric label="Pesquisa espacial" valor={fmtNum(resumo.espacial, 1)} />
          <Metric label="Alcance do consórcio" valor={`${alcance.toFixed(1)} ua`} />
        </div>
        <Gauge valor={Math.min(100, resumo.investTotal)} cor="#a78bfa" rotulo="Investimento espacial (consórcio, % PIB)" />
        <small className="dim">
          Sistemas desconhecidos dentro do alcance podem ser sondados. A sondagem vai para a fila de trânsito na Sala Orbital.
        </small>
        <CausaEfeito aba="espaco" cor="#a78bfa" />
      </Panel>

      <Panel titulo="Sistemas explorados">
        <div className="lista-desc">
          {revelados.map((s) => {
            const explorando = emExploracao(s.id);
            return (
              <button key={s.id} className="lista-item" onClick={() => abrirOrbital(s.id)} title="Abrir na Sala Orbital">
                <i className="dot" style={{ background: s.cor }} />
                <b>{s.nome}</b>
                <small>{distSistema(s).toFixed(1)} ua · {s.planetas.length} planetas{explorando ? ' · 🔭 sondas em trânsito' : ''}</small>
                <span className="hint">🪐 abrir</span>
              </button>
            );
          })}
        </div>
        {scope.explorando.length > 0 && (
          <p className="dim">🚀 Sondas em trânsito: {scope.explorando.map((x) => revelados.find((r) => r.id === x.sistemaId)?.nome ?? '—').join(', ')}</p>
        )}
      </Panel>

      <Panel titulo="Levantamento de sistemas distantes">
        <div className="lista-desc">
          {aDescobrir.length === 0 && <small className="dim">Nenhum alvo dentro do alcance atual ({alcance.toFixed(1)} ua). Avance a pesquisa espacial para estender o alcance.</small>}
          {aDescobrir.map((s) => {
            const explorando = emExploracao(s.id);
            return (
              <button key={s.id} className="lista-item" disabled={explorando} onClick={() => lancarExploracao(s.id)}>
                <i className="dot" style={{ background: SYS_COLORS[s.tipo], opacity: 0.6 }} />
                <b>{s.nome} <small>(sinal detectado)</small></b>
                <small>{distSistema(s).toFixed(1)} ua{explorando ? ' · 🔭 sonda a caminho' : ' · clique para enviar sonda'}</small>
              </button>
            );
          })}
          {foraDeAlcance > 0 && (
            <small className="dim">+{foraDeAlcance} sistemas além do alcance do consórcio ({alcance.toFixed(1)} ua)</small>
          )}
        </div>
        {!cap.podeLancar && <small className="dim">Seu país ainda não pode lançar sondas (requer pesquisa espacial ≥ 5 e investimento ≥ 10).</small>}
      </Panel>

      <Panel titulo="Colônias do consórcio">
        <div className="lista-desc">
          {resumo.colonias.length === 0 && <small className="dim">Nenhuma colônia no escopo. Funde a primeira em um planeta habitável sondado — visualize na Sala Orbital.</small>}
          {resumo.colonias.map((col) => {
            const minha = col.dono === c.id;
            const s = scope.sistemas.find((x) => x.id === col.sistemaId);
            const dono = w.paises[col.dono];
            return (
              <div key={col.id} className={`lista-item ${minha ? '' : 'dim'}`}>
                <b><i className="dot" style={{ background: corDe(col.dono) }} /> {dono?.flag ?? ''} {col.nome}</b>
                <small>{s?.nome ?? '—'} · {fmtNum(col.populacao, 0)} mil hab · {col.fase} · Auto {fmtNum(col.autossuficiencia, 0)}%</small>
                {minha && <button className="btn" onClick={() => expandirColonia(col.id)}>🚧 Expandir</button>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel titulo="Programas espaciais">
        <div className="lista-desc">
          {resumo.programas.length === 0 && <small className="dim">Sem programas no escopo. Crie programas na aba Pesquisa (programa orbital lunar → interplanetário).</small>}
          {resumo.programas.map(({ prog, dono }) => {
            const spec = PROGRAMA_TIPOS[prog.tipo];
            return (
              <div key={`${dono.id}-${prog.id}`} className="lista-item">
                <b>{spec.emoji} <i style={{ fontStyle: 'normal' }}>{dono.flag}</i> {prog.nome}</b>
                <small>{spec.nome} · {fmtNum(prog.investido, 1)}/{prog.custo}% PIB</small>
                <div className="gauge-track">
                  <div className="gauge-fill" style={{ width: `${prog.progresso}%`, background: prog.concluido ? '#4ade80' : '#a78bfa' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};