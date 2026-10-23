export interface Ideology {
  econ: number;
  social: number;
}

export type RegimeType = 'democracia' | 'híbrido' | 'autoritário';

/** Origem de um processo de dissolução do Estado. */
export type OrigemDissolucao = 'popular' | 'governo';

/** Processo de transição ativo antes da abolição do Estado. */
export interface Dissolucao {
  origem: OrigemDissolucao;
  /** 0..100 — avanço do processo; aos 100 o Estado é abolido. */
  progresso: number;
  apoioPopular: number;
  apoioInstituicoes: number;
  meses: number;
}

/** Destino das forças armadas após a abolição do Estado. */
export type OrgMilitar = 'desmobilizada' | 'comunitaria' | 'local' | 'fragmentada';

/** Estado pós-estatal: o território opera sem Estado central. */
export interface PosEstado {
  desde: number; // turno (mesesPoder do World) da abolição
  orgMilitar: OrgMilitar;
}

export type ResourceKind = 'petroleo' | 'gas' | 'minerais' | 'alimento' | 'nenhum';

export interface Sectores {
  agricultura: number;
  industria: number;
  servicos: number;
}

export type PolicyKey =
  | 'renda'
  | 'corporativo'
  | 'bemEstar'
  | 'saude'
  | 'educacao'
  | 'militar'
  | 'infraestrutura'
  | 'pesquisa'
  | 'comercio'
  | 'tarifas'
  | 'imigracao'
  | 'verde'
  | 'leiOrdem'
  | 'renovaveis'
  | 'juros';

export type ToggleKey =
  | 'drogaLegal'
  | 'controleArmas'
  | 'penaMorte'
  | 'conscricao'
  | 'ambicaoNuclear'
  | 'bancosPublicos'
  | 'censura';

export type ReformaTipo = 'ativa' | 'empilhavel';
export type Sensibilidade = 'normal' | 'sensivel' | 'inconstitucional';
export type BlocoPolitica = 'receita' | 'gasto' | 'economia' | 'politica';
export type ReformaId = string;

export interface ReformaDef {
  id: ReformaId;
  nome: string;
  desc: string;
  emoji: string;
  bloco: BlocoPolitica;
  tipo: ReformaTipo;
  max?: number;
  custo?: number;
  sensibilidade?: Sensibilidade;
  ideo: Ideology;
  efeito: Record<string, number>;
  cond?: (c: Country, stacks: number) => string | null;
}

export type TipoProposta = 'slider' | 'toggle' | 'reforma';

/** Voto individual de uma cadeira (parlamentar ou ministro). */
export type VotoNaCadeira = 'favor' | 'contra' | 'abstencao' | 'ausente';

export interface VotoCadeira {
  partidoId: string;
  cor: string;
  nome?: string;
  voto: VotoNaCadeira;
}

/** Fase da tramitação legislativa de uma proposta. */
export type FaseProposta = 'camara' | 'senado' | 'sancao' | 'revisao' | 'fim';

export interface Proposta {
  id: string;
  tipo: TipoProposta;
  politica?: PolicyKey;
  valorAlvo?: number;
  toggle?: ToggleKey;
  reforma?: ReformaId;
  delta?: number;
  /** Parâmetro escolhido para reformas com alíquota configurável (ex.: IVA, carbono). */
  param?: number;
  meses: number;
  etapa: 'legislativo' | 'judicial';
  origem: 'jogador' | 'ia';
  fase?: FaseProposta;
  /** Turno absoluto em que a votação da fase atual ocorre. Existe quando `fase` é camara/senado/revisao. */
  votoEm?: number;
  /** Votos das cadeiras do parlamento (última votação legislativa). */
  votos?: VotoCadeira[];
  /** Votos dos ministros do tribunal (revisão judicial). */
  votosJud?: VotoCadeira[];
  sancao?: 'pendente' | 'sancionada' | 'vetada' | 'vetoDerrotado';
  cerimonia?: boolean;
  articuladoLeg?: boolean;
  articuladoJud?: boolean;
}

export interface Policies {
  renda: number;
  corporativo: number;
  bemEstar: number;
  saude: number;
  educacao: number;
  militar: number;
  infraestrutura: number;
  pesquisa: number;
  comercio: number;
  tarifas: number;
  imigracao: number;
  verde: number;
  leiOrdem: number;
  renovaveis: number;
  juros: number;
}

