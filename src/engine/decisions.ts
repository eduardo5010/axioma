import { Country, World, EfeitoOp, Decisao } from './types';
import { clamp } from './util';
import { ajustar, declararGuerra } from './geopolitics';
import { iniciaProcessoDissolucao, podeDissolucaoInterna } from './dissolucao';

export function aplicaEfeito(w: World, c: Country, e: EfeitoOp): void {
  switch (e.t) {
    case 'aprovacao':
      c.aprovacao = clamp(c.aprovacao + e.d, -100, 100);
      break;
    case 'estabilidade':
      c.estabilidade = clamp(c.estabilidade + e.d, -30, 100);
      break;
    case 'felicidade':
      c.felicidade = clamp(c.felicidade + e.d, 0, 100);
      break;
    case 'infamia':
      c.infamia = clamp(c.infamia + e.d, 0, 100);
      break;
    case 'gdp':
      c.gdp = Math.max(5, c.gdp * (1 + e.d / 100));
      break;
    case 'treasury':
      c.gdp = Math.max(5, c.gdp + e.d);
      break;
    case 'radical':
      c.pops.radicalizacao = clamp(c.pops.radicalizacao + e.d, 0, 100);
      break;
    case 'prestigio':
      c.prestige = clamp(c.prestige + e.d, 0, 2000);
      break;
    case 'democracia':
      c.democracia = clamp(c.democracia + e.d, 0, 1);
      c.regime = c.democracia > 0.66 ? 'democracia' : c.democracia > 0.4 ? 'híbrido' : 'autoritário';
      break;
    case 'relacao':
      if (e.alvo) ajustar(w, c.id, e.alvo, e.d);
      break;
    case 'guerra':
      if (e.alvo && e.alvo !== c.id) declararGuerra(w, c.id, e.alvo, 'confronto direto');
      break;
    case 'lei':
      c.leis[e.lei] = e.opcao;
      break;
    case 'pesquisa':
      c.pesquisa[e.campo] = clamp(c.pesquisa[e.campo] + e.d, 0, 100);
      break;
    case 'midia':
      break;
    case 'dissolver': {
      const r = podeDissolucaoInterna(c);
      const origem = r.ok ? 'governo' : 'popular';
      iniciaProcessoDissolucao(w, c, origem);
      break;
    }
    case 'fim':
      w.gameOver = true;
      w.motivoFim = e.motivo;
      break;
  }
}

export function ativaDecisao(w: World, dec: Decisao): void {
  if (dec.paisId === w.jogadorId) {
    w.decisao = dec;
    return;
  }
  const c = w.paises[dec.paisId];
  if (!c) return;
  const idx = escolheAI(w, c, dec);
  for (const e of dec.opcoes[idx].efeitos) aplicaEfeito(w, c, e);
}

function escolheAI(w: World, c: Country, dec: Decisao): number {
  void w;
  let best = 0;
  let bestScore = -Infinity;
  dec.opcoes.forEach((op, i) => {
    let score = 0;
    for (const e of op.efeitos) {
      switch (e.t) {
        case 'aprovacao': score += e.d; break;
        case 'estabilidade': score += e.d; break;
        case 'felicidade': score += e.d * 0.8; break;
        case 'infamia': score -= e.d * 1.5; break;
        case 'gdp': score += e.d * 2; break;
        case 'treasury': score += e.d * 0.12; break;
        case 'radical': score -= e.d; break;
        case 'relacao': score += e.d * (Math.random() < 0.5 ? 1 : -1); break;
        case 'guerra': score -= 12; break;
        case 'lei': score += Math.random() < 0.5 ? 6 : -4; break;
        case 'pesquisa': score += e.d * 0.5; break;
        case 'democracia': score += e.d * 15; break;
        case 'fim': score -= 50; break;
        case 'dissolver': score -= 40; break;
        default: break;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}