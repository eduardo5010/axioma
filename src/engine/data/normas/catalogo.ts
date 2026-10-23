import type { Country, LeisId, PolicyKey, Sensibilidade, ToggleKey } from '../../types';
import type { CategoriaNorma, NormaDef, NormaValorEscala, NormaValorLei, NormaValorReforma, ParametroReforma } from '../../normas/tipos';
import { GATE_PADRAO } from '../../normas/tipos';
import { LEIS_PADRAO, POLITICAS_BASE } from './padroesPorRegime';

// ============================================================
// CATÁLOGO DE NORMAS — FONTE ÚNICA
// Todas as leis e políticas do jogo (15 sliders + 7 alternadores +
// 9 leis enumeradas + 117 reformas). chave == campo de estado.
// Valores e efeitos idênticos à versão legada.
// ============================================================

const REFEC = (c: Country, k: string): number => c.indicadores[k] ?? 50;

const s = (
  chave: string, nome: string, desc: string, emoji: string, categoria: CategoriaNorma,
  dominio: { min: number; max: number; passo: number }, unidade: NormaValorEscala['unidade'],
  econ: number, social: number, gate?: NormaDef['gate'],
): NormaDef => ({
  chave, componente: 'slider', nome, desc, emoji, categoria,
  valor: { formato: 'escala', dominio, unidade, padrao: POLITICAS_BASE[chave as keyof typeof POLITICAS_BASE] ?? 50 },
  perfilIdeologico: { econ, social },
  gate: gate ?? GATE_PADRAO,
});

const t = (chave: string, nome: string, desc: string, emoji: string, econ: number, social: number): NormaDef => ({
  chave, componente: 'alternador', nome, desc, emoji, categoria: 'politica',
  valor: { formato: 'alternador', padrao: false },
  perfilIdeologico: { econ, social },
  gate: GATE_PADRAO,
});

const l = (chave: string, nome: string, grupo: string, opcoes: { nome: string; desc: string }[]): NormaDef => ({
  chave, componente: 'lei', nome, desc: grupo, emoji: '⚖️',
  categoria: grupo === 'Economia' ? 'economia' : 'politica',
  valor: {
    formato: 'lei',
    opcoes: opcoes.map((o, i) => ({
      id: `op${i}`, nome: o.nome, desc: o.desc,
    })),
    padrao: (LEIS_PADRAO as Record<string, number>)[chave] ?? 1,
  },
  gate: 'legislativo',
});

type CondReforma = (c: Country, stacks: number) => string | null;

const r = (
  chave: string, nome: string, desc: string, emoji: string, categoria: CategoriaNorma,
  tipo: 'ativa' | 'empilhavel', maxPilhas: number, custo: number, sensibilidade: Sensibilidade,
  econ: number, social: number, efeitos: Record<string, number>,
  a?: CondReforma | ParametroReforma,
  b?: CondReforma | ParametroReforma,
): NormaDef => {
  const cond = typeof a === 'function' ? a : b as CondReforma | undefined;
  const parametro = typeof a === 'function' ? (b as ParametroReforma | undefined) : a as ParametroReforma | undefined;
  return {
    chave, componente: 'reforma', nome, desc, emoji, categoria,
    valor: { formato: 'reforma', tipo, maxPilhas, custo, sensibilidade, ...(parametro ? { parametro } : {}) },
    perfilIdeologico: { econ, social },
    efeitos,
    cond,
    gate: GATE_PADRAO,
  };
};

// ------------------------- Sliders (15) -------------------------
const _SLIDERS: NormaDef[] = [
  s('renda', 'Imposto de Renda', 'Alíquota sobre rendimentos de pessoas físicas.', '💵', 'receita', { min: 0, max: 55, passo: 1 }, 'pct', -0.8, 0),
  s('corporativo', 'Imposto Corporativo', 'Tributação sobre lucros das empresas.', '🏢', 'receita', { min: 0, max: 45, passo: 1 }, 'pct', -0.7, 0),
  s('bemEstar', 'Bem-estar Social', 'Benefícios, aposentadorias e transferências de renda.', '🛡️', 'gasto', { min: 0, max: 100, passo: 1 }, 'x', -0.7, 0),
  s('saude', 'Saúde Pública', 'Investimento no sistema de saúde.', '🏥', 'gasto', { min: 0, max: 100, passo: 1 }, 'x', -0.6, 0),
  s('educacao', 'Educação', 'Escolas, universidades e capacitação.', '🎓', 'gasto', { min: 0, max: 100, passo: 1 }, 'x', -0.6, 0),
  s('militar', 'Gastos Militares', '% do PIB destinado às Forças Armadas.', '🪖', 'gasto', { min: 0, max: 10, passo: 0.1 }, 'gdp', 0.1, 0.7),
  s('infraestrutura', 'Infraestrutura', 'Rodovias, portos, energia e logística.', '🏗️', 'gasto', { min: 0, max: 100, passo: 1 }, 'x', 0, 0.1),
  s('pesquisa', 'Ciência & Tecnologia', 'P&D, inovação e digitalização.', '🔬', 'gasto', { min: 0, max: 100, passo: 1 }, 'x', 0, 0),
  s('comercio', 'Abertura Comercial', 'Integração ao comércio mundial.', '🌐', 'economia', { min: 0, max: 100, passo: 1 }, 'x', 0.7, -0.2),
  s('tarifas', 'Tarifas de Importação', 'Proteção à indústria doméstica.', '🚢', 'economia', { min: 0, max: 100, passo: 1 }, 'x', -0.2, 0.5),
  s('imigracao', 'Abertura à Imigração', 'Nível de aceitação de imigrantes.', '🧳', 'politica', { min: 0, max: 100, passo: 1 }, 'x', 0.3, -0.7),
  s('verde', 'Política Ambiental', 'Regulação, impostos verdes e preservação.', '🌿', 'politica', { min: 0, max: 100, passo: 1 }, 'x', -0.3, -0.5),
  s('leiOrdem', 'Lei & Ordem', 'Policiamento, segurança pública e rigidez penal.', '⚖️', 'politica', { min: 0, max: 100, passo: 1 }, 'x', 0.1, 0.9),
  s('renovaveis', 'Energia Renovável', 'Transição de combustíveis fósseis para fontes limpas.', '🌱', 'politica', { min: 0, max: 100, passo: 1 }, 'x', -0.3, -0.5),
  s('juros', 'Taxa de Juros', 'Política monetária do banco central.', '🏦', 'economia', { min: 0, max: 100, passo: 1 }, 'x', 0.5, 0, 'imediato'),
];

// ------------------------- Alternadores (7) -------------------------
const _ALTERNADORES: NormaDef[] = [
  t('drogaLegal', 'Legalização de drogas', 'Libera substâncias atualmente proibidas.', '🌿', -0.2, -0.7),
  t('controleArmas', 'Controle de armas', 'Restringe porte e posse de armamento civil.', '🔫', -0.2, -0.5),
  t('penaMorte', 'Pena de morte', 'Autoriza execução de crimes graves.', '☠️', 0.2, 0.8),
  t('conscricao', 'Conscrição militar', 'Serviço militar obrigatório.', '🎖️', -0.1, 0.5),
  t('ambicaoNuclear', 'Programa nuclear', 'Busca desenvolver arsenal nuclear.', '☢️', 0.5, 0.7),
  t('bancosPublicos', 'Bancos públicos', 'Bancos estatais controlam o crédito.', '🏛️', -0.7, 0),
  t('censura', 'Censura à imprensa', 'Controle estatal da mídia.', '📰', 0.3, 0.9),
];

