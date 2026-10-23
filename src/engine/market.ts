import { Country, World } from './types';
import { clamp, drifta, rand } from './util';
import { bonusMercado, valorSetor } from './sectores';
import { SETORES, type GrupoSetor, type SetorDef } from './data/sectores';

export type GoodsKey = 'alimento' | 'petroleo' | 'gaz' | 'minerais' | 'manufactura' | 'energia';

export const GOODS: GoodsKey[] = ['alimento', 'petroleo', 'gaz', 'minerais', 'manufactura', 'energia'];

export const GOODS_PCOS: Record<GoodsKey, number> = {
  alimento: 14,
  petroleo: 36,
  gaz: 24,
  minerais: 22,
  manufactura: 34,
  energia: 18,
};

const PRECO_BASE_GRUPO: Record<GrupoSetor, number> = {
  agro: 18,
  mineracao: 30,
  industria: 26,
  energia: 16,
  transporte: 24,
  servicos: 18,
  tecnologia: 42,
  defesa: 34,
  construcao: 22,
  financas: 28,
  cultura: 16,
};

const CONS_GRUPO: Record<GrupoSetor, number> = {
  agro: 0.45,
  mineracao: 0.55,
  industria: 0.5,
  energia: 0.4,
  transporte: 0.42,
  servicos: 0.5,
  tecnologia: 0.55,
  defesa: 0.35,
  construcao: 0.48,
  financas: 0.52,
  cultura: 0.4,
};

export function precoBaseSetor(def: SetorDef): number {
  return clamp((PRECO_BASE_GRUPO[def.grupo] ?? 25) + def.peso * 4, 5, 90);
}

export function producaoSetor(c: Country, def: SetorDef): number {
  const val = valorSetor(c, def.id);
  const porte = 2.2 + Math.log10(c.populacao + 1) * 1.4;
  return val * porte * (def.exportavel ? 1.05 : 0.85);
}

export function consumoSetor(c: Country, def: SetorDef): number {
  const renda = 0.5 + (c.pops.sol / 100) * 0.9;
  return c.populacao * (CONS_GRUPO[def.grupo] ?? 0.5) * def.peso * 0.5 * renda * (def.exportavel ? 0.9 : 1.05);
}

export function saldoSetor(c: Country, def: SetorDef): number {
  return producaoSetor(c, def) - consumoSetor(c, def);
}

export function producaoDe(c: Country, g: GoodsKey): number {
  const pesq = c.pesquisa.industrial / 100;
  const so = c.setores;
  const guerra = c.guerra ? (g === 'energia' ? 0.9 : 0.82) : 1;
  switch (g) {
    case 'alimento':
      return (so.agricultura * 260 + (c.recurso === 'alimento' ? c.indiceRecurso * 160 : 0) + 40 + pesq * 40 + bonusMercado(c, 'alimento')) * guerra;
    case 'petroleo':
      return (c.recurso === 'petroleo' ? c.indiceRecurso * 220 + bonusMercado(c, 'petroleo') : 0) * guerra;
    case 'gaz':
      return (c.recurso === 'gas' ? c.indiceRecurso * 150 + bonusMercado(c, 'gaz') : 0) * guerra;
    case 'minerais':
      return (c.recurso === 'minerais' ? c.indiceRecurso * 190 + bonusMercado(c, 'minerais') : 0) * guerra;
    case 'manufactura':
      return (so.industria * 300 + pesq * 90 + c.pesquisa.militar / 100 * 30 + bonusMercado(c, 'manufactura')) * guerra;
    case 'energia':
      return ((so.industria * 60 + c.politica.renovaveis / 100 * 90 + c.recurso === 'gaz' ? c.indiceRecurso * 30 : 0) + 40 + bonusMercado(c, 'energia')) * guerra;
  }
}

export function consumoDe(c: Country, g: GoodsKey): number {
  const pop = c.populacao;
  const s = c.pops.sol / 100;
  const so = c.setores;
  const guerra = c.guerra ? 1.08 : 1;
  switch (g) {
    case 'alimento':
      return pop * (0.085 + s * 0.06) * guerra;
    case 'petroleo':
      return pop * (0.04 + so.industria * 0.3 + c.politica.renovaveis / 100 * -0.15);
    case 'gaz':
      return pop * (0.035 + so.industria * 0.2 + c.politica.verde / 100 * -0.1);
    case 'minerais':
      return pop * (0.02 + so.industria * 0.45);
    case 'manufactura':
      return pop * (0.05 + s * 0.06 + so.industria * 0.12);
    case 'energia':
      return pop * (0.075 + s * 0.04) * guerra;
  }
}

