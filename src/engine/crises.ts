import { World } from './types';
import { clamp, semECD } from './util';
import { ajustar, rel, declararGuerra, poderMilitar } from './geopolitics';
import { notifica } from './data/events';

export function criarCrise(w: World, a: string, b: string, tema: string, escalada = 20): CriseAtiva {
  const id = semECD();
  const crise: CriseAtiva = { id, a, b, tema, escalada, max: 100 };
  w.crises.push(crise);
  return crise;
}

interface CriseAtiva {
  id: string;
  a: string;
  b: string;
  tema: string;
  escalada: number;
  max: number;
}

export const criseEntre = (w: World, a: string, b: string) =>
  w.crises.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));

export function passoCrises(w: World): void {
  for (const cr of [...w.crises]) {
    const c = w.paises[cr.a];
    const d = w.paises[cr.b];
    if (!c || !d) {
      w.crises = w.crises.filter((x) => x.id !== cr.id);
      continue;
    }
    const relAC = rel(w, cr.a, cr.b);
    cr.escalada += 1.2 + (relAC < -50 ? 0.8 : 0) + (c.expansionista ? 0.5 : 0)
      + Math.max(0, 55 - (c.indicadores.integridade_territorial ?? 50)) * 0.04
      + (d.estabilidade < 20 ? 0.6 : 0)
      + ((d.governo?.conflitoPoderes ?? 0) / 80);

    const pA = poderMilitar(c);
    const pD = poderMilitar(d);

    if (cr.escalada >= cr.max) {
      w.crises = w.crises.filter((x) => x.id !== cr.id);
      const ok = declararGuerra(w, cr.a, cr.b, cr.tema);
      if (ok) notifica(w, `⚔️ A crise entre ${c.name} e ${d.name} terminou em guerra.`, 'ruim', cr.a);
      continue;
    }

    if (d.id === w.jogadorId) continue;

    const cede = pD < pA * 0.5 && relAC < 0 && Math.random() < 0.25;
    if (cede) {
      w.crises = w.crises.filter((x) => x.id !== cr.id);
      ajustar(w, cr.a, cr.b, -12);
      d.aprovacao = clamp(d.aprovacao - 5, -100, 100);
      c.aprovacao = clamp(c.aprovacao + 3, -100, 100);
      notifica(w, `🕊️ ${d.name} cedeu às exigências de ${c.name} na crise sobre ${cr.tema}.`, 'neutro', cr.b);
      continue;
    }

    if (pA < pD * 0.4 && Math.random() < 0.2) {
      w.crises = w.crises.filter((x) => x.id !== cr.id);
      ajustar(w, cr.a, cr.b, -5);
      c.aprovacao = clamp(c.aprovacao - 3, -100, 100);
      notifica(w, `🤝 ${c.name} recuou na crise com ${d.name} sobre ${cr.tema}.`, 'neutro', cr.a);
    }
  }
}