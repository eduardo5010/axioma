// ============================================================
// PROPOSTAS — fachada pública estável
// Toda a implementação vive agora em normas/vigencia.ts,
// parametrizada pelo Catálogo (data/normas/catalogo.ts) e pelo
// Registro Central (normas/registro.ts). Esta API pública é
// consumida por game.ts, ai.ts, country.ts, init.ts e testes e
// NÃO muda de assinatura ou comportamento.
// ============================================================
export {
  apoioPartidario,
  viabilidadeLegislativa,
  viabilidadeJudicial,
  propoeSlider,
  propoeToggle,
  propoeReforma,
  cancelarProposta,
  aplicarProposta,
  passoPropostas,
  aplicaEfeitosReformas,
  SCALAR_LIMITS,
  DAMP,
  concluirCerimonia,
  sancionarCerimonia,
  vetarCerimonia,
  articularLegislativo,
  articularJudiciario,
  recontarVotos,
  aprovarImediato,
  nomeMedida,
} from './normas/vigencia';