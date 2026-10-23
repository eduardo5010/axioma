import { Country, World, Decisao, OrigemDissolucao } from './types';
import { clamp, drifta, semECD } from './util';
import { notifica } from './data/events';

/** Estado atual do território do ponto de vista da abolição. */
export const estadoAtual = (c: Country): 'existente' | 'dissolucao' | 'pos_estado' =>
  c.posEstado ? 'pos_estado' : c.dissolucao ? 'dissolucao' : 'existente';

const ind = (c: Country, k: string, def = 50) => c.indicadores?.[k] ?? def;

/** Pressão popular pela abolição do Estado (0..100). */
export function pressaoDissolucao(c: Country): number {
  const radical = c.pops.radicalizacao ?? 25;
  const estab = c.estabilidade ?? 50;
  const aprov = c.aprovacao ?? 0;
  const legit = c.governo?.apoioLegislativo ?? 50;
  const integ = ind(c, 'integridade_territorial');
  const crime = ind(c, 'crime_juvenil');
  const p =
    clamp(radical, 0, 100) * 0.42 +
    clamp(100 - estab, 0, 130) * 0.16 +
    clamp(60 - aprov, 0, 160) * 0.2 +
    clamp(100 - legit, 0, 100) * 0.16 +
    clamp(100 - integ, 0, 100) * 0.14 +
    Math.max(0, crime - 55) * 0.2;
  return clamp(p, 0, 100);
}

/**
 * Condição para uma crise de dissolução se tornar possível.
 * Não é um gatilho automático: cada combinação exige o panorama certo.
 */
export function gatilhoPopular(c: Country): boolean {
  const rad = c.pops.radicalizacao ?? 0;
  const estab = c.estabilidade ?? 50;
  const aprov = c.aprovacao ?? 0;
  const integ = ind(c, 'integridade_territorial');
  if (rad >= 58 && estab <= 32) return true; // radicalização alta + instituições frágeis
  if (rad >= 64 && aprov <= -30 && integ <= 48) return true; // radicalização alta + ilegitimidade + território solto
  return false;
}

/** Condições para o próprio governo iniciar uma dissolução ordenada. */
export function podeDissolucaoInterna(c: Country): { ok: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const legit = c.governo?.apoioLegislativo ?? 0;
  if (legit < 40) motivos.push(`Legitimidade institucional baixa (${Math.round(legit)}%).`);
  if ((c.pops.radicalizacao ?? 0) > 60) motivos.push('Radicalização popular alta demais — a dissolução seria tomada como vitória das ruas.');
  if ((c.estabilidade ?? 0) < 20) motivos.push('Estabilidade social baixa — a transição arriscaria um colapso.');
  if (c.guerra) motivos.push('O território está em guerra — dissolver o Estado agora desorganizaria a defesa.');
  return { ok: motivos.length === 0, motivos };
}

/** Inicia um processo de dissolução do Estado. */
export function iniciaProcessoDissolucao(w: World, c: Country, origem: OrigemDissolucao): { ok: boolean; motivo?: string } {
  if (!c || c.posEstado || c.dissolucao) return { ok: false, motivo: 'Sem condições para iniciar a dissolução.' };
  const radical = c.pops.radicalizacao ?? 25;
  const aprov = c.aprovacao ?? 0;
  const apoioPopular =
    origem === 'governo'
      ? clamp(48 + aprov * 0.3 + radical * 0.15, 5, 95)
      : clamp(38 + aprov * 0.3 + radical * 0.35, 5, 98);
  const apoioInstituicoes =
    origem === 'governo'
      ? clamp(58 + (c.governo?.apoioLegislativo ?? 50) * 0.2 + (c.governo?.aprovacaoJudiciario ?? 50) * 0.1, 8, 96)
      : clamp(30 + (c.governo?.apoioLegislativo ?? 50) * 0.15, 8, 92);
  c.dissolucao = { origem, progresso: 1, apoioPopular, apoioInstituicoes, meses: 0 };
  c.cooldownDissol = 0;
  notifica(
    w,
    origem === 'governo'
      ? `🏛️ ${c.name}: o governo inicia uma dissolução ordenada do Estado. Assembleias e instituições preparam a transição.`
      : `✊ ${c.name}: sob forte pressão popular, começa o processo de dissolução do Estado.`,
    'ruim',
    c.id,
  );
  return { ok: true };
}