/**
 * Programa de incentivo ao imposto corporativo (`reformas.incentivo_corporativo`).
 * O jogador define metas de desconto; o desconto efetivo é conquistado conforme os
 * empreendedores adotam boas práticas (preços, oferta, salários, emprego).
 */
export interface CorpIncentivo {
  /** Metas de desconto (p.p.) por boa prática, definidas pelo jogador (0..inc.desconto.max). */
  descontos: { precos: number; oferta: number; salarios: number; emprego: number };
  /** Desconto efetivamente concedido no mês (p.p.), proporcional à realização. */
  desconto: number;
  /** Alíquota corporativa efetiva do mês (%), já líquida do desconto concedido. */
  efetiva: number;
  /** Fração realizada (0..1) de cada boa prática, derivada dos indicadores do mês anterior. */
  realizado: { precos: number; oferta: number; salarios: number; emprego: number };
  /** Referência capturada na ativação, usada para premiar a melhora das práticas de atividade. */
  base?: { precos: number; oferta: number; salarios: number; emprego: number };
}

export interface Toggles {
  drogaLegal: boolean;
  controleArmas: boolean;
  penaMorte: boolean;
  conscricao: boolean;
  ambicaoNuclear: boolean;
  bancosPublicos: boolean;
  censura: boolean;
}

export interface Party {
  id: string;
  name: string;
  color: string;
  ideology: Ideology;
  traits: string[];
  baseSupport: number;
  support: number;
  ruling: boolean;
  seats: number;
  fundos: number;
  reformismo: number;
  aprovaPartido: number;
}

export interface Militar {
  ativo: number;
  reserva: number;
  orcamento: number;
  tecnologia: number;
  prontidao: number;
  nuclear: boolean;
}

export type SistemaExecutivo = 'presidencial' | 'parlamentar' | 'semipresidencial';
export type SistemaEleitoral = 'majoritario' | 'proporcional' | 'misto' | 'uninominal';

export interface Governo {
  modeloId: string;
  sistema: SistemaExecutivo;
  eleitoral: SistemaEleitoral;
  mandatoMeses: number;
  reeleicao: boolean;
  bicameral: boolean;
  corte: number;
  corteLider: number;
  cadeiras: Record<string, number>;
  cadeirasTotal: number;
  coalizao: string[];
  apoioLegislativo: number;
  aprovacaoJudiciario: number;
  conflitoPoderes: number;
  censuraPendenteMeses: number;
  delegacao: number;
  referendosUsados: number;
}

export interface Orcamento {
  receitaTributaria: number;
  receitaNaoTributaria: number;
  receitaTotal: number;

  obrigatorias: number;
  previdencia: number;
  salarios: number;
  beneficios: number;
  transferencias: number;
  pisoSaude: number;
  pisoEduc: number;

  discricionarias: number;
  discSaude: number;
  discEduc: number;
  discInfra: number;
  discPesquisa: number;
  discDefesa: number;
  discSeguranca: number;
  discVerde: number;
  discObras: number;
  discEspaco: number;

  financeiras: number;
  juros: number;
  amortizacao: number;

  /** Aporte mensal ao fundo soberano (% PIB · ano). */
  fundoAporte: number;
  /** Dividendos mensais recebidos do fundo soberano (% PIB · ano). */
  fundoDividendo: number;

