import type { Country, World } from './types';
import { clamp, drifta, rand } from './util';
import { saldoComercialPct, receitaTarifaria } from './market';
import { par, economista } from './normas/registro';
import { REFORMAS_MAP } from './data/normas/catalogo';
import { custoObrasAnual, custoFuncionariosAnual } from './data/public';
import { custoEspacoMensal } from './space';
import { posEstadoDossie } from './dissolucao';
import { aliquotaCorpEfetiva, receitaIncentivoFolha, puxaEmpregoCorp } from './incentivoCorp';

export const potencial = (c: Country, w: World): number => {
  const gov = c.governo;
  let p = par('pot.base');
  p += c.politica.pesquisa / 100 * par('pot.pesquisa');
  p += c.politica.educacao / 100 * par('pot.educacao');
  p += c.politica.infraestrutura / 100 * par('pot.infra');
  p -= (c.politica.renda / 55) * par('pot.renda');
  p -= (aliquotaCorpEfetiva(c) / 45) * par('pot.corp');
  p -= (1 - c.democracia) * par('pot.antiDem');
  p += c.indiceRecurso * par('pot.recurso');
  p += c.pesquisa.industrial / 100 * par('pot.pesqInd');
  p += w.crescimentoGlobal * par('pot.crescGlobal');
  p += ((c.indicadores.confianca_empresarial ?? 50) - 50) * par('pot.ind.confianca');
  p += ((c.indicadores.produtividade ?? 50) - 50) * par('pot.ind.produtividade');
  p += ((c.indicadores.investimento_privado ?? 50) - 50) * par('pot.ind.investimento');
  p += ((c.indicadores.qualidade_infra ?? 50) - 50) * par('pot.ind.infra');
  p += ((c.indicadores.setor_financeiro ?? 50) - 50) * par('pot.ind.financeiro');
  p += ((c.indicadores.exportacoes ?? 50) - 50) * par('pot.ind.exportacoes');
  p += ((c.indicadores.comercio_domestico ?? 50) - 50) * par('pot.ind.comercio');
  p -= Math.max(0, (c.indicadores.pobreza ?? 50) - 50) * par('pot.pobreza');
  p -= Math.max(0, c.inflacao - 3) * par('pot.inflacao');
  p -= c.jurosPagos * par('pot.jurosPagos');
  p -= (c.gdp / par('pot.gdp.base')) * par('pot.gdp.peso');
  p += Math.max(0, (2.2 - c.gdp / par('pot.gdp.cap'))) * par('pot.gdp.capPeso');
  p -= (Math.pow(c.gdp / c.populacao, par('pot.perCap.power')) / par('pot.perCap.div')) * par('pot.perCap.peso');
  p -= Math.max(0, par('pot.desemprego.base') - c.desemprego) * par('pot.desemprego.peso');
  if (gov) {
    p -= gov.conflitoPoderes * par('pot.conflito');
    p -= (100 - gov.apoioLegislativo) * par('pot.apoioLeg');
    p += (gov.corte - 50) * par('pot.corte');
  }
  return clamp(p, par('pot.clamp.min'), par('pot.clamp.max'));
};

export const pressaoInflacionaria = (c: Country): number => {
  const ind = c.indicadores ?? {};
  const p = par('inf.base');
  const demand = (c.crescimento - par('inf.cresc.meio')) * par('inf.cresc.peso');
  const monet = (par('inf.juros.meio') - c.politica.juros) * par('inf.juros.peso');
  const energia = c.recurso === 'nenhum' ? par('inf.energia.nenhum') : c.recurso === 'petroleo' || c.recurso === 'gas' ? par('inf.energia.combust') : par('inf.energia.livre');
  const renovaveis = (c.politica.renovaveis / 100) * -par('inf.renov');
  const economia = (c.leis.economia === 2 ? par('inf.lei.plan') : c.leis.economia === 1 ? par('inf.lei.inter') : par('inf.lei.livre'));
  const energiaGap = ((ind.demanda_energia ?? 50) - (ind.oferta_energia ?? 50)) * par('inf.enGap');
  const custo = ((ind.custo_vida ?? 50) - 50) * par('inf.custo');
  const guerra = c.guerra ? par('inf.guerra') : 0;
  const conflito = ((c.governo?.conflitoPoderes ?? 20) - 20) * par('inf.conflito.peso');
  return p + demand + monet + energia + renovaveis + economia + energiaGap + custo + guerra + conflito;
};

