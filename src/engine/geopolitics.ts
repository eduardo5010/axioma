import type { Country, War, World, Tratado, TratadoTipo } from './types';
import { aliancaPorPais, membrosDa, partilhamAlianca } from './data/alliances';
import { clamp, desloca, drifta, rand, semECD } from './util';
import { notifica } from './data/events';

export const rel = (w: World, a: string, b: string): number => w.relacoes[a]?.[b] ?? 0;

export const ajustar = (w: World, a: string, b: string, delta: number) => {
  if (a === b) return;
  const d = clamp(rel(w, a, b) + delta, -100, 100);
  w.relacoes[a] = { ...(w.relacoes[a] ?? {}), [b]: d };
  w.relacoes[b] = { ...(w.relacoes[b] ?? {}), [a]: d };
};

export const tratadoEntre = (w: World, a: string, b: string): Tratado | undefined =>
  w.tratados.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));

export const temTratado = (w: World, a: string, b: string, tipo?: TratadoTipo): boolean => {
  const t = w.tratados.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (!t) return false;
  if (tipo) return t.tipo === tipo;
  return true;
};

const bonusTratado = (w: World, a: string, b: string): number => {
  let bonus = 0;
  if (temTratado(w, a, b, 'comercio')) bonus += 12;
  if (temTratado(w, a, b, 'alianca')) bonus += 30;
  if (temTratado(w, a, b, 'nao_agressao')) bonus += 15;
  if (temTratado(w, a, b, 'acesso_militar')) bonus += 8;
  if (temTratado(w, a, b, 'ajuda_militar')) bonus += 20;
  return bonus;
};

const alvoRelacao = (w: World, a: Country, b: Country): number => {
  let alvo = 0;
  const ideo = (Math.abs(a.ideologia.econ - b.ideologia.econ) + Math.abs(a.ideologia.social - b.ideologia.social)) / 2;
  alvo -= ideo * 55;
  if (partilhamAlianca(a.id, b.id)) alvo += 40;
  alvo += bonusTratado(w, a.id, b.id);
  if (a.democracia > 0.6 && b.democracia > 0.6) alvo += 15;
  else if (a.democracia < 0.4 && b.democracia < 0.4) alvo += 10;
  alvo += (a.abertura / 100) * (b.abertura / 100) * 10;
  alvo += clamp((a.prestige - b.prestige) * 0.01, -8, 8);
  alvo -= (a.infamia + b.infamia) * 0.15;
  if (a.expansionista && b.expansionista) alvo -= 20;
  return clamp(alvo, -100, 100);
};

export const driftRelações = (w: World) => {
  const ids = Object.keys(w.paises);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = w.paises[ids[i]];
      const b = w.paises[ids[j]];
      const alvo = alvoRelacao(w, a, b);
      let r = rel(w, a.id, b.id);
      r = drifta(r, alvo, 0.05) + rand(-0.3, 0.3);
      if (estaEmGuerra(w, a.id, b.id)) r = clamp(r, -100, -80);
      ajustar(w, a.id, b.id, r - rel(w, a.id, b.id));
    }
  }
};

export const estaEmGuerra = (w: World, a: string, b: string): boolean =>
  w.guerras.some((g) => (g.atacante === a && g.defensor === b) || (g.atacante === b && g.defensor === a));

export const emGuerraCom = (w: World, id: string): string[] =>
  w.guerras.filter((g) => g.atacante === id || g.defensor === id).map((g) => (g.atacante === id ? g.defensor : g.atacante));

export const poderMilitar = (c: Country): number => {
  const pessoal = c.militar.ativo * c.militar.prontidao * (0.5 + c.militar.tecnologia);
  const orcamento = (c.militar.orcamento / 100) * 12;
  const nucleo = c.militar.nuclear ? 40 : 0;
  const economia = Math.pow(c.gdp / 1000, 0.4);
  return (pessoal + orcamento * 8 + nucleo) * economia;
};

export const declararGuerra = (w: World, atacante: string, defensor: string, motivo: string) => {
  const a = w.paises[atacante];
  const d = w.paises[defensor];
  if (!a || !d || a.id === d.id || estaEmGuerra(w, a.id, d.id)) return false;

  const att = aliadosEmGuerra(w, a.id);
  const def = aliadosEmGuerra(w, d.id);

  const totalAtt = (att.length + 1) * poderMilitar(a);
  const totalDef = (def.length + 1) * poderMilitar(d);

  w.guerras.push({
    id: semECD(),
    nome: `${a.name} × ${d.name}`,
    atacante: a.id,
    defensor: d.id,
    motivo,
    mes: w.turno,
    poderAt: totalAtt,
    poderDef: totalDef,
    progresso: 0,
    exaustao: {},
    baixas: {},
  });

  for (const id of [...att, a.id]) w.paises[id].guerra = true;
  for (const id of [...def, d.id]) w.paises[id].guerra = true;

  a.infamia = clamp(a.infamia + 12, 0, 100);
  w.tensaoGlobal = clamp(w.tensaoGlobal + 8, 0, 100);

  for (const t of w.tratados.filter((t) => t.tipo === 'alianca' && (t.a === a.id || t.b === a.id))) {
    const p = w.paises[t.a === a.id ? t.b : t.a];
    const r = w.paises[t.a === a.id ? t.a : t.b];
    if (p && p.id !== d.id && !estaEmGuerra(w, p.id, a.id)) {
      notifica(w, `🛡️ ${p.name} invoca a aliança e junta-se à guerra ao lado de ${r.name}.`, 'neutro', p.id);
    }
  }

  notifica(w, `🔥 ${a.name} declara guerra contra ${d.name}${motivo ? ` (${motivo})` : ''}.`, 'ruim', a.id);
  return true;
};

