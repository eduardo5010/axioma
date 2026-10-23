import type { ColoniaEspacial, Country, Espaco, EspacoModo, Planeta, PlanetaTipo, ProgramaEspacial, ProgramaTipo, RecursoEspacial, SistemaEstelar, SistemaTipo, World } from './types';
import { clamp, drifta, escolhe } from './util';

// ============================================================
// MÓDULO ESPACIAL — geração procedural, exploração e colônias
// ============================================================

export const PROGRAMA_TIPOS: Record<ProgramaTipo, { nome: string; emoji: string; custo: number; ganho: number; reqResearch: number; desc: string }> = {
  orbital: { nome: 'Satélites & Estação Orbital', emoji: '🛰️', custo: 3, ganho: 8, reqResearch: 5, desc: 'Constelação de satélites, telecom e observação.' },
  lunar: { nome: 'Base Lunar', emoji: '🌙', custo: 60, ganho: 2.5, reqResearch: 25, desc: 'Colonização da Lua; desbloqueia colônias em planetas habitáveis.' },
  interplanetario: { nome: 'Missões Interplanetárias', emoji: '🚀', custo: 400, ganho: 1.2, reqResearch: 50, desc: 'Artefatos, terraformação e expansão solar.' },
};

const NOMES_SISTEMAS = [
  'Alfa Centauri', 'Procyon', 'Betelgeuse', 'Rigel', 'Vega', 'Altair', 'Sirius', 'Polaris', 'Antares', 'Regulus',
  'Pollux', 'Castor', 'Deneb', 'Fomalhaut', 'Canopus', 'Arcturus', 'Capella', 'Mimosa', 'Spica', 'Kaus',
  'Korvus', 'Mira', 'Nyx', 'Oberon', 'Talia', 'Vexeris', 'Zorou', 'Aerith', 'Calypso', 'Durstra',
  'Elektra', 'Fenrik', 'Gantaria', 'Heln', 'Icarion', 'Jovanna', 'Kelbryn', 'Lokahra', 'Meridia', 'Narada',
];

const NOMES_PLANETAS = [
  'Eris', 'Tana', 'Vos', 'Merin', 'Qual', 'Rhea', 'Siora', 'Temus', 'Umbra', 'Vhalla', 'Xanto', 'Yara', 'Zeth',
  'Astra', 'Borea', 'Ceres', 'Danna', 'Ellora', 'Fyn', 'Galea', 'Hesper', 'Iridia', 'Jal', 'Kiri', 'Lyra',
];

const ANOMALIAS = [
  'Ecos antigos de sinal desconhecido',
  'Ruínas de origem não-humana',
  'Campo gravitacional instável',
  'Assinatura orgânica sob o gelo',
  'Enxame de detritos artificiais',
  'Distorção espaço-temporal menor',
];

const SISTEMA_CORES: Record<SistemaTipo, string> = {
  amarela: '#ffd27f',
  vermelha: '#ff6b4a',
  azul: '#7fc4ff',
  nebulosa: '#b98aff',
  buraco: '#663a8a',
  gemini: '#4affd0',
};

// ---------- RNG determinístico ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// TEXTURAS PROCEDURAIS — determinísticas e persistidas no save
// ============================================================

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = seed ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function ruido(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, oitavas = 4): number {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < oitavas; i++) {
    total += amp * ruido(x * freq, y * freq, seed + i * 1013);
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}

type Pintor = (x: number, y: number, nx: number, ny: number, seed: number) => [number, number, number];

const TAM = 256;
const ALT = 128;

