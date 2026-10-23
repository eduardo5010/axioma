import { Country, World, Pops } from './types';
import { clamp, drifta } from './util';

export function podePesquisa(p: number): number {
  return clamp(Math.max(0, p), 0, 100);
}

export function recomputaSol(c: Country): void {
  const gdpPC = c.gdp / c.populacao;
  let sol = (gdpPC / 60) * 100;
  sol *= 1 - c.gini * 0.45;
  sol += c.politica.bemEstar / 100 * 18;
  sol += c.politica.saude / 100 * 8;
  sol += c.politica.educacao / 100 * 6;
  sol -= Math.max(0, c.desemprego - 6) * 0.9;
  sol -= Math.max(0, c.inflacao - 6) * 0.6;
  if (c.leis.servicos === 1) sol -= 3;
  c.pops.sol = clamp(sol, 0, 100);
}

export function recomputaAlfabetizacao(c: Country): void {
  const alvo = clamp(
    25 + c.educacaoIdx * 0.75 + c.politica.educacao * 0.35 + c.pesquisa.social * 0.3,
    0,
    100,
  );
  c.pops.alfabetizacao = clamp(drifta(c.pops.alfabetizacao, alvo, 0.08), 0, 100);
}

export function passoPops(c: Country, w: World): void {
  recomputaSol(c);
  recomputaAlfabetizacao(c);

  const ind = c.indicadores ?? {};
  const gov = c.governo;
  const radicalAlvo =
    Math.max(0, 62 - c.pops.sol * 1.4)
    + Math.max(0, c.desemprego - 8) * 2.2
    + Math.max(0, c.inflacao - 10) * 1.2
    + Math.max(0, (ind.custo_vida ?? 50) - 50) * 0.15
    + Math.max(0, (ind.pobreza ?? 50) - 50) * 0.15
    + Math.max(0, (ind.crime_juvenil ?? 50) - 50) * 0.1
    - Math.max(0, (ind.igualdade ?? 50) - 50) * 0.1
    - c.estabilidade * 0.35
    + c.infamia * 0.08
    + (c.leis.policia === 2 ? 10 : 0);
  c.pops.radicalizacao = clamp(drifta(c.pops.radicalizacao, radicalAlvo, 0.25), 0, 100);

  const memoria = 100 - c.pops.radicalizacao;
  const lealAlvo =
    c.pops.sol * 0.45
    + c.estabilidade * 0.3
    + (gov?.apoioLegislativo ?? 60) * 0.1
    - (gov?.conflitoPoderes ?? 20) * 0.15
    + (c.leis.igreja === 2 ? 8 : c.leis.igreja === 1 ? 3 : 0)
    + memoria * 0.25;
  c.pops.lealismo = clamp(drifta(c.pops.lealismo, lealAlvo, 0.2), 0, 100);

  const migraAlvo =
    (c.pops.sol - 42) * 0.5
    + c.democracia * 12
    + c.politica.imigracao * 0.08
    - (gov?.conflitoPoderes ?? 20) * 0.06
    + (c.desemprego < 5 ? 5 : 0)
    - (c.guerra ? 5 : 0)
    - (c.pops.radicalizacao > 40 ? 4 : 0)
    - Math.max(0, (ind.crime_juvenil ?? 50) - 50) * 0.06;
  c.pops.migracaoLiquida = clamp(drifta(c.pops.migracaoLiquida, migraAlvo, 0.2), -6, 6);

  const fluxo = c.populacao * (c.pops.migracaoLiquida / 1200);
  c.populacao = Math.max(2, c.populacao + fluxo);
  c.forcaTrabalho = c.populacao * 0.56;
}

export function passoPesquisa(c: Country): void {
  const ind = c.indicadores ?? {};
  const ganho = 0.35
    + c.politica.pesquisa / 100 * 0.9
    + c.educacaoIdx * 0.12
    + c.pops.alfabetizacao * 0.05
    + (ind.velocidade_internet ?? 50) / 100 * 0.08
    + (ind.graduados_universitarios ?? 50) / 100 * 0.06
    + (ind.qualidade_infra ?? 50) / 100 * 0.03
    + (c.construcoes?.universidade ?? 0) * 0.004
    - (c.governo?.conflitoPoderes ?? 20) * 0.03;
  const inv = c.pesquisaInvest ?? { militar: 30, industrial: 35, social: 25, espacial: 10 };
  c.pesquisa.industrial = Math.min(100, c.pesquisa.industrial + ganho * (inv.industrial / 100) * 1.4);
  c.pesquisa.militar = Math.min(100, c.pesquisa.militar + ganho * (inv.militar / 100) * 1.4 + c.politica.militar / 100 * 0.5);
  c.pesquisa.social = Math.min(100, c.pesquisa.social + ganho * (inv.social / 100) * 1.4);
  c.pesquisa.espacial = Math.min(100, c.pesquisa.espacial + ganho * (inv.espacial / 100) * 1.4);
}

export function iniciaPops(c: Country): Pops {
  const gdpPC = c.gdp / c.populacao;
  let sol = (gdpPC / 60) * 100;
  sol *= 1 - c.gini * 0.45;
  const pops: Pops = {
    sol: clamp(sol, 0, 100),
    alfabetizacao: clamp(30 + c.educacaoIdx * 0.7, 0, 100),
    radicalizacao: clamp(30 - c.estabilidade * 0.3, 0, 100),
    lealismo: clamp(40 + c.estabilidade * 0.35, 0, 100),
    migracaoLiquida: 0,
  };
  return pops;
}