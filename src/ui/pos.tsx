import type { Country, World } from '../engine/types';
import {
  posEstadoDossie, estabilidadeSocial, organizacaoSocial, evolucaoPos,
  podeReconstituirGoverno, podeDissolucaoInterna, pressaoDissolucao,
} from '../engine/dissolucao';
import { TRATADO_LABEL } from '../engine/geopolitics';
import { LEIS_DEFS } from '../engine/data/normas/catalogo';
import { fmtNum, fmtPct } from '../engine/util';
import { useGame } from '../store/game';
import { Panel, Metric, Gauge, Bandeira, RelTableView } from './components';

const ind = (c: Country, k: string, def = 50) => c.indicadores?.[k] ?? def;

export const ORG_INFO: Record<string, string> = {
  desmobilizada: 'As forças armadas foram desmobilizadas e integradas às comunidades.',
  comunitaria: 'As forças armadas se reorganizaram como milícias comunitárias de defesa mútua.',
  local: 'Núcleos locais de defesa assumiram o controle por região.',
  fragmentada: 'Grupos armados disputam influência regional.',
};

export const PosVisaoGeral = ({ c }: { c: Country }) => {
  const d = posEstadoDossie(c);
  const est = estabilidadeSocial(c);
  const org = organizacaoSocial(c);
  const evo = evolucaoPos(c);
  const recon = podeReconstituirGoverno(c);
  const reconstituir = useGame((s) => s.reconstituirGoverno);
  return (
    <div className="col-2">
      <Panel titulo="Território Pós-Estatal">
        <div className="lider-card">
          <div className="lider-emoji"><Bandeira e={c.flag} /></div>
          <div>
            <h2>{c.name}</h2>
            <p className="pos-status-bom">{evo.emoji} {evo.rotulo}</p>
            <p className="dim">Sem Estado central — arranjos comunitários coordenam a vida comum.</p>
          </div>
          <div className="lider-eco">
            <h2 style={{ color: est >= 50 ? '#4ade80' : est < 20 ? '#f87171' : '#facc15' }}>{fmtNum(est, 0)}</h2>
            <p className="dim">Estabilidade Social</p>
          </div>
        </div>
        <div className="kpis">
          <Metric label="Coesão" valor={fmtNum(d.coesao, 0)} tom={d.coesao >= 55 ? 'bom' : d.coesao < 40 ? 'ruim' : 'neutro'} />
          <Metric label="Conflito" valor={fmtNum(d.conflito, 0)} tom={d.conflito > 50 ? 'ruim' : d.conflito < 30 ? 'bom' : 'neutro'} />
          <Metric label="Participação" valor={fmtNum(d.participacao, 0)} />
          <Metric label="Autonomia" valor={fmtNum(d.autonomia, 0)} />
        </div>
        <Gauge valor={d.descentralizacao} max={100} min={0} cor="#14b8a6" rotulo="Descentralização" />
      </Panel>

      <Panel titulo="Organização Social">
        {org.map((o) => (
          <div key={o.nome} className="org-linha">
            <div className="org-topo"><span>{o.emoji} {o.nome}</span><b>{fmtNum(o.valor, 0)}</b></div>
            <div className="gauge-track"><div className="gauge-fill" style={{ width: `${o.valor}%`, background: '#14b8a6' }} /></div>
          </div>
        ))}
      </Panel>

      <Panel titulo="Reconstituição do Estado">
        <p className="dim">
          Quando a coordenação e a coesão se consolidarem, assembleias comunitárias podem votar a
          reconstituição de um Estado descentralizado.
        </p>
        {recon.ok ? (
          <p className="pos-ok">✅ O território reúne condições para uma consulta popular.</p>
        ) : (
          <ul className="dim pos-motivos">
            {recon.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        )}
        <button className="btn" disabled={!recon.ok} onClick={reconstituir} title={recon.ok ? '' : 'Condições ainda não alcançadas'}>
          🏛️ Consulta pela reconstituição do Estado
        </button>
      </Panel>
    </div>
  );
};

export const PosEconomia = ({ c, w }: { c: Country; w: World }) => {
  const local = ind(c, 'comercio_domestico');
  const manufatura = ind(c, 'setor_manufatura');
  const agric = ind(c, 'agricultura_privada');
  const igualdade = ind(c, 'igualdade');
  const invest = ind(c, 'investimento_privado');
  return (
    <div className="col-2">
      <Panel titulo="Economia Local">
        <div className="kpis">
          <Metric label="Comércio doméstico" valor={fmtNum(local, 0)} />
          <Metric label="Manufatura" valor={fmtNum(manufatura, 0)} />
          <Metric label="Agricultura privada" valor={fmtNum(agric, 0)} />
          <Metric label="Investimento privado" valor={fmtNum(invest, 0)} />
          <Metric label="PIB" valor={fmtNum(c.gdp, 1)} tom={c.crescimento >= 0 ? 'bom' : 'ruim'} />
          <Metric label="Crescimento" valor={fmtPct(c.crescimento)} tom={c.crescimento >= 1 ? 'bom' : 'ruim'} />
        </div>
        <p className="dim">
          Sem poder central de tributação, a economia opera por cooperativas, redes de troca e produção
          comunitária — conectada ao mundo por acordos locais.
        </p>
      </Panel>

      <Panel titulo="Índices Locais">
        <div className="kpis">
          <Gauge valor={igualdade} min={0} max={100} cor="#34d399" rotulo="Igualdade" />
          <Gauge valor={100 - c.gini * 100} min={0} max={100} cor="#c9962e" rotulo="Renda distribuída" />
          <Gauge valor={c.felicidade} min={0} max={100} cor="#facc15" rotulo="Felicidade" />
          <Gauge valor={ind(c, 'qualidade_infra')} min={0} max={100} cor="#a78bfa" rotulo="Qualidade da infraestrutura" />
        </div>
      </Panel>

      <Panel titulo="Commodities e Comércio Externo">
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

export const PosFinancas = ({ c }: { c: Country }) => {
  const orc = c.orcamento;
  const linhas: { nome: string; emoji: string; v: number }[] = [
    { nome: 'Compras coletivas (bens públicos)', emoji: '🧺', v: orc.receitaNaoTributaria },
    { nome: 'Previdência comunitária', emoji: '🧓', v: orc.previdencia },
    { nome: 'Assistência local', emoji: '🤝', v: orc.beneficios + orc.transferencias },
    { nome: 'Saúde comunitária', emoji: '🏥', v: orc.pisoSaude + orc.discSaude },
    { nome: 'Educação comunitária', emoji: '🎓', v: orc.pisoEduc + orc.discEduc },
    { nome: 'Infraestrutura comum', emoji: '🏗️', v: orc.discInfra + orc.discObras },
    { nome: 'Segurança & cooperação', emoji: '🛡️', v: orc.discSeguranca + orc.discDefesa },
  ];
  return (
    <div className="col-1">
      <Panel titulo="Finanças Comunitárias (% do PIB)">
        <div className="kpis">
          <Metric label="Receita local" valor={fmtNum(orc.receitaTotal, 1)} />
          <Metric label="Despesa local" valor={fmtNum(orc.total, 1)} />
          <Metric label="Dívida remanescente" valor={fmtPct(c.dividaPct)} tom={c.dividaPct > 8 ? 'ruim' : 'bom'} />
          <Metric label="Inflação" valor={fmtPct(c.inflacao)} tom={c.inflacao > 6 ? 'ruim' : 'bom'} />
        </div>
        <p className="dim">
          Sem arrecadação federal, os recursos são decididos em assembleias comunitárias e convênios de
          vizinhança. Não há dívida soberana nova.
        </p>
      </Panel>
      <Panel titulo="Alocação Comunitária">
        {linhas.map((l) => (
          <div key={l.nome} className="org-linha">
            <div className="org-topo"><span>{l.emoji} {l.nome}</span><b>{fmtNum(l.v, 2)}% PIB</b></div>
            <div className="gauge-track"><div className="gauge-fill" style={{ width: `${Math.min(100, l.v * 8)}%`, background: '#14b8a6' }} /></div>
          </div>
        ))}
      </Panel>
    </div>
  );
};

export const PosSociedade = ({ c }: { c: Country }) => {
  const d = posEstadoDossie(c);
  return (
    <div className="col-2">
      <Panel titulo="População (contexto atual)">
        <div className="kpis">
          <Metric label="Padrão de vida" valor={fmtNum(c.pops.sol, 0)} />
          <Metric label="Alfabetização" valor={fmtNum(c.pops.alfabetizacao, 0)} />
          <Metric label="Migração (% ano)" valor={fmtNum(c.pops.migracaoLiquida, 1)} tom={c.pops.migracaoLiquida < 0 ? 'ruim' : 'bom'} />
          <Metric label="Pobreza" valor={fmtNum(ind(c, 'pobreza'), 0)} tom={ind(c, 'pobreza') > 45 ? 'ruim' : 'bom'} />
        </div>
        <div className="kpis">
          <Gauge valor={c.felicidade} min={0} max={100} cor="#facc15" rotulo="Felicidade" />
          <Gauge valor={ind(c, 'igualdade')} min={0} max={100} cor="#34d399" rotulo="Igualdade" />
          <Gauge valor={ind(c, 'caridade')} min={0} max={100} cor="#c9962e" rotulo="Solidariedade" />
          <Gauge valor={100 - ind(c, 'crime_juvenil')} min={0} max={100} cor="#a78bfa" rotulo="Segurança nas ruas" />
        </div>
      </Panel>

      <Panel titulo="Coesão e Migração entre Comunidades">
        <Gauge valor={d.coesao} min={0} max={100} cor="#14b8a6" rotulo="Coesão comunitária" />
        <Gauge valor={d.migracaoComunidades} min={0} max={100} cor="#fb923c" rotulo="Migração entre comunidades" />
        <Gauge valor={d.conflito} min={0} max={100} cor="#f87171" rotulo="Conflito" />
        <p className="dim">Fronteiras internas são culturais — a livre circulação entre comunidades prevalece.</p>
      </Panel>
    </div>
  );
};

export const PosGovernanca = ({ c }: { c: Country }) => {
  const d = posEstadoDossie(c);
  return (
    <div className="col-2">
      <Panel titulo="Assembleias & Arbitragem">
        <div className="kpis">
          <Metric label="Participação" valor={fmtNum(d.participacao, 0)} />
          <Metric label="Autonomia local" valor={fmtNum(d.autonomia, 0)} />
          <Metric label="Coordenação" valor={fmtNum(d.coordenacao, 0)} />
          <Metric label="Pluralidade institucional" valor={fmtNum(d.pluralidade, 0)} />
        </div>
        <Gauge valor={d.disputasJuridicas} min={0} max={100} cor="#fb923c" rotulo="Disputas jurídicas entre acordos" />
        <p className="dim">
          Sem constituição central, convênios comunitários e câmaras de arbitragem resolvem divergências.
        </p>
      </Panel>

      <Panel titulo="Acordos Comunitários">
        <div className="sit-leis-lista">
          {LEIS_DEFS.map((l) => {
            const opc = l.opcoes[c.leis?.[l.id] ?? 0];
            return (
              <div key={l.id} className="sit-linha">
                <span>{l.nome}</span>
                <b>{opc?.nome ?? '—'}</b>
              </div>
            );
          })}
        </div>
        <p className="dim">No território pós-estatal os códigos se tornam pactos locais — revogáveis por assembleia.</p>
      </Panel>
    </div>
  );
};

export const PosRelacoes = ({ c, w }: { c: Country; w: World }) => {
  return (
    <div className="col-1">
      <Panel titulo="Relações Externas">
        <RelTableView c={c} w={w} />
        <p className="dim">⚖️ Sem poder central, o território não declara guerras nem rompe relações por decreto.</p>
      </Panel>

      <Panel titulo="Convênios e Troca de Bens">
        {w.tratados.length === 0 ? (
          <p className="dim">Sem convênios bilaterais formalmente registrados.</p>
        ) : (
          <div className="tratados">
            {w.tratados.map((t) => {
              const a = w.paises[t.a];
              const b = w.paises[t.b];
              const meu = t.a === c.id || t.b === c.id;
              return (
                <div key={t.id} className={`tratado ${meu ? 'tr-meu' : ''}`}>
                  <span className="tr-emoji">{TRATADO_LABEL[t.tipo] === 'Comércio' ? '📦' : TRATADO_LABEL[t.tipo] === 'Não-agressão' ? '🕊️' : '🤝'}</span>
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
    </div>
  );
};

export const PosSeguranca = ({ c }: { c: Country }) => {
  const d = posEstadoDossie(c);
  const org = c.posEstado?.orgMilitar ?? 'desmobilizada';
  return (
    <div className="col-1">
      <Panel titulo="Segurança Comunitária">
        <div className="kpis">
          <Metric label="Segurança" valor={fmtNum(d.seguranca, 0)} tom={d.seguranca >= 55 ? 'bom' : d.seguranca < 40 ? 'ruim' : 'neutro'} />
          <Metric label="Conflito interno" valor={fmtNum(d.conflito, 0)} tom={d.conflito > 45 ? 'ruim' : 'bom'} />
          <Metric label="Milícias ativas" valor={fmtNum(c.militar.ativo, 0)} />
          <Metric label="Reserva local" valor={fmtNum(c.militar.reserva, 0)} />
        </div>
        <p className="pos-seg-org"><b>Defesa:</b> {ORG_INFO[org]}</p>
      </Panel>
      <Panel titulo="Vigilância Comunitária">
        <Gauge valor={100 - ind(c, 'crime_juvenil')} min={0} max={100} cor="#a78bfa" rotulo="Segurança nas ruas" />
        <Gauge valor={100 - ind(c, 'tensao_racial')} min={0} max={100} cor="#34d399" rotulo="Harmonia entre grupos" />
        <p className="dim">A defesa é feita por patrulhas locais, acordos de vizinhança e brigadas comunitárias.</p>
      </Panel>
    </div>
  );
};

export const DissolucaoPainel = ({ c }: { c: Country }) => {
  const d = c.dissolucao;
  if (!d) return null;
  const pct = Math.round(d.progresso);
  const n = Math.round(pct / 5);
  const barra = '▮'.repeat(Math.max(0, Math.min(20, n))) + '░'.repeat(Math.max(0, 20 - n));
  const origemLabel = d.origem === 'governo' ? 'ordenada pelo governo' : 'sob pressão popular';
  return (
    <div className="col-1 pos-transicao">
      <Panel titulo="⚠️ Dissolução do Estado em curso">
        <p className="dim">
          Processo iniciado {origemLabel} há <b>{d.meses} mês(es)</b>. A transição consome o aparelho do Estado
          nas próprias mãos da sociedade.
        </p>
        <div className="dis-bar">
          <span className="dis-tracos">{barra}</span>
          <b>{pct}%</b>
        </div>
        <div className="kpis">
          <Metric label="Apoio popular" valor={fmtNum(d.apoioPopular, 0)} />
          <Metric label="Apoio institucional" valor={fmtNum(d.apoioInstituicoes, 0)} />
        </div>
        <Gauge valor={d.apoioPopular} min={0} max={100} cor="#34d399" rotulo="Apoio popular à transição" />
        <Gauge valor={d.apoioInstituicoes} min={0} max={100} cor="#fbbf24" rotulo="Apoio das instituições" />
        <p className="dim">Ainda dá tempo de desacelerar as reformas que alimentam a pressão abolicionista.</p>
      </Panel>
    </div>
  );
};

export const PressaoEstadoSection = ({ c }: { c: Country }) => {
  const p = pressaoDissolucao(c);
  const pode = podeDissolucaoInterna(c);
  const iniciar = useGame((s) => s.iniciarDissolucao);
  return (
    <>
      <h4 className="hud-sec-titulo">🔥 Pressão Abolicionista</h4>
      <div className="sit-bloco">
        <GaugeMini valor={p} max={100} min={0} cor={p >= 60 ? '#f87171' : p >= 35 ? '#fb923c' : '#4ade80'} rotulo="Pressão pela abolição" />
        <GaugeMini valor={c.pops.radicalizacao} max={100} min={0} cor="#f87171" rotulo="Radicalização" />
        <p className="dim pos-pressao-dica">
          Radicalização alta + instituições frágeis podem desaguar em uma crise de dissolução.
        </p>
        <button
          className="btn btn-perigo btn-largo"
          disabled={!pode.ok || c.cooldownDissol > 0}
          onClick={iniciar}
          title={pode.ok ? 'Iniciar uma transição ordenada' : pode.motivos[0]}
        >
          🏛️ Iniciar dissolução do Estado
        </button>
        {pode.motivos.length > 0 && (
          <ul className="dim pos-motivos">
            {pode.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        )}
        {c.cooldownDissol > 0 && <small className="dim">Recém-definido — nova crise não deve ser forçada.</small>}
      </div>
    </>
  );
};

const GaugeMini = ({ valor, max = 100, min = -100, cor, rotulo }: {
  valor: number; max?: number; min?: number; cor: string; rotulo: string;
}) => {
  const pct = ((valor - min) / (max - min)) * 100;
  return (
    <div className="sit-gauge">
      <div className="gauge-row"><span>{rotulo}</span><b>{fmtNum(valor, 1)}</b></div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }} />
      </div>
    </div>
  );
};

export const PosDossieDireita = ({ c }: { c: Country }) => {
  const d = posEstadoDossie(c);
  const est = estabilidadeSocial(c);
  const evo = evolucaoPos(c);
  return (
    <aside className="hud-dir">
      <h4 className="hud-sec-titulo">🌎 Território Pós-Estatal</h4>
      <div className="sit-bloco">
        <div className="pos-status-bom"><b>{evo.emoji} {evo.rotulo}</b></div>
        <div className="sit-linha"><span>Território</span><b>{c.name}</b></div>
        <div className="sit-linha"><span>Desde</span><b>mês {fmtNum(c.posEstado?.desde ?? 0, 0)}</b></div>
        <div className="sit-linha"><span>Defesa</span><b>{c.posEstado?.orgMilitar ?? ''}</b></div>
      </div>

      <h4 className="hud-sec-titulo">🤝 Sociedade</h4>
      <div className="sit-bloco">
        <GaugeMini valor={d.coesao} max={100} min={0} cor="#14b8a6" rotulo="Coesão" />
        <GaugeMini valor={est} max={100} min={-30} cor="#c9962e" rotulo="Estabilidade Social" />
        <GaugeMini valor={d.conflito} max={100} min={0} cor="#f87171" rotulo="Conflito" />
        <GaugeMini valor={d.desigualdade} max={100} min={0} cor="#fb923c" rotulo="Desigualdade" />
      </div>

      <h4 className="hud-sec-titulo">🏘️ Governança Local</h4>
      <div className="sit-bloco">
        <GaugeMini valor={d.participacao} max={100} min={0} cor="#34d399" rotulo="Participação" />
        <GaugeMini valor={d.autonomia} max={100} min={0} cor="#a78bfa" rotulo="Autonomia" />
        <GaugeMini valor={d.coordenacao} max={100} min={0} cor="#fbbf24" rotulo="Coordenação" />
        <GaugeMini valor={d.descentralizacao} max={100} min={0} cor="#fb923c" rotulo="Descentralização" />
      </div>
    </aside>
  );
};

export const DissolucaoMonitor = ({ c }: { c: Country }) => {
  const d = c.dissolucao;
  if (!d) return null;
  const pct = Math.round(d.progresso);
  const n = Math.round(pct / 5);
  const barra = '▮'.repeat(Math.max(0, Math.min(20, n))) + '░'.repeat(Math.max(0, 20 - n));
  return (
    <aside className="hud-dir">
      <h4 className="hud-sec-titulo">⚠️ Dissolução em andamento</h4>
      <div className="sit-bloco">
        <div className="dis-bar dis-bar-dir">
          <span className="dis-tracos">{barra}</span>
          <b>{pct}%</b>
        </div>
        <div className="sit-linha"><span>Origem</span><b>{d.origem === 'governo' ? 'ordenada pelo governo' : 'pressão popular'}</b></div>
        <div className="sit-linha"><span>Evoluindo há</span><b>{d.meses} mês(es)</b></div>
        <GaugeMini valor={d.apoioPopular} max={100} min={0} cor="#34d399" rotulo="Apoio popular" />
        <GaugeMini valor={d.apoioInstituicoes} max={100} min={0} cor="#fbbf24" rotulo="Apoio institucional" />
        <GaugeMini valor={pressaoDissolucao(c)} max={100} min={0} cor="#f87171" rotulo="Pressão" />
      </div>
    </aside>
  );
};