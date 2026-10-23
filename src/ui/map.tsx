import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import type { World, Country, TratadoTipo } from '../engine/types';
import { fmtBilhoes, fmtPop, fmtNum, fmtPct } from '../engine/util';
import { Bandeira } from './components';
import { emGuerraCom, poderMilitar, rel, temTratado } from '../engine/geopolitics';
import world from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoNaturalEarth1, geoContains, geoPath, type GeoProjection } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

type Topo = {
  objects: {
    countries: { type: string; geometries: { type: string; id?: number | string; arcs?: number[][] }[] };
  };
  arcs: unknown[];
};

const topo = world as unknown as Topo;
const mundo = feature(topo as never, topo.objects.countries as never) as unknown as FeatureCollection<Geometry>;
const FEATURAS: FeatureCollection<Geometry> = {
  type: 'FeatureCollection',
  features: mundo.features.filter((f) => String(f.id ?? '') !== '010'),
};

const W = 960;
const H = 480;

type Cam = '2d' | '2.5d';
export type ModoMapa =
  | 'politico' | 'militar' | 'economia' | 'populacao' | 'democracia' | 'estabilidade' | 'infra';

const MODE_LABEL: Record<ModoMapa, string> = {
  politico: 'Político', militar: 'Militar', economia: 'PIB', populacao: 'População',
  democracia: 'Democracia', estabilidade: 'Estabilidade', infra: 'Infraestrutura',
};
const MODE_ICON: Record<ModoMapa, string> = {
  politico: '🛡️', militar: '🪖', economia: '💵', populacao: '👥',
  democracia: '🗳️', estabilidade: '⚖️', infra: '🏗️',
};

const rampa = (t: number, stops: [number, number, number][]): string => {
  if (stops.length < 2) return 'rgb(100,116,139)';
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
};

const norm = (v: number, vmin: number, vmax: number, log = false): number => {
  if (log) { v = Math.log10(v + 1); vmin = Math.log10(vmin + 1); vmax = Math.log10(vmax + 1); }
  return (v - vmin) / (vmax - vmin);
};

const corRegime = (r: Country['regime']) =>
  r === 'democracia' ? '#34d399' : r === 'híbrido' ? '#fbbf24' : '#f87171';

interface ModoDef {
  valor: (c: Country) => number;
  dom: [number, number];
  log?: boolean;
  stops: [number, number, number][];
}

const MODOS: Record<Exclude<ModoMapa, 'politico'>, ModoDef> = {
  militar: { valor: (c) => poderMilitar(c), dom: [0, 9000], stops: [[37, 99, 235], [250, 204, 21], [239, 68, 68]] },
  economia: { valor: (c) => c.gdp, dom: [0.5, 15000], log: true, stops: [[51, 65, 85], [74, 222, 128]] },
  populacao: { valor: (c) => c.populacao, dom: [0.1, 900], log: true, stops: [[51, 65, 85], [168, 85, 247]] },
  democracia: { valor: (c) => c.democracia, dom: [0, 1], stops: [[239, 68, 68], [250, 204, 21], [52, 211, 153]] },
  estabilidade: { valor: (c) => c.estabilidade, dom: [-30, 100], stops: [[239, 68, 68], [250, 204, 21], [52, 211, 153]] },
  infra: { valor: (c) => c.infraestrutura, dom: [0, 100], stops: [[51, 65, 85], [96, 165, 250]] },
};

const corDe = (c: Country, modo: ModoMapa): string => {
  if (modo === 'politico') return corRegime(c.regime);
  const def = MODOS[modo];
  return rampa(norm(def.valor(c), def.dom[0], def.dom[1], def.log), def.stops);
};

const projPara = (cam: Cam): GeoProjection => {
  const base = cam === '2d' ? geoEquirectangular() : geoNaturalEarth1();
  return base.fitSize([W, H], FEATURAS);
};

const TERRA_TEX =
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';

let carregaTerra: Promise<HTMLImageElement | null> | null = null;

const terraImg = (): Promise<HTMLImageElement | null> => {
  if (!carregaTerra) {
    carregaTerra = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = TERRA_TEX;
    });
  }
  return carregaTerra;
};

const texturaRect = (proj: GeoProjection): { x: number; y: number; w: number; h: number } => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let lat = -90; lat <= 90; lat += 8) {
    for (const lon of [-180, 180]) {
      const p = proj([lon, lat]);
      if (p) { xs.push(p[0]); ys.push(p[1]); }
    }
  }
  const x = Math.min(...xs) - 2;
  const y = Math.min(...ys) - 2;
  return { x, y, w: Math.max(...xs) - x + 4, h: Math.max(...ys) - y + 4 };
};

