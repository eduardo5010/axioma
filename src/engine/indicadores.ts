import type { Country, World } from './types';
import { clamp } from './util';
import { INDICADORES } from './data/indicadores';
import { grupoValor, valorSetor } from './sectores';
import { producaoDe, consumoDe, saldoComercialPct } from './market';
import { computaIncentivoCorp, aplicaBonusIncentivoCorp, aliquotaCorpEfetiva } from './incentivoCorp';

export const N = (v: number, min: number, max: number): number => clamp(((v - min) / (max - min)) * 100, 0, 100);

export const iniciarIndicadores = (c: Country): void => {
  c.indicadores = {};
  c.rawInd = {};
  c.reformasInd = {};
  for (const d of INDICADORES) c.indicadores[d.id] = 50;
};

export const iniciarSectoresDet = (c: Country): void => {
  c.sectoresDet = {};
  for (const s of SETORES) c.sectoresDet[s.id] = 2;
  c.emissaoCo2 = 35;
};

import { SETORES } from './data/sectores';

const v = (c: Country, id: string): number => c.indicadores[id] ?? 50;
const set = (c: Country, id: string, valor: number, raw?: number): void => {
  c.indicadores[id] = clamp(valor, 0, 100);
  if (raw !== undefined) c.rawInd[id] = raw;
};

const taxaLucroBase = (c: Country): number => 20 + c.pesquisa.industrial * 0.3 + (60 - aliquotaCorpEfetiva(c)) * 0.2 - c.desemprego * 0.2;

const relMedia = (w: World, id: string): number => {
  let s = 0, n = 0;
  for (const [b, r] of Object.entries(w.relacoes[id] ?? {})) {
    if (b === id) continue;
    s += r;
    n++;
  }
  return n ? s / n : 0;
};

