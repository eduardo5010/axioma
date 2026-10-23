import type { Country, World } from './types';
import { OPINION_GROUPS, IG_DEFS, IG_PREFS, norm, distanciaIdeologica, ideologiaDaPolitica } from './data/groups';
import { clamp, drifta, rand } from './util';
import { notifica } from './data/events';
import { ativaDecisao } from './decisions';
import { semECD } from './util';
import { cadeirasPorSistema, achaCoalizao } from './governo';
import { estabilidadeSocial } from './dissolucao';

export const satisfacao = (c: Country, prefs: Record<string, { alvo: number; peso: number }>): number => {
  let soma = 0;
  let peso = 0;
  for (const [k, v] of Object.entries(prefs)) {
    const at = norm(c, k);
    const d = Math.abs(at - v.alvo) / 100;
    soma += (1 - d) * v.peso;
    peso += v.peso;
  }
  if (peso === 0) return 0;
  return ((soma / peso) * 2 - 1) * 100;
};

const fatorEconomico = (c: Country, gid: string): number => {
  let f = 0;
  const ind = c.indicadores ?? {};
  f += clamp(c.crescimento, -4, 4) * 2.2;
  f -= clamp(c.inflacao - 4, 0, 20) * 1.1;
  if (gid === 'operarios' || gid === 'trabalhadores') f -= clamp(c.desemprego - 5, 0, 15) * 2.2;
  if (gid === 'aposentados' && c.politica.bemEstar < 50) f -= 8;
  if (gid === 'jovens' && c.desemprego > 12) f -= 8;
  if (gid === 'classeMedia' && c.inflacao > 8) f -= 6;
  f -= ((ind.custo_vida ?? 50) - 50) * (gid === 'classeMedia' || gid === 'operarios' ? 0.35 : 0.1);
  f += ((ind.salarios ?? 50) - 50) * (gid === 'operarios' ? 0.5 : gid === 'servidoresPublicos' ? 0.35 : gid === 'classeMedia' ? 0.2 : 0);
  if (gid === 'aposentados') f -= ((ind.pobreza ?? 40) - 40) * 0.25;
  if (gid === 'academia') f += ((ind.investimento_privado ?? 50) - 50) * 0.15 + ((ind.graduados_universitarios ?? 50) - 50) * 0.25;
  if (gid === 'imprensa' && c.leis.midia === 2) f -= 28;
  if (gid === 'informais' && c.politica.leiOrdem > 60) f -= 12;
  if (gid === 'classeMedia' || gid === 'aposentados') f += ((ind.pib_pc_ppp ?? 50) - 50) * 0.1;
  if (gid === 'classeMedia' || gid === 'jovens') f -= Math.max(0, (ind.crime_juvenil ?? 50) - 50) * 0.12;
  if (gid === 'operarios' || gid === 'trabalhadores') f -= ((ind.custo_vida ?? 50) - 50) * 0.2;
  if (gid === 'nacionalistas' && c.indicadores.integridade_territorial < 45) f -= 10;
  return f;
};

export const passoOpinia = (c: Country) => {
  const censuraBonus = c.leis.midia === 2 ? 1.06 : 1;

  for (const g of OPINION_GROUPS) {
    let val = clamp(satisfacao(c, g.prefs as Record<string, { alvo: number; peso: number }>) + fatorEconomico(c, g.id), -95, 95);
    if (g.id !== 'ambientalistas' && g.id !== 'jovens') val *= censuraBonus;
    if (c.leis.policia === 2 && (g.id === 'classeMedia' || g.id === 'jovens')) val -= 12;
    const ant = c.opinioesGrupos[g.id] ?? 0;
    c.opinioesGrupos[g.id] = drifta(ant, val, 0.35);
  }

  let soma = 0;
  let peso = 0;
  for (const g of OPINION_GROUPS) {
    const s = g.size(c);
    const rm = c.regime === 'autoritário' ? 0.85 : c.regime === 'híbrido' ? 0.95 : 1;
    soma += (c.opinioesGrupos[g.id] ?? 0) * s * rm;
    peso += s;
  }
  const alvo = peso ? soma / peso : 0;
  c.aprovacao = drifta(c.aprovacao, clamp(alvo, -95, 95), 0.3);

  c.aprovComp.economia = clamp(c.crescimento * 3.5 - Math.max(0, c.inflacao - 4) * 1.2 - Math.max(0, c.desemprego - 6) * 2.2, -50, 90);
  c.aprovComp.seguranca = clamp((c.politica.leiOrdem / 100) * 30 + (c.guerra ? -30 : 10) - c.pops.radicalizacao * 0.5, -50, 90);
  c.aprovComp.direitos = clamp((c.democracia * 70 - c.leis.policia * 12 - (c.leis.midia === 2 ? 10 : 0) - c.infamia * 0.4), -50, 90);
  c.aprovComp.prestigio = clamp((c.prestige / 2000) * 100 - 40, -50, 90);
};

