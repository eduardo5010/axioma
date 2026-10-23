import { Country, World } from './types';
import { clamp, drifta } from './util';
import { poderMilitar } from './geopolitics';
import { grupoValor } from './sectores';

export function calculaPrestigio(w: World): void {
  const mediaPesq = (c: Country) => (c.pesquisa.militar + c.pesquisa.industrial + c.pesquisa.social) / 3;

  for (const c of Object.values(w.paises)) {
    let score = 0;
    const ind = c.indicadores ?? {};
    score += Math.log10(c.gdp + 1) * 120;
    score += Math.log10(c.populacao + 1) * 30;
    score += mediaPesq(c) * 4;
    score += Math.log10(poderMilitar(c) + 1) * 90;
    score += c.democracia * 8;
    score += c.pops.alfabetizacao * 0.4;
    score -= c.infamia * 1.2;
    score += c.politica.comercio * 0.1;
    score += (ind.desenvolvimento_humano ?? 40) * 0.5;
    score += (ind.pib_pc_ppp ?? 50) * 0.3;
    score += (ind.inteligencia_artificial ?? 30) * 0.4;
    score += (ind.projecao_poder ?? 50) * 0.4;
    score += (ind.relacoes_exteriores ?? 50) * 0.3;
    score += grupoValor(c, 'cultura') * 0.5;
    score += (c.governo?.aprovacaoJudiciario ?? 50) * 0.1;
    score -= (c.governo?.conflitoPoderes ?? 20) * 0.3;
    const alvo = clamp(score + 30, 5, 4000);
    c.prestige = drifta(c.prestige, alvo, 0.12);
  }
}