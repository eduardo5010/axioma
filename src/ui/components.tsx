import React, { useState, useEffect } from 'react';
import type { Country, World } from '../engine/types';
import { OPINION_GROUPS, IG_DEFS } from '../engine/data/groups';
import { POLICY_DEFS, REFORMAS_MAP } from '../engine/data/normas/catalogo';
import { nomeLocal } from '../engine/data/normas/local';
import { rel } from '../engine/geopolitics';
import { fmtBilhoes, fmtNum, fmtPct, fmtPop, relLabel, fmtDDD } from '../engine/util';
import type { HistoryPoint } from '../engine/types';
import { useGame } from '../store/game';
import { fatoresDe, efeitosDe, ABA_ICONES } from '../engine/links';
import type { Vinculo } from '../engine/links';
import { useUi } from '../store/ui';
import type { AbaId } from '../store/ui';

const FASE_ROTULO: Record<string, { i: string; n: string }> = {
  camara: { i: '🏛️', n: 'câmara' },
  senado: { i: '🏛️', n: 'senado' },
  sancao: { i: '✍️', n: 'sanção' },
  revisao: { i: '⚖️', n: 'tribunal' },
  fim: { i: '✅', n: 'concluída' },
};

export const Panel = ({ titulo, children, cor }: { titulo: string; children: React.ReactNode; cor?: string }) => (
  <section className="panel">
    <h3 style={{ borderColor: cor }}>{titulo}</h3>
    <div className="panel-body">{children}</div>
  </section>
);

export const Metric = ({ label, valor, tom }: { label: string; valor: string; tom?: 'bom' | 'ruim' | 'neutro' }) => (
  <div className={`metric ${tom ? `m-${tom}` : ''}`}>
    <span className="metric-val">{valor}</span>
    <span className="metric-label">{label}</span>
  </div>
);

export const Bandeira = ({ e }: { e: string }) => {
  const [err, setErr] = useState(false);
  const cc = Array.from(e).filter((c) => {
    const cp = c.codePointAt(0)!;
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  });
  const code = cc.map((c) => String.fromCharCode(c.codePointAt(0)! - 127397)).join('').toLowerCase();
  if (err || !code) return <span className="bandeira">{e}</span>;
  return (
    <span className="bandeira">
      <span className="bandeira-emoji">{e}</span>
      <img className="bandeira-img" src={`https://flagcdn.com/w80/${code}.png`} alt={e} draggable={false} onError={() => setErr(true)} />
    </span>
  );
};

export const Gauge = ({ valor, max = 100, min = -100, cor, rotulo }: { valor: number; max?: number; min?: number; cor: string; rotulo?: string }) => {
  const pct = ((valor - min) / (max - min)) * 100;
  return (
    <div className="gauge">
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }} />
      </div>
      <div className="gauge-row">
        <span>{rotulo}</span>
        <b>{fmtNum(valor, 1)}</b>
      </div>
    </div>
  );
};

export const Slider = ({
  nome, desc, min, max, step, valor, unidade, emoji, onChange, pendente, rascunho,
}: {
  nome: string; desc: string; min: number; max: number; step: number; valor: number; unidade: string; emoji: string; onChange: (v: number) => void; pendente?: boolean; rascunho?: boolean;
}) => {
  const [txt, setTxt] = useState<string>(() => String(valor));
  useEffect(() => setTxt(String(valor)), [valor]);

  const arredonda = (v: number) => {
    const casas = Math.max(0, -Math.floor(Math.log10(Math.max(step, 1e-9))));
    return Number(v.toFixed(casas));
  };
  const aplicar = (raw: string) => {
    const n = Number(String(raw).replace(',', '.'));
    if (Number.isNaN(n)) {
      setTxt(String(valor));
      return;
    }
    const alvo = arredonda(Math.min(max, Math.max(min, n)));
    if (alvo === valor) {
      setTxt(String(valor));
      return;
    }
    onChange(alvo);
  };
  const passo = (dir: 1 | -1) => onChange(arredonda(Math.min(max, Math.max(min, valor + dir * step))));
  const unidadeTxt = unidade === 'gdp' ? '% PIB' : unidade === 'pct' ? '%' : unidade === 'x' ? '×' : '';

  return (
    <div className={`slider-row ${rascunho ? 'slider-rascunho' : ''}`}>
      <div className="slider-info">
        <span className="slider-emoji">{emoji}</span>
        <div>
          <b>{nome}</b>
          <small>{desc}</small>
        </div>
      </div>
      <div className="slider-controle">
        <div className="caixa-stepper">
          <button type="button" className="stepper" onClick={() => passo(-1)} aria-label={`diminuir ${nome}`}>−</button>
          <input
            className="caixa-valor"
            type="text"
            inputMode="decimal"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onBlur={() => aplicar(txt)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aplicar(txt);
            }}
          />
          <button type="button" className="stepper" onClick={() => passo(1)} aria-label={`aumentar ${nome}`}>+</button>
        </div>
        <span className="slider-val">{unidadeTxt}</span>
        {rascunho && <span className="pendente pend-entregue">✍️ rascunho</span>}
        {pendente && <span className="pendente">⏳ votação</span>}
      </div>
    </div>
  );
};

