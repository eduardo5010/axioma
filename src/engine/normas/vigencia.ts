import type { Country, Party, LeisId, PolicyKey, Proposta, ToggleKey, VotoCadeira, VotoNaCadeira, World } from '../types';
import type { NormaDef, NormaValorEscala, NormaValorReforma } from './tipos';
import { clamp, fmtNum, semECD } from '../util';
import { par, parMapNum, parRanges } from './registro';
import { LEIS_MAP, norma } from '../data/normas/catalogo';
import { nomeLocal } from '../data/normas/local';
import { notifica } from '../data/events';
import { distanciaIdeologica } from '../data/groups';

// ============================================================
// VIGÊNCIA — Motor de tramitação e aplicação de NORMAS
// Define UMA vez o pipeline pelo qual qualquer norma sai do papel
// e vira realidade, lendo o Catálogo (definições) e o Registro
// Central (parâmetros e fórmulas). O comportamento é idêntico à
// versão legada, apenas parametrizado.
// ============================================================

const normaReforma = (chave: string): NormaDef & NormaValorReforma | undefined => {
  const n = norma(chave);
  if (!n || n.componente !== 'reforma') return undefined;
  return { ...n, ...(n.valor as NormaValorReforma) } as NormaDef & NormaValorReforma;
};

// Nomes curtos e definidos usados nas notificações de alternadores.
const NOME_ALTERNADOR: Record<string, string> = {
  drogaLegal: 'drogas leves', controleArmas: 'o controle de armas', penaMorte: 'a pena de morte',
  conscricao: 'a conscrição militar', ambicaoNuclear: 'o programa nuclear',
  bancosPublicos: 'os bancos públicos', censura: 'a censura à imprensa',
};

const posicaoProposta = (c: Country, p: Proposta): [number, number] => {
  if (p.tipo === 'reforma' && p.reforma) {
    const def = normaReforma(p.reforma);
    if (def) return [def.perfilIdeologico?.econ ?? 0, def.perfilIdeologico?.social ?? 0];
    return [0, 0];
  }
  const chave = (p.politica ?? p.toggle) as string;
  const base = norma(chave)?.perfilIdeologico ?? { econ: 0, social: 0 };
  if (p.tipo === 'slider') {
    const atual = c.politica[p.politica as PolicyKey] as number;
    const d = (p.valorAlvo ?? atual) >= atual ? 1 : -1;
    return [base.econ * d, base.social * d];
  }
  const d = (p.delta ?? 1) > 0 ? 1 : -1;
  return [base.econ * d, base.social * d];
};

/** Fração de voto favorável de um partido a uma posição ideológica (parâmetros `apoio.*`). */
export const favorPartido = (c: Country, partido: Party, e: number, s: number): number => {
  const dist = distanciaIdeologica(partido.ideology, { econ: e, social: s });
  let f = dist < par('apoio.perto') ? par('apoio.perto.voto') : dist < par('apoio.medio') ? par('apoio.medio.voto') : dist < par('apoio.longe') ? par('apoio.longe.voto') : par('apoio.fora.voto');
  if (partido.ruling) f = Math.min(1, f + par('apoio.ruling'));
  return clamp(f + (partido.reformismo - 50) / 100 * par('apoio.reformismo'), 0, 1);
};

/** Apoio partidário esperado para uma posição ideológica (parâmetros `apoio.*`). */
export const apoioPartidario = (c: Country, e: number, s: number): number => {
  const g = c.governo;
  const cadeiras = g?.cadeiras ?? {};
  const total = Object.values(cadeiras).reduce((a, b) => a + b, 0) || 1;
  let sim = 0;
  for (const p of c.partidos) {
    const w = cadeiras[p.id] ?? p.support;
    sim += w * favorPartido(c, p, e, s);
  }
  return clamp(sim / total, 0, 1);
};