function texturaDataURL(pintor: Pintor, seed: number): string {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = TAM;
  cv.height = ALT;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(TAM, ALT);
  const d = img.data;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < TAM; x++) {
      const nx = x / TAM;
      const ny = y / ALT;
      const [r, g, b] = pintor(x, y, nx, ny, seed);
      const i = (y * TAM + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/jpeg', 0.66);
}

const mistura = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const ajusta = (c: [number, number, number], f: number): [number, number, number] => [
  Math.round(Math.min(255, Math.max(0, c[0] * f))),
  Math.round(Math.min(255, Math.max(0, c[1] * f))),
  Math.round(Math.min(255, Math.max(0, c[2] * f))),
];

/** Terra (estilo oceano) — continentes, calotas e nuvens. */
function pintarTerra(seed: number): Pintor {
  const continente = (nx: number, ny: number, s: number) => fbm(nx * 2.4 + 3.7, ny * 2.4 + 1.2, s, 5);
  const seco = (nx: number, ny: number, s: number) => fbm(nx * 2.2 + 8.1, ny * 2.2 + 4.4, s, 4);
  const nuvem = (nx: number, ny: number, s: number) => fbm(nx * 3.1 + 5.2, ny * 3.1 + 9.3, s, 4);
  return (_x, _y, nx, ny) => {
    const lat = Math.abs(ny - 0.5) * 2;
    if (lat > 0.86) {
      nuvem(nx, ny, seed);
      return mistura([235, 244, 250], [225, 238, 248], lat * 5);
    }
    const c = continente(nx, ny, seed);
    const low = c > 0.48 + lat * 0.04;
    const elev = (c - 0.46) * 8;
    if (low) {
      const s = seco(nx, ny, seed);
      let cor: [number, number, number] =
        s * 2.6 > 0.62 ? [168, 142, 92] : s * 2.6 > 0.4 ? [76, 130, 62] : [40, 92, 44];
      if (elev > 1.1) cor = [120, 108, 92];
      if (elev > 2.4) cor = [208, 200, 188];
      if (lat > 0.72) cor = mistura(cor, [235, 240, 247], (lat - 0.72) * 3);
      return cor;
    }
    const prof = 0.46 - c;
    const corOceano = mistura([10, 34, 92], [22, 62, 148], Math.min(1, prof * 6));
    return corOceano;
  };
}

/** Rochoso — cinza, crateras. */
function pintarRochoso(seed: number, base: [number, number, number]): Pintor {
  const crateras: [number, number, number][] = [];
  let rr = mulberry32(seed ^ 0x51a2);
  for (let i = 0; i < 26; i++) crateras.push([rr(), rr(), 0.02 + rr() * 0.07]);
  return (_x, _y, nx, ny) => {
    const d = fbm(nx * 3, ny * 3, seed, 5);
    let cor = mistura(ajusta(base, 0.75), ajusta(base, 1.25), d);
    for (const [cx, cy, cr] of crateras) {
      const dx = nx - cx;
      const dy = (ny - cy) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < cr) cor = mistura(cor, ajusta(base, 0.45), 1 - (dist / cr) * 0.6);
    }
    return cor;
  };
}

/** Deserto — dunas suaves; tons quentes (Marte) ou arenosos. */
function pintarDeserto(seed: number, quente: boolean): Pintor {
  const base: [number, number, number] = quente ? [196, 88, 54] : [214, 176, 118];
  return (_x, _y, nx, ny) => {
    const d = fbm(nx * 2.6, ny * 3.4, seed, 5);
    const e = fbm(nx * 7, ny * 7, seed + 7, 3);
    let cor = mistura(ajusta(base, 0.72), ajusta(base, 1.28), d);
    if (e > 0.58) cor = ajusta(cor, 0.72);
    const lat = Math.abs(ny - 0.5) * 2;
    if (lat > 0.84) cor = mistura(cor, [234, 226, 214], (lat - 0.84) * 4);
    return cor;
  };
}

/** Vulcânico — crosta escura com veios incandescentes. */
function pintarVulcanico(seed: number, amarelado: boolean): Pintor {
  const base: [number, number, number] = amarelado ? [154, 118, 66] : [74, 48, 44];
  return (_x, _y, nx, ny) => {
    const d = fbm(nx * 3.4, ny * 3.4, seed, 5);
    const veio = fbm(nx * 6 + 4, ny * 6 + 2, seed + 31, 5);
    let cor = mistura(ajusta(base, 0.6), ajusta(base, 1.5), d);
    if (veio > 0.62) cor = amarelado ? [226, 182, 96] : [255, 150, 60];
    if (veio > 0.82) cor = amarelado ? [245, 220, 150] : [255, 210, 90];
    return cor;
  };
}

/** Gelado — teal pálido, bandas sutis e rachaduras. */
function pintarGelado(seed: number, azulado: boolean): Pintor {
  const baseA: [number, number, number] = azulado ? [96, 164, 208] : [120, 178, 190];
  const baseB: [number, number, number] = azulado ? [150, 196, 230] : [176, 212, 218];
  return (_x, _y, nx, ny) => {
    const banda = hash2(0, Math.floor(ny * 6), seed + 3);
    const sw = 0.15 + fbm(nx * 2, ny * 6, seed, 3) * 0.25;
    let cor = mistura(baseA, baseB, 0.5 + Math.sin((ny + banda) * Math.PI * 6) * sw);
    const rach = fbm(nx * 9, ny * 9, seed + 17, 4);
    if (rach > 0.72) cor = mistura(cor, [220, 238, 244], (rach - 0.72) * 2.4);
    const lat = Math.abs(ny - 0.5) * 2;
    if (lat > 0.84) cor = mistura(cor, [235, 246, 250], (lat - 0.84) * 4);
    return cor;
  };
}