  total: number;
  primario: number;
  resultado: number;
  riscoFiscal: boolean;
  regraOuro: boolean;
  corteRegra: number;
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  regiao: string;
  lat: number;
  lon: number;
  iso: number;
  populacao: number;
  urbano: number;
  idadeMedia: number;
  fertilidade: number;
  forcaTrabalho: number;
  expectativaVida: number;
  gdp: number;
  crescimento: number;
  inflacao: number;
  desemprego: number;
  desempregoNatural: number;
  gini: number;
  dividaPct: number;
  setores: Sectores;
  recurso: ResourceKind;
  indiceRecurso: number;
  abertura: number;
  educacaoIdx: number;
  saudeIdx: number;
  infraestrutura: number;
  felicidade: number;
  religiosidade: number;
  regime: RegimeType;
  democracia: number;
  ideologia: Ideology;
  expansionista: boolean;
  lider: string;
  partidos: Party[];
  aprovacao: number;
  estabilidade: number;
  politica: Policies;
  alternadores: Toggles;
  militar: Militar;
  receitaPct: number;
  gastoPct: number;
  deficitPct: number;
  jurosPagos: number;
  orcamento: Orcamento;
  proximaEleicao: number;
  semEleiçoes: number;
  reeleicao: number;
  opinioesGrupos: Record<string, number>;
  prestigio: Record<string, number>;
  apoioGrupo: Record<string, number>;
  tensao: number;
  guerra: boolean;
  perdasGuerra: number;
  historico: HistoryPoint[];
  pops: Pops;
  pesquisa: Pesquisa;
  leis: Leis;
  infamia: number;
  prestige: number;
  aprovComp: AprovComp;
  governo: Governo;
  indicadores: Record<string, number>;
  rawInd: Record<string, number>;
  sectoresDet: Record<string, number>;
  emissaoCo2: number;
  reformas: Record<string, number>;
  reformasInd: Record<string, number>;
  /** Alíquotas efetivas de impostos criados por reformas com parâmetro (reforma id → valor). */
  impostos?: Record<string, number>;
  /** Programa de incentivo ao imposto corporativo (quando `incentivo_corporativo` está em vigor). */
  corpIncentivo?: CorpIncentivo;
  /** Valor (US$ bi) em ações detidas pelo fundo soberano. */
  fundoValor?: number;
  propostas: Proposta[];
  construcoes: Record<ConstrucaoId, number>;
  funcionariosMil: number;
  pesquisaInvest: Record<PesquisaKey, number>;
  programasEspaciais: ProgramaEspacial[];
  /** Pressão pela dissolução do Estado (0..100). */
  pressaoDissol: number;
  /** Cooldown (meses) após um gatilho de crise de dissolução. */
  cooldownDissol: number;
  dissolucao: Dissolucao | null;
  posEstado: PosEstado | null;
}

export interface HistoryPoint {
  m: string;
  gdp: number;
  crescimento: number;
  inflacao: number;
  desemprego: number;
  aprovacao: number;
  divida: number;
  gini: number;
}

export interface War {
  id: string;
  nome: string;
  atacante: string;
  defensor: string;
  motivo: string;
  mes: number;
  poderAt: number;
  poderDef: number;
  progresso: number;
  exaustao: Record<string, number>;
  baixas: Record<string, number>;
}

export interface News {
  mes: string;
  texto: string;
  tom: 'bom' | 'ruim' | 'neutro';
  pais?: string;
}

export interface Alliance {
  id: string;
  nome: string;
  cor: string;
  descricao: string;
}

export interface PopDiv {
  baixa: number;
  media: number;
  alta: number;
}

export interface Pops {
  sol: number;
  alfabetizacao: number;
  radicalizacao: number;
  lealismo: number;
  migracaoLiquida: number;
}

export type PesquisaKey = 'militar' | 'industrial' | 'social' | 'espacial';

export type Pesquisa = Record<PesquisaKey, number>;

/** Obra pública construível (lista de ids catalogada em engine/data/public.ts). */
export type ConstrucaoId =
  | 'hospital'
  | 'posto'
  | 'escola'
  | 'universidade'
  | 'rodovia'
  | 'ferrovia'
  | 'aeroporto'
  | 'porto'
  | 'metro'
  | 'hidreletrica'
  | 'termoeletrica'
  | 'usina_solar'
  | 'usina_eolica'
  | 'usina_nuclear'
  | 'saneamento'
  | 'presidio'
  | 'estadio'
  | 'telecom'
  | 'datacenter'
  | 'defesa';

export type ProgramaTipo = 'orbital' | 'lunar' | 'interplanetario';

export interface ProgramaEspacial {
  id: string;
  nome: string;
  tipo: ProgramaTipo;
  custo: number; // custo total do programa em % do PIB
  investido: number; // % do PIB já investida
  progresso: number; // 0..100 (porcentagem concluída)
  concluido: boolean;
  mesInicio: number;
}

export type PlanetaTipo =
  | 'rochoso'
  | 'gelado'
  | 'gasoso'
  | 'oceano'
  | 'deserto'
  | 'vulcanico'
  | 'anomalo';

export type SistemaTipo = 'amarela' | 'vermelha' | 'azul' | 'nebulosa' | 'buraco' | 'gemini';

