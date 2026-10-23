import type { Country, Governo, World } from './types';
import { clamp, drifta } from './util';
import { MODELOS, modeloPadrao } from './data/modelos';
import { notifica } from './data/events';

export const iniciarGoverno = (c: Country): Governo => {
  const mod = modeloPadrao(c.id, c.democracia);
  const total = cadeirasTotalDe(c);
  const cadeiras = cadeirasPorSistema(c, mod.eleitoral, total);
  const coalizao = achaCoalizao(c, cadeiras, mod.sistema);
  const share = shareCadeiras(cadeiras, coalizao);
  const g: Governo = {
    modeloId: mod.id,
    sistema: mod.sistema,
    eleitoral: mod.eleitoral,
    mandatoMeses: mod.mandatoMeses,
    reeleicao: mod.reeleicao,
    bicameral: mod.bicameral,
    corte: mod.corte,
    corteLider: mod.corte * 0.7,
    cadeiras,
    cadeirasTotal: total,
    coalizao,
    apoioLegislativo: clamp(share * 120, 10, 100),
    aprovacaoJudiciario: clamp(mod.corte * 0.6 + c.democracia * 35, 5, 95),
    conflitoPoderes: 25,
    censuraPendenteMeses: 0,
    delegacao: c.democracia < 0.4 ? 0.9 : mod.sistema === 'parlamentar' ? 0.75 : 0.3,
    referendosUsados: 0,
  };
  return g;
};

export const cadeirasTotalDe = (c: Country): number => {
  const pop = c.populacao ?? 0;
  if (pop < 2) return 63;
  if (pop < 8) return 96;
  if (pop < 20) return 144;
  if (pop < 50) return 205;
  if (pop < 120) return 275;
  if (pop < 250) return 350;
  if (pop < 600) return 430;
  return 600;
};

export const cadeirasPorSistema = (c: Country, eleitoral: Governo['eleitoral'], total: number): Record<string, number> => {
  const apoio: Record<string, number> = {};
  for (const p of c.partidos) apoio[p.id] = clamp(p.support ?? 5, 0, 100);
  const soma = Object.values(apoio).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  const ruling = c.partidos.find((p) => p.ruling)?.id ?? c.partidos[0]?.id;
  const maioritario = eleitoral === 'majoritario' || eleitoral === 'uninominal';
  const capProp = Math.max(1, Math.round(total * 0.6));
  const capMaj = Math.max(1, Math.round(total * 0.85));
  let rest = total;
  for (const [pid, s] of Object.entries(apoio)) {
    let q: number;
    if (maioritario) {
      q = pid === ruling ? Math.round((0.62 + s * 0.002) * total) : Math.round((s / soma) * 0.35 * total);
    } else {
      q = Math.round((s / soma) * total);
    }
    q = Math.max(pid === ruling ? 1 : 0, Math.min(q, maioritario ? capMaj : capProp));
    if (q > rest) q = rest;
    out[pid] = q;
    rest -= q;
  }
  if (rest > 0 && ruling) out[ruling] += rest;
  return out;
};

export const achaCoalizao = (c: Country, cadeiras: Record<string, number>, sistema: Governo['sistema']): string[] => {
  const ruling = c.partidos.find((p) => p.ruling)?.id ?? c.partidos[0]?.id;
  const coal = [ruling];
  const total = Object.values(cadeiras).reduce((a, b) => a + b, 0) || 1;
  const share = (cadeiras[ruling] ?? 0) / total;
  if (share < 0.5 || sistema === 'parlamentar') {
    const amigos = c.partidos
      .filter((p) => !p.ruling)
      .sort((a, b) => {
        const da = Math.abs(a.ideology.econ - c.ideologia.econ) + Math.abs(a.ideology.social - c.ideologia.social);
        const db = Math.abs(b.ideology.econ - c.ideologia.econ) + Math.abs(b.ideology.social - c.ideologia.social);
        return da - db;
      });
    for (const am of amigos) {
      if (coal.includes(am.id)) continue;
      coal.push(am.id);
      const sh = coal.reduce((s, id) => s + (cadeiras[id] ?? 0), 0) / total;
      if (sh >= 0.5) break;
    }
  }
  return coal;
};

