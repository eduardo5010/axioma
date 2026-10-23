import type { Country, War, World } from './types';
import { SEMENTES, criaPais } from './data/countries';
import { makePartidos } from './data/parties';
import { clamp } from './util';
import { partilhamAlianca } from './data/alliances';
import { distanciaIdeologica } from './data/groups';
import { leisParaRegime } from './data/normas/padroesPorRegime';
import { iniciaPops } from './pops';
import { iniciaMercado } from './market';
import { calculaPrestigio } from './prestige';
import { iniciarGoverno } from './governo';
import { iniciarIndicadores, iniciarSectoresDet } from './indicadores';
import { passoFinancas } from './economy';
import { construcoesIniciais, funcionariosIniciais } from './data/public';
import { gerarEspaco } from './space';

const OVERRIDES: [string, string, number][] = [
  ['usa', 'chn', -35], ['usa', 'rus', -50], ['usa', 'prk', -70], ['usa', 'isr', 80],
  ['usa', 'gbr', 85], ['usa', 'can', 80], ['usa', 'aus', 80], ['usa', 'ven', -55],
  ['chn', 'jpn', -25], ['chn', 'kor', -30], ['chn', 'ind', -20], ['chn', 'pak', 55], ['chn', 'rus', 70],
  ['rus', 'ukr', -85], ['rus', 'pol', -60], ['rus', 'nia', 10],
  ['isr', 'irn', -75], ['isr', 'sau', -10], ['sau', 'irn', -30],
  ['ind', 'pak', -45], ['bra', 'arg', 55], ['bra', 'chn', 55], ['bra', 'usa', 45],
  ['tur', 'gree', -20], ['deu', 'sue', 40], ['deu', 'nld', 65],
];

const baseRelacao = (a: Country, b: Country): number => {
  let r = 0;
  r -= distanciaIdeologica(a.ideologia, b.ideologia) * 55;
  if (partilhamAlianca(a.id, b.id)) r += 40;
  if (a.democracia > 0.6 && b.democracia > 0.6) r += 15;
  else if (a.democracia < 0.4 && b.democracia < 0.4) r += 5;
  r += (a.abertura / 100) * (b.abertura / 100) * 8;
  if (a.expansionista && b.expansionista) r -= 15;
  return clamp(r, -100, 100);
};

const geometria = (): [string, string, number][] => OVERRIDES;

export const criaMundo = (jogadorId: string, ano = 2026): World => {
  const paises: Record<string, Country> = {};
  for (const s of SEMENTES) {
    const c = criaPais(s);
    c.partidos = makePartidos(c);
    const maior = [...c.partidos].reduce((a, b) => (Math.abs(a.ideology.econ - c.ideologia.econ) + Math.abs(a.ideology.social - c.ideologia.social) < Math.abs(b.ideology.econ - c.ideologia.econ) + Math.abs(b.ideology.social - c.ideologia.social) ? a : b));
    for (const p of c.partidos) p.ruling = p.id === maior.id;
    c.aprovacao = c.regime === 'autoritário' ? 15 : 5;
    c.semEleiçoes = s.eleicao ?? 24;
    c.proximaEleicao = c.semEleiçoes;
    c.reeleicao = 0;
    for (const p of c.partidos) {
      p.fundos = 25 + Math.random() * 30;
      p.reformismo = 45 + (p.ideology.social > 0 ? 8 : -8);
      p.aprovaPartido = c.aprovacao + 25;
    }
    c.governo = iniciarGoverno(c);
    iniciarIndicadores(c);
    iniciarSectoresDet(c);
    c.pops = iniciaPops(c);
    c.pesquisa = {
      militar: clamp(s.militar.tecnologia ?? 0.5, 0, 1) * 100,
      industrial: clamp(c.politica.pesquisa, 20, 100),
      social: clamp(c.politica.educacao, 35, 100),
      espacial: 5,
    };
    c.pesquisaInvest = { militar: 30, industrial: 35, social: 25, espacial: 10 };
    c.programasEspaciais = [];
    c.construcoes = construcoesIniciais({
      populacao: c.populacao,
      urbano: c.urbano,
      saude: c.saudeIdx,
      educ: c.educacaoIdx,
      infraestrutura: c.infraestrutura,
    });
    c.funcionariosMil = funcionariosIniciais({ populacao: c.populacao, saude: c.saudeIdx, educ: c.educacaoIdx, politica: c.politica as unknown as Record<string, number> });
    c.leis = leisParaRegime(c.regime, c.democracia, c.religiosidade);
    c.infamia = c.guerra ? 10 : 0;
    c.prestige = 50;
    c.aprovComp = { economia: 0, seguranca: 0, direitos: 0, prestigio: 0 };
    c.pressaoDissol = 15 + Math.random() * 12;
    c.cooldownDissol = 0;
    c.dissolucao = null;
    c.posEstado = null;
    paises[c.id] = c;
  }

  const relacoes: Record<string, Record<string, number>> = {};
  const ids = Object.keys(paises);
  for (const a of ids) {
    relacoes[a] = {};
    for (const b of ids) relacoes[a][b] = a === b ? 100 : 0;
  }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const base = baseRelacao(paises[ids[i]], paises[ids[j]]);
      relacoes[ids[i]][ids[j]] = base;
      relacoes[ids[j]][ids[i]] = base;
    }
  }
  for (const [a, b, v] of geometria()) {
    if (relacoes[a] && relacoes[b]) relacoes[a][b] = relacoes[b][a] = v;
  }

  const guerrasIniciais: War[] = [
    {
      id: 'g_ru_ukr', nome: 'Rússia × Ucrânia', atacante: 'rus', defensor: 'ukr',
      motivo: 'Invasão territorial', mes: 0, poderAt: 0, poderDef: 0, progresso: 5,
      exaustao: { rus: 35, ukr: 28 }, baixas: { rus: 180, ukr: 120 },
    },
  ];
  paises.rus.guerra = true;
  paises.ukr.guerra = true;

  const w: World = {
    ano,
    mes: 1,
    turno: 0,
    jogadorId,
    paises,
    relacoes,
    guerras: guerrasIniciais,
    aliancas: {},
    noticias: [],
    precoOleo: 70,
    precoAlimento: 100,
    crescimentoGlobal: 2.8,
    tensaoGlobal: 35,
    clima: 50,
    historico: [],
    gameOver: false,
    motivoFim: '',
    mesesPoder: 0,
    tratados: [],
    crises: [],
    decisao: null,
    mercado: {},
    indGlobal: {},
    espaco: gerarEspaco(2026),
  };

  iniciaMercado(w);
  for (const c of Object.values(paises)) passoFinancas(c, w);
  calculaPrestigio(w);

  w.noticias.push({ mes: '1/2026', texto: '🌎 O governo começa. O cenário mundial é marcado por tensão e múltiplos desafios.', tom: 'neutro' });
  w.noticias.push({ mes: '1/2026', texto: `⚡ Você assumiu o governo de ${paises[jogadorId].name}.`, tom: 'bom', pais: jogadorId });
  w.noticias.push({ mes: '1/2026', texto: '🔥 O conflito na Europa Oriental continua ativo.', tom: 'ruim', pais: 'ukr' });

  const p = paises[jogadorId];
  for (let i = 11; i >= 0; i--) {
    p.historico.push({ m: `${i}`, gdp: p.gdp, crescimento: p.crescimento, inflacao: p.inflacao, desemprego: p.desemprego, aprovacao: p.aprovacao, divida: p.dividaPct, gini: p.gini });
  }
  return w;
};