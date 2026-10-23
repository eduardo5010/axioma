import type { Country, Policies, TratadoTipo, World } from './types';
import { clamp, desloca, escolhe, semECD } from './util';
import { ajustar, rel, emGuerraCom, declararGuerra, poderMilitar, temTratado, TRATADO_LABEL } from './geopolitics';
import { aliancaPorPais } from './data/alliances';
import { notifica } from './data/events';
import { criarCrise } from './crises';
import { LEIS_DEFS } from './data/normas/catalogo';
import { propoeSlider, propoeReforma } from './propostas';
import { REFORMAS_MAP } from './data/normas/catalogo';

export const politicaAlvo = (c: Country): Policies => {
  const t = { ...c.politica };
  const { ideologia: id, politica: p } = c;

  t.renda = clamp(42 - id.econ * 18, 10, 50) + (c.deficitPct > 6 ? 4 : 0);
  t.corporativo = clamp(30 - id.econ * 14, 8, 38);
  t.bemEstar = clamp(50 - id.econ * 24, 15, 85);
  t.saude = clamp(52 - id.econ * 15, 25, 85);
  t.educacao = clamp(52 - id.econ * 15, 25, 88);
  t.militar = clamp(1.2 + id.social * 1.6 + (c.guerra ? 1.8 : 0) + (c.expansionista ? 1.2 : 0), 0.4, 7);
  t.infraestrutura = clamp(45 + id.econ * -5, 25, 80);
  t.pesquisa = clamp(45 - id.econ * 15, 20, 85);
  t.comercio = clamp(70 - id.econ * -10, 30, 90);
  t.tarifas = clamp(25 + id.econ * -20, 10, 70);
  t.imigracao = clamp(55 - id.social * 32, 5, 85);
  t.verde = clamp(c.religiosidade > 0.8 ? 24 : 55 - id.econ * 12, 8, 88);
  t.leiOrdem = clamp(55 + id.social * 27, 25, 92);
  t.renovaveis = clamp(55 - id.econ * 15, 12, 90);
  t.juros = clamp(30 + c.inflacao * 1.4 + (p.juros >= 50 ? 6 : 0), 5, 88);

  const ind = c.indicadores ?? {};
  if ((ind.pobreza ?? 50) > 55) {
    t.renda = clamp(t.renda + 5, 10, 55);
    t.bemEstar = clamp(t.bemEstar + 4, 15, 90);
  }
  if ((ind.crime_juvenil ?? 50) > 55) t.leiOrdem = clamp(t.leiOrdem + 8, 25, 95);
  if ((ind.custo_vida ?? 50) > 55) t.juros = clamp(t.juros + 4, 5, 90);
  if ((ind.produtividade ?? 50) < 40) {
    t.pesquisa = clamp(t.pesquisa + 6, 20, 90);
    t.educacao = clamp(t.educacao + 4, 25, 90);
  }
  if ((ind.demanda_energia ?? 50) > (ind.oferta_energia ?? 50)) {
    t.renovaveis = clamp(t.renovaveis + 4, 12, 92);
    t.infraestrutura = clamp(t.infraestrutura + 2, 25, 82);
  }
  if ((ind.tensao_racial ?? 50) > 55 && c.democracia > 0.4) t.leiOrdem = clamp(t.leiOrdem + 5, 25, 92);

  if (c.dividaPct > 120) {
    t.bemEstar = clamp(t.bemEstar - 12, 5, 60);
    t.militar = clamp(t.militar - 1, 0.4, 6);
  }
  return t;
};

export const aplicaPolitica = (c: Country, t: Policies) => {
  const gov = c.governo;
  const vel = (c.regime === 'autoritário' ? 4 : 2.4) * (0.7 + (gov?.delegacao ?? 0.3));
  (Object.keys(t) as (keyof Policies)[]).forEach((k) => {
    const atual = c.politica[k] as number;
    c.politica[k] = desloca(atual, t[k], vel) as never;
  });
  c.politica.renda = clamp(c.politica.renda, 0, 55);
  c.politica.corporativo = clamp(c.politica.corporativo, 0, 45);
  c.politica.militar = clamp(c.politica.militar, 0, 10);
};