const aliadosEmGuerra = (w: World, id: string): string[] => {
  const aliados = aliancaPorPais(id).flatMap((al) => membrosDa(al)).filter((m) => m !== id && !estaEmGuerra(w, id, m));
  for (const t of w.tratados.filter((t) => (t.tipo === 'alianca' || t.tipo === 'ajuda_militar') && (t.a === id || t.b === id))) {
    const out = t.a === id ? t.b : t.a;
    if (!estaEmGuerra(w, id, out)) aliados.push(out);
  }
  return [...new Set(aliados)].slice(0, 3);
};

export const TRATADO_LABEL: Record<TratadoTipo, string> = {
  alianca: 'Aliança defensiva',
  nao_agressao: 'Pacto de não-agressão',
  comercio: 'Acordo comercial',
  acesso_militar: 'Acesso militar',
  ajuda_militar: 'Ajuda militar',
};

export const passoTratados = (w: World) => {
  const vivos: Tratado[] = [];
  for (const t of w.tratados) {
    t.meses--;
    if (t.meses <= 0) {
      ajustar(w, t.a, t.b, -6);
      notifica(w, `📜 O ${TRATADO_LABEL[t.tipo].toLowerCase()} entre ${w.paises[t.a]?.name} e ${w.paises[t.b]?.name} expirou.`, 'neutro', t.a);
    } else {
      vivos.push(t);
    }
  }
  w.tratados = vivos;
};

export const passoGuerras = (w: World) => {
  for (const g of [...w.guerras]) {
    const a = w.paises[g.atacante];
    const d = w.paises[g.defensor];
    if (!a || !d) continue;

    const pA = poderMilitar(a);
    const pD = poderMilitar(d);
    const soma = pA + pD || 1;
    const eficA = 1 - (g.exaustao[g.atacante] ?? 0) / 100;
    const eficD = 1 - (g.exaustao[g.defensor] ?? 0) / 100;
    const delta = ((pA * eficA - pD * eficD) / soma) * 6;

    g.progresso = clamp(g.progresso + delta, -100, 100);
    g.poderAt = pA;
    g.poderDef = pD;

    const bat = Math.min(80, Math.abs(g.progresso) / 2 + 2);
    g.baixas[g.atacante] = (g.baixas[g.atacante] ?? 0) + bat * (1 - eficA);
    g.baixas[g.defensor] = (g.baixas[g.defensor] ?? 0) + bat * (1 - eficD);
    g.exaustao[g.atacante] = (g.exaustao[g.atacante] ?? 0) + 2.2 + bat * 0.02;
    g.exaustao[g.defensor] = (g.exaustao[g.defensor] ?? 0) + 2.2 + bat * 0.02;

    a.perdasGuerra += bat;
    d.perdasGuerra += bat;
    a.tensao = clamp((a.tensao ?? 0) + 0.4, 0, 100);
    d.tensao = clamp((d.tensao ?? 0) + 0.4, 0, 100);

    const ex = Math.max(g.exaustao[g.atacante] ?? 0, g.exaustao[g.defensor] ?? 0);
    if (ex > 62 || Math.abs(g.progresso) > 92) {
      finalizarGuerra(w, g);
    }
  }
};

export const finalizarGuerra = (w: World, g: War) => {
  const atacanteVenceu = g.progresso > 0;
  const a = w.paises[g.atacante];
  const d = w.paises[g.defensor];

  w.guerras = w.guerras.filter((x) => x.id !== g.id);
  if (a) a.guerra = false;
  if (d) d.guerra = false;

  const linha = atacanteVenceu
    ? `${a.name} obtém sucesso militar. Um acordo de paz é assinado.`
    : `${d.name} resiste e o conflito termina sem vitória clara.`;

  ajustar(w, g.atacante, g.defensor, atacanteVenceu ? -20 : -5);
  notifica(w, `🕊️ ${linha}`, 'neutro', atacanteVenceu ? g.atacante : g.defensor);

  if (a && atacanteVenceu) {
    a.aprovacao = clamp(a.aprovacao + 8, -100, 100);
    if (d) d.aprovacao = clamp(d.aprovacao - 6, -100, 100);
  }
};

export const passoCommodities = (w: World) => {
  const emGuerra = w.guerras.length ? 1 : 0;
  w.precoOleo = clamp(w.precoOleo + rand(-3, 3) + (w.tensaoGlobal - 20) * 0.05 + emGuerra * 2.2, 30, 160);
  w.precoAlimento = clamp(w.precoAlimento + rand(-2, 2) + (w.clima - 50) * 0.02 + emGuerra * 1.3, 60, 180);
  w.crescimentoGlobal = clamp(w.crescimentoGlobal + rand(-0.25, 0.35), -1.5, 4);
  w.tensaoGlobal = clamp(w.tensaoGlobal + (w.guerras.length ? 1.5 : -0.2), 0, 100);
  w.clima = clamp(w.clima + rand(-1.5, 1.5), 0, 100);
};

export const poderRelativo = (w: World, id: string): number => {
  const c = w.paises[id];
  if (!c) return 0;
  return poderMilitar(c);
};

export const resolverTensao = (w: World, a: string, b: string) => {
  const ra = rel(w, a, b);
  void ra;
  void desloca;
};

export const propoesPaz = (w: World, a: string, b: string) => {
  const g = w.guerras.find((x) => (x.atacante === a && x.defensor === b) || (x.atacante === b && x.defensor === a));
  if (g) finalizarGuerra(w, g);
};