export const viabilidadeLegislativa = (c: Country, p: Proposta): number => {
  const g = c.governo;
  if (!g) return 1;
  const [e, s] = posicaoProposta(c, p);
  let b: number;
  if (c.regime === 'autoritário') b = par('legisl.base.autoritario') + g.delegacao * par('legisl.peso.deleg.autor');
  else if (c.regime === 'híbrido') b = par('legisl.base.hibrido') + (g.apoioLegislativo / 100) * par('legisl.peso.leg.hib') + g.delegacao * par('legisl.peso.deleg.hib');
  else b = par('legisl.base.democracia') + (g.apoioLegislativo / 100) * par('legisl.peso.leg.dem') + apoioPartidario(c, e, s) * par('legisl.peso.partido.dem') + g.delegacao * par('legisl.peso.deleg.dem');
  if (p.tipo === 'reforma' && p.reforma) {
    const def = normaReforma(p.reforma);
    if (def) {
      b -= Math.max(0, def.custo - 1) * par('legisl.pen.custo');
      if (def.sensibilidade === 'sensivel') b -= par('legisl.pen.sensivel');
      if (def.sensibilidade === 'inconstitucional') b -= par('legisl.pen.inconstitucional');
      if (def.categoria === 'politica') b -= par('legisl.pen.blocoPolitica');
    }
  }
  if (p.tipo === 'toggle') b -= par('legisl.pen.toggle');
  return clamp(b, par('legisl.clamp.min'), par('legisl.clamp.max'));
};

export const viabilidadeJudicial = (c: Country, p: Proposta): number => {
  const g = c.governo;
  if (!g) return 1;
  let b = par('jud.base') + (g.corte / 100) * par('jud.peso.corte') + c.democracia * par('jud.peso.democracia') + (g.aprovacaoJudiciario / 100) * par('jud.peso.aprovJud');
  if (c.regime === 'autoritário') b += par('jud.bonus.autoritario');
  else if (c.regime === 'híbrido') b += par('jud.bonus.hibrido');
  const dureza = clamp((g.corte - par('jud.dureza.meio')) / par('jud.dureza.tamanho'), 0, 1);
  if (p.tipo === 'reforma' && p.reforma) {
    const def = normaReforma(p.reforma);
    if (def) {
      if (def.sensibilidade === 'sensivel') b -= par('jud.pen.sensivel') * dureza;
      if (def.sensibilidade === 'inconstitucional') b -= par('jud.pen.inconstitucional') * dureza;
    }
  }
  return clamp(b, par('jud.clamp.min'), par('jud.clamp.max'));
};

const mesesLeg = (c: Country, p: Proposta): number => {
  if (c.regime === 'autoritário') return par('meses.leg.autor');
  if (p.tipo !== 'reforma' || !p.reforma) return par('meses.leg.naoReforma');
  const custo = normaReforma(p.reforma)?.custo ?? 1;
  return c.regime === 'híbrido' ? par('meses.leg.hibCap') + Math.min(1, custo - 1) : custo;
};

const mesesJud = (c: Country, p: Proposta): number =>
  (c.regime === 'autoritário' ? par('meses.jud.autor') : par('meses.jud.outros')) + (p.reforma && normaReforma(p.reforma)?.sensibilidade === 'inconstitucional' ? par('meses.jud.bonusInconst') : 0);

const gateNome = (c: Country, etapa: Proposta['etapa']): string => {
  if (c.regime === 'autoritário') {
    return etapa === 'legislativo' ? 'a assembleia controlada' : 'o tribunal subordinado';
  }
  if (c.regime === 'híbrido') {
    return etapa === 'legislativo' ? 'o parlamento' : 'o judiciário';
  }
  return etapa === 'legislativo' ? 'o parlamento' : 'o tribunal constitucional';
};

const mesesSenado = (c: Country): number => (c.regime === 'autoritário' ? par('meses.leg.autor') : par('meses.senado'));

/** Programação inicial/mêszero de uma proposta: entra na câmara com data de votação. */
const programa = (w: World, c: Country, p: Proposta): void => {
  p.fase = 'camara';
  p.etapa = 'legislativo';
  p.meses = 0;
  p.cerimonia = false;
  p.sancao = undefined;
  p.votos = undefined;
  p.votosJud = undefined;
  p.articuladoLeg = false;
  p.articuladoJud = false;
  p.votoEm = w.turno + mesesLeg(c, p);
};

/** Nome curto da medida para notificações de tramitação. */
export const nomeMedida = (c: Country, p: Proposta): string => {
  if (p.tipo === 'reforma' && p.reforma) {
    const d = normaReforma(p.reforma);
    if (!d) return p.reforma;
    const nome = `${d.emoji} ${nomeLocal(c.id, p.reforma, { nome: d.nome, desc: d.desc }).nome}`;
    if (d.parametro && p.param !== undefined) return `${nome} (alíquota ${fmtNum(p.param, 2)}${d.parametro.unidade})`;
    return nome;
  }
  if (p.tipo === 'slider' && p.politica) {
    const m = metaDe(p.politica);
    return `ajuste de ${nomeLocal(c.id, p.politica, { nome: m?.nome ?? p.politica }).nome} para ${Math.round(p.valorAlvo ?? c.politica[p.politica])}`;
  }
  if (p.tipo === 'toggle' && p.toggle) {
    return `${(p.delta ?? 1) > 0 ? 'ativar' : 'revogar'} ${NOME_ALTERNADOR[p.toggle] ?? nomeLocal(c.id, p.toggle, { nome: norma(p.toggle)?.nome ?? p.toggle }).nome}`;
  }
  return 'proposta';
};

