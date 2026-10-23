import type { Country, Ideology } from '../types';
import { POLITICAS_BASE } from './normas/padroesPorRegime';
import { clamp } from '../util';

export interface Pref {
  alvo: number;
  peso: number;
}

export interface OpinionGroup {
  id: string;
  nome: string;
  emoji: string;
  prefs: Partial<Record<string, Pref>>;
  size: (c: Country) => number;
}

export const norm = (c: Country, key: string): number => {
  switch (key) {
    case 'renda': return (c.politica.renda / 0.55);
    case 'corporativo': return (c.politica.corporativo / 0.45);
    case 'militar': return (c.politica.militar / 0.10);
    case 'juros': return c.politica.juros;
    default: return c.politica[key as keyof typeof c.politica] as number;
  }
};

export const OPINION_GROUPS: OpinionGroup[] = [
  {
    id: 'empresarios', nome: 'Empresários', emoji: '💼',
    prefs: { corporativo: { alvo: 20, peso: 1.4 }, comercio: { alvo: 80, peso: 1.0 }, infraestrutura: { alvo: 70, peso: 0.7 }, pesquisa: { alvo: 65, peso: 0.6 }, leiOrdem: { alvo: 65, peso: 0.5 }, bemEstar: { alvo: 25, peso: 0.6 }, tarifas: { alvo: 20, peso: 0.5 }, imigracao: { alvo: 55, peso: 0.2 } },
    size: (c) => 0.10 * Math.max(0.3, c.setores.servicos) + (c.democracia > 0.5 ? 0 : 0.05),
  },
  {
    id: 'operarios', nome: 'Trabalhadores', emoji: '🔧',
    prefs: { bemEstar: { alvo: 80, peso: 1.2 }, saude: { alvo: 80, peso: 1.0 }, educacao: { alvo: 70, peso: 0.6 }, tarifas: { alvo: 60, peso: 0.5 }, imigracao: { alvo: 30, peso: 0.2 }, corporativo: { alvo: 45, peso: 0.6 } },
    size: (c) => 0.28 + c.setores.industria * 0.25,
  },
  {
    id: 'aposentados', nome: 'Aposentados', emoji: '👵',
    prefs: { bemEstar: { alvo: 85, peso: 1.4 }, saude: { alvo: 90, peso: 1.2 }, leiOrdem: { alvo: 75, peso: 0.5 }, imigracao: { alvo: 25, peso: 0.3 } },
    size: (c) => Math.max(0.06, (c.idadeMedia - 25) / 40 * 0.18),
  },
  {
    id: 'jovens', nome: 'Juventude', emoji: '🎒',
    prefs: { educacao: { alvo: 85, peso: 1.3 }, verde: { alvo: 80, peso: 0.8 }, bemEstar: { alvo: 70, peso: 0.5 }, imigracao: { alvo: 70, peso: 0.4 }, leiOrdem: { alvo: 30, peso: 0.3 }, renovaveis: { alvo: 85, peso: 0.6 }, militar: { alvo: 1, peso: 0.2 } },
    size: (c) => 0.18 * Math.min(1, (30 - (c.idadeMedia - 15)) / 20) + 0.05,
  },
  {
    id: 'rurais', nome: 'População Rural', emoji: '🌾',
    prefs: { tarifas: { alvo: 60, peso: 0.8 }, infraestrutura: { alvo: 75, peso: 0.7 }, leiOrdem: { alvo: 70, peso: 0.4 }, imigracao: { alvo: 20, peso: 0.2 }, verde: { alvo: 45, peso: 0.3 } },
    size: (c) => Math.max(0.04, 0.30 * (1 - c.urbano)),
  },
  {
    id: 'religiosos', nome: 'Conservadores Religiosos', emoji: '⛪',
    prefs: { leiOrdem: { alvo: 85, peso: 1.2 }, imigracao: { alvo: 15, peso: 0.5 }, verde: { alvo: 55, peso: 0.2 }, bemEstar: { alvo: 50, peso: 0.2 } },
    size: (c) => Math.max(0.03, c.religiosidade * 0.16),
  },
  {
    id: 'militares', nome: 'Militares', emoji: '🎖️',
    prefs: { militar: { alvo: 4.5, peso: 1.5 }, leiOrdem: { alvo: 85, peso: 1.0 }, imigracao: { alvo: 25, peso: 0.4 }, verde: { alvo: 40, peso: 0.2 } },
    size: (c) => 0.035 + Math.min(0.06, c.militar.orcamento / 1000),
  },
  {
    id: 'ambientalistas', nome: 'Ambientalistas', emoji: '🌍',
    prefs: { verde: { alvo: 90, peso: 1.5 }, renovaveis: { alvo: 90, peso: 1.2 }, militar: { alvo: 0.5, peso: 0.4 }, infraestrutura: { alvo: 50, peso: 0.3 }, corporativo: { alvo: 35, peso: 0.2 } },
    size: (c) => 0.05 * Math.max(0.2, c.setores.servicos) + c.felicidade / 1000,
  },
  {
    id: 'classeMedia', nome: 'Classe Média Urbana', emoji: '🏙️',
    prefs: { saude: { alvo: 70, peso: 0.9 }, educacao: { alvo: 75, peso: 0.8 }, leiOrdem: { alvo: 70, peso: 0.6 }, renda: { alvo: 30, peso: 0.5 }, corporativo: { alvo: 25, peso: 0.4 }, bemEstar: { alvo: 50, peso: 0.3 }, juros: { alvo: 50, peso: 0.4 } },
    size: (c) => 0.30 * c.urbano,
  },
  {
    id: 'eliteFinanceira', nome: 'Elite Financeira', emoji: '🏦',
    prefs: { comercio: { alvo: 90, peso: 1.2 }, renda: { alvo: 12, peso: 0.8 }, corporativo: { alvo: 12, peso: 0.8 }, juros: { alvo: 70, peso: 0.7 }, imigracao: { alvo: 80, peso: 0.5 } },
    size: (c) => 0.04 * Math.max(0.2, c.setores.servicos),
  },
  {
    id: 'nacionalistas', nome: 'Nacionalistas', emoji: '🚩',
    prefs: { leiOrdem: { alvo: 90, peso: 1.0 }, imigracao: { alvo: 5, peso: 1.2 }, tarifas: { alvo: 80, peso: 0.7 }, militar: { alvo: 4, peso: 0.6 } },
    size: (c) => 0.10 * (c.regime === 'autoritário' ? 1.4 : 0.6),
  },
  {
    id: 'servidoresPublicos', nome: 'Servidores Públicos', emoji: '🏛️',
    prefs: { bemEstar: { alvo: 75, peso: 1.1 }, saude: { alvo: 70, peso: 0.8 }, educacao: { alvo: 70, peso: 0.7 }, leiOrdem: { alvo: 65, peso: 0.4 }, corporativo: { alvo: 35, peso: 0.3 } },
    size: (c) => 0.10 * clamp(c.gastoPct / 100, 0.2, 2.5),
  },
  {
    id: 'imprensa', nome: 'Imprensa e Mídia', emoji: '📰',
    prefs: { educacao: { alvo: 80, peso: 0.8 }, imigracao: { alvo: 60, peso: 0.4 }, verde: { alvo: 70, peso: 0.5 }, leiOrdem: { alvo: 40, peso: 0.4 }, bemEstar: { alvo: 60, peso: 0.5 } },
    size: (c) => 0.07 * clamp(1 + c.urbano, 0.5, 1.8),
  },
  {
    id: 'academia', nome: 'Academia e Pesquisadores', emoji: '🎓',
    prefs: { educacao: { alvo: 95, peso: 1.4 }, pesquisa: { alvo: 90, peso: 1.3 }, imigracao: { alvo: 75, peso: 0.5 }, verde: { alvo: 80, peso: 0.6 }, leiOrdem: { alvo: 25, peso: 0.3 } },
    size: (c) => 0.06 * clamp(c.pesquisa.social / 100, 0.3, 1.6),
  },
  {
    id: 'informais', nome: 'Economia Informal', emoji: '🛵',
    prefs: { leiOrdem: { alvo: 20, peso: 0.8 }, tarifas: { alvo: 15, peso: 0.7 }, renda: { alvo: 80, peso: 0.5 }, bemEstar: { alvo: 45, peso: 0.4 } },
    size: (c) => 0.16 * clamp(1 - c.politica.leiOrdem / 100, 0.3, 1.5),
  },
];