export const passoEconomia = (c: Country, w: World) => {
  const pot = potencial(c, w);
  const uGap = c.desemprego - c.desempregoNatural;
  let alvo = pot - par('cresc.uGapPeso') * uGap;
  alvo += (c.politica.comercio - 50) / 100 * par('cresc.comercio');
  alvo += (c.abertura / 100) * w.crescimentoGlobal * par('cresc.abertura');
  alvo -= c.guerra ? par('cresc.guerra.fix') + Math.min(par('cresc.guerra.cap'), c.perdasGuerra / par('cresc.guerra.porPerda')) : 0;
  alvo += (c.fertilidade - par('cresc.fert.meio')) * par('cresc.fert.peso');
  alvo += saldoComercialPct(c, w) * par('cresc.saldo');
  alvo += ((c.indicadores.consumo_real ?? 50) - 50) * par('cresc.ind.consumo');
  alvo += ((c.indicadores.comercio_domestico ?? 50) - 50) * par('cresc.ind.comercio');
  alvo -= (c.governo?.conflitoPoderes ?? 20) * par('cresc.conflito');
  if (c.receitaPct - c.gastoPct < par('cresc.deficit.meio')) alvo -= par('cresc.deficit.peso');
  alvo -= Math.max(0, par('cresc.desemp.meio') - c.desemprego) * par('cresc.desemp.peso');
  alvo += (c.pops.lealismo - 50) * par('cresc.lealismo');
  alvo -= Math.max(0, alvo - par('cresc.ajuste.meio')) * par('cresc.ajuste.peso');

  c.crescimento = clamp(drifta(c.crescimento, alvo, par('cresc.drifta')) + rand(-par('cresc.rand'), par('cresc.rand')), par('cresc.clamp.min'), par('cresc.clamp.max'));

  const inflAlvo = clamp(pressaoInflacionaria(c) + (w.precoAlimento - 100) / par('inf.precAli.div') + (w.precoOleo - par('inf.oleo.base')) * par('inf.oleo.peso'), 0.5, 80);
  c.inflacao = clamp(drifta(c.inflacao, inflAlvo, par('infAlvo.drifta')) + rand(-par('infAlvo.rand'), par('infAlvo.rand')), 0.2, 90);

  const uAlvo = c.desemprego - par('uPeso.cresc') * (c.crescimento - pot) + par('uPeso.nat') * (c.desemprego - c.desempregoNatural) + (c.politica.bemEstar / 100) * par('uPeso.bemEstar') - ((c.indicadores.setor_manufatura ?? 50) - 50) * par('uPeso.manuf') - ((c.indicadores.agricultura_privada ?? 50) - 50) * par('uPeso.agri') - puxaEmpregoCorp(c);
  c.desemprego = clamp(drifta(c.desemprego, uAlvo, par('u.drifta')) + rand(-par('u.rand'), par('u.rand')), 2.8, 35);

  const progressivo = (c.politica.renda / 55) * par('gini.prog.renda') + (c.politica.bemEstar / 100) * par('gini.prog.bemEstar');
  const alvoGini = clamp(par('gini.alvo') - progressivo * par('gini.mult') - c.setores.agricultura * par('gini.agri'), 0.2, 0.68);
  c.gini = clamp(drifta(c.gini, alvoGini, par('gini.drifta')), 0.2, 0.68);

  c.gdp = c.gdp * Math.pow(1 + (c.crescimento + c.inflacao) / 100, 1 / 12);
  c.gdp = Math.max(par('gdp.min'), c.gdp);

  passoFinancas(c, w);
  passoSociedade(c);
};

/** Taxa anual de rendimento do fundo soberano: média global (crescimento + inflação) + prêmio de ações. */
export const taxaMediaGlobal = (w: World): number => {
  const ps = Object.values(w.paises);
  const infl = ps.length ? ps.reduce((a, x) => a + x.inflacao, 0) / ps.length : 0;
  return clamp(w.crescimentoGlobal + infl + par('fundo.premio.acoes'), par('fundo.taxa.min'), par('fundo.taxa.max'));
};

/**
 * Passo mensal do fundo soberano (US$ bi/mês): paga dividendos sobre o valor
 * detido e compra/vende para convergir à fatia-alvo X% do mercado de ações.
 * Retorna aporte (compra) e venda (excedente) para o orçamento abater a dívida.
 */