/** Gasoso — faixas horizontais onduladas. */
function pintarGasoso(seed: number, paleta: [number, number, number][]): Pintor {
  let rr = mulberry32(seed ^ 0x9e37);
  const larguras: number[] = [];
  for (let b = 0; b < 8; b++) larguras.push(0.05 + rr() * 0.09);
  return (_x, _y, nx, ny) => {
    const yv = ny * 2 - 1;
    const sw = 0.12 + fbm(nx * 3, ny * 5, seed, 3) * 0.3;
    let acc = -1;
    let idx = 0;
    for (; idx < larguras.length; idx++) {
      acc += larguras[idx];
      if (yv < acc) break;
    }
    const b0 = paleta[idx % paleta.length];
    const b1 = paleta[(idx + 1) % paleta.length];
    const local = (yv - (acc - larguras[idx])) / larguras[idx];
    let cor = mistura(b0, b1, 0.5 + sw * (local - 0.5) * 3);
    const mancha = fbm(nx * 1.6 + 6, ny * 1.6 + 2, seed + 5, 4);
    if (mancha > 0.6) cor = mistura(cor, [226, 120, 90], (mancha - 0.6) * 1.6);
    if (lat_n(ny) > 0.86) cor = mistura(cor, [235, 225, 210], (lat_n(ny) - 0.86) * 3);
    return cor;
  };
}
const lat_n = (ny: number) => Math.abs(ny - 0.5) * 2;

/** Anômalo — roxo escuro com veios de energia. */
function pintarAnomalo(seed: number): Pintor {
  return (_x, _y, nx, ny) => {
    const d = fbm(nx * 2.8, ny * 2.8, seed, 5);
    let cor = mistura([24, 14, 40], [64, 30, 84], d);
    const v = fbm(nx * 5 + 3, ny * 5 + 1, seed + 41, 4);
    if (v > 0.6) cor = mistura(cor, [200, 90, 220], (v - 0.6) * 2);
    if (v > 0.84) cor = mistura(cor, [255, 176, 255], (v - 0.84) * 2.5);
    const mancha = fbm(nx * 1.7 + 9, ny * 1.7 + 5, seed + 9, 3);
    if (mancha > 0.66) cor = mistura(cor, [96, 60, 160], (mancha - 0.66) * 1.8);
    return cor;
  };
}

const PALETA_JUPITER = [[196, 148, 96], [232, 212, 178], [168, 120, 86], [228, 228, 214], [196, 148, 96]] as [number, number, number][];
const PALETA_SATURNO = [[226, 208, 170], [244, 234, 204], [200, 178, 136], [238, 226, 192]] as [number, number, number][];

export function texturaPlaneta(p: Pick<Planeta, 'id' | 'nome' | 'tipo'>): string {
  const seed = hashId(p.id);
  switch (p.id) {
    case 'sol-terra':
      return texturaDataURL(pintarTerra(seed), seed);
    case 'sol-jupter':
      return texturaDataURL(pintarGasoso(seed, PALETA_JUPITER), seed);
    case 'sol-saturno':
      return texturaDataURL(pintarGasoso(seed, PALETA_SATURNO), seed);
    case 'sol-urano':
      return texturaDataURL(pintarGelado(seed, true), seed);
    case 'sol-netuno':
      return texturaDataURL(pintarGelado(seed ^ 0x9a, true), seed);
    case 'sol-mercurio':
      return texturaDataURL(pintarRochoso(seed, [148, 140, 128]), seed);
    case 'sol-venus':
      return texturaDataURL(pintarVulcanico(seed, true), seed);
    case 'sol-marte':
      return texturaDataURL(pintarDeserto(seed, true), seed);
  }
  switch (p.tipo) {
    case 'oceano':
      return texturaDataURL(pintarTerra(seed), seed);
    case 'rochoso':
      return texturaDataURL(pintarRochoso(seed, hash2(0, 0, seed) > 0.5 ? [158, 128, 108] : [130, 132, 140]), seed);
    case 'gelado':
      return texturaDataURL(pintarGelado(seed, false), seed);
    case 'gasoso':
      return texturaDataURL(pintarGasoso(seed, PALETA_SATURNO), seed);
    case 'deserto':
      return texturaDataURL(pintarDeserto(seed, hash2(1, 0, seed) > 0.5), seed);
    case 'vulcanico':
      return texturaDataURL(pintarVulcanico(seed, false), seed);
    case 'anomalo':
      return texturaDataURL(pintarAnomalo(seed), seed);
  }
}