export const computaIndicadores = (c: Country, w: World): void => {
  const pop = c.populacao;
  const gdpPC = (c.gdp / pop) * 1000;

  computaIncentivoCorp(c);

  // ---------- Trabalho (dependências de topo) ----------
  set(c, 'produtividade', 20 + c.pesquisa.industrial * 0.35 + c.educacaoIdx * 25 + c.infraestrutura * 0.22);
  set(c, 'salarios', 42 + (v(c, 'produtividade') - 50) * 0.7 - c.desemprego + (c.politica.bemEstar / 100) * 8);

  // ---------- Finanças e monopólio monetário ----------
  const t2 = c.inflacao + (c.politica.juros - 40) * 0.35;
  set(c, 'rendimento_t2', 35 + t2, 3 + t2);
  set(c, 'taxa_juros', 40 + t2, 3 + c.politica.juros / 30 + c.inflacao / 10);
  set(c, 'taxa_juros_real', 35 + t2 - c.inflacao * 1.2 + 30, 3 + t2 - c.inflacao);
  set(c, 'premio_do_prazo', 35 + c.inflacao * 0.8 + c.dividaPct * 0.12 - v(c, 'qualidade_infra') * 0.1);
  set(c, 'rendimento_t10', v(c, 'rendimento_t2') * 0.65 + v(c, 'premio_do_prazo') * 0.35 + c.dividaPct * 0.05, 3 + t2 + c.dividaPct / 45);
  set(c, 'rendimento_t30', v(c, 'rendimento_t10') * 0.7 + v(c, 'premio_do_prazo') * 0.3 + v(c, 'produtividade') * 0.05);
  set(c, 'inclinacao_curva_juros', 50 + (v(c, 'rendimento_t10') - v(c, 'rendimento_t2')) * 0.5, (v(c, 'rendimento_t10') - v(c, 'rendimento_t2')) * 0.12);
  set(c, 'razao_servico_divida', c.dividaPct * 0.35 + v(c, 'taxa_juros_real') * 0.2, c.jurosPagos);
  set(c, 'base_monetaria', 55 + (45 - c.politica.juros) * 0.8 + c.crescimento);
  set(c, 'oferta_m2', v(c, 'base_monetaria') * 0.55 + v(c, 'liquidez_bancos') * 0.35 + c.inflacao * 0.2);
  set(c, 'reservas_ouro', valorSetor(c, 'ouro') * 0.9 + v(c, 'forca_moeda') * 0.2 + 20);
  set(c, 'adocao_cripto', v(c, 'velocidade_internet') * 0.5 + c.inflacao * 0.8 + (55 - v(c, 'liquidez_bancos')) * 0.3);
  set(c, 'reservas_cripto', v(c, 'adocao_cripto') * 0.7 + v(c, 'reservas_ouro') * 0.1);
  set(c, 'setor_financeiro', valorSetor(c, 'bancos') * 0.7 + v(c, 'estabilidade_bolsa') * 0.2 + c.setores.servicos * 25 + (c.politica.comercio / 100) * 10 + c.democracia * 8);
  set(c, 'liquidez_bancos', 50 + (50 - v(c, 'taxa_juros')) * 0.6 + v(c, 'base_monetaria') * 0.2 - v(c, 'estabilidade_bolsa') * 0.15);
  set(c, 'estabilidade_bolsa', v(c, 'confianca_empresarial') * 0.6 + (50 - v(c, 'taxa_juros_real')) * 0.3 + (65 - w.tensaoGlobal) * 0.15);
  set(c, 'taxa_lucro', v(c, 'produtividade') * 0.55 + (60 - v(c, 'salarios')) * 0.35 - v(c, 'taxa_juros') * 0.25);
  set(c, 'pensoes_privadas', v(c, 'investimento_privado') * 0.35 + v(c, 'salarios') * 0.3 + (c.idadeMedia - 25) * 0.8);
  set(c, 'forca_moeda', 40 + (v(c, 'taxa_juros_real') - 40) * 0.5 - c.inflacao * 1.5 + saldoComercialPct(c, w) * 2);
  set(c, 'mercado_cambio', v(c, 'forca_moeda') * 0.85 + c.estabilidade * 0.15);

  // ---------- Trabalho ----------
  set(c, 'semana_trabalho', 42 - (v(c, 'produtividade') - 50) * 0.12 + (55 - v(c, 'produtividade')) * 0.15, 62 - v(c, 'produtividade') * 0.25);
  set(c, 'agitacao_trabalhista', Math.max(0, (c.desemprego - 5) * 6) + Math.max(0, 60 - v(c, 'salarios')) * 0.5 + (c.apoioGrupo.sindicatos ?? 35) * 0.3 + c.inflacao * 0.35);
  set(c, 'participacao_forca_trabalho', c.forcaTrabalho * 70 + v(c, 'igualdade_genero') * 0.3);
  set(c, 'participacao_produtiva_trabalho', c.forcaTrabalho * 60 + v(c, 'salarios') * 0.25 - v(c, 'agitacao_trabalhista') * 0.15);

  // ---------- Confiança e gasto (macro) ----------
  set(c, 'confianca_empresarial', 30 + c.crescimento * 2.5 + (45 - c.politica.juros) * 0.25 + (c.governo?.corte ?? 50) * 0.15 + c.estabilidade * 0.2 + (v(c, 'produtividade') - 50) * 0.15 + (c.governo?.apoioLegislativo ?? 60) * 0.1 - (c.governo?.conflitoPoderes ?? 20) * 0.15 + (c.governo?.aprovacaoJudiciario ?? 50) * 0.05);
  set(c, 'gasto_consumidor', 40 + v(c, 'confianca_empresarial') * 0.3 + (10 - c.desemprego) * 1.1 + c.pops.sol * 0.2 - c.inflacao);
  set(c, 'gasto_empresarial', 35 + v(c, 'confianca_empresarial') * 0.4 + v(c, 'produtividade') * 0.2 + taxaLucroBase(c) * 0.2);
  set(c, 'investimento_privado', 30 + v(c, 'gasto_empresarial') * 0.35 + (60 - v(c, 'taxa_juros_real')) * 0.3 + v(c, 'liquidez_bancos') * 0.2);
  set(c, 'consumo_real', 35 + v(c, 'salarios') * 0.3 + (25 - c.desemprego) * 1.1 - c.inflacao * 0.6);
  set(c, 'comercio_domestico', 35 + v(c, 'consumo_real') * 0.4 + v(c, 'velocidade_internet') * 0.25 + c.infraestrutura * 0.2);

  // ---------- PIB ----------
  set(c, 'pib_nominal', N(c.gdp, 5, 35000), c.gdp);
  set(c, 'pib_pc_nominal', N(gdpPC / 1000, 0.5, 80), gdpPC);
  set(c, 'pib_pc_ppp', N(gdpPC / 1000 / (0.6 + (1 - c.politica.comercio / 100) * 0.4), 0.5, 80), gdpPC);

  // ---------- Indústria / extração / agro ----------
  set(c, 'setor_manufatura', N(grupoValor(c, 'industria') * 0.75 + grupoValor(c, 'tecnologia') * 0.4, 0, 100));
  set(c, 'industria_leve_privada', v(c, 'gasto_consumidor') * 0.4 + valorSetor(c, 'vestuario') * 0.5 + valorSetor(c, 'agua_engarrafada') * 0.3);
  set(c, 'industria_pesada_privada', valorSetor(c, 'aco') * 0.6 + v(c, 'atividade_construcao') * 0.3 + c.pesquisa.industrial * 0.2);
  set(c, 'eletronicos_privados', valorSetor(c, 'eletronica_consumo') * 0.55 + valorSetor(c, 'hardware') * 0.45 - v(c, 'precos_terras_raras') * 0.1);
  set(c, 'industria_ferroviaria', v(c, 'uso_trem') * 0.6 + valorSetor(c, 'ferrovias_constr') * 0.6 + c.infraestrutura * 0.15);
  set(c, 'industria_agua', c.urbano * 60 + v(c, 'densidade_urbana') * 0.3 + valorSetor(c, 'redes_agua') * 0.45);
  set(c, 'setor_extracao', grupoValor(c, 'mineracao') * 0.9 + c.indiceRecurso * 0.3);
  set(c, 'precos_terras_raras', 55 - valorSetor(c, 'oxidos_terras_raras') * 0.25 + v(c, 'eletronicos_privados') * 0.25 + w.tensaoGlobal * 0.25, valorSetor(c, 'oxidos_terras_raras'));

  const agroT = grupoValor(c, 'agro');
  set(c, 'agricultura_privada', agroT * 1.1 + (c.leis.terra === 2 ? -6 : 0) + 15);
  const precoAli = w.mercado.alimento?.preco ?? 14;
  set(c, 'preco_alimentos_idx', 55 - agroT * 0.35 + N(precoAli, 8, 26) * 0.5 + c.inflacao * 0.5, precoAli);
  set(c, 'dietas_vegetais', valorSetor(c, 'vegetais') * 0.6 + v(c, 'pib_pc_ppp') * 0.15 - valorSetor(c, 'carne_bovina') * 0.12);
  set(c, 'consumo_alcool', valorSetor(c, 'cerveja') * 0.45 + valorSetor(c, 'vinho') * 0.35 + valorSetor(c, 'destilados') * 0.45 + v(c, 'pib_pc_ppp') * 0.1);
  set(c, 'consumo_drogas_legais', (c.alternadores.drogaLegal ? 40 : 8) + valorSetor(c, 'tabaco') * 0.4 + (60 - v(c, 'saude_mental')) * 0.3);

  // ---------- Social ----------
  set(c, 'saude_mental', 30 + c.felicidade * 0.5 + c.politica.saude * 0.35 - c.desemprego * 0.7 + valorSetor(c, 'farmaceutica') * 0.2);
  set(c, 'demanda_saude', (c.idadeMedia - 20) * 1.5 + v(c, 'longevidade') * 0.4 + c.politica.saude * 0.1);
  set(c, 'saude_privada', valorSetor(c, 'farmaceutica') * 0.5 + v(c, 'investimento_privado') * 0.15 + (100 - c.politica.saude) * 0.25);
  set(c, 'escolas_privadas', (100 - c.politica.educacao) * 0.5 + v(c, 'salarios') * 0.3 + 15);
  set(c, 'graduados_universitarios', c.politica.educacao * 0.6 + c.pesquisa.social * 0.3 + valorSetor(c, 'publishing') * 0.1 + 10);
  set(c, 'longevidade', c.expectativaVida * 1.1, c.expectativaVida);
  set(c, 'desenvolvimento_humano', c.pops.sol * 0.45 + c.pops.alfabetizacao * 0.3 + v(c, 'longevidade') * 0.15 + v(c, 'igualdade') * 0.1);
  set(c, 'pobreza', 60 - v(c, 'pib_pc_nominal') * 0.5 + c.gini * 30 + c.desemprego * 0.8 - c.politica.bemEstar * 0.2 + (c.governo?.conflitoPoderes ?? 20) * 0.06 - c.pops.sol * 0.1);
  set(c, 'igualdade', 100 - c.gini * 130 + c.politica.renda * 0.3);
  set(c, 'igualdade_genero', c.democracia * 60 + c.educacaoIdx * 35 + (c.leis.cidadania === 2 ? -8 : 0) - v(c, 'tensao_racial') * 0.1);
  set(c, 'tensao_racial', v(c, 'imigracao') * 0.25 + (55 - v(c, 'igualdade')) * 0.4 + Math.random() * 4);
  set(c, 'lacuna_geracional', (c.idadeMedia - 25) * 1.2 + v(c, 'moradia_privada') * 0.3 - v(c, 'igualdade') * 0.2);
  set(c, 'orfaos_menores', v(c, 'pobreza') * 0.6 + 15 - c.politica.bemEstar * 0.15 - v(c, 'caridade') * 0.1);
  set(c, 'animais_abandonados', v(c, 'pobreza') * 0.35 + 12 - c.politica.saude * 0.08 - v(c, 'caridade') * 0.15);
  set(c, 'caridade', c.religiosidade * 45 + v(c, 'pib_pc_ppp') * 0.25 + c.felicidade * 0.2);
  // ---------- Cultura: religião e descrença ----------
  set(c, 'religiosidade', c.religiosidade * 100 + (c.leis.igreja === 2 ? 6 : c.leis.igreja === 0 ? -4 : 0) + ((c.reformas?.estado_laico ?? 0) > 0 ? -10 : 0) - c.politica.educacao * 0.1 - c.pesquisa.social * 0.05);
  set(c, 'descrenca', 100 - v(c, 'religiosidade') + c.politica.educacao * 0.15 + c.pesquisa.social * 0.1 + (c.leis.igreja === 0 ? 4 : 0) + ((c.reformas?.estado_laico ?? 0) > 0 ? 5 : 0));
  set(c, 'crime_juvenil', v(c, 'pobreza') * 0.4 + c.desemprego * 0.9 + (60 - c.politica.leiOrdem) * 0.35 - c.politica.educacao * 0.2);

  // ---------- Segurança / externo ----------
  set(c, 'integridade_territorial', 80 - (c.guerra ? 55 : 0) + (c.apoioGrupo.nacionalistas ?? 30) * 0.15 - c.pops.radicalizacao * 0.1);
  set(c, 'indice_prontidao_guerra', c.militar.orcamento * 1.3 + c.pesquisa.militar * 0.4 + grupoValor(c, 'defesa') * 0.35 + c.militar.prontidao * 0.2 + c.politica.militar * 0.5);
  set(c, 'projecao_poder', valorSetor(c, 'porta_avioes') * 0.8 + valorSetor(c, 'cacas') * 0.7 + grupoValor(c, 'defesa') * 0.3 + c.militar.reserva * 0.02 + c.prestige * 0.01);
  set(c, 'relacoes_exteriores', 50 + relMedia(w, c.id) * 0.5 - c.infamia * 0.7 + Math.min(20, w.tratados.filter((t) => t.a === c.id || t.b === c.id).length * 4) + (100 - w.tensaoGlobal) * 0.1);
  set(c, 'importacoes_estrangeiras', c.abertura * 0.7 + v(c, 'gasto_consumidor') * 0.2 + valorSetor(c, 'transporte_naval_serv') * 0.15);
  set(c, 'exportacoes', c.abertura * 0.6 + agroT * 0.2 + v(c, 'setor_manufatura') * 0.2 + valorSetor(c, 'transporte_naval_serv') * 0.2);
  set(c, 'exportacoes_estrangeiras', v(c, 'setor_financeiro') * 0.35 + valorSetor(c, 'turismo') * 0.5 + c.abertura * 0.3);
  set(c, 'ajuda_estrangeira', Math.max(0, 40 - v(c, 'pib_pc_nominal') * 0.4) + Math.max(0, 45 - c.estabilidade) * 0.4 + v(c, 'relacoes_exteriores') * 0.1);

  // ---------- Situação de preço/energia/transporte ----------
  set(c, 'uso_carro', valorSetor(c, 'automoveis') * 0.55 + valorSetor(c, 'transporte_rodoviario') * 0.3 + c.urbano * 25 - v(c, 'transicao_carro_eletrico') * 0.08);
  set(c, 'uso_onibus', valorSetor(c, 'transporte_urbano') * 0.7 + v(c, 'densidade_urbana') * 0.15 + v(c, 'custo_vida') * 0.1);
  set(c, 'uso_trem', valorSetor(c, 'transporte_ferroviario') * 0.65 + c.politica.infraestrutura * 0.35 + c.urbano * 10);
  set(c, 'congestionamento', v(c, 'uso_carro') * 0.7 + v(c, 'densidade_urbana') * 0.3 - v(c, 'uso_onibus') * 0.2);
  set(c, 'viagem_aerea', valorSetor(c, 'transporte_aereo') * 0.65 + valorSetor(c, 'turismo') * 0.3 + v(c, 'pib_pc_ppp') * 0.1);
  set(c, 'transicao_carro_eletrico', c.politica.verde * 0.8 + v(c, 'energia_solar') * 0.2 + v(c, 'preco_petroleo') * 0.15);
  set(c, 'demanda_energia', v(c, 'setor_manufatura') * 0.5 + Math.log10(pop + 1) * 18 + valorSetor(c, 'eletrodomesticos') * 0.2);
  set(c, 'oferta_energia', grupoValor(c, 'energia') * 0.8 + v(c, 'energia_solar') * 0.1 + v(c, 'energia_eolica') * 0.1);
  set(c, 'preco_energia', 52 + v(c, 'demanda_energia') * 0.3 - v(c, 'oferta_energia') * 0.3 + v(c, 'preco_petroleo') * 0.15);
  set(c, 'eficiencia_energetica', c.pesquisa.industrial * 0.5 + v(c, 'preco_energia') * 0.2 + c.politica.renovaveis * 0.25);
  set(c, 'demanda_petroleo', v(c, 'uso_carro') * 0.5 + valorSetor(c, 'transporte_rodoviario') * 0.4 + v(c, 'setor_manufatura') * 0.25);
  set(c, 'oferta_petroleo', valorSetor(c, 'petroleo_bruto') * 1.2 + c.indiceRecurso * 0.3);
  set(c, 'preco_petroleo', N(w.mercado.petroleo?.preco ?? 36, 14, 70), w.mercado.petroleo?.preco ?? 36);
  set(c, 'energia_solar', valorSetor(c, 'eletr_solar') * 0.8 + c.politica.renovaveis * 0.4);
  set(c, 'energia_eolica', valorSetor(c, 'eletr_eolica') * 0.8 + c.politica.renovaveis * 0.4);
  set(c, 'emissao_co2', c.emissaoCo2, c.emissaoCo2);
  const co2g = w.indGlobal?.co2_global ?? 35;
  set(c, 'temperatura_media', 55 + co2g * 0.3 + (w.clima - 50) * 0.2, 14 + (co2g / 100) * 3);

  // ---------- Demografia ----------
  set(c, 'densidade_urbana', c.urbano * 55 + Math.log10(pop + 1) * 14, pop);
  set(c, 'idade_media', c.idadeMedia * 1.6, c.idadeMedia);
  set(c, 'fertilidade', c.fertilidade * 30, c.fertilidade);
  const migra = c.pops.migracaoLiquida;
  set(c, 'emigracao', Math.max(0, 30 - c.pops.sol * 0.4) + c.desemprego * 0.8 + (55 - c.democracia * 60) * 0.2, migra > 0 ? 0 : -migra);
  set(c, 'demanda_imigracao', c.democracia * 35 + c.abertura * 0.4 + Math.max(0, (c.idadeMedia - 35) * 1.2));
  set(c, 'imigracao', Math.max(0, migra * 9) + c.politica.imigracao * 0.3 + v(c, 'demanda_imigracao') * 0.2, migra > 0 ? migra : 0);
  set(c, 'imigracao_ilegal', Math.max(0, v(c, 'demanda_imigracao') * 0.55 - c.politica.leiOrdem * 0.6) + (migra < 0 ? -migra * 4 : 0));

  // ---------- Tecnologia / infra / construção ----------
  set(c, 'velocidade_internet', valorSetor(c, 'operadoras_telecom') * 0.55 + valorSetor(c, 'redes_telecom') * 0.45 + c.pesquisa.industrial * 0.2);
  set(c, 'industria_telecom', valorSetor(c, 'operadoras_telecom') * 0.6 + valorSetor(c, 'hardware') * 0.3 + valorSetor(c, 'satelites') * 0.2);
  set(c, 'inteligencia_artificial', valorSetor(c, 'software') * 0.5 + valorSetor(c, 'hardware') * 0.35 + c.pesquisa.industrial * 0.3);
  set(c, 'automacao_industrial', valorSetor(c, 'robos') * 0.7 + v(c, 'produtividade') * 0.2 + v(c, 'salarios') * 0.1);
  set(c, 'automacao_residencial', valorSetor(c, 'eletronica_consumo') * 0.5 + v(c, 'pib_pc_ppp') * 0.2 + v(c, 'inteligencia_artificial') * 0.3);
  set(c, 'automacao_comercial', v(c, 'inteligencia_artificial') * 0.5 + v(c, 'comercio_domestico') * 0.3 + valorSetor(c, 'fastfood') * 0.15);
  set(c, 'qualidade_infra', c.infraestrutura + valorSetor(c, 'construcao_civil') * 0.25 + c.politica.infraestrutura * 0.15);
  set(c, 'custo_vida', c.inflacao * 1.5 + v(c, 'preco_alimentos_idx') * 0.2 + v(c, 'preco_energia') * 0.2 + v(c, 'moradia_privada') * 0.1);
  set(c, 'atividade_construcao', valorSetor(c, 'construcao_civil') * 0.7 + valorSetor(c, 'cimento') * 0.5 + (55 - v(c, 'taxa_juros')) * 0.3);
  set(c, 'moradia_privada', valorSetor(c, 'construcao_civil') * 0.5 + (55 - v(c, 'taxa_juros')) * 0.25 + c.urbano * 30);

  // ---------- Instituições ----------
  set(c, 'burocracia', 55 - c.politica.leiOrdem * 0.25 - valorSetor(c, 'software') * 0.15 + 8 + (c.governo?.delegacao ?? 0.3) * 12 - (c.governo?.conflitoPoderes ?? 20) * 0.2 + c.politica.pesquisa * 0.05);
  set(c, 'fundos_partido', c.receitaPct * 1.2 + v(c, 'taxa_lucro') * 0.3 + (60 - (c.governo?.corte ?? 50)) * 0.15);
  set(c, 'aprovacao_partido', c.aprovacao + 25 + (c.partidos.find((p) => p.ruling)?.support ?? 0) * 0.3 - c.infamia * 0.3);
  set(c, 'reformismo_partido', 35 + v(c, 'fundos_partido') * 0.25 + v(c, 'aprovacao_partido') * 0.2 + c.democracia * 20 - c.pops.radicalizacao * 0.15);
  set(c, 'apoio_socialismo_global', w.indGlobal?.socialismo_global ?? 45);
  set(c, 'apoio_capitalismo_global', w.indGlobal?.capitalismo_global ?? 55);

  const mods = c.reformasInd ?? {};
  for (const [k, d] of Object.entries(mods)) {
    if (c.indicadores[k] !== undefined) c.indicadores[k] = clamp((c.indicadores[k] ?? 50) + d, 0, 100);
  }

  aplicaBonusIncentivoCorp(c);
};