export const passoFundoSoberano = (c: Country, w: World): { aporte: number; dividendo: number; venda: number } => {
  if (c.posEstado || (c.reformas?.fundo_soberano ?? 0) <= 0) return { aporte: 0, dividendo: 0, venda: 0 };
  const meta = REFORMAS_MAP['fundo_soberano'];
  const x = c.impostos?.fundo_soberano ?? meta?.parametro?.padrao ?? 0;
  const valor = c.fundoValor ?? 0;
  const dividendo = valor * taxaMediaGlobal(w) / 100 / 12;
  const pibGlobal = Object.values(w.paises).reduce((a, p) => a + p.gdp, 0);
  const alvo = Math.min(x / 100 * par('fundo.mult.mercado') * pibGlobal, par('fundo.cap.pib') * c.gdp);
  if (valor > alvo) {
    const venda = valor - alvo;
    c.fundoValor = alvo;
    return { aporte: 0, dividendo, venda };
  }
  const aporte = Math.min(c.gdp * par('fundo.aporte.pib') / 100, alvo - valor);
  c.fundoValor = valor + aporte;
  return { aporte, dividendo, venda: 0 };
};

export const passoFinancas = (c: Country, w: World) => {
  const fundo = passoFundoSoberano(c, w);
  if (fundo.venda > 0) {
    const liquido = fundo.venda * (1 - par('fundo.venda.custo'));
    c.dividaPct = clamp(c.dividaPct - (liquido / Math.max(par('gdp.min'), c.gdp)) * 100, 0, 350);
  }
  const fundoAporte = (fundo.aporte / Math.max(par('gdp.min'), c.gdp)) * 100 * 12;
  const fundoDividendo = (fundo.dividendo / Math.max(par('gdp.min'), c.gdp)) * 100 * 12;
  const rendaShare = (c.politica.renda / 100) * par('fin.renda');
  const corpShare = (aliquotaCorpEfetiva(c) / 100) * par('fin.corp');
  const incentivoShare = receitaIncentivoFolha(c);
  const consShare = par('fin.cons.base') + (c.politica.tarifas / 100) * par('fin.cons.tarifa');
  const tarifaShare = (c.politica.tarifas / 100) * par('fin.tarifa');
  const evasion = clamp(par('fin.evasao.base') - (c.indicadores.burocracia ?? 50) / 100 * par('fin.evasao.burocracia') - c.politica.leiOrdem / 100 * par('fin.evasao.leiOrdem') - c.democracia * par('fin.evasao.democracia'), 0.05, 0.28);
  const tarifaComercio = receitaTarifaria(c, w);
  const censuraFuga = c.leis.midia === 2 ? par('fin.censura.midia') : 0;
  const receitaTributaria = (rendaShare + corpShare + incentivoShare + consShare + tarifaShare) * (1 - evasion - censuraFuga) * 100 + tarifaComercio;

  const bancosPub = c.alternadores.bancosPublicos ? par('fin.bancos.pub') : par('fin.bancos.priv');
  const receitaNaoTributaria = clamp(par('fin.naoTrib.base') + c.indiceRecurso * par('fin.naoTrib.recurso') + bancosPub, 0.1, 8) + fundoDividendo;
  const receitaTotal = receitaTributaria + receitaNaoTributaria;

  const reformas = c.reformas ?? {};
  const multPrevid = 1 - (reformas.reforma_previdencia ?? 0) * par('fin.mult.previ');
  const multSalarios = 1 - (reformas.reforma_salarios ?? 0) * par('fin.mult.salarios');
  const multBeneficios = 1 - (reformas.racionaliza_beneficios ?? 0) * par('fin.mult.beneficios');
  const multTransfer = 1 - (reformas.reforma_federativa ?? 0) * par('fin.mult.feder');
  const multPiso = 1 - (reformas.corte_piso ?? 0) * par('fin.mult.piso');

  const previdencia = clamp(par('fin.previ.base') + (c.idadeMedia - par('fin.previ.meio')) / par('fin.previ.den') * par('fin.previ.fator'), 0.8, 9.5) * multPrevid;
  const salarios = clamp(par('fin.salarios.base') + (c.indicadores.burocracia ?? 50) / 100 * par('fin.salarios.burocracia') + (1 - c.urbano) * par('fin.salarios.rural'), 1.3, 6.8) * multSalarios + custoFuncionariosAnual(c);
  const beneficios = clamp(par('fin.benef.base') + (c.indicadores.pobreza ?? 50) / 100 * par('fin.benef.pobreza') + c.desemprego * par('fin.benef.desemprego') + ((c.politica.bemEstar - 50) / 50) * par('fin.benef.bemEstar'), 0.15, 5.4) * multBeneficios;
  const transferencias = clamp(par('fin.transf.base') + c.urbano * par('fin.transf.urbano') + (c.governo?.bicameral ? par('fin.transf.bicam') : 0), 0.3, 2.3) * multTransfer;
  const pisoSaude = par('fin.piso.saude') * multPiso * (c.guerra ? par('fin.piso.saudeGuerra') : 1);
  const pisoEduc = par('fin.piso.educ') * multPiso;
  const obrigatorias = previdencia + salarios + beneficios + transferencias + pisoSaude + pisoEduc + fundoAporte;

  const riscoDivida = c.dividaPct > par('fin.risco.limiar') ? Math.sqrt(c.dividaPct - par('fin.risco.limiar')) * par('fin.risco.fator') : 0;
  const premio = ((c.indicadores.premio_do_prazo ?? 50) - 50) * par('fin.premio');
  const taxa = par('fin.taxa.base') + (c.politica.juros / 100) * par('fin.taxa.juros') + (c.democracia < par('fin.taxa.dem.limiar') ? par('fin.taxa.dem.baixa') : par('fin.taxa.dem.alta')) + riscoDivida + premio;
  const juros = Math.min((c.dividaPct / 100) * taxa, par('fin.juros.teto'));
  const amortizacao = (c.dividaPct / 100) * par('fin.amort.divida') + par('fin.amort.base');
  const financeiras = juros + amortizacao;

  let discSaude = Math.max(0, (c.politica.saude / 100) * par('fin.disc.saude') - pisoSaude);
  let discEduc = Math.max(0, (c.politica.educacao / 100) * par('fin.disc.educ') - pisoEduc);
  let discInfra = (c.politica.infraestrutura / 100) * par('fin.disc.infra');
  let discPesquisa = (c.politica.pesquisa / 100) * par('fin.disc.pesquisa');
  let discDefesa = c.politica.militar;
  let discSeguranca = (c.politica.leiOrdem / 100) * par('fin.disc.seguranca');
  let discVerde = (c.politica.verde / 100) * par('fin.disc.verde');
  let discObras = Math.min(custoObrasAnual(c), 4);
  let discEspaco = custoEspacoMensal(c);
  let discricionarias = discSaude + discEduc + discInfra + discPesquisa + discDefesa + discSeguranca + discVerde + discObras + discEspaco;

  const regraOuro = (reformas.fiscal_resp ?? 0) > 0;
  let resultado = receitaTotal - (obrigatorias + discricionarias + financeiras);
  let corteRegra = 0;
  const limite = regraOuro ? par('fin.limite.regraOuro') : c.regime === 'autoritário' ? par('fin.limite.autoritario') : par('fin.limite.outros');
  if (resultado > limite && discricionarias > 0) {
    const corte = Math.min(discricionarias, resultado - limite);
    const f = (discricionarias - corte) / discricionarias;
    discSaude *= f; discEduc *= f; discInfra *= f; discPesquisa *= f; discDefesa *= f; discSeguranca *= f; discVerde *= f; discObras *= f; discEspaco *= f;
    discricionarias -= corte;
    corteRegra = corte;
    resultado = receitaTotal - (obrigatorias + discricionarias + financeiras);
  }

  const total = obrigatorias + discricionarias + financeiras;
  c.receitaPct = receitaTotal;
  c.gastoPct = total;
  c.deficitPct = Math.max(0, total - receitaTotal);
  c.jurosPagos = juros;

  c.orcamento = {
    receitaTributaria,
    receitaNaoTributaria,
    receitaTotal,
    obrigatorias,
    previdencia,
    salarios,
    beneficios,
    transferencias,
    pisoSaude,
    pisoEduc,
    discricionarias,
    discSaude,
    discEduc,
    discInfra,
    discPesquisa,
    discDefesa,
    discSeguranca,
    discVerde,
    discObras,
    discEspaco,
    financeiras,
    juros,
    amortizacao,
    fundoAporte,
    fundoDividendo,
    total,
    primario: total - juros,
    resultado,
    riscoFiscal: resultado > par('fin.riscoFiscal.resultado') || c.dividaPct > par('fin.riscoFiscal.divida'),
    regraOuro,
    corteRegra,
  };

  if (c.posEstado) {
    const d = posEstadoDossie(c);
    const fR = clamp(0.05 + d.coesao / 100 * 0.12, 0.05, 0.17);
    const fD = clamp(0.12 + d.coesao / 100 * 0.12, 0.12, 0.24);
    const receitaPos = receitaTributaria * fR + 0.25;
    const obrigPos = previdencia * 0.05 + salarios * 0.1 + beneficios * 0.25 + transferencias * 0.15 + pisoSaude * 0.1 + pisoEduc * 0.15;
    const discPos = discricionarias * fD;
    const discObrPos = Math.min(custoObrasAnual(c), 1.2);
    const totalPos = obrigPos + discPos + discObrPos;
    c.receitaPct = receitaPos;
    c.gastoPct = totalPos;
    c.deficitPct = 0;
    c.jurosPagos = 0;
    c.orcamento = {
      ...c.orcamento,
      receitaTributaria: Math.max(0, receitaPos - 0.25),
      receitaNaoTributaria: 0.25,
      receitaTotal: receitaPos,
      obrigatorias: obrigPos,
      previdencia: previdencia * 0.05,
      salarios: salarios * 0.1,
      beneficios: beneficios * 0.25,
      transferencias: transferencias * 0.15,
      pisoSaude: pisoSaude * 0.1,
      pisoEduc: pisoEduc * 0.15,
      discricionarias: discPos,
      discSaude: discSaude * fD,
      discEduc: discEduc * fD,
      discInfra: discInfra * fD,
      discPesquisa: discPesquisa * fD,
      discDefesa: discDefesa * fD,
      discSeguranca: discSeguranca * fD,
      discVerde: discVerde * fD,
      discObras: discObrPos,
      financeiras: 0,
      juros: 0,
      amortizacao: 0,
      total: totalPos,
      primario: totalPos,
      resultado: receitaPos - totalPos,
      riscoFiscal: false,
    };
    c.dividaPct = clamp(drifta(c.dividaPct, 6, 0.08), 0, 30);
  }

  const mensal = c.posEstado ? 0 : (total - receitaTotal) / 12;
  c.dividaPct = clamp(c.dividaPct + mensal * (c.guerra ? par('fin.divida.guerra') : 1), 0, 350);
};