/** Preenche texturas ausentes (saves antigos) de forma determinística. */
export function garanteTexturas(e: Espaco): void {
  for (const s of e.sistemas) {
    for (const p of s.planetas) {
      if (!p.textura) p.textura = texturaPlaneta(p);
    }
  }
}

export function planoRecursos(tipo: PlanetaTipo, rng: () => number): RecursoEspacial {
  const clamp0 = (v: number) => clamp(v, 0, 100);
  switch (tipo) {
    case 'rochoso': return { metais: clamp0(40 + rng() * 60), cristais: clamp0(rng() * 40), agua: clamp0(rng() * 40), gases: clamp0(rng() * 20), energia: clamp0(rng() * 50) };
    case 'gelado': return { metais: clamp0(rng() * 20), cristais: clamp0(rng() * 60), agua: clamp0(50 + rng() * 50), gases: clamp0(rng() * 30), energia: clamp0(rng() * 20) };
    case 'gasoso': return { metais: clamp0(rng() * 10), cristais: clamp0(rng() * 30), agua: clamp0(rng() * 40), gases: clamp0(60 + rng() * 40), energia: clamp0(30 + rng() * 50) };
    case 'oceano': return { metais: clamp0(rng() * 30), cristais: clamp0(rng() * 30), agua: clamp0(70 + rng() * 30), gases: clamp0(rng() * 20), energia: clamp0(20 + rng() * 40) };
    case 'deserto': return { metais: clamp0(30 + rng() * 40), cristais: clamp0(20 + rng() * 50), agua: clamp0(rng() * 10), gases: clamp0(rng() * 30), energia: clamp0(30 + rng() * 60) };
    case 'vulcanico': return { metais: clamp0(50 + rng() * 40), cristais: clamp0(rng() * 50), agua: clamp0(rng() * 20), gases: clamp0(20 + rng() * 50), energia: clamp0(40 + rng() * 60) };
    case 'anomalo': return { metais: clamp0(rng() * 60), cristais: clamp0(rng() * 80), agua: clamp0(rng() * 40), gases: clamp0(rng() * 40), energia: clamp0(rng() * 100) };
  }
}

export function habitabilidadeDe(tipo: PlanetaTipo, rng: () => number): number {
  switch (tipo) {
    case 'rochoso': return clamp(rng() * 60 - 10, -20, 60);
    case 'gelado': return clamp(rng() * 30 - 90, -90, -10);
    case 'gasoso': return -100;
    case 'oceano': return clamp(rng() * 60 + 10, 10, 75);
    case 'deserto': return clamp(rng() * 70 - 35, -35, 45);
    case 'vulcanico': return clamp(rng() * 50 - 70, -70, 0);
    case 'anomalo': return clamp(rng() * 100 - 40, -40, 70);
  }
}

export const TIPO_LABEL: Record<PlanetaTipo, string> = {
  rochoso: 'Rochoso', gelado: 'Gelado', gasoso: 'Gasoso', oceano: 'Oceânico', deserto: 'Deserto', vulcanico: 'Vulcânico', anomalo: 'Anômalo',
};

function criaPlaneta(id: string, nome: string, tipo: PlanetaTipo, raio: number, habit: number, rng: () => number): Planeta {
  return {
    id, nome, tipo, raio, gravidade: clamp(raio * 1.1, 0.2, 2.8),
    habitabilidade: habit,
    recursos: planoRecursos(tipo, rng),
    luas: Math.max(0, Math.round(rng() * 3 - 0.5)),
    aneis: tipo === 'gasoso' && rng() > 0.5,
    explorado: false, sondado: false,
    anomalia: tipo === 'anomalo' ? escolhe(ANOMALIAS) : null,
    artefato: tipo === 'anomalo' && rng() > 0.7,
    coloniaId: null,
    textura: texturaPlaneta({ id, nome, tipo }),
  };
}

