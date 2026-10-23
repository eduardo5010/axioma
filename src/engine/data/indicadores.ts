export type CatInd =
  | 'macro' | 'financas' | 'energia' | 'transporte' | 'social' | 'demografia'
  | 'trabalho' | 'tecnologia' | 'externo' | 'seguranca' | 'meio' | 'construcao'
  | 'instituicoes' | 'industria' | 'agro' | 'mineracao' | 'cultura';

export interface Fator {
  nome: string;
  ref: string;
  peso: number;
}

export interface IndicadorDef {
  id: string;
  nome: string;
  cat: CatInd;
  unid?: string;
  min: number;
  max: number;
  bom: 'cima' | 'baixo';
  fatores: Fator[];
}

export const f = (nome: string, ref: string, peso = 1): Fator => ({ nome, ref, peso });

export const ind = (id: string, nome: string, cat: CatInd, bom: 'cima' | 'baixo', fatores: Fator[], unid?: string, min = 0, max = 100): IndicadorDef =>
  ({ id, nome, cat, unid, min, max, bom, fatores });

export const CATS: Record<CatInd, string> = {
  macro: 'Macroeconomia',
  financas: 'Finanças e Crédito',
  energia: 'Energia',
  transporte: 'Transporte',
  social: 'Sociedade',
  demografia: 'Demografia',
  trabalho: 'Trabalho',
  tecnologia: 'Tecnologia',
  externo: 'Setor Externo',
  seguranca: 'Segurança e Defesa',
  meio: 'Meio Ambiente',
  construcao: 'Construção e Habitação',
  instituicoes: 'Instituições',
  industria: 'Indústria',
  agro: 'Agropecuária',
  mineracao: 'Mineração',
  cultura: 'Cultura e Mídia',
};

