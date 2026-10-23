import type { Leis, PolicyKey, RegimeType } from '../../types';

// ============================================================
// PADRÕES INICIAIS POR REGIME
// Valores default de políticas e leis institucionais herdados da
// versão legada (políticas.base + leis.padrao + leisParaRegime),
// agora declarados no novo esquema. O catálogo consome estes
// padrões para preencher 'valor.padrao' de cada norma.
// ============================================================

export const POLITICAS_BASE: Record<PolicyKey, number> = {
  renda: 25,
  corporativo: 21,
  bemEstar: 50,
  saude: 50,
  educacao: 50,
  militar: 2.2,
  infraestrutura: 46,
  pesquisa: 46,
  comercio: 60,
  tarifas: 20,
  imigracao: 30,
  verde: 42,
  leiOrdem: 52,
  renovaveis: 45,
  juros: 70,
};

export const POLITICAS_INICIAIS = () => ({ ...POLITICAS_BASE });

export const LEIS_PADRAO: Leis = {
  sufragio: 1,
  executivo: 1,
  economia: 1,
  servicos: 1,
  igreja: 1,
  midia: 1,
  cidadania: 1,
  terra: 1,
  policia: 1,
};

/** Port fiel de leisParaRegime (mesmos valores e sorteios). */
export function leisParaRegime(regime: RegimeType, democracia: number, relig: number): Leis {
  const def: Leis = { ...LEIS_PADRAO };
  if (regime === 'autoritário') {
    def.executivo = 3;
    def.sufragio = 0;
    def.midia = 2;
    def.policia = democracia < 0.18 ? 2 : 1;
  } else {
    def.executivo = 1;
    def.sufragio = 2;
    def.midia = democracia < 0.55 ? 1 : 0;
    def.policia = democracia < 0.5 ? 1 : 0;
  }
  if (regime === 'híbrido') {
    def.sufragio = 1;
    def.executivo = Math.random() < 0.5 ? 1 : 3;
  }
  if (relig > 0.6) def.igreja = 2;
  else if (relig > 0.4) def.igreja = 1;
  if (Math.random() < 0.35) def.servicos = 0;
  if (Math.random() < 0.2) def.terra = 0;
  if (Math.random() < 0.15) def.economia = 0;
  return def;
}