// Sistema Sol (núcleo, sempre revelado)
function sol(): SistemaEstelar {
  const mk = (id: string, nome: string, tipo: PlanetaTipo, raio: number, habit: number, luaCount: number, aneis = false): Planeta => ({
    id, nome, tipo, raio, gravidade: clamp(raio * 1.1, 0.2, 2.8), habitabilidade: habit,
    recursos: planoRecursos(tipo, () => 0.5), luas: luaCount, aneis,
    explorado: true, sondado: true, anomalia: null, artefato: false, coloniaId: null,
    textura: texturaPlaneta({ id, nome, tipo }),
  });
  return {
    id: 'system_sol', nome: 'Sol ☀', tipo: 'amarela', x: 0, y: 0, z: 0, cor: SISTEMA_CORES.amarela, raio: 0.14,
    planetas: [
      mk('sol-mercurio', 'Mercúrio', 'rochoso', 0.4, -10, 0),
      mk('sol-venus', 'Vênus', 'vulcanico', 0.9, 20, 0),
      mk('sol-terra', 'Terra 🌍', 'oceano', 1.0, 82, 1),
      mk('sol-marte', 'Marte', 'deserto', 0.5, 30, 2),
      mk('sol-jupter', 'Júpiter', 'gasoso', 11.2, -100, 79, true),
      mk('sol-saturno', 'Saturno', 'gasoso', 9.4, -100, 82, true),
      mk('sol-urano', 'Urano', 'gelado', 4.0, -100, 27, true),
      mk('sol-netuno', 'Netuno', 'gelado', 3.9, -100, 14, true),
    ],
    revelado: true, visitado: true, descobertoEm: 0,
  };
}

export function gerarEspaco(mutador?: number): Espaco {
  const rng = mulberry32(mutador ?? 42);
  const sistemas: SistemaEstelar[] = [sol()];
  const faixaInicial = 1.1;

  for (let i = 0; i < 42; i++) {
    const shell = 1.4 + rng() * 5.5;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const x = shell * Math.sin(phi) * Math.cos(theta);
    const y = shell * Math.sin(phi) * Math.sin(theta);
    const z = shell * Math.cos(phi);
    const tipos: SistemaTipo[] = ['amarela', 'vermelha', 'azul', 'nebulosa', 'buraco', 'gemini'];
    const tipo = tipos[Math.floor(rng() * tipos.length)];
    const numPlanetas = 1 + Math.floor(rng() * 6);
    const nomes = [...NOMES_PLANETAS].sort(() => rng() - 0.5);
    const planetas: Planeta[] = [];
    for (let j = 0; j < numPlanetas; j++) {
      const ptipos: PlanetaTipo[] = ['rochoso', 'rochoso', 'gelado', 'gasoso', 'oceano', 'deserto', 'vulcanico', 'anomalo'];
      const pt = ptipos[Math.floor(rng() * ptipos.length)];
      planetas.push(criaPlaneta(`sol${i}-p${j}`, nomes[j % nomes.length], pt, 0.3 + rng() * 2.2, habitabilidadeDe(pt, rng), rng));
    }
    const nome = NOMES_SISTEMAS[i % NOMES_SISTEMAS.length] + (i >= NOMES_SISTEMAS.length ? ` ${Math.floor(i / NOMES_SISTEMAS.length) + 1}` : '');
    const dist = Math.sqrt(x * x + y * y + z * z);
    sistemas.push({
      id: `sol${i}`, nome, tipo, x, y, z, cor: SISTEMA_CORES[tipo], raio: 0.05 + rng() * 0.08,
      planetas, revelado: dist <= faixaInicial, visitado: false,
    });
  }

  return {
    sistemas,
    colonias: [],
    explorando: [],
    sondando: [],
    faixa: faixaInicial,
    descobrimentos: 0,
    mutador: mutador ?? 42,
  };
}

export const distSistema = (s: SistemaEstelar) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);

export const sistemasRevelados = (e: Espaco) => e.sistemas.filter((s) => s.revelado);

/** Ações possíveis a partir do estado atual do jogador. */
export function capacidadeEspacial(c: Country): { podeSondar: boolean; podeColonizar: boolean; podeLancar: boolean; alcance: number } {
  const progLunar = c.programasEspaciais.some((p) => p.tipo === 'lunar' && p.concluido);
  const progInter = c.programasEspaciais.some((p) => p.tipo === 'interplanetario' && p.concluido);
  return {
    podeSondar: c.pesquisa.espacial >= 5,
    podeColonizar: progLunar || progInter || c.pesquisa.espacial >= 40,
    podeLancar: c.pesquisa.espacial >= 5 && c.pesquisaInvest.espacial >= 10,
    alcance: 4 + c.pesquisa.espacial / 100 * 4 + (progInter ? 3 : 0),
  };
}

// ---------- Escopo espacial: Nacional / Aliança / Mundial ----------

const espacialDe = (p: Country) => p.pesquisa?.espacial ?? 0;