// ------------------------- Leis enumeradas (9) -------------------------
const _LEIS: NormaDef[] = [
  l('sufragio', 'Sufrágio', 'Governança', [
    { nome: 'Restrito', desc: 'Apenas proprietários e alfabetizados votam.' },
    { nome: 'Censitário', desc: 'Voto ligado à renda e instrução.' },
    { nome: 'Universal', desc: 'Todo cidadão adulto vota.' },
  ]),
  l('executivo', 'Poder Executivo', 'Governança', [
    { nome: 'Assembleia', desc: 'O parlamento governa diretamente.' },
    { nome: 'Presidencialista', desc: 'Chefe de Estado eleito governa.' },
    { nome: 'Monarquia', desc: 'Governado por monarca hereditário.' },
    { nome: 'Autocracia', desc: 'Poder concentrado num líder.' },
  ]),
  l('economia', 'Política Econômica', 'Economia', [
    { nome: 'Laissez-faire', desc: 'Mercado livre, estado mínimo.' },
    { nome: 'Intervencionista', desc: 'Estado regula e direciona.' },
    { nome: 'Planificada', desc: 'Economia dirigida pelo estado.' },
  ]),
  l('servicos', 'Serviços Públicos', 'Economia', [
    { nome: 'Privatizados', desc: 'Saúde e educação privadas.' },
    { nome: 'Mistos', desc: 'Público e privado coexistem.' },
    { nome: 'Nacionalizados', desc: 'Estado provê tudo.' },
  ]),
  l('igreja', 'Igreja & Estado', 'Sociedade', [
    { nome: 'Secular', desc: 'Estado laico, religião livre.' },
    { nome: 'Tolerante', desc: 'Religião favorecida, sem imposição.' },
    { nome: 'Confessional', desc: 'Religião integrada ao estado.' },
  ]),
  l('midia', 'Meios de Comunicação', 'Sociedade', [
    { nome: 'Livres', desc: 'Imprensa e redes sem controle.' },
    { nome: 'Regulados', desc: 'Licenças e Código de Ética.' },
    { nome: 'Controlados', desc: 'Estado pauta a imprensa.' },
  ]),
  l('cidadania', 'Cidadania', 'Sociedade', [
    { nome: 'Fechada', desc: 'Nacionalidade por etnia/linhagem.' },
    { nome: 'Cultural', desc: 'Nacionalidade por cultura e idioma.' },
    { nome: 'Territorial', desc: 'Nascimento no território basta.' },
  ]),
  l('terra', 'Propriedade Rural', 'Economia', [
    { nome: 'Latifúndio', desc: 'Terra concentrada nas elites rurais.' },
    { nome: 'Homesteading', desc: 'Reforma agrária e lotes familiares.' },
    { nome: 'Coletivizada', desc: 'Terra administrada pelo estado.' },
  ]),
  l('policia', 'Polícia & Segurança', 'Governança', [
    { nome: 'Civil', desc: 'Polícia civil e judiciário independente.' },
    { nome: 'Militarizada', desc: 'Gendarmeria com poderes ampliados.' },
    { nome: 'Polícia Secreta', desc: 'Vigilância e repressão política.' },
  ]),
];

