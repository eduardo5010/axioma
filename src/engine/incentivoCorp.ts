import type { Country, CorpIncentivo } from './types';
import { clamp } from './util';
import { par } from './normas/registro';

/**
 * Incentivo ao imposto corporativo.
 *
 * O jogador define a alíquota corporativa "original" (parâmetro da reforma
 * `incentivo_corporativo`) e metas de desconto para quatro boas práticas
 * (preços, oferta, salários, emprego). A cada mês mede-se a fração realizada de
 * cada prática a partir dos indicadores; o desconto concedido é a soma das metas
 * ponderadas pela realização, e a alíquota efetiva é a original menos o desconto.
 * Os bônus econômicos e o IR extra pela folha maior escalam com a realização.
 *
 * Com a reforma inativa, `aliquotaCorpEfetiva` retorna `politica.corporativo`,
 * de modo que nada muda em relação ao comportamento anterior.
 */

export const incentivoAtivo = (c: Country): boolean => (c.reformas?.incentivo_corporativo ?? 0) > 0;

export const aliquotaOriginal = (c: Country): number => {
  if (!incentivoAtivo(c)) return c.politica.corporativo;
  return clamp(c.impostos?.incentivo_corporativo ?? c.politica.corporativo, 0.5, 45);
};

/** Alíquota corporativa efetiva usada por potencial de PIB, receita e lucro. */
export const aliquotaCorpEfetiva = (c: Country): number => {
  if (!incentivoAtivo(c)) return c.politica.corporativo;
  return clamp(c.corpIncentivo?.efetiva ?? aliquotaOriginal(c), 0, 45);
};

const frac = (x: number): number => clamp(x, 0, 1);
const respiro = (v: number, base: number, div: number): number => frac((v - base) / div);
const ZERO = { precos: 0, oferta: 0, salarios: 0, emprego: 0 };

const descontosDe = (c: Country): CorpIncentivo['descontos'] => c.corpIncentivo?.descontos ?? { ...ZERO };

/** Calcula o estado do mês (realização, desconto concedido, alíquota efetiva). */
export const computaIncentivoCorp = (c: Country): void => {
  const d = descontosDe(c);
  if (!incentivoAtivo(c)) {
    c.corpIncentivo = { descontos: d, desconto: 0, efetiva: c.politica.corporativo, realizado: { ...ZERO } };
    return;
  }
  const ind = c.indicadores ?? {};
  const manuf = ind.setor_manufatura ?? 50;
  const sal = ind.salarios ?? 50;
  const base = c.corpIncentivo?.base ?? { precos: c.inflacao, oferta: manuf, salarios: sal, emprego: c.desemprego };
  const realizado = {
    // Estabilidade de preços é meta absoluta; as demais combinam nível e melhora desde a ativação.
    precos: frac((par('inc.preco.alvo') - c.inflacao) / par('inc.preco.alvo')),
    oferta: Math.max(respiro(manuf, par('inc.oferta.base'), par('inc.oferta.div')), frac((manuf - base.oferta) / par('inc.oferta.div'))),
    salarios: Math.max(respiro(sal, par('inc.salario.base'), par('inc.salario.div')), frac((sal - base.salarios) / par('inc.salario.div'))),
    emprego: Math.max(frac((par('inc.emprego.alvo') - c.desemprego) / par('inc.emprego.div')), frac((base.emprego - c.desemprego) / par('inc.emprego.div'))),
  };
  const max = par('inc.desconto.max');
  const desconto =
    clamp(d.precos, 0, max) * realizado.precos +
    clamp(d.oferta, 0, max) * realizado.oferta +
    clamp(d.salarios, 0, max) * realizado.salarios +
    clamp(d.emprego, 0, max) * realizado.emprego;
  c.corpIncentivo = { descontos: d, desconto, efetiva: clamp(aliquotaOriginal(c) - desconto, 0, 45), realizado, base };
};

/** Aplica os bônus mensais de indicadores, proporcionais à realização conquistada. */
export const aplicaBonusIncentivoCorp = (c: Country): void => {
  const ci = c.corpIncentivo;
  if (!incentivoAtivo(c) || !ci) return;
  const orig = aliquotaOriginal(c);
  if (orig <= 0) return;
  const max = par('inc.desconto.max');
  const r = ci.realizado;
  const gPreco = (clamp(ci.descontos.precos, 0, max) * r.precos) / orig;
  const gOferta = (clamp(ci.descontos.oferta, 0, max) * r.oferta) / orig;
  const gSal = (clamp(ci.descontos.salarios, 0, max) * r.salarios) / orig;
  const gEmp = (clamp(ci.descontos.emprego, 0, max) * r.emprego) / orig;
  if (gPreco + gOferta + gSal + gEmp <= 0) return;
  const add = (id: string, v: number): void => {
    c.indicadores[id] = clamp((c.indicadores[id] ?? 50) + v, 0, 100);
  };
  add('salarios', par('inc.bonus.salario') * gSal);
  add('consumo_real', par('inc.bonus.consumo') * ((gSal + gEmp) / 2));
  add('comercio_domestico', par('inc.bonus.comercio') * ((gSal + gEmp) / 2));
  add('setor_manufatura', par('inc.bonus.oferta') * gOferta + par('inc.bonus.emprego') * gEmp);
  add('agricultura_privada', par('inc.bonus.agro') * gOferta);
  add('produtividade', par('inc.bonus.prod') * gOferta);
  add('investimento_privado', par('inc.bonus.invest') * ((gOferta + gSal + gEmp) / 3));
  add('confianca_empresarial', par('inc.bonus.confianca') * ((gPreco + gOferta + gSal + gEmp) / 4));
  add('custo_vida', -par('inc.bonus.custo') * gPreco);
  add('preco_alimentos_idx', -par('inc.bonus.alim') * gPreco);
};

/**
 * Fração de PIB somada à receita tributária como imposto de renda extra pela
 * folha maior (antes de sonegação), proporcional ao desconto concedido.
 */
export const receitaIncentivoFolha = (c: Country): number => {
  const ci = c.corpIncentivo;
  if (!incentivoAtivo(c) || !ci) return 0;
  const orig = aliquotaOriginal(c);
  if (orig <= 0) return 0;
  return (ci.desconto / orig) * par('inc.receita.folha');
};

/**
 * Puxada direta sobre o desemprego (p.p.), proporcional à fração realizada da
 * prática de contratação. Só atua com a reforma ativa; zero caso contrário.
 */
export const puxaEmpregoCorp = (c: Country): number => {
  const ci = c.corpIncentivo;
  if (!incentivoAtivo(c) || !ci) return 0;
  return par('inc.emprego.puxa') * ci.realizado.emprego;
};
