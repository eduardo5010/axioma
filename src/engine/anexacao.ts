import type { Country, ConstrucaoId, PesquisaKey, World } from './types';
import { clamp, fmtBilhoes, fmtMes, fmtPop } from './util';
import { notifica } from './data/events';
import { computaIndicadores, computaGlobal } from './indicadores';
import { passoFinancas } from './economy';
import { calculaPrestigio } from './prestige';

/**
 * Anexa todo o planeta em um único comando: o país do jogador absorve as
 * características de todas as nações (demografia, economia, sociedade,
 * militar, ciência e infraestrutura) e os demais países saem do tabuleiro.
 * Ao final, todos os valores são recalculados de forma realista. Retorna o
 * número de países anexados (0 se já não há mais outras nações).
 */
export const anexaPlaneta = (w: World): number => {
  const id = w.jogadorId;
  const c = w.paises[id];
  if (!c) return 0;
  const outrosIds = Object.keys(w.paises).filter((x) => x !== id);
  if (outrosIds.length === 0) return 0;

  const todos = Object.values(w.paises);
  const gdpTot = todos.reduce((a, p) => a + p.gdp, 0) || 1;
  const popTot = todos.reduce((a, p) => a + p.populacao, 0) || 1e6;
  const wGdp = (p: Country) => p.gdp / gdpTot;
  const wPop = (p: Country) => p.populacao / popTot;

  // ------- Demografia & sociedade (ponderado por população) -------
  c.populacao = popTot;
  c.forcaTrabalho = clamp(todos.reduce((a, p) => a + p.forcaTrabalho * wPop(p), 0), 0, 1);
  c.idadeMedia = todos.reduce((a, p) => a + p.idadeMedia * wPop(p), 0);
  c.urbano = clamp(todos.reduce((a, p) => a + p.urbano * wPop(p), 0), 0, 1);
  c.fertilidade = clamp(todos.reduce((a, p) => a + p.fertilidade * wPop(p), 0), 0.5, 5);
  c.expectativaVida = todos.reduce((a, p) => a + p.expectativaVida * wPop(p), 0);
  c.educacaoIdx = todos.reduce((a, p) => a + (p.educacaoIdx ?? 5) * wPop(p), 0);
  c.saudeIdx = todos.reduce((a, p) => a + (p.saudeIdx ?? 5) * wPop(p), 0);
  c.infraestrutura = todos.reduce((a, p) => a + (p.infraestrutura ?? 40) * wPop(p), 0);
  c.felicidade = todos.reduce((a, p) => a + p.felicidade * wPop(p), 0);
  c.religiosidade = clamp(todos.reduce((a, p) => a + p.religiosidade * wPop(p), 0), 0, 1);
  c.gini = clamp(todos.reduce((a, p) => a + p.gini * wPop(p), 0), 0.2, 0.68);
  c.desemprego = clamp(todos.reduce((a, p) => a + p.desemprego * wPop(p), 0), 2.8, 35);

  // ------- Economia (ponderado por PIB) -------
  c.gdp = gdpTot;
  c.crescimento = clamp(todos.reduce((a, p) => a + p.crescimento * wGdp(p), 0), -5, 15);
  c.inflacao = clamp(todos.reduce((a, p) => a + p.inflacao * wGdp(p), 0), 0.2, 60);
  c.democracia = clamp(todos.reduce((a, p) => a + p.democracia * wGdp(p), 0), 0.03, 0.97);
  c.abertura = Math.max(70, todos.reduce((a, p) => a + p.abertura * wGdp(p), 0));
  c.emissaoCo2 = todos.reduce((a, p) => a + (p.emissaoCo2 ?? 35) * wGdp(p), 0);
  c.recurso = 'nenhum';
  c.indiceRecurso = 1;
  c.dividaPct = clamp(
    todos.reduce((acc, p) => acc + (p.dividaPct / 100) * p.gdp, 0) / gdpTot * 100,
    0, 350,
  );

  const setores = todos.reduce(
    (acc, p) => {
      const pb = p.setores.agricultura ?? 0;
      const pi = p.setores.industria ?? 0;
      const sv = p.setores.servicos ?? 0;
      const tot = pb + pi + sv || 1;
      return {
        agricultura: acc.agricultura + (pb / tot) * p.gdp,
        industria: acc.industria + (pi / tot) * p.gdp,
        servicos: acc.servicos + (sv / tot) * p.gdp,
      };
    },
    { agricultura: 0, industria: 0, servicos: 0 },
  );
  const somaSetores = setores.agricultura + setores.industria + setores.servicos || 1;
  c.setores = {
    agricultura: clamp(setores.agricultura / somaSetores, 0, 1),
    industria: clamp(setores.industria / somaSetores, 0, 1),
    servicos: clamp(setores.servicos / somaSetores, 0, 1),
  };

  // ------- Militar & Estado (absorção total) -------
  c.militar.ativo = todos.reduce((a, p) => a + p.militar.ativo, 0);
  c.militar.reserva = todos.reduce((a, p) => a + p.militar.reserva, 0);
  c.militar.orcamento = clamp(todos.reduce((a, p) => a + p.militar.orcamento, 0), 0, 100);
  c.militar.tecnologia = clamp(todos.reduce((a, p) => a + p.militar.tecnologia * wGdp(p), 0), 0, 1);
  c.militar.prontidao = todos.reduce((a, p) => a + p.militar.prontidao * wPop(p), 0);
  c.militar.nuclear = todos.some((p) => p.militar.nuclear);
  c.funcionariosMil = todos.reduce((a, p) => a + (p.funcionariosMil ?? 0), 0);

  const construcoes: Record<ConstrucaoId, number> = { ...c.construcoes };
  for (const p of todos) {
    for (const [chave, qtd] of Object.entries(p.construcoes ?? {})) {
      const k = chave as ConstrucaoId;
      construcoes[k] = Math.max(construcoes[k] ?? 0, 0) + qtd;
    }
  }
  c.construcoes = construcoes;

  c.pesquisa.militar = clamp(todos.reduce((a, p) => a + p.pesquisa.militar * wGdp(p), 0), 0, 100);
  c.pesquisa.industrial = clamp(todos.reduce((a, p) => a + p.pesquisa.industrial * wGdp(p), 0), 0, 100);
  c.pesquisa.social = clamp(todos.reduce((a, p) => a + p.pesquisa.social * wGdp(p), 0), 0, 100);
  c.pesquisa.espacial = clamp(todos.reduce((a, p) => a + (p.pesquisa.espacial ?? 5) * wGdp(p), 0), 0, 100);
  const invest = { ...c.pesquisaInvest };
  for (const k of Object.keys(invest) as PesquisaKey[]) {
    invest[k] = clamp(todos.reduce((a, p) => a + (p.pesquisaInvest?.[k] ?? 50) * wPop(p), 0), 0, 100);
  }
  c.pesquisaInvest = invest;

  const maisAvancado = todos.reduce((a, p) => (p.gdp > a.gdp ? p : a), c);
  if (maisAvancado !== c) {
    c.politica = { ...maisAvancado.politica };
    c.leis = { ...maisAvancado.leis };
    c.ideologia = { ...maisAvancado.ideologia };
    c.regime = maisAvancado.regime;
  }

  c.tensao = 0;
  c.guerra = false;
  c.perdasGuerra = 0;
  c.infamia = 0;
  c.estabilidade = clamp(65, -30, 100);
  c.aprovacao = clamp(c.aprovacao + 25, -100, 100);

  // ------- O mundo contrai -------
  const nomeJ = c.name;
  for (const p of todos) p.guerra = false;
  w.paises = { [id]: c };
  w.relacoes = { [id]: { [id]: 100 } };
  w.guerras = [];
  w.tratados = [];
  w.crises = [];
  w.decisao = null;
  w.tensaoGlobal = clamp(w.tensaoGlobal * 0.2, 0, 20);
  w.noticias.push({ mes: fmtMes(new Date().getFullYear(), 1), texto: `🌍 ${nomeJ} anexou todas as nações do planeta sob um único governo mundial.`, tom: 'bom' });

  // ------- Recalculo realista -------
  computaIndicadores(c, w);
  passoFinancas(c, w);
  computaGlobal(w);
  calculaPrestigio(w);

  notifica(w, `🌍 ${nomeJ} anexou o planeta inteiro: ${outrosIds.length} nações absorvidas. População ${fmtPop(c.populacao)}, PIB ${fmtBilhoes(c.gdp)}, ${Math.round(c.gini * 100) / 100} de Gini.`, 'bom', id);
  return outrosIds.length;
};