// ------------------------- Reformas de receita -------------------------
const _REFORMAS: NormaDef[] = [
  r('ir_extra_fortunas', 'Sobretaxa de Grandes Fortunas', 'Alíquota adicional sobre patrimônios bilionários.', '💎', 'receita', 'ativa', 1, 2, 'sensivel', -0.85, 0, { receitaPct: 0.4, crescimento: -0.12, gini: -0.014, 'ind:igualdade': 0.7, 'ind:pobreza': -0.4 }),
  r('ir_ct_ipca', 'Correção do IR pela Inflação', 'Faixas do IR ajustadas anualmente pela inflação.', '📈', 'receita', 'ativa', 1, 1, 'normal', -0.3, 0, { receitaPct: -0.15, inflacao: -0.25, 'ind:salarios': 0.3 }),
  r('ir_cashback', 'Cashback para Baixa Renda', 'Devolução de parte dos impostos às famílias pobres.', '🪙', 'receita', 'ativa', 1, 1, 'normal', -0.8, 0, { receitaPct: -0.2, crescimento: 0.1, gini: -0.012, 'ind:pobreza': -0.6, 'ind:consumo_real': 0.5 }),
  r('icms_skills', 'Imposto de Transações Financeiras', 'Microtributo sobre transferências eletrônicas.', '💳', 'receita', 'ativa', 1, 1, 'normal', -0.4, 0, { receitaPct: 0.35, 'ind:liquidez_bancos': -0.6, 'ind:adocao_cripto': 0.3 }, { nome: 'Alíquota por transação', unidade: '%', min: 0, max: 2, passo: 0.01, padrao: 0.38 }),
  r('imposto_bigtech', 'Imposto sobre Big Tech', 'Tributação sobre receitas de plataformas digitais.', '📱', 'receita', 'ativa', 1, 1, 'normal', -0.5, 0, { receitaPct: 0.3, 'ind:velocidade_internet': -0.3, 'ind:inteligencia_artificial': -0.3 }, { nome: 'Alíquota sobre receita digital', unidade: '%', min: 0, max: 15, passo: 0.5, padrao: 3 }),
  r('carbon_tax', 'Imposto de Carbono', 'Preço sobre cada tonelada de CO₂ emitida.', '🏭', 'receita', 'ativa', 1, 2, 'sensivel', -0.4, -0.6, { receitaPct: 0.35, inflacao: 0.15, emissaoCo2: -0.7, 'ind:custo_vida': 0.3, 'ind:eficiencia_energetica': 0.5, 'ind:transicao_carro_eletrico': 0.4 }, { nome: 'Preço do carbono', unidade: 'US$/t', min: 0, max: 60, passo: 1, padrao: 20 }),
  r('wealth_tax_imoveis', 'Imposto sobre Imóveis de Alto Valor', 'Alíquotas maiores para imóveis de alto padrão.', '🏙️', 'receita', 'ativa', 1, 1, 'sensivel', -0.6, 0, { receitaPct: 0.3, gini: -0.012, 'ind:atividade_construcao': -0.4 }, { nome: 'Alíquota anual sobre patrimônio imobiliário', unidade: '%', min: 0, max: 4, passo: 0.1, padrao: 1 }),
  r('crypto_tax', 'Tributação de Criptoativos', 'Regula e taxam as exchanges e ganhos digitais.', '🪙', 'receita', 'ativa', 1, 1, 'normal', 0.3, 0, { receitaPct: 0.2, 'ind:adocao_cripto': -0.7, 'ind:reservas_cripto': -0.5 }, { nome: 'Alíquota sobre ganhos digitais', unidade: '%', min: 0, max: 35, passo: 1, padrao: 15 }),
  r('loteria_federal', 'Loteria Estatal', 'Sorteios estatais com receita direta aos cofres.', '🎰', 'receita', 'ativa', 1, 1, 'normal', 0, 0.2, { receitaPct: 0.25, felicidade: 0.1, gini: 0.005 }),
  r('turismo_tax', 'Taxa Turística', 'Tributo sobre turistas estrangeiros.', '🧳', 'receita', 'ativa', 1, 1, 'normal', 0.1, 0, { receitaPct: 0.15, 'ind:viagem_aerea': -0.2, 'ind:exportacoes_estrangeiras': -0.3 }, { nome: 'Taxa por estadia', unidade: 'US$/noite', min: 0, max: 80, passo: 5, padrao: 30 }),
  r('inheritance_tax', 'Imposto sobre Heranças', 'Taxação progressiva sucessória.', '⚰️', 'receita', 'ativa', 1, 2, 'sensivel', -0.75, 0, { receitaPct: 0.3, gini: -0.018, 'ind:igualdade': 0.8, 'ind:lacuna_geracional': -0.5 }, { nome: 'Alíquota sucessória', unidade: '%', min: 0, max: 40, passo: 1, padrao: 15 }),
  r('sin_taxes', 'Aumento de Impostos sobre o Vício', 'Mais carga sobre álcool e tabaco.', '🍺', 'receita', 'ativa', 1, 1, 'sensivel', 0.2, 0.4, { receitaPct: 0.2, 'ind:consumo_alcool': -0.8, 'ind:saude_mental': 0.3 }, { nome: 'Adicional sobre álcool e tabaco', unidade: '%', min: 0, max: 50, passo: 1, padrao: 25 }),
  r('royaltie_saude', 'Royalties de Recursos Naturais', 'Eleva a fatia estatal na extração mineral e petrolífera.', '⛏️', 'receita', 'ativa', 1, 1, 'normal', -0.3, 0, { receitaPct: 0.4, 'ind:setor_extracao': -0.5, crescimento: -0.06, 'ind:precos_terras_raras': 0.6 }, (c) => (c.indiceRecurso < 0.4 ? 'Requer recursos naturais significativos.' : null)),
  r('dividend_tax', 'Taxa sobre Dividendos', 'Tributa a distribuição de lucros aos sócios.', '📊', 'receita', 'ativa', 1, 1, 'normal', -0.6, 0, { receitaPct: 0.3, 'ind:estabilidade_bolsa': -0.5, 'ind:investimento_privado': -0.3 }, { nome: 'Alíquota sobre dividendos', unidade: '%', min: 0, max: 30, passo: 1, padrao: 15 }),
  r('ril_previdencia', 'Receita de Previdência Ampliada', 'Amplia a base contribuinte dos pensionistas.', '👵', 'receita', 'ativa', 1, 1, 'sensivel', -0.2, 0.2, { receitaPct: 0.4, aprovacao: -0.4, 'ind:pensoes_privadas': -0.2, 'ind:saude_mental': -0.3 }),
  r('propina_zero', 'Digitalização Tributária', 'Sistema fiscal 100% digital reduz a sonegação.', '💻', 'receita', 'ativa', 1, 1, 'normal', 0.2, 0, { receitaPct: 0.45, 'ind:burocracia': -0.8, 'ind:velocidade_internet': 0.2 }),
  r('porto_franco', 'Porto Francos Estratégicos', 'Zonas francas atraem comércio e transbordo.', '🛳️', 'receita', 'empilhavel', 4, 1, 'normal', 0.5, 0, { receitaPct: -0.15, 'ind:exportacoes': 0.8, 'ind:importacoes_estrangeiras': 0.7, crescimento: 0.1 }),
  r('vat_novo', 'IVA Moderno (alíquota única)', 'Substitui tributos cumulativos por IVA efetivo.', '🛒', 'receita', 'ativa', 1, 2, 'normal', 0, 0, { receitaPct: 0.3, 'ind:burocracia': -0.6, 'ind:setor_manufatura': 0.2, gini: -0.005 }, { nome: 'Alíquota do IVA', unidade: '%', min: 0, max: 30, passo: 1, padrao: 18 }),
  r('stamp_duty', 'Imposto sobre Valor de Transações', 'Cobrança fixa sobre contratos e vendas de ativos.', '✒️', 'receita', 'ativa', 1, 1, 'normal', 0.1, 0, { receitaPct: 0.15, 'ind:setor_financeiro': -0.3, 'ind:atividade_construcao': -0.2 }, { nome: 'Alíquota sobre transações', unidade: '%', min: 0, max: 6, passo: 0.1, padrao: 2 }),
  r('consulta_cidadania', 'Imposto da Cidadania (socioambiental)', 'Desconto fiscal para lares verdes e solidários.', '🌱', 'receita', 'ativa', 1, 1, 'sensivel', -0.4, -0.5, { receitaPct: -0.3, emissaoCo2: -0.5, 'ind:caridade': 0.6, 'ind:igualdade_genero': 0.4 }),
  r('polluters_pay', 'Princípio do Poluidor-Pagador', 'Taxas sobre setores que degradam o meio ambiente.', '🛢️', 'receita', 'ativa', 1, 1, 'sensivel', -0.5, -0.5, { receitaPct: 0.35, emissaoCo2: -0.9, 'ind:preco_energia': 0.4, inflacao: 0.1 }),
  r('green_bonds_receita', 'Títulos Verdes Soberanos', 'Financia infraestrutura limpa com papel verde.', '📗', 'receita', 'ativa', 1, 1, 'normal', -0.1, -0.5, { receitaPct: 0.2, dividaPct: 0.3, 'ind:oferta_energia': 0.4, 'ind:energia_solar': 0.5 }),
  r('preserved_land', 'Compensação para Conservação', 'Isenções fiscais para quem preserva florestas.', '🌲', 'receita', 'ativa', 1, 1, 'sensivel', -0.4, -0.5, { receitaPct: -0.25, emissaoCo2: -0.6, 'ind:preco_alimentos_idx': 0.3 }),
  r('notary_public', 'Cartórios Digitais', 'Desburocratiza e barateia os registros civis.', '🗂️', 'receita', 'ativa', 1, 1, 'normal', 0.1, 0, { receitaPct: 0.15, 'ind:burocracia': -0.7, 'ind:atividade_construcao': 0.2 }),
  r('safe_haven_tax', 'Fim do Paraíso Fiscal Interno', 'Fecha esquemas de elisão dentro do país.', '🏴', 'receita', 'ativa', 1, 2, 'sensivel', -0.5, 0, { receitaPct: 0.4, 'ind:estabilidade_bolsa': -0.4, 'ind:forca_moeda': 0.4 }),
  r('fuel_levy', 'Sobretaxa de Combustíveis', 'Imposto sobre derivados do petróleo.', '⛽', 'receita', 'ativa', 1, 1, 'sensivel', -0.2, 0, { receitaPct: 0.4, inflacao: 0.3, 'ind:custo_vida': 0.5, 'ind:transicao_carro_eletrico': 0.5, 'ind:uso_carro': -0.4 }, { nome: 'Sobretaxa por litro', unidade: '%', min: 0, max: 40, passo: 1, padrao: 15 }),
  r('ecele_agora', 'Ajuste de Transição Justa', 'Tem recursos para requalificar trabalhadores de setores em queda.', '🔁', 'receita', 'ativa', 1, 1, 'normal', -0.3, -0.4, { receitaPct: -0.2, desemprego: -0.1, 'ind:automacao_industrial': 0.4, 'ind:saude_mental': 0.3 }, (c) => (c.fertilidade < 1.6 ? 'Concentrado em países com indústrias legadas.' : null)),

  r('bolsa_valor', 'Renda Básica Emergencial', 'Transferência direta às famílias mais pobres.', '🧺', 'gasto', 'ativa', 1, 2, 'normal', -0.85, 0, { gastoPct: 0.5, crescimento: 0.15, gini: -0.02, 'ind:pobreza': -1.0, 'ind:consumo_real': 0.6, 'ind:igualdade': 0.8 }),
  r('clinica_gp', 'Rede de Clínicas Zonais', 'Postos de saúde perto das casas, 24h.', '🩺', 'gasto', 'ativa', 1, 1, 'normal', -0.6, 0, { gastoPct: 0.4, saudeIdx: 0.02, 'ind:demanda_saude': 0.4, 'ind:saude_mental': 0.5, 'ind:longevidade': 0.4 }),
  r('alfabet_agno', 'Alfabetização Universal', 'Programa nacional de alfabetização de adultos.', '📖', 'gasto', 'ativa', 1, 1, 'normal', -0.5, 0, { gastoPct: 0.35, educacaoIdx: 0.025, 'ind:desenvolvimento_humano': 0.6, 'ind:graduados_universitarios': 0.4 }, (c) => ((c.indicadores.aluno ?? 50) > 40 ? null : 'Requer demanda por letramento.')),
  r('metro_capitais', 'Expansão do Metrô', 'Expansão do transporte urbano sobre trilhos em grandes cidades.', '🚇', 'gasto', 'ativa', 1, 1, 'normal', 0, 0, { gastoPct: 0.5, 'ind:qualidade_infra': 0.5, 'ind:uso_trem': 1.0, 'ind:congestionamento': -0.6, crescimento: 0.1 }),
  r('burocracia_agil', 'Governo Digital', 'Serviços públicos 100% online.', '🖥️', 'gasto', 'ativa', 1, 1, 'normal', 0.2, 0, { gastoPct: 0.2, 'ind:burocracia': -1.0, 'ind:velocidade_internet': 0.3 }),
  r('merendas', 'Refeições Escolares Ampliadas', 'Alimentação escolar ampliada.', '🍎', 'gasto', 'ativa', 1, 1, 'normal', -0.5, 0, { gastoPct: 0.3, educacaoIdx: 0.01, 'ind:orfaos_menores': -0.5, 'ind:saude_mental': 0.4, 'ind:igualdade_genero': 0.3 }),
  r('casa_habitacao', 'Subsídio Habitacional Popular', 'Subsídio habitacional para famílias de baixa renda.', '🏠', 'gasto', 'ativa', 1, 1, 'normal', -0.6, 0, { gastoPct: 0.5, 'ind:atividade_construcao': 0.8, 'ind:moradia_privada': 0.5, 'ind:lacuna_geracional': -0.4, crescimento: 0.08 }),
  r('saude_digital', 'Prontuário Eletrônico Nacional', 'Integra os dados de saúde no país inteiro.', '💉', 'gasto', 'ativa', 1, 1, 'normal', -0.2, -0.2, { gastoPct: 0.25, saudeIdx: 0.015, 'ind:burocracia': -0.5, 'ind:saude_privada': 0.3 }),
  r('naval_defesa', 'Modernização Naval', 'Novos navios e frota de projeção de poder.', '🚢', 'gasto', 'ativa', 1, 2, 'normal', 0.2, 0.5, { gastoPct: 0.55, 'ind:projecao_poder': 1.2, 'ind:industria_pesada_privada': 0.6, infamia: 0.2, aprovacao: 0.1 }),
  r('habita_aluguel', 'Aluguel Social', 'Bolsa-aluguel para o atendimento emergencial.', '🔑', 'gasto', 'ativa', 1, 1, 'normal', -0.5, 0, { gastoPct: 0.35, 'ind:moradia_privada': 0.4, 'ind:orfaos_menores': -0.3, 'ind:pobreza': -0.4 }),
  r('ai_estatal', 'Supercomputador Nacional', 'Investe em IA e infraestrutura de computação.', '🧠', 'gasto', 'ativa', 1, 1, 'normal', -0.1, -0.2, { gastoPct: 0.35, 'ind:inteligencia_artificial': 1.0, 'ind:produtividade': 0.4, 'ind:automacao_industrial': 0.4 }, (c) => (REFEC(c, 'velocidade_internet') < 30 ? 'Requer internet avançada.' : null)),
  r('invest_agro', 'Safra Inteligente', 'Incentivos à modernização do agronegócio.', '🌾', 'gasto', 'ativa', 1, 1, 'normal', 0.3, 0, { gastoPct: 0.4, 'ind:agricultura_privada': 0.6, 'ind:preco_alimentos_idx': -0.4, 'ind:setor_extracao': 0.2 }),
  r('guarda_nacional', 'Guarda Nacional de Fronteiras', 'Reforça o controle das fronteiras.', '🛂', 'gasto', 'ativa', 1, 1, 'sensivel', -0.1, 0.7, { gastoPct: 0.3, 'ind:imigracao_ilegal': -0.9, 'ind:imigracao': -0.5, 'ind:integridade_territorial': 0.3 }),
  r('pol_cidadania', 'Policiamento Comunitário', 'Policiais nos bairros, menos letalidade.', '👮', 'gasto', 'ativa', 1, 1, 'sensivel', 0.1, -0.3, { gastoPct: 0.3, 'ind:crime_juvenil': -0.9, aprovacao: 0.5, 'ind:tensao_racial': -0.4 }),
  r('defesa_ciber', 'Comando Cibernético', 'Defende infraestruturas críticas de ataques.', '🛡️', 'gasto', 'ativa', 1, 1, 'normal', -0.1, 0.3, { gastoPct: 0.3, 'ind:projecao_poder': 0.5, 'ind:industria_telecom': 0.4, 'ind:velocidade_internet': -0.2 }),
  r('protecao_social', 'Seguro-Desemprego Amplo', 'Cobertura e valor estendidos.', '🪪', 'gasto', 'ativa', 1, 1, 'normal', -0.6, 0, { gastoPct: 0.4, desemprego: -0.15, 'ind:pobreza': -0.5, 'ind:consumo_real': 0.4, 'ind:saude_mental': 0.3 }),
  r('renovacao_park', 'Renovação da Frota Escolar', 'Escolas climatizadas e acessíveis.', '🏫', 'gasto', 'ativa', 1, 1, 'normal', -0.4, 0, { gastoPct: 0.35, educacaoIdx: 0.02, 'ind:graduados_universitarios': 0.4, 'ind:igualdade_genero': 0.3 }),
  r('satelite_geo', 'Programa Espacial Civil', 'Satélites de comunicação e monitoramento.', '🛰️', 'gasto', 'ativa', 1, 1, 'normal', -0.1, -0.2, { gastoPct: 0.45, 'ind:industria_telecom': 0.6, 'ind:viagem_aerea': 0.4, prestige: 1.5 }, (c) => (REFEC(c, 'velocidade_internet') < 25 ? 'Requer base tecnológica mínima.' : null)),
  r('pnad_trabalho', 'Programa Nacional de Qualificação', 'Cursos técnicos para a indústria e serviços.', '🛠️', 'gasto', 'ativa', 1, 1, 'normal', -0.3, -0.2, { gastoPct: 0.4, desemprego: -0.1, 'ind:produtividade': 0.5, 'ind:setor_manufatura': 0.4 }),
  r('agua_encanada', 'Saneamento Universal', 'Água tratada e coleta de esgoto em todo o país.', '🚰', 'gasto', 'ativa', 1, 1, 'normal', -0.4, 0, { gastoPct: 0.5, saudeIdx: 0.03, 'ind:industria_agua': 0.8, 'ind:longevidade': 0.4, 'ind:desenvolvimento_humano': 0.5 }),
  r('energia_limitada', 'Geração Distribuída Solar', 'Incentiva painéis solares em residências.', '☀️', 'gasto', 'ativa', 1, 1, 'sensivel', -0.3, -0.5, { gastoPct: 0.35, 'ind:energia_solar': 1.2, 'ind:oferta_energia': 0.5, emissaoCo2: -0.6 }),
  r('highways', 'Rodovias do Desenvolvimento', 'Novos corredores logísticos.', '🛣️', 'gasto', 'ativa', 1, 1, 'normal', 0.2, 0, { gastoPct: 0.5, 'ind:qualidade_infra': 0.6, 'ind:comercio_domestico': 0.4, 'ind:uso_carro': 0.3, crescimento: 0.12 }),
  r('bancos_regionais', 'Bancos Públicos Regionais', 'Crédito subsidiado para regiões pobres.', '🏦', 'gasto', 'ativa', 1, 1, 'normal', -0.6, 0, { gastoPct: 0.4, 'ind:liquidez_bancos': 0.4, 'ind:investimento_privado': 0.3, 'ind:igualdade': 0.4 }),
  r('pesquisa_marinha', 'Instituto Oceanográfico', 'Exploração científica e recursos do mar.', '🌊', 'gasto', 'ativa', 1, 1, 'normal', -0.1, -0.3, { gastoPct: 0.35, 'ind:setor_extracao': 0.4, 'ind:exportacoes_estrangeiras': 0.3, 'ind:viagem_aerea': 0.2 }, (c) => (c.regiao === 'África' || c.regiao === 'Ásia' ? 'Requer litoral estratégico.' : null)),
  r('defesa_civil', 'Defesa Civil Nacional', 'Prevenção e resposta a enchentes, secas e desastres.', '🚨', 'gasto', 'ativa', 1, 1, 'normal', -0.2, 0, { gastoPct: 0.35, estabilidade: 0.4, 'ind:qualidade_infra': 0.3, 'ind:orfaos_menores': -0.3, aprovacao: 0.2 }),
  r('vigilancia_epidemio', 'Vigilância Epidemiológica Nacional', 'Monitora surtos e amplia a vacinação.', '🦠', 'gasto', 'ativa', 1, 1, 'normal', -0.3, -0.2, { gastoPct: 0.3, saudeIdx: 0.02, 'ind:longevidade': 0.3, 'ind:saude_mental': 0.2 }),
  r('reforma_previdencia', 'Reforma da Previdência', 'Unifica idade mínima e tempo de contribuição, enxugando o custo previdenciário obrigatório.', '🧓', 'gasto', 'ativa', 1, 2, 'sensivel', 0.75, 0.55, { gastoPct: 0, aprovacao: -0.25, 'ind:agitacao_trabalhista': 0.8, 'ind:pensoes_privadas': 0.5 }),
  r('reforma_salarios', 'Contenção do Funcionalismo', 'Congela a folha de pagamento e corta cargos comissionados da máquina estatal.', '👔', 'gasto', 'ativa', 1, 2, 'sensivel', 0.7, 0.6, { gastoPct: 0, aprovacao: -0.2, 'ind:burocracia': 1.2 }),
  r('racionaliza_beneficios', 'Racionalização de Benefícios', 'Revisa critérios da rede assistencial e amplia a focalização dos repasses.', '🧾', 'gasto', 'ativa', 1, 2, 'sensivel', 0.8, 0.4, { gastoPct: 0, aprovacao: -0.28, 'ind:pobreza': 0.6 }),
  r('reforma_federativa', 'Reforma dos Repasses Fiscais', 'Recalcula os repasses do governo central às regiões e municípios.', '🗺️', 'gasto', 'ativa', 1, 1, 'sensivel', 0.55, 0.35, { gastoPct: 0, aprovacao: -0.15, 'ind:desenvolvimento_humano': -0.3 }),
  r('corte_piso', 'Revisão dos Mínimos de Gasto', 'Emenda que reduz os mínimos constitucionais de saúde e educação.', '⚖️', 'gasto', 'ativa', 1, 3, 'inconstitucional', 0.85, 0.6, { gastoPct: 0, aprovacao: -0.3, 'ind:demanda_saude': 1.2, 'ind:graduados_universitarios': -0.4 }),

  r('juros_corte', 'Corte de Juros do BC', 'Reduz a taxa básica para estimular crédito.', '📉', 'economia', 'empilhavel', 8, 1, 'normal', -0.4, 0, { crescimento: 0.15, inflacao: 0.2, 'ind:investimento_privado': 0.6, 'ind:estabilidade_bolsa': 0.4 }),
  r('juros_alta', 'Elevação de Juros do BC', 'Aperta a política monetária para conter a inflação.', '📈', 'economia', 'empilhavel', 8, 1, 'normal', 0.4, 0, { crescimento: -0.12, inflacao: -0.25, 'ind:investimento_privado': -0.5, 'ind:forca_moeda': 0.5 }),
  r('abr_comercio', 'Abertura Comercial', 'Reduz barreiras e amplia acordos de livre comércio.', '🌐', 'economia', 'empilhavel', 6, 1, 'normal', 0.6, -0.2, { gastoPct: -0.1, crescimento: 0.12, 'ind:exportacoes': 0.7, 'ind:importacoes_estrangeiras': 0.6, inflacao: -0.1 }),
  r('tarifa_corte', 'Redução de Tarifas', 'Barateia importações e insumos.', '🛃', 'economia', 'empilhavel', 6, 1, 'normal', 0.5, -0.1, { receitaPct: -0.15, inflacao: -0.15, 'ind:setor_manufatura': 0.3, 'ind:importacoes_estrangeiras': 0.5 }),
  r('tarifa_doca', 'Elevação de Tarifas', 'Protege a indústria doméstica.', '🏭', 'economia', 'empilhavel', 6, 1, 'normal', -0.3, 0.4, { receitaPct: 0.2, inflacao: 0.2, 'ind:setor_manufatura': 0.4, 'ind:importacoes_estrangeiras': -0.4 }),
  r('zona_processamento', 'Zonas de Processamento de Exportação', 'Polos industriais voltados ao exterior.', '🏗️', 'economia', 'ativa', 1, 1, 'normal', 0.3, 0, { crescimento: 0.15, 'ind:exportacoes': 0.8, 'ind:setor_manufatura': 0.5, desemprego: -0.1 }),
  r('emprego_verde', 'Empregos Verdes', 'Energia limpa e cadeias sustentáveis.', '🍃', 'economia', 'ativa', 1, 1, 'normal', -0.4, -0.6, { crescimento: 0.1, emissaoCo2: -0.5, 'ind:energia_eolica': 0.6, desemprego: -0.05 }, (c) => (REFEC(c, 'energia_solar') < 20 ? 'Requer matriz energética mínima.' : null)),
  r('banco_cred', 'Crédito ao Pequeno Negócio', 'Linhas de crédito para pequenos negócios e startups.', '🪺', 'economia', 'ativa', 1, 1, 'normal', 0.2, -0.2, { crescimento: 0.1, 'ind:investimento_privado': 0.6, 'ind:liquidez_bancos': 0.3, 'ind:comercio_domestico': 0.4 }),
  r('reforma_burocratica', 'Desburocratização Radical', 'Simplifica licenças e reduz o custo empresarial.', '📂', 'economia', 'ativa', 1, 2, 'normal', 0.4, 0, { crescimento: 0.15, 'ind:burocracia': -1.2, 'ind:confianca_empresarial': 0.6, 'ind:produtividade': 0.4 }),
  r('formalizacao', 'Formalização da Economia', 'Incentivos para tirar trabalhadores da informalidade.', '🧑‍💼', 'economia', 'ativa', 1, 1, 'normal', -0.2, -0.2, { receitaPct: 0.3, 'ind:salarios': 0.4, 'ind:agitacao_trabalhista': -0.3, 'ind:participacao_produtiva_trabalho': 0.4 }),
  r('pesquisa_inov', 'Fundo de Inovação', 'Subsidia P&D de empresas de alto valor.', '🔬', 'economia', 'ativa', 1, 1, 'normal', -0.1, -0.3, { crescimento: 0.12, 'ind:produtividade': 0.5, 'ind:inteligencia_artificial': 0.5, 'ind:graduados_universitarios': 0.3 }),
  r('infra_moderna', 'Relançamento de Infraestrutura', 'PPP em energia, portos e logística.', '🏗️', 'economia', 'ativa', 1, 1, 'normal', 0.1, 0, { crescimento: 0.18, 'ind:qualidade_infra': 0.7, 'ind:atividade_construcao': 0.5, dividaPct: 0.3 }),
  r('industria_defesa', 'Base Industrial de Defesa', 'Localiza fornecedores militares estratégicos.', '🪖', 'economia', 'ativa', 1, 1, 'normal', 0.2, 0.5, { crescimento: 0.05, 'ind:industria_pesada_privada': 0.7, 'ind:projecao_poder': 0.4, 'ind:setor_manufatura': 0.3 }),
  r('bio_habitat', 'Bioeconomia', 'Produtos da floresta em pé geram renda e preservam.', '🦜', 'economia', 'ativa', 1, 1, 'sensivel', -0.3, -0.6, { crescimento: 0.1, emissaoCo2: -0.7, 'ind:agricultura_privada': 0.3, 'ind:preco_alimentos_idx': -0.2 }),
  r('pontes_txtil', 'Cadeias Têxteis Locais', 'Backshoring da indústria de vestuário.', '🧵', 'economia', 'ativa', 1, 1, 'normal', 0.1, 0.2, { desemprego: -0.15, 'ind:industria_leve_privada': 0.6, 'ind:setor_manufatura': 0.2, inflacao: 0.1 }),
  r('fiscal_resp', 'Regra de Ouro Fiscal', 'Limita o déficit estrutural do governo.', '💰', 'economia', 'ativa', 1, 2, 'sensivel', 0.4, 0, { dividaPct: -0.5, gastoPct: -0.2, 'ind:premio_do_prazo': -0.6, 'ind:forca_moeda': 0.4, 'ind:custo_vida': -0.2 }, (c) => (c.dividaPct < 45 ? 'Requer dívida relevante para aplicar a âncora.' : null)),
  r('corte_custei', 'Corte de Despesas Correntes', 'Reduz custeio e penduricalhos do Estado.', '✂️', 'economia', 'ativa', 1, 1, 'normal', 0.2, 0, { gastoPct: -0.5, dividaPct: -0.3, aprovacao: -0.3, 'ind:burocracia': -0.3 }),
  r('pib_per_capita', 'Choque de Produtividade', 'Reforma escolar e industrial para subir a renda.', '🚀', 'economia', 'ativa', 1, 3, 'normal', 0, -0.2, { crescimento: 0.2, 'ind:produtividade': 0.7, 'ind:salarios': 0.5, desemprego: -0.08 }),
  r('imigr_qualificada', 'Vistos para Talentos', 'Atrai profissionais qualificados do exterior.', '🛬', 'economia', 'ativa', 1, 1, 'sensivel', 0.3, -0.5, { crescimento: 0.12, 'ind:imigracao': 0.8, 'ind:produtividade': 0.4, 'ind:tensao_racial': 0.2 }),
  r('cabotagem', 'Cabotagem Eficiente', 'Transporte marítimo interno barato e rápido.', '🚢', 'economia', 'ativa', 1, 1, 'normal', 0.2, 0, { crescimento: 0.08, 'ind:exportacoes': 0.4, 'ind:importacoes_estrangeiras': 0.4, inflacao: -0.1 }),
  r('pacto_energia', 'Matriz Energética Mista', 'Gás, sol e eólica equilibram oferta e custo.', '⚡', 'economia', 'ativa', 1, 1, 'normal', 0, -0.3, { crescimento: 0.08, 'ind:oferta_energia': 0.6, 'ind:preco_energia': -0.5, emissaoCo2: -0.3 }),
  r('autos_eletricos', 'Polo de Veículos Elétricos', 'Fábricas de carros elétricos e baterias.', '🔋', 'economia', 'ativa', 1, 1, 'normal', 0.1, -0.4, { crescimento: 0.12, 'ind:transicao_carro_eletrico': 1.2, 'ind:setor_manufatura': 0.4, emissaoCo2: -0.4 }, (c) => (REFEC(c, 'energia_solar') < 15 ? 'Requer geração renovável para viabilizar.' : null)),
  r('agro_export', 'Complexo de Exportação Agro', 'Portos e certificação para alimentos no mundo.', '🚜', 'economia', 'ativa', 1, 1, 'normal', 0.4, 0, { crescimento: 0.15, 'ind:agricultura_privada': 0.5, 'ind:exportacoes': 0.6, 'ind:preco_alimentos_idx': -0.3 }),
  r('mineracao_respons', 'Mineração Responsável', 'Extração com licenciamento e passivo ambiental.', '⛏️', 'economia', 'ativa', 1, 1, 'sensivel', 0.2, -0.3, { crescimento: 0.1, 'ind:setor_extracao': 0.5, emissaoCo2: -0.2, 'ind:precos_terras_raras': -0.4 }, (c) => (c.indiceRecurso < 0.5 ? 'Requer recursos minerais relevantes.' : null)),
  r('science_turismo', 'Cidade Científico-Tecnológica', 'Vale da inovação com universidades.', '🎓', 'economia', 'ativa', 1, 1, 'normal', -0.1, -0.3, { crescimento: 0.12, 'ind:graduados_universitarios': 0.7, 'ind:inteligencia_artificial': 0.4, 'ind:produtividade': 0.4 }),
  r('securit', 'Securitização de Recebíveis', 'Liberta capital travado em dívidas públicas.', '🏛️', 'economia', 'ativa', 1, 1, 'normal', 0.4, 0, { 'ind:liquidez_bancos': 0.6, 'ind:estabilidade_bolsa': 0.3, 'ind:investimento_privado': 0.5 }),
  r('moeda_digital_bc', 'Moeda Digital Soberana', 'Moeda digital emitida pelo banco central.', '💳', 'economia', 'ativa', 1, 1, 'sensivel', 0.2, 0, { 'ind:setor_financeiro': -0.3, 'ind:adocao_cripto': 0.5, 'ind:burocracia': -0.5, 'ind:forca_moeda': 0.4 }),
  r('reindustrializacao', 'Choque de Reindustrialização', 'Crédito e PPPs para montar indústrias nacionais.', '🔩', 'economia', 'empilhavel', 3, 1, 'normal', 0.1, 0.3, { crescimento: 0.12, 'ind:setor_manufatura': 0.6, 'ind:industria_leve_privada': 0.4, 'ind:comercio_domestico': 0.3 }),
  r('fundo_soberano', 'Fundo Soberano de Ações', 'O governo compra aos poucos uma fatia das ações do planeta; os dividendos entram no Tesouro.', '🏛️', 'economia', 'ativa', 1, 2, 'normal', -0.2, 0.1, { 'ind:estabilidade_bolsa': 0.05, 'ind:investimento_privado': -0.03 }, { nome: '% das ações globais', unidade: '%', min: 0, max: 5, passo: 0.1, padrao: 1 }),

  r('reforma_policia', 'Reforma do Sistema Penal', 'Alternativas à prisão para crimes leves.', '⚖️', 'politica', 'ativa', 1, 2, 'sensivel', -0.3, -0.4, { gastoPct: 0.2, 'ind:crime_juvenil': -0.5, 'ind:tensao_racial': -0.3, aprovacao: 0.3 }),
  r('lei_antifake', 'Lei Anti-Fake News', 'Responsabiliza a disseminação em massa de mentiras.', '📰', 'politica', 'ativa', 1, 2, 'inconstitucional', 0.1, 0.7, { estabilidade: 0.4, infamia: 0.3, 'ind:tensao_racial': -0.4, aprovacao: -0.2 }),
  r('voto_facil', 'Voto Eletrônico e Remoto', 'Facilita participação e reduz abstenção.', '🗳️', 'politica', 'ativa', 1, 1, 'sensivel', -0.3, -0.3, { democracia: 0.05, 'ind:igualdade_genero': 0.3, 'ind:participacao_forca_trabalho': 0.2 }),
  r('conselho_juventude', 'Conselho da Juventude', 'Assento jovem nas políticas públicas.', '🧑‍🎓', 'politica', 'ativa', 1, 1, 'normal', -0.3, -0.3, { democracia: 0.03, 'ind:igualdade_genero': 0.4, 'ind:crime_juvenil': -0.3 }, (c) => (c.idadeMedia > 34 ? 'Requer população jovem significativa.' : null)),
  r('antenna_federal', 'Sistema Único de Segurança', 'Integra polícias em nível nacional.', '🚔', 'politica', 'ativa', 1, 1, 'sensivel', -0.2, 0.5, { 'ind:crime_juvenil': -0.6, 'ind:integridade_territorial': 0.2, infamia: 0.2, aprovacao: 0.2 }),
  r('terra_indigena', 'Proteção de Territórios Indígenas', 'Reconhece e protege territórios tradicionais.', '🌳', 'politica', 'ativa', 1, 2, 'inconstitucional', -0.5, -0.6, { emissaoCo2: -0.6, 'ind:tensao_racial': -0.4, aprovacao: 0.2, 'ind:agricultura_privada': -0.3 }),
  r('reforma_terra', 'Reforma Agrária Moderada', 'Distribui terras improdutivas a pequenos agricultores.', '🧑‍🌾', 'politica', 'ativa', 1, 3, 'inconstitucional', -0.7, 0.1, { gini: -0.015, 'ind:agricultura_privada': 0.3, 'ind:preco_alimentos_idx': -0.2, aprovacao: 0.3 }),
  r('quota_genero', 'Cotas de Gênero na Política', 'Paridade nas listas eleitorais.', '♀️', 'politica', 'ativa', 1, 1, 'sensivel', -0.4, -0.6, { democracia: 0.05, 'ind:igualdade_genero': 1.0, 'ind:desenvolvimento_humano': 0.3 }),
  r('transparente', 'Lei de Acesso à Informação', 'Dados públicos abertos e prestação de contas.', '🔍', 'politica', 'ativa', 1, 1, 'normal', 0, -0.3, { democracia: 0.06, infamia: -0.6, 'ind:burocracia': -0.5, 'ind:aprovacao_partido': 0.4 }, (c) => (c.democracia < 0.3 ? 'Regimes fechados resistem à transparência.' : null)),
  r('estado_laico', 'Exposição Laica do Estado', 'Separa Estado de igrejas nas escolas e símbolos.', '🚫⛪', 'politica', 'ativa', 1, 2, 'inconstitucional', 0.1, -0.5, { democracia: 0.06, 'ind:igualdade_genero': 0.6, felicidade: 0.1, aprovacao: -0.3 }, (c) => (c.religiosidade > 0.8 ? 'Alta religiosidade torna inviável no momento.' : null)),
  r('federa_cultural', 'Sistema Federal de Cultura', 'Financia arte, cinema e patrimônio pelo país.', '🎭', 'politica', 'ativa', 1, 1, 'normal', -0.3, -0.4, { felicidade: 0.4, 'ind:desenvolvimento_humano': 0.3, 'ind:viagem_aerea': 0.3, gastoPct: 0.2 }, (c) => (REFEC(c, 'qualidade_infra') < 20 ? 'Requer estrutura cultural básica.' : null)),
  r('leis_drogas', 'Regulação de Drogas Leves', 'Política de redução de danos e regulação.', '🌿', 'politica', 'ativa', 1, 1, 'inconstitucional', -0.2, -0.7, { receitaPct: 0.2, 'ind:crime_juvenil': -0.5, 'ind:saude_mental': 0.3, 'ind:consumo_drogas_legais': 0.5, 'ind:consumo_alcool': -0.4 }),
  r('controle_armas2', 'Desarmamento Civil', 'Restringe posse de armas de fogo.', '🔫', 'politica', 'ativa', 1, 1, 'sensivel', -0.1, -0.5, { 'ind:crime_juvenil': -0.6, 'ind:tensao_racial': -0.3, aprovacao: 0.2 }),
  r('pena_excl', 'Prisão para Crimes de Colarinho Branco', 'Coloca executivos corruptos na cadeia.', '⛓️', 'politica', 'ativa', 1, 1, 'normal', -0.5, 0.3, { infamia: -0.5, 'ind:burocracia': -0.3, aprovacao: 0.5, 'ind:tensao_racial': -0.2 }),
  r('rne_unica', 'Documento de Identidade Único', 'Cidadania digital para todos.', '🪪', 'politica', 'ativa', 1, 1, 'normal', 0.1, 0, { 'ind:burocracia': -0.8, 'ind:participacao_forca_trabalho': 0.2, 'ind:velocidade_internet': 0.2 }),
  r('federalismo', 'Pacto Federativo Equilibrado', 'Repasses e autonomia equilibrados às regiões.', '🏛️', 'politica', 'ativa', 1, 2, 'normal', 0, 0, { estabilidade: 0.5, 'ind:aprovacao_partido': 0.3, 'ind:qualidade_infra': 0.3 }, (c) => (c.populacao < 12 ? 'Requer estrutura federativa relevante.' : null)),
  r('progressista_total', 'Modernização do Mercado de Trabalho', 'Flexibiliza e digitaliza relações de emprego.', '💼', 'politica', 'ativa', 1, 2, 'sensivel', 0.4, -0.1, { crescimento: 0.15, desemprego: -0.15, 'ind:produtividade': 0.4, 'ind:agitacao_trabalhista': -0.3 }),
  r('pacto_edu', 'Pacto Nacional pela Educação', 'Currículo, professores e tecnologia nas escolas.', '📚', 'politica', 'ativa', 1, 1, 'normal', -0.3, -0.3, { gastoPct: 0.3, educacaoIdx: 0.02, 'ind:graduados_universitarios': 0.5, 'ind:desenvolvimento_humano': 0.4 }, (c) => (c.educacaoIdx > 0.85 ? 'Requer defasagem educacional a enfrentar.' : null)),
  r('barra_midiatica', 'Conteúdo Jornalístico Público', 'Fomenta imprensa independente e regional.', '📡', 'politica', 'ativa', 1, 1, 'normal', -0.1, -0.4, { democracia: 0.05, felicidade: 0.2, 'ind:consumo_alcool': -0.2, 'ind:tensao_racial': -0.2 }, (c) => (c.democracia < 0.4 ? 'Regimes autoritários limitam a mídia.' : null)),
  r('cartao_plano', 'Plano Diretor Urbano', 'Ordena as cidades com mobilidade e cobertura.', '🏙️', 'politica', 'ativa', 1, 1, 'normal', 0, 0, { 'ind:congestionamento': -0.4, 'ind:moradia_privada': 0.3, 'ind:densidade_urbana': 0.2, felicidade: 0.2 }),
  r('saneamento_terra', 'Catastro e Regularização Fundiária', 'Dá título de terra ao povo.', '🗺️', 'politica', 'ativa', 1, 1, 'normal', 0.1, 0.1, { gini: -0.01, 'ind:agricultura_privada': 0.3, 'ind:pobreza': -0.3, 'ind:atividade_construcao': 0.2 }),
  r('escuta_popular', 'Orçamento Participativo', 'Cidadãos escolhem prioridades de gasto.', '🗣️', 'politica', 'ativa', 1, 1, 'sensivel', -0.5, -0.4, { democracia: 0.07, aprovacao: 0.4, 'ind:aprovacao_partido': 0.3, 'ind:orfaos_menores': -0.3 }),
  r('resiliencia_clim', 'Plano de Resiliência Climática', 'Adapta costas e cidades ao clima extremo.', '🏝️', 'politica', 'ativa', 1, 1, 'sensivel', -0.2, -0.5, { gastoPct: 0.3, 'ind:custo_vida': -0.2, 'ind:qualidade_infra': 0.3, 'ind:agricultura_privada': 0.2 }),
  r('fomento_social_tech', 'Cidadania Digital', 'Inclui toda a população no governo online.', '📱', 'politica', 'ativa', 1, 1, 'normal', 0, -0.2, { 'ind:velocidade_internet': 0.3, 'ind:burocracia': -0.4, 'ind:igualdade_genero': 0.4 }, (c) => (REFEC(c, 'velocidade_internet') < 20 ? 'Requer conectividade básica.' : null)),
  r('jud_especial', 'Juizados de Conciliação', 'Resolve pequenas causas sem varas demoradas.', '🧑‍⚖️', 'politica', 'ativa', 1, 1, 'normal', 0, 0, { 'ind:burocracia': -0.3, aprovacao: 0.3, 'ind:aprovacao_partido': 0.2, felicidade: 0.2 }),
  r('juventude_paz', 'Programa Jovem no Trilho', 'Educação técnica para jovens em áreas de risco.', '🛤️', 'politica', 'ativa', 1, 1, 'normal', -0.4, -0.2, { gastoPct: 0.35, desemprego: -0.15, 'ind:crime_juvenil': -0.8, 'ind:saude_mental': 0.3 }, (c) => (REFEC(c, 'crime_juvenil') < 30 ? 'Requer demanda social relevante.' : null)),
  r('internacional', 'Diplomacia de Cúpula', 'Atuação ativa em organismos multilaterais.', '🌍', 'politica', 'ativa', 1, 1, 'normal', 0.1, -0.2, { prestige: 1.5, 'ind:relacoes_exteriores': 0.5, 'ind:ajuda_estrangeira': 0.3, 'ind:exportacoes_estrangeiras': 0.3 }),
  r('obs_transicao', 'Plano de Demografia Ativa', 'Políticas para envelhecimento e feracidade.', '🧓', 'politica', 'ativa', 1, 1, 'normal', -0.3, 0, { gastoPct: 0.3, 'ind:participacao_forca_trabalho': 0.5, 'ind:demanda_saude': 0.4, 'ind:pensoes_privadas': 0.3 }, (c) => (c.idadeMedia < 30 ? 'Requer população envelhecendo.' : null)),
  r('cultura_digital', 'Incentivo à Indústria Criativa', 'Game dev, cinema e música digital.', '🎮', 'politica', 'ativa', 1, 1, 'normal', -0.1, -0.4, { crescimento: 0.08, 'ind:exportacoes_estrangeiras': 0.4, 'ind:produtividade': 0.2, felicidade: 0.3 }, (c) => (REFEC(c, 'velocidade_internet') < 25 ? 'Requer infraestrutura digital básica.' : null)),

  r('incentivo_corporativo', 'Incentivo ao Imposto Corporativo', 'Empresas que segurarem os preços, produzirem mais, pagarem melhores salários e contratarem acumulam descontos na alíquota corporativa efetiva, em troca de reduzir o desemprego e a inflação.', '🏢', 'receita', 'ativa', 1, 2, 'normal', -0.1, 0, {}, { nome: 'Alíquota corporativa original', unidade: '%', min: 0.5, max: 45, passo: 0.5, padrao: 21 }),
];