const metaDe = (k: PolicyKey): NormaDef & NormaValorEscala | undefined => {
  const n = norma(k);
  if (!n || n.componente !== 'slider') return undefined;
  return { ...n, ...(n.valor as NormaValorEscala) } as NormaDef & NormaValorEscala;
};

const juros: PolicyKey = 'juros';

export const propoeSlider = (w: World, c: Country, k: PolicyKey, alvo: number, silencioso = false): void => {
  const meta = metaDe(k);
  const alvoC = clamp(alvo, meta?.dominio.min ?? 0, meta?.dominio.max ?? 100);
  if (meta?.gate === 'imediato') {
    c.politica[juros] = alvoC;
    return;
  }
  const atual = c.politica[k] as number;
  const pendente = c.propostas.find((p) => p.tipo === 'slider' && p.politica === k);
  if (Math.abs(alvoC - atual) < 0.25 && Math.abs(alvoC - (pendente?.valorAlvo ?? atual)) < 0.25) {
    if (pendente) cancelarProposta(c, pendente.id);
    return;
  }
  if (pendente) {
    pendente.valorAlvo = alvoC;
    programa(w, c, pendente);
    return;
  }
  const nova: Proposta = {
    id: semECD(), tipo: 'slider', politica: k, valorAlvo: alvoC, delta: 0,
    meses: 0, etapa: 'legislativo', origem: c.id === w.jogadorId ? 'jogador' : 'ia',
  };
  programa(w, c, nova);
  c.propostas.push(nova);
  if (c.id === w.jogadorId && !silencioso) {
    notifica(w, `🧾 Proposta enviada a ${gateNome(c, 'legislativo')}: ajuste de ${nomeLocal(c.id, k, { nome: meta?.nome ?? k }).nome} → ${Math.round(alvoC)}.`, 'neutro', c.id);
  }
};

export const propoeToggle = (w: World, c: Country, k: ToggleKey, ligado: boolean): void => {
  const existente = c.propostas.find((p) => p.tipo === 'toggle' && p.toggle === k);
  if (existente) {
    existente.delta = ligado ? 1 : -1;
    programa(w, c, existente);
    return;
  }
  const nova: Proposta = {
    id: semECD(), tipo: 'toggle', toggle: k, delta: ligado ? 1 : -1,
    meses: 0, etapa: 'legislativo', origem: c.id === w.jogadorId ? 'jogador' : 'ia',
  };
  programa(w, c, nova);
  c.propostas.push(nova);
  if (c.id === w.jogadorId) {
    const nome = NOME_ALTERNADOR[k] ?? nomeLocal(c.id, k, { nome: norma(k)?.nome ?? k }).nome;
    notifica(w, `🧾 Proposta enviada a ${gateNome(c, 'legislativo')}: ${ligado ? 'ativar' : 'revogar'} ${nome}.`, 'neutro', c.id);
  }
};

export const propoeReforma = (w: World, c: Country, rid: string, delta: number, param?: number): { ok: boolean; motivo?: string } => {
  const def = normaReforma(rid);
  if (!def) return { ok: false, motivo: 'Reforma desconhecida.' };
  const stacks = c.reformas[rid] ?? 0;
  const temParam = !!def.parametro;
  if (delta > 0) {
    if (def.tipo === 'ativa' && stacks > 0 && !temParam) return { ok: false, motivo: 'Essa reforma já está em vigor.' };
    if (stacks >= def.maxPilhas && !(temParam && stacks > 0)) return { ok: false, motivo: 'Limite de pilhas atingido.' };
  } else {
    if (stacks <= 0) return { ok: false, motivo: 'Não há reforma ativa para revogar.' };
  }
  if (def.cond) {
    const motivo = def.cond(c, stacks + delta);
    if (motivo) return { ok: false, motivo };
  }
  const pv = def.parametro ? clamp(param ?? def.parametro.padrao, def.parametro.min, def.parametro.max) : undefined;
  const existente = c.propostas.find((p) => p.tipo === 'reforma' && p.reforma === rid);
  if (existente) {
    existente.delta = delta;
    if (pv !== undefined) existente.param = pv;
    programa(w, c, existente);
    return { ok: true };
  }
  const nova: Proposta = {
    id: semECD(), tipo: 'reforma', reforma: rid, delta,
    ...(pv !== undefined ? { param: pv } : {}),
    meses: 0, etapa: 'legislativo', origem: c.id === w.jogadorId ? 'jogador' : 'ia',
  };
  programa(w, c, nova);
  c.propostas.push(nova);
  if (c.id === w.jogadorId) {
    const verbo = temParam && stacks > 0 && delta > 0
      ? `redefinir alíquota${pv !== undefined ? ` para ${fmtNum(pv, 2)}${def.parametro!.unidade}` : ''}`
      : delta > 0 ? 'adotar' : 'revogar';
    notifica(w, `🧾 Vai a ${gateNome(c, 'legislativo')}: ${def.emoji} ${nomeLocal(c.id, rid, { nome: def.nome, desc: def.desc }).nome} (${verbo}).`, 'neutro', c.id);
  }
  return { ok: true };
};

