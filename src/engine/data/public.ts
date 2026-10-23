import type { ConstrucaoId, Country } from '../types';

// ============================================================
// CATÁLOGO DE OBRAS PÚBLICAS — FONTE ÚNICA
// Todos os valores monetários em % do PIB (unidade do orçamento).
// ============================================================

export interface ConstrucaoDef {
  id: ConstrucaoId;
  nome: string;
  emoji: string;
  cat: 'saude' | 'educacao' | 'transporte' | 'energia' | 'saneamento' | 'seguranca' | 'cultura' | 'digital' | 'defesa';
  custo: number; // custo único de construção, % do PIB
  manut: number; // manutenção anual, % do PIB (por unidade)
  efeito: Partial<Record<'coberturaSaude' | 'coberturaEduc' | 'coberturaTransporte' | 'coberturaEnergia' | 'coberturaSaneamento' | 'coberturaDigital' | 'coberturaSeguranca' | 'coberturaCultura' | 'coberturaDefesa', number>>;
  desc: string;
}

export const CONSTRUCOES: ConstrucaoDef[] = [
  { id: 'hospital', nome: 'Hospital', emoji: '🏥', cat: 'saude', custo: 0.35, manut: 0.0018, efeito: { coberturaSaude: 1.6 }, desc: 'Assistência hospitalar à população.' },
  { id: 'posto', nome: 'Posto de Saúde', emoji: '🩺', cat: 'saude', custo: 0.12, manut: 0.0006, efeito: { coberturaSaude: 0.5 }, desc: 'Atenção primária, prevenção e vacinação.' },
  { id: 'escola', nome: 'Escola Pública', emoji: '🏫', cat: 'educacao', custo: 0.15, manut: 0.00009, efeito: { coberturaEduc: 0.16 }, desc: 'Ensino fundamental e médio público.' },
  { id: 'universidade', nome: 'Universidade', emoji: '🎓', cat: 'educacao', custo: 0.7, manut: 0.003, efeito: { coberturaEduc: 1.4 }, desc: 'Ensino superior, pesquisa e extensão.' },
  { id: 'rodovia', nome: 'Rodovia', emoji: '🛣️', cat: 'transporte', custo: 0.4, manut: 0.0013, efeito: { coberturaTransporte: 0.9 }, desc: 'Trecho rodoviário pavimentado.' },
  { id: 'ferrovia', nome: 'Ferrovia', emoji: '🚆', cat: 'transporte', custo: 0.8, manut: 0.002, efeito: { coberturaTransporte: 1.4 }, desc: 'Ligação ferroviária de carga e passageiros.' },
  { id: 'aeroporto', nome: 'Aeroporto', emoji: '✈️', cat: 'transporte', custo: 1.2, manut: 0.03, efeito: { coberturaTransporte: 0.7 }, desc: 'Terminal internacional/doméstico.' },
  { id: 'porto', nome: 'Porto', emoji: '⚓', cat: 'transporte', custo: 1.5, manut: 0.04, efeito: { coberturaTransporte: 0.9 }, desc: 'Estrutura portuária para comércio exterior.' },
  { id: 'metro', nome: 'Metrô', emoji: '🚇', cat: 'transporte', custo: 2.0, manut: 0.01, efeito: { coberturaTransporte: 2.2 }, desc: 'Linha de transporte urbano de massa.' },
  { id: 'hidreletrica', nome: 'Hidrelétrica', emoji: '💧', cat: 'energia', custo: 2.2, manut: 0.006, efeito: { coberturaEnergia: 1.4 }, desc: 'Geração hidráulica de baixa emissão.' },
  { id: 'termoeletrica', nome: 'Termoelétrica', emoji: '🔥', cat: 'energia', custo: 1.0, manut: 0.001, efeito: { coberturaEnergia: 0.8 }, desc: 'Geração térmica de reserva.' },
  { id: 'usina_solar', nome: 'Usina Solar', emoji: '☀️', cat: 'energia', custo: 0.6, manut: 0.0018, efeito: { coberturaEnergia: 0.5 }, desc: 'Painéis fotovoltaicos em escala.' },
  { id: 'usina_eolica', nome: 'Parque Eólico', emoji: '🌬️', cat: 'energia', custo: 0.7, manut: 0.0015, efeito: { coberturaEnergia: 0.6 }, desc: 'Geração eólica em altitude.' },
  { id: 'usina_nuclear', nome: 'Usina Nuclear', emoji: '☢️', cat: 'energia', custo: 4.0, manut: 0.015, efeito: { coberturaEnergia: 2.4 }, desc: 'Alta potência, baixo CO₂, alto custo.' },
  { id: 'saneamento', nome: 'Saneamento', emoji: '🚰', cat: 'saneamento', custo: 1.5, manut: 0.003, efeito: { coberturaSaneamento: 0.5 }, desc: 'Rede de água e esgoto tratados.' },
  { id: 'presidio', nome: 'Presídio', emoji: '⛓️', cat: 'seguranca', custo: 0.6, manut: 0.002, efeito: { coberturaSeguranca: 0.4 }, desc: 'Unidade prisional de segurança média.' },
  { id: 'estadio', nome: 'Estádio', emoji: '⚽', cat: 'cultura', custo: 0.8, manut: 0.0006, efeito: { coberturaCultura: 0.3 }, desc: 'Arena esportiva e eventos públicos.' },
  { id: 'telecom', nome: 'Rede de Telecom', emoji: '📡', cat: 'digital', custo: 0.7, manut: 0.0004, efeito: { coberturaDigital: 0.8 }, desc: 'Expansão de banda larga e 5G.' },
  { id: 'datacenter', nome: 'Data Center', emoji: '🖥️', cat: 'digital', custo: 1.5, manut: 0.004, efeito: { coberturaDigital: 1.4 }, desc: 'Infraestrutura de dados e serviços em nuvem.' },
  { id: 'defesa', nome: 'Instalação de Defesa', emoji: '🛡️', cat: 'defesa', custo: 1.8, manut: 0.002, efeito: { coberturaDefesa: 0.9 }, desc: 'Base militar e defesa estratégica.' },
];