export const Toggle = ({
  nome, desc, ligado, emoji, onChange, pendente,
}: {
  nome: string; desc: string; ligado: boolean; emoji: string; onChange: () => void; pendente?: boolean;
}) => (
  <button className={`toggle ${ligado ? 'on' : 'off'}`} onClick={onChange}>
    <span className="slider-emoji">{emoji}</span>
    <span className="toggle-text">
      <b>{nome}</b>
      <small>{desc}</small>
    </span>
    <span className="toggle-switch">{ligado ? 'ATIVO' : 'inativo'}</span>
    {pendente && <span className="pendente">⏳ votação</span>}
  </button>
);

export const PropostasPendentes = ({ c }: { c: Country }) => {
  const cancelar = useGame((s) => s.cancelarProposta);
  const articularLeg = useGame((s) => s.articularLeg);
  const articularJud = useGame((s) => s.articularJud);
  const turno = useGame((s) => s.w?.turno ?? 0);
  const lista = (c.propostas ?? []).filter((p) => p.origem === 'jogador');
  if (lista.length === 0) return <p className="dim">Nenhuma proposta sua em tramitação.</p>;
  return (
    <div className="propostas">
      {lista.map((p) => {
        const nome =
          p.tipo === 'reforma' && p.reforma
            ? `${REFORMAS_MAP[p.reforma]?.emoji ?? ''} ${nomeLocal(c.id, p.reforma, { nome: REFORMAS_MAP[p.reforma]?.nome ?? p.reforma }).nome}${REFORMAS_MAP[p.reforma]?.parametro && p.param !== undefined ? ` (alíquota ${fmtNum(p.param, 2)}${REFORMAS_MAP[p.reforma].parametro!.unidade})` : ''}`
            : p.tipo === 'slider'
              ? `Ajuste de ${nomeLocal(c.id, p.politica ?? '', { nome: POLICY_DEFS.find((d) => d.key === p.politica)?.nome ?? p.politica ?? '' }).nome}`
              : `Mudança legislativa`;
        const acao = p.tipo === 'reforma' || p.tipo === 'toggle' ? (p.delta! > 0 ? 'adotar' : 'revogar') : '';
        const rotulo = FASE_ROTULO[(p.fase ?? 'camara') as string] ?? { i: '📜', n: 'tramitação' };
        const restante = p.votoEm ? Math.max(0, p.votoEm - turno) : 0;
        const etapaLabel =
          p.fase === 'sancao' ? '✍️ aguarda sanção do executivo'
            : p.fase === 'revisao' ? `${rotulo.i} tribunal · ${restante} mês(es)`
            : p.fase === 'fim' ? '✅ concluída'
            : `${rotulo.i} ${rotulo.n} · ${restante} mês(es)`;
        const podeLeg = (p.fase === 'camara' || p.fase === 'senado') && !p.cerimonia && !p.articuladoLeg;
        const podeJud = p.fase === 'revisao' && !p.cerimonia && !p.articuladoJud;
        return (
          <div key={p.id} className="proposta">
            <div className="proposta-info">
              <b>{nome}</b>
              <small>{etapaLabel} · {acao}</small>
              {(podeLeg || podeJud) && (
                <div className="proposta-acoes">
                  {podeLeg && <button className="btn btn-aco" onClick={() => articularLeg(p.id)}>🤝 Articular plenário</button>}
                  {podeJud && <button className="btn btn-aco" onClick={() => articularJud(p.id)}>⚖️ Pressionar tribunal</button>}
                </div>
              )}
            </div>
            {!p.cerimonia && <button className="btn btn-perigo" onClick={() => cancelar(p.id)}>Retirar</button>}
          </div>
        );
      })}
    </div>
  );
};

const minMax = (pts: number[]) => {
  if (!pts.length) return [0, 1];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const pad = (max - min) * 0.1 || 1;
  return [min - pad, max + pad];
};