export const cancelarProposta = (c: Country, id: string): void => {
  c.propostas = c.propostas.filter((p) => p.id !== id);
};

/** Revogação do fundo soberano: vende as posições e abate a dívida com o líquido. */
const liquidaFundoSoberano = (w: World, c: Country): void => {
  const valor = c.fundoValor ?? 0;
  if (valor <= 0) return;
  const liquido = valor * (1 - par('fundo.venda.custo'));
  const queda = (liquido / Math.max(par('gdp.min'), c.gdp)) * 100;
  c.fundoValor = 0;
  c.dividaPct = clamp(c.dividaPct - queda, 0, 350);
  if (c.id === w.jogadorId) {
    notifica(w, `🏦 Fundo soberano desmontado em ${c.name}: US$ ${fmtNum(valor, 0)} bi em ações vendidas; dívida abatida ${fmtNum(queda, 1)} p.p.`, 'neutro', c.id);
  }
};

export const aplicarProposta = (w: World, c: Country, p: Proposta): void => {
  if (p.tipo === 'slider' && p.politica) {
    const meta = metaDe(p.politica);
    c.politica[p.politica] = clamp(p.valorAlvo ?? c.politica[p.politica], meta?.dominio.min ?? 0, meta?.dominio.max ?? 100);
    return;
  }
  if (p.tipo === 'toggle' && p.toggle) {
    const ligado = (p.delta ?? 1) > 0;
    c.alternadores[p.toggle] = ligado;
    if (p.toggle === 'ambicaoNuclear' && ligado) {
      w.tensaoGlobal += 8;
      for (const b of Object.keys(w.relacoes[c.id] ?? {})) {
        const alvo = w.paises[b];
        if (alvo && (alvo.democracia > 0.6 || alvo.militar.nuclear)) {
          const d = -8 - Math.floor(Math.random() * 10);
          w.relacoes[c.id][b] = Math.max(-100, (w.relacoes[c.id][b] ?? 0) + d);
          w.relacoes[b][c.id] = w.relacoes[c.id][b];
        }
      }
      notifica(w, `☢️ ${c.name} oficializa o projeto de bomba atômica. Alarme global.`, 'ruim', c.id);
    }
    return;
  }
  if (p.tipo === 'reforma' && p.reforma) {
    const def = normaReforma(p.reforma);
    if (!def) return;
    const atual = (c.reformas[p.reforma] ?? 0) + (p.delta ?? 0);
    c.reformas[p.reforma] = clamp(atual, 0, def.maxPilhas);
    if (def.parametro) {
      const imp = c.impostos ?? (c.impostos = {});
      if ((p.delta ?? 0) < 0) delete imp[p.reforma];
      else if (p.param !== undefined) imp[p.reforma] = clamp(p.param, def.parametro.min, def.parametro.max);
    }
    if (p.reforma === 'fundo_soberano' && (p.delta ?? 0) < 0) liquidaFundoSoberano(w, c);
    for (const [k, v] of Object.entries(def.efeitos ?? {})) {
      if (k === 'democracia') {
        c.democracia = clamp(c.democracia + v * (p.delta ?? 0), 0.03, 0.97);
      } else if (k.startsWith('politica:')) {
        const pk = k.slice('politica:'.length);
        const meta = metaDe(pk as PolicyKey);
        const cur = c.politica[pk as PolicyKey] as number;
        c.politica[pk as PolicyKey] = clamp(cur + v * (p.delta ?? 0), meta?.dominio.min ?? 0, meta?.dominio.max ?? 100);
      }
    }
    if (c.id === w.jogadorId || (p.origem === 'ia' && Math.random() < 0.4)) {
      const nome = def.parametro && p.param !== undefined
        ? `${nomeLocal(c.id, p.reforma, { nome: def.nome, desc: def.desc }).nome} (alíquota ${fmtNum(p.param, 2)}${def.parametro.unidade})`
        : nomeLocal(c.id, p.reforma, { nome: def.nome, desc: def.desc }).nome;
      notifica(w, `${def.emoji} ${p.delta! > 0 ? 'Aprovada' : 'Revogada'} em ${c.name}: ${nome}.`, 'bom', c.id);
    }
  }
};