export const IG_DEFS: { id: string; nome: string; emoji: string }[] = [
  { id: 'latifundiarios', nome: 'Latifundiários', emoji: '🌾' },
  { id: 'burguesia', nome: 'Burguesia', emoji: '💼' },
  { id: 'industriais', nome: 'Industriais', emoji: '🏭' },
  { id: 'sindicatos', nome: 'Sindicatos', emoji: '✊' },
  { id: 'forcasArmadas', nome: 'Forças Armadas', emoji: '🪖' },
  { id: 'camponeses', nome: 'Camponeses', emoji: '🚜' },
  { id: 'clero', nome: 'Clero', emoji: '⛪' },
  { id: 'intelectuais', nome: 'Intelectualidade', emoji: '🎓' },
  { id: 'burocratas', nome: 'Burocracia', emoji: '🗂️' },
  { id: 'judiciario', nome: 'Judiciário', emoji: '⚖️' },
  { id: 'imprensaIG', nome: 'Imprensa', emoji: '📰' },
  { id: 'especuladores', nome: 'Especuladores', emoji: '💰' },
];

export const IG_PREFS: Record<string, Partial<Record<string, Pref>>> = {
  latifundiarios: { tarifas: { alvo: 40, peso: 0.6 }, comercio: { alvo: 30, peso: 0.6 }, leiOrdem: { alvo: 60, peso: 0.3 } },
  burguesia: { renda: { alvo: 15, peso: 0.7 }, corporativo: { alvo: 10, peso: 1.0 }, comercio: { alvo: 80, peso: 0.7 }, infraestrutura: { alvo: 60, peso: 0.3 } },
  industriais: { corporativo: { alvo: 10, peso: 1.0 }, tarifas: { alvo: 30, peso: 0.3 }, pesquisa: { alvo: 70, peso: 0.5 }, infraestrutura: { alvo: 70, peso: 0.5 }, verde: { alvo: 35, peso: 0.2 } },
  sindicatos: { bemEstar: { alvo: 85, peso: 1.2 }, saude: { alvo: 75, peso: 0.7 }, educacao: { alvo: 70, peso: 0.5 }, tarifas: { alvo: 60, peso: 0.5 }, corporativo: { alvo: 40, peso: 0.5 }, imigracao: { alvo: 30, peso: 0.3 } },
  forcasArmadas: { militar: { alvo: 4.5, peso: 1.5 }, leiOrdem: { alvo: 85, peso: 0.8 }, imigracao: { alvo: 20, peso: 0.3 } },
  camponeses: { tarifas: { alvo: 55, peso: 0.7 }, infraestrutura: { alvo: 75, peso: 0.6 }, leiOrdem: { alvo: 60, peso: 0.3 } },
  clero: { leiOrdem: { alvo: 90, peso: 1.0 }, imigracao: { alvo: 20, peso: 0.5 }, verde: { alvo: 60, peso: 0.2 } },
  intelectuais: { educacao: { alvo: 90, peso: 1.2 }, pesquisa: { alvo: 85, peso: 0.8 }, verde: { alvo: 85, peso: 0.6 }, imigracao: { alvo: 75, peso: 0.4 }, leiOrdem: { alvo: 25, peso: 0.4 } },
  burocratas: { bemEstar: { alvo: 60, peso: 0.8 }, saude: { alvo: 60, peso: 0.6 }, educacao: { alvo: 60, peso: 0.5 }, juros: { alvo: 45, peso: 0.4 } },
  judiciario: { leiOrdem: { alvo: 70, peso: 0.7 }, educacao: { alvo: 70, peso: 0.6 }, imigracao: { alvo: 55, peso: 0.3 }, renovaveis: { alvo: 70, peso: 0.4 } },
  imprensaIG: { educacao: { alvo: 80, peso: 1.0 }, verde: { alvo: 70, peso: 0.6 }, imigracao: { alvo: 60, peso: 0.4 }, leiOrdem: { alvo: 35, peso: 0.5 } },
  especuladores: { juros: { alvo: 70, peso: 1.1 }, comercio: { alvo: 90, peso: 1.0 }, renda: { alvo: 15, peso: 0.6 }, corporativo: { alvo: 10, peso: 0.8 }, tarifas: { alvo: 20, peso: 0.3 } },
};

export const POLITICAS_INICIAIS = () => ({ ...POLITICAS_BASE });

export const ideologiaDaPolitica = (c: Country): Ideology => {
  const econ = -(c.politica.renda / 55) * 0.7 - (c.politica.corporativo / 45) * 0.3 + (c.politica.comercio / 100) * 0.2;
  const soc = (c.politica.leiOrdem / 100) * 0.7 - (c.politica.imigracao / 100) * 0.3;
  return { econ: clampIdeo(econ), social: clampIdeo(soc) };
};

const clampIdeo = (v: number) => Math.min(1, Math.max(-1, v));

export const distanciaIdeologica = (a: Ideology, b: Ideology) =>
  (Math.abs(a.econ - b.econ) + Math.abs(a.social - b.social)) / 2;