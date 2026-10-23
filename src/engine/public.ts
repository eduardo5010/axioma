import type { Country, World } from './types';
import type { FuncaoObra } from './data/public';
import { clamp, drifta } from './util';
import { alvoCobertura, CONSTRUCAO, coberturas, custoFuncionariosAnual } from './data/public';

/** Efeito das obras públicas sobre a população (aplicado mensalmente). */
export function passoConstrucoes(c: Country, w: World) {
  const cov = coberturas(c);
  const covPct = (k: FuncaoObra) => clamp((cov[k] / Math.max(0.2, alvoCobertura(c, k))) * 100, 0, 100);

  const saudeAlvo = 30 + covPct('coberturaSaude') * 0.6;
  c.saudeIdx = drifta(c.saudeIdx, saudeAlvo, 0.03);

  const educAlvo = 30 + covPct('coberturaEduc') * 0.5;
  c.educacaoIdx = drifta(c.educacaoIdx, educAlvo, 0.03);

  const infraAlvo = 25 + covPct('coberturaTransporte') * 0.4 + covPct('coberturaEnergia') * 0.3;
  c.infraestrutura = drifta(c.infraestrutura, infraAlvo, 0.03);

  const empregosPct = (c.funcionariosMil / Math.max(1, c.populacao * 1000)) * 100;
  const desempAlvo = Math.max(3, c.desemprego - empregosPct * 0.5);
  c.desemprego = drifta(c.desemprego, desempAlvo, 0.04);

  const felicAlvo = c.felicidade + covPct('coberturaSaude') * 0.04 + covPct('coberturaSaneamento') * 0.03;
  c.felicidade = drifta(c.felicidade, felicAlvo, 0.02);

  c.emissaoCo2 = clamp(c.emissaoCo2 + (100 - covPct('coberturaEnergia') * 0.3 + covPct('coberturaDefesa') * 0.2) * 0.001, 30, 4000);
}

/** Constrói uma obra (debt impact: custo único em % do PIB). */
export function construirObra(c: Country, id: keyof typeof CONSTRUCAO, w: World) {
  const def = CONSTRUCAO[id];
  const custo = def.custo;
  c.construcoes[id] = (c.construcoes[id] ?? 0) + 1;
  c.dividaPct = Math.min(350, c.dividaPct + custo);
  w.noticias.unshift({
    mes: `${w.mes + 1}/${w.ano}`,
    texto: `🇧🇷 ${c.flag} inaugura ${def.emoji} ${def.nome.toLowerCase()} (custo de ${custo.toFixed(2)}% do PIB).`,
    tom: 'bom',
  });
  return findObra(c, id);
}

export function demolirObra(c: Country, id: keyof typeof CONSTRUCAO, w: World) {
  const def = CONSTRUCAO[id];
  const qtd = c.construcoes[id] ?? 0;
  if (qtd <= 0) return;
  c.construcoes[id] = qtd - 1;
  const reembolso = def.custo * 0.1;
  c.dividaPct = Math.max(0, c.dividaPct - reembolso);
  w.noticias.unshift({
    mes: `${w.mes + 1}/${w.ano}`,
    texto: `🏗️ ${c.flag} desativa ${def.nome.toLowerCase()} (${def.emoji}) — serviço público retraído.`,
    tom: 'ruim',
  });
}

export function ajustarFuncionarios(c: Country, delta: number, w: World) {
  const atual = c.funcionariosMil;
  c.funcionariosMil = Math.max(0, atual + delta);
  const share = (c.funcionariosMil / Math.max(1, c.populacao * 1000)) * 100;
  c.dividaPct = Math.min(350, c.dividaPct + custoFuncionariosAnual(c) / 120); // custo mensal aproximado
  c.aprovacao = clamp(c.aprovacao + (delta > 0 ? 1 : -1.5), 0, 100);
  w.noticias.unshift({
    mes: `${w.mes + 1}/${w.ano}`,
    texto: `👔 ${c.flag} ajusta o funcionalismo (agora ${share.toFixed(1)}% da população, ${c.funcionariosMil.toLocaleString('pt-BR')} mil servidores).`,
    tom: delta > 0 ? 'bom' : 'ruim',
  });
}

function findObra(c: Country, id: keyof typeof CONSTRUCAO) {
  return { def: CONSTRUCAO[id], qtd: c.construcoes[id] ?? 0 };
}

/** Classificação qualitativa da cobertura de uma função. */
export const nivelCobertura = (v: number, max: number): { nome: string; cor: string } => {
  const pct = clamp((v / max) * 100, 0, 100);
  if (pct < 25) return { nome: 'Crítico', cor: 'var(--ruim)' };
  if (pct < 50) return { nome: 'Precário', cor: 'var(--atencao)' };
  if (pct < 80) return { nome: 'Adequado', cor: 'var(--info)' };
  return { nome: 'Excelente', cor: 'var(--bom)' };
};