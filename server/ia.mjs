import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY ?? '';
const MODELO = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

export const iaDisponivel = Boolean(API_KEY);

const MAX_MUDANCAS = 12;
const MAX_QUEBRAS = 10;
const MAX_LEN = (s) => String(s ?? '').slice(0, 600);

const TENTATIVAS = Number(process.env.GEMINI_TENTATIVAS ?? 5);
const ESPERA_MS = 2000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function montarPrompt(titulo, descricao) {
  return `Você analisa propostas de melhoria de um simulador geopolítico (o jogo "Axioma").
O simulador tem: constituição e leis, orçamento e tributos, gastos militares e sociais, mercado,
diplomacia, sistema penal, pops e indicadores, eventos e crises, decisões.

Para a proposta abaixo (título e descrição), retorne UM JSON válido (nada além dele) com o schema:
{
  "resumo": "resumo técnico em 1-2 frases, pt-BR",
  "mudancas": ["lista de mudanças estruturais necessárias no motor para implementar a proposta (cada item curto e específico)"],
  "quebras": [{"campo": "nome do campo/save afetado", "risco": "alta|media|baixa", "descricao": "o que muda para partidas salvas existentes"}],
  "afeta": ["módulos do jogo afetados, ex: Economia, Diplomacia, Leis, Eventos"]
}
Regras: "mudancas" vazio se a proposta não exige mudança no motor; "quebras" vazio se nenhum save quebra.
"campo" em "quebras" deve citar o nome real de dados persistentes do save (ex: orcamento.gastos, leis, relacoes, reformas).

TÍTULO: "${titulo.replaceAll('"', "'")}"
DESCRIÇÃO: "${descricao.replaceAll('"', "'")}"`;
}

async function gerar(model, prompt) {
  const res = await model.generateContent(prompt);
  const texto = res?.response?.text?.() ?? '';
  if (!texto) throw new Error('resposta vazia da IA');
  return JSON.parse(texto);
}

export async function analisarProposta(titulo, descricao) {
  if (!iaDisponivel) return null;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const prompt = montarPrompt(titulo, descricao);

  // Cota gratuita do Gemini responde 429/503 sob demanda: tenta de novo com intervalo.
  let bruto = null;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      bruto = await gerar(model, prompt);
      break;
    } catch (e) {
      const status = Number(e?.status ?? e?.response?.status ?? 0);
      const naoTransitório = status === 404 || status === 400 || status === 401 || status === 403;
      if (tentativa === TENTATIVAS || naoTransitório) {
        if (tentativa === TENTATIVAS && !naoTransitório) throw e;
        if (naoTransitório) throw e;
      }
      await dormir(ESPERA_MS * tentativa);
    }
  }
  if (bruto === null) return null;

  const mudancas = Array.isArray(bruto?.mudancas)
    ? bruto.mudancas.map((m) => MAX_LEN(m)).filter(Boolean).slice(0, MAX_MUDANCAS)
    : [];
  const quebras = Array.isArray(bruto?.quebras)
    ? bruto.quebras
        .map((q) => {
          const risco = ['alta', 'media', 'baixa'].includes(q?.risco) ? q.risco : 'media';
          return {
            campo: MAX_LEN(q?.campo),
            risco,
            descricao: MAX_LEN(q?.descricao),
          };
        })
        .filter((q) => q.campo && q.descricao)
        .slice(0, MAX_QUEBRAS)
    : [];
  const afeta = Array.isArray(bruto?.afeta)
    ? bruto.afeta.map((a) => MAX_LEN(a)).filter(Boolean).slice(0, 10)
    : [];

  return {
    resumo: MAX_LEN(bruto?.resumo ?? ''),
    mudancas,
    quebras,
    afeta,
  };
}