export const ESCOPO_INFO: Record<EspacoModo, { icon: string; nome: string; curto: string; desc: string }> = {
  nacional: { icon: '🏴', nome: 'Consórcio Nacional', curto: 'Nacional', desc: 'Somente o programa do seu país' },
  bloco: { icon: '🤝', nome: 'Consórcio Aliado', curto: 'Aliança', desc: 'Seu país + aliados ativos no espaço' },
  terra: { icon: '🌍', nome: 'Consórcio Mundial', curto: 'Mundial', desc: 'Todas as nações engajadas' },
};

/** Países engajados no espaço (pesquisa espacial além do nível-base). */
export const paisesAtivosNoEspaco = (w: World) => Object.values(w.paises).filter((p) => espacialDe(p) >= 8);

/** Membros do escopo escolhido. */
export function espacoMembros(w: World, modo: EspacoModo): Country[] {
  const c = w.paises[w.jogadorId];
  const ativos = paisesAtivosNoEspaco(w);
  if (modo === 'nacional') return [c];
  if (modo === 'terra') return ativos.length ? ativos : [c];
  const aliados = new Set<string>();
  for (const t of w.tratados ?? []) {
    if (t.tipo === 'alianca' && (t.a === c.id || t.b === c.id)) aliados.add(t.a === c.id ? t.b : t.a);
  }
  const bloc = ativos.filter((p) => p.id === c.id || aliados.has(p.id));
  if (bloc.length > 0) return bloc;
  return c.pesquisa?.espacial !== undefined ? [c] : ativos.length ? ativos : [c];
}

/** Modo sugerido: só o jogador → nacional; poucos → aliança; quase todos → mundial. */
export function espacoRecomendado(w: World): EspacoModo {
  const n = paisesAtivosNoEspaco(w).length;
  const total = Object.keys(w.paises).length;
  if (n <= 1) return 'nacional';
  if (n >= total || n / total >= 0.85) return 'terra';
  return 'bloco';
}

export interface EspacoResumo {
  membros: Country[];
  espacial: number;
  investTotal: number;
  alcance: number;
  colonias: ColoniaEspacial[];
  programas: { prog: ProgramaEspacial; dono: Country }[];
  ativos: number;
}

export function espacoResumo(w: World, modo: EspacoModo): EspacoResumo {
  const membros = espacoMembros(w, modo);
  const espacial = membros.reduce((a, p) => a + espacialDe(p), 0) / Math.max(1, membros.length);
  const investTotal = membros.reduce((a, p) => a + (p.pesquisaInvest?.espacial ?? 0), 0);
  const alcance = Math.max(...membros.map(capacidadeEspacial).map((x) => x.alcance));
  const colonias = w.espaco.colonias.filter((col) => membros.some((p) => p.id === col.dono));
  const programas = membros.flatMap((p) => p.programasEspaciais.map((prog) => ({ prog, dono: p })));
  return { membros, espacial, investTotal, alcance, colonias, programas, ativos: paisesAtivosNoEspaco(w).length };
}

// ---------- Ações ----------

export function lancarExploracao(w: World, sistemaId: string, alcanceOverride?: number) {
  const e = w.espaco;
  const s = e.sistemas.find((x) => x.id === sistemaId);
  if (!s || s.revelado) return;
  const c = w.paises[w.jogadorId];
  const dist = distSistema(s);
  const cap = capacidadeEspacial(c);
  if (dist > (alcanceOverride ?? cap.alcance)) return;
  const meses = Math.ceil(dist * 6);
  const custo = Math.min(2, 0.2 + dist * 0.2);
  e.explorando.push({ sistemaId, fimTurno: meses });
  c.dividaPct = clamp(c.dividaPct + custo, 0, 350);
  noticia(w, `🛰️ Sonda lançada rumo a ${s.nome} (chegada em ~${meses} meses).`, 'neutro');
}

export function sondarPlaneta(w: World, planetaId: string) {
  const e = w.espaco;
  if (e.sondando.some((x) => x.planetaId === planetaId)) return;
  const p = e.sistemas.flatMap((s) => s.planetas).find((x) => x.id === planetaId);
  if (!p || p.sondado || !p.explorado) return;
  const c = w.paises[w.jogadorId];
  if (!capacidadeEspacial(c).podeSondar) return;
  e.sondando.push({ planetaId, fimTurno: 2 + Math.round(2 * Math.random()) });
  c.dividaPct = clamp(c.dividaPct + 0.3, 0, 350);
}