export const computaGlobal = (w: World): void => {
  let ofP = 0, deP = 0, co2 = 0, pob = 0, ig = 0, inf = 0, relig = 0, desc = 0;
  let n = 0;
  let soc = 45;
  const c0 = w.paises[w.jogadorId];
  for (const c of Object.values(w.paises)) {
    n++;
    ofP += producaoDe(c, 'petroleo');
    deP += consumoDe(c, 'petroleo');
    co2 += c.emissaoCo2 ?? 35;
    pob += c.indicadores.pobreza ?? 40;
    ig += c.indicadores.igualdade ?? 50;
    inf += c.infamia;
    relig += c.indicadores.religiosidade ?? c.religiosidade * 100;
    desc += c.indicadores.descrenca ?? (1 - c.religiosidade) * 100;
    if (c.regime === 'autoritário' && c.ideologia.econ < 0) soc += 4;
  }
  n = n || 1;
  const pobrezaG = pob / n;
  w.indGlobal = {
    co2_global: co2 / n,
    pobreza_global: pobrezaG,
    igualdade_global: ig / n,
    religiao_global: relig / n,
    descrenca_global: desc / n,
    relacao_media: inf / n,
    crise_vizinhos: clamp(35 + w.tensaoGlobal * 0.5, 5, 95),
    oferta_petroleo: ofP,
    demanda_petroleo: deP,
    socialismo_global: clamp(soc + (55 - ig / n) * 0.3, 5, 95),
    capitalismo_global: 0,
    tratados_meus: c0 ? Math.min(20, w.tratados.filter((t) => t.a === c0.id || t.b === c0.id).length * 4) : 0,
  };
  w.indGlobal.capitalismo_global = clamp(105 - w.indGlobal.socialismo_global, 5, 95);
};