const rejeitar = (w: World, c: Country, p: Proposta): void => {
  const nome = p.tipo === 'reforma' && p.reforma
    ? (() => { const d = normaReforma(p.reforma); return d ? nomeLocal(c.id, p.reforma, { nome: d.nome, desc: d.desc }).nome : 'Reforma'; })()
    : p.tipo === 'slider' ? 'Mudança na política' : 'Mudança legislativa';
  if (c.id === w.jogadorId || (p.tipo === 'reforma' && Math.random() < 0.5)) {
    notifica(w, `🪑 ${nome} rejeitada ${p.etapa === 'legislativo' ? 'pelo legislativo' : 'pelo judiciário'} em ${c.name}.`, 'ruim', c.id);
  }
  if (c.regime === 'democracia') {
    c.aprovacao = clamp(c.aprovacao + (p.origem === 'jogador' ? par('rej.dem.aprovJogador') : par('rej.dem.aprovIA')), -100, 100);
  }
  c.estabilidade = clamp(c.estabilidade + (p.origem === 'jogador' ? par('rej.estabJogador') : par('rej.estabIA')), -30, 100);
};

// ---------------- Votação plenária (cerimônia) ----------------

const precisaSancao = (c: Country): boolean =>
  c.governo?.sistema === 'presidencial' || c.governo?.sistema === 'semipresidencial';

const precisaRevisao = (): boolean => true;

interface Apuracao { favor: number; contra: number; abstencao: number; ausente: number }

const apuracao = (votos: VotoCadeira[] | undefined): Apuracao => {
  const v: Apuracao = { favor: 0, contra: 0, abstencao: 0, ausente: 0 };
  for (const x of votos ?? []) v[x.voto]++;
  return v;
};

const passouPlenario = (v: Apuracao): boolean => v.favor > v.contra;

/** Votos das cadeiras do parlamento, uma por cadeira, decididos cadeira a cadeira. */
const computaVotosLeg = (c: Country, p: Proposta): VotoCadeira[] => {
  const g = c.governo;
  if (!g) return [];
  const [e, s] = posicaoProposta(c, p);
  const aus = par('cer.ausente');
  const abs = par('cer.abstencao');
  const bonus = p.articuladoLeg ? par('artic.leg.favor') : 0;
  const lista: VotoCadeira[] = [];
  for (const partido of c.partidos) {
    const n = g.cadeiras[partido.id] ?? 0;
    if (n <= 0) continue;
    const f = clamp(favorPartido(c, partido, e, s) + bonus, 0, 1);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const voto: VotoNaCadeira = r < aus ? 'ausente' : r < aus + abs ? 'abstencao' : r < aus + abs + f ? 'favor' : 'contra';
      lista.push({ partidoId: partido.id, cor: partido.color, nome: partido.name, voto });
    }
  }
  return lista;
};

/** Votos dos ministros do tribunal constitucional. */
const computaVotosJud = (c: Country, p: Proposta): VotoCadeira[] => {
  const n = Math.max(3, Math.round(par('jud.membros')));
  const f = clamp(viabilidadeJudicial(c, p) + (p.articuladoJud ? par('artic.jud.favor') : 0), 0.04, 0.99);
  const aus = par('cer.ausente') * 0.4;
  const abs = par('cer.abstencao') * 0.5;
  const lista: VotoCadeira[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const voto: VotoNaCadeira = r < aus ? 'ausente' : r < aus + abs ? 'abstencao' : r < aus + abs + f ? 'favor' : 'contra';
    lista.push({ partidoId: 'corte', cor: '#a78bfa', nome: `Ministro(a) ${i + 1}`, voto });
  }
  return lista;
};

