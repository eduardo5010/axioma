import type { Country, World } from './types';
import { clamp, drifta } from './util';
import { grupoValor } from './sectores';

const iv = (c: Country, id: string): number => c.indicadores[id] ?? 50;

export const passoFeedbackMilitar = (c: Country): void => {
  const alvoOrc = Math.max(2, (c.gdp * c.politica.militar) / 100);
  c.militar.orcamento = drifta(c.militar.orcamento, alvoOrc, 0.08);
  const alvoPront = clamp((c.politica.militar / 10) * 45 + iv(c, 'indice_prontidao_guerra') * 0.4 + (c.militar.nuclear ? 12 : 0), 15, 100);
  c.militar.prontidao = drifta(c.militar.prontidao, alvoPront, 0.08);
  const alvoTec = clamp(iv(c, 'indice_prontidao_guerra') * 0.35 + c.pesquisa.militar * 0.6 + grupoValor(c, 'defesa') * 0.05, 5, 95);
  c.militar.tecnologia = drifta(c.militar.tecnologia, alvoTec, 0.1);
};

export const passoFeedbackMundo = (w: World): void => {
  const cs = Object.values(w.paises);
  if (!cs.length) return;
  const media = cs.reduce((s, c) => s + (c.crescimento ?? 0), 0) / cs.length;
  const anchor = (media + 2.6) / 2;
  w.crescimentoGlobal = clamp(drifta(w.crescimentoGlobal, anchor, 0.18), -1, 4);

  let oferta = 0;
  let demanda = 0;
  for (const c of cs) {
    oferta += Math.max(0, iv(c, 'oferta_petroleo'));
    demanda += Math.max(0, iv(c, 'demanda_petroleo'));
  }
  const des = demanda - oferta;
  const fator = oferta > 1 ? des / oferta : 0.02;
  w.precoOleo = clamp(w.precoOleo + fator * 7 + (w.guerras.length ? 1.0 : -0.3), 30, 160);
};