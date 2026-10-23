import { create } from 'zustand';
import pako from 'pako';
import type { World, Country, PolicyKey, ToggleKey, TratadoTipo, LeisId, Policies, PesquisaKey, ConstrucaoId, ProgramaTipo } from '../engine/types';
import { criaMundo } from '../engine/init';
import { passoMundial } from '../engine/simulation';
import { ajustar, rel, declararGuerra, finalizarGuerra, temTratado, TRATADO_LABEL, emGuerraCom } from '../engine/geopolitics';
import { clamp, semECD, fmtBilhoes } from '../engine/util';
import { notifica } from '../engine/data/events';
import { criarCrise } from '../engine/crises';
import { aplicaEfeito } from '../engine/decisions';
import { reformaLeiGenerica } from '../engine/normas/vigencia';
import { LEIS_MAP, REFORMAS_MAP, norma } from '../engine/data/normas/catalogo';
import { par } from '../engine/normas/registro';
import { iniciaMercado, mercadoPrecisaIniciar } from '../engine/market';
import { computaGlobal } from '../engine/indicadores';
import { reformaInstitucional, dissolverParlamento, pressionarCorte, iniciarGoverno } from '../engine/governo';
import { iniciarIndicadores, iniciarSectoresDet } from '../engine/indicadores';
import { passoFinancas } from '../engine/economy';
import { iniciaProcessoDissolucao, podeDissolucaoInterna, podeReconstituirGoverno } from '../engine/dissolucao';
import { leisParaRegime } from '../engine/data/normas/padroesPorRegime';
import { propoeSlider, propoeToggle, propoeReforma, cancelarProposta, concluirCerimonia, sancionarCerimonia, vetarCerimonia, articularLegislativo, articularJudiciario, recontarVotos, aprovarImediato as aprovarImediatoCmd } from '../engine/propostas';
import { anexaPlaneta } from '../engine/anexacao';
import { construirObra, demolirObra, ajustarFuncionarios } from '../engine/public';
import { useUi } from './ui';
import { novoPrograma, lancarExploracao, sondarPlaneta, colonizarPlaneta, expandirColonia, cancelarPrograma, gerarEspaco, garanteTexturas, espacoResumo } from '../engine/space';

const SAVE_KEY = 'axioma_save_v1';
const SAVE_KEY_ANTIGO = 'mandato_save_v1';
const SAVE_MAGICO = 'AXZ1:';

const bytesParaBase64 = (bytes: Uint8Array): string => {
  let s = '';
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + passo)));
  }
  return btoa(s);
};

const base64ParaBytes = (b64: string): Uint8Array => {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
};

const comprime = (raw: string): string =>
  SAVE_MAGICO + bytesParaBase64(pako.gzip(raw, { level: 9 }));

const descomprime = (str: string): string | null => {
  if (!str.startsWith(SAVE_MAGICO)) return str;
  try {
    const bytes = base64ParaBytes(str.slice(SAVE_MAGICO.length));
    return new TextDecoder().decode(pako.ungzip(bytes));
  } catch {
    return null;
  }
};

