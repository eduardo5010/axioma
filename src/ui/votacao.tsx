import { useEffect, useMemo, useState } from 'react';
import type { Party, VotoCadeira } from '../engine/types';
import { fmtMes } from '../engine/util';
import { par } from '../engine/normas/registro';
import { nomeMedida } from '../engine/propostas';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';

const COR_VOTO: Record<string, string> = {
  favor: '#22c55e',
  contra: '#ef4444',
  abstencao: '#eab308',
  ausente: '#64748b',
};

interface Pos { x: number; y: number; raio: number }

const layoutPlenario = (n: number): Pos[] => {
  const rows = Math.min(10, Math.max(3, Math.ceil(n / 16)));
  const Rmax = 200;
  const Rmin = Math.max(58, 72 - rows * 2);
  const radii: number[] = [];
  for (let i = 0; i < rows; i++) radii.push(Rmax - ((Rmax - Rmin) * i) / Math.max(1, rows - 1));
  const pesos = radii.map((r) => r * r);
  const soma = pesos.reduce((a, b) => a + b, 0);
  const contagens: number[] = [];
  let acc = 0;
  for (let i = 0; i < rows; i++) {
    const q = Math.round((n * pesos[i]) / soma);
    contagens.push(q);
    acc += q;
  }
  if (acc !== n) contagens[0] += n - acc;
  const raioBase = Math.max(2.2, 5.6 * Math.sqrt(100 / Math.max(60, n)));
  const out: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    const cnt = contagens[r];
    for (let s = 0; s < cnt; s++) {
      const t = cnt > 1 ? s / (cnt - 1) : 0.5;
      const theta = Math.PI - t * Math.PI;
      out.push({
        x: 210 + radii[r] * Math.cos(theta),
        y: 210 - radii[r] * Math.sin(theta),
        raio: Math.max(1.7, raioBase - Math.floor(r / 2) * Math.min(0.6, raioBase * 0.22)),
      });
    }
  }
  return out;
};

const layoutTribunal = (n: number): Pos[] => {
  const out: Pos[] = [];
  for (let s = 0; s < n; s++) {
    const t = n > 1 ? s / (n - 1) : 0.5;
    const theta = Math.PI - t * Math.PI;
    out.push({ x: 210 + 118 * Math.cos(theta), y: 182 - 118 * Math.sin(theta), raio: 15 });
  }
  return out;
};

const apura = (votos: VotoCadeira[], tipo: 'legislativo' | 'tribunal') => {
  const c = { favor: 0, contra: 0, abstencao: 0, ausente: 0 };
  for (const v of votos) c[v.voto] += 1;
  const presentes = votos.filter((v) => v.voto !== 'ausente').length;
  const favorPct = presentes > 0 ? (c.favor / presentes) * 100 : 0;
  const passou = tipo === 'tribunal' ? c.favor > c.contra : c.favor > c.contra;
  return { c, presentes, favorPct, passou };
};

const ESPECTROS: { label: string; cor: string; min: number }[] = [
  { label: 'Esquerda', cor: '#ef4444', min: -Infinity },
  { label: 'Centro-esquerda', cor: '#f59e0b', min: -0.33 },
  { label: 'Centro', cor: '#a3a3a3', min: -0.11 },
  { label: 'Centro-direita', cor: '#22d3ee', min: 0.11 },
  { label: 'Direita', cor: '#3b82f6', min: 0.33 },
];

const espectroDe = (p: Party): { label: string; cor: string } => {
  const v = (p.ideology.econ + p.ideology.social) / 2;
  let out = ESPECTROS[0];
  for (const e of ESPECTROS) if (v >= e.min) out = e;
  return { label: out.label, cor: out.cor };
};

interface CumPartido {
  id: string;
  nome: string;
  cor: string;
  seats: number;
  favor: number;
  contra: number;
  abstencao: number;
  ausente: number;
  espLabel: string;
  espCor: string;
}

const RESUMO_VOTO_T: Record<string, string> = { favor: 'Favor', contra: 'Contra', abstencao: 'Absteve', ausente: 'Ausente' };