export const atualizaPrestigio = (c: Country) => {
  const det = c.sectoresDet ?? {};
  const raw: Record<string, number> = {};
  raw.latifundiarios = c.setores.agricultura * 1.4 + (1 - c.urbano) * 0.3 + (det.agro_exportador ?? 0) * 0.4 + (det.carne_bovina ?? 0) * 0.3;
  raw.burguesia = c.setores.servicos * 0.55 + (c.politica.leiOrdem / 100) * 0.2 + (det.bancos ?? 0) * 0.6 + (det.imoveis ?? 0) * 0.3;
  raw.industriais = c.setores.industria * 1.5 + (1 - c.politica.corporativo / 55) * 0.4 + (det.aco ?? 0) * 0.5 + (det.automoveis ?? 0) * 0.4;
  raw.sindicatos = c.setores.industria * 0.9 + c.urbano * 0.3 + (c.politica.bemEstar / 100) * 0.3 + (det.automoveis ?? 0) * 0.3 + (c.indicadores.agitacao_trabalhista ?? 50) * 0.2;
  raw.forcasArmadas = c.politica.militar * 1.6 + (c.guerra ? 2.5 : 0) + (c.regime === 'autoritário' ? 1.2 : 0) + (c.indicadores.indice_prontidao_guerra ?? 50) * 0.3;
  raw.camponeses = c.setores.agricultura * 1.1 + (1 - c.urbano) * 0.4 + (det.vegetais ?? 0) * 0.2;
  raw.clero = c.religiosidade * 2.2;
  raw.intelectuais = c.educacaoIdx * 1.5 + (c.politica.pesquisa / 100) * 0.8 + c.democracia + (c.indicadores.graduados_universitarios ?? 40) * 0.4 + (det.publishing ?? 0) * 0.3;
  raw.burocratas = c.gastoPct / 100 * 2.0 + (c.indicadores.burocracia ?? 50) * 0.1;
  raw.judiciario = (c.governo?.corte ?? 50) * 0.7 + c.democracia * 0.5 + (c.indicadores.estabilidade_bolsa ?? 50) * 0.05;
  raw.imprensaIG = c.urbano * 0.6 + (c.leis.midia === 2 ? 0.2 : 0.9) * 1.2 + (c.indicadores.velocidade_internet ?? 50) * 0.3;
  raw.especuladores = c.setores.servicos * 0.5 + ((c.indicadores.taxa_juros ?? 50) / 100) * 1.6 + (det.bancos ?? 0) * 0.5;

  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  for (const ig of IG_DEFS) {
    c.prestigio[ig.id] = clamp((raw[ig.id] ?? 0) / total * 100, 1, 60);
  }
};

export const passoGruposInteresse = (c: Country) => {
  atualizaPrestigio(c);
  for (const ig of IG_DEFS) {
    const prefs = (IG_PREFS[ig.id] ?? {}) as Record<string, { alvo: number; peso: number }>;
    const val = clamp(satisfacao(c, prefs) + fatorIG(c, ig.id), -95, 95);
    const ant = c.apoioGrupo[ig.id] ?? 0;
    c.apoioGrupo[ig.id] = drifta(ant, val, 0.3);
  }
};

const fatorIG = (c: Country, gid: string): number => {
  let f = 0;
  const ind = c.indicadores ?? {};
  if (gid === 'sindicatos') f -= clamp(c.desemprego - 5, 0, 15) * 2 + ((50 - (ind.salarios ?? 50)) * 0.3) - ((ind.agitacao_trabalhista ?? 50) - 50) * 0.1;
  if (gid === 'forcasArmadas' && c.guerra) f += 6;
  if (gid === 'burguesia' || gid === 'industriais') f += clamp(c.crescimento, -4, 4) * 2 + ((ind.confianca_empresarial ?? 50) - 50) * 0.25;
  if (gid === 'latifundiarios' && c.politica.verde > 60) f -= 5;
  if (gid === 'burocratas' && c.gastoPct < 15) f -= 6;
  if (gid === 'burocratas') f += ((c.indicadores.burocracia ?? 50) - 50) * 0.2;
  if (gid === 'judiciario') {
    if (c.leis.midia === 2) f -= 18;
    if (c.leis.policia === 2) f -= 12;
    f += (c.governo?.corte ?? 50) * 0.15;
    f -= Math.max(0, (ind.crime_juvenil ?? 50) - 50) * 0.1;
  }
  if (gid === 'imprensaIG' && c.leis.midia === 2) f -= 28;
  if (gid === 'especuladores') f += ((ind.taxa_juros ?? 50) - 50) * 0.35 + ((ind.estabilidade_bolsa ?? 50) - 50) * 0.2;
  return f;
};

