import type { Country } from '../types';

// ============================================================
// REGISTRO CENTRAL DE PARÂMETROS E FÓRMULAS
// Todos os coeficientes numéricos do motor de leis/políticas são
// declarados aqui, NOMEADOS e com os MESMOS valores da versão legada.
// O jogo não deve conter constantes "mágicas" fora deste registro.
// ============================================================

export type ParamValor =
  | number
  | number[]
  | Record<string, number>
  | Record<string, number[]>;

export interface ParametroDef {
  id: string;
  grupo: string;
  desc: string;
  valor: ParamValor;
}

const P = (id: string, grupo: string, desc: string, valor: number): ParametroDef => ({ id, grupo, desc, valor });
const PR = (id: string, grupo: string, desc: string, valor: Record<string, number[]>): ParametroDef => ({ id, grupo, desc, valor });
const PRC = (id: string, grupo: string, desc: string, valor: Record<string, number>): ParametroDef => ({ id, grupo, desc, valor });

export const PARAMETROS: ParametroDef[] = [
  // ---------------- Motor legislativo: apoio e viabilidade ----------------
  P('legisl.base.autoritario', 'motor.viabilidade', 'Base de viabilidade legislativa em regimes autoritários.', 0.84),
  P('legisl.base.hibrido', 'motor.viabilidade', 'Base de viabilidade legislativa em regimes híbridos.', 0.38),
  P('legisl.base.democracia', 'motor.viabilidade', 'Base de viabilidade legislativa em democracias.', 0.20),
  P('legisl.peso.leg.hib', 'motor.viabilidade', 'Peso do apoio legislativo em regimes híbridos.', 0.34),
  P('legisl.peso.deleg.hib', 'motor.viabilidade', 'Peso da delegação executiva em regimes híbridos.', 0.12),
  P('legisl.peso.leg.dem', 'motor.viabilidade', 'Peso do apoio legislativo em democracias.', 0.30),
  P('legisl.peso.partido.dem', 'motor.viabilidade', 'Peso do apoio partidário em democracias.', 0.35),
  P('legisl.peso.deleg.dem', 'motor.viabilidade', 'Peso da delegação executiva em democracias.', 0.08),
  P('legisl.peso.deleg.autor', 'motor.viabilidade', 'Peso da delegação executiva em regimes autoritários.', 0.14),
  P('legisl.pen.custo', 'motor.viabilidade', 'Penalidade por ponto de custo acima de 1 em reformas.', 0.04),
  P('legisl.pen.sensivel', 'motor.viabilidade', 'Penalidade legislativa para reformas sensíveis.', 0.05),
  P('legisl.pen.inconstitucional', 'motor.viabilidade', 'Penalidade legislativa para reformas inconstitucionais.', 0.10),
  P('legisl.pen.blocoPolitica', 'motor.viabilidade', 'Penalidade legislativa para reformas do bloco política.', 0.03),
  P('legisl.pen.toggle', 'motor.viabilidade', 'Penalidade legislativa para alternadores (toggles).', 0.05),
  P('legisl.clamp.min', 'motor.viabilidade', 'Piso do resultado de viabilidade legislativa.', 0.05),
  P('legisl.clamp.max', 'motor.viabilidade', 'Teto do resultado de viabilidade legislativa.', 0.99),

  // ---------------- Motor judicial ----------------
  P('jud.base', 'motor.judicial', 'Base de viabilidade judicial.', 0.18),
  P('jud.peso.corte', 'motor.judicial', 'Peso da independência do judiciário.', 0.45),
  P('jud.peso.democracia', 'motor.judicial', 'Peso do nível democrático.', 0.22),
  P('jud.peso.aprovJud', 'motor.judicial', 'Peso da aprovação popular do judiciário.', 0.08),
  P('jud.bonus.autoritario', 'motor.judicial', 'Bônus de viabilidade judicial em regimes autoritários.', 0.28),
  P('jud.bonus.hibrido', 'motor.judicial', 'Bônus de viabilidade judicial em regimes híbridos.', 0.14),
  P('jud.dureza.meio', 'motor.judicial', 'Ponto médio da escala de dureza do judiciário.', 40),
  P('jud.dureza.tamanho', 'motor.judicial', 'Amplitude da escala de dureza do judiciário.', 60),
  P('jud.pen.sensivel', 'motor.judicial', 'Penalidade judicial máxima para reformas sensíveis.', 0.12),
  P('jud.pen.inconstitucional', 'motor.judicial', 'Penalidade judicial máxima para reformas inconstitucionais.', 0.30),
  P('jud.clamp.min', 'motor.judicial', 'Piso do resultado de viabilidade judicial.', 0.04),
  P('jud.clamp.max', 'motor.judicial', 'Teto do resultado de viabilidade judicial.', 0.99),

  // ---------------- Tempo de tramitação ----------------
  P('meses.leg.autor', 'motor.meses', 'Meses legislativos em regimes autoritários.', 1),
  P('meses.leg.naoReforma', 'motor.meses', 'Meses legislativos para propostas que não são reformas.', 1),
  P('meses.leg.hibCap', 'motor.meses', 'Cap do extra de meses em regimes híbridos.', 1),
  P('meses.senado', 'motor.meses', 'Meses extras até a votação no senado (após a câmara).', 1),
  P('meses.jud.autor', 'motor.meses', 'Meses judiciais em regimes autoritários.', 1),
  P('meses.jud.outros', 'motor.meses', 'Meses judiciais nos demais regimes.', 2),
  P('meses.jud.bonusInconst', 'motor.meses', 'Meses extras judiciais para reformas inconstitucionais.', 1),

  // ---------------- Votação plenária (cerimônia) ----------------
  P('cer.ausente', 'motor.cerimonia', 'Probabilidade de uma cadeira faltar à votação.', 0.05),
  P('cer.abstencao', 'motor.cerimonia', 'Probabilidade de uma cadeira se abster.', 0.03),
  P('cer.vel', 'motor.cerimonia', 'Intervalo base, em ms, entre cadeiras na animação.', 90),
  P('jud.membros', 'motor.cerimonia', 'Número de ministros no tribunal (cadeiras judiciais).', 11),

  // ---------------- Sanção e veto ----------------
  P('veto.override', 'motor.viabilidade', 'Fração mínima de votos favoráveis (presentes) para derrubar veto.', 0.66),

  // ---------------- Articulação do executivo ----------------
  P('artic.leg.custoAp', 'motor.articulacao', 'Custo de aprovação por articulação com o legislativo.', -3),
  P('artic.leg.favor', 'motor.articulacao', 'Bônus de voto favorável por cadeira ao articular com o legislativo.', 0.12),
  P('artic.leg.reuso', 'motor.articulacao', 'Meses de reutilização da articulação legislativa.', 3),
  P('artic.jud.custoAp', 'motor.articulacao', 'Custo de aprovação por articulação com o judiciário.', -2),
  P('artic.jud.favor', 'motor.articulacao', 'Bônus de voto favorável do tribunal ao articular com o judiciário.', 0.14),
  P('artic.jud.conflito', 'motor.articulacao', 'Conflito de poderes gerado pela articulação com o judiciário.', 4),

  // ---------------- Apoio partidário ----------------
  P('apoio.perto', 'motor.apoio', 'Limite de distância ideológica "próximo".', 0.25),
  P('apoio.perto.voto', 'motor.apoio', 'Fração de apoio por partidos próximos.', 1),
  P('apoio.medio', 'motor.apoio', 'Limite de distância ideológica "médio".', 0.5),
  P('apoio.medio.voto', 'motor.apoio', 'Fração de apoio por partidos médios.', 0.55),
  P('apoio.longe', 'motor.apoio', 'Limite de distância ideológica "longe".', 0.75),
  P('apoio.longe.voto', 'motor.apoio', 'Fração de apoio por partidos longe.', 0.22),
  P('apoio.fora.voto', 'motor.apoio', 'Fração de apoio por partidos distantes.', 0.05),
  P('apoio.ruling', 'motor.apoio', 'Bônus de apoio para partido na coalizão.', 0.3),
  P('apoio.reformismo', 'motor.apoio', 'Influência do reformismo partidário.', 0.25),

  // ---------------- Rejeição de propostas ----------------
  P('rej.dem.aprovJogador', 'motor.rejeicao', 'Perda de aprovação (democracia) por rejeição de proposta do jogador.', -1.5),
  P('rej.dem.aprovIA', 'motor.rejeicao', 'Perda de aprovação (democracia) por rejeição de proposta da IA.', -0.3),
  P('rej.estabJogador', 'motor.rejeicao', 'Perda de estabilidade por rejeição de proposta do jogador.', -0.6),
  P('rej.estabIA', 'motor.rejeicao', 'Perda de estabilidade por rejeição de proposta da IA.', -0.15),

  // ---------------- Leis enumeradas (pipeline próprio parametrizado) ----------------
  P('reformalei.viab.estabilidade', 'vigencia.reformaLei', 'Coeficiente da estabilidade na viabilidade de reforma de lei enumerada.', 0.55),
  P('reformalei.viab.democracia', 'vigencia.reformaLei', 'Coeficiente da democracia na viabilidade de reforma de lei enumerada.', 0.40),
  P('reformalei.viab.constante', 'vigencia.reformaLei', 'Constante base da viabilidade de reforma de lei enumerada.', 0.05),
  P('reformalei.rej.estabilidade', 'vigencia.reformaLei', 'Perda de estabilidade quando lei enumerada é rejeitada.', -5),
  P('reformalei.rej.aprovacao', 'vigencia.reformaLei', 'Perda de aprovação quando lei enumerada é rejeitada.', -4),

  // ---------------- Grau de intervenção econômica (lei "economia") ----------------
  P('economista.econ0', 'vigencia.economista', 'Fator econômico com economia laissez-faire.', 0.65),
  P('economista.econ1', 'vigencia.economista', 'Fator econômico com economia intervencionista.', 0.55),
  P('economista.econ2', 'vigencia.economista', 'Fator econômico com economia planificada.', 0.4),

  // ---------------- Efeitos diretos de reformas ----------------
  PR('efeito.limites', 'efeitos.reformas', 'Limites dos escalares de Country afetados por efeitos diretos de reformas.', {
    receitaPct: [0, 80], gastoPct: [0, 80], crescimento: [-8, 12], inflacao: [0.2, 90],
    desemprego: [2.8, 35], gini: [0.2, 0.68], dividaPct: [0, 350], aprovacao: [-100, 100],
    estabilidade: [-30, 100], felicidade: [0, 100], jurosPagos: [0, 9], infamia: [0, 100],
    prestige: [0, 2000], emissaoCo2: [0, 200], abertura: [0, 100],
    educacaoIdx: [0, 2], saudeIdx: [0, 2], infraestrutura: [0, 100],
  }),
  PRC('efeito.damp', 'efeitos.reformas', 'Amortecimento dos efeitos diretos por escalar (propensão à reversão).', { gini: 0.15, educacaoIdx: 0.1, saudeIdx: 0.1, infraestrutura: 0.08 }),

  // ---------------- Economia: potencial de crescimento ----------------
  P('pot.base', 'economia.potencial', 'Base do potencial de crescimento.', 0.8),
  P('pot.pesquisa', 'economia.potencial', 'Influência de Ciência & Tecnologia no potencial.', 1.6),
  P('pot.educacao', 'economia.potencial', 'Influência de Educação no potencial.', 1.2),
  P('pot.infra', 'economia.potencial', 'Influência de Infraestrutura no potencial.', 0.7),
  P('pot.renda', 'economia.potencial', 'Carga do imposto de renda no potencial (sobre /55).', 0.6),
  P('pot.corp', 'economia.potencial', 'Carga do imposto corporativo no potencial (sobre /45).', 0.35),
  P('pot.antiDem', 'economia.potencial', 'Custo de falta de democracia no potencial.', 0.3),
  P('pot.recurso', 'economia.potencial', 'Bônus de recursos naturais no potencial.', 0.4),
  P('pot.pesqInd', 'economia.potencial', 'Influência da pesquisa industrial no potencial.', 0.6),
  P('pot.crescGlobal', 'economia.potencial', 'Influência do crescimento global no potencial.', 0.3),
  P('pot.ind.confianca', 'economia.potencial', 'Coeficiente da confiança empresarial (desvio de 50).', 0.0035),
  P('pot.ind.produtividade', 'economia.potencial', 'Coeficiente da produtividade (desvio de 50).', 0.002),
  P('pot.ind.investimento', 'economia.potencial', 'Coeficiente do investimento privado (desvio de 50).', 0.002),
  P('pot.ind.infra', 'economia.potencial', 'Coeficiente da qualidade de infraestrutura (desvio de 50).', 0.0018),
  P('pot.ind.financeiro', 'economia.potencial', 'Coeficiente do setor financeiro (desvio de 50).', 0.0015),
  P('pot.ind.exportacoes', 'economia.potencial', 'Coeficiente das exportações (desvio de 50).', 0.0015),
  P('pot.ind.comercio', 'economia.potencial', 'Coeficiente do comércio doméstico (desvio de 50).', 0.001),
  P('pot.pobreza', 'economia.potencial', 'Custo da pobreza acima de 50 no potencial.', 0.0012),
  P('pot.inflacao', 'economia.potencial', 'Custo da inflação acima de 3 no potencial.', 0.08),
  P('pot.jurosPagos', 'economia.potencial', 'Custo dos juros da dívida no potencial.', 0.05),
  P('pot.gdp.base', 'economia.potencial', 'Denominador do efeito de escala da economia.', 45000),
  P('pot.gdp.peso', 'economia.potencial', 'Peso do efeito de escala da economia.', 1.0),
  P('pot.gdp.cap', 'economia.potencial', 'Ponto de corte do bônus de desenvolvimento.', 18000),
  P('pot.gdp.capPeso', 'economia.potencial', 'Peso do bônus de desenvolvimento.', 0.45),
  P('pot.perCap.power', 'economia.potencial', 'Expoente da renda per capita no potencial.', 0.9),
  P('pot.perCap.div', 'economia.potencial', 'Denominador da renda per capita no potencial.', 55),
  P('pot.perCap.peso', 'economia.potencial', 'Peso da renda per capita no potencial.', 0.5),
  P('pot.desemprego.base', 'economia.potencial', 'Desemprego de referência para o piso de Oku.', 4),
  P('pot.desemprego.peso', 'economia.potencial', 'Peso do desemprego abaixo da referência.', 0.35),
  P('pot.conflito', 'economia.potencial', 'Custo do conflito entre poderes.', 0.008),
  P('pot.apoioLeg', 'economia.potencial', 'Custo de apoio legislativo fraco.', 0.003),
  P('pot.corte', 'economia.potencial', 'Bônus de independência judicial acima de 50.', 0.002),
  P('pot.clamp.min', 'economia.potencial', 'Piso do potencial.', -2),
  P('pot.clamp.max', 'economia.potencial', 'Teto do potencial.', 10),

  // ---------------- Economia: pressão inflacionária ----------------
  P('inf.base', 'economia.inflacao', 'Base da pressão inflacionária.', 1.2),
  P('inf.cresc.meio', 'economia.inflacao', 'Crescimento de referência da demanda.', 1.5),
  P('inf.cresc.peso', 'economia.inflacao', 'Peso do hiato de crescimento.', 0.6),
  P('inf.juros.meio', 'economia.inflacao', 'Taxa de juros neutra.', 50),
  P('inf.juros.peso', 'economia.inflacao', 'Peso dos juros na pressão inflacionária.', 0.035),
  P('inf.energia.nenhum', 'economia.inflacao', 'Pressão de energia para países sem recurso.', 0.3),
  P('inf.energia.combust', 'economia.inflacao', 'Pressão de energia para petróleo/gás.', -0.1),
  P('inf.energia.livre', 'economia.inflacao', 'Pressão de energia para outros recursos.', 0),
  P('inf.renov', 'economia.inflacao', 'Alívio inflacionário das renováveis (sobre /100).', 0.18),
  P('inf.lei.plan', 'economia.inflacao', 'Pressão de economia planificada.', 0.25),
  P('inf.lei.inter', 'economia.inflacao', 'Pressão de economia intervencionista.', 0),
  P('inf.lei.livre', 'economia.inflacao', 'Pressão de economia laissez-faire.', -0.15),
  P('inf.enGap', 'economia.inflacao', 'Pressão do hiato demanda/oferta de energia.', 0.015),
  P('inf.custo', 'economia.inflacao', 'Pressão do custo de vida (desvio de 50).', 0.012),
  P('inf.guerra', 'economia.inflacao', 'Pressão inflacionária em guerra.', 0.35),
  P('inf.conflito.meio', 'economia.inflacao', 'Conflito de poderes de referência.', 20),
  P('inf.conflito.peso', 'economia.inflacao', 'Pressão do conflito de poderes.', 0.01),

  // ---------------- Economia: passo de crescimento ----------------
  P('cresc.uGapPeso', 'economia.crescimento', 'Peso do hiato de desemprego no crescimento objetivo.', 0.25),
  P('cresc.comercio', 'economia.crescimento', 'Influência da abertura comercial no crescimento objetivo.', 0.9),
  P('cresc.abertura', 'economia.crescimento', 'Influência da abertura efetiva mundial no crescimento objetivo.', 0.15),
  P('cresc.guerra.fix', 'economia.crescimento', 'Custo fixo de guerra no crescimento objetivo.', 1.5),
  P('cresc.guerra.porPerda', 'economia.crescimento', 'Perdas de guerra de referência para o custo adicional.', 5000),
  P('cresc.guerra.cap', 'economia.crescimento', 'Teto do custo adicional de guerra.', 3),
  P('cresc.fert.meio', 'economia.crescimento', 'Fertilidade de referência.', 2.1),
  P('cresc.fert.peso', 'economia.crescimento', 'Peso da fertilidade no crescimento objetivo.', 0.04),
  P('cresc.saldo', 'economia.crescimento', 'Influência do saldo comercial no crescimento objetivo.', 0.22),
  P('cresc.ind.consumo', 'economia.crescimento', 'Coeficiente do consumo real (desvio de 50).', 0.002),
  P('cresc.ind.comercio', 'economia.crescimento', 'Coeficiente do comércio doméstico (desvio de 50).', 0.001),
  P('cresc.conflito', 'economia.crescimento', 'Custo do conflito de poderes no crescimento objetivo.', 0.012),
  P('cresc.deficit.meio', 'economia.crescimento', 'Déficit primário de referência.', -12),
  P('cresc.deficit.peso', 'economia.crescimento', 'Peso do déficit fora do limite.', 0.4),
  P('cresc.desemp.meio', 'economia.crescimento', 'Desemprego de referência.', 4),
  P('cresc.desemp.peso', 'economia.crescimento', 'Peso do desemprego abaixo da referência.', 0.5),
  P('cresc.lealismo', 'economia.crescimento', 'Influência do lealismo da população.', 0.008),
  P('cresc.ajuste.meio', 'economia.crescimento', 'Crescimento objetivo de referência para ajuste.', 3.5),
  P('cresc.ajuste.peso', 'economia.crescimento', 'Peso do ajuste anti-sobreaquecimento.', 0.45),
  P('cresc.drifta', 'economia.crescimento', 'Velocidade de convergência do crescimento.', 0.25),
  P('cresc.rand', 'economia.crescimento', 'Ruído mensal do crescimento.', 0.15),
  P('cresc.clamp.min', 'economia.crescimento', 'Piso do crescimento.', -8),
  P('cresc.clamp.max', 'economia.crescimento', 'Teto do crescimento.', 12),

  // ---------------- Economia: inflação mensal ----------------
  P('infAlvo.drifta', 'economia.inflacao', 'Velocidade de convergência da inflação.', 0.3),
  P('infAlvo.rand', 'economia.inflacao', 'Ruído mensal da inflação.', 0.2),
  P('inf.precAli.div', 'economia.inflacao', 'Denominador do preço global de alimentos.', 300),
  P('inf.oleo.base', 'economia.inflacao', 'Preço do petróleo de referência.', 60),
  P('inf.oleo.peso', 'economia.inflacao', 'Peso do preço do petróleo na inflação.', 0.004),

  // ---------------- Economia: desemprego ----------------
  P('uPeso.cresc', 'economia.desemprego', 'Peso do hiato de crescimento no desemprego objetivo.', 0.3),
  P('uPeso.nat', 'economia.desemprego', 'Peso do hiato de desemprego natural.', 0.06),
  P('uPeso.bemEstar', 'economia.desemprego', 'Influência do bem-estar social no desemprego objetivo.', 0.02),
  P('uPeso.manuf', 'economia.desemprego', 'Influência da manufatura no desemprego objetivo.', 0.004),
  P('uPeso.agri', 'economia.desemprego', 'Influência da agricultura privada no desemprego objetivo.', 0.002),
  P('u.drifta', 'economia.desemprego', 'Velocidade de convergência do desemprego.', 0.35),
  P('u.rand', 'economia.desemprego', 'Ruído mensal do desemprego.', 0.1),

  // ---------------- Economia: gini ----------------
  P('gini.prog.renda', 'economia.gini', 'Progressividade do imposto de renda.', 0.5),
  P('gini.prog.bemEstar', 'economia.gini', 'Progressividade do bem-estar social.', 0.35),
  P('gini.agri', 'economia.gini', 'Efeito redutor da agricultura no Gini.', 0.12),
  P('gini.alvo', 'economia.gini', 'Gini base objetivo.', 0.52),
  P('gini.mult', 'economia.gini', 'Multiplicador da progressividade no Gini objetivo.', 0.4),
  P('gini.drifta', 'economia.gini', 'Velocidade de convergência do Gini.', 0.06),

  // ---------------- Gasto: moeda (GDP mínimo) ----------------
  P('gdp.min', 'economia.gdp', 'Piso do PIB (evita colapso numérico).', 5),

  // ---------------- Orçamento: receita ----------------
  P('fin.renda', 'orcamento.receita', 'Peso do imposto de renda na receita tributária.', 0.45),
  P('fin.corp', 'orcamento.receita', 'Peso do imposto corporativo na receita tributária.', 0.35),
  P('fin.cons.base', 'orcamento.receita', 'Parcela base de tributos sobre consumo.', 0.06),
  P('fin.cons.tarifa', 'orcamento.receita', 'Parcela de tributos sobre consumo por tarifa.', 0.02),
  P('fin.tarifa', 'orcamento.receita', 'Parcela tarifária da receita tributária.', 0.02),
  P('fin.evasao.base', 'orcamento.receita', 'Sonegação base.', 0.26),
  P('fin.evasao.burocracia', 'orcamento.receita', 'Redução da sonegação por baixa burocracia.', 0.08),
  P('fin.evasao.leiOrdem', 'orcamento.receita', 'Redução da sonegação por lei & ordem.', 0.1),
  P('fin.evasao.democracia', 'orcamento.receita', 'Redução da sonegação por democracia.', 0.08),
  P('fin.censura.midia', 'orcamento.receita', 'Fuga de capital por mídia controlada.', 0.04),
  P('fin.bancos.pub', 'orcamento.receita', 'Receita não tributária com bancos públicos.', 0.5),
  P('fin.bancos.priv', 'orcamento.receita', 'Receita não tributária com bancos privados.', 0.15),
  P('fin.naoTrib.base', 'orcamento.receita', 'Base da receita não tributária.', 0.35),
  P('fin.naoTrib.recurso', 'orcamento.receita', 'Influência dos recursos naturais na receita não tributária.', 0.95),

  // ---------------- Orçamento: obrigatórias (reformas fiscais) ----------------
  P('fin.mult.previ', 'orcamento.obrigatorias', 'Economia da Reforma da Previdência.', 0.18),
  P('fin.mult.salarios', 'orcamento.obrigatorias', 'Economia da Contenção do Funcionalismo.', 0.13),
  P('fin.mult.beneficios', 'orcamento.obrigatorias', 'Economia da Racionalização de Benefícios.', 0.15),
  P('fin.mult.feder', 'orcamento.obrigatorias', 'Economia da Reforma dos Repasses Fiscais.', 0.32),
  P('fin.mult.piso', 'orcamento.obrigatorias', 'Economia da Revisão dos Mínimos de Gasto.', 0.32),
  P('fin.previ.base', 'orcamento.obrigatorias', 'Previdência base.', 0.9),
  P('fin.previ.meio', 'orcamento.obrigatorias', 'Idade média de referência da previdência.', 24),
  P('fin.previ.den', 'orcamento.obrigatorias', 'Amplitude etária da previdência.', 15),
  P('fin.previ.fator', 'orcamento.obrigatorias', 'Fator de crescimento da previdência.', 3.3),
  P('fin.salarios.base', 'orcamento.obrigatorias', 'Folha base.', 1.9),
  P('fin.salarios.burocracia', 'orcamento.obrigatorias', 'Influência da burocracia na folha.', 2.4),
  P('fin.salarios.rural', 'orcamento.obrigatorias', 'Influência da população rural na folha.', 0.4),
  P('fin.benef.base', 'orcamento.obrigatorias', 'Benefícios base.', 0.5),
  P('fin.benef.pobreza', 'orcamento.obrigatorias', 'Influência da pobreza nos benefícios.', 1.5),
  P('fin.benef.desemprego', 'orcamento.obrigatorias', 'Influência do desemprego nos benefícios.', 0.06),
  P('fin.benef.bemEstar', 'orcamento.obrigatorias', 'Influência do bem-estar social nos benefícios.', 0.55),
  P('fin.transf.base', 'orcamento.obrigatorias', 'Transferências base.', 0.45),
  P('fin.transf.urbano', 'orcamento.obrigatorias', 'Influência da urbanização nas transferências.', 0.35),
  P('fin.transf.bicam', 'orcamento.obrigatorias', 'Influência do bicameralismo nas transferências.', 0.35),
  P('fin.piso.saude', 'orcamento.obrigatorias', 'Piso constitucional de saúde.', 1.5),
  P('fin.piso.saudeGuerra', 'orcamento.obrigatorias', 'Multiplicador de guerra no piso de saúde.', 1.18),
  P('fin.piso.educ', 'orcamento.obrigatorias', 'Piso constitucional de educação.', 1.2),

  // ---------------- Orçamento: financeiras ----------------
  P('fin.risco.limiar', 'orcamento.financeiras', 'Dívida a partir da qual há prêmio de risco.', 80),
  P('fin.risco.fator', 'orcamento.financeiras', 'Prêmio de risco sobre o excesso de dívida.', 0.35),
  P('fin.premio', 'orcamento.financeiras', 'Influência do prêmio de prazo nos juros.', 0.02),
  P('fin.taxa.base', 'orcamento.financeiras', 'Taxa base de financiamento.', 3.0),
  P('fin.taxa.juros', 'orcamento.financeiras', 'Influência da política monetária na taxa.', 2.5),
  P('fin.taxa.dem.baixa', 'orcamento.financeiras', 'Sobretaxa para democracia fraca.', 1.5),
  P('fin.taxa.dem.alta', 'orcamento.financeiras', 'Sobretaxa para democracia forte.', 0.4),
  P('fin.taxa.dem.limiar', 'orcamento.financeiras', 'Limiar de democracia para a sobretaxa.', 0.5),
  P('fin.juros.teto', 'orcamento.financeiras', 'Teto da despesa com juros.', 9),
  P('fin.amort.divida', 'orcamento.financeiras', 'Parcela da dívida amortizada a cada mês.', 0.07),
  P('fin.amort.base', 'orcamento.financeiras', 'Amortização base.', 0.2),

  // ---------------- Orçamento: discricionárias ----------------
  P('fin.disc.saude', 'orcamento.discretivas', 'Linha disciplinar de saúde por ponto de política.', 5.6),
  P('fin.disc.educ', 'orcamento.discretivas', 'Linha disciplinar de educação por ponto de política.', 5.6),
  P('fin.disc.infra', 'orcamento.discretivas', 'Linha disciplinar de infraestrutura por ponto de política.', 3.9),
  P('fin.disc.pesquisa', 'orcamento.discretivas', 'Linha disciplinar de pesquisa por ponto de política.', 2.3),
  P('fin.disc.seguranca', 'orcamento.discretivas', 'Linha disciplinar de lei & ordem por ponto de política.', 2.7),
  P('fin.disc.verde', 'orcamento.discretivas', 'Linha disciplinar ambiental por ponto de política.', 1.7),

  // ---------------- Orçamento: regra fiscal ----------------
  P('fin.limite.regraOuro', 'orcamento.regra', 'Superávit limite com Regra de Ouro Fiscal.', 2.5),
  P('fin.limite.autoritario', 'orcamento.regra', 'Superávit limite em regimes autoritários.', 10),
  P('fin.limite.outros', 'orcamento.regra', 'Superávit limite nos demais regimes.', 6.5),
  P('fin.divida.guerra', 'orcamento.regra', 'Acelerador da dívida em guerra.', 1.5),
  P('fin.riscoFiscal.resultado', 'orcamento.regra', 'Resultado que sinaliza risco fiscal.', 5),
  P('fin.riscoFiscal.divida', 'orcamento.regra', 'Dívida que sinaliza risco fiscal.', 170),

  // ---------------- Orçamento: fundo soberano de ações ----------------
  P('fundo.mult.mercado', 'orcamento.fundo', 'Multiplicador do PIB global no valor-alvo (fatia-alvo X% do mercado de ações).', 1),
  P('fundo.cap.pib', 'orcamento.fundo', 'Teto do fundo como fração do próprio PIB.', 0.25),
  P('fundo.aporte.pib', 'orcamento.fundo', 'Aporte máximo do fundo por mês, em % do PIB.', 0.5),
  P('fundo.premio.acoes', 'orcamento.fundo', 'Prêmio de risco acima de crescimento+inflação globais na taxa do fundo (% a.a.).', 3.5),
  P('fundo.taxa.min', 'orcamento.fundo', 'Piso da taxa de rendimento anual do fundo (% a.a.).', 0),
  P('fundo.taxa.max', 'orcamento.fundo', 'Teto da taxa de rendimento anual do fundo (% a.a.).', 15),
  P('fundo.venda.custo', 'orcamento.fundo', 'Custo de venda (haircut) ao desfazer posições do fundo (fração do valor).', 0.05),

  // ---------------- Sociedade: índices acumulados ----------------
  P('soc.educ.base', 'sociedade.indices', 'Base do índice educacional.', 0.45),
  P('soc.educ.politica', 'sociedade.indices', 'Influência da política educacional.', 0.45),
  P('soc.educ.ef', 'sociedade.indices', 'Multiplicador do fator econômico na educação.', 1.9),
  P('soc.educ.graduados', 'sociedade.indices', 'Influência dos graduados universitários.', 0.08),
  P('soc.educ.drifta', 'sociedade.indices', 'Velocidade de convergência da educação.', 0.04),
  P('soc.saude.privada', 'sociedade.indices', 'Influência da saúde privada.', 0.06),
  P('soc.saude.drifta', 'sociedade.indices', 'Velocidade de convergência da saúde.', 0.04),
  P('soc.infra.base', 'sociedade.indices', 'Base da infraestrutura.', 40),
  P('soc.infra.politica', 'sociedade.indices', 'Influência da política de infraestrutura.', 55),
  P('soc.infra.ef', 'sociedade.indices', 'Multiplicador do fator econômico na infraestrutura.', 1.5),
  P('soc.infra.ind', 'sociedade.indices', 'Influência do indicador de qualidade de infraestrutura.', 0.08),
  P('soc.infra.drifta', 'sociedade.indices', 'Velocidade de convergência da infraestrutura.', 0.05),
  P('fel.base', 'sociedade.felicidade', 'Base da felicidade objetivo.', 45),
  P('fel.cresc', 'sociedade.felicidade', 'Influência do crescimento na felicidade.', 2.5),
  P('fel.desemp.base', 'sociedade.felicidade', 'Desemprego de referência da felicidade.', 4),
  P('fel.desemp', 'sociedade.felicidade', 'Custo do desemprego na felicidade.', 1.5),
  P('fel.inflacao', 'sociedade.felicidade', 'Custo da inflação na felicidade.', 0.4),
  P('fel.saude', 'sociedade.felicidade', 'Influência do índice de saúde na felicidade.', 25),
  P('fel.democracia', 'sociedade.felicidade', 'Influência da democracia na felicidade.', 8),
  P('fel.ind.saudeMental', 'sociedade.felicidade', 'Influência da saúde mental.', 0.12),
  P('fel.ind.igualdade', 'sociedade.felicidade', 'Influência da igualdade.', 0.1),
  P('fel.ind.caridade', 'sociedade.felicidade', 'Influência da caridade.', 0.04),
  P('fel.ind.custo', 'sociedade.felicidade', 'Custo do custo de vida na felicidade.', 0.15),
  P('fel.ind.pobreza', 'sociedade.felicidade', 'Custo da pobreza na felicidade.', 0.12),
  P('fel.ind.crime', 'sociedade.felicidade', 'Custo do crime juvenil na felicidade.', 0.08),
  P('fel.conflito', 'sociedade.felicidade', 'Custo do conflito de poderes na felicidade.', 0.1),
  P('fel.clamp.min', 'sociedade.felicidade', 'Piso da felicidade objetivo.', 10),
  P('fel.clamp.max', 'sociedade.felicidade', 'Teto da felicidade objetivo.', 95),
  P('fel.drifta', 'sociedade.felicidade', 'Velocidade de convergência da felicidade.', 0.08),

  // ---------------- Economia: incentivo ao imposto corporativo ----------------
  P('inc.preco.alvo', 'economia.incentivo', 'Inflação (%) de referência para realização plena da boa prática de preços.', 6),
  P('inc.oferta.base', 'economia.incentivo', 'Indicador de manufatura de referência do eixo oferta.', 40),
  P('inc.oferta.div', 'economia.incentivo', 'Amplitude do indicador de manufatura no eixo oferta.', 35),
  P('inc.salario.base', 'economia.incentivo', 'Indicador de salários de referência do eixo salários.', 50),
  P('inc.salario.div', 'economia.incentivo', 'Amplitude do indicador de salários no eixo salários.', 35),
  P('inc.emprego.alvo', 'economia.incentivo', 'Desemprego (%) de referência para realização plena da boa prática de emprego.', 9),
  P('inc.emprego.div', 'economia.incentivo', 'Amplitude do desemprego no eixo emprego.', 7),
  P('inc.emprego.puxa', 'economia.incentivo', 'Redução direta do desemprego (p.p.) sob realização plena da prática de contratação.', 0.8),
  P('inc.desconto.max', 'economia.incentivo', 'Meta máxima de desconto por boa prática (p.p.).', 12),
  P('inc.bonus.salario', 'economia.incentivo', 'Ganho no indicador de salários quando a fração realizada é plena.', 9),
  P('inc.bonus.oferta', 'economia.incentivo', 'Ganho no indicador de manufatura quando a fração realizada é plena.', 6),
  P('inc.bonus.emprego', 'economia.incentivo', 'Ganho no indicador de manufatura atribuído à boa prática de emprego, quando plena.', 5),
  P('inc.bonus.agro', 'economia.incentivo', 'Ganho no indicador de agricultura privada quando a fração realizada é plena.', 3),
  P('inc.bonus.prod', 'economia.incentivo', 'Ganho no indicador de produtividade quando a fração realizada é plena.', 4),
  P('inc.bonus.invest', 'economia.incentivo', 'Ganho no indicador de investimento privado quando a fração realizada é plena.', 5),
  P('inc.bonus.confianca', 'economia.incentivo', 'Ganho no indicador de confiança empresarial quando a fração realizada é plena.', 6),
  P('inc.bonus.comercio', 'economia.incentivo', 'Ganho no indicador de comércio doméstico quando a fração realizada é plena.', 3),
  P('inc.bonus.consumo', 'economia.incentivo', 'Ganho no indicador de consumo real quando a fração realizada é plena.', 4),
  P('inc.bonus.custo', 'economia.incentivo', 'Queda no indicador de custo de vida quando a fração realizada é plena.', 7),
  P('inc.bonus.alim', 'economia.incentivo', 'Queda no índice de preços de alimentos quando a fração realizada é plena.', 3),
  P('inc.receita.folha', 'economia.incentivo', 'Ganho de imposto de renda na receita (fração, antes da sonegação) por realização plena — IR sobre folha maior.', 0.09),
];