const shareCadeiras = (cadeiras: Record<string, number>, coalizao: string[]): number => {
  const total = Object.values(cadeiras).reduce((a, b) => a + b, 0) || 1;
  return clamp(coalizao.reduce((s, id) => s + (cadeiras[id] ?? 0), 0) / total, 0, 1);
};

export const passoGoverno = (c: Country, w: World): void => {
  const g = c.governo;
  if (!g) return;

  // --- Legislativo: cadeiras acompanham apoio dos partidos ---
  const novo = cadeirasPorSistema(c, g.eleitoral, g.cadeirasTotal);
  if (Math.random() < 0.3) g.cadeiras = novo;
  g.coalizao = achaCoalizao(c, g.cadeiras, g.sistema);
  const share = shareCadeiras(g.cadeiras, g.coalizao);
  const alvoApoio = clamp(
    share * 120 + (c.estabilidade / 25) - 10 + c.aprovacao * 0.12 + c.democracia * 10
      - Math.max(0, c.inflacao - 5) * 1.4
      - g.conflitoPoderes * 0.1,
    5, 100,
  );
  g.apoioLegislativo = drifta(g.apoioLegislativo, alvoApoio, 0.2);

  // --- Executivo ---
  if (c.democracia < 0.4) g.delegacao = drifta(g.delegacao, 0.9, 0.05);
  else if (g.sistema === 'parlamentar') g.delegacao = drifta(g.delegacao, 0.75, 0.04);
  else if (g.sistema === 'semipresidencial') g.delegacao = drifta(g.delegacao, 0.5, 0.04);
  else g.delegacao = drifta(g.delegacao, 0.3, 0.04);

  if (g.sistema === 'parlamentar') {
    if (g.apoioLegislativo < 32) {
      if (g.censuraPendenteMeses > 0) {
        g.censuraPendenteMeses--;
        if (g.censuraPendenteMeses <= 0) {
          c.aprovacao = clamp(c.aprovacao - 8, -100, 100);
          c.estabilidade = clamp(c.estabilidade - 8, -30, 100);
          notifica(w, `🪑 Moção de desconfiança: o primeiro-ministro de ${c.name} perde o apoio e o governo cai.`, 'ruim', c.id);
          notifica(w, `📣 ${c.name} se prepara para eleições antecipadas.`, 'neutro', c.id);
          c.proximaEleicao = Math.min(c.proximaEleicao ?? 12, 6);
          g.censuraPendenteMeses = 0;
        }
      } else if (Math.random() < 0.06) {
        g.censuraPendenteMeses = 2 + Math.floor(Math.random() * 3);
        notifica(w, `⚠️ A oposição em ${c.name} apresentou moção de desconfiança.`, 'ruim', c.id);
      }
    } else if (g.censuraPendenteMeses > 0 && g.apoioLegislativo >= 32) {
      g.censuraPendenteMeses = 0;
    }
  }

  // --- Judiciário ---
  const alvoCorte = clamp(
    c.democracia * 45 + (c.politica.leiOrdem / 5) + (100 - c.infamia) * 0.15
      - Math.max(0, (c.indicadores.crime_juvenil ?? 50) - 50) * 0.2
      - (c.regime === 'autoritário' ? 10 : 0),
    5, 95,
  );
  g.corte = drifta(g.corte, alvoCorte, 0.04);
  g.corteLider = drifta(g.corteLider, g.corte + (c.politica.leiOrdem / 4) - (c.infamia * 0.3), 0.08);
  const alvoJud = clamp(g.corte * 0.35 + c.democracia * 40 + (100 - c.infamia) * 0.15, 5, 95);
  g.aprovacaoJudiciario = drifta(g.aprovacaoJudiciario, alvoJud, 0.1);

  // Revisão judicial de leis autoritárias
  const sensivel =
    (c.leis.midia === 2 || c.leis.igreja === 2 || c.leis.policia === 2) && c.democracia > 0.4 && g.corte > 50;
  if (sensivel && Math.random() < 0.05) {
    if (c.leis.midia === 2) c.leis.midia = 0;
    else if (c.leis.igreja === 2) c.leis.igreja = 1;
    else if (c.leis.policia === 2) c.leis.policia = 1;
    g.conflitoPoderes = clamp(g.conflitoPoderes + 18, 0, 100);
    c.estabilidade = clamp(c.estabilidade - 5, -30, 100);
    notifica(w, `⚖️ O tribunal constitucional de ${c.name} derrubou uma lei por inconstitucionalidade.`, 'neutro', c.id);
  }

  // Conflito entre poderes
  g.conflitoPoderes = drifta(
    g.conflitoPoderes,
    20 + (100 - g.apoioLegislativo) * 0.3 - g.corte * 0.15 + g.delegacao * 18
      + (c.leis.midia === 2 ? 6 : 0) + (c.leis.policia === 2 ? 4 : 0)
      - Math.max(0, c.crescimento) * 0.5
      - c.democracia * 8,
    0.12,
  );
  if (g.conflitoPoderes > 78 && c.democracia > 0.35 && Math.random() < 0.03) {
    notifica(w, `🏛️ Crise institucional em ${c.name}: Executivo, Legislativo e Judiciário se enfrentam.`, 'ruim', c.id);
    c.estabilidade = clamp(c.estabilidade - 9, -30, 100);
    c.aprovacao = clamp(c.aprovacao - 4, -100, 100);
    g.conflitoPoderes = 45;
  }
  if (g.conflitoPoderes < 20) c.estabilidade = clamp(c.estabilidade + 1, -30, 100);
};

