import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { useGame } from '../store/game';

type EstadoJogo = ReturnType<typeof useGame.getState>;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARREDONDA = (n: number): number => Math.round(n * 1e6) / 1e6;

const DEDUP = (obj: Record<string, number | boolean>): Record<string, number | boolean> => {
  const out: Record<string, number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'number' ? ARREDONDA(v) : v;
  return out;
};

const snapshot = (g: EstadoJogo) => {
  const w = g.w!;
  const c = w.paises[w.jogadorId]!;
  const o = c.orcamento!;
  return {
    ano: w.ano, mes: w.mes, turno: w.turno,
    tensaoGlobal: w.tensaoGlobal, crescimentoGlobal: w.crescimentoGlobal,
    mercado: Object.fromEntries(Object.entries(w.mercado).map(([k, m]) => [k, ARREDONDA(m.preco)])),
    jogador: {
      politica: DEDUP(c.politica as unknown as Record<string, number>),
      leis: DEDUP(c.leis as unknown as Record<string, number>),
      alternadores: DEDUP(c.alternadores as unknown as Record<string, boolean>),
      reformas: DEDUP(c.reformas),
      reformasInd: DEDUP(c.reformasInd),
      propostas: c.propostas.map((p) => ({
        tipo: p.tipo, politica: p.politica ?? null, toggle: p.toggle ?? null,
        reforma: p.reforma ?? null, delta: p.delta, meses: p.meses, etapa: p.etapa,
      })),
      macro: DEDUP({
        crescimento: c.crescimento, inflacao: c.inflacao, desemprego: c.desemprego,
        gini: c.gini, dividaPct: c.dividaPct, receitaPct: c.receitaPct, gastoPct: c.gastoPct,
        deficitPct: c.deficitPct, jurosPagos: c.jurosPagos, aprovacao: c.aprovacao,
        estabilidade: c.estabilidade, felicidade: c.felicidade, democracia: c.democracia,
        educacaoIdx: c.educacaoIdx, saudeIdx: c.saudeIdx, infraestrutura: c.infraestrutura,
        emissaoCo2: c.emissaoCo2, abertura: c.abertura,
      }),
      orcamento: c.orcamento ? {
        receitaTributaria: ARREDONDA(o.receitaTributaria),
        receitaNaoTributaria: ARREDONDA(o.receitaNaoTributaria),
        receitaTotal: ARREDONDA(o.receitaTotal),
        obrigatorias: ARREDONDA(o.obrigatorias),
        previdencia: ARREDONDA(o.previdencia),
        salarios: ARREDONDA(o.salarios),
        beneficios: ARREDONDA(o.beneficios),
        transferencias: ARREDONDA(o.transferencias),
        pisoSaude: ARREDONDA(o.pisoSaude),
        pisoEduc: ARREDONDA(o.pisoEduc),
        discricionarias: ARREDONDA(o.discricionarias),
        financeiras: ARREDONDA(o.financeiras),
        juros: ARREDONDA(o.juros),
        total: ARREDONDA(o.total),
        resultado: ARREDONDA(o.resultado),
        riscoFiscal: o.riscoFiscal, regraOuro: o.regraOuro, corteRegra: ARREDONDA(o.corteRegra),
      } : null,
      governo: c.governo ? {
        apoioLegislativo: ARREDONDA(c.governo.apoioLegislativo),
        aprovacaoJudiciario: ARREDONDA(c.governo.aprovacaoJudiciario),
        corte: ARREDONDA(c.governo.corte),
        corteLider: ARREDONDA(c.governo.corteLider),
        conflitoPoderes: ARREDONDA(c.governo.conflitoPoderes),
        delegacao: ARREDONDA(c.governo.delegacao),
        censuraPendenteMeses: c.governo.censuraPendenteMeses,
      } : null,
      indicadores: DEDUP(c.indicadores),
      pops: DEDUP(c.pops as unknown as Record<string, number>),
    },
    outro: (() => {
      const x = w.paises['chn']!;
      return {
        macro: DEDUP({ crescimento: x.crescimento, inflacao: x.inflacao, desemprego: x.desemprego, aprovacao: x.aprovacao, estabilidade: x.estabilidade, democracia: x.democracia, dividaPct: x.dividaPct, receitaPct: x.receitaPct, gastoPct: x.gastoPct }),
        leis: DEDUP(x.leis as unknown as Record<string, number>),
        reformas: DEDUP(x.reformas),
        politica: DEDUP(x.politica as unknown as Record<string, number>),
      };
    })(),
  };
};