const passoSociedade = (c: Country) => {
  const ef = economista(c);
  const ind = c.indicadores ?? {};
  c.educacaoIdx = drifta(c.educacaoIdx, (par('soc.educ.base') + (c.politica.educacao / 100) * par('soc.educ.politica')) * ef * par('soc.educ.ef') + (ind.graduados_universitarios ?? 0) / 100 * par('soc.educ.graduados'), par('soc.educ.drifta'));
  c.saudeIdx = drifta(c.saudeIdx, (par('soc.educ.base') + (c.politica.saude / 100) * par('soc.educ.politica')) * ef * par('soc.educ.ef') + (ind.saude_privada ?? 0) / 100 * par('soc.saude.privada'), par('soc.saude.drifta'));
  c.infraestrutura = drifta(c.infraestrutura, (par('soc.infra.base') + (c.politica.infraestrutura / 100) * par('soc.infra.politica')) * ef * par('soc.infra.ef') + (ind.qualidade_infra ?? 0) / 100 * par('soc.infra.ind'), par('soc.infra.drifta'));

  const felicAlvo = clamp(
    par('fel.base') + c.crescimento * par('fel.cresc') - (c.desemprego - par('fel.desemp.base')) * par('fel.desemp') - c.inflacao * par('fel.inflacao') + c.saudeIdx * par('fel.saude') + c.democracia * par('fel.democracia')
      + (ind.saude_mental ?? 50) * par('fel.ind.saudeMental')
      + (ind.igualdade ?? 50) * par('fel.ind.igualdade')
      + (ind.caridade ?? 50) * par('fel.ind.caridade')
      - (ind.custo_vida ?? 50) * par('fel.ind.custo')
      - (ind.pobreza ?? 50) * par('fel.ind.pobreza')
      - (ind.crime_juvenil ?? 50) * par('fel.ind.crime')
      - (c.governo?.conflitoPoderes ?? 20) * par('fel.conflito'),
    par('fel.clamp.min'), par('fel.clamp.max'),
  );
  c.felicidade = drifta(c.felicidade, felicAlvo, par('fel.drifta'));
};