import type { Alliance } from '../types';

export const ALLIANCES: Alliance[] = [
  { id: 'otan', nome: 'OTAN', cor: '#4a7dff', descricao: 'Aliança militar transatlântica' },
  { id: 'ue', nome: 'União Europeia', cor: '#ffd700', descricao: 'Bloco econômico europeu' },
  { id: 'usmca', nome: 'USMCA', cor: '#7a5cff', descricao: 'Acordo comercial América do Norte' },
  { id: 'mercosul', nome: 'Mercosul', cor: '#3bbf8c', descricao: 'Bloco comercial sul-americano' },
  { id: 'asean', nome: 'ASEAN', cor: '#ff7a4d', descricao: 'Bloco do Sudeste Asiático' },
  { id: 'brics', nome: 'BRICS+', cor: '#f04e3e', descricao: 'Bloco de economias emergentes' },
  { id: 'scp', nome: 'OCS', cor: '#8a4dff', descricao: 'Organização de Cooperação de Xangai' },
  { id: 'ligaArabe', nome: 'Liga Árabe', cor: '#3ec06b', descricao: 'Bloco político dos países árabes' },
  { id: 'opep', nome: 'OPEP', cor: '#2f9e7d', descricao: 'Cartel de produtores de petróleo' },
  { id: 'uniaoa', nome: 'União Africana', cor: '#d27b3c', descricao: 'Bloco político-africano' },
  { id: 'aukus', nome: 'AUKUS', cor: '#b3893a', descricao: 'Acordo militar de segurança' },
  { id: 'anzus', nome: 'ANZUS', cor: '#34d399', descricao: 'Aliança do Pacífico' },
  { id: 'csto', nome: 'OTSC', cor: '#f472b6', descricao: 'Aliança militar pós-soviética' },
  { id: 'dem', nome: 'Democracias', cor: '#38bdf8', descricao: 'Comunidade de democracias' },
];

export const MEMBROS: Record<string, string[]> = {
  otan: ['usa', 'can', 'gbr', 'fra', 'deu', 'ita', 'esp', 'tur', 'pol', 'nld', 'nor', 'sue'],
  ue: ['deu', 'fra', 'ita', 'esp', 'pol', 'nld', 'sue', 'pol'],
  usmca: ['usa', 'can', 'mex'],
  mercosul: ['bra', 'arg'],
  asean: ['idn', 'vnm'],
  brics: ['bra', 'rus', 'chn', 'ind', 'zaf', 'irn', 'sau', 'idn'],
  scp: ['chn', 'rus', 'pak', 'irn'],
  ligaArabe: ['sau', 'egt', 'irn'],
  opep: ['sau', 'irn', 'ven', 'nga'],
  uniaoa: ['nga', 'zaf', 'egt'],
  aukus: ['usa', 'gbr', 'aus'],
  anzus: ['usa', 'aus'],
  csto: ['rus', 'kaz', 'biel'],
  dem: ['usa', 'gbr', 'fra', 'deu', 'can', 'aus', 'jpn', 'kor', 'esu', 'sue', 'nld', 'ind', 'bra', 'zaf', 'chl', 'mex', 'idn'],
};

export const membrosDa = (alianca: string): string[] => MEMBROS[alianca] ?? [];
export const aliancaPorPais = (pais: string): string[] =>
  Object.keys(MEMBROS).filter((a) => MEMBROS[a].includes(pais));
export const partilhamAlianca = (a: string, b: string) =>
  aliancaPorPais(a).some((al) => membrosDa(al).includes(b));