/** Promulga a proposta aprovada em todas as fases e notifica. */
const aprovarFinal = (w: World, c: Country, p: Proposta): void => {
  aplicarProposta(w, c, p);
  const san = p.sancao === 'sancionada' ? ', sancionada pelo executivo' : p.sancao === 'vetoDerrotado' ? ' (veto do executivo derrubado)' : '';
  const jud = p.votosJud ? ' e constitucional no tribunal' : '';
  notifica(w, `✅ ${nomeMedida(c, p)} aprovada${jud}${san} em ${c.name}.`, 'bom', c.id);
};

const rejeitarFase = (w: World, c: Country, p: Proposta, etapa: Proposta['etapa']): void => {
  p.etapa = etapa;
  rejeitar(w, c, p);
};

/** Agenda a próxima fase após o plenário aprovar (sem sanção decisória do jogador). Retorna true se promulgada. */
const agendaPosLegislativo = (w: World, c: Country, p: Proposta): boolean => {
  if (precisaRevisao()) {
    p.fase = 'revisao';
    p.etapa = 'judicial';
    p.meses = 0;
    p.votoEm = w.turno + mesesJud(c, p);
    p.cerimonia = false;
    return false;
  }
  p.fase = 'fim';
  p.cerimonia = false;
  aprovarFinal(w, c, p);
  return true;
};

/** Pós-sanção (após sancionar, ou veto derrubado). Retorna true se promulgada. */
const seguirAposSancao = (w: World, c: Country, p: Proposta): boolean => {
  p.cerimonia = false;
  return agendaPosLegislativo(w, c, p);
};

export const passoPropostas = (w: World): void => {
  const ids = Object.keys(w.paises);
  for (const id of ids) {
    const c = w.paises[id];
    if (!c || !c.propostas || c.propostas.length === 0) continue;
    const resolvidas: string[] = [];
    for (const p of c.propostas) {
      const fase = p.fase ?? 'camara';
      if (fase === 'fim') { resolvidas.push(p.id); continue; }
      p.meses++;
      if (fase === 'sancao') continue;
      if (w.turno < (p.votoEm ?? w.turno)) continue;
      if (fase === 'camara' || fase === 'senado') {
        p.votos = computaVotosLeg(c, p);
        const v = apuracao(p.votos);
        if (c.id === w.jogadorId) {
          p.cerimonia = true;
          continue;
        }
        if (!passouPlenario(v)) {
          rejeitarFase(w, c, p, 'legislativo');
          resolvidas.push(p.id);
          continue;
        }
        if (fase === 'camara' && c.governo?.bicameral) {
          p.fase = 'senado';
          p.etapa = 'legislativo';
          p.meses = 0;
          p.votoEm = w.turno + mesesSenado(c);
          p.cerimonia = false;
          continue;
        }
        if (precisaSancao(c)) {
          p.sancao = 'sancionada';
          if (seguirAposSancao(w, c, p)) resolvidas.push(p.id);
          continue;
        }
        if (agendaPosLegislativo(w, c, p)) resolvidas.push(p.id);
      } else if (fase === 'revisao') {
        p.votosJud = computaVotosJud(c, p);
        const v = apuracao(p.votosJud);
        if (c.id === w.jogadorId) {
          p.cerimonia = true;
          continue;
        }
        if (passouPlenario(v)) {
          aprovarFinal(w, c, p);
        } else {
          rejeitarFase(w, c, p, 'judicial');
        }
        resolvidas.push(p.id);
      }
    }
    if (resolvidas.length) {
      c.propostas = c.propostas.filter((p) => !resolvidas.includes(p.id));
    }
  }
};

/** Avança a tramitação depois que o jogador assiste à cerimônia de votação. */
export const concluirCerimonia = (w: World, c: Country, id: string): void => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p || p.fase === 'fim' || p.fase === 'sancao') return;
  if (p.fase === 'camara' || p.fase === 'senado') {
    const v = apuracao(p.votos);
    if (!passouPlenario(v)) {
      rejeitarFase(w, c, p, 'legislativo');
      c.propostas = c.propostas.filter((x) => x.id !== p.id);
      return;
    }
    if (p.fase === 'camara' && c.governo?.bicameral) {
      p.fase = 'senado';
      p.etapa = 'legislativo';
      p.meses = 0;
      p.votoEm = w.turno + mesesSenado(c);
      p.cerimonia = false;
      p.votos = undefined;
      return;
    }
    if (precisaSancao(c)) {
      p.fase = 'sancao';
      p.sancao = 'pendente';
      p.etapa = 'legislativo';
      p.cerimonia = true;
      return;
    }
    p.cerimonia = false;
    if (agendaPosLegislativo(w, c, p)) c.propostas = c.propostas.filter((x) => x.id !== p.id);
    return;
  }
  if (p.fase === 'revisao') {
    const v = apuracao(p.votosJud);
    if (passouPlenario(v)) {
      aprovarFinal(w, c, p);
    } else {
      rejeitarFase(w, c, p, 'judicial');
    }
    c.propostas = c.propostas.filter((x) => x.id !== p.id);
  }
};