export const reformaInstitucional = (c: Country, w: World, modeloId: string): { ok: boolean; msg: string } => {
  const mod = MODELOS.find((m) => m.id === modeloId);
  if (!mod) return { ok: false, msg: 'Modelo desconhecido.' };
  if (c.estabilidade < 35) return { ok: false, msg: `Reforma constitucional precisa de estabilidade mínima (${Math.round(c.estabilidade)}).` };
  const g = c.governo;
  g.modeloId = mod.id;
  g.sistema = mod.sistema;
  g.eleitoral = mod.eleitoral;
  g.mandatoMeses = mod.mandatoMeses;
  g.reeleicao = mod.reeleicao;
  g.bicameral = mod.bicameral;
  g.corte = mod.corte;
  g.corteLider = mod.corte * 0.7;
  g.cadeiras = cadeirasPorSistema(c, mod.eleitoral, g.cadeirasTotal);
  g.coalizao = achaCoalizao(c, g.cadeiras, mod.sistema);
  g.apoioLegislativo = clamp(shareCadeiras(g.cadeiras, g.coalizao) * 120, 10, 100);
  c.proximaEleicao = Math.max(6, mod.mandatoMeses);
  c.democracia = clamp(drifta(c.democracia, mod.corte > 60 ? 0.8 : c.democracia, 0.3), 0.05, 0.95);
  c.semEleiçoes = c.proximaEleicao;
  c.estabilidade = clamp(c.estabilidade - 8, -30, 100);
  const alvoDem = mod.corte > 60 ? 0.02 : -0.01;
  c.democracia = clamp(c.democracia + alvoDem, 0.05, 0.95);
  notifica(w, `🧬 ${c.name} adota o modelo institucional: ${mod.nome} (inspirado em ${mod.paisOrigem}).`, 'neutro', c.id);
  return { ok: true, msg: `${mod.nome} adotado. Novas regras em vigor.` };
};

export const dissolverParlamento = (c: Country, w: World): boolean => {
  if (c.governo.sistema !== 'parlamentar') {
    notifica(w, `⛔ Dissolução só é possível em sistemas parlamentares.`, 'ruim', c.id);
    return false;
  }
  c.proximaEleicao = 6;
  c.semEleiçoes = 6;
  c.governo.censuraPendenteMeses = 0;
  c.aprovacao = clamp(c.aprovacao + 2, -100, 100);
  notifica(w, `📣 ${c.name} antecipa eleições gerais.`, 'neutro', c.id);
  return true;
};

export const pressionarCorte = (c: Country, w: World): void => {
  const g = c.governo;
  g.corte = clamp(g.corte - (c.democracia > 0.4 ? 5 : 12), 5, 95);
  g.conflitoPoderes = clamp(g.conflitoPoderes + 10, 0, 100);
  c.aprovacao = clamp(c.aprovacao - 2, -100, 100);
  notifica(w, `⚖️ O governo de ${c.name} pressiona o judiciário. Independência judicial em risco (${Math.round(g.corte)}).`, 'ruim', c.id);
};