export const CATALOGO: NormaDef[] = [..._SLIDERS, ..._ALTERNADORES, ..._LEIS, ..._REFORMAS];

const POR_CHAVE = new Map<string, NormaDef>();
for (const n of CATALOGO) POR_CHAVE.set(n.chave, n);

export const norma = (chave: string): NormaDef | undefined => POR_CHAVE.get(chave);

export const normas = (componente: NormaDef['componente']): NormaDef[] => CATALOGO.filter((n) => n.componente === componente);
export const sliders = (): NormaDef[] => normas('slider');
export const alternadores = (): NormaDef[] => normas('alternador');
export const leisEnumeradas = (): NormaDef[] => normas('lei');
export const reformas = (): NormaDef[] => normas('reforma');

// ------------------------- Projeções legadas (somente leitura) -------------------------
// Formas antigas derivadas do catálogo para UI/AI/tests sem duplicação de definição.

export interface SliderMeta {
  key: PolicyKey;
  nome: string;
  desc: string;
  emoji: string;
  min: number;
  max: number;
  step: number;
  unidade: NormaValorEscala['unidade'];
  bloco: CategoriaNorma;
}

export const POLICY_DEFS: SliderMeta[] = sliders().map((e) => {
  const v = e.valor as NormaValorEscala;
  return { key: e.chave as PolicyKey, nome: e.nome, desc: e.desc, emoji: e.emoji, min: v.dominio.min, max: v.dominio.max, step: v.dominio.passo, unidade: v.unidade, bloco: e.categoria };
});

