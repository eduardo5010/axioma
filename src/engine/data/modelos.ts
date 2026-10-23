import type { Governo, SistemaEleitoral, SistemaExecutivo } from '../types';

export interface ModeloInstitucional {
  id: string;
  nome: string;
  sistema: SistemaExecutivo;
  eleitoral: SistemaEleitoral;
  mandatoMeses: number;
  reeleicao: boolean;
  bicameral: boolean;
  corte: number;
  paisOrigem: string;
  desc: string;
}

export const MODELOS: ModeloInstitucional[] = [
  { id: 'autocratico', nome: 'Autocracia (Estado-partido)', sistema: 'presidencial', eleitoral: 'uninominal', mandatoMeses: 60, reeleicao: true, bicameral: false, corte: 18, paisOrigem: 'CHN', desc: 'Executivo concentra os três poderes; eleições sem competição real; judiciário subordinado.' },
  { id: 'autocratico_personalista', nome: 'Autocracia Personalista', sistema: 'presidencial', eleitoral: 'uninominal', mandatoMeses: 84, reeleicao: true, bicameral: false, corte: 12, paisOrigem: 'PRK', desc: 'Culto à liderança, patronagem coercitiva, tribunais instrumentais.' },
  { id: 'híbrido', nome: 'Regime Híbrido (eleitoral autoritário)', sistema: 'presidencial', eleitoral: 'misto', mandatoMeses: 60, reeleicao: true, bicameral: false, corte: 38, paisOrigem: 'TUR', desc: 'Eleições com desvantagens para a oposição; mídia capturada; judiciário parcialmente independente.' },
  { id: 'presidencial_americano', nome: 'Presidencialismo Americano', sistema: 'presidencial', eleitoral: 'majoritario', mandatoMeses: 48, reeleicao: true, bicameral: true, corte: 82, paisOrigem: 'USA', desc: 'Separação rígida de poderes, checks & balances, câmara alta e baixa, corte constitucional com revisão.' },
  { id: 'presidencial_latino', nome: 'Presidencialismo Latino', sistema: 'presidencial', eleitoral: 'proporcional', mandatoMeses: 48, reeleicao: true, bicameral: true, corte: 64, paisOrigem: 'BRA', desc: 'Presidente forte com coalizões fragmentadas e multipartidarismo; judiciário relevante em crises políticas.' },
  { id: 'semipresidencial_frances', nome: 'Semipresidencialismo Francês', sistema: 'semipresidencial', eleitoral: 'majoritario', mandatoMeses: 60, reeleicao: true, bicameral: true, corte: 76, paisOrigem: 'FRA', desc: 'Presidente eleito + primeiro-ministro responsável perante o parlamento; coabitação em caso de oposição majoritária.' },
  { id: 'parlamentar_westminster', nome: 'Parlamentarismo Westminster', sistema: 'parlamentar', eleitoral: 'majoritario', mandatoMeses: 60, reeleicao: false, bicameral: true, corte: 74, paisOrigem: 'GBR', desc: 'Primeiro-ministro do partido majoritário; voto de confiança; dissolução antecipada; governo e legislativo fusionados.' },
  { id: 'parlamentar_consenso', nome: 'Parlamentarismo de Consenso', sistema: 'parlamentar', eleitoral: 'proporcional', mandatoMeses: 48, reeleicao: false, bicameral: true, corte: 86, paisOrigem: 'DEU', desc: 'Representação proporcional e coalizões; grande coalizão e moções construtivas; tribunais fortes.' },
  { id: 'parlamentar_proporcional', nome: 'Parlamentarismo Proporcional', sistema: 'parlamentar', eleitoral: 'proporcional', mandatoMeses: 48, reeleicao: false, bicameral: false, corte: 68, paisOrigem: 'JPN', desc: 'Gabinete derivado de assembleia eleita por voto proporcional; estabilidade depende de coalizões.' },
];

export const MODELOS_PAIS: Record<string, string> = {
  usa: 'presidencial_americano',
  bra: 'presidencial_latino',
  arg: 'presidencial_latino',
  chl: 'presidencial_latino',
  col: 'presidencial_latino',
  mex: 'presidencial_latino',
  ukr: 'presidencial_latino',
  gbr: 'parlamentar_westminster',
  can: 'parlamentar_westminster',
  aus: 'parlamentar_westminster',
  ind: 'parlamentar_westminster',
  isr: 'parlamentar_westminster',
  esp: 'parlamentar_consenso',
  nld: 'parlamentar_consenso',
  deu: 'parlamentar_consenso',
  sue: 'parlamentar_consenso',
  pol: 'parlamentar_consenso',
  ita: 'parlamentar_consenso',
  nor: 'parlamentar_consenso',
  jpn: 'parlamentar_proporcional',
  kor: 'presidencial_latino',
  zaf: 'parlamentar_consenso',
  idn: 'presidencial_latino',
  pak: 'parlamentar_consenso',
  fra: 'semipresidencial_frances',
  chn: 'autocratico',
  rus: 'autocratico',
  prk: 'autocratico_personalista',
  ven: 'autocratico_personalista',
  sau: 'autocratico_personalista',
  irn: 'autocratico',
  egt: 'híbrido',
  vnm: 'autocratico',
  tur: 'híbrido',
  nga: 'híbrido',
};

export const modeloPadrao = (cId: string, democracia: number): ModeloInstitucional => {
  const m = MODELOS.find((x) => x.id === MODELOS_PAIS[cId]);
  if (m) return m;
  if (democracia < 0.4) return MODELOS[0];
  if (democracia < 0.65) return MODELOS.find((x) => x.id === 'híbrido')!;
  return MODELOS.find((x) => x.id === 'parlamentar_consenso')!;
};

export const cadeirasIniciais = (partidoIds: string[]): Record<string, number> => {
  const r: Record<string, number> = {};
  let rest = 100;
  const n = partidoIds.length || 1;
  partidoIds.forEach((p, i) => {
    const q = i === partidoIds.length - 1 ? rest : Math.max(1, Math.round(100 / n + (i % 3) - 1));
    r[p] = q;
    rest -= q;
  });
  return r;
};

const VERBO_EXEC = { presidencial: 'Presidente', parlamentar: 'Primeiro-Ministro', semipresidencial: 'Presidente (1º-Ministro)' } as const;
export const cargoExecutivo = (g: Governo): string => VERBO_EXEC[g.sistema];
export const tituloGovernanta = (g: Governo, nome: string): string =>
  `${cargoExecutivo(g)} de ${nome}`;