import type { Country, Sensibilidade } from '../types';

// ============================================================
// SCHEMA DO SISTEMA DE LEIS E POLÍTICAS
// Uma norma = toda política/lavanca/lei/reforma regulada pelo
// Estado no jogo. Cada norma é definida UMA vez no Catálogo
// (data/normas/catalogo.ts) com chave == campo de estado.
// ============================================================

/** Categoria temática — mantém o agrupamento histórico dos blocos. */
export type CategoriaNorma = 'receita' | 'gasto' | 'economia' | 'politica';

/**
 * Porta de vigência da norma (como ela sai do papel para a realidade).
 * - 'imediato': decreto do executivo, aplica na hora (taxa de juros).
 * - 'legislativo': aprovado/rejeitado pelo parlamento (leis enumeradas,
 *   pipeline próprio parametrizado em 'vigencia.reformaLei').
 * - 'legislativo_judicial': pipeline em duas etapas (legislativo -> judicial).
 * - 'referendo': aprovado por consulta popular direta (reservado).
 */
export type GateNorma = 'imediato' | 'legislativo' | 'legislativo_judicial' | 'referendo';

/** Gate padrão de sliders, alternadores e reformas. */
export const GATE_PADRAO: GateNorma = 'legislativo_judicial';

// ---------------- Formato do valor da norma ----------------

export interface NormaValorEscala {
  formato: 'escala';
  dominio: { min: number; max: number; passo: number };
  unidade: 'x' | 'pct' | 'gdp';
  /** Valor inicial (default) quando o país é criado. */
  padrao: number;
}

export interface NormaValorAlternador {
  formato: 'alternador';
  padrao: boolean;
}

export interface NormaValorLei {
  formato: 'lei';
  /** Estado é o ÍNDICE da opção escolhida (compatível com saves atuais). */
  opcoes: { id: string; nome: string; desc: string }[];
  padrao: number;
}

/** Parâmetro configurável de uma reforma que cria um tributo (ex.: alíquota do IVA). */
export interface ParametroReforma {
  nome: string;
  /** Sufixo de exibição (ex.: '%', 'US$/t', 'R$/noite'). */
  unidade: string;
  min: number;
  max: number;
  passo: number;
  /** Alíquota usada quando ninguém define o valor (jogador escolhe antes da votação). */
  padrao: number;
}

export interface NormaValorReforma {
  formato: 'reforma';
  tipo: 'ativa' | 'empilhavel';
  maxPilhas: number;
  custo: number;
  sensibilidade: Sensibilidade;
  /** Presente em reformas que criam impostos com alíquota escolhida pelo adotante. */
  parametro?: ParametroReforma;
}

export type FormatoValor = NormaValorEscala | NormaValorAlternador | NormaValorLei | NormaValorReforma;

/** A qual campo de estado a norma se aplica. */
export type NormaComponente = 'slider' | 'alternador' | 'lei' | 'reforma';

export interface NormaDef {
  /** Deve ser idêntico à chave de estado: PolicyKey | ToggleKey | LeisId | ReformaId. */
  chave: string;
  componente: NormaComponente;
  nome: string;
  desc: string;
  emoji: string;
  categoria: CategoriaNorma;
  valor: FormatoValor;
  /** Perfil ideológico ([econ, social]) usado no apoio legislativo. */
  perfilIdeologico?: { econ: number; social: number };
  gate?: GateNorma;
  /**
   * Efeitos diretos ao aplicar uma reforma. Chaves:
   * - 'democracia'      -> muda c.democracia
   * - 'politica:<key>'  -> muda um slider c.politica[<key>]
   * - 'ind:<id>'        -> acumula em c.reformasInd[<id>]
   * - qualquer outra    -> escalar de Country limitado por 'efeito.limites'
   *   e amortecido por 'efeito.damp' (registro central).
   */
  efeitos?: Record<string, number>;
  /** Condição de aplicabilidade com mensagem de bloqueio (mantém regras atuais). */
  cond?: (c: Country, stacks: number) => string | null;
}