const MAIN = () => {
  Math.random = mulberry32(20260919);
  const g = useGame;
  g.getState().novoJogo('bra');

  const acoes = (mes: number) => {
    const A = g.getState();
    if (mes === 0) {
      A.setPolitica('renda', 34);
      A.submeterPolitica();
      A.setPolitica('educacao', 62);
      A.submeterPolitica();
      A.setPolitica('juros', 44);
      A.setAlternador('drogaLegal');
      A.setAlternador('bancosPublicos');
      A.proporReforma('bolsa_valor', 1);
      A.proporReforma('reforma_previdencia', 1);
      A.proporReforma('fiscal_resp', 1);
      A.proporReforma('pol_cidadania', 1);
      A.reformaLei('policia', 1);
      A.reformaLei('servicos', 2);
    }
    if (mes === 6) {
      A.setPolitica('comercio', 55);
      A.submeterPolitica();
      A.proporReforma('carbon_tax', 1);
    }
    if (mes === 12) {
      A.setAlternador('censura');
      A.proporReforma('pol_cidadania', -1);
    }
    if (mes === 18) {
      A.setPolitica('leiOrdem', 60);
      A.submeterPolitica();
      A.proporReforma('reforma_previdencia', -1);
    }
    if (mes === 24) {
      A.setPolitica('verde', 50);
      A.setPolitica('militar', 3.0);
      A.submeterPolitica();
    }
    if (mes === 30) {
      A.proporReforma('leis_drogas', 1);
      A.reformaLei('midia', 1);
    }
    if (mes === 36) A.setAlternador('bancosPublicos');
    if (mes === 42) A.proporReforma('fiscal_resp', -1);
  };

  const snaps: Record<string, unknown> = {};
  for (let mes = 0; mes < 48; mes++) {
    acoes(mes);
    g.getState().avancar();
    let guarda = 0;
    while (guarda++ < 60) {
      const st = g.getState();
      if (!st.cerimoniaId) break;
      const c = st.w?.paises[st.w.jogadorId];
      const p = c?.propostas?.find((x) => x.id === st.cerimoniaId);
      if (p?.fase === 'sancao') st.sancionarCerimonia();
      else st.concluirCerimonia();
    }
    if ((mes + 1) % 12 === 0) snaps[String(mes + 1)] = snapshot(g.getState());
  }

  const acumulado: Record<string, unknown> = { etapas: snaps, final: null };
  const gFim = g.getState();
  const wFim = gFim.w!;
  const c = wFim.paises[wFim.jogadorId]!;
  acumulado.final = { jogadorId: wFim.jogadorId, mesesPoder: wFim.mesesPoder };

  const json = JSON.stringify(acumulado, null, 0);
  const hash = createHash('sha256').update(json).digest('hex');
  const caminho = process.argv[2] as string | undefined;
  if (caminho === '--gravar') {
    writeFileSync('src/tests/baseline.json', JSON.stringify({ hash, dados: acumulado }, null, 1), 'utf8');
    console.log('BASELINE_GRAVADA hash=' + hash.slice(0, 16));
  } else {
    const disco = JSON.parse(readFileSync('src/tests/baseline.json', 'utf8')) as { hash: string; dados: unknown };
    const igual = JSON.stringify(disco.dados) === json;
    console.log('HASH_ATUAL=' + hash.slice(0, 16) + ' HASH_BASE=' + (disco.hash?.slice(0, 16) ?? '?'));
    if (disco.hash === hash) {
      console.log('EQUIVALENCIA_OK');
    } else if (igual) {
      console.log('EQUIVALENCIA_JSON_OK (hash diferente mas conteúdo idêntico)');
    } else {
      console.log('EQUIVALENCIA_FALHOU');
      // localiza primeira divergência
      const diff = JSONDiff(JSON.parse(json), disco.dados);
      console.log('DIVERGENCIA: ' + diff);
      process.exitCode = 1;
    }
  }

  void c;
};

function JSONDiff(a: unknown, b: unknown, raiz = ''): string | null {
  if (typeof a !== typeof b) return `${raiz} (tipo ${typeof a} vs ${typeof b})`;
  if (a === null || b === null) return a === b ? null : `${raiz} (null vs valor)`;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return `${raiz}`;
    if (a.length !== b.length) return `${raiz} (tamanho ${a.length} vs ${b.length})`;
    for (let i = 0; i < a.length; i++) {
      const d = JSONDiff(a[i], b[i], `${raiz}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (typeof a === 'object') {
    const bk = b as Record<string, unknown>;
    for (const k of Object.keys(a as Record<string, unknown>)) {
      if (!(k in bk)) return `${raiz}.${k} (ausente)`;
    }
    for (const k of Object.keys(a as Record<string, unknown>)) {
      const d = JSONDiff((a as Record<string, unknown>)[k], bk[(k as string) as keyof typeof bk], `${raiz}.${k}`);
      if (d) return d;
    }
    return null;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) > 1e-4 ? `${raiz} (${a} vs ${b})` : null;
  }
  return a === b ? null : `${raiz} (${String(a)} vs ${String(b)})`;
}

MAIN();