const geraTextura = (
  proj: GeoProjection,
  rect: { x: number; y: number; w: number; h: number },
  img: HTMLImageElement,
): string | null => {
  try {
    const S = 0.5;
    const cw = Math.max(2, Math.round(rect.w * S));
    const ch = Math.max(2, Math.round(rect.h * S));
    const cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const sCv = document.createElement('canvas');
    sCv.width = img.naturalWidth || 640;
    sCv.height = img.naturalHeight || 360;
    const sCtx = sCv.getContext('2d');
    if (!sCtx) return null;
    sCtx.drawImage(img, 0, 0);
    const sw = sCv.width;
    const sh = sCv.height;
    const sd = sCtx.getImageData(0, 0, sw, sh);
    const out = ctx.createImageData(cw, ch);
    const d = out.data;
    for (let y = 0; y < ch; y++) {
      const vy = rect.y + (y + 0.5) / S;
      for (let x = 0; x < cw; x++) {
        const o = (y * cw + x) * 4;
        let r = 18, g = 35, b = 58;
        const vx = rect.x + (x + 0.5) / S;
        const inv = proj.invert;
        const ll = inv ? inv([vx, vy]) : null;
        if (ll) {
          let lon = ll[0];
          const lat = ll[1];
          if (Number.isFinite(lon) && Number.isFinite(lat)) {
            if (lon > 180) lon -= 360;
            if (lon < -180) lon += 360;
            const sx = ((lon + 180) / 360) * sw;
            const sy = ((90 - lat) / 180) * sh;
            if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
              const sx0 = Math.min(sw - 1, Math.max(0, Math.floor(sx)));
              const sy0 = Math.min(sh - 1, Math.max(0, Math.floor(sy)));
              const so = (sy0 * sw + sx0) * 4;
              r = sd.data[so];
              g = sd.data[so + 1];
              b = sd.data[so + 2];
            }
          }
        }
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return cv.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
};

interface TexRect { x: number; y: number; w: number; h: number; }
let texCache: Partial<Record<Cam, { url: string; rect: TexRect }>> = {};

const LEGENDA_POL: { label: string; cor: string }[] = [
  { label: 'Democracia', cor: '#34d399' },
  { label: 'Híbrido', cor: '#fbbf24' },
  { label: 'Autoritário', cor: '#f87171' },
];

interface StageProps {
  w: World;
}

export const MapStage = ({ w }: StageProps) => {
  const novoJogo = useGame((s) => s.novoJogo);
  const diplomacia = useGame((s) => s.diplomacia);
  const tratarTratado = useGame((s) => s.tratarTratado);
  const espionagem = useGame((s) => s.espionagem);
  const intimar = useGame((s) => s.intimar);
  const abrirOrbital = useUi((s) => s.abrirOrbital);
  const [cam, setCam] = useState<Cam>('2d');
  const [modo, setModo] = useState<ModoMapa>('politico');
  const jogador = w.paises[w.jogadorId];
  const [sel, setSel] = useState<string | null>(jogador?.id ?? null);

  const proj = useMemo(() => projPara(cam), [cam]);
  const path = useMemo(() => geoPath(proj), [proj]);

  // ----- Pan & zoom (projeções planas) -----
  const [vista, setVista] = useState({ x: 0, y: 0, k: 1 });
  const [arrastando, setArrastando] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const arr = useRef({ sx: 0, sy: 0, vx: 0, vy: 0 });
  const movedRef = useRef(false);

  const pontoEN = (e: ReactPointerEvent | ReactWheelEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  };

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const k0 = vista.k;
    const k1 = Math.min(8, Math.max(0.4, k0 * Math.exp(-e.deltaY * 0.0016)));
    const [fx, fy] = pontoEN(e);
    setVista((v) => {
      const nx = fx - ((fx - v.x) / k0) * k1;
      const ny = fy - ((fy - v.y) / k0) * k1;
      return { x: nx, y: ny, k: k1 };
    });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const p = pontoEN(e);
    arr.current = { sx: p[0], sy: p[1], vx: vista.x, vy: vista.y };
    setArrastando(true);
    movedRef.current = false;
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!arrastando) return;
    const p = pontoEN(e);
    const dx = p[0] - arr.current.sx;
    const dy = p[1] - arr.current.sy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
    setVista((v) => ({ x: arr.current.vx + dx, y: arr.current.vy + dy, k: v.k }));
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    setArrastando(false);
    if (e.button !== 0) return;
    if (movedRef.current) return;
    const p = pontoEN(e);
    const local: [number, number] = [(p[0] - vista.x) / vista.k, (p[1] - vista.y) / vista.k];
    const id = paisNoPonto(local);
    if (id) setSel(id);
  };

  const onPointerLeave = () => setArrastando(false);

  const resetar = () => {
    setVista({ x: 0, y: 0, k: 1 });
  };

  const zoomBotao = (f: number) => {
    setVista((v) => {
      const k1 = Math.min(8, Math.max(0.4, v.k * f));
      return { x: (v.x * k1) / v.k, y: (v.y * k1) / v.k, k: k1 };
    });
  };

  const texturaFundo = useMemo(() => {
    const pts = [
      proj([-180, 90]),
      proj([180, 90]),
      proj([180, -90]),
      proj([-180, -90]),
    ].filter((q): q is [number, number] => q !== null);
    if (pts.length < 4) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }, [proj]);

  const [tex, setTex] = useState<{ url: string; rect: TexRect } | null>(null);

  useEffect(() => {
    if (cam === '2d') {
      setTex(null);
      return;
    }
    if (texCache[cam]) {
      setTex(texCache[cam]!);
      return;
    }
    let active = true;
    const rect = texturaRect(proj);
    terraImg().then((img) => {
      if (!active || !img) return;
      const url = geraTextura(proj, rect, img);
      if (!active || !url) return;
      const entry = { url, rect };
      texCache[cam] = entry;
      setTex(entry);
    });
    return () => { active = false; };
  }, [cam, proj]);

  const paises = Object.values(w.paises);

  const paisNoPonto = (local: [number, number]): string | null => {
    const inv = proj.invert;
    const ll = inv ? inv(local) : null;
    if (ll && Number.isFinite(ll[0]) && Number.isFinite(ll[1])) {
      let lon = ll[0];
      const lat = ll[1];
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      for (const f of FEATURAS.features) {
        if (f.id == null || !f.geometry) continue;
        const c = paises.find((p) => String(p.iso ?? '') === String(f.id));
        if (!c) continue;
        if (geoContains(f.geometry, [lon, lat])) return c.id;
      }
    }
    let melhor: string | null = null;
    let md = 7;
    for (const f of FEATURAS.features) {
      if (f.id == null) continue;
      const c = paises.find((p) => String(p.iso ?? '') === String(f.id));
      if (!c) continue;
      const bb = path.bounds(f as never);
      if (!bb || !Number.isFinite(bb[0][0]) || !Number.isFinite(bb[1][0])) continue;
      const cx = (bb[0][0] + bb[1][0]) / 2;
      const cy = (bb[0][1] + bb[1][1]) / 2;
      const d = Math.hypot(cx - local[0], cy - local[1]);
      if (d < md) { md = d; melhor = c.id; }
    }
    if (melhor) return melhor;
    for (const p of paises) {
      if (p.lat === 0 && p.lon === 0) continue;
      if (FEATURAS.features.some((f) => String(f.id ?? '') === String(p.iso ?? ''))) continue;
      const pt = proj([p.lon, p.lat]);
      if (!pt) continue;
      const d = Math.hypot(pt[0] - local[0], pt[1] - local[1]);
      if (d < 8) return p.id;
    }
    return null;
  };
  const selPais = sel ? w.paises[sel] : undefined;
  const emGuerra = selPais ? emGuerraCom(w, selPais.id).filter((id) => id !== w.jogadorId) : [];
  const relJ = selPais && selPais.id !== w.jogadorId ? rel(w, w.jogadorId, selPais.id) : 0;
  const emGuerraJogador = selPais ? emGuerraCom(w, w.jogadorId).includes(selPais.id) : false;

  const defLegenda = modo === 'politico' ? null : MODOS[modo];
  const legLabel = (): string => {
    if (modo === 'economia') return `${fmtBilhoes(defLegenda!.dom[0])} → ${fmtBilhoes(defLegenda!.dom[1])}`;
    if (modo === 'populacao') return `${fmtPop(defLegenda!.dom[0])} → ${fmtPop(defLegenda!.dom[1])}`;
    if (modo === 'democracia') return `0% → 100%`;
    if (modo === 'estabilidade') return `-30 → 100`;
    return `${defLegenda!.dom[0]} → ${defLegenda!.dom[1]}`;
  };

  return (
    <div className="mapa-stage">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`mapa-svg cam-${cam}`}
        preserveAspectRatio="xMidYMid slice"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        style={{ cursor: arrastando ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
        <rect x={-20} y={-20} width={W + 40} height={H + 40} className="mar" />
        {cam === '2d' && texturaFundo && (
          <image
            href={TERRA_TEX}
            x={texturaFundo.x}
            y={texturaFundo.y}
            width={texturaFundo.w}
            height={texturaFundo.h}
            preserveAspectRatio="none"
            className="mar-imagem"
          />
        )}
        {cam === '2.5d' && tex && (
          <image
            href={tex.url}
            x={tex.rect.x}
            y={tex.rect.y}
            width={tex.rect.w}
            height={tex.rect.h}
            preserveAspectRatio="none"
            className="mar-imagem"
          />
        )}
        <g>
          {FEATURAS.features.map((f) => {
            const id = String(f.id ?? '');
            const c = paises.find((p) => String(p.iso ?? '') === id);
            const d = path(f);
            if (d === null) return null;
            const selecionado = c && c.id === sel;
            return (
              <path
                key={id}
                d={d}
                fill={c ? corDe(c, modo) : '#334155'}
                stroke={selecionado ? '#fff' : c?.id === w.jogadorId ? '#e2e8f0' : '#0f172a'}
                strokeWidth={selecionado ? 1.8 : c?.id === w.jogadorId ? 1 : 0.4}
                strokeDasharray={c?.posEstado ? '5 4' : undefined}
                strokeLinecap="round"
                opacity={c ? (modo === 'politico' ? 0.45 : 0.96) : 0.45}
                  className="mapa-pais"
                />
              );
          })}
        </g>
        {paises
          .filter((p) => !FEATURAS.features.some((f) => String(f.id ?? '') === String(p.iso ?? '')))
          .map((p) => {
            if (p.lat === 0 && p.lon === 0) return null;
            const pt = proj([p.lon, p.lat]);
            if (pt === null) return null;
            const [x, y] = pt;
            const selecionado = p.id === sel;
            return (
              <circle
                key={p.id}
                cx={x}
                cy={y}
                r={selecionado ? 6 : 3}
                fill={corDe(p, modo)}
                stroke={selecionado ? '#fff' : '#0f172a'}
                strokeWidth={selecionado ? 1.4 : 0.5}
                className="mapa-pais"
              />
            );
          })}
        </g>
      </svg>

      <div className="mapa-zoom">
        <button className="btn" onClick={() => zoomBotao(1.4)} title="Aproximar">➕</button>
        <button className="btn" onClick={() => zoomBotao(1 / 1.4)} title="Afastar">➖</button>
        <button className="btn" onClick={resetar} title="Reposicionar mapa">🧭</button>
      </div>

      <div className="mapa-hud-cima">
        <div className="mapa-modos">
          {(Object.keys(MODE_LABEL) as ModoMapa[]).map((m) => (
            <button key={m} className={`btn m-btn ${modo === m ? 'ativo' : ''}`} onClick={() => setModo(m)}>
              {MODE_ICON[m]}
              <span>{MODE_LABEL[m]}</span>
            </button>
          ))}
        </div>
        <div className="mapa-cams">
          {([['2d', '🗺️'], ['2.5d', '🌏']] as [Cam, string][]).map(([c, ic]) => (
            <button key={c} className={`btn ${cam === c ? 'ativo' : ''}`} onClick={() => setCam(c)} title={c === '2d' ? 'Projeção plana (textura real)' : 'Projeção natural (textura real)'}>
              {ic}
            </button>
          ))}
          <button className="btn mapa-orbital-btn" onClick={() => abrirOrbital()} title="Sala Orbital: mapa heliocêntrico 3D em tela cheia">
            🪐 Orbital
          </button>
        </div>
      </div>

      <div className="mapa-legenda">
        {defLegenda ? (
          <>
            <span className="leg-bar">
              <i style={{ background: rampa(0, defLegenda.stops) }} />
              <i style={{ background: rampa(0.5, defLegenda.stops) }} />
              <i style={{ background: rampa(1, defLegenda.stops) }} />
            </span>
            <span className="leg-rot">
              <b>{MODE_LABEL[modo]}</b>
              <small>{legLabel()}</small>
            </span>
          </>
        ) : (
          <span className="leg-regimes">
            {LEGENDA_POL.map((l) => (
              <span key={l.label}><i className="dot" style={{ background: l.cor }} /> {l.label}</span>
            ))}
          </span>
        )}
        <span className="leg-jogador"><i className="dot" style={{ background: '#fff', boxShadow: '0 0 0 2px #0f172a' }} /> Você</span>
        {Object.values(w.paises).some((p) => p.posEstado) && (
          <span className="leg-pos"><i className="dot dot-pos" style={{ background: '#14b8a6' }} /> Pós-Estado</span>
        )}
      </div>

      {selPais && (
        <div className="mapa-card">
          <div className="mapa-card-head">
            <b><Bandeira e={selPais.flag} /> {selPais.name}</b>
            <span className={`status ${selPais.posEstado ? 'ap-bom' : selPais.regime === 'democracia' ? 'ap-bom' : selPais.regime === 'híbrido' ? 'ap-bom' : 'ap-ruim'}`}>
              {selPais.posEstado ? '🌐 Pós-Estado' : selPais.regime === 'democracia' ? 'Democracia' : selPais.regime === 'híbrido' ? 'Híbrido' : 'Autoritário'}
            </span>
          </div>
          <div className="kpis">
            <Metric val={fmtPop(selPais.populacao)} label="População" />
            <Metric val={fmtBilhoes(selPais.gdp)} label="PIB" />
            <Metric val={fmtPct(selPais.crescimento)} label="Cresc." />
            <Metric val={fmtNum(selPais.aprovacao, 0)} label="Aprovação" />
          </div>
          <p className="dim">
            Região: {selPais.regiao} · Poder {fmtNum(poderMilitar(selPais), 0)}
            {emGuerra.length > 0 && <> · ⚔️ guerra com {emGuerra.map((id) => w.paises[id]?.name).join(', ')}</>}
          </p>
          {selPais.id !== w.jogadorId ? (
            <div className="mapa-card-enc">
              <div className="enc-rel">
                <span>🤝 Relações com seu país</span>
                <b className={relJ >= 0 ? 'rel-pos' : 'rel-neg'}>{relJ >= 0 ? '+' : ''}{fmtNum(relJ, 0)}</b>
              </div>
              <div className="enc-group">
                <h6>Diplomacia</h6>
                <div className="enc-grid">
                  <button className="btn" onClick={() => diplomacia('melhorar', selPais.id)}>🤝 Melhorar relação</button>
                  <button className="btn" onClick={() => diplomacia('piorar', selPais.id)}>😠 Piorar relação</button>
                  <button className="btn" onClick={() => diplomacia('sancao', selPais.id)}>🚫 Sanções</button>
                  <button className="btn" onClick={() => diplomacia('comercio', selPais.id)}>📦 Acordo comercial</button>
                  <button className="btn" onClick={() => intimar(selPais.id)}>📣 Ultimato</button>
                </div>
              </div>
              <div className="enc-group">
                <h6>Tratados</h6>
                <div className="enc-grid">
                  {([
                    ['alianca', '🛡️ Aliança'],
                    ['nao_agressao', '☮️ Não agressão'],
                    ['acesso_militar', '🪖 Acesso militar'],
                    ['ajuda_militar', '🎖️ Ajuda militar'],
                  ] as [TratadoTipo, string][]).map(([tipo, rot]) => {
                    const vigente = temTratado(w, w.jogadorId, selPais.id, tipo);
                    return (
                      <button key={tipo} className="btn" disabled={vigente} onClick={() => tratarTratado(tipo, selPais.id)} title={vigente ? 'Acordo já vigente' : 'Propor tratado'}>
                        {vigente ? '✓ ' : ''}{rot}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="enc-group">
                <h6>Militar</h6>
                <div className="enc-grid">
                  {emGuerraJogador
                    ? <button className="btn btn-paz" onClick={() => diplomacia('paz', selPais.id)}>🕊️ Propor paz</button>
                    : <button className="btn btn-guerra" disabled={!!jogador.posEstado} onClick={() => diplomacia('guerra', selPais.id)} title={jogador.posEstado ? 'Sem poder central para declarar guerra' : undefined}>⚔️ Declarar guerra</button>}
                  {!jogador.posEstado && <button className="btn" onClick={() => espionagem(selPais.id)}>🕵️ Espionagem</button>}
                </div>
              </div>
              <div className="enc-group">
                <h6>Governo</h6>
                <div className="enc-grid">
                  <button className="btn btn-grande" onClick={() => novoJogo(selPais.id)}>🎮 Assumir governo</button>
                </div>
              </div>
            </div>
          ) : (
            <p className="dim">{jogador.posEstado ? 'Você coordena este território pós-estatal. Use os conselhos à esquerda.' : 'Você governa este país. Use os painéis à esquerda para administrá-lo.'}</p>
          )}
        </div>
      )}

      <p className="mapa-dica">Arraste para mover e use o scroll para zoom nas projeções planas. Clique em um país para selecionar.</p>
    </div>
  );
};

const Metric = ({ val, label }: { val: string; label: string }) => (
  <div className="metric"><span className="metric-val">{val}</span><span className="metric-label">{label}</span></div>
);