import type { AbaId } from '../store/ui';

// ============================================================
// CAUSA E EFEITO ENTRE AS ABAS — grafo dirigido
// ============================================================

export interface Vinculo {
  de: AbaId;
  para: AbaId;
  rotulo: string;
  emoji: string;
  mag: number; // 0..100 (força aproximada do efeito)
}

export const VINCULOS: Vinculo[] = [
  // Governo/economia
  { de: 'governo', para: 'economia', rotulo: 'Estabilidade institucional', emoji: '🏛️', mag: 35 },
  { de: 'governo', para: 'politica', rotulo: 'Apoio legislativo', emoji: '🗳️', mag: 55 },
  { de: 'politica', para: 'governo', rotulo: 'Mandato e coalizão', emoji: '🪑', mag: 40 },
  { de: 'politica', para: 'sociedade', rotulo: 'Política social', emoji: '🤝', mag: 50 },
  { de: 'reformas', para: 'economia', rotulo: 'Reformas estruturais', emoji: '🧩', mag: 60 },
  { de: 'reformas', para: 'politica', rotulo: 'Capital político', emoji: '⚖️', mag: 40 },
  { de: 'reformas', para: 'financas', rotulo: 'Equilíbrio fiscal', emoji: '💵', mag: 65 },
  // Economia
  { de: 'economia', para: 'financas', rotulo: 'Arrecadação', emoji: '💰', mag: 70 },
  { de: 'financas', para: 'economia', rotulo: 'Carga tributária', emoji: '🧾', mag: 55 },
  { de: 'economia', para: 'mercado', rotulo: 'Crescimento e estrutura setorial', emoji: '🏭', mag: 60 },
  { de: 'mercado', para: 'economia', rotulo: 'Inflação e consumo', emoji: '🛒', mag: 55 },
  { de: 'economia', para: 'sociedade', rotulo: 'Emprego e renda', emoji: '🧑‍🏭', mag: 70 },
  { de: 'mercado', para: 'indicadores', rotulo: 'Indicadores setoriais', emoji: '🎯', mag: 60 },
  // Sociedade/indicadores
  { de: 'sociedade', para: 'economia', rotulo: 'Capital humano', emoji: '🎓', mag: 50 },
  { de: 'sociedade', para: 'indicadores', rotulo: 'Index sociais', emoji: '🧠', mag: 65 },
  { de: 'indicadores', para: 'economia', rotulo: 'Confiança e investimento', emoji: '🔎', mag: 60 },
  { de: 'indicadores', para: 'sociedade', rotulo: 'Bem-estar percebido', emoji: '😊', mag: 55 },
  { de: 'indicadores', para: 'governo', rotulo: 'Percepção da gestão', emoji: '📊', mag: 45 },
  // Obras públicas & pesquisa
  { de: 'obras', para: 'sociedade', rotulo: 'Serviços públicos', emoji: '🏥', mag: 70 },
  { de: 'obras', para: 'economia', rotulo: 'Infraestrutura', emoji: '🛣️', mag: 60 },
  { de: 'obras', para: 'financas', rotulo: 'Investimento público', emoji: '🚧', mag: 50 },
  { de: 'pesquisa', para: 'obras', rotulo: 'Inovação em obras', emoji: '🧪', mag: 30 },
  { de: 'pesquisa', para: 'economia', rotulo: 'Inovação', emoji: '🔬', mag: 60 },
  { de: 'pesquisa', para: 'espaco', rotulo: 'Programa espacial', emoji: '🛰️', mag: 80 },
  { de: 'pesquisa', para: 'mercado', rotulo: 'Tecnologia industrial', emoji: '⚙️', mag: 55 },
  { de: 'espaco', para: 'pesquisa', rotulo: 'Descobertas espaciais', emoji: '🌌', mag: 60 },
  { de: 'espaco', para: 'sociedade', rotulo: 'Inspiração nacional', emoji: '🚀', mag: 35 },
  // Relações externas
  { de: 'diplomacia', para: 'economia', rotulo: 'Comércio', emoji: '🌐', mag: 55 },
  { de: 'economia', para: 'diplomacia', rotulo: 'Peso econômico', emoji: '🧭', mag: 40 },
  { de: 'militar', para: 'diplomacia', rotulo: 'Poder e dissuasão', emoji: '🛡️', mag: 50 },
  { de: 'militar', para: 'financas', rotulo: 'Gastos de defesa', emoji: '💣', mag: 45 },
  { de: 'diplomacia', para: 'militar', rotulo: 'Tratados e alianças', emoji: '🤝', mag: 35 },
  { de: 'mundo', para: 'diplomacia', rotulo: 'Cenário global', emoji: '🗺️', mag: 45 },
];

export const fatoresDe = (aba: AbaId): Vinculo[] => VINCULOS.filter((v) => v.para === aba);
export const efeitosDe = (aba: AbaId): Vinculo[] => VINCULOS.filter((v) => v.de === aba);

export const ABA_ICONES: Record<AbaId, string> = {
  visao: '🏠',
  governo: '🏛️',
  politica: '🗳️',
  reformas: '🧩',
  obras: '🏗️',
  pesquisa: '🔬',
  espaco: '🚀',
  economia: '📈',
  financas: '💰',
  mercado: '🛒',
  indicadores: '📊',
  sociedade: '👥',
  diplomacia: '🌐',
  militar: '🛡️',
  mundo: '🗺️',
};