const IA_DIPLOMACIA = (w: World, c: Country) => {
  if (Math.random() > 0.35) return;
  const ids = Object.keys(w.paises).filter((id) => id !== c.id);
  const amigo = ids.filter((d) => rel(w, c.id, d) > 40 && !emGuerraCom(w, c.id).includes(d));
  const rival = ids.filter((d) => rel(w, c.id, d) < -35 && !emGuerraCom(w, c.id).includes(d));

  if (amigo.length && aliancaPorPais(c.id).length === 0) {
    const alvo = escolhe(amigo);
    if (rel(w, c.id, alvo) < 65) ajustar(w, c.id, alvo, 1.5);
  }

  if (rival.length && (c.expansionista || c.ideologia.social > 0.6)) {
    const alvo = escolhe(rival);
    const parceiroForte = poderMilitar(w.paises[alvo]) > poderMilitar(c) * 1.6;
    if (rel(w, c.id, alvo) < -60 && !parceiroForte && c.tensao > 55 && !emGuerraCom(w, c.id).includes(alvo)) {
      if (Math.random() < 0.005) {
        declararGuerra(w, c.id, alvo, 'ambições expansionistas');
      }
    } else if (!parceiroForte) {
      ajustar(w, c.id, alvo, -1.2);
    }
  }
};

export const passoIA = (w: World, c: Country) => {
  if (c.id === w.jogadorId) return;
  const alvo = politicaAlvo(c);
  const diffs = (Object.keys(alvo) as (keyof Policies)[])
    .map((k) => ({ k, d: Math.abs((alvo[k] as number) - (c.politica[k] as number)) }))
    .filter((x) => x.d > 0.9)
    .sort((a, b) => b.d - a.d)
    .slice(0, 3);
  for (const { k } of diffs) propoeSlider(w, c, k, alvo[k]);
  c.politica.militar = desloca(c.politica.militar, alvo.militar, 0.5);
  IA_FISCAL(w, c);
  IA_REFORMAS(w, c);
  IA_DIPLOMACIA(w, c);
  IA_ESTRATEGIA(w, c);
};

const IA_FISCAL = (w: World, c: Country) => {
  if (Math.random() > 0.2) return;
  const orc = c.orcamento;
  if (!orc) return;
  if (orc.resultado > 4.5) {
    if (Math.random() < 0.55) {
      const k: 'infraestrutura' | 'pesquisa' = Math.random() < 0.6 ? 'infraestrutura' : 'pesquisa';
      propoeSlider(w, c, k, Math.max(0, c.politica[k] - 2 - Math.random() * 6));
    } else {
      const k: 'renda' | 'corporativo' = Math.random() < 0.6 ? 'renda' : 'corporativo';
      propoeSlider(w, c, k, Math.min(c.politica[k] + 2 + Math.random() * 3, 55));
    }
  } else if (orc.resultado < -3 && c.dividaPct > 130) {
    propoeSlider(w, c, 'bemEstar', Math.max(0, c.politica.bemEstar - 6));
  }
};

const IA_REFORMAS = (w: World, c: Country) => {
  const ind = c.indicadores ?? {};
  const stacks = c.reformas ?? {};
  const orc = c.orcamento;
  if (orc && (orc.resultado > 4.5 || (orc.riscoFiscal && orc.obrigatorias / Math.max(0.5, orc.total) > 0.55))) {
    const austeridade = ['reforma_previdencia', 'reforma_salarios', 'racionaliza_beneficios', 'reforma_federativa', 'corte_piso'];
    const fiscais = austeridade.filter((rid) => {
      const def = REFORMAS_MAP[rid];
      return def && (c.reformas[rid] ?? 0) < (def.max ?? 1);
    });
    if (fiscais.length && Math.random() < 0.3) {
      propoeReforma(w, c, escolhe(fiscais), 1);
      return;
    }
  }
  const candidatas = Object.keys(REFORMAS_MAP).filter((rid) => {
    const def = REFORMAS_MAP[rid];
    if (def.bloco === 'politica' && c.democracia < 0.35) return false;
    if (def.tipo === 'ativa') return false;
    if ((c.reformas[rid] ?? 0) >= (def.max ?? 1)) return false;
    if (def.cond) { const motivo = def.cond(c, (stacks[rid] ?? 0) + Math.sign(def.ideo.econ)); if (motivo) return false; }
    return true;
  });
  if (candidatas.length && c.dividaPct > 115 && Math.random() < 0.25) {
    const fiscais = candidatas.filter((x) => { const b = REFORMAS_MAP[x].bloco; return b === 'receita' || b === 'gasto'; });
    if (fiscais.length) { propoeReforma(w, c, escolhe(fiscais), 1); return; }
  }
  if (candidatas.length && (ind.pobreza ?? 50) > 60 && c.crescimento > 1 && Math.random() < 0.1) {
    const sociais = candidatas.filter((x) => REFORMAS_MAP[x].bloco === 'gasto' && REFORMAS_MAP[x].ideo.econ < 0.3);
    if (sociais.length) { propoeReforma(w, c, escolhe(sociais), 1); return; }
  }
  for (const rid of Object.keys(stacks)) {
    const def = REFORMAS_MAP[rid];
    if (!def) continue;
    if (def.ideo.econ < -0.45 && c.ideologia.econ > 0.35 && stacks[rid] > 0 && Math.random() < 0.04) {
      propoeReforma(w, c, rid, -1);
      return;
    }
  }
  if (candidatas.length && Math.random() < (c.regime === 'autoritário' ? 0.02 : 0.035)) {
    const r = escolhe(candidatas);
    propoeReforma(w, c, r, 1);
  }
};