interface GameStore {
  w: World | null;
  vel: number;
  rodando: boolean;
  rascunho: Partial<Policies>;
  cerimoniaId: string | null;
  novoJogo: (paisId: string) => void;
  avancar: () => void;
  setVel: (v: number) => void;
  setRodando: (r: boolean) => void;
  setPolitica: (k: PolicyKey, v: number) => void;
  submeterPolitica: () => void;
  descartarPolitica: () => void;
  setAlternador: (k: ToggleKey) => void;
  setCorpDesconto: (regra: 'precos' | 'oferta' | 'salarios' | 'emprego', valor: number) => void;
  proporReforma: (rid: string, delta: number, param?: number) => void;
  proporAliquota: (rid: string, valor: number) => void;
  cancelarProposta: (id: string) => void;
  concluirCerimonia: () => void;
  sancionarCerimonia: () => void;
  vetarCerimonia: () => void;
  ajustarCerimonia: () => void;
  articularLeg: (id: string) => void;
  articularJud: (id: string) => void;
  aprovarImediato: () => void;
  anexarPlaneta: () => void;
  diplomacia: (tipo: 'melhorar' | 'piorar' | 'sancao' | 'guerra' | 'paz' | 'comercio', alvo: string) => void;
  tratarTratado: (tipo: TratadoTipo, alvo: string) => void;
  espionagem: (alvo: string) => void;
  intimar: (alvo: string) => void;
  criseDecidir: (criseId: string, atitude: 'ceder' | 'intensificar' | 'desistir') => void;
  reformaLei: (lei: LeisId, opcao: number) => void;
  reformaConst: (modeloId: string) => void;
  dissolverParl: () => void;
  judiciario: (acao: 'pressionar' | 'defender') => void;
  fmi: () => void;
  resolverDecisao: (opcao: number) => void;
  construir: (id: ConstrucaoId, qtd?: number) => void;
  demolir: (id: ConstrucaoId, qtd?: number) => void;
  ajustarFuncionarios: (delta: number) => void;
  setInvestPesquisa: (k: PesquisaKey, v: number) => void;
  criarPrograma: (tipo: ProgramaTipo, nome?: string) => void;
  cancelarPrograma: (id: string) => void;
  lancarExploracao: (sistemaId: string) => void;
  sondarPlaneta: (planetaId: string) => void;
  colonizarPlaneta: (sistemaId: string, planetaId: string) => void;
  expandirColonia: (coloniaId: string) => void;
  salvar: () => void;
  carregar: () => boolean;
  reiniciar: () => void;
  iniciarDissolucao: () => void;
  reconstituirGoverno: () => void;
}

/** Encontra a proposta do jogador aguardando cerimônia de votação, se houver. */
const achaCerimonia = (w: World | null): string | null => {
  if (!w) return null;
  const c = w.paises[w.jogadorId];
  if (!c) return null;
  const p = (c.propostas ?? []).find(
    (x) =>
      x.origem === 'jogador' &&
      ((x.fase === 'sancao' && x.sancao === 'pendente') ||
        (x.cerimonia === true && (x.fase === 'camara' || x.fase === 'senado' || x.fase === 'revisao'))),
  );
  return p?.id ?? null;
};

const gravar = (w: World) => {
  try {
    localStorage.setItem(SAVE_KEY, comprime(JSON.stringify(w)));
  } catch {
    try {
      localStorage.removeItem(SAVE_KEY_ANTIGO);
      localStorage.setItem(SAVE_KEY, comprime(JSON.stringify(w)));
    } catch {
      /* noop */
    }
  }
};

const pegarSave = (): World | null => {
  try {
    const novo = localStorage.getItem(SAVE_KEY);
    if (novo) {
      const texto = descomprime(novo);
      return texto ? (JSON.parse(texto) as World) : null;
    }
    const antigo = localStorage.getItem(SAVE_KEY_ANTIGO);
    if (!antigo) return null;
    const texto = descomprime(antigo);
    if (!texto) return null;
    localStorage.setItem(SAVE_KEY, comprime(texto));
    localStorage.removeItem(SAVE_KEY_ANTIGO);
    return JSON.parse(texto) as World;
  } catch {
    return null;
  }
};

export const paisDoSave = (): string | null => {
  const w = pegarSave();
  return w ? w.jogadorId || null : null;
};

export interface DadosDoSalvo {
  paisId: string;
  paisNome: string;
  flag: string;
  anosPoder: number;
  aprovacao: number;
}

export const dadosDoSalvo = (): DadosDoSalvo | null => {
  const w = pegarSave();
  if (!w || !w.paises || !w.jogadorId) return null;
  const c = w.paises[w.jogadorId];
  if (!c) return null;
  return {
    paisId: w.jogadorId,
    paisNome: c.name,
    flag: c.flag,
    anosPoder: w.mesesPoder / 12,
    aprovacao: c.aprovacao,
  };
};

