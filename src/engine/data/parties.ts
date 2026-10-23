import type { Country, Party } from '../types';
import { clamp } from '../util';

interface Template {
  nome: string;
  color: string;
  ideo: [number, number];
  traits: string[];
}

const TEMPLATES: Template[] = [
  { nome: 'Partido Progressista', color: '#e5484d', ideo: [-0.6, -0.4], traits: ['sindicatos', 'intelectuais'] },
  { nome: 'Partido Social-Democrata', color: '#f5a524', ideo: [-0.35, -0.1], traits: ['sindicatos', 'burocratas', 'intelectuais'] },
  { nome: 'Partido do Centro', color: '#36b37e', ideo: [0, 0.05], traits: ['burguesia', 'burocratas', 'camponeses'] },
  { nome: 'Partido Conservador', color: '#3b5bfd', ideo: [0.3, 0.6], traits: ['clero', 'forcasArmadas', 'camponeses'] },
  { nome: 'Partido Liberal', color: '#ff7452', ideo: [0.75, -0.25], traits: ['burguesia', 'industriais', 'latifundiarios'] },
  { nome: 'Movimento Nacional', color: '#5243aa', ideo: [0.1, 0.9], traits: ['forcasArmadas', 'camponeses', 'clero'] },
  { nome: 'Frente Verde', color: '#2e7d32', ideo: [-0.3, -0.7], traits: ['intelectuais'] },
  { nome: 'Partido do Povo', color: '#c62828', ideo: [-0.8, -0.4], traits: ['sindicatos', 'camponeses'] },
  { nome: 'União Empresarial', color: '#7c4dff', ideo: [0.9, 0.2], traits: ['burguesia', 'industriais'] },
  { nome: 'Bloco Autoritário', color: '#37474f', ideo: [-0.2, 0.95], traits: ['forcasArmadas', 'burocratas', 'clero'] },
  { nome: 'Aliança do Estado', color: '#455a64', ideo: [0.15, 0.85], traits: ['burocratas', 'forcasArmadas'] },
  { nome: 'Partido Radical', color: '#880e4f', ideo: [0.7, 0.7], traits: ['forcasArmadas', 'clero', 'burguesia'] },
];

const ajusta = (t: Template, c: Country): Template => {
  const e = clamp(t.ideo[0] + (c.ideologia.econ * 0.35), -1, 1);
  const s = clamp(t.ideo[1] + (c.ideologia.social * 0.25), -1, 1);
  return { ...t, ideo: [e, s] };
};

export const makePartidos = (c: Country): Party[] => {
  const democrata = c.regime !== 'autoritário';
  const tamanho = democrata ? 5 : 4;
  const me =
    c.regime === 'autoritário'
      ? TEMPLATES.filter((t) => t.ideo[1] > 0.8 || t.nome === 'Bloco Autoritário' || t.nome === 'Aliança do Estado')
      : [...TEMPLATES].sort(
          (a, b) =>
            Math.abs((a.ideo[0] - c.ideologia.econ)) - Math.abs((b.ideo[0] - c.ideologia.econ)),
        );

  const escolhidos = me.slice(0, tamanho);
  if (democrata) {
    for (const t of [TEMPLATES[1], TEMPLATES[3]]) {
      if (escolhidos.length < tamanho + 1 && !escolhidos.includes(t)) escolhidos.push(t);
    }
  }
  return escolhidos.map((t, i) => {
    const p = ajusta(t, c);
    const proximidade = 1 - (Math.abs(p.ideo[0] - c.ideologia.econ) + Math.abs(p.ideo[1] - c.ideologia.social)) / 2;
    const base = clamp(14 + proximidade * 40 + (democrata ? 0 : i === 0 ? 45 : 0), 4, 75);
    const id = `pp_${c.id}_${t.nome.toLowerCase().replace(/\W+/g, '_')}`;
    return {
      id,
      name: t.nome,
      color: t.color,
      ideology: { econ: p.ideo[0], social: p.ideo[1] },
      traits: t.traits,
      baseSupport: base,
      support: base,
      ruling: false,
      seats: 0,
      fundos: 25 + Math.random() * 30,
      reformismo: 45 + (t.ideo[1] > 0 ? 8 : -8),
      aprovaPartido: 20 + (t.ideo[0] < 0 ? 5 : -5),
    };
  });
};