export const MiniChart = ({ data, cor, altura = 54 }: { data: number[]; cor: string; altura?: number }) => {
  const [min, max] = minMax(data);
  const w = 220;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${altura - ((v - min) / (max - min)) * altura}`).join(' ');
  const area = `0,${altura} ${pts} ${w},${altura}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${altura}`} preserveAspectRatio="none" className="minichart">
      <polygon points={area} fill={cor} opacity={0.15} />
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2" />
    </svg>
  );
};

export const Table = ({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) => (
  <table className="tabela">
    <thead>
      <tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
    </tbody>
  </table>
);

export const RelationBar = ({ v }: { v: number }) => {
  const cor = v >= 60 ? '#4ade80' : v >= 20 ? '#a3e635' : v > -20 ? '#facc15' : v > -50 ? '#fb923c' : '#f87171';
  const pct = (v + 100) / 2;
  return (
    <div className="relbar">
      <div style={{ width: `${pct}%`, background: cor, height: '100%' }} />
    </div>
  );
};

export const headline = (p: Country, w: World) => {
  const disp = `${p.flag} ${p.name}`;
  const pop = `População: ${fmtPop(p.populacao)}`;
  const pib = `PIB: ${fmtBilhoes(p.gdp)}`;
  const pibpc = `PIB per capita: ${fmtDDD(Math.round((p.gdp * 1e9) / (p.populacao * 1e6)))}`;
  void w;
  void pop; void pib; void pibpc;
  return disp;
};

export const EstadoDoPais = ({ c }: { c: Country }) => {
  const pibpc = Math.round((c.gdp * 1e9) / (c.populacao * 1e6));
  return (
    <div className="estado-grid">
      <Metric label="PIB" valor={fmtBilhoes(c.gdp)} />
      <Metric label="Crescimento" valor={fmtPct(c.crescimento)} tom={c.crescimento >= 0 ? 'bom' : 'ruim'} />
      <Metric label="Inflação" valor={fmtPct(c.inflacao)} tom={c.inflacao > 6 ? 'ruim' : 'bom'} />
      <Metric label="Desemprego" valor={fmtPct(c.desemprego)} tom={c.desemprego > 9 ? 'ruim' : 'bom'} />
      <Metric label="PIB per capita" valor={`$${fmtDDD(pibpc)}`} />
      <Metric label="Dívida/PIB" valor={fmtPct(c.dividaPct)} tom={c.dividaPct > 110 ? 'ruim' : 'neutro'} />
    </div>
  );
};

export const GruposOpniao = ({ c, w }: { c: Country; w: World }) => {
  void w;
  return (
    <div className="grupos-grid">
      {OPINION_GROUPS.map((g) => (
        <div key={g.id} className="grupo-item">
          <span className="slider-emoji">{g.emoji}</span>
          <div className="grupo-meta">
            <b>{g.nome}</b>
            <small>{fmtPct(g.size(c) * 100, 0)} da população</small>
          </div>
          <span className={`aprov ${(c.opinioesGrupos[g.id] ?? 0) >= 20 ? 'ap-bom' : (c.opinioesGrupos[g.id] ?? 0) <= -20 ? 'ap-ruim' : ''}`}>
            {fmtNum(c.opinioesGrupos[g.id] ?? 0, 0)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const GruposInteresse = ({ c }: { c: Country }) => (
  <div className="grupos-grid ig">
    {IG_DEFS.map((g) => (
      <div key={g.id} className="grupo-item">
        <span className="slider-emoji">{g.emoji}</span>
        <div className="grupo-meta">
          <b>{g.nome}</b>
          <small>Poder: {fmtNum(c.prestigio[g.id] ?? 0, 1)}%</small>
        </div>
        <span className={`aprov ${(c.apoioGrupo[g.id] ?? 0) >= 20 ? 'ap-bom' : (c.apoioGrupo[g.id] ?? 0) <= -20 ? 'ap-ruim' : ''}`}>
          {fmtNum(c.apoioGrupo[g.id] ?? 0, 0)}
        </span>
      </div>
    ))}
  </div>
);

export const PartyList = ({ c }: { c: Country }) => (
  <div className="partidos">
    {[...c.partidos].sort((a, b) => b.support - a.support).map((p) => (
      <div key={p.id} className={`partido ${p.ruling ? 'ruling' : ''}`} style={{ borderColor: p.color }}>
        <div className="partido-iden">
          <b style={{ color: p.color }}>{p.name}</b>
          <small>
            {p.ruling ? '⚠️ Governo' : 'Oposição'} · E:{fmtNum(p.ideology.econ, 1)} S:{fmtNum(p.ideology.social, 1)}
          </small>
        </div>
        <div className="partido-bar">
          <div style={{ width: `${Math.min(100, p.support)}%`, background: p.color }} />
        </div>
        <b className="partido-pct">{fmtNum(p.support, 1)}%</b>
        {p.seats > 0 && <small className="partido-cadeiras">{fmtDDD(p.seats)} cadeiras</small>}
      </div>
    ))}
  </div>
);

export const NewsFeed = ({ w }: { w: World }) => (
  <div className="feed">
    {w.noticias.slice(0, 12).map((n, i) => (
      <div key={i} className={`news n-${n.tom}`}>
        <span className="news-mes">{n.mes}</span>
        <span>{n.texto}</span>
      </div>
    ))}
  </div>
);

export const RelTableView = ({ c, w }: { c: Country; w: World }) => (
  <Table
    cols={['País', 'Relação', 'Status']}
    rows={Object.values(w.paises)
      .filter((o) => o.id !== c.id)
      .sort((a, b) => rel(w, c.id, b.id) - rel(w, c.id, a.id))
      .map((o) => [
        <span key={o.id} className="cell-pais"><Bandeira e={o.flag} /> <span>{o.name}</span></span>,
        <RelationBar key={`r${o.id}`} v={rel(w, c.id, o.id)} />,
        <b key={`s${o.id}`} className="status">{relLabel(rel(w, c.id, o.id))}</b>,
      ])}
  />
);

export const HistoryChart = ({ historico, serie }: { historico: HistoryPoint[]; serie: keyof HistoryPoint }) => {
  const dados = historico.map((h) => h[serie] as number);
  const cores: Record<string, string> = {
    gdp: '#34d399', crescimento: '#4ade80', inflacao: '#fb923c', desemprego: '#f87171',
    aprovacao: '#c9962e', divida: '#f59e0b', gini: '#c084fc',
  };
  const labels: Record<string, string> = {
    gdp: 'PIB', crescimento: 'Cresc.', inflacao: 'Inflação', desemprego: 'Desemprego',
    aprovacao: 'Aprovação', divida: 'Dívida/PIB', gini: 'Gini',
  };
  return (
    <div className="histwrap">
      <MiniChart data={dados} cor={cores[serie]} altura={64} />
      <small>{labels[serie]}</small>
    </div>
  );
};

export const setoresBar = (c: Country) => {
  const soma = c.setores.agricultura + c.setores.industria + c.setores.servicos || 1;
  return [
    { nome: 'Agricultura', v: c.setores.agricultura / soma * 100, cor: '#84cc16' },
    { nome: 'Indústria', v: c.setores.industria / soma * 100, cor: '#7a4430' },
    { nome: 'Serviços', v: c.setores.servicos / soma * 100, cor: '#a78bfa' },
  ];
};

const QUALIDADE = (mag: number): string => (mag >= 60 ? 'forte' : mag >= 40 ? 'média' : 'fraca');

/** Navegação por causa & efeito: mostra fatores que alimentam uma aba e
 * abas afetadas por ela, com links navegáveis para as abas correspondentes. */
export const CausaEfeito = ({ aba, cor }: { aba: AbaId; cor: string }) => {
  const abrir = useUi((s) => s.abrir);

  const fatores = fatoresDe(aba);
  const efeitos = efeitosDe(aba);
  const nenhum = fatores.length === 0 && efeitos.length === 0;

  if (nenhum) return null;

  const irPara = (destino: AbaId) => {
    abrir(destino);
    useUi.getState().fechar('causaefeito');
  };

  const chip = (v: Vinculo) => (
    <button
      key={`${v.de}-${v.para}`}
      className="chip-ce"
      title={`${v.de} → ${v.para} (relação ${QUALIDADE(v.mag)})`}
      onClick={() => irPara(v.de === aba ? v.para : v.de)}
    >
      {v.emoji} {v.rotulo} <i>{ABA_ICONES[v.de === aba ? v.para : v.de]}</i>
    </button>
  );

  return (
    <div className="causaefeito">
      <h5>Causa & efeito</h5>
      {fatores.length > 0 && (
        <div className="ce-grupo">
          <span className="ce-rot">🔧 Alimenta <b style={{ color: cor }}>{ABA_ICONES[aba]} {aba}</b>:</span>
          <div className="ce-chips">{fatores.map(chip)}</div>
        </div>
      )}
      {efeitos.length > 0 && (
        <div className="ce-grupo">
          <span className="ce-rot">🎯 <b style={{ color: cor }}>{ABA_ICONES[aba]} {aba}</b> afeta:</span>
          <div className="ce-chips">{efeitos.map(chip)}</div>
        </div>
      )}
    </div>
  );
};