export const passoPartidos = (c: Country, w: World) => {
  if (c.posEstado) return; // sem eleições de Estado: assembleias comunitárias coordenam
  const polIdeo = ideologiaDaPolitica(c);
  const perf = c.aprovacao / 100;

  let total = 0;
  for (const p of c.partidos) {
    const alinhamento = 1 - distanciaIdeologica(p.ideology, polIdeo);
    let score = p.baseSupport + alinhamento * 22;
    if (p.ruling) {
      score += perf * 42;
      score -= Math.max(0, c.inflacao - 5) * 1.6;
      score -= (c.governo?.conflitoPoderes ?? 20) * 0.15;
      score -= Math.max(0, (c.indicadores.pobreza ?? 50) - 50) * 0.4;
      score -= Math.max(0, c.desemprego - 8) * 0.6;
    } else score += (1 - perf) * 16;
    for (const tr of p.traits) {
      const prest = c.prestigio[tr] ?? 10;
      const ap = (c.apoioGrupo[tr] ?? 0) / 100;
      score += prest * 0.28 * (p.ruling ? ap : (1 - ap));
    }
    score = Math.max(1, score);
    p.support = score;
    total += score;
  }

  if (c.regime === 'autoritário') {
    const maior = [...c.partidos].sort((a, b) => b.support - a.support)[0];
    for (const p of c.partidos) {
      p.support = p.id === maior.id ? clamp(97 - c.aprovacao * 0.2, 55, 98) : clamp(p.support, 1, 4);
    }
    return;
  }

  for (const p of c.partidos) p.support = clamp((p.support / total) * 100, 1, 70);

  for (const p of c.partidos) {
    p.fundos = clamp(p.fundos + (p.ruling ? c.receitaPct * 0.3 : 2) - p.support * 0.1 * (Math.random() < 0.1 ? 1 : 0), 5, 99);
    p.reformismo = clamp(drifta(p.reformismo ?? 50, 42 + c.democracia * 55 - p.ideology.econ * 20 + (c.aprovacao > 0 ? 5 : -5), 0.06), 4, 96);
    p.aprovaPartido = clamp(drifta(p.aprovaPartido ?? c.aprovacao + 25, c.aprovacao + 25 + (p.ruling ? p.support * 0.3 : 8) - c.pops.radicalizacao * 0.2, 0.3), -70, 99);
  }

  c.semEleiçoes--;
  if (c.semEleiçoes <= 0) {
    realizarEleicao(c, w);
    c.semEleiçoes = 48;
    c.proximaEleicao = 48;
  }
};

export const realizarEleicao = (c: Country, w: World) => {
  const total = c.governo?.cadeirasTotal ?? 513;
  const partidos = [...c.partidos].filter((p) => p.support >= 3);
  const vencedor = partidos[0];

  for (const p of c.partidos) {
    p.ruling = p.id === vencedor.id;
  }

  const antigo = c.lider;
  c.lider = antigo && c.partidos.find((p) => p.ruling && p.name === antigo) ? antigo : `Governo ${vencedor.name}`;

  if (c.governo) {
    try {
      const novo = cadeirasPorSistema(c, c.governo.eleitoral, total);
      c.governo.cadeiras = novo;
      c.governo.coalizao = achaCoalizao(c, novo, c.governo.sistema);
      const share = c.governo.coalizao.reduce((s, id) => s + (novo[id] ?? 0), 0) / total;
      c.governo.apoioLegislativo = clamp(
        share * (c.governo.sistema === 'parlamentar' ? 1.5 : 0.8) * 100,
        10, 100,
      );
      for (const p of c.partidos) p.seats = novo[p.id] ?? 0;
    } catch {
      c.governo.coalizao = [vencedor.id];
      for (const p of c.partidos) p.seats = p.ruling ? total : 0;
    }
  }

  const aprest = c.aprovacao + 4;
  c.aprovacao = clamp(aprest, -100, 100);

  const tom: 'bom' | 'ruim' | 'neutro' = c.id === w.jogadorId ? 'neutro' : 'neutro';
  notifica(w, `🗳️ ${c.name}: ${vencedor.name} vence as eleições com ${vencedor.support.toFixed(1)}%.`, tom, c.id);
};