export function colonizarPlaneta(w: World, sistemaId: string, planetaId: string) {
  const e = w.espaco;
  const c = w.paises[w.jogadorId];
  if (!capacidadeEspacial(c).podeColonizar) return;
  const s = e.sistemas.find((x) => x.id === sistemaId);
  const p = s?.planetas.find((x) => x.id === planetaId);
  if (!s || !p || !p.sondado || p.coloniaId) return;
  const colonia: ColoniaEspacial = {
    id: `col-${w.turno}-${planetaId}`,
    nome: `${c.name.split(' ')[0]} ${p.nome}`,
    sistemaId, planetaId, dono: c.id,
    populacao: 8, fase: 'base', autossuficiencia: 20,
    mesFundacao: w.turno, empregos: 6,
  };
  e.colonias.push(colonia);
  p.coloniaId = colonia.id;
  c.dividaPct = clamp(c.dividaPct + 5, 0, 350);
  c.prestige += 12;
  c.pesquisa.espacial = clamp(c.pesquisa.espacial + 2, 0, 100);
  noticia(w, `🌱 ${c.flag} funda a colônia ${colonia.nome} em ${p.nome}/${s.nome}.`, 'bom');
}

export function expandirColonia(w: World, coloniaId: string) {
  const e = w.espaco;
  const col = e.colonias.find((x) => x.id === coloniaId);
  const c = w.paises[w.jogadorId];
  if (!col || col.dono !== c.id) return;
  const custo = 2 + col.populacao / 100;
  c.dividaPct = clamp(c.dividaPct + Math.min(custo, 12), 0, 350);
  col.populacao = Math.min(col.populacao + 20 + Math.round(col.populacao * 0.2), 5000);
  col.empregos += 5;
  noticia(w, `🚧 Colônia ${col.nome} expande sua infraestrutura (investimento ${Math.min(custo, 12).toFixed(1)}% do PIB).`, 'neutro');
}

export function novoPrograma(w: World, tipo: ProgramaTipo, nomeCustom?: string) {
  const c = w.paises[w.jogadorId];
  const spec = PROGRAMA_TIPOS[tipo];
  if (c.pesquisa.espacial < spec.reqResearch) return;
  if (c.programasEspaciais.some((p) => p.tipo === tipo && !p.concluido)) return;
  if (tipo === 'lunar' && !c.programasEspaciais.some((p) => p.tipo === 'orbital' && p.concluido)) return;
  if (tipo === 'interplanetario' && !c.programasEspaciais.some((p) => p.tipo === 'lunar' && p.concluido)) return;
  const bases = ['Aurora', 'Helios', 'Pégaso', 'Andrômeda', 'Icarus', 'Odyssey', 'Aster', 'Constelação'];
  const prog: ProgramaEspacial = {
    id: `${tipo}-${w.turno}`,
    nome: nomeCustom && nomeCustom.trim() ? nomeCustom.trim() : `${escolhe(bases)} ${spec.emoji}`,
    tipo, custo: spec.custo, investido: 0, progresso: 0, concluido: false, mesInicio: w.turno,
  };
  c.programasEspaciais.push(prog);
  c.pesquisaInvest.espacial = clamp(c.pesquisaInvest.espacial, 10, 100);
  noticia(w, `🚀 ${c.flag} anuncia o programa ${prog.nome} (${spec.emoji} ${spec.nome}).`, 'bom');
}

export function cancelarPrograma(w: World, id: string) {
  const c = w.paises[w.jogadorId];
  const p = c.programasEspaciais.find((x) => x.id === id);
  if (!p || p.concluido) return;
  c.programasEspaciais = c.programasEspaciais.filter((x) => x.id !== id);
  c.prestige = Math.max(0, c.prestige - 8);
  noticia(w, `🛑 ${c.flag} cancela o programa ${p.nome}.`, 'ruim');
}

export function explicarProgramas(c: Country): { ativo: number; fundo: number; pausados: number } {
  return {
    ativo: c.programasEspaciais.filter((p) => !p.concluido).length,
    fundo: c.pesquisaInvest.espacial,
    pausados: c.programasEspaciais.filter((p) => p.concluido).length,
  };
}

// ---------- Passo mensal ----------

