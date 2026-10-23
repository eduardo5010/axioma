// ============================================================
// LOCALIZAÇÃO — nomes locais por país
// O Catálogo usa nomes neutros/genericos. Para países onde um
// nome genérico soa artificial, esta tabela guarda o nome
// local (ex.: Brasil → IPTU, Minha Casa Meu Lar) reutilizando a
// MESMA lógica de busca. Fica fora do save (constante do módulo),
// então custa quase zero de armazenamento.
// ============================================================

export interface VarianteNome {
  nome?: string;
  desc?: string;
}

const VARIANTES_PAIS: Record<string, Record<string, VarianteNome>> = {
  bra: {
    wealth_tax_imoveis: { nome: 'IPTU Progressivo de Luxo' },
    metro_capitais: { nome: 'Metrô das Capitais' },
    merendas: { nome: 'Merenda Escolar Reforçada' },
    casa_habitacao: { nome: 'Minha Casa, Meu Lar' },
    terra_indigena: { nome: 'Demarcação de Terras Indígenas' },
    reforma_federativa: {
      nome: 'Novo Pacto Federativo',
      desc: 'Recalcula os repasses constitucionais a estados e municípios.',
    },
corte_piso: {
      nome: 'Revisão dos Pisos Constitucionais',
      desc: 'Emenda que reduz os mínimos constitucionais de saúde e educação.',
    },
    federalismo: { nome: 'Pacto Federativo Forte', desc: 'Repasses e autonomia equilibrados aos estados.' },
    banco_cred: { desc: 'Linhas de crédito para MEIs e startups.' },
    moeda_digital_bc: { desc: 'Real digital emitido pelo Banco Central.' },
    antenna_federal: { nome: 'Sistema Único de Segurança' },
    federa_cultural: { nome: 'Sistema Federal de Cultura' },
    'modelo:presidencial_americano': {
      desc: 'Separação rígida de poderes, checks & balances, Senado e Câmara, STF com revisão de constitucionalidade.',
    },
  },
};

export const variantePara = (paisId: string, chave: string): VarianteNome | undefined =>
  VARIANTES_PAIS[paisId]?.[chave];

export const nomeLocal = (
  paisId: string,
  chave: string,
  base: { nome: string; desc?: string },
): { nome: string; desc?: string } => {
  const v = variantePara(paisId, chave);
  if (!v) return base;
  return { nome: v.nome ?? base.nome, desc: v.desc ?? base.desc };
};