export const passoEstabilidade = (c: Country) => {
  if (c.posEstado) {
    const alvoPos = estabilidadeSocial(c);
    c.estabilidade = drifta(c.estabilidade, alvoPos, 0.25);
    c.infamia *= 0.985;
    return;
  }
  const ind = c.indicadores ?? {};
  const alvo = clamp(
    50 + c.aprovacao * 0.4 + c.crescimento * 2 - c.inflacao * 0.2 + (c.regime === 'autoritário' ? 5 : 0) - (c.guerra ? 12 : 0)
    - c.pops.radicalizacao * 0.3 - c.infamia * 0.1
    - (c.governo?.conflitoPoderes ?? 20) * 0.25
    - (100 - (c.governo?.corte ?? 50)) * 0.05
    - Math.max(0, (ind.crime_juvenil ?? 50) - 45) * 0.2,
    -30, 100,
  );
  c.estabilidade = drifta(c.estabilidade, alvo, 0.25);
  c.infamia = c.infamia * 0.985;
};

export const passoRevolucao = (c: Country, w: World) => {
  if (w.gameOver) return;
  if (c.posEstado) return; // revolução pressupõe Estado
  const radical = c.pops.radicalizacao;
  const estab = c.estabilidade;
  const mbrazo = (c.apoioGrupo.forcasArmadas ?? 0) < -35 && c.regime === 'autoritário';

  if (c.id === w.jogadorId) {
    if (c.dissolucao) return; // a dissolução absorve a pressão revolucionária
    if (radical > 48 && estab < 8 && Math.random() < 0.12) {
      ativaDecisao(w, {
        id: semECD(),
        titulo: 'Revolução em curso',
        texto: `Movimentos populares tomaram as ruas e ameaçam derrubar o governo.`,
        paisId: c.id,
        opcoes: [
          { label: 'Ordem! (repressão) 🚔', efeitos: [{ t: 'estabilidade', d: 10 }, { t: 'radical', d: -6 }, { t: 'infamia', d: 22 }, { t: 'aprovacao', d: -14 }, { t: 'relacao', alvo: 'usa', d: -8 }] },
          { label: 'Conceder reformas 🗳️', efeitos: [{ t: 'estabilidade', d: 5 }, { t: 'aprovacao', d: 10 }, { t: 'radical', d: -10 }, { t: 'lei', lei: 'sufragio', opcao: 2 }, { t: 'democracia', d: 0.15 }, { t: 'infamia', d: -4 }] },
          { label: 'Renunciar e entregar o poder 🚪', efeitos: [{ t: 'aprovacao', d: -20 }, { t: 'estabilidade', d: 8 }, { t: 'gdp', d: -3 }, { t: 'fim', motivo: 'Você renunciou diante da revolução popular.' }] },
        ],
      });
      return;
    }
    if (mbrazo && estab < 20 && Math.random() < 0.1) {
      ativaDecisao(w, {
        id: semECD(),
        titulo: 'Ameaça de golpe militar',
        texto: 'Sectores das Forças Armadas conspiram para tomar o poder.',
        paisId: c.id,
        opcoes: [
          { label: 'Defender a ordem com todos os meios 💪', efeitos: [{ t: 'estabilidade', d: 6 }, { t: 'aprovacao', d: 4 }, { t: 'relacao', alvo: 'usa', d: -5 }, { t: 'infamia', d: 10 }, { t: 'radical', d: 3 }] },
          { label: 'Negociar com a caserna 🤝', efeitos: [{ t: 'estabilidade', d: 4 }, { t: 'aprovacao', d: -3 }, { t: 'democracia', d: -0.08 }, { t: 'relacao', alvo: 'usa', d: -4 }] },
        ],
      });
      return;
    }
    return;
  }

  if (radical > 55 && estab < 5 && Math.random() < 0.2) {
    const antes = c.democracia;
    c.democracia = clamp(antes + rand(0.4, 0.7), 0, 1);
    c.regime = c.democracia > 0.66 ? 'democracia' : c.democracia > 0.4 ? 'híbrido' : 'autoritário';
    c.leis = { ...c.leis, sufragio: 2, executivo: 1, policia: 0 };
    c.pops.radicalizacao = 20;
    c.estabilidade = 40;
    c.lider = `Governo revolucionário de ${c.name}`;
    notifica(w, `🔥 Revolução em ${c.name}: o regime foi derrubado pelas ruas.`, 'ruim', c.id);
  } else if (mbrazo && estab < 12 && Math.random() < 0.12) {
    c.democracia = clamp(c.democracia - 0.3, 0, 1);
    c.regime = 'autoritário';
    c.leis = { ...c.leis, executivo: 3, policia: 2, sufragio: 0, midia: 2 };
    c.pops.radicalizacao = 30;
    c.estabilidade = 35;
    c.lider = `Junta militar de ${c.name}`;
    notifica(w, `🪖 Golpe de estado em ${c.name}: os militares assumiram o poder.`, 'ruim', c.id);
  }
};