export function saldoDe(c: Country, g: GoodsKey): number {
  return producaoDe(c, g) - consumoDe(c, g);
}

function ofertaDemanda(w: World, g: GoodsKey): { oferta: number; demanda: number } {
  let oferta = 0;
  let demanda = 0;
  for (const c of Object.values(w.paises)) {
    const p = producaoDe(c, g);
    const d = consumoDe(c, g);
    oferta += Math.max(0, p);
    demanda += Math.max(0, d);
  }
  return { oferta, demanda };
}

export function iniciaMercado(w: World): void {
  w.mercado = {};
  for (const g of GOODS) {
    const { oferta, demanda } = ofertaDemanda(w, g);
    w.mercado[g] = { preco: GOODS_PCOS[g], oferta, demanda };
  }
  for (const def of SETORES) {
    const { oferta, demanda } = setorOfertaDemanda(w, def);
    w.mercado[def.id] = { preco: precoBaseSetor(def), oferta, demanda };
  }
}

function setorOfertaDemanda(w: World, def: SetorDef): { oferta: number; demanda: number } {
  let oferta = 0;
  let demanda = 0;
  for (const c of Object.values(w.paises)) {
    const p = producaoSetor(c, def);
    const d = consumoSetor(c, def);
    oferta += Math.max(0, p);
    demanda += Math.max(0, d);
  }
  return { oferta, demanda };
}

function passoSetorMercado(w: World, def: SetorDef): void {
  const base = precoBaseSetor(def);
  const m = w.mercado[def.id];
  const { oferta, demanda } = setorOfertaDemanda(w, def);
  const alvo = m ? m.preco * (1.05 + (oferta > 0 ? (demanda - oferta) / oferta : 0.05)) : base;
  w.mercado[def.id] = {
    preco: clamp(drifta(m?.preco ?? base, alvo, 0.3) + rand(-0.6, 0.6), base * 0.45, base * 1.9),
    oferta,
    demanda,
  };
}

export const mercadoPrecisaIniciar = (w: World): boolean =>
  !w.mercado || Object.keys(w.mercado).length <= GOODS.length;

export function passoMercado(w: World): void {
  for (const g of GOODS) {
    const m = w.mercado[g];
    const { oferta, demanda } = ofertaDemanda(w, g);
    const alvo = m.preco * (1.04 + (oferta > 0 ? (demanda - oferta) / oferta : 0.04));
    m.preco = clamp(drifta(m.preco, alvo, 0.35) + rand(-0.4, 0.4), GOODS_PCOS[g] * 0.45, GOODS_PCOS[g] * 1.9);
    m.oferta = oferta;
    m.demanda = demanda;
  }
  for (const def of SETORES) passoSetorMercado(w, def);
  w.crescimentoGlobal = clamp(w.crescimentoGlobal * 0.96 + (Math.random() * 1.0 - 0.45), -1.5, 4);
}

export function indiceGlobalPreco(w: World): number {
  let soma = 0;
  for (const g of GOODS) soma += (w.mercado[g]?.preco ?? GOODS_PCOS[g]);
  return soma / GOODS.length;
}

export function saldoComercialPct(c: Country, w: World): number {
  let pts = 0;
  let importPts = 0;
  for (const g of GOODS) {
    const cons = consumoDe(c, g) + 0.001;
    const net = saldoDe(c, g);
    const rel = net / cons;
    const precoRel = (w.mercado[g]?.preco ?? GOODS_PCOS[g]) / GOODS_PCOS[g];
    pts += rel * precoRel;
    if (rel < 0) importPts += -rel * precoRel;
  }
  pts = clamp(pts, -3, 4);
  let saldo = pts * 1.7;
  saldo += (c.politica.comercio / 100) * 0.05;
  saldo -= (c.politica.tarifas / 150) * (importPts * 0.4);
  saldo += ((c.indicadores.qualidade_infra ?? 50) - 50) * 0.006;
  saldo += ((c.indicadores.exportacoes ?? 50) - 50) * 0.004;
  saldo += (c.militar.nuclear ? -0.2 : 0);
  if (c.guerra) saldo -= 1.4;
  if (c.abertura < 20) saldo *= 0.5;
  return clamp(saldo, -9, 9);
}

export function receitaTarifaria(c: Country, w: World): number {
  let importPts = 0;
  for (const g of GOODS) {
    const cons = consumoDe(c, g) + 0.001;
    const rel = saldoDe(c, g) / cons;
    const precoRel = (w.mercado[g]?.preco ?? GOODS_PCOS[g]) / GOODS_PCOS[g];
    if (rel < 0) importPts += -rel * precoRel;
  }
  return clamp(importPts * 0.5 * (c.politica.tarifas / 100), 0, 5);
}