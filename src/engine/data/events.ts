import type { Country, World } from '../types';
import { ALLIANCES } from './alliances';

export interface EventDef {
  id: string;
  nome: string;
  texto: string;
  peso: number;
  aplica: (w: World, c: Country) => void;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const notifica = (w: World, texto: string, tom: 'bom' | 'ruim' | 'neutro', pais?: string) => {
  w.noticias.unshift({ mes: `${w.mes + 1}/${w.ano}`, texto, tom, pais });
  if (w.noticias.length > 60) w.noticias.length = 60;
};

export const EVENTOS: EventDef[] = [
  {
    id: 'boom', nome: 'Boom de Crescimento', peso: 12,
    texto: 'Um boom de produtividade atinge a economia. Investimentos estrangeiros aceleram.',
    aplica: (w, c) => { c.crescimento += rand(0.8, 1.8); },
  },
  {
    id: 'recessao', nome: 'Recessão Global', peso: 10,
    texto: 'O comércio mundial contrai e os mercados entram em pânico.',
    aplica: (w, c) => { c.crescimento -= rand(0.5, 1.2); },
  },
  {
    id: 'disaster', nome: 'Desastre Natural', peso: 10,
    texto: 'Terremoto/inundações devastam infraestrutura e causam perdas humanas.',
    aplica: (w, c) => { c.infraestrutura -= rand(2, 5); c.estabilidade -= 3; },
  },
  {
    id: 'escandalo', nome: 'Escândalo de Corrupção', peso: 8,
    texto: 'Vazamento revela corrupção no alto escalão do governo.',
    aplica: (w, c) => { c.aprovacao -= rand(6, 14); },
  },
  {
    id: 'record', nome: 'Marco Histórico', peso: 7,
    texto: 'Um avanço civilizacional é comemorado. Clima de otimismo toma conta.',
    aplica: (w, c) => { c.felicidade += 4; c.aprovacao += 4; },
  },
  {
    id: 'greve', nome: 'Greve Nacional', peso: 7,
    texto: 'Sindicatos paralisam setores-chave da economia.',
    aplica: (w, c) => { c.crescimento -= 0.5; c.prestigio.sindicatos = (c.prestigio.sindicatos ?? 0) + 3; },
  },
  {
    id: 'pandemia', nome: 'Surto Sanitário', peso: 5,
    texto: 'Um surto de doença pressiona o sistema de saúde.',
    aplica: (w, c) => { if (c.politica.saude < 60) { c.saudeIdx -= 2; c.aprovacao -= 4; } },
  },
  {
    id: 'tecnologia', nome: 'Salto Tecnológico', peso: 8,
    texto: 'Startups e universidades produzem uma inovação revolucionária.',
    aplica: (w, c) => { c.crescimento += rand(0.5, 1); c.politica.pesquisa = Math.min(100, c.politica.pesquisa + 1); },
  },
  {
    id: 'criseAlimentos', nome: 'Quebra de Safra', peso: 7,
    texto: 'Colheitas ruins elevam o preço dos alimentos no país.',
    aplica: (w, c) => { w.precoAlimento += 15; c.inflacao += 1; },
  },
  {
    id: 'terra', nome: 'Descoberta de Recursos', peso: 6,
    texto: 'Novas reservas de recursos naturais são descobertas.',
    aplica: (w, c) => { c.indiceRecurso = Math.min(1, c.indiceRecurso + 0.15); },
  },
  {
    id: 'manifestacoes', nome: 'Manifestações Populares', peso: 8,
    texto: 'Protestos crescem nas capitais contra o governo.',
    aplica: (w, c) => { c.estabilidade -= 5; c.aprovacao -= 3; },
  },
  {
    id: 'investidorConfia', nome: 'Confiança do Investidor', peso: 7,
    texto: 'Fundos internacionais elevam o país na carteira de investimentos.',
    aplica: (w, c) => { c.crescimento += 0.6; w.crescimentoGlobal += 0.2; },
  },
  {
    id: 'cria', nome: 'Onda de Migração', peso: 6,
    texto: 'Conflitos em outra região elevam o fluxo de refugiados para o país.',
    aplica: (w, c) => { w.tensaoGlobal += 5; },
  },
  {
    id: 'ataque', nome: 'Ataque Terrorista', peso: 4,
    texto: 'Um ataque terrorista abala a segurança do país.',
    aplica: (w, c) => { c.estabilidade -= 4; c.aprovacao -= 2; },
  },
  {
    id: 'boaPolitica', nome: 'Reforma Bem-Sucedida', peso: 6,
    texto: 'As reformas do governo começam a dar frutos visíveis.',
    aplica: (w, c) => { c.aprovacao += 3; c.estabilidade += 2; },
  },
  {
    id: 'criseFiscal', nome: 'Ameaça Fiscal', peso: 5,
    texto: 'Os mercados perdem confiança nas contas públicas e o país paga juros maiores para se financiar.',
    aplica: (w, c) => {
      const orc = c.orcamento;
      if (!orc || (orc.resultado <= 5 && c.dividaPct <= 150)) return;
      c.politica.juros = Math.min(100, (c.politica.juros ?? 0) + 3);
      c.crescimento -= rand(0.3, 0.8);
      c.estabilidade -= 2;
    },
  },
  {
    id: 'espionagem', nome: 'Crise Diplomática', peso: 5,
    texto: 'Um incidente diplomático tensiona as relações do país.',
    aplica: (w, c) => { w.tensaoGlobal += 3; },
  },
];

export const aplicaEventoAleatorio = (w: World, c: Country) => {
  const lista = c.posEstado || c.dissolucao ? POST_EVENTOS : EVENTOS;
  const total = lista.reduce((a, b) => a + b.peso, 0);
  let r = Math.random() * total;
  for (const ev of lista) {
    r -= ev.peso;
    if (r <= 0) {
      ev.aplica(w, c);
      void ALLIANCES.length;
      const tom: 'bom' | 'ruim' | 'neutro' = ev.peso > 8 ? 'bom' : ev.peso < 6 ? 'ruim' : 'neutro';
      notifica(w, `[${c.name}] ${ev.nome}: ${ev.texto}`, tom, c.id);
      break;
    }
  }
};

/** Eventos específicos do território pós-estatal (ou durante a dissolução). */
export const POST_EVENTOS: EventDef[] = [
  {
    id: 'pos_malha', nome: 'Malha Comunitária', peso: 10,
    texto: 'Comunidades concluem uma ligação de infraestrutura compartilhada entre regiões.',
    aplica: (w, c) => { c.infraestrutura = Math.min(100, c.infraestrutura + rand(1, 3)); c.felicidade += 2; },
  },
  {
    id: 'pos_autonomia', nome: 'Autonomia Regional', peso: 9,
    texto: 'Uma região declara autonomia administrativa e organiza sua própria assembleia.',
    aplica: (w, c) => { if (!c.posEstado) return; c.democracia = Math.min(1, c.democracia + 0.02); c.pops.radicalizacao = Math.max(0, c.pops.radicalizacao - 2); },
  },
  {
    id: 'pos_redesTroca', nome: 'Redes de Troca', peso: 9,
    texto: 'Cooperativas de troca de produtos florescem entre os territórios locais.',
    aplica: (w, c) => { if (c.indicadores) c.indicadores.comercio_domestico = Math.min(100, (c.indicadores.comercio_domestico ?? 50) + rand(2, 5)); c.crescimento += rand(0.2, 0.6); },
  },
  {
    id: 'pos_disputa', nome: 'Disputa de Recursos', peso: 7,
    texto: 'Comunidades disputam o controle de uma fonte de água e de terras produtivas.',
    aplica: (w, c) => { c.estabilidade -= rand(3, 6); c.pops.radicalizacao = Math.min(100, c.pops.radicalizacao + 3); },
  },
  {
    id: 'pos_conversao', nome: 'Instituição Convertida', peso: 7,
    texto: 'Um antigo prédio de governo é convertido em centro comunitário e sede de assembleia.',
    aplica: (w, c) => { c.felicidade += 3; if (c.indicadores) c.indicadores.caridade = Math.min(100, (c.indicadores.caridade ?? 50) + 3); },
  },
  {
    id: 'pos_assembleia', nome: 'Assembleia Regional', peso: 8,
    texto: 'Representantes de várias comunidades firmam um pacto de cooperação regional.',
    aplica: (w, c) => { c.estabilidade += rand(2, 4); c.pops.radicalizacao = Math.max(0, c.pops.radicalizacao - 2); },
  },
  {
    id: 'pos_reconstrucao', nome: 'Alento Reconstituinte', peso: 5,
    texto: 'Um movimento surge clamando por uma autoridade central mínima para arbitrar conflitos.',
    aplica: (w, c) => { c.felicidade += 2; c.pops.radicalizacao = Math.min(100, c.pops.radicalizacao + 2); },
  },
  {
    id: 'pos_comercioExterno', nome: 'Acordo Comercial Comunitário', peso: 8,
    texto: 'Redes locais firmam acordos de exportação direta com parceiros estrangeiros.',
    aplica: (w, c) => { c.crescimento += rand(0.3, 0.8); c.infamia = Math.max(0, c.infamia - 2); },
  },
  {
    id: 'pos_reptos', nome: 'Diversidade Institucional', peso: 7,
    texto: 'Comunidades adotam modelos variados de governança, da deliberação direta a conselhos eleitos.',
    aplica: (w, c) => { c.democracia = Math.min(1, c.democracia + 0.01); c.felicidade += 2; },
  },
];