/** Abole o Estado de vez e reconfigura o território para o modo pós-estatal. */
export function concluirDissolucao(c: Country, w: World): void {
  if (!c.dissolucao) return;
  const origem = c.dissolucao.origem;
  const radical = c.pops.radicalizacao ?? 30;
  const inst = c.dissolucao.apoioInstituicoes;
  const orgMilitar =
    radical > 62 ? 'fragmentada' : origem === 'governo' && inst >= 45 ? 'comunitaria' : inst < 40 ? 'local' : 'desmobilizada';
  c.posEstado = { desde: w.turno, orgMilitar };
  c.dissolucao = null;
  c.pressaoDissol = 8;
  c.cooldownDissol = 0;
  c.regime = 'autoritário';
  c.politica = {
    ...c.politica,
    renda: 1,
    corporativo: 1,
    bemEstar: 30,
    militar: 1,
    leiOrdem: 20,
    juros: 5,
  };
  c.leis = { ...c.leis, sufragio: 2, executivo: 0, economia: 0, servicos: 0, policia: 0, midia: 0, cidadania: 2, terra: 1 };
  c.dividaPct = Math.min(c.dividaPct, 12);
  c.militar.ativo = Math.round(c.militar.ativo * 0.35);
  c.militar.reserva = Math.round(c.militar.reserva * 0.3);
  c.militar.orcamento = 0;
  c.democracia = clamp(c.democracia, 0.55, 0.95);
  c.aprovacao = clamp(c.aprovacao * 0.3 + 45, -10, 95);
  c.estabilidade = clamp(c.estabilidade * 0.5 + 35, 0, 100);
  c.pops.radicalizacao = clamp((c.pops.radicalizacao ?? 30) * 0.7, 5, 85);
  const orgTexto: Record<string, string> = {
    desmobilizada: 'As forças armadas foram desmobilizadas e integradas às comunidades.',
    comunitaria: 'As forças armadas se reorganizaram como milícias comunitárias de defesa mútua.',
    local: 'Núcleos locais de defesa assumiram o controle por região.',
    fragmentada: 'Forças armadas fragmentadas — grupos armados disputam influência regional.',
  };
  notifica(w, `🌎 ${c.name}: o Estado foi abolido. O território passa a se organizar de forma descentralizada. ${orgTexto[orgMilitar]}`, 'neutro', c.id);
}

/** Cria a decisão de Crise de Dissolução do Estado para o jogador. */
export function criaCriseDissolucao(c: Country): Decisao {
  const pressao = Math.round(pressaoDissolucao(c));
  return {
    id: semECD(),
    titulo: 'Crise de Dissolução do Estado',
    texto: `A pressão popular pela abolição do Estado atingiu ${pressao}%. Assembleias de bairro, movimentos de base e setores da sociedade cobram uma resposta. A estabilidade institucional está em jogo.`,
    paisId: c.id,
    opcoes: [
      { label: 'Aceitar e iniciar a dissolução ✊', efeitos: [{ t: 'dissolver' }, { t: 'aprovacao', d: 10 }, { t: 'radical', d: -12 }, { t: 'estabilidade', d: -3 }, { t: 'infamia', d: -4 }] },
      { label: 'Oferecer reformas profundas 🗳️', efeitos: [{ t: 'aprovacao', d: 8 }, { t: 'radical', d: -15 }, { t: 'estabilidade', d: 4 }, { t: 'democracia', d: 0.12 }, { t: 'lei', lei: 'sufragio', opcao: 2 }] },
      { label: 'Reprimir os movimentos 🚔', efeitos: [{ t: 'estabilidade', d: 12 }, { t: 'radical', d: -8 }, { t: 'aprovacao', d: -18 }, { t: 'infamia', d: 22 }, { t: 'relacao', alvo: 'usa', d: -8 }] },
      { label: 'Convoca-se um plebiscito 🗳️', efeitos: [{ t: 'radical', d: -6 }, { t: 'aprovacao', d: 2 }, { t: 'democracia', d: 0.06 }, { t: 'estabilidade', d: 1 }] },
    ],
  };
}

/**
 * Passo mensal da dissolução. Avança processos em andamento e,
 * para o jogador, pode deflagrar a Crise de Dissolução quando a pressão
 * cruza a condição de gatilho e o cooldown permite.
 */