export const CONSTRUCAO = Object.fromEntries(CONSTRUCOES.map((d) => [d.id, d])) as Record<ConstrucaoId, ConstrucaoDef>;

export const FUNCAO_OBRA = {
  hospital: 'coberturaSaude',
  posto: 'coberturaSaude',
  escola: 'coberturaEduc',
  universidade: 'coberturaEduc',
  rodovia: 'coberturaTransporte',
  ferrovia: 'coberturaTransporte',
  aeroporto: 'coberturaTransporte',
  porto: 'coberturaTransporte',
  metro: 'coberturaTransporte',
  hidreletrica: 'coberturaEnergia',
  termoeletrica: 'coberturaEnergia',
  usina_solar: 'coberturaEnergia',
  usina_eolica: 'coberturaEnergia',
  usina_nuclear: 'coberturaEnergia',
  saneamento: 'coberturaSaneamento',
  presidio: 'coberturaSeguranca',
  estadio: 'coberturaCultura',
  telecom: 'coberturaDigital',
  datacenter: 'coberturaDigital',
  defesa: 'coberturaDefesa',
} as const;

export type FuncaoObra = (typeof FUNCAO_OBRA)[ConstrucaoId];

/** Pontos de cobertura por milhão de habitantes que representam "cobertura completa" em cada função.
 * Escalado por país: países grandes & ricos precisam de mais infraestrutura absoluta. */
export const TARGET_PPM: Record<FuncaoObra, number> = {
  coberturaSaude: 2.6,
  coberturaEduc: 1.5,
  coberturaTransporte: 2.8,
  coberturaEnergia: 0.6,
  coberturaSaneamento: 0.22,
  coberturaDigital: 2.3,
  coberturaSeguranca: 0.07,
  coberturaCultura: 0.035,
  coberturaDefesa: 0.18,
};

/** Alvo de cobertura (em pontos absolutos) para o país — escala por população. */
export function alvoCobertura(c: Country, k: FuncaoObra): number {
  return TARGET_PPM[k] * Math.max(0.05, c.populacao);
}