export const useGame = create<GameStore>((set, get) => ({
  w: null,
  vel: 1,
  rodando: false,
  rascunho: {},
  cerimoniaId: null,

  novoJogo: (paisId) => {
    const w = criaMundo(paisId);
    set({ w, vel: 1, rodando: false, rascunho: {}, cerimoniaId: null });
    gravar(w);
  },

  avancar: () => {
    const { w } = get();
    if (!w || w.decisao) return;
    if (get().cerimoniaId) return;
    passoMundial(w);
    const cer = achaCerimonia(w);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: cer, ...(cer ? { rodando: false } : {}) });
    gravar(w);
  },

  setVel: (v) => set({ vel: v }),
  setRodando: (r) => set({ rodando: r }),

  setPolitica: (k, v) => {
    const { w, rascunho } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const meta = norma(k);
    if (meta?.gate === 'imediato') {
      propoeSlider(w, c, k, v);
      set({ w: { ...w, paises: { ...w.paises } } });
      gravar(w);
      return;
    }
    const comitado = c.politica[k] ?? 0;
    if (Math.abs(v - comitado) < 1e-9) {
      if (rascunho[k] !== undefined) {
        const prox = { ...rascunho };
        delete prox[k];
        set({ rascunho: prox });
      }
      return;
    }
    if (rascunho[k] === v) return;
    set({ rascunho: { ...rascunho, [k]: v } });
  },

  submeterPolitica: () => {
    const { w, rascunho } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const chaves = Object.keys(rascunho) as PolicyKey[];
    if (chaves.length === 0) return;
    for (const k of chaves) propoeSlider(w, c, k, rascunho[k]!, true);
    notifica(w, `📨 ${chaves.length} ${chaves.length === 1 ? 'ajuste enviado' : 'ajustes enviados'} à votação no legislativo.`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } }, rascunho: {} });
    gravar(w);
  },

  descartarPolitica: () => set({ rascunho: {} }),

  setAlternador: (k) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    propoeToggle(w, c, k, !c.alternadores[k]);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  setCorpDesconto: (regra, valor) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const max = par('inc.desconto.max');
    const atual = c.corpIncentivo?.descontos ?? { precos: 0, oferta: 0, salarios: 0, emprego: 0 };
    c.corpIncentivo = {
      descontos: { ...atual, [regra]: clamp(valor, 0, max) },
      desconto: c.corpIncentivo?.desconto ?? 0,
      efetiva: c.corpIncentivo?.efetiva ?? c.politica.corporativo,
      realizado: c.corpIncentivo?.realizado ?? { precos: 0, oferta: 0, salarios: 0, emprego: 0 },
      base: c.corpIncentivo?.base,
    };
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  proporReforma: (rid, delta, param) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = propoeReforma(w, c, rid, delta, param);
    if (!r.ok && r.motivo) notifica(w, `⛔ ${r.motivo}`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  proporAliquota: (rid, valor) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const meta = REFORMAS_MAP[rid];
    if (!meta?.parametro || !meta.parametro) return;
    const p = meta.parametro;
    const r = propoeReforma(w, c, rid, 1, clamp(valor, p.min, p.max));
    if (!r.ok && r.motivo) notifica(w, `⛔ ${r.motivo}`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  cancelarProposta: (id) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    cancelarProposta(c, id);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: achaCerimonia(w) });
    gravar(w);
  },

  concluirCerimonia: () => {
    const { w, cerimoniaId } = get();
    if (!w || !cerimoniaId) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    concluirCerimonia(w, c, cerimoniaId);
    const prox = achaCerimonia(w);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: prox, rodando: prox ? false : get().rodando });
    gravar(w);
  },

  sancionarCerimonia: () => {
    const { w, cerimoniaId } = get();
    if (!w || !cerimoniaId) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    sancionarCerimonia(w, c, cerimoniaId);
    const prox = achaCerimonia(w);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: prox, rodando: prox ? false : get().rodando });
    gravar(w);
  },

  vetarCerimonia: () => {
    const { w, cerimoniaId } = get();
    if (!w || !cerimoniaId) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    vetarCerimonia(w, c, cerimoniaId);
    const prox = achaCerimonia(w);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: prox, rodando: prox ? false : get().rodando });
    gravar(w);
  },

  ajustarCerimonia: () => {
    const { w, cerimoniaId } = get();
    if (!w || !cerimoniaId) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = recontarVotos(w, c, cerimoniaId);
    if (!r.ok && r.motivo) notifica(w, `⛔ ${r.motivo}`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  aprovarImediato: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const n = aprovarImediatoCmd(w, c);
    if (n === 0) notifica(w, `ℹ️ Não há medidas pendentes para promulgar por decreto.`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: achaCerimonia(w) });
    gravar(w);
  },

  anexarPlaneta: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const anexados = anexaPlaneta(w);
    if (anexados === 0) {
      notifica(w, `🌍 Já não restam outras nações para anexar: você é o mundo.`, 'neutro', c.id);
      set({ w: { ...w, paises: { ...w.paises } } });
      return;
    }
    set({ w: { ...w, paises: { ...w.paises } }, cerimoniaId: achaCerimonia(w), rascunho: {} });
    gravar(w);
  },

  articularLeg: (id) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = articularLegislativo(w, c, id);
    if (!r.ok && r.motivo) notifica(w, `⛔ ${r.motivo}`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  articularJud: (id) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = articularJudiciario(w, c, id);
    if (!r.ok && r.motivo) notifica(w, `⛔ ${r.motivo}`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  diplomacia: (tipo, alvo) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    const t = w.paises[alvo];
    if (!c || !t || c.id === t.id) return;

    const nome = c.name;
    switch (tipo) {
      case 'melhorar': {
        const delta = rel(w, c.id, t.id) < -50 ? 4 : 6;
        ajustar(w, c.id, t.id, delta);
        notifica(w, `🤝 ${nome} e ${t.name} aprofundam o diálogo diplomático.`, 'bom', c.id);
        break;
      }
      case 'piorar': {
        ajustar(w, c.id, t.id, -6);
        notifica(w, `😠 ${nome} adota postura hostil contra ${t.name}.`, 'ruim', c.id);
        break;
      }
      case 'sancao': {
        ajustar(w, c.id, t.id, -12);
        t.crescimento -= 0.6;
        c.aprovacao += 2;
        notifica(w, `⚖️ ${nome} impõe sanções econômicas a ${t.name}.`, 'ruim', c.id);
        gravar(w);
        break;
      }
      case 'guerra': {
        const ok = declararGuerra(w, c.id, t.id, 'declaração de guerra');
        if (!ok) return;
        c.aprovacao = clamp(c.aprovacao + 6, -100, 100);
        break;
      }
      case 'paz': {
        const g = w.guerras.find((x) => (x.atacante === c.id && x.defensor === t.id) || (x.atacante === t.id && x.defensor === c.id));
        if (g) {
          finalizarGuerra(w, g);
          notifica(w, `🕊️ ${nome} assina paz com ${t.name}.`, 'bom', c.id);
        } else {
          notifica(w, `ℹ️ Não há guerra entre ${nome} e ${t.name}.`, 'neutro', c.id);
        }
        break;
      }
      case 'comercio': {
        ajustar(w, c.id, t.id, 10);
        if (rel(w, c.id, t.id) > 30) {
          c.crescimento += 0.4;
          t.crescimento += 0.4;
        }
        notifica(w, `📦 ${nome} e ${t.name} assinam acordo comercial.`, 'bom', c.id);
        break;
      }
    }
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  tratarTratado: (tipo, alvo) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    const t = w.paises[alvo];
    if (!c || !t || c.id === t.id) return;
    if (temTratado(w, c.id, t.id, tipo)) {
      notifica(w, `ℹ️ Já existe ${TRATADO_LABEL[tipo].toLowerCase()} entre ${c.name} e ${t.name}.`, 'neutro', c.id);
      return;
    }
    const r = rel(w, c.id, t.id);
    const exige: Partial<Record<TratadoTipo, number>> = { alianca: 55, nao_agressao: 0, comercio: -10, acesso_militar: 35, ajuda_militar: 10 };
    if (r < (exige[tipo] ?? 0)) {
      notifica(w, `⛔ ${t.name} recusa o ${TRATADO_LABEL[tipo].toLowerCase()}: relações muito frias (${Math.round(r)}).`, 'ruim', c.id);
      return;
    }
    w.tratados.push({ id: semECD(), tipo, a: c.id, b: t.id, meses: tipo === 'alianca' ? 180 : 60 });
    ajustar(w, c.id, t.id, tipo === 'alianca' ? 6 : 4);
    notifica(w, `📜 ${c.name} e ${t.name} firmam ${TRATADO_LABEL[tipo].toLowerCase()}.`, 'bom', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  espionagem: (alvo) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    const t = w.paises[alvo];
    if (!c || !t || c.id === t.id) return;
    const rnd = Math.random();
    if (rnd < 0.5) {
      t.pesquisa.militar = clamp(t.pesquisa.militar + 4, 0, 100);
      notifica(w, `🕵️ Espionagem: você vazou tecnologia sensível de ${t.name}.`, 'neutro', c.id);
    } else if (rnd < 0.85) {
      t.estabilidade = clamp(t.estabilidade - 6, -30, 100);
      notifica(w, `🕵️ Seus serviços secretos desestabilizaram ${t.name} (reputação sofre).`, 'ruim', c.id);
    } else {
      t.estabilidade = clamp(t.estabilidade - 10, -30, 100);
      notifica(w, `🪤 Operação encoberta tenta orquestrar mudança de regime em ${t.name}.`, 'ruim', c.id);
    }
    c.infamia = clamp(c.infamia + 5, 0, 100);
    if (Math.random() < 0.35) {
      ajustar(w, c.id, t.id, -18);
      notifica(w, `🚨 ${t.name} descobriu a operação encoberta! Escândalo diplomático.`, 'ruim', c.id);
    }
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  intimar: (alvo) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    const t = w.paises[alvo];
    if (!c || !t || c.id === t.id) return;
    if (w.crises.some((x) => (x.a === c.id && x.b === t.id) || (x.a === t.id && x.b === c.id)) || emGuerraCom(w, c.id).includes(t.id)) return;
    criarCrise(w, c.id, t.id, 'Ultimato diplomático');
    notifica(w, `⚠️ ${c.name} emite um Ultimato a ${t.name}: "Ceda, ou usaremos a força."`, 'ruim', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  criseDecidir: (criseId, atitude) => {
    const { w } = get();
    if (!w) return;
    const cr = w.crises.find((x) => x.id === criseId);
    if (!cr) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const outro = w.paises[cr.a === c.id ? cr.b : cr.a];
    if (!outro) return;
    if (atitude === 'intensificar') {
      cr.escalada = clamp(cr.escalada + 15, 0, cr.max);
      notifica(w, `🔥 ${c.name} eleva a aposta na crise com ${outro.name}.`, 'ruim', c.id);
    } else if (atitude === 'ceder' && cr.b === c.id) {
      w.crises = w.crises.filter((x) => x.id !== criseId);
      ajustar(w, c.id, outro.id, -14);
      c.aprovacao = clamp(c.aprovacao - 5, -100, 100);
      c.prestige = clamp(c.prestige - 40, 0, 2000);
      notifica(w, `🕊️ ${c.name} cedeu às exigências de ${outro.name}.`, 'ruim', c.id);
    } else if (atitude === 'desistir' && cr.a === c.id) {
      w.crises = w.crises.filter((x) => x.id !== criseId);
      ajustar(w, c.id, outro.id, -8);
      c.aprovacao = clamp(c.aprovacao - 3, -100, 100);
      notifica(w, `🤝 ${c.name} recuou no ultimato a ${outro.name}.`, 'neutro', c.id);
    }
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  reformaLei: (lei, opcao) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const def = LEIS_MAP[lei];
    if (!def || c.leis[lei] === opcao) return;
    reformaLeiGenerica(w, c, lei, opcao);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  reformaConst: (modeloId) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = reformaInstitucional(c, w, modeloId);
    notifica(w, r.msg, r.ok ? 'bom' : 'ruim', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  dissolverParl: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    dissolverParlamento(c, w);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  judiciario: (acao) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const g = c.governo;
    if (!g) return;
    if (acao === 'pressionar') {
      pressionarCorte(c, w);
    } else {
      g.corte = clamp(g.corte + 5, 5, 95);
      g.corteLider = clamp(g.corteLider + 8, 5, 95);
      g.conflitoPoderes = clamp(g.conflitoPoderes - 4, 0, 100);
      notifica(w, `⚖️ O governo de ${c.name} garante a independência do judiciário (${Math.round(g.corte)}).`, 'bom', c.id);
    }
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  fmi: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    if (c.dividaPct < 40) {
      notifica(w, `ℹ️ O FMI só concede pacotes a países com dívida relevante.`, 'neutro', c.id);
      return;
    }
    const montante = c.gdp * 0.025;
    c.gdp += montante;
    c.dividaPct = clamp(c.dividaPct + 3, 0, 350);
    c.aprovacao = clamp(c.aprovacao + 2, -100, 100);
    c.infamia = clamp(c.infamia + 1, 0, 100);
    notifica(w, `🏦 O FMI aprova ${fmtBilhoes(montante)} em socorro a ${c.name}, com condições fiscais.`, 'neutro', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  resolverDecisao: (opcao) => {
    const { w } = get();
    if (!w || !w.decisao) return;
    const dec = w.decisao;
    const c = w.paises[dec.paisId];
    const op = dec.opcoes[opcao];
    if (c && op) {
      for (const e of op.efeitos) aplicaEfeito(w, c, e);
      if (!w.gameOver && w.jogadorId === dec.paisId) {
        notifica(w, `✔️ Decisão: ${op.label}`, 'neutro', c.id);
      }
    }
    w.decisao = null;
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  construir: (id, qtd = 1) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    for (let i = 0; i < qtd; i++) construirObra(c, id, w);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  demolir: (id, qtd = 1) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    for (let i = 0; i < qtd; i++) demolirObra(c, id, w);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  ajustarFuncionarios: (delta) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    ajustarFuncionarios(c, delta, w);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  setInvestPesquisa: (k, v) => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    c.pesquisaInvest = { ...c.pesquisaInvest, [k]: clamp(v, 0, 100) };
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  criarPrograma: (tipo, nome) => {
    const { w } = get();
    if (!w) return;
    novoPrograma(w, tipo, nome);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  cancelarPrograma: (id) => {
    const { w } = get();
    if (!w) return;
    cancelarPrograma(w, id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  lancarExploracao: (sistemaId) => {
    const { w } = get();
    if (!w) return;
    const modo = useUi.getState().modoEspaco;
    lancarExploracao(w, sistemaId, espacoResumo(w, modo).alcance);
    set({ w: { ...w, paises: { ...w.paises }, espaco: { ...w.espaco } } });
    gravar(w);
  },

  sondarPlaneta: (planetaId) => {
    const { w } = get();
    if (!w) return;
    sondarPlaneta(w, planetaId);
    set({ w: { ...w, paises: { ...w.paises }, espaco: { ...w.espaco } } });
    gravar(w);
  },

  colonizarPlaneta: (sistemaId, planetaId) => {
    const { w } = get();
    if (!w) return;
    colonizarPlaneta(w, sistemaId, planetaId);
    set({ w: { ...w, paises: { ...w.paises }, espaco: { ...w.espaco } } });
    gravar(w);
  },

  expandirColonia: (coloniaId) => {
    const { w } = get();
    if (!w) return;
    expandirColonia(w, coloniaId);
    set({ w: { ...w, paises: { ...w.paises }, espaco: { ...w.espaco } } });
    gravar(w);
  },

  salvar: () => {
    const { w } = get();
    if (w) gravar(w);
  },

  carregar: () => {
    try {
      const w = pegarSave();
      if (!w) return false;
      if (!w.paises || !w.jogadorId) return false;
      if (!w.tratados) w.tratados = [];
      if (!w.crises) w.crises = [];
      if (mercadoPrecisaIniciar(w)) iniciaMercado(w);
      if (!w.indGlobal || Object.keys(w.indGlobal).length === 0 || w.indGlobal.religiao_global === undefined) computaGlobal(w);
      if (!w.espaco) w.espaco = gerarEspaco(w.ano ?? 2026);
      garanteTexturas(w.espaco);
      w.decisao = null;
      for (const c of Object.values(w.paises)) {
        if (!c.pops) c.pops = { sol: 45, alfabetizacao: 60, radicalizacao: 25, lealismo: 50, migracaoLiquida: 0 };
        if (!c.pesquisa) c.pesquisa = { militar: c.militar.tecnologia * 100, industrial: 50, social: 50, espacial: 5 };
        if (c.pesquisa && c.pesquisa.espacial === undefined) c.pesquisa.espacial = 5;
        if (!c.pesquisaInvest) c.pesquisaInvest = { militar: 30, industrial: 35, social: 25, espacial: 10 };
        if (!c.construcoes) {
          c.construcoes = {
            hospital: Math.max(4, Math.round(c.populacao * 0.9)),
            posto: Math.max(6, Math.round(c.populacao * 2.1)),
            escola: Math.max(20, Math.round(c.populacao * 6)),
            universidade: Math.max(1, Math.round(c.populacao * 0.3)),
            rodovia: Math.max(10, Math.round(c.populacao * 2)),
            ferrovia: Math.max(0, Math.round(c.populacao * 0.35)),
            aeroporto: Math.max(1, Math.round(c.populacao * 0.05)),
            porto: Math.max(1, Math.round(c.populacao * 0.03)),
            metro: c.urbano > 0.5 ? Math.round(c.populacao * 0.12) : 0,
            hidreletrica: Math.max(1, Math.round(c.populacao * 0.1)),
            termoeletrica: Math.max(0, Math.round(c.populacao * 0.12)),
            usina_solar: Math.max(0, Math.round(c.populacao * 0.3)),
            usina_eolica: Math.max(0, Math.round(c.populacao * 0.2)),
            usina_nuclear: Math.max(0, Math.round(c.populacao * 0.015)),
            saneamento: Math.max(1, Math.round(c.populacao * 0.4)),
            presidio: 2 + Math.round(c.populacao * 0.15),
            estadio: 1 + Math.round(c.populacao * 0.1),
            telecom: 4 + Math.round(c.populacao * 2.5),
            datacenter: Math.max(0, Math.round(c.populacao * 0.12)),
            defesa: Math.max(1, Math.round(c.populacao * 0.18)),
          };
        }
        if (c.funcionariosMil === undefined) c.funcionariosMil = Math.round(c.populacao * 0.02 * 1000);
        if (!c.programasEspaciais) c.programasEspaciais = [];
        if (!c.leis) c.leis = { sufragio: c.democracia > 0.6 ? 2 : 0, executivo: c.democracia > 0.6 ? 1 : 3, economia: 1, servicos: 1, igreja: c.religiosidade > 0.6 ? 2 : 1, midia: c.democracia > 0.6 ? 0 : 2, cidadania: 1, terra: 1, policia: c.democracia > 0.5 ? 0 : 2 };
        if (c.infamia === undefined) c.infamia = 0;
        if (c.prestige === undefined) c.prestige = 50;
        if (!c.aprovComp) c.aprovComp = { economia: 0, seguranca: 0, direitos: 0, prestigio: 0 };
        if (!c.governo) c.governo = iniciarGoverno(c);
        if (!c.indicadores || Object.keys(c.indicadores).length === 0) iniciarIndicadores(c);
        if (!c.sectoresDet || Object.keys(c.sectoresDet).length === 0) iniciarSectoresDet(c);
        if (!c.rawInd) c.rawInd = {};
        if (c.emissaoCo2 === undefined) c.emissaoCo2 = 35;
        if (!c.reformas) c.reformas = {};
        if (!c.impostos) {
          c.impostos = {};
          for (const rid of Object.keys(c.reformas ?? {})) {
            const meta = REFORMAS_MAP[rid];
            if (meta?.parametro && (c.reformas[rid] ?? 0) > 0) c.impostos[rid] = meta.parametro.padrao;
          }
        }
        if (!c.reformasInd) c.reformasInd = {};
        if (!c.corpIncentivo) c.corpIncentivo = { descontos: { precos: 0, oferta: 0, salarios: 0, emprego: 0 }, desconto: 0, efetiva: c.politica.corporativo, realizado: { precos: 0, oferta: 0, salarios: 0, emprego: 0 } };
        if (!c.propostas) c.propostas = [];
        if (!c.orcamento || !('fundoAporte' in c.orcamento)) {
          passoFinancas(c, w);
        }
        if (c.fundoValor === undefined) c.fundoValor = 0;
        for (const p of c.partidos) {
          if (p.fundos === undefined) p.fundos = 25;
          if (p.reformismo === undefined) p.reformismo = 45;
          if (p.aprovaPartido === undefined) p.aprovaPartido = c.aprovacao + 25;
        }
        if (c.pressaoDissol === undefined) c.pressaoDissol = 18 + Math.random() * 12;
        if (c.cooldownDissol === undefined) c.cooldownDissol = 0;
        if (c.dissolucao === undefined) c.dissolucao = null;
        if (c.posEstado === undefined) c.posEstado = null;
      }
      set({ w, vel: 1, rodando: false, rascunho: {}, cerimoniaId: achaCerimonia(w) });
      gravar(w);
      return true;
    } catch {
      return false;
    }
  },

  reiniciar: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_KEY_ANTIGO);
    } catch { /* noop */ }
    set({ w: null, vel: 1, rodando: false, rascunho: {}, cerimoniaId: null });
  },

  iniciarDissolucao: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c) return;
    const r = podeDissolucaoInterna(c);
    if (!r.ok) {
      notifica(w, `⛔ Não é possível iniciar uma dissolução ordenada: ${r.motivos.join(' ')}`, 'ruim', c.id);
      set({ w: { ...w, paises: { ...w.paises } } });
      return;
    }
    const ini = iniciaProcessoDissolucao(w, c, 'governo');
    if (!ini.ok && ini.motivo) notifica(w, `⛔ ${ini.motivo}`, 'ruim', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },

  reconstituirGoverno: () => {
    const { w } = get();
    if (!w) return;
    const c = w.paises[w.jogadorId];
    if (!c || !c.posEstado) return;
    const r = podeReconstituirGoverno(c);
    if (!r.ok) {
      notifica(w, `⛔ A consulta popular pela reconstituição do Estado não prosperou: ${r.motivos.join(' ')}`, 'ruim', c.id);
      set({ w: { ...w, paises: { ...w.paises } } });
      return;
    }
    c.posEstado = null;
    c.dissolucao = null;
    c.pressaoDissol = 5;
    c.cooldownDissol = 60;
    c.regime = 'híbrido';
    c.democracia = clamp(c.democracia, 0.45, 0.75);
    try {
      const g = iniciarGoverno(c);
      if (g) c.governo = g;
    } catch { /* mantém governo atual */ }
    c.leis = leisParaRegime('híbrido', c.democracia, c.religiosidade);
    c.pops.radicalizacao = clamp(c.pops.radicalizacao - 10, 5, 90);
    c.estabilidade = clamp(c.estabilidade + 5, 0, 100);
    notifica(w, `🏛️ ${c.name}: ante a coordenação alcançada pelas comunidades, uma consulta reconstitue um Estado descentralizado.`, 'bom', c.id);
    set({ w: { ...w, paises: { ...w.paises } } });
    gravar(w);
  },
}));

export const jogador = (w: World | null): Country | null =>
  w && w.paises[w.jogadorId] ? w.paises[w.jogadorId] : null;