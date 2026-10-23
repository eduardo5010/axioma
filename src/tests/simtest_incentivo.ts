import type { Country, World } from '../engine/types';
import { criaMundo } from '../engine/init';
import { passoMundial } from '../engine/simulation';
import { REFORMAS_MAP } from '../engine/data/normas/catalogo';
import { aliquotaCorpEfetiva } from '../engine/incentivoCorp';

// Teste de mecanica do incentivo corporativo. Compara um mundo de controle com um
// mundo identico (mesma semente) onde a reforma e ativada, e media os deltas em
// varias sementes para cancelar o ruido de divergencia de RNG.
//
// Uso: npx --no-install tsx src/tests/simtest_incentivo.ts [pais] [meses] [sementes]

const PAIS = process.argv[2] ?? 'bra';
const MESES = Number(process.argv[3] ?? 18);
const SEMENTES = Number(process.argv[4] ?? 12);
const PARAM = 21;
const META = 6;

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Ponto {
  desemprego: number; inflacao: number; salarios: number; receitaPct: number;
  crescimento: number; gdp: number; efetiva: number; desconto: number;
}

const roda = (seed: number, tratamento: boolean): Ponto => {
  Math.random = mulberry32(seed);
  const w: World = criaMundo(PAIS);
  const c = w.paises[PAIS] as Country;
  if (tratamento) {
    c.reformas['incentivo_corporativo'] = 1;
    c.impostos = c.impostos ?? {};
    c.impostos['incentivo_corporativo'] = PARAM;
    c.corpIncentivo = {
      descontos: { precos: META, oferta: META, salarios: META, emprego: META },
      desconto: 0, efetiva: PARAM, realizado: { precos: 0, oferta: 0, salarios: 0, emprego: 0 },
    };
  }
  for (let i = 0; i < MESES; i++) passoMundial(w);
  return {
    desemprego: c.desemprego,
    inflacao: c.inflacao,
    salarios: c.indicadores.salarios ?? 50,
    receitaPct: c.receitaPct,
    crescimento: c.crescimento,
    gdp: c.gdp,
    efetiva: aliquotaCorpEfetiva(c),
    desconto: c.corpIncentivo?.desconto ?? 0,
  };
};

const def = REFORMAS_MAP['incentivo_corporativo'];
if (!def) throw new Error('reforma incentivo_corporativo ausente');
if (def.tipo !== 'ativa') throw new Error(`esperado tipo 'ativa', obtido '${def.tipo}'`);

let n = 0;
const soma = { desemprego: 0, inflacao: 0, salarios: 0, receitaPct: 0, crescimento: 0, gdp: 0, efetiva: 0, desconto: 0 };
let descontoMedioTrat = 0;
let efetivaTrat = 0;

for (let s = 1; s <= SEMENTES; s++) {
  const seed = 20260900 + s * 7;
  const ctl = roda(seed, false);
  const trt = roda(seed, true);
  soma.desemprego += trt.desemprego - ctl.desemprego;
  soma.inflacao += trt.inflacao - ctl.inflacao;
  soma.salarios += trt.salarios - ctl.salarios;
  soma.receitaPct += trt.receitaPct - ctl.receitaPct;
  soma.crescimento += trt.crescimento - ctl.crescimento;
  soma.gdp += (trt.gdp - ctl.gdp) / ctl.gdp;
  descontoMedioTrat += trt.desconto;
  efetivaTrat += trt.efetiva;
  n++;
}

const media = (x: number) => x / n;
const pct = (x: number) => (x * 100).toFixed(2);
const num = (x: number) => x.toFixed(2);

console.log(`reforma: ${REFORMAS_MAP['incentivo_corporativo']?.nome} · bloco ${REFORMAS_MAP['incentivo_corporativo']?.bloco} · tipo ${REFORMAS_MAP['incentivo_corporativo']?.tipo}`);
console.log(`pais ${PAIS} · ${MESES} meses · ${n} sementes`);
console.log(`  desemprego ......... ${num(media(soma.desemprego))} pp`);
console.log(`  inflacao ........... ${num(media(soma.inflacao))} pp`);
console.log(`  salarios (indice) .. ${num(media(soma.salarios))}`);
console.log(`  receita ............ ${num(media(soma.receitaPct))} pp do PIB`);
console.log(`  crescimento ........ ${num(media(soma.crescimento))} pp`);
console.log(`  PIB ................ ${pct(media(soma.gdp))}%`);
console.log(`  aliq. efetiva ...... ${num(media(efetivaTrat))}% (original ${PARAM}%)`);
console.log(`  desconto concedido . ${num(media(descontoMedioTrat))} p.p.`);
console.log('\nFIM');
