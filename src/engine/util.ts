export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const drifta = (atual: number, alvo: number, vel: number) => lerp(atual, alvo, clamp(vel, 0, 1));
export const desloca = (atual: number, alvo: number, maxDelta: number) => {
  if (atual < alvo) return Math.min(alvo, atual + maxDelta);
  return Math.max(alvo, atual - maxDelta);
};
export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const escolhe = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const sig = (x: number) => 1 / (1 + Math.exp(-x));

export const mesesBrasil = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

export const fmtMes = (ano: number, mes: number) => `${mesesBrasil[mes]}/${ano}`;

export const fmtNum = (v: number, dec = 1) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const fmtBilhoes = (v: number) => {
  if (Math.abs(v) >= 1000) return `$${fmtNum(v / 1000)} tri`;
  return `$${fmtNum(v)} bi`;
};

export const fmtMilhoes = (v: number) => {
  if (Math.abs(v) >= 1) return `${fmtNum(v / 1)} mi`;
  return `${fmtNum(v * 1000)} mil`;
};

export const fmtPct = (v: number, dec = 1) => `${fmtNum(v, dec)}%`;

export const fmtPop = (milhoes: number) => {
  if (milhoes >= 1000) return `${fmtNum(milhoes / 1000)} bi`;
  return `${fmtNum(milhoes)} mi`;
};

export const relLabel = (r: number) => {
  if (r >= 75) return 'Aliados';
  if (r >= 50) return 'Amigáveis';
  if (r >= 20) return 'Cordiais';
  if (r > -20) return 'Neutras';
  if (r > -50) return 'Tensas';
  if (r > -75) return 'Hostis';
  return 'Inimigas';
};

export const fmtDDD = (v: number) => v.toLocaleString('pt-BR');

export const semECD = () => Math.random().toString(36).slice(2, 10);

export const desvioPadrao = (arr: number[]) => {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
};

export const pesoAleat = <T,>(items: { item: T; peso: number }[]): T => {
  const total = items.reduce((a, b) => a + Math.max(0, b.peso), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, it.peso);
    if (r <= 0) return it.item;
  }
  return items[0]?.item;
};