/** Sanção pelo executivo (decisão do jogador na cerimônia). */
export const sancionarCerimonia = (w: World, c: Country, id: string): void => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p || p.fase !== 'sancao') return;
  p.sancao = 'sancionada';
  if (seguirAposSancao(w, c, p)) c.propostas = c.propostas.filter((x) => x.id !== p.id);
};

/** Veto pelo executivo; pode ser derrubado por supermaioria no legislativo. */
export const vetarCerimonia = (w: World, c: Country, id: string): void => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p || p.fase !== 'sancao') return;
  const v = apuracao(p.votos);
  const presentes = v.favor + v.contra;
  if (presentes > 0 && v.favor / presentes >= par('veto.override')) {
    p.sancao = 'vetoDerrotado';
    notifica(w, `🛡️ ${c.name}: veto ao ${nomeMedida(c, p)} derrubado pelo legislativo (${Math.round((v.favor / presentes) * 100)}% presentes).`, 'neutro', c.id);
    if (seguirAposSancao(w, c, p)) c.propostas = c.propostas.filter((x) => x.id !== p.id);
    return;
  }
  p.sancao = 'vetada';
  p.fase = 'fim';
  notifica(w, `🖊️ ${c.lider} veta ${nomeMedida(c, p)}. O legislativo não alcança 2/3 para derrubar o veto.`, 'ruim', c.id);
  c.propostas = c.propostas.filter((x) => x.id !== p.id);
};

/** Articulação do executivo com o legislativo antes da votação. */
export const articularLegislativo = (w: World, c: Country, id: string): { ok: boolean; motivo?: string } => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p) return { ok: false, motivo: 'Proposta não encontrada.' };
  if (p.cerimonia) return { ok: false, motivo: 'A votação já em andamento — articule antes dela começar.' };
  if (p.fase !== 'camara' && p.fase !== 'senado') return { ok: false, motivo: 'Articulação legislativa só antes da votação no parlamento.' };
  if (p.articuladoLeg) return { ok: false, motivo: 'Você já articulou apoio no legislativo este rascunho.' };
  p.articuladoLeg = true;
  c.aprovacao = clamp(c.aprovacao + par('artic.leg.custoAp'), -100, 100);
  notifica(w, `🤝 Executivo de ${c.name} articula apoio no parlamento para ${nomeMedida(c, p)}.`, 'neutro', c.id);
  return { ok: true };
};

/** Articulação do executivo com o judiciário (antes da revisão constitucional). */
export const articularJudiciario = (w: World, c: Country, id: string): { ok: boolean; motivo?: string } => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p) return { ok: false, motivo: 'Proposta não encontrada.' };
  if (p.cerimonia) return { ok: false, motivo: 'A votação já em andamento — articule antes dela começar.' };
  if (p.fase === 'fim' || p.fase === 'sancao') return { ok: false, motivo: 'Articulação com o judiciário não é possível nesta fase.' };
  if (p.articuladoJud) return { ok: false, motivo: 'Você já articulou com o judiciário.' };
  p.articuladoJud = true;
  c.aprovacao = clamp(c.aprovacao + par('artic.jud.custoAp'), -100, 100);
  c.governo.conflitoPoderes = clamp(c.governo.conflitoPoderes + par('artic.jud.conflito'), 0, 100);
  notifica(w, `⚖️ Executivo de ${c.name} pressiona o tribunal em favor de ${nomeMedida(c, p)}.`, 'neutro', c.id);
  return { ok: true };
};

