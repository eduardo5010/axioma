import type { Country, World } from './types';
import { passoCommodities, driftRelações, passoGuerras, declararGuerra, passoTratados } from './geopolitics';
import { passoEconomia } from './economy';
import { passoOpinia, passoGruposInteresse, passoPartidos, passoEstabilidade, passoRevolucao } from './opinion';
import { passoDissolucao } from './dissolucao';
import { passoIA, passoIASancoes } from './ai';
import { aplicaEventoAleatorio } from './data/events';
import { clamp, fmtMes } from './util';
import { passoPops, passoPesquisa } from './pops';
import { passoMercado } from './market';
import { passoCrises } from './crises';
import { calculaPrestigio } from './prestige';
import { computaIndicadores, computaGlobal } from './indicadores';
import { passoSetores } from './sectores';
import { passoGoverno } from './governo';
import { passoFeedbackMilitar, passoFeedbackMundo } from './feedback';
import { passoPropostas, aplicaEfeitosReformas } from './propostas';
import { passoConstrucoes } from './public';
import { passoEspaco } from './space';

const avancarData = (w: World) => {
  if (w.mes >= 12) {
    w.mes = 1;
    w.ano++;
  } else {
    w.mes++;
  }
};

export const empurraHistorico = (c: Country) => {
  c.historico.push({
    m: fmtMes(new Date().getFullYear(), 1),
    gdp: c.gdp,
    crescimento: c.crescimento,
    inflacao: c.inflacao,
    desemprego: c.desemprego,
    aprovacao: c.aprovacao,
    divida: c.dividaPct,
    gini: c.gini,
  });
  if (c.historico.length > 240) c.historico = c.historico.slice(-240);
};

export const checaFim = (w: World) => {
  const c = w.paises[w.jogadorId];
  if (!c || w.gameOver) return;
  if (c.posEstado) return; // a abolição do Estado não é fim de jogo
  if (w.mesesPoder % 12 === 0 && c.estabilidade <= 2) {
    w.gameOver = true;
    w.motivoFim = 'Revolução popular derrubou seu governo.';
  } else if (c.aprovacao <= -80 && c.estabilidade < 15 && c.democracia > 0.4) {
    w.gameOver = true;
    w.motivoFim = 'Impeachment: você perdeu a sustentação política.';
  }
};

export const passoMundial = (w: World) => {
  if (w.gameOver) return;
  if (w.decisao) return;

  w.turno++;
  avancarData(w);
  passoPropostas(w);
  passoCommodities(w);
  passoMercado(w);
  passoTratados(w);
  passoCrises(w);

  const ids = Object.keys(w.paises);
  for (const id of ids) {
    const c = w.paises[id];
    if (!c) continue;
    if (c.id !== w.jogadorId) passoIA(w, c);
    computaIndicadores(c, w);
    passoFeedbackMilitar(c);
    passoSetores(c, w);
    passoGoverno(c, w);
    passoEconomia(c, w);
    passoPops(c, w);
    passoPesquisa(c);
    passoConstrucoes(c, w);
    passoOpinia(c);
    passoGruposInteresse(c);
    passoPartidos(c, w);
    passoEstabilidade(c);
    aplicaEfeitosReformas(c);
    passoRevolucao(c, w);
    passoDissolucao(c, w);
    passoIASancoes(w, c);
    if (id === w.jogadorId) {
      if (Math.random() < 0.16) aplicaEventoAleatorio(w, c);
    } else if (Math.random() < 0.02) {
      aplicaEventoAleatorio(w, c);
    }
  }

  driftRelações(w);
  passoGuerras(w);
  passoEspaco(w);
  calculaPrestigio(w);
  computaGlobal(w);
  passoFeedbackMundo(w);

  if (w.guerras.length === 0 && w.tensaoGlobal > 70 && Math.random() < 0.03) {
    const pot = Object.keys(w.paises)
      .map((id) => w.paises[id])
      .filter((c) => c && (c.ideologia.social > 0.7 || c.expansionista) && !c.guerra);
    if (pot.length) {
      const atacante = pot[Math.floor(Math.random() * pot.length)];
      const alvos = Object.keys(w.paises).filter((id) => {
        const d = w.paises[id];
        return d && d.id !== atacante.id && !d.guerra && (w.relacoes[atacante.id]?.[d.id] ?? 0) < -40;
      });
      if (alvos.length) {
        const def = w.paises[alvos[Math.floor(Math.random() * alvos.length)]];
        if (def) declararGuerra(w, atacante.id, def.id, 'rivalidade regional');
      }
    }
  }

  const p = w.paises[w.jogadorId];
  if (p) {
    empurraHistorico(p);
    w.mesesPoder++;
    w.historico.push(p.historico[p.historico.length - 1]);
  }

  checaFim(w);
};

export const riscoCrescimentoGlobal = (w: World) => clamp(w.crescimentoGlobal, -2, 6);