export function passoDissolucao(c: Country, w: World): void {
  if (c.posEstado) return;
  const desejaCr = w.jogadorId === c.id;
  if (c.cooldownDissol > 0) c.cooldownDissol--;
  c.pressaoDissol = drifta(c.pressaoDissol ?? 30, pressaoDissolucao(c), 0.28);

  if (c.dissolucao) {
    const radical = c.pops.radicalizacao ?? 25;
    let dx = 1.2 + (c.dissolucao.apoioPopular - 55) * 0.03 + (c.dissolucao.apoioInstituicoes - 55) * 0.02;
    if (radical > 70) dx += 0.8;
    if (radical < 40) dx -= 0.5;
    dx = clamp(dx, 0.2, 5);
    c.dissolucao.progresso = clamp(c.dissolucao.progresso + dx, 0, 100);
    c.dissolucao.apoioPopular = clamp(
      drifta(c.dissolucao.apoioPopular, 40 + c.aprovacao * 0.35 + radical * 0.25, 0.2),
      3,
      98,
    );
    c.dissolucao.apoioInstituicoes = clamp(
      drifta(c.dissolucao.apoioInstituicoes, c.dissolucao.origem === 'governo' ? 50 + ind(c, 'integridade_territorial') * 0.1 : (c.governo?.apoioLegislativo ?? 50), 0.15),
      5,
      94,
    );
    c.dissolucao.meses++;
    if (c.dissolucao.progresso >= 100) {
      concluirDissolucao(c, w);
      return;
    }
    return;
  }

  const podeGatilho = gatilhoPopular(c);
  if (!desejaCr) {
    if (!podeGatilho) {
      if (c.pressaoDissol > 62 && Math.random() < 0.004) iniciaProcessoDissolucao(w, c, 'popular');
      else if (c.pressaoDissol > 70 && Math.random() < 0.0012) iniciaProcessoDissolucao(w, c, 'governo');
      return;
    }
    if (c.pressaoDissol > 70 && Math.random() < 0.025) iniciaProcessoDissolucao(w, c, 'popular');
    return;
  }

  if (podeGatilho && c.cooldownDissol <= 0 && !w.decisao) {
    const chance = 0.05 + c.pressaoDissol * 0.0008;
    if (Math.random() < chance) {
      w.decisao = criaCriseDissolucao(c);
      c.cooldownDissol = 36;
    }
  }
}

/* ---------------- Métricas derivadas do território pós-estatal ---------------- */

export interface DossiePos {
  coesao: number;
  autonomia: number;
  coordenacao: number;
  conflito: number;
  seguranca: number;
  desigualdade: number;
  infra: number;
  cooperacao: number;
  migracaoComunidades: number;
  disputasJuridicas: number;
  participacao: number;
  pluralidade: number;
  descentralizacao: number;
}

export function posEstadoDossie(c: Country): DossiePos {
  const radical = c.pops.radicalizacao ?? 25;
  const crime = ind(c, 'crime_juvenil');
  const tensao = ind(c, 'tensao_racial');
  const igualdade = ind(c, 'igualdade');
  const caridade = ind(c, 'caridade');
  const comercio = ind(c, 'comercio_domestico');
  const invest = ind(c, 'investimento_privado');
  const infraQ = ind(c, 'qualidade_infra');
  const pobreza = ind(c, 'pobreza');

  const coesao = clamp(
    50 +
      (c.felicidade - 50) * 0.45 +
      (igualdade - 50) * 0.35 +
      (caridade - 50) * 0.2 +
      (comercio - 50) * 0.15 -
      Math.max(0, radical - 40) * 0.35,
    2,
    98,
  );
  const participacao = clamp(40 + c.democracia * 40 + (integridade(c) - 50) * 0.3 + infraQ * 0.2, 2, 98);
  const autonomia = clamp(40 + c.democracia * 35 + (100 - radical) * 0.15 + infraQ * 0.15, 2, 98);
  const coordenacao = clamp(32 + (comercio - 50) * 0.3 + (invest - 50) * 0.25 + ind(c, 'relacoes_exteriores') * 0.2 + c.democracia * 22, 2, 98);
  const cooperacao = clamp((100 - Math.min(100, preg(c))) * 0.4 + igualdade * 0.3 + caridade * 0.3, 2, 98);
  const conflito = clamp(
    radical * 0.5 + Math.max(0, crime - 45) * 0.4 + Math.max(0, tensao - 45) * 0.3 + (100 - coesao) * 0.25 - c.felicidade * 0.08,
    0,
    100,
  );
  const seguranca = clamp(100 - conflito * 0.75 - Math.max(0, crime - 45) * 0.35 + c.infraestrutura * 0.15, 2, 98);
  const desigualdade = clamp(30 + Math.max(0, c.gini - 0.3) / 0.3 * 40 - coesao * 0.2 + Math.max(0, pobreza - 45) * 0.4, 2, 95);
  const infra = clamp((c.infraestrutura + infraQ) / 2, 2, 98);
  const migracaoComunidades = clamp((100 - coesao) * 0.7 + radical * 0.2 + Math.max(0, tensao - 45) * 0.3, 0, 100);
  const disputasJuridicas = clamp(conflito * 0.5 + radical * 0.3 + Math.max(0, tensao - 45) * 0.25, 0, 100);
  const pluralidade = clamp(40 + c.democracia * 40 + (c.leis?.cidadania ?? 1) * 12 + (c.leis?.terra ?? 1) * 8, 2, 98);
  return {
    coesao,
    autonomia,
    coordenacao,
    conflito,
    seguranca,
    desigualdade,
    infra,
    cooperacao,
    migracaoComunidades,
    disputasJuridicas,
    participacao,
    pluralidade,
    descentralizacao: 100,
  };
}