export const Hemiciclo = ({
  votos,
  tribuna = false,
  circulo = true,
  onTerminou,
  partidos,
  totalCadeiras,
  composicao = false,
}: {
  votos: VotoCadeira[];
  tribuna?: boolean;
  circulo?: boolean;
  onTerminou?: (fim: boolean) => void;
  partidos?: Party[];
  totalCadeiras?: number;
  composicao?: boolean;
}) => {
  const [n, setN] = useState(0);
  const total = votos.length;
  const totalSeats = totalCadeiras ?? total;
  const layout = useMemo(() => (circulo ? (tribuna ? layoutTribunal(total) : layoutPlenario(total)) : layoutTribunal(total)), [total, tribuna, circulo]);

  useEffect(() => {
    setN(0);
    onTerminou?.(false);
    if (total === 0) return;
    if (composicao) {
      setN(total);
      onTerminou?.(true);
      return;
    }
    const vel = Math.max(14, Math.round(par('cer.vel') * Math.min(1, 100 / total)));
    const iv = setInterval(() => setN((k) => Math.min(k + 1, total)), vel);
    return () => clearInterval(iv);
  }, [votos, total, composicao]);

  useEffect(() => {
    if (n >= total && total > 0) onTerminou?.(true);
  }, [n, total]);

  const cont = apura(votos, 'legislativo').c;
  const passou = apura(votos, 'legislativo').passou;
  const terminou = n >= total && total > 0;

  const resumo = useMemo<{ partidosCum: CumPartido[]; espectrosCum: { label: string; cor: string; seats: number }[] } | null>(() => {
    if (!partidos || tribuna) return null;
    const byParty = new Map<string, CumPartido>();
    for (const v of votos) {
      let e = byParty.get(v.partidoId);
      if (!e) {
        const pk = partidos.find((p) => p.id === v.partidoId);
        const esp = pk ? espectroDe(pk) : null;
        e = {
          id: v.partidoId,
          nome: v.nome ?? pk?.name ?? v.partidoId,
          cor: v.cor ?? pk?.color ?? '#94a3b8',
          seats: 0,
          favor: 0,
          contra: 0,
          abstencao: 0,
          ausente: 0,
          espLabel: esp?.label ?? '—',
          espCor: esp?.cor ?? '#94a3b8',
        };
        byParty.set(v.partidoId, e);
      }
      e.seats += 1;
      e[v.voto] += 1;
    }
    const partidosCum = [...byParty.values()].sort((a, b) => b.seats - a.seats || a.nome.localeCompare(b.nome));
    const byEsp = new Map<string, { label: string; cor: string; seats: number }>();
    for (const p of partidosCum) {
      let e2 = byEsp.get(p.espLabel);
      if (!e2) {
        e2 = { label: p.espLabel, cor: p.espCor, seats: 0 };
        byEsp.set(p.espLabel, e2);
      }
      e2.seats += p.seats;
    }
    const espectrosCum = [...byEsp.values()].sort((a, b) => b.seats - a.seats);
    return { partidosCum, espectrosCum };
  }, [votos, partidos, tribuna]);

  return (
    <div className="hemiciclo-wrap">
      <svg viewBox="0 0 420 232" className="hemiciclo" role="img" aria-label="Plenário">
        {!circulo && (
          <g>
            <rect x="150" y="206" width="120" height="10" rx="3" fill="#cbd5e1" />
            <rect x="160" y="200" width="100" height="6" rx="3" fill="#94a3b8" />
          </g>
        )}
        {circulo && !tribuna && <rect x="162" y="210" width="96" height="12" rx="4" fill="#94a3b8" />}
        {layout.map((pos, i) => {
          const v = votos[i];
          if (!v) return null;
          const revelado = i < n;
          const cor = composicao || !revelado ? v.cor ?? '#94a3b8' : COR_VOTO[v.voto] ?? '#fff';
          return (
            <g key={i} opacity={revelado ? 1 : 0.55}>
              <title>{revelado && !composicao ? `${v.nome ? v.nome + ': ' : ''}${RESUMO_VOTO_T[v.voto] ?? v.voto}` : v.nome ?? ''}</title>
              <circle cx={pos.x} cy={pos.y} r={pos.raio + 1.6} fill="rgba(255,255,255,0.12)" />
              <circle cx={pos.x} cy={pos.y} r={pos.raio} fill={cor} stroke={revelado ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)'} strokeWidth="1" />
            </g>
          );
        })}
      </svg>
      {!composicao && terminou && (
        <div className={`hemiciclo-voto ${passou ? 'v-aprovado' : 'v-rejeitado'}`}>
          {passou ? 'APROVADA' : 'REJEITADA'}
        </div>
      )}
      {!composicao && (
        <div className="hemiciclo-tally">
          <span className="t-favor">● {cont.favor} favor</span>
          <span className="t-contra">● {cont.contra} contra</span>
          {cont.abstencao > 0 && <span className="t-abst">● {cont.abstencao} abst.</span>}
          {cont.ausente > 0 && <span className="t-aus">● {cont.ausente} aus.</span>}
          <span className="t-presentes">presentes {apura(votos, 'legislativo').presentes}/{total}</span>
        </div>
      )}
      {!composicao && total > 0 && (
        <button className="btn btn-aco btn-pequeno hemiciclo-pula" onClick={() => setN(total)}>⏩ Pular</button>
      )}
      {tribuna ? (
        <div className="plenario-resumo">
          <div className="plenario-titulo">⚖️ <b>{totalSeats} ministros</b></div>
        </div>
      ) : resumo && (
        <div className="plenario-resumo">
          <div className="plenario-titulo">🏛️ <b>{totalSeats} cadeiras</b> <span className="plenario-sub">· {resumo.partidosCum.length} partidos · {resumo.espectrosCum.length} espectros</span></div>
          <div className="plenario-rotulo">Divisão por partido</div>
          <div className="plenario-linha">
            {resumo.partidosCum.map((pp) => (
              <span
                key={pp.id}
                className="plenario-seg"
                style={{ width: `${(pp.seats / Math.max(1, totalSeats)) * 100}%`, background: pp.cor }}
                title={composicao ? `${pp.nome}: ${pp.seats} cadeiras` : `${pp.nome}: ${pp.seats} cadeiras · favor ${pp.favor} · contra ${pp.contra} · abst. ${pp.abstencao} · aus. ${pp.ausente}`}
              />
            ))}
          </div>
          <div className="plenario-lendas">
            {resumo.partidosCum.map((pp) => (
              <span key={pp.id} className="plenario-lenda">
                <i className="plenario-dot" style={{ background: pp.cor }} />
                {pp.nome} <b>{pp.seats}</b>
              </span>
            ))}
          </div>
          <div className="plenario-rotulo">Divisão por espectro ideológico</div>
          <div className="plenario-linha">
            {resumo.espectrosCum.map((ee) => (
              <span
                key={ee.label}
                className="plenario-seg"
                style={{ width: `${(ee.seats / Math.max(1, totalSeats)) * 100}%`, background: ee.cor }}
                title={`${ee.label}: ${ee.seats} cadeiras`}
              />
            ))}
          </div>
          <div className="plenario-lendas">
            {resumo.espectrosCum.map((ee) => (
              <span key={ee.label} className="plenario-lenda">
                <i className="plenario-dot" style={{ background: ee.cor }} />
                {ee.label} <b>{ee.seats}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TrilhaEtapa { key: string; rotulo: string }

const FASE_INFO: Record<string, { icone: string; rotulo: string }> = {
  camara: { icone: '🏛️', rotulo: 'Câmara Baixa' },
  senado: { icone: '🏛️', rotulo: 'Senado' },
  sancao: { icone: '✍️', rotulo: 'Sanção' },
  revisao: { icone: '⚖️', rotulo: 'Tribunal' },
};

const trilha = (tipo: string, bicameral?: boolean): TrilhaEtapa[] => {
  const t: TrilhaEtapa[] = [{ key: 'camara', rotulo: 'Câmara' }];
  if (bicameral) t.push({ key: 'senado', rotulo: 'Senado' });
  if (tipo === 'presidencial' || tipo === 'semipresidencial') t.push({ key: 'sancao', rotulo: 'Sanção' });
  t.push({ key: 'revisao', rotulo: 'Tribunal' });
  return t;
};

export const CerimoniaModal = () => {
  const w = useGame((s) => s.w);
  const cerimoniaId = useGame((s) => s.cerimoniaId);
  const concluir = useGame((s) => s.concluirCerimonia);
  const sancionar = useGame((s) => s.sancionarCerimonia);
  const vetar = useGame((s) => s.vetarCerimonia);
  const ajustar = useGame((s) => s.ajustarCerimonia);
  const [pronto, setPronto] = useState(false);

  if (!w || !cerimoniaId) return null;
  const c = w.paises[w.jogadorId];
  if (!c) return null;
  const p = c.propostas.find((x) => x.id === cerimoniaId);
  if (!p) return null;

  const fase = p.fase === 'camara' || p.fase === 'senado' || p.fase === 'sancao' || p.fase === 'revisao' ? p.fase : 'camara';
  const etapa = trilha(c.governo?.sistema, c.governo?.bicameral);
  const info = FASE_INFO[fase];
  const naSancao = fase === 'sancao';
  const votos = fase === 'revisao' ? p.votosJud ?? [] : p.votos ?? [];
  const votosPrev = (fase === 'sancao' ? (p.votosJud?.length ? p.votosJud : p.votos) : undefined);
  const articulado = fase === 'revisao' ? p.articuladoJud : p.articuladoLeg;
  const medidas = naSancao ? null : <span className="fase-medidas">“{nomeMedida(c, p)}”</span>;

  return (
    <div className="modal-backdrop">
      <div className="modal-card cerimonia">
        <div className="cerimonia-topo">
          <div className="cerimonia-titulo">
            <span className="cerimonia-icone">{info.icone}</span>
            <div>
              <h2>{c.flag} {c.name} — {info.rotulo}</h2>
              <small>{fmtMes(w.ano, w.mes)} · {medidas}</small>
            </div>
          </div>
          <div className="cerimonia-trilha">
            {etapa.map((t, i) => {
              const idx = etapa.findIndex((e) => e.key === fase);
              const done = i < idx;
              const atual = i === idx;
              return (
                <span key={t.key} className={`trilha-passo ${done ? 'done' : atual ? 'atual' : 'futuro'}`}>
                  <i>{done ? '✓' : FASE_INFO[t.key]?.icone ?? '•'}</i>
                  {t.rotulo}
                </span>
              );
            })}
          </div>
        </div>

        {naSancao ? (
          <div className="cerimonia-sancao">
            <p className="dim">
              O <b>legislativo</b> aprovou <b>“{nomeMedida(c, p)}”</b>.
              {c.governo?.sistema === 'presidencial' || c.governo?.sistema === 'semipresidencial'
                ? ` Como ${c.governo.sistema === 'presidencial' ? 'presidente' : 'sistema semipresidencial'}, a palavra final é do executivo.`
                : ''}
            </p>
            <div className="cerimonia-botoes">
              <button className="btn btn-ok btn-grande" onClick={() => sancionar()}>✍️ Sancionar e promulgar</button>
              <button className="btn btn-perigo btn-grande" onClick={() => vetar()}>🛑 Vetar integralmente</button>
            </div>
            <p className="dim">
              Se vetar, o legislativo poderá derrubar o veto por supermaioria (2/3 dos presentes) e promulgar contra sua vontade.
            </p>
          </div>
        ) : (
          <div className="cerimonia-votacao">
            {!articulado && fase !== 'revisao' && (
              <button className="btn btn-aco votacao-articular" onClick={() => ajustar()}>
                🤝 Articular em plenário e recontar votos (custa apoio)
              </button>
            )}
            {!articulado && fase === 'revisao' && (
              <button className="btn btn-aco votacao-articular" onClick={() => ajustar()}>
                ⚖️ Negociar com ministros e recontar (custa apoio e gera conflito)
              </button>
            )}
            <Hemiciclo votos={votos} tribuna={fase === 'revisao'} circulo={fase !== 'revisao'} onTerminou={setPronto} partidos={c.partidos} totalCadeiras={c.governo?.cadeirasTotal ?? votos.length} />
            {votosPrev && votosPrev.length > 0 && fase !== 'revisao' && (
              <p className="dim cerimonia-legado">
                Votação legislativa anterior: {apura(votosPrev, 'legislativo').c.favor} favor · {apura(votosPrev, 'legislativo').c.contra} contra
              </p>
            )}
          </div>
        )}

        {!naSancao && (
          <div className="cerimonia-rodape">
            <button className="btn btn-ok" disabled={!pronto} onClick={() => concluir()}>
              {(fase === 'revisao' ? 'Registrar veredito' : 'Registrar resultado')} ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** Composição do parlamento (legislativo) e do tribunal (judiciário), acessível fora das votações. */
export const PlenarioModal = () => {
  const w = useGame((s) => s.w);
  const plenario = useUi((s) => s.plenario);
  const fecharPlenario = useUi((s) => s.fecharPlenario);
  const [aba, setAba] = useState<'legislativo' | 'judiciario'>('legislativo');

  useEffect(() => {
    if (plenario) setAba(plenario);
  }, [plenario]);

  const votos = useMemo<VotoCadeira[]>(() => {
    const cc = w?.paises[w.jogadorId];
    const gg = cc?.governo;
    if (!cc || !gg) return [];
    if (aba === 'judiciario') {
      const n = Math.max(3, Math.round(par('jud.membros')));
      return Array.from({ length: n }, (_, i) => ({ partidoId: 'corte', cor: '#a78bfa', nome: `Ministro(a) ${i + 1}`, voto: 'favor' as const }));
    }
    const list: VotoCadeira[] = [];
    const ord = [...cc.partidos].sort((a, b) => (gg.cadeiras[b.id] ?? 0) - (gg.cadeiras[a.id] ?? 0));
    for (const partido of ord) {
      const q = Math.max(0, gg.cadeiras[partido.id] ?? 0);
      for (let i = 0; i < q; i++) list.push({ partidoId: partido.id, cor: partido.color, nome: partido.name, voto: 'favor' });
    }
    return list;
  }, [aba, w]);

  if (!w || !plenario) return null;
  const c = w.paises[w.jogadorId];
  if (!c || !c.governo) return null;
  const g = c.governo;
  const jud = aba === 'judiciario';

  return (
    <div className="modal-backdrop">
      <div className="modal-card plenario">
        <div className="cerimonia-topo">
          <div className="cerimonia-titulo">
            <span className="cerimonia-icone">{jud ? '⚖️' : '🏛️'}</span>
            <div>
              <h2>{c.flag} {c.name} — {jud ? 'Composição do tribunal' : 'Composição do parlamento'}</h2>
              <small>{fmtMes(w.ano, w.mes)} · {jud ? `${votos.length} ministros` : `${g.cadeirasTotal} cadeiras · ${g.coalizao.length} partidos na coalizão`}</small>
            </div>
          </div>
          <button className="btn btn-fechar plenario-fecha" onClick={fecharPlenario} title="Fechar">✕</button>
        </div>

        <div className="plenario-tabs">
          <button className={`plenario-tab ${!jud ? 'ativo' : ''}`} onClick={() => setAba('legislativo')}>🏛️ Legislativo</button>
          <button className={`plenario-tab ${jud ? 'ativo' : ''}`} onClick={() => setAba('judiciario')}>⚖️ Judiciário</button>
        </div>

        <div className="cerimonia-votacao">
          <Hemiciclo votos={votos} composicao tribuna={jud} circulo partidos={c.partidos} totalCadeiras={jud ? votos.length : g.cadeirasTotal} />
        </div>

        <div className="cerimonia-rodape">
          <button className="btn" onClick={fecharPlenario}>Fechar</button>
        </div>
      </div>
    </div>
  );
};