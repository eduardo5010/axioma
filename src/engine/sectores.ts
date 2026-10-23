import type { Country, World } from './types';
import { clamp, drifta } from './util';
import { SETORES, SetorDef, GrupoSetor } from './data/sectores';

export const nivelSetor = (c: Country, def: SetorDef): number => {
  const pesq = c.pesquisa.industrial / 100;
  const social = c.pesquisa.social / 100;
  const infra = c.infraestrutura / 100;
  const lab = clamp(0.55 + c.forcaTrabalho * 0.5 - c.desemprego / 120, 0.25, 1.25);
  const rec = c.indiceRecurso;
  const terciario = c.setores.servicos;

  let v = def.peso * 2.4;
  switch (def.grupo) {
    case 'agro':
      v *= (0.4 + lab * 0.4 + rec * (c.recurso === 'alimento' ? 0.5 : 0.15));
      v *= 1 + c.setores.agricultura * 1.6;
      v += def.intensivo ? pesq * 4 : 0;
      break;
    case 'mineracao':
      v *= (0.25 + pesq * 0.5 + infra * 0.3);
      v += rec * def.peso * 1.5;
      break;
    case 'industria':
      v *= (0.3 + pesq * 0.8 + infra * 0.4 + (def.intensivo ? 1 : 0.5));
      v *= 1 + c.setores.industria * 1.8;
      break;
    case 'tecnologia':
      v *= (0.25 + pesq * 1.1 + social * 0.5);
      v *= 1 + c.setores.servicos * 1.2;
      break;
    case 'energia':
      v *= (0.3 + infra * 0.5 + lab * 0.2);
      if (def.id.startsWith('eletr_')) {
        const ren = ['eletr_solar', 'eletr_eolica', 'eletr_hidraulica', 'eletr_biomassa', 'eletr_geotermica'].includes(def.id);
        v *= 1 + (ren ? c.politica.renovaveis * 0.02 : c.politica.verde * -0.008);
      }
      break;
    case 'construcao':
      v *= (0.25 + infra * 0.6 + pesq * 0.4) * (1 + c.crescimento / 25);
      break;
    case 'transporte':
      v *= (0.4 + terciario * 0.8 + c.urbano * 0.3);
      break;
    case 'servicos':
      v *= (0.35 + terciario * 1.2 + social * 0.6) * (1 + c.politica.comercio / 200);
      break;
    case 'financas':
      v *= (0.3 + terciario * 1.0 + pesq * 0.5) * (1 + c.democracia * 0.5);
      break;
    case 'cultura':
      v *= (0.3 + terciario * 0.9 + social * 0.4 + c.felicidade / 300);
      break;
    case 'defesa':
      v *= (0.25 + c.militar.orcamento / 280 + c.setores.industria * 1.2) * (1 + pesq * 0.5);
      break;
  }
  if (c.guerra) v *= def.grupo === 'defesa' ? 1.25 : def.grupo === 'mineracao' ? 1.1 : 0.96;
  return clamp(v, 0.5, 100);
};

export const grupoValor = (c: Country, grupo: GrupoSetor): number => {
  let s = 0;
  for (const def of SETORES) if (def.grupo === grupo) s += c.sectoresDet[def.id] ?? nivelSetor(c, def);
  return s;
};

export const valorSetor = (c: Country, id: string): number => {
  const v = c.sectoresDet[id];
  if (v !== undefined) return v;
  const def = SETORES.find((s) => s.id === id);
  return def ? nivelSetor(c, def) : 0;
};

export const bonusMercado = (c: Country, g: string): number => {
  switch (g) {
    case 'alimento': return grupoValor(c, 'agro') * 1.2;
    case 'manufactura': return grupoValor(c, 'industria') * 1.2 + grupoValor(c, 'tecnologia') * 1.0 + grupoValor(c, 'defesa') * 0.25;
    case 'energia': return grupoValor(c, 'energia') * 1.6;
    case 'minerais': return grupoValor(c, 'mineracao') * 0.5;
    case 'petroleo': return grupoValor(c, 'mineracao') * 0.12;
    case 'gaz': return grupoValor(c, 'mineracao') * 0.1;
    default: return 0;
  }
};

export const passoSetorCo2 = (c: Country): number => {
  const fossil = valorSetor(c, 'eletr_fossil') * 0.4 + valorSetor(c, 'carvao') * 0.25;
  const trans = valorSetor(c, 'transporte_rodoviario') * 0.2 + valorSetor(c, 'transporte_aereo') * 0.15;
  const ind = valorSetor(c, 'automoveis') * 0.1 + valorSetor(c, 'cimento') * 0.12 + valorSetor(c, 'aco') * 0.15;
  const popFactor = Math.log10(c.populacao + 1) * 12;
  const ren = (c.politica.renovaveis / 100) * 0.35;
  const base = (fossil + trans + ind) * (1 - ren) + popFactor * 0.3;
  c.emissaoCo2 = clamp(drifta(c.emissaoCo2 ?? c.emissaoCo2, base, 0.3), 0, 100);
  return c.emissaoCo2;
};

export const passoSetores = (c: Country, _w: World): void => {
  for (const def of SETORES) c.sectoresDet[def.id] = nivelSetor(c, def);
  passoSetorCo2(c);
};