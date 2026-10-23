import type { Country, World } from '../engine/types';
import { OPINION_GROUPS, IG_DEFS } from '../engine/data/groups';
import { POLICY_DEFS, TOGGLE_DEFS, REFORMAS, REFORMAS_MAP, LEIS_DEFS } from '../engine/data/normas/catalogo';
import { nomeLocal } from '../engine/data/normas/local';
import { ALLIANCES, aliancaPorPais, membrosDa } from '../engine/data/alliances';
import { rel, emGuerraCom, TRATADO_LABEL } from '../engine/geopolitics';
import { GOODS, GOODS_PCOS, producaoDe, consumoDe, saldoComercialPct, receitaTarifaria, precoBaseSetor, producaoSetor, consumoSetor } from '../engine/market';
import { MODELOS, cargoExecutivo } from '../engine/data/modelos';
import { INDICADORES, CATS } from '../engine/data/indicadores';
import { SETORES, type GrupoSetor } from '../engine/data/sectores';
import { valorFator } from '../engine/indicadores';
import { taxaMediaGlobal } from '../engine/economy';
import { par } from '../engine/normas/registro';
import { grupoValor, valorSetor } from '../engine/sectores';
import { fmtBilhoes, fmtNum, fmtPct, fmtPop, relLabel, fmtDDD } from '../engine/util';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { useState, Fragment, type ReactNode } from 'react';
import {
  Panel, Metric, Gauge, Slider, Toggle, Table, RelationBar, PropostasPendentes,
  EstadoDoPais, GruposOpniao, GruposInteresse, PartyList, NewsFeed, HistoryChart, setoresBar, Bandeira,
} from './components';