/** Recontagem "em plenário": articula com o poder da fase e recomputa os votos durante a cerimônia. */
export const recontarVotos = (w: World, c: Country, id: string): { ok: boolean; motivo?: string } => {
  const p = c.propostas.find((x) => x.id === id);
  if (!p) return { ok: false, motivo: 'Proposta não encontrada.' };
  if (!p.cerimonia) return { ok: false, motivo: 'Não há votação em andamento.' };
  if (p.fase === 'camara' || p.fase === 'senado') {
    if (p.articuladoLeg) return { ok: false, motivo: 'Você já articulou com o legislativo.' };
    p.articuladoLeg = true;
    c.aprovacao = clamp(c.aprovacao + par('artic.leg.custoAp'), -100, 100);
    notifica(w, `🤝 Executivo de ${c.name} mobiliza líderes em plenário para ${nomeMedida(c, p)}.`, 'neutro', c.id);
    p.votos = computaVotosLeg(c, p);
    return { ok: true };
  }
  if (p.fase === 'revisao') {
    if (p.articuladoJud) return { ok: false, motivo: 'Você já articulou com o judiciário.' };
    p.articuladoJud = true;
    c.aprovacao = clamp(c.aprovacao + par('artic.jud.custoAp'), -100, 100);
    c.governo.conflitoPoderes = clamp(c.governo.conflitoPoderes + par('artic.jud.conflito'), 0, 100);
    notifica(w, `⚖️ Executivo de ${c.name} negocia com ministros durante a sessão.`, 'neutro', c.id);
    p.votosJud = computaVotosJud(c, p);
    return { ok: true };
  }
  return { ok: false, motivo: 'Não há votação em andamento nesta fase.' };
};

/** Aprova imediatamente todas as propostas pendentes do país, sem tramitação nem votos (decreto executivo). Retorna quantas foram promulgadas. */
export const aprovarImediato = (w: World, c: Country): number => {
  const pendentes = c.propostas.filter((p) => p.fase !== 'fim');
  for (const p of pendentes) {
    aplicarProposta(w, c, p);
    p.fase = 'fim';
    p.cerimonia = false;
  }
  if (pendentes.length) {
    c.propostas = c.propostas.filter((p) => p.fase !== 'fim');
    notifica(w, `⚡ Por decreto imediato, ${pendentes.length} ${pendentes.length === 1 ? 'medida' : 'medidas'} entraram em vigor sem tramitar: ${pendentes.map((p) => nomeMedida(c, p)).join('; ')}.`, 'bom', c.id);
  }
  return pendentes.length;
};

// Limites e amortecimento dos efeitos diretos, derivados do Registro.
export const SCALAR_LIMITS = Object.fromEntries(Object.entries(parRanges('efeito.limites')).map(([k, v]) => [k, [v[0], v[1]]])) as Record<string, [number, number]>;
export const DAMP: Record<string, number> = parMapNum('efeito.damp');

export const aplicaEfeitosReformas = (c: Country): void => {
  for (const [rid, stacks] of Object.entries(c.reformas ?? {})) {
    const def = normaReforma(rid);
    if (!def || stacks <= 0) continue;
    const fator = def.parametro ? (c.impostos?.[rid] ?? def.parametro.padrao) / def.parametro.padrao : 1;
    for (const [k, v] of Object.entries(def.efeitos ?? {})) {
      if (k === 'democracia' || k.startsWith('politica:')) continue;
      const total = v * stacks * fator;
      if (k.startsWith('ind:')) {
        const id = k.slice(4);
        c.reformasInd[id] = (c.reformasInd[id] ?? 0) + total;
        continue;
      }
      const lim = SCALAR_LIMITS[k];
      if (!lim) continue;
      const damp = DAMP[k] ?? 1;
      c[k as keyof Country] = clamp((c[k as keyof Country] as number) + total * damp, lim[0], lim[1]) as never;
    }
  }
};

// ============================================================
// LEIS ENUMERADAS — pipeline próprio parametrizado (gate 'legislativo')
// Réplica de game.reformaLei, parametrizada por 'reformalei.*'.
// ============================================================
export const reformaLeiGenerica = (w: World, c: Country, lei: LeisId, opcao: number): void => {
  const def = LEIS_MAP[lei];
  if (!def || c.leis[lei] === opcao) return;
  const viabilidade = c.estabilidade / 100 * par('reformalei.viab.estabilidade') + c.democracia * par('reformalei.viab.democracia') + par('reformalei.viab.constante');
  if (Math.random() < viabilidade) {
    c.leis[lei] = opcao;
    notifica(w, `📜 Reforma aprovada: ${def.nome} → ${def.opcoes[opcao].nome}.`, 'bom', c.id);
  } else {
    c.estabilidade = clamp(c.estabilidade + par('reformalei.rej.estabilidade'), -30, 100);
    c.aprovacao = clamp(c.aprovacao + par('reformalei.rej.aprovacao'), -100, 100);
    notifica(w, `🪑 Reforma de ${def.nome.toLowerCase()} rejeitada pelo parlamento e pelos grupos de pressão.`, 'ruim', c.id);
  }
};