export interface RecursoEspacial {
  metais: number;
  cristais: number;
  agua: number;
  gases: number;
  energia: number;
}

export interface Planeta {
  id: string;
  nome: string;
  tipo: PlanetaTipo;
  raio: number;
  gravidade: number;
  habitabilidade: number; // -60..100 (negativo = precisa de terraformação)
  recursos: RecursoEspacial;
  luas: number;
  aneis: boolean;
  explorado: boolean;
  sondado: boolean;
  anomalia: string | null;
  artefato: boolean;
  coloniaId: string | null;
  /** Textura procedural (data URL) gerada e persistida no save. */
  textura: string;
}

export type EspacoModo = 'nacional' | 'bloco' | 'terra';

export interface SistemaEstelar {
  id: string;
  nome: string;
  tipo: SistemaTipo;
  x: number;
  y: number;
  z: number;
  cor: string;
  raio: number;
  planetas: Planeta[];
  revelado: boolean;
  visitado: boolean;
  descobertoEm?: number;
}

export interface ColoniaEspacial {
  id: string;
  nome: string;
  sistemaId: string;
  planetaId: string;
  dono: string;
  populacao: number; // milhares
  fase: 'base' | 'permanente' | 'cidade' | 'mundo';
  autossuficiencia: number; // 0..100
  mesFundacao: number;
  empregos: number;
}

export interface Espaco {
  sistemas: SistemaEstelar[];
  colonias: ColoniaEspacial[];
  explorando: { sistemaId: string; fimTurno: number }[];
  sondando: { planetaId: string; fimTurno: number }[];
  faixa: number; // raio explorável (unidades de mapa)
  descobrimentos: number;
  mutador: number;
}

export type LeisId =
  | 'sufragio'
  | 'executivo'
  | 'economia'
  | 'servicos'
  | 'igreja'
  | 'midia'
  | 'cidadania'
  | 'terra'
  | 'policia';

export type Leis = Record<LeisId, number>;

export type TratadoTipo =
  | 'alianca'
  | 'nao_agressao'
  | 'comercio'
  | 'acesso_militar'
  | 'ajuda_militar';

export interface Tratado {
  id: string;
  tipo: TratadoTipo;
  a: string;
  b: string;
  meses: number;
}

export interface Crise {
  id: string;
  a: string;
  b: string;
  tema: string;
  escalada: number;
  max: number;
}

export type EfeitoOp =
  | { t: 'aprovacao'; d: number }
  | { t: 'estabilidade'; d: number }
  | { t: 'felicidade'; d: number }
  | { t: 'infamia'; d: number }
  | { t: 'gdp'; d: number }
  | { t: 'radical'; d: number }
  | { t: 'prestigio'; d: number }
  | { t: 'treasury'; d: number }
  | { t: 'relacao'; alvo: string; d: number }
  | { t: 'guerra'; alvo: string }
  | { t: 'lei'; lei: LeisId; opcao: number }
  | { t: 'pesquisa'; campo: PesquisaKey; d: number }
  | { t: 'midia' }
  | { t: 'fim'; motivo: string }
  | { t: 'democracia'; d: number }
  | { t: 'dissolver' };

export interface DecisaoOpcao {
  label: string;
  efeitos: EfeitoOp[];
}

export interface Decisao {
  id: string;
  titulo: string;
  texto: string;
  paisId: string;
  alvo?: string;
  opcoes: DecisaoOpcao[];
}

export interface AprovComp {
  economia: number;
  seguranca: number;
  direitos: number;
  prestigio: number;
}

export interface MercadoGood {
  preco: number;
  oferta: number;
  demanda: number;
}

export interface World {
  ano: number;
  mes: number;
  turno: number;
  jogadorId: string;
  paises: Record<string, Country>;
  relacoes: Record<string, Record<string, number>>;
  guerras: War[];
  aliancas: Record<string, string[]>;
  noticias: News[];
  precoOleo: number;
  precoAlimento: number;
  crescimentoGlobal: number;
  tensaoGlobal: number;
  clima: number;
  historico: HistoryPoint[];
  gameOver: boolean;
  motivoFim: string;
  mesesPoder: number;
  tratados: Tratado[];
  crises: Crise[];
  decisao: Decisao | null;
  mercado: Record<string, MercadoGood>;
  indGlobal: Record<string, number>;
  espaco: Espaco;
}