const MAPA = new Map<string, ParamValor>();
for (const p of PARAMETROS) MAPA.set(p.id, p.valor);

/** Lê um parâmetro numérico do registro central. */
export const par = (id: string): number => {
  const v = MAPA.get(id);
  if (typeof v !== 'number') throw new Error(`Parâmetro não numérico: ${id}`);
  return v;
};

/** Lê um parâmetro-Record de escalares. */
export const parMapNum = (id: string): Record<string, number> => {
  const v = MAPA.get(id);
  if (!v || typeof v === 'number' || Array.isArray(v)) throw new Error(`Parâmetro não é Record<number>: ${id}`);
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) out[k] = val as number;
  return out;
};

/** Lê um parâmetro-Record de intervalos [min, max]. */
export const parRanges = (id: string): Record<string, number[]> => {
  const v = MAPA.get(id);
  if (!v || typeof v === 'number' || Array.isArray(v)) throw new Error(`Parâmetro não é Record<ranges>: ${id}`);
  return v as Record<string, number[]>;
};

// ---------------- Registro de fórmulas ----------------

export interface FormulaRegistrada {
  id: string;
  nome: string;
  grupo: string;
  desc: string;
  parametros: string[];
}

export const FORMULAS: FormulaRegistrada[] = [
  { id: 'viabilidadeLegislativa', nome: 'Viabilidade legislativa de uma proposta', grupo: 'motor.viabilidade', desc: 'Base por regime + apoio legislativo + apoio partidário + delegação, menos penalidades de custo/sensibilidade/bloco/toggle.', parametros: ['legisl.base.**', 'legisl.peso.**', 'legisl.pen.**', 'legisl.clamp.**'] },
  { id: 'viabilidadeJudicial', nome: 'Viabilidade judicial de uma proposta', grupo: 'motor.judicial', desc: 'Base + corte + democracia + aprovação do judiciário, com bônus por regime e penalidade de sensibilidade escalada pela dureza.', parametros: ['jud.**'] },
  { id: 'mesesTramitacao', nome: 'Meses de tramitação por etapa', grupo: 'motor.meses', desc: 'Regime e custo da reforma definem os meses legislativos/judiciais.', parametros: ['meses.**'] },
  { id: 'apoioPartidario', nome: 'Apoio partidário esperado', grupo: 'motor.apoio', desc: 'Distância ideológica partido-proposta com bônus de coalizão e reformismo.', parametros: ['apoio.**'] },
  { id: 'reformaLeiEnumerada', nome: 'Reforma de lei institucional enumerada', grupo: 'vigencia.reformaLei', desc: 'Pipeline separado parametrizado: viabilidade = estabilidade + democracia + constante; rejeição penaliza estabilidade e aprovação.', parametros: ['reformalei.**'] },
  { id: 'economista', nome: 'Grau de intervenção econômica (lei economia)', grupo: 'vigencia.economista', desc: 'Fator por opção da lei enumerada "economia".', parametros: ['economista.**'] },
  { id: 'potencial', nome: 'Potencial de crescimento', grupo: 'economia.potencial', desc: 'Políticas econômicas, indicadores, recursos, demografia e instituições ajustam a base de potencial.', parametros: ['pot.**'] },
  { id: 'pressaoInflacionaria', nome: 'Pressão inflacionária', grupo: 'economia.inflacao', desc: 'Demanda, juros, energia, lei econômica e conflito de poderes.', parametros: ['inf.**'] },
  { id: 'passoFinancas', nome: 'Orçamento (passoFinancas)', grupo: 'orcamento', desc: 'Receita tributária/não tributária, obrigatórias (com reformas fiscais e aportes do fundo soberano), discricionárias, financeiras e regra fiscal.', parametros: ['fin.**', 'efeito.limites', 'fundo.**'] },
  { id: 'fundoSoberano', nome: 'Fundo soberano de ações', grupo: 'orcamento.fundo', desc: 'Alvo = X% × PIB global (limitado ao próprio PIB); aporte mensal limitado a % do PIB; rendimento ≈ crescimento + inflação globais + prêmio, pago ao Tesouro; venda de excedente e revogação abatem a dívida com haircut.', parametros: ['fundo.**'] },
  { id: 'efeitosDiretosDeReforma', nome: 'Efeitos diretos de reformas', grupo: 'efeitos.reformas', desc: 'Escalares de Country limitados por ' + "efeito.limites" + ' e amortecidos por efeito.damp; "ind:" acumulados em reformasInd.', parametros: ['efeito.**'] },
  { id: 'incentivoCorporativo', nome: 'Incentivo ao imposto corporativo', grupo: 'economia.incentivo', desc: 'De cada boa prática (preços, oferta, salários, emprego) deriva-se a fração realizada; o desconto concedido é a soma das metas ponderadas pela realização, e a alíquota efetiva é a original menos o desconto. Bônus mensais e IR extra pela folha maior escalam com a fração realizada.', parametros: ['inc.**'] },
];

/** Função-exemplo registrada: fator econômico da lei "economia". */
export const economista = (c: Country): number => {
  if (c.leis.economia === 0) return par('economista.econ0');
  if (c.leis.economia === 1) return par('economista.econ1');
  return par('economista.econ2');
};