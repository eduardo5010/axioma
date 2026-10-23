import { criaMundo } from '../engine/init';
import { propoeReforma, cancelarProposta, aplicaEfeitosReformas } from '../engine/propostas';
import { REFORMAS } from '../engine/data/normas/catalogo';
import { SCALAR_LIMITS } from '../engine/propostas';
import type { Country } from '../engine/types';

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error('FAIL:', msg);
    throw new Error(msg);
  }
  console.log('ok:', msg);
};

const w = criaMundo('bra');
const c = w.paises['bra'] as Country;
assert(!!c, 'brasil criado');

const ids = REFORMAS.map((r) => r.id);
assert(ids.length >= 112, `112+ reformas definidas (${ids.length})`);
assert(new Set(ids).size === ids.length, 'ids de reforma únicos');

const escalaresAutoridade = Object.keys(SCALAR_LIMITS);
const efeitosBad: string[] = [];
for (const r of REFORMAS) {
  for (const k of Object.keys(r.efeito)) {
    if (k === 'democracia' || k.startsWith('politica:')) continue;
    if (k.startsWith('ind:')) continue;
    if (!escalaresAutoridade.includes(k)) efeitosBad.push(`${r.id}:${k}`);
  }
}
if (efeitosBad.length) console.log('efeitos não mapeados em SCALAR_LIMITS:', efeitosBad.join(', '));
assert(efeitosBad.length === 0, 'todos os efeitos escalares mapeados em SCALAR_LIMITS');

const inicialGini = c.gini;
const r1 = propoeReforma(w, c, 'bolsa_valor', 1);
assert(r1.ok === true, 'proposta de reforma criada');
assert(c.propostas.some((p) => p.tipo === 'reforma' && p.reforma === 'bolsa_valor'), 'reforma entra em propostas');

cancelarProposta(c, c.propostas.find((p) => p.reforma === 'bolsa_valor')!.id);
assert(!c.propostas.some((p) => p.reforma === 'bolsa_valor'), 'cancelarProposta remove');

const r2 = propoeReforma(w, c, 'bolsa_valor', 1);
assert(r2.ok, 'repropõe após cancelar');
c.reformas['bolsa_valor'] = 1;
aplicaEfeitosReformas(c);
assert(c.reformas['bolsa_valor'] === 1, 'pilha registrada');
console.log(' gini:', inicialGini, '->', c.gini);
assert(c.reformasInd['pobreza'] !== undefined, 'ind:pobreza acumulado em reformasInd');

const r3 = propoeReforma(w, c, 'bolsa_valor', 1);
assert(r3.ok === false, 'ativa já em vigor não pode adotar de novo');
const r3b = propoeReforma(w, c, 'bolsa_valor', -1);
assert(r3b.ok === true, 'revogação vira proposta/fila');
const pRev = c.propostas.find((p) => p.reforma === 'bolsa_valor');
assert(pRev?.delta === -1, 'proposta pendente vira revogação');

const wiel = criaMundo('usa');
const us = wiel.paises['usa'] as Country;
const r4 = propoeReforma(wiel, us, 'jas_x', 1);
assert(r4.ok === false && !!r4.motivo, 'reforma inexistente bloqueada');
const r5 = propoeReforma(wiel, us, 'estado_laico', 1);
assert(r5.ok, 'proposta enviada mesmo em democracia');

const total = REFORMAS.length;
const emPilhas = REFORMAS.filter((r) => r.tipo === 'empilhavel').length;
console.log(`Total: ${total} reformas · empilháveis: ${emPilhas} · blocos:`, Object.fromEntries(['receita','gasto','economia','politica'].map((b) => [b, REFORMAS.filter((r) => r.bloco === b).length])));

const antor = criaMundo('chn');
const chn = antor.paises['chn'] as Country;
const ra = propoeReforma(antor, chn, 'controle_armas2', 1);
assert(ra.ok, 'autoritário propõe sem vetos');
console.log(' demo antes:', chn.democracia, 'gente:', chn.populacao);

console.log('\nFIM');