export function passoEspaco(w: World) {
  const e = w.espaco;
  const c = w.paises[w.jogadorId];
  if (!c) return;

  // exploração
  for (const x of [...e.explorando]) {
    x.fimTurno -= 1;
    if (x.fimTurno <= 0) {
      const s = e.sistemas.find((y) => y.id === x.sistemaId);
      e.explorando = e.explorando.filter((y) => y !== x);
      if (s && !s.revelado) {
        s.revelado = true;
        s.visitado = true;
        s.descobertoEm = w.turno;
        e.descobrimentos += 1;
        e.faixa = Math.max(e.faixa, distSistema(s) * 1.25);
        c.pesquisa.espacial = clamp(c.pesquisa.espacial + 1.5, 0, 100);
        noticia(w, `🔭 ${c.flag} descobre o sistema ${s.nome} (${s.planetas.length} planetas).`, 'bom');
      }
    }
  }

  // sondagem
  for (const x of [...e.sondando]) {
    x.fimTurno -= 1;
    if (x.fimTurno <= 0) {
      const p = e.sistemas.flatMap((s) => s.planetas).find((y) => y.id === x.planetaId);
      e.sondando = e.sondando.filter((y) => y !== x);
      if (p) {
        p.sondado = true;
        if (p.artefato) noticia(w, `📡 Artefato desconhecido detectado em ${p.nome}!`, 'neutro');
        else if (p.anomalia) noticia(w, `⚠️ ${p.nome}: ${p.anomalia.toLowerCase()}.`, 'neutro');
      }
    }
  }

  // colônias
  for (const col of e.colonias) {
    if (col.dono !== c.id) continue;
    const s = e.sistemas.find((x) => x.id === col.sistemaId);
    const p = s?.planetas.find((x) => x.id === col.planetaId);
    if (!p) continue;
    const cap = Math.max(2, 10 + p.habitabilidade * 15);
    const crescimento = col.autossuficiencia > 0 ? 0.03 + p.habitabilidade / 200 : 0.005;
    col.populacao = clamp(col.populacao + col.populacao * crescimento + 0.2, 0, cap);
    col.autossuficiencia = drifta(col.autossuficiencia, Math.min(100, p.recursos.energia * 0.6), 0.03);
    const fases = [
      { fase: 'permanente', min: 100, txt: 'torna-se permanente' } as const,
      { fase: 'cidade', min: 800, txt: 'vira uma cidade' } as const,
      { fase: 'mundo', min: 2600, txt: 'atinge escala de mundo' } as const,
    ];
    for (const f of fases) {
      if (col.fase !== f.fase && col.populacao >= f.min) {
        col.fase = f.fase;
        c.prestige += 15;
        noticia(w, `🏙️ Colônia ${col.nome} ${f.txt} (${Math.round(col.populacao)} mil habitantes).`, 'bom');
      }
    }
  }

  // programas
  for (const p of c.programasEspaciais) {
    if (p.concluido) continue;
    const spec = PROGRAMA_TIPOS[p.tipo];
    const ganho = spec.ganho * (0.5 + c.pesquisaInvest.espacial / 100 * 0.8);
    p.progresso = clamp(p.progresso + ganho, 0, 100);
    p.investido = p.investido + (ganho / 100) * p.custo;
    if (p.progresso >= 100) {
      p.concluido = true;
      completaPrograma(w, p);
    }
  }
}

function completaPrograma(w: World, p: ProgramaEspacial) {
  const c = w.paises[w.jogadorId];
  const e = w.espaco;
  c.prestige += p.tipo === 'orbital' ? 10 : p.tipo === 'lunar' ? 25 : 60;
  c.pesquisa.espacial = clamp(c.pesquisa.espacial + (p.tipo === 'orbital' ? 4 : 8), 0, 100);
  const naoRevelados = e.sistemas.filter((s) => !s.revelado);
  const n = p.tipo === 'orbital' ? 2 : p.tipo === 'lunar' ? 4 : 8;
  const alvos = [...naoRevelados].sort(() => Math.random() - 0.5).slice(0, n);
  for (const s of alvos) {
    s.revelado = true;
    e.descobrimentos += 1;
  }
  noticia(w, p.tipo === 'orbital' ? '🛰️ Constelação orbital concluída — telecom e observação expandidas.' : p.tipo === 'lunar' ? '🌙 Base lunar operacional — novas fronteiras de colonização.' : '🚀 Programa interplanetário concluído — bandeira nas estrelas!', 'bom');
}

/** Custo anual do setor espacial em % do PIB (entra no orçamento). */
export function custoEspacoMensal(c: Country): number {
  const inv = c.pesquisaInvest.espacial / 100;
  const base = 0.5 + inv * 1.8 + c.pesquisa.espacial / 100 * 1.2;
  const programas = c.programasEspaciais.filter((p) => !p.concluido).reduce((a, p) => a + Math.min(p.custo * 0.03, 20), 0);
  return clamp(base + programas, 0, 25);
}

function noticia(w: World, texto: string, tom: 'bom' | 'ruim' | 'neutro') {
  w.noticias.unshift({ mes: `${w.mes + 1}/${w.ano}`, texto, tom });
}