const IA_ESTRATEGIA = (w: World, c: Country) => {
  if (c.id === w.jogadorId || Math.random() > 0.08) return;

  const ids = Object.keys(w.paises).filter((id) => id !== c.id);
  const amigo = ids.filter((d) => rel(w, c.id, d) > 50 && !emGuerraCom(w, c.id).includes(d) && !temTratado(w, c.id, d, 'alianca'));
  if (amigo.length && Math.random() < 0.35) {
    const alvo = escolhe(amigo);
    const tipo: TratadoTipo = Math.random() < 0.6 ? 'alianca' : 'comercio';
    if (tipo === 'alianca' && rel(w, c.id, alvo) < 62) return;
    w.tratados.push({ id: semECD(), tipo, a: c.id, b: alvo, meses: 60 });
    ajustar(w, c.id, alvo, 4);
    notifica(w, `📜 ${c.name} e ${w.paises[alvo]?.name} firmam ${TRATADO_LABEL[tipo].toLowerCase()}.`, 'neutro', c.id);
    return;
  }

  const rival = ids.filter((d) => rel(w, c.id, d) < -45 && !emGuerraCom(w, c.id).includes(d) && !temTratado(w, c.id, d));
  if (rival.length) {
    const alvo = escolhe(rival);
    if ((c.expansionista || c.tensao > 60) && poderMilitar(w.paises[alvo]) < poderMilitar(c) * 0.72 && w.crises.every((x) => x.a !== c.id && x.b !== c.id)) {
      if (Math.random() < 0.12) {
        criarCrise(w, c.id, alvo, 'rivalidade regional');
        notifica(w, `⚠️ ${c.name} emite um Ultimato a ${w.paises[alvo]?.name}: ou cede ou enfrentará a força.`, 'ruim', c.id);
        return;
      }
    }
    if (Math.random() < 0.06) {
      const alvoC = w.paises[alvo];
      alvoC.estabilidade = clamp(alvoC.estabilidade - 4, -30, 100);
      c.infamia = clamp(c.infamia + 6, 0, 100);
      if (Math.random() < 0.5) {
        notifica(w, `🕵️ Operação encoberta de ${c.name} desestabilizou ${alvoC.name}.`, 'ruim', c.id);
      }
    }
  }

  if (Math.random() < 0.05) {
    const lei = escolhe(LEIS_DEFS);
    const alvo = c.leis[lei.id];
    if (alvo < lei.opcoes.length - 1) {
      c.leis[lei.id]++;
      notifica(w, `📜 ${c.name} reformou ${lei.nome.toLowerCase()} (${lei.opcoes[c.leis[lei.id]].nome}).`, 'neutro', c.id);
    }
  }
};

export const passoIASancoes = (w: World, c: Country) => {
  if (c.id === w.jogadorId || Math.random() > 0.02) return;
  const ids = Object.keys(w.paises).filter((id) => id !== c.id && rel(w, c.id, id) < -55);
  if (!ids.length) return;
  const alvo = escolhe(ids);
  const idAlvo = w.paises[alvo];
  if (idAlvo) {
    idAlvo.crescimento -= 0.4;
    ajustar(w, c.id, alvo, -4);
    notifica(w, `⚖️ ${c.name} impõe sanções econômicas contra ${idAlvo.name}.`, 'ruim', c.id);
  }
};