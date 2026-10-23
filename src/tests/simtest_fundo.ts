import { criaMundo } from '../engine/init';
import { passoFinancas, passoFundoSoberano, taxaMediaGlobal } from '../engine/economy';
import { propoeReforma, aplicarProposta } from '../engine/propostas';
import { REFORMAS_MAP } from '../engine/data/normas/catalogo';
import { par } from '../engine/normas/registro';
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

const inativo = passoFundoSoberano(c, w);
assert(inativo.aporte === 0 && inativo.dividendo === 0 && inativo.venda === 0, 'fundo inativo retorna zeros');

const meta = REFORMAS_MAP['fundo_soberano'];
assert(!!meta, 'reforma no REFORMAS_MAP');
assert(meta.bloco === 'economia' && meta.tipo === 'ativa' && meta.parametro?.padrao === 1, 'metadados da reforma');

const r1 = propoeReforma(w, c, 'fundo_soberano', 1, 1);
assert(r1.ok, `proposta de X=1 aceita (${r1.motivo ?? ''})`);
const p1 = c.propostas.find((x) => x.reforma === 'fundo_soberano')!;
assert(p1.param === 1, 'parâmetro da proposta = 1');
aplicarProposta(w, c, p1);
assert(c.reformas['fundo_soberano'] === 1, 'reforma ativa');
assert(c.impostos?.fundo_soberano === 1, 'impostos registrado = 1');

const taxa = taxaMediaGlobal(w);
assert(taxa >= par('fundo.taxa.min') && taxa <= par('fundo.taxa.max'), `taxa global no clamp (${taxa.toFixed(2)}% a.a.)`);

const pibGlobal = Object.values(w.paises).reduce((a, x) => a + x.gdp, 0);
const alvo = Math.min((1 / 100) * par('fundo.mult.mercado') * pibGlobal, par('fundo.cap.pib') * c.gdp);
const divida0 = c.dividaPct;
let mes1Div = 0, mes2Div = 0;
for (let m = 1; m <= 120; m++) {
  passoFinancas(c, w);
  if (m === 1) mes1Div = c.orcamento.fundoDividendo;
  if (m === 2) mes2Div = c.orcamento.fundoDividendo;
}
assert(c.orcamento.fundoAporte >= 0, 'aporte nunca negativo');
assert(mes1Div === 0, 'primeiro mês sem dividendos (fundo vazio)');
assert(mes2Div > 0, `dividendos começam no 2º mês (${mes2Div.toFixed(3)}% PIB·ano)`);
assert((c.fundoValor ?? 0) >= alvo * 0.98, `fundo converge ao alvo (${(c.fundoValor ?? 0).toFixed(1)} vs ${alvo.toFixed(1)})`);
assert(c.fundoValor! <= par('fundo.cap.pib') * c.gdp * 1.0000001, 'respeita teto de % do PIB próprio');
assert(c.dividaPct > divida0, `construção endivida (${divida0.toFixed(1)} -> ${c.dividaPct.toFixed(1)})`);

const antesVenda = c.dividaPct;
const r2 = propoeReforma(w, c, 'fundo_soberano', 1, 0);
assert(r2.ok, `redefinição X=0 aceita (${r2.motivo ?? ''})`);
aplicarProposta(w, c, c.propostas.find((x) => x.reforma === 'fundo_soberano')!);
assert(c.impostos?.fundo_soberano === 0, 'impostos atualizado = 0');
passoFinancas(c, w);
assert((c.fundoValor ?? 0) === 0, 'X=0 drena o fundo');
assert(c.dividaPct < antesVenda, `venda abate dívida (${antesVenda.toFixed(1)} -> ${c.dividaPct.toFixed(1)})`);

propoeReforma(w, c, 'fundo_soberano', 1, 2);
aplicarProposta(w, c, c.propostas.find((x) => x.reforma === 'fundo_soberano')!);
for (let m = 0; m < 24; m++) passoFinancas(c, w);
assert((c.fundoValor ?? 0) > 0, 'fundo reconstruído');
const antesRev = c.dividaPct;
const r3 = propoeReforma(w, c, 'fundo_soberano', -1);
assert(r3.ok, `revogação aceita (${r3.motivo ?? ''})`);
aplicarProposta(w, c, c.propostas.find((x) => x.reforma === 'fundo_soberano')!);
assert(c.reformas['fundo_soberano'] === 0, 'reforma revogada');
assert((c.fundoValor ?? 0) === 0, 'revogação liquida o fundo');
assert(c.dividaPct < antesRev, `revogação abate dívida (${antesRev.toFixed(1)} -> ${c.dividaPct.toFixed(1)})`);
assert(c.impostos?.fundo_soberano === undefined, 'impostos removido na revogação');

console.log('FIM');