export const valorFator = (w: World, c: Country, ref: string): number => {
  if (ref.startsWith('ind:')) return c.indicadores[ref.slice(4)] ?? 50;
  if (ref.startsWith('raw:')) return c.rawInd[ref.slice(4)] ?? 50;
  if (ref.startsWith('setor:')) return valorSetor(c, ref.slice(6));
  if (ref.startsWith('soma:')) return grupoValor(c, ref.slice(5) as never);
  if (ref.startsWith('politica:')) return c.politica[ref.slice(9) as keyof typeof c.politica] ?? 0;
  if (ref.startsWith('pais:')) {
    const k = ref.slice(5) as keyof Country;
    return Number.isFinite(c[k] as number) ? (c[k] as number) : 0;
  }
  if (ref.startsWith('mercado:')) return w.mercado[ref.slice(8)]?.preco ?? 0;
  if (ref.startsWith('leis:')) return c.leis[ref.slice(5) as keyof typeof c.leis] ?? 0;
  if (ref.startsWith('toggle:')) return ref === 'toggle:drogas' ? (c.alternadores.drogaLegal ? 100 : 0) : 0;
  if (ref.startsWith('reforma:')) return (c.reformas?.[ref.slice(8)] ?? 0) > 0 ? 100 : 0;
  if (ref.startsWith('mundo:')) return w.indGlobal?.[ref.slice(6)] ?? 0;
  if (ref.startsWith('grupo:')) return c.apoioGrupo[ref.slice(6)] ?? c.opinioesGrupos[ref.slice(6)] ?? 30;
  if (ref.startsWith('nodo:')) return c.rawInd.inclinacao_curva_juros ?? 0;
  if (ref.startsWith('trabalho:')) return ref === 'trabalho:emprego' ? clamp(100 - c.desemprego * 2, 0, 100) : 50;
  return 0;
};