export interface ToggleMeta {
  key: ToggleKey;
  nome: string;
  desc: string;
  emoji: string;
}

export const TOGGLE_DEFS: ToggleMeta[] = alternadores().map((e) => ({ key: e.chave as ToggleKey, nome: e.nome, desc: e.desc, emoji: e.emoji }));

export interface LeiMeta {
  id: LeisId;
  nome: string;
  grupo: string;
  opcoes: { nome: string; desc: string }[];
}

export const LEIS_DEFS: LeiMeta[] = leisEnumeradas().map((e) => {
  const v = e.valor as NormaValorLei;
  return { id: e.chave as LeisId, nome: e.nome, grupo: e.desc, opcoes: v.opcoes.map((o) => ({ nome: o.nome, desc: o.desc })) };
});

export const LEIS_MAP: Record<string, LeiMeta> = Object.fromEntries(LEIS_DEFS.map((l) => [l.id, l]));

export interface ReformaMeta {
  id: string;
  nome: string;
  desc: string;
  emoji: string;
  bloco: CategoriaNorma;
  tipo: 'ativa' | 'empilhavel';
  max?: number;
  custo?: number;
  sensibilidade?: Sensibilidade;
  ideo: { econ: number; social: number };
  efeito: Record<string, number>;
  cond?: (c: Country, stacks: number) => string | null;
  parametro?: ParametroReforma;
}

export const REFORMAS: ReformaMeta[] = reformas().map((e) => {
  const v = e.valor as NormaValorReforma;
  const meta: ReformaMeta = {
    id: e.chave, nome: e.nome, desc: e.desc, emoji: e.emoji, bloco: e.categoria,
    tipo: v.tipo,
    ideo: e.perfilIdeologico ?? { econ: 0, social: 0 },
    efeito: e.efeitos ?? {},
    cond: e.cond,
  };
  if (v.maxPilhas > 1 || v.tipo === 'empilhavel') meta.max = v.maxPilhas;
  if (v.custo !== 1) meta.custo = v.custo;
  if (v.sensibilidade !== 'normal') meta.sensibilidade = v.sensibilidade;
  if (v.parametro) meta.parametro = v.parametro;
  return meta;
});

export const REFORMAS_MAP: Record<string, ReformaMeta> = Object.fromEntries(REFORMAS.map((r) => [r.id, r]));