const integridade = (c: Country) => ind(c, 'integridade_territorial');

const preg = (c: Country) => ind(c, 'crime_juvenil');

/** Estabilidade Social no modo pós-estatal (coesão + segurança − conflito). */
export function estabilidadeSocial(c: Country): number {
  const d = posEstadoDossie(c);
  return clamp(d.coesao * 0.4 + (100 - d.conflito) * 0.3 + d.seguranca * 0.2 + c.crescimento * 3 - Math.max(0, c.inflacao - 4) * 0.15, -30, 100);
}

/** Barras da Organização Social pós-estatal. */
export function organizacaoSocial(c: Country): { nome: string; emoji: string; valor: number }[] {
  const d = posEstadoDossie(c);
  const med = (...v: number[]) => clamp(v.reduce((a, b) => a + b, 0) / v.length, 2, 98);
  return [
    { nome: 'Produção local', emoji: '🌾', valor: med(ind(c, 'comercio_domestico'), ind(c, 'setor_manufatura'), ind(c, 'agricultura_privada')) },
    { nome: 'Cooperativas', emoji: '🤝', valor: med(ind(c, 'igualdade'), ind(c, 'caridade'), (1 - c.gini) * 100) },
    { nome: 'Organização local', emoji: '🏘️', valor: med(d.autonomia, d.participacao, c.democracia * 100) },
    { nome: 'Redes de transporte', emoji: '⚡', valor: med(c.infraestrutura, ind(c, 'qualidade_infra'), ind(c, 'uso_trem')) },
    { nome: 'Redes de informação', emoji: '📶', valor: med(ind(c, 'velocidade_internet'), ind(c, 'inteligencia_artificial'), ind(c, 'industria_telecom')) },
  ];
}

/** Rotulo da evolução do território pós-estatal. */
export function evolucaoPos(c: Country): { rotulo: string; emoji: string; cor: string } {
  const d = posEstadoDossie(c);
  if (d.coordenacao >= 55 && d.coesao >= 55) return { rotulo: 'Descentralização estável', emoji: '🌳', cor: 'bom' };
  if (d.coordenacao >= 55) return { rotulo: 'Confederação informal', emoji: '🤝', cor: 'bom' };
  if (d.coordenacao < 45 && d.conflito >= 55) return { rotulo: 'Crise de governança', emoji: '🔥', cor: 'ruim' };
  if (d.coordenacao < 45) return { rotulo: 'Fragmentação', emoji: '🧩', cor: 'ruim' };
  return { rotulo: 'Coordenação emergente', emoji: '🌱', cor: 'neutro' };
}

/** Condições para as comunidades votarem a reconstituição do Estado. */
export function podeReconstituirGoverno(c: Country): { ok: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const d = posEstadoDossie(c);
  if (d.coesao < 50) motivos.push(`Coesão comunitária baixa (${Math.round(d.coesao)}%).`);
  if (d.coordenacao < 40) motivos.push(`Coordenação insuficiente (${Math.round(d.coordenacao)}%).`);
  if (d.conflito >= 50) motivos.push('Conflitos elevados — a transição exigiria trégua entre comunidades.');
  return { ok: motivos.length === 0, motivos };
}