export const INDICADORES: IndicadorDef[] = [
  ind('pib_nominal', 'PIB Nominal', 'macro', 'cima', [f('PIB real', 'pais:gdp', 2), f('Inflação', 'pais:inflacao', 1), f('Crescimento', 'pais:crescimento', 1)]),
  ind('pib_pc_nominal', 'PIB per capita (Nominal)', 'macro', 'cima', [f('PIB Nominal', 'ind:pib_nominal', 2), f('População', 'pais:populacao', -1)]),
  ind('pib_pc_ppp', 'PIB per capita (PPC)', 'macro', 'cima', [f('Padrão de vida', 'pais:sol', 1.5), f('Produtividade', 'ind:produtividade', 1.5), f('Gini', 'pais:gini', -1)]),
  ind('confianca_empresarial', 'Confiança Empresarial', 'macro', 'cima', [f('Crescimento', 'pais:crescimento', 1.4), f('Taxa de juros real', 'ind:taxa_juros_real', -1), f('Corrupção/judiciário', 'pais:corte', 0.8), f('Estabilidade', 'pais:estabilidade', 1), f('Burocracia', 'ind:burocracia', -0.8)]),
  ind('gasto_consumidor', 'Gasto do Consumidor', 'macro', 'cima', [f('Salários', 'ind:salarios', 1.5), f('Desemprego', 'pais:desemprego', -1.2), f('Confiança', 'ind:confianca_empresarial', 0.8), f('Inflação', 'pais:inflacao', -0.8)]),
  ind('gasto_empresarial', 'Gasto Empresarial', 'macro', 'cima', [f('Confiança Empresarial', 'ind:confianca_empresarial', 1.6), f('Pesquisa industrial', 'pais:pesq_ind', 1), f('Taxa de lucro', 'ind:taxa_lucro', 1.2)]),
  ind('investimento_privado', 'Investimento Privado', 'macro', 'cima', [f('Gasto Empresarial', 'ind:gasto_empresarial', 1.5), f('Juros reais', 'ind:taxa_juros_real', -1.2), f('Liquidez bancária', 'ind:liquidez_bancos', 1)]),
  ind('consumo_real', 'Consumo Real', 'macro', 'cima', [f('Salários', 'ind:salarios', 1.5), f('Emprego', 'trabalho:emprego', 1.2), f('Inflação', 'pais:inflacao', -0.8)]),
  ind('comercio_domestico', 'Comércio Doméstico', 'macro', 'cima', [f('Consumo Real', 'ind:consumo_real', 1.4), f('Internet veloz', 'ind:velocidade_internet', 0.8), f('Qualidade da infra', 'ind:qualidade_infra', 0.6)]),
  ind('produtividade', 'Produtividade', 'trabalho', 'cima', [f('Pesquisa industrial', 'pais:pesq_ind', 1.4), f('Automação', 'ind:automacao_industrial', 1), f('Educação', 'pais:educ', 1), f('Infraestrutura', 'pais:infra', 0.7)]),
  ind('salarios', 'Salários', 'trabalho', 'cima', [f('Produtividade', 'ind:produtividade', 1.5), f('Desemprego', 'pais:desemprego', -1), f('Agitação trabalhista', 'ind:agitacao_trabalhista', 0.4), f('Bem-estar social', 'politica:bemEstar', 0.4)]),
  ind('semana_trabalho', 'Semana de Trabalho (h)', 'trabalho', 'baixo', [f('Produtividade', 'ind:produtividade', 1), f('Automação residencial', 'ind:automacao_residencial', -0.8), f('Leis trabalhistas', 'leis:economia', 0.5)], 'horas'),
  ind('participacao_forca_trabalho', 'Participação da Força de Trabalho', 'trabalho', 'cima', [f('Demografia', 'pais:idadeMedia', 1), f('Igualdade de gênero', 'ind:igualdade_genero', 0.9), f('Semana de trabalho', 'ind:semana_trabalho', 0.3)]),
  ind('participacao_produtiva_trabalho', 'Participação Produtiva do Trabalho', 'trabalho', 'cima', [f('Força de trabalho', 'pais:forcaTrabalho', 1.2), f('Salários', 'ind:salarios', 0.8), f('Agitação trabalhista', 'ind:agitacao_trabalhista', -0.6)]),
  ind('agitacao_trabalhista', 'Agitação Trabalhista', 'trabalho', 'baixo', [f('Desemprego', 'pais:desemprego', 1.5), f('Salários', 'ind:salarios', -1.2), f('Sindicatos', 'grupo:sindicatos', 0.8), f('Inflação', 'pais:inflacao', 0.6)]),
  ind('setor_manufatura', 'Setor de Manufatura', 'industria', 'cima', [f('Indústria pesada', 'setor:industria_pesada_privada', 1.2), f('Automação', 'ind:automacao_industrial', 1), f('Exportações', 'ind:exportacoes', 0.8), f('Produtividade', 'ind:produtividade', 0.8)]),
  ind('industria_leve_privada', 'Indústria Leve Privada', 'industria', 'cima', [f('Consumo doméstico', 'ind:gasto_consumidor', 1.2), f('Vestuário', 'setor:vestuario', 1), f('Água engarrafada', 'setor:agua_engarrafada', 0.5)]),
  ind('industria_pesada_privada', 'Indústria Pesada Privada', 'industria', 'cima', [f('Aço', 'setor:aco', 1.4), f('Construção', 'ind:atividade_construcao', 1), f('Pesquisa industrial', 'pais:pesq_ind', 1)]),
  ind('eletronicos_privados', 'Eletrônicos Privados', 'industria', 'cima', [f('Eletrônica de consumo', 'setor:eletronica_consumo', 1.2), f('Hardware', 'setor:hardware', 1), f('Terras raras', 'ind:precos_terras_raras', -0.4)]),
  ind('industria_ferroviaria', 'Indústria Ferroviária', 'industria', 'cima', [f('Uso de trens', 'ind:uso_trem', 1.5), f('Construção ferroviária', 'setor:ferrovias_constr', 1.5), f('Infraestrutura', 'pais:infra', 0.6)]),
  ind('industria_agua', 'Indústria de Água', 'industria', 'cima', [f('Urbanização', 'pais:urbano', 1.3), f('Densidade urbana', 'ind:densidade_urbana', 1), f('Redes de água', 'setor:redes_agua', 1.5)]),
  ind('setor_extracao', 'Setor de Extração', 'mineracao', 'cima', [f('Mineração', 'soma:mineracao', 1.5), f('Recursos naturais', 'pais:indiceRecurso', 1.5), f('Abertura comercial', 'pais:abertura', 0.7)]),
  ind('precos_terras_raras', 'Preços de Terras Raras', 'mineracao', 'cima', [f('Extração de terras raras', 'setor:oxidos_terras_raras', -1.2), f('Demanda eletrônica', 'ind:eletronicos_privados', 1), f('Tensão global', 'mundo:tensaoGlobal', 0.5)]),
  ind('preco_alimentos_idx', 'Preço de Alimentos', 'macro', 'baixo', [f('Produção agropecuária', 'soma:agro', -2), f('Mercado de alimento', 'mercado:alimento', 1.5), f('Inflação', 'pais:inflacao', 1)]),
  ind('agricultura_privada', 'Agricultura Privada', 'agro', 'cima', [f('Agropecuária', 'soma:agro', 1.5), f('Cereais', 'setor:cereais', 1), f('Milho', 'setor:milho', 1), f('Reforma agrária', 'leis:terra', 0.5)]),
  ind('preco_alimentos_idx', 'Preço de Alimentos', 'macro', 'baixo', [f('Produção agropecuária', 'soma:agro', -2), f('Mercado de alimento', 'mercado:alimento', 1.5), f('Inflação', 'pais:inflacao', 1)]),
  ind('dietas_vegetais', 'Dietas à Base de Plantas', 'social', 'cima', [f('Vegetais', 'setor:vegetais', 1), f('Renda', 'ind:pib_pc_ppp', 0.8), f('Consumo de carne', 'setor:carne_bovina', -0.8)]),
  ind('consumo_alcool', 'Consumo de Álcool', 'social', 'baixo', [f('Cerveja', 'setor:cerveja', 1), f('Vinho', 'setor:vinho', 1), f('Destilados', 'setor:destilados', 1), f('Renda', 'ind:pib_pc_ppp', 0.5)]),
  ind('consumo_drogas_legais', 'Consumo de Drogas Legais', 'social', 'baixo', [f('Legalização', 'toggle:drogas', 2), f('Tabaco', 'setor:tabaco', 1), f('Saúde mental', 'ind:saude_mental', 0.8)]),
  ind('saude_mental', 'Saúde Mental', 'social', 'cima', [f('Felicidade', 'pais:felicidade', 1.3), f('Saúde pública', 'politica:saude', 0.8), f('Desemprego', 'pais:desemprego', -1), f('Farmacêuticas', 'setor:farmaceutica', 0.6)]),
  ind('demanda_saude', 'Demanda por Saúde', 'social', 'cima', [f('Idade média', 'pais:idadeMedia', 1.3), f('Longevidade', 'ind:longevidade', 1), f('Cobertura previd.', 'politica:saude', 0.6)]),
  ind('saude_privada', 'Saúde Privada', 'social', 'cima', [f('Farmacêutica', 'setor:farmaceutica', 1), f('Investimento privado', 'ind:investimento_privado', 0.8), f('Gasto do Estado', 'politica:saude', 0.5)]),
  ind('escolas_privadas', 'Escolas Privadas', 'social', 'cima', [f('Educação estatal', 'politica:educacao', -0.8), f('Renda média', 'ind:salarios', 1.2), f('Classe média', 'grupo:classeMedia', 0.8)]),
  ind('graduados_universitarios', 'Graduados Universitários', 'social', 'cima', [f('Universidades/educação', 'politica:educacao', 1.3), f('Editoras', 'setor:publishing', 0.6), f('Pesquisa social', 'pais:pesq_social', 1)]),
  ind('desenvolvimento_humano', 'Desenvolvimento Humano (IDH)', 'social', 'cima', [f('Padrão de vida', 'pais:sol', 1.5), f('Alfabetização', 'pais:alfab', 1.2), f('Longevidade', 'ind:longevidade', 1.2), f('Igualdade', 'ind:igualdade', 0.8)]),
  ind('pobreza', 'Pobreza', 'social', 'baixo', [f('PIB per capita', 'ind:pib_pc_nominal', -1.5), f('Gini', 'pais:gini', 1.3), f('Desemprego', 'pais:desemprego', 1), f('Bem-estar', 'politica:bemEstar', -1)]),
  ind('igualdade', 'Igualdade', 'social', 'cima', [f('Gini', 'pais:gini', -2), f('Salários mínimos', 'politica:renda', 0.8), f('Lacuna geracional', 'ind:lacuna_geracional', -0.7)]),
  ind('igualdade_genero', 'Igualdade de Gênero', 'social', 'cima', [f('Democracia', 'pais:democracia', 1.2), f('Educação', 'pais:educ', 1), f('Leis de cidadania', 'leis:cidadania', 0.8), f('Tensão racial', 'ind:tensao_racial', -0.5)]),
  ind('tensao_racial', 'Tensão Racial', 'social', 'baixo', [f('Migração', 'ind:imigracao', 0.5), f('Igualdade', 'ind:igualdade', -1), f('Canais de TV', 'setor:canais_tv', 0.4)]),
  ind('lacuna_geracional', 'Lacuna Geracional de Riqueza', 'social', 'baixo', [f('Idade média', 'pais:idadeMedia', 1), f('Inflação imobiliária', 'ind:moradia_privada', 0.8), f('Igualdade', 'ind:igualdade', -0.7)]),
  ind('orfaos_menores', 'Órfãos e Menores em Situação de Rua', 'social', 'baixo', [f('Pobreza', 'ind:pobreza', 1.5), f('Bem-estar', 'politica:bemEstar', -1.2), f('Caridade', 'ind:caridade', -0.5)]),
  ind('animais_abandonados', 'Animais Abandonados', 'social', 'baixo', [f('Pobreza', 'ind:pobreza', 1), f('Sensibilidade social', 'pais:felicidade', -0.5), f('Caridade', 'ind:caridade', -0.6)]),
  ind('caridade', 'Caridade', 'social', 'cima', [f('Religiosidade', 'pais:relig', 1), f('Renda', 'ind:pib_pc_ppp', 0.8), f('Desenvolvimento humano', 'ind:desenvolvimento_humano', 0.6)]),
  ind('crime_juvenil', 'Crime Juvenil', 'seguranca', 'baixo', [f('Pobreza', 'ind:pobreza', 1.3), f('Desemprego jovem', 'pais:desemprego', 1.2), f('Lei e ordem', 'politica:leiOrdem', -1), f('Família/escolas', 'politica:educacao', -0.5)]),
  ind('integridade_territorial', 'Integridade Territorial', 'seguranca', 'cima', [f('Nacionalismo', 'grupo:nacionalistas', 0.8), f('Em guerra', 'pais:guerra', -2), f('Relações externas', 'ind:relacoes_exteriores', 0.6)]),
  ind('indice_prontidao_guerra', 'Índice de Prontidão de Guerra', 'seguranca', 'cima', [f('Orçamento militar', 'pais:orcamento', 1.5), f('Tecnologia militar', 'pais:pesq_militar', 1.2), f('Indústria de defesa', 'soma:defesa', 1)]),
  ind('projecao_poder', 'Projeção de Poder', 'seguranca', 'cima', [f('Porta-aviões', 'setor:porta_avioes', 1.2), f('Caças', 'setor:cacas', 1.2), f('Saturação naval', 'soma:defesa', 1)]),
  ind('relacoes_exteriores', 'Relações Exteriores', 'externo', 'cima', [f('Relações médias', 'mundo:relacao_media', 1.5), f('Infâmia', 'pais:infamia', -1.2), f('Tratados', 'mundo:tratados_meus', 1)]),
  ind('importacoes_estrangeiras', 'Importações Estrangeiras', 'externo', 'cima', [f('Abertura comercial', 'pais:abertura', 1.5), f('Consumo interno', 'ind:gasto_consumidor', 1), f('Transporte naval', 'setor:transporte_naval_serv', 0.5)]),
  ind('exportacoes', 'Exportações', 'externo', 'cima', [f('Abertura', 'pais:abertura', 1.3), f('Setor agrícola', 'soma:agro', 0.7), f('Manufatura', 'ind:setor_manufatura', 0.7), f('Transporte naval', 'setor:transporte_naval_serv', 0.8)]),
  ind('exportacoes_estrangeiras', 'Exportações Estrangeiras (serviços/financ.)', 'externo', 'cima', [f('Setor financeiro', 'ind:setor_financeiro', 1), f('Turismo', 'setor:turismo', 1), f('Abertura', 'pais:abertura', 0.8)]),
  ind('ajuda_estrangeira', 'Ajuda Estrangeira Recebida', 'externo', 'cima', [f('PIB per capita', 'ind:pib_pc_nominal', -1.2), f('Instabilidade', 'pais:estabilidade', -0.8), f('Relações exteriores', 'ind:relacoes_exteriores', 0.7)]),
  ind('forca_moeda', 'Força da Moeda', 'financas', 'cima', [f('Taxa de juros real', 'ind:taxa_juros_real', 1.2), f('Inflação', 'pais:inflacao', -1.5), f('Balança comercial', 'pais:saldoComercial', 1), f('Reservas', 'ind:base_monetaria', 0.5)]),
  ind('mercado_cambio', 'Mercados de Câmbio (estabilidade)', 'financas', 'cima', [f('Força da moeda', 'ind:forca_moeda', 1.4), f('Volatilidade política', 'pais:estabilidade', -1), f('Balança comercial', 'pais:saldoComercial', 0.8)]),
  ind('rendimento_t2', 'Rendimento do Título (2Y)', 'financas', 'baixo', [f('Taxa de juros', 'ind:taxa_juros', 1.5), f('Inflação', 'pais:inflacao', 1), f('Política monetária', 'politica:juros', 1)]),
  ind('rendimento_t10', 'Rendimento do Título (10Y)', 'financas', 'baixo', [f('Curva (2Y)', 'ind:rendimento_t2', 1.2), f('Prêmio de prazo', 'ind:premio_do_prazo', 1), f('Dívida pública', 'pais:divida', 0.8)]),
  ind('rendimento_t30', 'Rendimento do Título (30Y)', 'financas', 'baixo', [f('Rendimento 10Y', 'ind:rendimento_t10', 1.4), f('Prêmio de prazo', 'ind:premio_do_prazo', 1), f('Expectativa de crescimento', 'pais:crescimento', 0.6)]),
  ind('inclinacao_curva_juros', 'Inclinação da Curva de Juros', 'financas', 'cima', [f('Rendimento 10Y − 2Y', 'nodo:curva', 2), f('Expectativas de recessão', 'ind:confianca_empresarial', -1)]),
  ind('premio_do_prazo', 'Prêmio de Prazo', 'financas', 'baixo', [f('Inflação esperada', 'pais:inflacao', 1), f('Risco fiscal', 'pais:divida', 0.8), f('Credibilidade', 'pais:corte', -0.6)]),
  ind('taxa_juros', 'Taxas de Juros', 'financas', 'baixo', [f('Banco central (juros)', 'politica:juros', 1.5), f('Inflação', 'pais:inflacao', 1.2), f('Risco-país', 'pais:infamia', 0.5)]),
  ind('taxa_juros_real', 'Taxa de Juros Real', 'financas', 'baixo', [f('Taxa de juros', 'ind:taxa_juros', 1.5), f('Inflação', 'pais:inflacao', -1.2)]),
  ind('razao_servico_divida', 'Razão de Serviço da Dívida', 'financas', 'baixo', [f('Dívida pública', 'pais:divida', 1.5), f('Taxa de juros real', 'ind:taxa_juros_real', 1.2), f('Crescimento', 'pais:crescimento', -0.8)]),
  ind('base_monetaria', 'Base Monetária', 'financas', 'cima', [f('Política monetária', 'politica:juros', -1.2), f('Reservas do BC', 'ind:reservas_ouro', 0.6), f('Atividade', 'pais:crescimento', 0.8)]),
  ind('oferta_m2', 'Oferta de Moeda (M2)', 'financas', 'cima', [f('Base monetária', 'ind:base_monetaria', 1.5), f('Crédito bancário', 'ind:liquidez_bancos', 0.8), f('Inflação esperada', 'pais:inflacao', 0.5)], 'esc. 0-100'),
  ind('reservas_ouro', 'Reservas de Ouro', 'financas', 'cima', [f('Extração de ouro', 'setor:ouro', 1.4), f('Força da moeda', 'ind:forca_moeda', 0.8)]),
  ind('reservas_cripto', 'Reservas de Criptomoedas', 'financas', 'cima', [f('Adoção de cripto', 'ind:adocao_cripto', 1.5), f('Abertura financeira', 'politica:comercio', 0.5)]),
  ind('adocao_cripto', 'Adoção de Criptomoedas', 'financas', 'cima', [f('Velocidade da internet', 'ind:velocidade_internet', 1.2), f('Desconfiança bancária', 'ind:liquidez_bancos', -0.6), f('Inflação', 'pais:inflacao', 0.8)]),
  ind('setor_financeiro', 'Setor Financeiro', 'financas', 'cima', [f('Bancos', 'setor:bancos', 1.5), f('Estabilidade da bolsa', 'ind:estabilidade_bolsa', 1), f('Regulação', 'leis:economia', 0.6)]),
  ind('liquidez_bancos', 'Liquidez Bancária', 'financas', 'cima', [f('Taxa de juros', 'ind:taxa_juros', -0.8), f('Reservas', 'ind:base_monetaria', 1.2), f('Crise financeira', 'ind:estabilidade_bolsa', -1)]),
  ind('estabilidade_bolsa', 'Estabilidade da Bolsa', 'financas', 'cima', [f('Confiança empresarial', 'ind:confianca_empresarial', 1.4), f('Juros reais', 'ind:taxa_juros_real', -1), f('Tensão global', 'mundo:tensaoGlobal', -0.6)]),
  ind('taxa_lucro', 'Taxa de Lucro', 'financas', 'cima', [f('Produtividade', 'ind:produtividade', 1.2), f('Salários', 'ind:salarios', -1), f('Juros', 'ind:taxa_juros', -0.8)]),
  ind('pensoes_privadas', 'Previdência Privada', 'financas', 'cima', [f('Poupança', 'ind:investimento_privado', 1), f('Renda média', 'ind:salarios', 1), f('Envelhecimento', 'pais:idadeMedia', 0.8)]),
  ind('custo_vida', 'Custo de Vida', 'macro', 'baixo', [f('Inflação', 'pais:inflacao', 1.5), f('Preço de alimentos', 'ind:preco_alimentos_idx', 1), f('Preço de energia', 'ind:preco_energia', 1), f('Moradia', 'ind:moradia_privada', 0.8)]),
  ind('atividade_construcao', 'Atividade de Construção', 'construcao', 'cima', [f('Construção civil', 'setor:construcao_civil', 1.5), f('Cimento', 'setor:cimento', 1.2), f('Taxa de juros', 'ind:taxa_juros', -1), f('Custo de vida', 'ind:custo_vida', -0.4)]),
  ind('moradia_privada', 'Moradia Privada', 'construcao', 'cima', [f('Construção civil', 'setor:construcao_civil', 1.3), f('Financiamento', 'ind:taxa_juros', -0.8), f('Densidade urbana', 'ind:densidade_urbana', 0.6)]),
  ind('qualidade_infra', 'Qualidade da Infraestrutura', 'construcao', 'cima', [f('Investimento público', 'politica:infraestrutura', 1.4), f('Setor de construção', 'ind:atividade_construcao', 0.8), f('Crescimento', 'pais:crescimento', 0.6)]),
  ind('densidade_urbana', 'Densidade Urbana', 'demografia', 'cima', [f('Urbanização', 'pais:urbano', 1.5), f('População', 'pais:populacao', 1), f('Área (imigração)', 'ind:migracao_geral', -0.4)], 'pessoas/km²'),
  ind('idade_media', 'Idade Média', 'demografia', 'cima', [f('Fertilidade', 'ind:fertilidade', -1.4), f('Longevidade', 'ind:longevidade', 1), f('Migração', 'ind:imigracao', -0.6)], 'anos'),
  ind('fertilidade', 'Taxa de Fertilidade', 'demografia', 'cima', [f('Igualdade de gênero', 'ind:igualdade_genero', -0.5), f('Renda', 'ind:pib_pc_ppp', -0.8), f('Urbanização', 'pais:urbano', -0.7), f('Política familiar', 'politica:bemEstar', 0.5)], 'filhos/mulher'),
  ind('longevidade', 'Longevidade', 'demografia', 'cima', [f('Saúde', 'pais:saudeIdx', 1.5), f('Padrão de vida', 'pais:sol', 1), f('Obesidade/consumo', 'ind:consumo_alcool', -0.3)], 'anos'),
  ind('emigracao', 'Emigração', 'demografia', 'baixo', [f('Sol', 'pais:sol', -1.4), f('Desemprego', 'pais:desemprego', 1), f('Repressão', 'pais:democracia', -0.8)]),
  ind('imigracao', 'Imigração', 'demografia', 'cima', [f('Demanda de imigração', 'ind:demanda_imigracao', 1.2), f('Política migratória', 'politica:imigracao', 1), f('Padrão de vida', 'pais:sol', 0.8)]),
  ind('imigracao_ilegal', 'Imigração Ilegal', 'demografia', 'baixo', [f('Demanda de imigração', 'ind:demanda_imigracao', 1.2), f('Controle de fronteiras', 'politica:leiOrdem', -1), f('Pobreza dos vizinhos', 'mundo:crise_vizinhos', 0.5)]),
  ind('demanda_imigracao', 'Demanda de Imigração', 'demografia', 'cima', [f('Atração (sol/democr.)', 'pais:democracia', 0.8), f('Abertura', 'pais:abertura', 1), f('Envelhecimento', 'pais:idadeMedia', 0.6)]),
  ind('uso_carro', 'Uso de Carros', 'transporte', 'cima', [f('Automóveis', 'setor:automoveis', 1.3), f('Transporte rodoviário', 'setor:transporte_rodoviario', 0.8), f('Urbanização', 'pais:urbano', 0.8), f('Combustíveis', 'setor:combustivel', -0.5)]),
  ind('uso_onibus', 'Uso de Ônibus', 'transporte', 'cima', [f('Transporte urbano', 'setor:transporte_urbano', 1.5), f('Custo de vida', 'ind:custo_vida', 0.6), f('Densidade urbana', 'ind:densidade_urbana', 0.8)]),
  ind('uso_trem', 'Uso de Trens', 'transporte', 'cima', [f('Transporte ferroviário', 'setor:transporte_ferroviario', 1.5), f('Investimento em infra', 'politica:infraestrutura', 1), f('Urbanização', 'pais:urbano', 0.5)]),
  ind('congestionamento', 'Congestionamento', 'transporte', 'baixo', [f('Uso de carros', 'ind:uso_carro', 1.5), f('Densidade urbana', 'ind:densidade_urbana', 1), f('Uso de ônibus', 'ind:uso_onibus', -0.7)]),
  ind('viagem_aerea', 'Viagens Aéreas', 'transporte', 'cima', [f('Transporte aéreo', 'setor:transporte_aereo', 1.5), f('Turismo', 'setor:turismo', 1), f('Renda', 'ind:pib_pc_ppp', 0.8)]),
  ind('transicao_carro_eletrico', 'Transição para Carros Elétricos', 'transporte', 'cima', [f('Política verde', 'politica:verde', 1.4), f('Eletricidade solar', 'ind:energia_solar', 0.8), f('Preço do petróleo', 'ind:preco_petroleo', 0.6)]),
  ind('demanda_energia', 'Demanda de Energia', 'energia', 'cima', [f('Indústria', 'ind:setor_manufatura', 1.2), f('População', 'pais:populacao', 0.8), f('Eletrodomésticos', 'setor:eletrodomesticos', 0.5)]),
  ind('oferta_energia', 'Oferta de Energia', 'energia', 'cima', [f('Setor elétrico', 'soma:energia', 1.5), f('Energia renovável', 'politica:renovaveis', 0.8), f('Importações', 'ind:importacoes_estrangeiras', 0.4)]),
  ind('preco_energia', 'Preço de Energia', 'energia', 'baixo', [f('Demanda de energia', 'ind:demanda_energia', 1), f('Oferta de energia', 'ind:oferta_energia', -1.5), f('Combustíveis', 'setor:combustivel', 0.8)]),
  ind('eficiencia_energetica', 'Eficiência Energética', 'energia', 'cima', [f('Pesquisa industrial', 'pais:pesq_ind', 1.2), f('Preço de energia', 'ind:preco_energia', 0.8), f('Renováveis', 'politica:renovaveis', 0.8)]),
  ind('demanda_petroleo', 'Demanda de Petróleo', 'energia', 'cima', [f('Uso de carros', 'ind:uso_carro', 1.3), f('Transporte rodoviário', 'setor:transporte_rodoviario', 1), f('Indústria', 'ind:setor_manufatura', 0.8)]),
  ind('oferta_petroleo', 'Oferta de Petróleo', 'energia', 'cima', [f('Extração de petróleo', 'setor:petroleo', 2), f('Recursos', 'pais:indiceRecurso', 0.6)]),
  ind('preco_petroleo', 'Preço do Petróleo', 'energia', 'baixo', [f('Oferta global', 'mundo:oferta_petroleo', -1.5), f('Demanda global', 'mundo:demanda_petroleo', 1.5), f('Tensão global', 'mundo:tensaoGlobal', 0.8)]),
  ind('energia_solar', 'Energia Solar', 'energia', 'cima', [f('Solar instalada', 'setor:eletr_solar', 2), f('Política renovável', 'politica:renovaveis', 1), f('Clima', 'mundo:clima', 0.4)]),
  ind('energia_eolica', 'Energia Eólica', 'energia', 'cima', [f('Eólica instalada', 'setor:eletr_eolica', 2), f('Política renovável', 'politica:renovaveis', 1)]),
  ind('emissao_co2', 'Emissões de CO₂', 'meio', 'baixo', [f('Eletricidade fóssil', 'setor:eletr_fossil', 1.4), f('Transporte', 'setor:transporte_rodoviario', 1), f('Renováveis', 'politica:renovaveis', -1), f('Indústria', 'ind:setor_manufatura', 0.8)], 'Mt/ano'),
  ind('temperatura_media', 'Temperatura Média', 'meio', 'baixo', [f('CO₂ global', 'mundo:co2_global', 1.2), f('Anomalia climática', 'mundo:clima', 0.6)], '°C'),
  ind('velocidade_internet', 'Velocidade da Internet', 'tecnologia', 'cima', [f('Operadoras de telecom', 'setor:operadoras_telecom', 1.4), f('Redes numéricas', 'setor:redes_telecom', 1.2), f('Pesquisa', 'pais:pesq_ind', 0.8)]),
  ind('industria_telecom', 'Indústria de Telecomunicações', 'tecnologia', 'cima', [f('Operadoras', 'setor:operadoras_telecom', 1.5), f('Hardware', 'setor:hardware', 1), f('Satélites', 'setor:satelites', 0.8)]),
  ind('inteligencia_artificial', 'Inteligência Artificial', 'tecnologia', 'cima', [f('Software', 'setor:software', 1.4), f('Hardware', 'setor:hardware', 1.2), f('Pesquisa', 'pais:pesq_ind', 1), f('Internet', 'ind:velocidade_internet', 0.8)]),
  ind('automacao_industrial', 'Automação Industrial', 'industria', 'cima', [f('Robôs', 'setor:robos', 1.5), f('Produtividade', 'ind:produtividade', 1), f('Salários', 'ind:salarios', 0.6)]),
  ind('automacao_residencial', 'Automação Residencial', 'tecnologia', 'cima', [f('Eletrônicos', 'ind:eletronicos_privados', 1.2), f('Renda', 'ind:pib_pc_ppp', 0.8), f('IA', 'ind:inteligencia_artificial', 0.8)]),
  ind('automacao_comercial', 'Automação Comercial', 'tecnologia', 'cima', [f('IA', 'ind:inteligencia_artificial', 1.2), f('Fast food', 'setor:fastfood', 0.6), f('Comércio digital', 'ind:comercio_domestico', 0.8)]),
  ind('burocracia', 'Burocracia', 'instituicoes', 'baixo', [f('Software/Estado', 'setor:software', -0.8), f('Lei e ordem', 'politica:leiOrdem', -0.6), f('Correios', 'setor:correios', 0.3)]),
  ind('reformismo_partido', 'Reformismo Partidário', 'instituicoes', 'cima', [f('Fundos partidários', 'ind:fundos_partido', 0.8), f('Aprovação do partido', 'ind:aprovacao_partido', 0.8), f('Grupos reformistas', 'grupo:intelectuais', 0.6)]),
  ind('fundos_partido', 'Fundos Partidários', 'instituicoes', 'cima', [f('Receita do Estado', 'pais:receita', 0.6), f('Doadores privados', 'ind:taxa_lucro', 0.8), f('Corrupção percebida', 'pais:corte', -0.5)]),
  ind('aprovacao_partido', 'Aprovação do Partido', 'instituicoes', 'cima', [f('Aprovação do governo', 'pais:aprovacao', 1.4), f('Escândalos', 'pais:infamia', -0.5), f('Reformismo', 'ind:reformismo_partido', 0.4)]),
  ind('apoio_socialismo_global', 'Apoio Global ao Socialismo', 'instituicoes', 'cima', [f('Igualdade', 'ind:igualdade', 0.8), f('Pobreza global', 'mundo:pobreza_global', 0.6), f('Regimes socialistas', 'mundo:socialismo_global', -1)]),
  ind('apoio_capitalismo_global', 'Apoio Global ao Capitalismo', 'instituicoes', 'cima', [f('Confiança empresarial', 'ind:confianca_empresarial', 0.8), f('Crescimento global', 'mundo:crescimentoGlobal', 0.7), f('Abertura', 'pais:abertura', 0.6)]),
  ind('religiosidade', 'Religiosidade', 'cultura', 'baixo', [f('Tradição religiosa', 'pais:religiosidade', 2), f('Igreja & Estado (lei)', 'leis:igreja', -1.2), f('Estado laico', 'reforma:estado_laico', -1.5), f('Descrença', 'ind:descrenca', -0.8)]),
  ind('descrenca', 'Descrença e Secularismo', 'cultura', 'cima', [f('Escolaridade', 'ind:graduados_universitarios', 0.6), f('Estado laico', 'reforma:estado_laico', 1.5), f('Religiosidade', 'ind:religiosidade', -1), f('Igualdade de gênero', 'ind:igualdade_genero', 0.4)]),
];