/** Soma das contribuições de cobertura das obras atuais de cada função. */
export function coberturas(c: Country): Record<FuncaoObra, number> {
  const out = { coberturaSaude: 0, coberturaEduc: 0, coberturaTransporte: 0, coberturaEnergia: 0, coberturaSaneamento: 0, coberturaSeguranca: 0, coberturaCultura: 0, coberturaDigital: 0, coberturaDefesa: 0 };
  for (const def of CONSTRUCOES) {
    const qtd = c.construcoes[def.id] ?? 0;
    for (const k of Object.keys(def.efeito) as FuncaoObra[]) {
      const v = def.efeito[k] ?? 0;
      if (v !== 0) out[k] += v * qtd;
    }
  }
  return out;
}

/** Manutenção anual das obras atuais (% do PIB). */
export function custoObrasAnual(c: Country): number {
  let soma = 0;
  for (const def of CONSTRUCOES) {
    soma += (c.construcoes[def.id] ?? 0) * def.manut;
  }
  return soma;
}

/** Estimativa de obras que cada país já possui ao iniciar. */
export function construcoesIniciais(p: { populacao: number; urbano: number; saude: number; educ: number; infraestrutura: number }): Record<ConstrucaoId, number> {
  const pop = Math.max(p.populacao ?? 1, 0.5);
  const r = (base: number) => Math.max(0, Math.round((p.saude / 100) * base));
  const r2 = (base: number) => Math.max(0, Math.round((p.educ / 100) * base));
  return {
    hospital: Math.max(1, 4 + Math.round(pop * 0.9)) + r(8),
    posto: 6 + Math.round(pop * 2.1) + r(15),
    escola: 20 + Math.round(pop * 6) + r2(40),
    universidade: Math.max(1, Math.round(pop * 0.3)) + r2(2),
    rodovia: 10 + Math.round(pop * 2),
    ferrovia: Math.max(0, Math.round(pop * 0.35)),
    aeroporto: Math.max(1, Math.round(pop * 0.05)),
    porto: Math.max(1, Math.round(pop * 0.03)),
    metro: p.urbano > 0.5 ? Math.round(pop * 0.12) : 0,
    hidreletrica: Math.max(1, Math.round(pop * 0.1)),
    termoeletrica: Math.max(0, Math.round(pop * 0.12)),
    usina_solar: Math.max(0, Math.round(pop * 0.3)),
    usina_eolica: Math.max(0, Math.round(pop * 0.2)),
    usina_nuclear: Math.max(0, Math.round(pop * 0.015)),
    saneamento: Math.max(1, Math.round(pop * 0.4)),
    presidio: 2 + Math.round(pop * 0.15),
    estadio: 1 + Math.round(pop * 0.1),
    telecom: 4 + Math.round(pop * 2.5),
    datacenter: Math.max(0, Math.round(pop * 0.12)),
    defesa: Math.max(1, Math.round(pop * 0.18)),
  };
}

/** Nº de funcionários públicos (em milhares) estimado para o país ao iniciar. */
export function funcionariosIniciais(p: { populacao: number; saude: number; educ: number; politica: Record<string, number> | undefined }): number {
  const pop = Math.max(p.populacao ?? 1, 0.5);
  const buro = p.politica?.bemEstar ?? 50;
  const escala = 0.012 + (buro / 100) * 0.018; // 1,2%..3% da população
  return Math.round(pop * escala * 1000);
}

/** Folha de pagamento dos funcionários públicos em % do PIB. */
export function custoFuncionariosAnual(c: Country): number {
  if (!c.funcionariosMil) return 0;
  const sharePct = (c.funcionariosMil / Math.max(1, c.populacao * 1000)) * 100; // % da população
  return clamp(sharePct * 1.2, 0, 20); // ~2x maior que a população em força de trabalho, ~60% do PIB p/c
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Custo de construir uma obra (em % do PIB). */
export const custoNovaObra = (def: ConstrucaoDef): number => def.custo;

/** Custo de demolir (indenização/sucateamento, % do PIB). */
export const custoDemolirObra = (def: ConstrucaoDef): number => def.custo * 0.1;