export const PanelVisaoGeral = ({ c, w }: { c: Country; w: World }) => {
  const partido = c.partidos.find((p) => p.ruling);
  const emGuerra = emGuerraCom(w, c.id);
  return (
    <div className="col-2">
      <Panel titulo="Sua Mandatura">
        <div className="lider-card">
          <div className="lider-emoji"><Bandeira e={c.flag} /></div>
          <div>
            <h2>{c.name}</h2>
            <p>
              {c.regime === 'democracia' ? 'Democracia' : c.regime === 'híbrido' ? 'Regime Híbrido' : 'Regime Autoritário'} ·{' '}
              {partido?.name ?? 'Estado'}
            </p>
            <p className="dim">
              Eleição em {fmtNum(c.proximaEleicao, 0)} meses · {c.semEleiçoes} meses restantes
            </p>
          </div>
          <div className="lider-eco">
            <h2 style={{ color: c.aprovacao >= 20 ? '#4ade80' : c.aprovacao <= -20 ? '#f87171' : '#facc15' }}>
              {fmtNum(c.aprovacao, 1)}%
            </h2>
            <p className="dim">Aprovação do governo</p>
          </div>
        </div>
        <Gauge valor={c.aprovacao} cor={c.aprovacao >= 0 ? '#4ade80' : '#f87171'} rotulo="Aprovação" />
        <Gauge valor={c.estabilidade} max={100} min={-20} cor="#c9962e" rotulo="Estabilidade" />
        {emGuerra.length > 0 && <p className="aviso-ruim">⚔️ País em guerra com {emGuerra.map((x) => w.paises[x]?.name).join(', ')}</p>}
      </Panel>

      <Panel titulo="Indicadores Principais">
        <EstadoDoPais c={c} />
        <div className="sectores">
          {setoresBar(c).map((s) => (
            <div key={s.nome} className="sector">
              <span style={{ width: `${s.v}%`, background: s.cor }} />
              <small>{s.nome} {fmtNum(s.v, 0)}%</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel titulo="Notícias do Mundo">
        <NewsFeed w={w} />
      </Panel>
    </div>
  );
};

const arredondaPasso = (v: number, passo: number) => {
  const casas = Math.max(0, -Math.floor(Math.log10(Math.max(passo, 1e-9))));
  return Number(v.toFixed(casas));
};

export const PanelEconomia = ({ c, w }: { c: Country; w: World }) => {
  const { setPolitica, rascunho, proporAliquota } = useGame();
  const sliders = POLICY_DEFS.filter((p) => p.bloco === 'receita' || p.bloco === 'gasto').slice(0, 8);
  const impostos = c.impostos ?? {};
  const pendParam = (rid: string) => c.propostas.some((p) => p.tipo === 'reforma' && p.reforma === rid && (p.delta ?? 0) > 0);
  return (
    <div className="col-2">
      <Panel titulo="Política Fiscal">
        {sliders.map((p) => (
          <Slider
            key={p.key}
            nome={p.nome}
            desc={p.desc}
            emoji={p.emoji}
            min={p.min}
            max={p.max}
            step={p.step}
            unidade={p.unidade}
            valor={rascunho[p.key] ?? c.politica[p.key]}
            rascunho={p.key in rascunho}
            onChange={(v) => setPolitica(p.key, v)}
          />
        ))}
      </Panel>
      <Panel titulo="Impostos por Reforma Aprovada">
        {(() => {
          const ativos = REFORMAS.filter((r) => r.parametro && (c.reformas[r.id] ?? 0) > 0);
          if (ativos.length === 0) {
            return (
              <p className="dim">
                Nenhum imposto criado por reforma aprovada. Vá em <b>Legislação</b>, escolha uma reforma com ⚙️ e,
                ao adotar, defina a alíquota.
              </p>
            );
          }
          return (
            <div className="reformas-ativas">
              {ativos.map((r) => {
                const p = r.parametro!;
                const v = impostos[r.id] ?? p.padrao;
                const seta = (alvo: number) => proporAliquota(r.id, alvo);
                return (
                  <div key={r.id} className="reforma-ativa">
                    <span>{r.emoji}</span>
                    <div>
                      <b>{nomeLocal(c.id, r.id, { nome: r.nome, desc: r.desc }).nome}</b>
                      <small className="dim">
                        {fmtNum(v, 2)}{p.unidade}
                        {pendParam(r.id) ? ' · ⏳ alíquota nova em votação' : ''}
                      </small>
                    </div>
                    <div className="caixa-stepper" style={{ marginLeft: 'auto' }}>
                      <button type="button" className="stepper" onClick={() => seta(arredondaPasso(v - p.passo, p.passo))} aria-label="diminuir alíquota">−</button>
                      <input
                        className="caixa-valor"
                        type="text"
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => {
                          const n = Number(String(e.target.value).replace(',', '.'));
                          if (Number.isNaN(n)) return;
                          seta(arredondaPasso(Math.min(p.max, Math.max(p.min, n)), p.passo));
                        }}
                      />
                      <button type="button" className="stepper" onClick={() => seta(arredondaPasso(v + p.passo, p.passo))} aria-label="aumentar alíquota">+</button>
                      <span className="slider-val">{p.unidade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Panel>
      <PanelIncentivoCorp c={c} />
      <Panel titulo="Crescimento, Preços e Emprego">
        <div className="kpis">
          <Metric label="PIB" valor={fmtBilhoes(c.gdp)} />
          <Metric label="PIB per capita" valor={`$${fmtDDD(Math.round((c.gdp * 1e9) / (c.populacao * 1e6)))}`} />
          <Metric label="Crescimento" valor={fmtPct(c.crescimento)} tom={c.crescimento >= 1 ? 'bom' : 'ruim'} />
          <Metric label="Inflação" valor={fmtPct(c.inflacao)} tom={c.inflacao > 6 ? 'ruim' : 'bom'} />
          <Metric label="Desemprego" valor={fmtPct(c.desemprego)} tom={c.desemprego > 8 ? 'ruim' : 'bom'} />
          <Metric label="Gini" valor={fmtNum(c.gini, 2)} tom={c.gini > 0.45 ? 'ruim' : 'bom'} />
        </div>
        <div className="histgrid">
          <HistoryChart historico={c.historico} serie="gdp" />
          <HistoryChart historico={c.historico} serie="crescimento" />
          <HistoryChart historico={c.historico} serie="inflacao" />
          <HistoryChart historico={c.historico} serie="desemprego" />
        </div>
      </Panel>
      <Panel titulo="Índices Sociais e Estruturais">
        <div className="kpis">
          <Gauge valor={c.infraestrutura} min={0} max={100} cor="#34d399" rotulo="Infraestrutura" />
          <Gauge valor={c.educacaoIdx * 100} min={0} max={100} cor="#c9962e" rotulo="Educação" />
          <Gauge valor={c.saudeIdx * 100} min={0} max={100} cor="#f472b6" rotulo="Saúde" />
          <Gauge valor={c.felicidade} min={0} max={100} cor="#facc15" rotulo="Felicidade" />
        </div>
      </Panel>
      <Panel titulo="Commodities Globais">
        <div style={{ display: 'flex', gap: 16 }}>
          <Metric label="Preço do Petróleo" valor={`$${fmtNum(w.precoOleo, 0)}`} />
          <Metric label="Preço dos Alimentos" valor={fmtNum(w.precoAlimento, 0)} />
          <Metric label="Crescimento Global" valor={fmtPct(w.crescimentoGlobal)} />
          <Metric label="Tensão Global" valor={fmtNum(w.tensaoGlobal, 0)} tom={w.tensaoGlobal > 70 ? 'ruim' : 'bom'} />
        </div>
      </Panel>
    </div>
  );
};

const PontoFrac = ({ rotulo, fracao }: { rotulo: string; fracao: number }) => {
  const pct = Math.round(Math.max(0, Math.min(1, fracao)) * 100);
  const cor = pct >= 60 ? '#34d399' : pct >= 25 ? '#facc15' : '#f87171';
  return (
    <div className="org-linha">
      <div className="org-topo">
        <span>{rotulo}</span>
        <b>{pct}% realizado</b>
      </div>
      <div className="gauge-track"><div className="gauge-fill" style={{ width: `${pct}%`, background: cor }} /></div>
    </div>
  );
};

const PanelIncentivoCorp = ({ c }: { c: Country }) => {
  const { setCorpDesconto } = useGame();
  const ativo = (c.reformas?.incentivo_corporativo ?? 0) > 0;
  const def = REFORMAS_MAP['incentivo_corporativo'];
  if (!ativo) {
    return (
      <Panel titulo="Incentivo ao Imposto Corporativo">
        <p className="dim">
          Autorize o programa em <b>Legislação</b>: a reforma{' '}
          {def ? `${def.emoji} ${nomeLocal(c.id, def.id, { nome: def.nome, desc: def.desc }).nome}` : 'Incentivo ao Imposto Corporativo'}{' '}
          fixa a alíquota corporativa original e libera descontos na alíquota efetiva para empresas que segurarem preços, produzirem mais, pagarem melhores salários e contratarem.
        </p>
      </Panel>
    );
  }
  const est = c.corpIncentivo;
  const original = c.impostos?.incentivo_corporativo ?? c.politica.corporativo;
  const max = par('inc.desconto.max');
  const desc = est?.descontos ?? { precos: 0, oferta: 0, salarios: 0, emprego: 0 };
  const real = est?.realizado ?? { precos: 0, oferta: 0, salarios: 0, emprego: 0 };
  const linhas: { k: keyof typeof desc; nome: string; emoji: string; desc: string }[] = [
    { k: 'precos', nome: 'Segurar os preços', emoji: '🏷️', desc: 'Desconto por manter a inflação sob controle.' },
    { k: 'oferta', nome: 'Aumentar a oferta', emoji: '🏭', desc: 'Desconto por elevar a produção industrial.' },
    { k: 'salarios', nome: 'Subir salários', emoji: '💵', desc: 'Desconto por pagar melhores salários.' },
    { k: 'emprego', nome: 'Contratar mais', emoji: '🧑💼', desc: 'Desconto por reduzir o desemprego.' },
  ];
  return (
    <Panel titulo="Incentivo ao Imposto Corporativo 🏢">
      <div className="kpis">
        <Metric label="Alíquota original" valor={`${fmtNum(original, 2)}%`} />
        <Metric label="Desconto concedido" valor={`${fmtNum(est?.desconto ?? 0, 2)} p.p.`} tom={(est?.desconto ?? 0) > 0.01 ? 'bom' : 'neutro'} />
        <Metric label="Alíquota efetiva" valor={`${fmtNum(est?.efetiva ?? original, 2)}%`} tom="bom" />
      </div>
      <p className="dim org-dica">
        Defina quanto a alíquota pode cair por cada boa prática: o desconto só é concedido conforme os resultados aparecem.
        A folha maior eleva a arrecadação de imposto de renda, ajudando a compensar a alíquota menor.
      </p>
      {linhas.map((l) => (
        <div key={l.k}>
          <Slider
            nome={l.nome}
            desc={l.desc}
            emoji={l.emoji}
            min={0}
            max={max}
            step={0.5}
            unidade="pct"
            valor={desc[l.k]}
            onChange={(v) => setCorpDesconto(l.k, v)}
          />
          <PontoFrac rotulo={`${l.emoji} ${l.nome}`} fracao={real[l.k]} />
        </div>
      ))}
    </Panel>
  );
};

const OrcLinha = ({ nome, emoji, valor, max = 12, cor, dica, lock, lockTxt }: {
  nome: string; emoji: string; valor: number; max?: number; cor: string; dica?: string; lock?: boolean; lockTxt?: string;
}) => {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div className="org-linha" title={dica}>
      <div className="org-topo">
        <span>{emoji} {nome}</span>
        <b>{fmtNum(valor, 2)}% PIB</b>
      </div>
      <div className="gauge-track"><div className="gauge-fill" style={{ width: `${pct}%`, background: cor }} /></div>
      {lock && <small className="org-lock">{lockTxt ?? '🔒 Determinado em lei — só muda por reforma'}</small>}
    </div>
  );
};

const Chip = ({ on, children, tom }: { on: boolean; children: ReactNode; tom?: 'ok' | 'ruim' | 'neutro' }) => (
  <span className={`chip ${on ? `chip-${tom ?? 'ok'}` : 'chip-off'}`}>{children}</span>
);

export const PanelFinancas = ({ c, w }: { c: Country; w: World }) => {
  const { setPolitica, fmi, rascunho } = useGame();
  const orc = c.orcamento;
  const saldo = orc.receitaTotal - orc.total;
  const pendSlider = (k: string) => c.propostas.some((p) => p.tipo === 'slider' && p.politica === k);
  const mediana = (fn: (x: Country) => number, def = 0): number => {
    const vs = Object.values(w.paises).map(fn).sort((a, b) => a - b);
    return vs.length ? vs[Math.floor(vs.length / 2)] : def;
  };
  const medGasto = mediana((x) => x.gastoPct);
  const medCarga = mediana((x) => x.receitaPct);
  const sliderMeta = (k: 'saude' | 'educacao' | 'infraestrutura' | 'pesquisa' | 'leiOrdem' | 'verde') => POLICY_DEFS.find((p) => p.key === k);
  const nomeReforma = (rid: string) => {
    const base = REFORMAS_MAP[rid];
    return (base ? nomeLocal(c.id, rid, { nome: base.nome, desc: base.desc }).nome : rid);
  };
  const ativaReforma = (rid: string) => (c.reformas[rid] ?? 0) > 0;

  const discrs: { k: 'saude' | 'educacao' | 'infraestrutura' | 'pesquisa' | 'leiOrdem' | 'verde'; nome: string; emoji: string }[] = [
    { k: 'saude', nome: 'Saúde (acima do piso)', emoji: '🏥' },
    { k: 'educacao', nome: 'Educação (acima do piso)', emoji: '🎓' },
    { k: 'infraestrutura', nome: 'Infraestrutura & Transportes', emoji: '🏗️' },
    { k: 'pesquisa', nome: 'Ciência & Tecnologia', emoji: '🔬' },
    { k: 'leiOrdem', nome: 'Segurança Pública', emoji: '👮' },
    { k: 'verde', nome: 'Meio Ambiente', emoji: '🌿' },
  ];

  return (
    <div className="col-1">
      <Panel titulo="Consolidado do Orçamento (% do PIB · ano)">
        <div className="kpis org-kpis">
          <Metric label="Receitas totais" valor={fmtNum(orc.receitaTotal, 1)} tom={orc.receitaTotal > medCarga ? 'bom' : 'neutro'} />
          <Metric label="Despesas totais" valor={fmtNum(orc.total, 1)} tom={orc.total < medGasto ? 'bom' : 'neutro'} />
          <Metric label="Resultado nominal" valor={`${saldo >= 0 ? '+' : ''}${fmtNum(saldo, 1)}`} tom={saldo >= 0 ? 'bom' : 'ruim'} />
          <Metric label="Primário (sem juros)" valor={`${orc.receitaTotal - orc.primario >= 0 ? '+' : ''}${fmtNum(orc.receitaTotal - orc.primario, 1)}`} tom={orc.receitaTotal - orc.primario >= 0 ? 'bom' : 'ruim'} />
          <Metric label="Dívida pública" valor={fmtPct(c.dividaPct)} tom={c.dividaPct > 110 ? 'ruim' : 'bom'} />
          <Metric label="Serviço da dívida" valor={`${fmtNum(orc.juros, 1)}% PIB`} tom={orc.juros > 5 ? 'ruim' : 'neutro'} />
        </div>
        <div className="org-tabela">
          <span>Carga tributária</span><b>{fmtNum(orc.receitaTotal, 1)}%</b><small>mundo ≈ {fmtNum(medCarga, 1)}%</small>
          <span>Gasto público</span><b>{fmtNum(orc.total, 1)}%</b><small>mundo ≈ {fmtNum(medGasto, 1)}%</small>
        </div>
        {orc.riscoFiscal && <p className="aviso-ruim">⚠️ Risco fiscal elevado: déficit crônico ou dívida acelerando. Mercados cobram prêmio e a crise fiscal se aproxima.</p>}
      </Panel>

      <Panel titulo="Receitas do Estado">
        <OrcLinha nome="Receita tributária" emoji="🧾" valor={orc.receitaTributaria} cor="#34d399" dica="Impostos de renda, corporativos, consumo e tarifas. A sonegação drena arrecadação." />
        <OrcLinha nome="Receita não-tributária" emoji="💎" valor={orc.receitaNaoTributaria} max={8} cor="#a3e635" dica="Royalties de recursos, dividendos estatais e receitas patrimoniais." />
        {ativaReforma('fundo_soberano') && (
          <OrcLinha
            nome="Dividendos do fundo soberano"
            emoji="🏛️"
            valor={orc.fundoDividendo}
            max={6}
            cor="#22d3ee"
            dica={`Fundo: US$ ${fmtNum(c.fundoValor ?? 0, 0)} bi em ações · rende ≈ ${fmtNum(taxaMediaGlobal(w), 1)}% a.a. (crescimento + inflação globais + prêmio de ações).`}
          />
        )}
        <OrcLinha nome="Total de receitas" emoji="💰" valor={orc.receitaTotal} cor="#4ade80" />
        {c.politica.renda < 45 && (
          <p className="dim org-dica">Quer subir a arrecação? Aumente o imposto de renda ou corporativo (Economia/Fiscalidade) ou adote a reforma 💻 Digitalização Tributária para reduzir a sonegação de {fmtPct(Math.max(0, 26 - (c.indicadores.burocracia ?? 50) / 100 * 8 - c.politica.leiOrdem / 10 - c.democracia * 8))}.</p>
        )}
      </Panel>

      <Panel titulo="Despesas Obrigatórias 🔒">
        <p className="dim org-dica">Gastos gravados em lei e movidos por demografia e direitos — não podem ser cortados pelo orçamento mensal. Só uma reforma os reduz.</p>
        <OrcLinha nome="Previdência" emoji="🧓" valor={orc.previdencia} cor="#f87171" dica={`Envelhecimento empurra o custo. Reforma: 🧓 ${nomeReforma('reforma_previdencia')}.`} lock={!ativaReforma('reforma_previdencia')} lockTxt="🔒 só reforma" />
        <OrcLinha nome="Salários do funcionalismo" emoji="👔" valor={orc.salarios} cor="#fb923c" dica={`Folha pública e cargos. Reforma: 👔 ${nomeReforma('reforma_salarios')}.`} lock={!ativaReforma('reforma_salarios')} lockTxt="🔒 só reforma" />
        <OrcLinha nome="Benefícios assistenciais" emoji="🧾" valor={orc.beneficios} cor="#facc15" dica={`Transferências de renda. Reforma: 🧾 ${nomeReforma('racionaliza_beneficios')}.`} lock={!ativaReforma('racionaliza_beneficios')} lockTxt="🔒 só reforma" />
        <OrcLinha nome="Transferências a entes" emoji="🗺️" valor={orc.transferencias} max={8} cor="#c9962e" dica={`Repasses a estados/municípios. Reforma: 🗺️ ${nomeReforma('reforma_federativa')}.`} lock={!ativaReforma('reforma_federativa')} lockTxt="🔒 só reforma" />
        <OrcLinha nome="Mínimos de saúde + educação (lei)" emoji="⚖️" valor={orc.pisoSaude + orc.pisoEduc} max={8} cor="#a78bfa" dica={`Mínimos de saúde e educação. Reforma: ⚖️ ${nomeReforma('corte_piso')} (enfrenta o judiciário).`} lock={!ativaReforma('corte_piso')} lockTxt="🔒 só reforma" />
        {ativaReforma('fundo_soberano') && (
          <OrcLinha
            nome="Aportes ao fundo soberano"
            emoji="🏛️"
            valor={orc.fundoAporte}
            max={6}
            cor="#38bdf8"
            dica={`Compra mensal de ações até a fatia-alvo de ${fmtNum(c.impostos?.fundo_soberano ?? REFORMAS_MAP['fundo_soberano']?.parametro?.padrao ?? 1, 1)}% do mercado global. Virou ativo — a saída é vender, só pela revogação da reforma.`}
            lock
            lockTxt="🔒 só reforma"
          />
        )}
        <div className="org-total">
          <span>Total obrigatório</span>
          <b>{fmtNum(orc.obrigatorias, 1)}% PIB · {fmtNum(orc.obrigatorias / Math.max(0.5, orc.total) * 100, 0)}% do orçamento</b>
        </div>
        <div className="org-pressoes">
          <small>⚙️ Pressão demográfica: idade média <b>{c.idadeMedia} anos</b> amplia a previdência · pobreza <b>{fmtNum(c.indicadores.pobreza ?? 50, 0)}</b> e desemprego {fmtPct(c.desemprego)} inflam os benefícios · burocracia {fmtNum(c.indicadores.burocracia ?? 50, 0)} eleva a folha.</small>
        </div>
      </Panel>

      <Panel titulo="Despesas Discricionárias">
        <p className="dim org-dica">O que você controla mês a mês — cada ajuste vira proposta aprovada pelo legislativo. Total: <b>{fmtNum(orc.discricionarias, 1)}% do PIB</b>{orc.corteRegra > 0 && <span className="aviso-ruim"> · Regra fiscal cortou {fmtNum(orc.corteRegra, 1)}% automaticamente</span>}.</p>
        {discrs.map((d) => {
          const meta = sliderMeta(d.k)!;
          const valorPib = d.k === 'saude' ? orc.discSaude : d.k === 'educacao' ? orc.discEduc : d.k === 'infraestrutura' ? orc.discInfra : d.k === 'pesquisa' ? orc.discPesquisa : d.k === 'leiOrdem' ? orc.discSeguranca : orc.discVerde;
          return (
            <div key={d.k}>
              <Slider
                nome={d.nome}
                desc={`${meta.desc} · gerou ${fmtNum(valorPib, 2)}% do PIB`}
                emoji={d.emoji}
                min={meta.min}
                max={meta.max}
                step={meta.step}
                unidade={meta.unidade}
                valor={rascunho[d.k] ?? c.politica[d.k]}
                pendente={pendSlider(d.k)}
                rascunho={d.k in rascunho}
                onChange={(nv) => setPolitica(d.k, nv)}
              />
            </div>
          );
        })}
        <div className="org-total">
          <span>Gastos militares (discricionário)</span>
          <b>{fmtNum(orc.discDefesa, 2)}% PIB</b>
        </div>
      </Panel>

      <Panel titulo="Despesas Financeiras">
        <OrcLinha nome="Juros da dívida" emoji="🏦" valor={orc.juros} max={9} cor="#f87171" dica="Serviço da dívida: a taxa média implícita sobe com o risco e a política monetária." />
        <OrcLinha nome="Amortização (rolagem)" emoji="🔁" valor={orc.amortizacao} max={9} cor="#fdba74" dica="Vencimentos de principal, refinanciados a cada ano." />
        <OrcLinha nome="Total financeiro" emoji="💳" valor={orc.financeiras} max={12} cor="#fca5a5" />
        <p className="dim org-dica">Taxa implícita da dívida ≈ <b>{fmtPct(orc.juros / Math.max(0.5, c.dividaPct) * 100)}</b> ao ano (dívida de {fmtPct(c.dividaPct)}). Quanto maior o déficit e a dívida, maior o prêmio de risco cobrado pelos credores.</p>
      </Panel>

      <Panel titulo="Regra Fiscal & Risco">
        <div className="chips">
          <Chip on={orc.regraOuro} tom="ok">👑 Regra de Ouro {orc.regraOuro ? 'ativa' : 'inativa'}</Chip>
          <Chip on={orc.corteRegra > 0} tom="ruim">{orc.corteRegra > 0 ? `Corte automático de ${fmtNum(orc.corteRegra, 1)}% PIB` : 'Sem cortes automáticos'}</Chip>
          <Chip on={saldo >= 0} tom="ok">Resultado {saldo >= 0 ? 'superavitário' : 'deficitário'}</Chip>
          <Chip on={orc.riscoFiscal} tom="ruim">Risco fiscal {orc.riscoFiscal ? 'alto' : 'controlado'}</Chip>
        </div>
        <p className="dim org-dica">
          {orc.regraOuro
            ? 'A Regra de Ouro (💰) limita o déficit a 2,5% do PIB: quando o teto estoura, as despesas discricionárias são contidas automaticamente no mês.'
            : 'Sem regra de ouro, o déficit nominal máximo tolerado é 6,5% (autoritários: 10%). Isso só se aplica ao expor o corte — acima disso a dívida acelera sem trava.'}
        </p>
        <button className="btn" onClick={fmi}>🏦 Pedir socorro ao FMI (aumenta a dívida, injeta crédito externo)</button>
      </Panel>

      <Panel titulo="Evolução da Dívida">
        <HistoryChart historico={c.historico} serie="divida" />
        <p className="dim org-dica">Cortes de obrigatórias disponíveis: {['reforma_previdencia', 'reforma_salarios', 'racionaliza_beneficios', 'reforma_federativa', 'corte_piso'].map((r) => `${nomeReforma(r)} ${ativaReforma(r) ? '✓' : ''}`).join(' · ')} — veja Legislação para adotar.</p>
      </Panel>
    </div>
  );
};

export const PanelPolitica = ({ c, w }: { c: Country; w: World }) => {
  const { setAlternador, rascunho } = useGame();
  const toggleDefs = TOGGLE_DEFS;
  void w; void OPINION_GROUPS; void IG_DEFS;
  const pendSlider = (k: string) => c.propostas.some((p) => p.tipo === 'slider' && p.politica === k);
  const pendToggle = (k: string) => c.propostas.some((p) => p.tipo === 'toggle' && p.toggle === k);
  return (
    <div className="col-2">
      <Panel titulo="Propostas em Tramitação">
        <PropostasPendentes c={c} />
      </Panel>

      <Panel titulo="Cenário Político">
        <div className="kpis">
          <Metric label="Aprovação" valor={fmtPct(c.aprovacao, 1)} tom={c.aprovacao >= 0 ? 'bom' : 'ruim'} />
          <Metric label="Estabilidade" valor={fmtNum(c.estabilidade, 0)} tom={c.estabilidade > 50 ? 'bom' : 'ruim'} />
          <Metric label="Regime" valor={c.regime === 'democracia' ? 'Democracia' : c.regime === 'híbrido' ? 'Híbrido' : 'Autoritário'} />
          <Metric label="Próx. eleição" valor={`${fmtNum(c.proximaEleicao, 0)} meses`} />
        </div>
        <div className="politicas-sociais">
          {POLICY_DEFS.filter((p) => p.bloco === 'politica' || p.bloco === 'economia').map((p) => (
            <Slider
              key={p.key}
              nome={p.nome}
              desc={p.desc}
              emoji={p.emoji}
              min={p.min}
              max={p.max}
              step={p.step}
              unidade={p.unidade}
              valor={rascunho[p.key] ?? c.politica[p.key]}
              pendente={pendSlider(p.key)}
              rascunho={p.key in rascunho}
              onChange={(v) => useGame.getState().setPolitica(p.key, v)}
            />
          ))}
        </div>
      </Panel>

      <Panel titulo="Alavancas Legislativas">
        <div className="toggle-grid">
          {toggleDefs.map((t) => {
            const on = c.alternadores[t.key];
            return <Toggle key={t.key} nome={t.nome} desc={t.desc} emoji={t.emoji} ligado={on} pendente={pendToggle(t.key)} onChange={() => setAlternador(t.key)} />;
          })}
        </div>
        <p className="dim nota">Toggles alteram a base de apoio e podem acionar eventos internacionais.</p>
      </Panel>

      <Panel titulo="Partidos Políticos">
        <PartyList c={c} />
      </Panel>

      <Panel titulo="Forças Sociais">
        <GruposInteresse c={c} />
      </Panel>

      <Panel titulo="Opinião Pública por Grupo">
        <GruposOpniao c={c} w={w} />
      </Panel>
    </div>
  );
};

export const PanelDiplomacia = ({ c, w }: { c: Country; w: World }) => {
  const { diplomacia, tratarTratado, espionagem, intimar, criseDecidir } = useGame();
  const alvos = Object.values(w.paises).filter((o) => o.id !== c.id).sort((a, b) => rel(w, c.id, b.id) - rel(w, c.id, a.id));
  const guerras = w.guerras;
  const crises = w.crises;
  return (
    <div className="col-1">
      <Panel titulo="Relações Internacionais (interaja com cada país)">
        <Table
          cols={['País', 'Região', 'Relação', 'Ações']}
          rows={alvos.map((o) => {
            const r = rel(w, c.id, o.id);
            const guerreando = emGuerraCom(w, c.id).includes(o.id);
            return [
              <span key="p"><b><Bandeira e={o.flag} /> {o.name}</b></span>,
              <span key="r">{o.regiao}</span>,
              <RelationBar key="bar" v={r} />,
              <div key="acoes" className="acoes">
                <button className="btn" onClick={() => diplomacia('melhorar', o.id)}>🤝 Apr</button>
                <button className="btn" onClick={() => diplomacia('piorar', o.id)}>😠 Pior</button>
                <button className="btn" onClick={() => tratarTratado('comercio', o.id)}>📦 Com.</button>
                <button className="btn" onClick={() => tratarTratado('alianca', o.id)}>📜 Aliança</button>
                <button className="btn" onClick={() => tratarTratado('nao_agressao', o.id)}>🤝 Não-agr.</button>
                <button className="btn" onClick={() => espionagem(o.id)}>🕵️ Espi.</button>
                <button className="btn" onClick={() => intimar(o.id)}>⚠️ Ultimato</button>
                <button className="btn" onClick={() => diplomacia('sancao', o.id)}>⚖️ San.</button>
                {guerreando
                  ? <button className="btn btn-paz" onClick={() => diplomacia('paz', o.id)}>🕊️ Paz</button>
                  : <button className="btn btn-guerra" onClick={() => diplomacia('guerra', o.id)}>⚔️ Guerra</button>}
              </div>,
            ];
          })}
        />
      </Panel>

      <div className="col-2">
        <Panel titulo="Crises e Ultimatos">
          {crises.length === 0 ? (
            <p className="dim">Nenhuma crise diplomática em andamento.</p>
          ) : (
            crises.map((cr) => {
              const a = w.paises[cr.a];
              const b = w.paises[cr.b];
              const envolvido = cr.a === c.id || cr.b === c.id;
              return (
                <div key={cr.id} className={`war-card ${envolvido ? 'cr-envolvido' : ''}`}>
                  <b>{a?.name} × {b?.name}</b>
                  <small>Motivo: {cr.tema}</small>
                  <Gauge valor={cr.escalada} max={cr.max} min={0} cor="#fb923c" rotulo="Escalada" />
                  {envolvido && (
                    <div className="acoes">
                      {cr.a === c.id
                        ? <>
                            <button className="btn" onClick={() => criseDecidir(cr.id, 'desistir')}>🤝 Recuar</button>
                            <button className="btn btn-guerra" onClick={() => criseDecidir(cr.id, 'intensificar')}>🔥 Intensificar</button>
                          </>
                        : <>
                            <button className="btn" onClick={() => criseDecidir(cr.id, 'ceder')}>🕊️ Ceder</button>
                            <button className="btn btn-guerra" onClick={() => criseDecidir(cr.id, 'intensificar')}>🔥 Intensificar</button>
                          </>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Panel>

        <Panel titulo="Tratados Bilaterais">
          {w.tratados.length === 0 ? (
            <p className="dim">Sem tratados bilaterais no mundo.</p>
          ) : (
            <div className="tratados">
              {w.tratados.map((t) => {
                const a = w.paises[t.a];
                const b = w.paises[t.b];
                const meu = t.a === c.id || t.b === c.id;
                return (
                  <div key={t.id} className={`tratado ${meu ? 'tr-meu' : ''}`}>
                    <span className="tr-emoji">
                      {t.tipo === 'alianca' ? '🤝' : t.tipo === 'nao_agressao' ? '🕊️' : t.tipo === 'comercio' ? '📦' : t.tipo === 'acesso_militar' ? '🎖️' : '🚑'}
                    </span>
                    <div className="tr-info">
                      <b>{TRATADO_LABEL[t.tipo]}</b>
                      <small><Bandeira e={a?.flag ?? ''} /> {a?.name} × <Bandeira e={b?.flag ?? ''} /> {b?.name} · {fmtNum(t.meses, 0)} meses</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel titulo="Guerras em Curso">
          {guerras.length === 0 ? (
            <p className="dim">O mundo está em paz.</p>
          ) : (
            guerras.map((g) => (
              <div key={g.id} className="war-card">
                <b>{g.nome}</b>
                <small>Motivo: {g.motivo}</small>
                <div className="war-meta">
                  <span>Progresso: {fmtNum(g.progresso, 0)}</span>
                  <span>Baixas: {fmtDDD((g.baixas[g.atacante] ?? 0) + (g.baixas[g.defensor] ?? 0))} mil</span>
                </div>
                <Gauge valor={g.progresso} min={-100} max={100} cor={g.progresso >= 0 ? '#4ade80' : '#f87171'} rotulo="Momentum atacante" />
              </div>
            ))
          )}
        </Panel>

        <Panel titulo="Alianças">
          <div className="aliancas">
            {ALLIANCES.map((a) => (
              <div key={a.id} className="alianca">
                <b style={{ color: a.cor }}>{a.nome}</b>
                {membrosDa(a.id).length > 0 && <small>{membrosDa(a.id).map((m) => w.paises[m]?.flag).join(' ')}</small>}
              </div>
            ))}
          </div>
          <p className="dim">
            Você integra: {aliancaPorPais(c.id).length ? aliancaPorPais(c.id).filter((id) => membrosDa(id).includes(c.id)).map((id) => ALLIANCES.find((a) => a.id === id)?.nome).filter(Boolean).join(', ') : 'nenhuma aliança formal de defesa'}
          </p>
        </Panel>
      </div>
    </div>
  );
};

export const PanelMilitar = ({ c, w }: { c: Country; w: World }) => {
  const { setPolitica, diplomacia, rascunho } = useGame();
  void diplomacia;
  const poder = Math.round((c.militar.ativo * c.militar.prontidao * (0.5 + c.militar.tecnologia)) / 10 + c.militar.orcamento * 4 + (c.militar.nuclear ? 400 : 0));
  return (
    <div className="col-2">
      <Panel titulo="Forças Armadas">
        <div className="kpis">
          <Metric label="Efetivo ativo" valor={fmtPop(c.militar.ativo / 1000)} />
          <Metric label="Reservas" valor={fmtPop(c.militar.reserva / 1000)} />
          <Metric label="Orçamento" valor={fmtBilhoes(c.militar.orcamento)} />
          <Metric label="Poder estimado" valor={fmtNum(poder, 0)} tom={poder > 3000 ? 'bom' : 'neutro'} />
        </div>
        <Slider
          nome="Gastos Militares"
          desc="% do PIB destinado às Forças Armadas"
          emoji="🪖"
          min={0}
          max={10}
          step={0.1}
          unidade="gdp"
          valor={rascunho.militar ?? c.politica.militar}
          rascunho={('militar' as const) in rascunho}
          onChange={(v) => setPolitica('militar', v)}
        />
      </Panel>
      <Panel titulo="Ameaças">
        <div className="ameacas">
          {Object.values(w.paises)
            .filter((o) => o.id !== c.id && rel(w, c.id, o.id) < -30)
            .sort((a, b) => rel(w, c.id, a.id) - rel(w, c.id, b.id))
            .map((o) => (
              <div key={o.id} className="ameaca">
                <span><Bandeira e={o.flag} /> {o.name}</span>
                <span className={`status ${rel(w, c.id, o.id) < -50 ? 'ap-ruim' : ''}`}>{relLabel(rel(w, c.id, o.id))}</span>
              </div>
            ))}
          {Object.values(w.paises).filter((o) => rel(w, c.id, o.id) >= -30).length === 0 && <p className="dim">Sem grandes ameaças declaradas.</p>}
        </div>
      </Panel>
      <Panel titulo="Comparativo de Força (Top 12)">
        <Table
          cols={['País', 'Efetivo', 'Tec.', 'Nuclear']}
          rows={Object.values(w.paises)
            .sort((a, b) => (b.militar.ativo * b.militar.tecnologia) - (a.militar.ativo * a.militar.tecnologia))
            .slice(0, 12)
            .map((o) => [
              <b key="n"><Bandeira e={o.flag} /> {o.name}</b>,
              <span key="e">{fmtPop(o.militar.ativo / 1000)}</span>,
              <span key="t">{fmtNum(o.militar.tecnologia * 100, 0)}</span>,
              <span key="nuc">{o.militar.nuclear ? '☢️' : '—'}</span>,
            ])}
        />
      </Panel>
    </div>
  );
};

export const PanelMundo = ({ w }: { w: World }) => {
  return (
    <div className="col-1">
      <Panel titulo="Painel Global">
        <div className="kpis">
          <Metric label="Ano" valor={`${w.ano}`} />
          <Metric label="Guerras ativas" valor={`${w.guerras.length}`} tom={w.guerras.length ? 'ruim' : 'bom'} />
          <Metric label="Tensão global" valor={fmtNum(w.tensaoGlobal, 0)} tom={w.tensaoGlobal > 70 ? 'ruim' : 'bom'} />
          <Metric label="Crescimento global" valor={fmtPct(w.crescimentoGlobal)} tom={w.crescimentoGlobal > 0 ? 'bom' : 'ruim'} />
          <Metric label="Religião (mundo)" valor={fmtNum(w.indGlobal?.religiao_global ?? 0, 0)} />
          <Metric label="Descrença (mundo)" valor={fmtNum(w.indGlobal?.descrenca_global ?? 0, 0)} />
          <Metric label="Petróleo" valor={`$${fmtNum(w.precoOleo, 0)}`} />
          <Metric label="Alimentos" valor={fmtNum(w.precoAlimento, 0)} />
        </div>
        <Table
          cols={['#', 'Nação', 'População', 'PIB', 'Cresc.', 'Inflação', 'Poder']}
          rows={Object.values(w.paises)
            .sort((a, b) => b.gdp - a.gdp)
            .map((o, i) => [
              <span key="i">{i + 1}</span>,
              <b key="n"><Bandeira e={o.flag} /> {o.name}</b>,
              <span key="pop">{fmtPop(o.populacao)}</span>,
              <span key="gdp">{fmtBilhoes(o.gdp)}</span>,
              <span key="cr" style={{ color: o.crescimento >= 0 ? '#4ade80' : '#f87171' }}>{fmtPct(o.crescimento)}</span>,
              <span key="inf">{fmtPct(o.inflacao)}</span>,
              <span key="pod">{fmtDDD(Math.round(o.militar.ativo / 10))}</span>,
            ])}
        />
      </Panel>

      <Panel titulo="Prestígio & Grandes Potências">
        <Table
          cols={['#', 'Nação', 'Prestígio', 'Pesquisa', 'Infâmia']}
          rows={Object.values(w.paises)
            .sort((a, b) => b.prestige - a.prestige)
            .slice(0, 15)
            .map((o, i) => [
              <b key="i">{i + 1}</b>,
              <span key="n"><Bandeira e={o.flag} /> {o.name}</span>,
              <span key="pr" style={{ color: o.prestige > 200 ? '#4ade80' : '#facc15' }}>{fmtNum(o.prestige, 0)}</span>,
              <span key="pq">{fmtNum((o.pesquisa.militar + o.pesquisa.industrial + o.pesquisa.social) / 3, 0)}</span>,
              <span key="in" style={{ color: o.infamia > 30 ? '#f87171' : '#94a3b8' }}>{fmtNum(o.infamia, 0)}</span>,
            ])}
        />
      </Panel>
    </div>
  );
};

export const PanelSociedade = ({ c, w }: { c: Country; w: World }) => {
  const { reformaLei } = useGame();
  return (
    <div className="col-2">
      <Panel titulo="População e Padrão de Vida">
        <div className="kpis">
          <Gauge valor={c.pops.sol} min={0} max={100} cor="#34d399" rotulo="Padrão de vida" />
          <Gauge valor={c.pops.alfabetizacao} min={0} max={100} cor="#c9962e" rotulo="Alfabetização" />
          <Gauge valor={c.pops.radicalizacao} min={0} max={100} cor="#f87171" rotulo="Radicalização" />
          <Gauge valor={c.pops.lealismo} min={0} max={100} cor="#facc15" rotulo="Lealdade" />
          <Gauge valor={c.pops.migracaoLiquida} min={-30} max={45} cor="#a78bfa" rotulo="Migração (% ano)" />
          <Gauge valor={c.democracia * 100} min={0} max={100} cor="#fb923c" rotulo="Democracia" />
        </div>
        <p className="dim">
          População: {fmtPop(c.populacao)} · Radicalização alta combinada com instabilidade pode levar a revoltas e golpes.
        </p>
      </Panel>

      <Panel titulo="Religião & Descrença">
        <div className="kpis">
          <Gauge valor={c.indicadores?.religiosidade ?? 50} min={0} max={100} cor="#a78bfa" rotulo="Religiosidade" />
          <Gauge valor={c.indicadores?.descrenca ?? 50} min={0} max={100} cor="#38bdf8" rotulo="Descrença" />
          <Gauge valor={w.indGlobal?.religiao_global ?? 0} min={0} max={100} cor="#c084fc" rotulo="Religião (mundo)" />
          <Gauge valor={w.indGlobal?.descrenca_global ?? 0} min={0} max={100} cor="#7dd3fc" rotulo="Descrença (mundo)" />
        </div>
        <p className="dim">A lei Igreja & Estado e a reforma de Estado Laico alteram a religiosidade; educação e ciência alimentam a descrença.</p>
      </Panel>

      <Panel titulo="Progresso Tecnológico">
        <div className="kpis">
          <Gauge valor={c.pesquisa.militar} min={0} max={100} cor="#f87171" rotulo="Tecnologia militar" />
          <Gauge valor={c.pesquisa.industrial} min={0} max={100} cor="#34d399" rotulo="Tecnologia industrial" />
          <Gauge valor={c.pesquisa.social} min={0} max={100} cor="#c9962e" rotulo="Tecnologia social" />
        </div>
        <p className="dim">O investimento em Ciência & Tecnologia e Educação acelera a pesquisa nacional.</p>
      </Panel>

      <Panel titulo="Leis Institucionais (reforma requer apoio)">
        {LEIS_DEFS.map((l) => (
          <div key={l.id} className="lei-row">
            <div className="lei-info">
              <b>{l.nome}</b>
              <small className="dim">{l.grupo}</small>
            </div>
            <div className="lei-opcoes">
              {l.opcoes.map((o, i) => (
                <button
                  key={i}
                  className={`btn lei-btn ${c.leis[l.id] === i ? 'ativo' : ''}`}
                  onClick={() => reformaLei(l.id, i)}
                >
                  {o.nome}
                </button>
              ))}
            </div>
            <small className="dim">{l.opcoes[c.leis[l.id]].desc}</small>
          </div>
        ))}
      </Panel>

      <Panel titulo="Matriz de Aprovação">
        <div className="kpis">
          <Gauge valor={c.aprovComp.economia} max={100} min={-50} cor="#34d399" rotulo="Economia" />
          <Gauge valor={c.aprovComp.seguranca} max={100} min={-50} cor="#facc15" rotulo="Segurança" />
          <Gauge valor={c.aprovComp.direitos} max={100} min={-50} cor="#c9962e" rotulo="Direitos" />
          <Gauge valor={c.aprovComp.prestigio} max={100} min={-50} cor="#a78bfa" rotulo="Prestígio" />
        </div>
      </Panel>
    </div>
  );
};

const MercadoRow = ({ nome, preco, base, prod, cons }: { nome: ReactNode; preco: number; base: number; prod: number; cons: number }) => {
  const net = prod - cons;
  return (
    <tr>
      <td>{nome}</td>
      <td>${fmtNum(preco, 0)}</td>
      <td style={{ color: preco >= base ? '#4ade80' : '#f87171' }}>{preco >= base ? '▲' : '▼'}</td>
      <td>{fmtNum(prod, 0)}</td>
      <td>{fmtNum(cons, 0)}</td>
      <td style={{ color: net >= 0 ? '#34d399' : '#f87171' }}>{net >= 0 ? `+${fmtNum(net, 0)}` : fmtNum(net, 0)}</td>
    </tr>
  );
};

export const PanelMercado = ({ c, w }: { c: Country; w: World }) => {
  const saldo = saldoComercialPct(c, w);
  const tarifa = receitaTarifaria(c, w);
  const grupos = Object.keys(GRUPO_LABEL) as GrupoSetor[];
  const NOME_BEM: Record<string, string> = {
    alimento: '🌾 Alimentos',
    petroleo: '🛢️ Petróleo',
    gaz: '🔥 Gás',
    minerais: '⛏️ Minerais',
    manufactura: '🏭 Manufaturas',
    energia: '⚡ Energia',
  };
  return (
    <div className="col-2">
      <Panel titulo="Mercado Mundial de Bens">
        <div className="mkt-tabela-wrap">
          <table className="tabela mkt-tabela">
            <thead>
              <tr>
                <th>Bem / Serviço</th>
                <th>Preço</th>
                <th>Tend.</th>
                <th>Produção</th>
                <th>Consumo</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="mkt-grupo"><th colSpan={6}>🛒 Commodities Estratégicas</th></tr>
              {GOODS.map((g) => {
                const m = w.mercado[g];
                return (
                  <MercadoRow
                    key={g}
                    nome={<b>{NOME_BEM[g]}</b>}
                    preco={m?.preco ?? GOODS_PCOS[g]}
                    base={GOODS_PCOS[g]}
                    prod={producaoDe(c, g)}
                    cons={consumoDe(c, g)}
                  />
                );
              })}
              {grupos.map((g) => {
                const lista = SETORES.filter((s) => s.grupo === g);
                if (!lista.length) return null;
                return (
                  <Fragment key={g}>
                    <tr className="mkt-grupo"><th colSpan={6}>{GRUPO_LABEL[g]} <small>{lista.length} mercados</small></th></tr>
                    {lista.map((def) => {
                      const base = precoBaseSetor(def);
                      const preco = w.mercado[def.id]?.preco ?? base;
                      return (
                        <MercadoRow
                          key={def.id}
                          nome={<b>{def.nome}</b>}
                          preco={preco}
                          base={base}
                          prod={producaoSetor(c, def)}
                          cons={consumoSetor(c, def)}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="kpis">
          <Metric label="Balança comercial" valor={`${fmtNum(saldo, 1)}% PIB`} tom={saldo >= 0 ? 'bom' : 'ruim'} />
          <Metric label="Receita de tarifas" valor={`${fmtNum(tarifa, 1)}% PIB`} />
        </div>
        <p className="dim nota">
          Cada bem, commodity e serviço tem preço mundial próprio, formado por oferta e demanda globais; produção e consumo são do seu país.
        </p>
      </Panel>

      <Panel titulo="Commodities e Mercado Global">
        <div className="kpis">
          <Metric label="Petróleo (WTI)" valor={`$${fmtNum(w.precoOleo, 0)}`} />
          <Metric label="Alimentos" valor={fmtNum(w.precoAlimento, 0)} />
          <Metric label="Crescimento global" valor={fmtPct(w.crescimentoGlobal)} tom={w.crescimentoGlobal > 0 ? 'bom' : 'ruim'} />
          <Metric label="Tensão global" valor={fmtNum(w.tensaoGlobal, 0)} tom={w.tensaoGlobal > 70 ? 'ruim' : 'bom'} />
        </div>
        <p className="dim">
          Salvado líquido (produção − consumo) determina exportadores e importadores; os preços mundiais reagem à oferta e à demanda globais.
        </p>
      </Panel>

      <Panel titulo="Setores Econômicos Detalhados">
        <div className="setores-grid">
          {grupos.map((g) => {
            const lista = SETORES.filter((s) => s.grupo === g);
            const totalG = grupoValor(c, g);
            return (
              <div key={g} className="setor-grupo">
                <h4>{GRUPO_LABEL[g]} <small className="dim">{fmtNum(totalG, 0)}</small></h4>
                <div className="setor-list">
                  {lista.map((s) => {
                    const v = valorSetor(c, s.id);
                    return (
                      <div key={s.id} className="setor-row">
                        <span className="setor-nome" title={s.rel.join(' → ')}>{s.nome} {s.intensivo ? '🔬' : ''}</span>
                        <span className="ind-track">
                          <span className="ind-fill" style={{ width: `${Math.min(100, v * 2)}%`, background: s.exportavel ? '#c9962e' : '#94a3b8' }} />
                        </span>
                        <b>{fmtNum(v, 0)}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="dim nota">
          Cada setor alimenta o comércio internacional e os indicadores; setores exportáveis (dourado) aumentam a balança comercial.
        </p>
      </Panel>
    </div>
  );
};

// ------------------------- Governo (Executivo, Legislativo, Judiciário) -------------------------

const SISTEMA_LABEL: Record<string, string> = {
  presidencial: 'Presidencialismo',
  parlamentar: 'Parlamentarismo',
  semipresidencial: 'Semipresidencialismo',
};
const ELEITORAL_LABEL: Record<string, string> = {
  majoritario: 'Majoritário (distrito)',
  proporcional: 'Proporcional',
  misto: 'Sistema misto',
  uninominal: 'Uninominal sem competição',
};

export const PanelGoverno = ({ c, w }: { c: Country; w: World }) => {
  const { reformaConst, dissolverParl, judiciario } = useGame();
  const abrirPlenario = useUi((s) => s.abrirPlenario);
  const g = c.governo;
  const modelo = MODELOS.find((m) => m.id === g.modeloId);
  const coalizaoIds = g.coalizao;
  return (
    <div className="col-2">
      <Panel titulo="Modelo Institucional">
        <div className="gov-modelo">
          <b>{modelo?.nome ?? g.modeloId}</b>
          <small className="dim">{modelo ? nomeLocal(c.id, `modelo:${modelo.id}`, { nome: modelo.nome, desc: modelo.desc }).desc : ''}</small>
          <div className="kpis">
            <Metric label="Cargo executivo" valor={cargoExecutivo(g)} />
            <Metric label="Sistema" valor={SISTEMA_LABEL[g.sistema]} />
            <Metric label="Eleitoral" valor={ELEITORAL_LABEL[g.eleitoral]} />
            <Metric label="Período" valor={`${g.mandatoMeses} meses`} />
            <Metric label="Reeleição" valor={g.reeleicao ? 'Sim' : 'Não'} />
            <Metric label="Bicameral" valor={g.bicameral ? 'Sim' : 'Não'} />
          </div>
        </div>
        <div className="reformas">
          <h4>Reforma institucional (importar modelo de outro país)</h4>
          <div className="reforma-grid">
            {MODELOS.map((m) => {
              const atual = m.id === g.modeloId;
              const origem = w.paises[m.paisOrigem];
              return (
                <button key={m.id} className={`btn reforma-btn ${atual ? 'ativo' : ''}`} onClick={() => reformaConst(m.id)}>
                  <b>{m.nome}</b>
                  <small>{nomeLocal(c.id, `modelo:${m.id}`, { nome: m.nome, desc: m.desc }).desc}</small>
                  {origem && <span className="dim"><Bandeira e={origem.flag} /> {origem.name}</span>}
                </button>
              );
            })}
          </div>
          <p className="dim nota">Reformar exige estabilidade ≥ 35 e tem custo imediato de estabilidade. Países autoritários rejeitam reformas democratizantes.</p>
        </div>
      </Panel>

      <Panel titulo="Executivo">
        <div className="gov-blocos">
          <div className="gov-bloc">
            <b>{cargoExecutivo(g)} de {c.name}</b>
            <small>{c.lider}</small>
            <Metric label="Aprovação" valor={fmtPct(c.aprovacao, 0)} tom={c.aprovacao >= 0 ? 'bom' : 'ruim'} />
            <Metric label="Delegação ao legislador" valor={fmtNum(g.delegacao, 2)} />
          </div>
          <div className="gov-bloc">
            <Gauge valor={g.apoioLegislativo} min={0} max={100} cor={g.apoioLegislativo >= 50 ? '#34d399' : '#f87171'} rotulo="Apoio no legislativo" />
            <Gauge valor={g.conflitoPoderes} min={0} max={100} cor={g.conflitoPoderes > 70 ? '#f87171' : '#facc15'} rotulo="Conflito entre poderes" />
            {g.sistema === 'parlamentar' && (
              <button className="btn" onClick={dissolverParl}>📣 Dissolver parlamento (eleições antecipadas)</button>
            )}
          </div>
        </div>
      </Panel>

      <Panel titulo="Legislativo">
        <div className="acoes">
          <button className="btn" onClick={() => abrirPlenario('legislativo')}>🏛️ Ver composição do plenário</button>
        </div>
        <div className="cadeiras">
          {c.partidos
            .filter((p) => (g.cadeiras[p.id] ?? 0) > 0 || p.support >= 1)
            .sort((a, b) => (g.cadeiras[b.id] ?? 0) - (g.cadeiras[a.id] ?? 0))
            .map((p) => {
              const cadeiraPct = ((g.cadeiras[p.id] ?? 0) / g.cadeirasTotal) * 100;
              const naCoalizao = coalizaoIds.includes(p.id);
              return (
                <div key={p.id} className={`partido ${p.ruling ? 'ruling' : ''} ${naCoalizao ? 'na-coalizao' : ''}`} style={{ borderColor: p.color }}>
                  <div className="partido-iden">
                    <b style={{ color: p.color }}>{p.name}</b>
                    <small>{p.ruling ? '⚠️ Situação' : naCoalizao ? '🔗 Coalizão' : 'Oposição'} · {gaugingSupport(p) ? `${fmtNum(p.support, 1)}%` : ''} · Fundos {fmtNum(p.fundos, 0)}</small>
                  </div>
                  <div className="partido-bar">
                    <div style={{ width: `${cadeiraPct}%`, background: p.color }} />
                  </div>
                  <b className="partido-pct">{g.cadeiras[p.id] ?? 0}</b>
                </div>
              );
            })}
        </div>
        <p className="dim">
          Coalizão: {coalizaoIds.length ? coalizaoIds.map((id) => c.partidos.find((p) => p.id === id)?.name).filter(Boolean).join(', ') : 'nenhuma'} · {Math.round((coalizaoIds.reduce((s, id) => s + (g.cadeiras[id] ?? 0), 0) / g.cadeirasTotal) * 100)}% das {g.cadeirasTotal} cadeiras
        </p>
      </Panel>

      <Panel titulo="Judiciário">
        <div className="kpis">
          <Gauge valor={g.corte} min={0} max={100} cor="#a78bfa" rotulo="Independência judicial" />
          <Gauge valor={g.corteLider} min={0} max={100} cor="#c084fc" rotulo="Postura da corte" />
          <Gauge valor={g.aprovacaoJudiciario} min={0} max={100} cor="#c9962e" rotulo="Prestígio do judiciário" />
        </div>
        <div className="acoes">
          <button className="btn" onClick={() => abrirPlenario('judiciario')}>👨‍⚖️ Ver composição do tribunal</button>
          <button className="btn" onClick={() => judiciario('defender')}>⚖️ Defender a independência judicial</button>
          <button className="btn btn-guerra" onClick={() => judiciario('pressionar')}>🛑 Pressionar a corte</button>
        </div>
        <p className="dim">
          Cortes independentes podem derrubar leis autoritárias; pressionar a corte reduz independência e eleva o conflito entre poderes.
        </p>
      </Panel>
    </div>
  );
};

const gaugingSupport = (p: { support?: number }) => (p.support ?? 0) > 0;

// ------------------------- Indicadores (clique para ver fatores) -------------------------

const corInd = (v: number, bom: 'cima' | 'baixo') => {
  const ok = bom === 'cima' ? v >= 55 : v <= 45;
  return v > 90 || v < 10 ? '#f87171' : ok ? '#4ade80' : '#facc15';
};

export const PanelIndicadores = ({ c, w }: { c: Country; w: World }) => {
  const [sel, setSel] = useState<string | null>(null);
  const selDef = INDICADORES.find((d) => d.id === sel);
  const cats = Object.keys(CATS) as (keyof typeof CATS)[];
  return (
    <div className="col-1">
      <Panel titulo="Indicadores Nacionais (clique em qualquer indicador para ver os fatores)">
        <div className="ind-cats">
          {cats.map((cat) => {
            const lista = INDICADORES.filter((d) => d.cat === cat);
            return (
              <div key={cat} className="ind-cat">
                <h4>{CATS[cat]} <small className="dim">{lista.length}</small></h4>
                <div className="ind-list">
                  {lista.map((d) => {
                    const v = c.indicadores[d.id] ?? 50;
                    const raw = c.rawInd[d.id];
                    return (
                      <button key={d.id} className={`ind-item ${sel === d.id ? 'sel' : ''}`} onClick={() => setSel(d.id)}>
                        <span className="ind-label">{d.nome}</span>
                        <span className="ind-track">
                          <span className="ind-fill" style={{ width: `${v}%`, background: corInd(v, d.bom) }} />
                        </span>
                        <b style={{ color: corInd(v, d.bom) }}>{fmtNum(v, 0)}</b>
                        {d.unid && <small className="ind-unid">{d.unid}</small>}
                        {raw !== undefined && <small className="dim">({fmtNum(raw, 1)})</small>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      {selDef && (
        <div className="modal-backdrop" onClick={() => setSel(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-fechar" onClick={() => setSel(null)}>✕</button>
            <h2>{selDef.nome}</h2>
            <p className="dim">
              Atual: <b style={{ color: corInd(c.indicadores[selDef.id] ?? 50, selDef.bom) }}>{fmtNum(c.indicadores[selDef.id] ?? 50, 0)}</b>
              {selDef.unid && <> · {selDef.unid}</>} · <small>{CATS[selDef.cat]}</small>
            </p>
            <h4>Fatores que influenciam este indicador</h4>
            <div className="fatores">
              {selDef.fatores.map((ft) => {
                const contrib = (valorFator(w, c, ft.ref) - 50) * ft.peso;
                const base = (valorFator(w, c, ft.ref)) * ft.peso;
                return (
                  <div key={ft.ref} className="fator-row">
                    <span className="fator-nome">{ft.nome}</span>
                    <span className="fator-track">
                      <span className={`fator-fill ${contrib >= 0 ? 'pos' : 'neg'}`} style={{ width: `${Math.min(100, Math.abs(contrib) * 0.8)}%` }} />
                    </span>
                    <b className={`fator-val ${contrib >= 0 ? 'pos' : 'neg'}`}>{contrib >= 0 ? '+' : ''}{fmtNum(contrib, 1)}</b>
                    <small className="dim">(fonte: {fmtNum(base, 0)})</small>
                  </div>
                );
              })}
            </div>
            <p className="dim nota">Contribuição = (fonte − 50) × peso. Clique fora para fechar.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------- Setores Econômicos -------------------------

const GRUPO_LABEL: Record<GrupoSetor, string> = {
  agro: '🌾 Agropecuária',
  industria: '🏭 Indústria',
  mineracao: '⛏️ Mineração',
  energia: '⚡ Energia',
  transporte: '🚚 Transporte',
  servicos: '💼 Serviços',
  tecnologia: '💻 Tecnologia',
  defesa: '🪖 Defesa',
  construcao: '🏗️ Construção',
  financas: '🏦 Finanças',
  cultura: '🎬 Cultura e Mídia',
};

// ------------------------- Legislação -------------------------

const BLOCOS: { id: string; nome: string; emoji: string; cor: string }[] = [
  { id: 'receita', nome: 'Receita', emoji: '💵', cor: '#34d399' },
  { id: 'gasto', nome: 'Gasto', emoji: '🧾', cor: '#f87171' },
  { id: 'economia', nome: 'Economia', emoji: '📈', cor: '#c9962e' },
  { id: 'politica', nome: 'Política', emoji: '🏛️', cor: '#fbbf24' },
];

const sensLabel = (s?: string) =>
  s === 'inconstitucional' ? '⚠️ inconstitucional' : s === 'sensivel' ? 'sensível' : '';

export const PanelReformas = ({ c, w }: { c: Country; w: World }) => {
  const { proporReforma } = useGame();
  const [ajustando, setAjustando] = useState<{ rid: string; valor: number } | null>(null);
  const stacks = c.reformas ?? {};
  const impostos = c.impostos ?? {};
  const pendenteR = (rid: string) => c.propostas.some((p) => p.tipo === 'reforma' && p.reforma === rid);
  const local = (r: (typeof REFORMAS)[number]) => nomeLocal(c.id, r.id, { nome: r.nome, desc: r.desc });
  const pv = (rid: string, padrao: number) => impostos[rid] ?? padrao;
  const clampaValor = (v: number) => {
    const a = ajustando;
    if (!a) return;
    const p = REFORMAS_MAP[a.rid]?.parametro;
    if (!p) return;
    const casas = Math.max(0, -Math.floor(Math.log10(Math.max(p.passo, 1e-9))));
    setAjustando({ ...a, valor: Number(Math.min(p.max, Math.max(p.min, v)).toFixed(casas)) });
  };
  return (
    <div className="col-2">
      <Panel titulo="Propostas em Tramitação">
        <PropostasPendentes c={c} />
      </Panel>

      <Panel titulo="Reformas Ativas">
        {REFORMAS.filter((r) => (stacks[r.id] ?? 0) > 0).length === 0 ? (
          <p className="dim">Nenhuma reforma em vigor. Escolha abaixo ou aceite as propostas do executivo.</p>
        ) : (
          <div className="reformas-ativas">
            {REFORMAS.filter((r) => (stacks[r.id] ?? 0) > 0).map((r) => (
              <div key={r.id} className="reforma-ativa">
                <span>{r.emoji}</span>
                <div>
                  <b>{local(r).nome}</b>
                  <small className="dim">
                    {r.tipo === 'empilhavel' ? `${stacks[r.id]}x` : 'em vigor'}
                    {r.parametro ? ` · alíquota ${fmtNum(pv(r.id, r.parametro.padrao), 2)}${r.parametro.unidade}` : ''}
                  </small>
                </div>
                <div className="reforma-acoes">
                  {r.parametro && (
                    <button className="btn btn-aco" onClick={() => setAjustando({ rid: r.id, valor: pv(r.id, r.parametro!.padrao) })}>⚙️</button>
                  )}
                  <button className="btn btn-perigo" onClick={() => proporReforma(r.id, -1)}>Revogar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {BLOCOS.map((b) => (
        <Panel key={b.id} titulo={`${b.emoji} ${b.nome}`} cor={b.cor}>
          {REFORMAS.filter((r) => r.bloco === b.id).map((r) => {
            const ativo = (stacks[r.id] ?? 0) > 0;
            const temParam = !!r.parametro;
            const adotBloqueado = r.tipo === 'ativa' && ativo && !temParam;
            const revogBloqueado = !ativo;
            const limite = !adotBloqueado && ativo && (stacks[r.id] ?? 0) >= (r.max ?? 1);
            const condMotivo = !adotBloqueado && !limite ? r.cond?.(c, (stacks[r.id] ?? 0) + 1) ?? null : null;
            const pendente = pendenteR(r.id);
            return (
              <div key={r.id} className="reforma-row">
                <div className="reforma-iden">
                  <span className="reforma-emoji">{r.emoji}</span>
                  <div>
                    <b>{local(r).nome}</b>
                    <small>{local(r).desc}</small>
                    <small className="dim">
                      {r.tipo === 'empilhavel' ? `empilhável até ${r.max}x · ` : 'em vigor única · '}
                      {r.custo ? `custo ${'▮'.repeat(r.custo)} · ` : ''}
                      {sensLabel(r.sensibilidade)}
                    </small>
                    {r.parametro && (
                      <small className="dim">
                        {temParam && r.parametro ? ` · alíquota ${ativo ? fmtNum(pv(r.id, r.parametro.padrao), 2) : '—'}${r.parametro.unidade} (faixa ${fmtNum(r.parametro.min, 2)}–${fmtNum(r.parametro.max, 2)})` : ''}
                      </small>
                    )}
                    {ativo && (
                      <span className="reforma-pilhas">
                        {Array.from({ length: r.max ?? 1 }, (_, i) => (
                          <span key={i} className={`pilha ${i < (stacks[r.id] ?? 0) ? 'cheia' : ''}`} />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="reforma-acoes">
                  <button
                    className="btn"
                    disabled={!!adotBloqueado || !!limite || !!condMotivo || !!pendente}
                    title={condMotivo ?? (limite ? 'Limite de pilhas atingido.' : adotBloqueado ? 'Já está em vigor.' : pendente ? 'Proposta em tramitação.' : '')}
                    onClick={() => (temParam && r.parametro ? setAjustando({ rid: r.id, valor: pv(r.id, r.parametro.padrao) }) : proporReforma(r.id, 1))}
                  >
                    {pendente ? '⏳…' : temParam ? 'Adotar ⚙️' : 'Adotar +'}
                  </button>
                  <button
                    className="btn btn-perigo"
                    disabled={revogBloqueado}
                    onClick={() => proporReforma(r.id, -1)}
                  >
                    Revogar
                  </button>
                </div>
                {condMotivo && <small className="aviso">{condMotivo}</small>}
              </div>
            );
          })}
        </Panel>
      ))}

      {ajustando && (() => {
        const meta = REFORMAS_MAP[ajustando.rid];
        const p = meta?.parametro;
        if (!meta || !p) return null;
        const ativa = (stacks[meta.id] ?? 0) > 0;
        const q = meta.efeito.receitaPct ?? 0;
        const prov = q !== 0 ? fmtNum(Math.abs(q) * (ajustando.valor / p.padrao), 2) : null;
        return (
          <div className="modal-backdrop" onClick={() => setAjustando(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-fechar" onClick={() => setAjustando(null)}>✕</button>
              <h2>{meta.emoji} {local(meta).nome}</h2>
              <p className="dim">{local(meta).desc}</p>
              <h4>{ativa ? 'Redefinir alíquota' : 'Definir alíquota'} — {p.nome}</h4>
              <div className="caixa-stepper">
                <button type="button" className="stepper" onClick={() => clampaValor(ajustando.valor - p.passo)} aria-label="diminuir">−</button>
                <input
                  className="caixa-valor"
                  type="text"
                  inputMode="decimal"
                  value={ajustando.valor}
                  onChange={(e) => {
                    const n = Number(String(e.target.value).replace(',', '.'));
                    if (!Number.isNaN(n)) clampaValor(n);
                  }}
                />
                <button type="button" className="stepper" onClick={() => clampaValor(ajustando.valor + p.passo)} aria-label="aumentar">+</button>
                <span className="slider-val">{p.unidade}</span>
              </div>
              <small className="dim nota">faixa {fmtNum(p.min, 2)}–{fmtNum(p.max, 2)}{p.unidade} · passo {fmtNum(p.passo, 2)}</small>
              {prov && <p className="dim nota">Receita pública: {q > 0 ? '+' : ''}{prov}% do PIB/mês (proporcional à alíquota)</p>}
              {meta.id === 'fundo_soberano' && (() => {
                const pibGlobal = Object.values(w.paises).reduce((a, x) => a + x.gdp, 0);
                const alvo = Math.min(ajustando.valor / 100 * par('fundo.mult.mercado') * pibGlobal, par('fundo.cap.pib') * c.gdp);
                const valor = c.fundoValor ?? 0;
                const falta = Math.max(0, alvo - valor);
                const meses = falta > 0 ? Math.ceil(falta / Math.max(1e-9, c.gdp * par('fundo.aporte.pib') / 100)) : 0;
                const taxa = taxaMediaGlobal(w);
                return (
                  <p className="dim nota">
                    Alvo: US$ {fmtNum(alvo, 0)} bi ({fmtNum(alvo / Math.max(1, c.gdp) * 100, 1)}% do PIB) · fundo atual: US$ {fmtNum(valor, 0)} bi
                    {falta > 0 ? ` · ~${meses} meses de aportes até o alvo` : ' · alvo atingido'}
                    {' · '}taxa ≈ {fmtNum(taxa, 1)}% a.a. · rendimento ≈ {fmtNum(valor * taxa / Math.max(1, c.gdp), 2)}% do PIB/ano
                  </p>
                );
              })()}
              <div className="modal-opcoes">
                <button
                  className="btn"
                  onClick={() => {
                    proporReforma(meta.id, 1, ajustando.valor);
                    setAjustando(null);
                  }}
                >
                  Enviar à votação ({fmtNum(ajustando.valor, 2)}{p.unidade})
                </button>
                <button className="btn btn-perigo" onClick={() => setAjustando(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};