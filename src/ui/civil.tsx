import { useMemo, useState } from 'react';
import type { ConstrucaoId, Country, PesquisaKey, World } from '../engine/types';
import { CONSTRUCAO } from '../engine/data/public';
import { coberturas, alvoCobertura, custoObrasAnual } from '../engine/data/public';
import { nivelCobertura } from '../engine/public';
import { PROGRAMA_TIPOS, capacidadeEspacial } from '../engine/space';
import type { ProgramaTipo } from '../engine/types';
import { fmtNum } from '../engine/util';
import { useGame } from '../store/game';
import { Panel, Metric, CausaEfeito, Slider } from './components';

const FUNCOES = [
  { chave: 'coberturaSaude', nome: 'Saúde', icon: '🏥', cor: '#f87171' },
  { chave: 'coberturaEduc', nome: 'Educação', icon: '🎓', cor: '#4ade80' },
  { chave: 'coberturaTransporte', nome: 'Transporte', icon: '🛣️', cor: '#38bdf8' },
  { chave: 'coberturaEnergia', nome: 'Energia', icon: '⚡', cor: '#facc15' },
  { chave: 'coberturaSaneamento', nome: 'Saneamento', icon: '🚰', cor: '#22d3ee' },
  { chave: 'coberturaDigital', nome: 'Digital', icon: '📡', cor: '#a78bfa' },
  { chave: 'coberturaSeguranca', nome: 'Segurança', icon: '🚓', cor: '#fb923c' },
  { chave: 'coberturaCultura', nome: 'Cultura', icon: '🎭', cor: '#f472b6' },
  { chave: 'coberturaDefesa', nome: 'Defesa', icon: '🛡️', cor: '#94a3b8' },
] as const;

export const PanelObras = ({ c, w }: { c: Country; w: World }) => {
  const construir = useGame((s) => s.construir);
  const demolir = useGame((s) => s.demolir);
  const ajustarFuncionarios = useGame((s) => s.ajustarFuncionarios);
  const cov = useMemo(() => coberturas(c), [c]);
  const manut = custoObrasAnual(c);
  const funcPct = (c.funcionariosMil / Math.max(1, c.populacao * 1000)) * 100;

  return (
    <div className="col-2">
      <Panel titulo="Obras Públicas">
        <Metric label="Manutenção anual" valor={`${fmtNum(manut, 2)}% PIB`} tom={manut > 4 ? 'ruim' : 'neutro'} />
        <div className="obras-cobertura">
          {FUNCOES.map((f) => {
            const v = cov[f.chave] ?? 0;
            const alvo = alvoCobertura(c, f.chave);
            const pct = Math.min(100, (v / alvo) * 100);
            const nivel = nivelCobertura(v, alvo);
            return (
              <div key={f.chave} className="obras-cob">
                <span className="obras-cob-icon">{f.icon}</span>
                <div className="obras-cob-bar">
                  <div className="obras-cob-top">
                    <b>{f.nome}</b>
                    <small style={{ color: nivel.cor }}>{nivel.nome}</small>
                  </div>
                  <div className="gauge-track">
                    <div className="gauge-fill" style={{ width: `${pct}%`, background: f.cor }} />
                  </div>
                  <small>{fmtNum(pct, 0)}% da meta</small>
                </div>
              </div>
            );
          })}
        </div>
        <CausaEfeito aba="obras" cor="#38bdf8" />
      </Panel>

      <Panel titulo="Funcionalismo Público">
        <div className="func-control">
          <div className="func-numero">
            <b>{fmtNum(c.funcionariosMil, 0)} mil</b>
            <span>{funcPct.toFixed(1)}% da população</span>
          </div>
          <div className="enc-grid">
            <button className="btn" onClick={() => ajustarFuncionarios(10)}>➕ Contratar 10 mil</button>
            <button className="btn" onClick={() => ajustarFuncionarios(-10)}>➖ Demitir 10 mil</button>
          </div>
          <small className="dim">Funcionários públicos geram empregos, serviços e custo de folha (até 20% do PIB).</small>
        </div>
      </Panel>

      <Panel titulo="Catálogo de Construção">
        <div className="obra-lista">
          {(Object.keys(CONSTRUCAO) as ConstrucaoId[]).map((id) => {
            const def = CONSTRUCAO[id];
            const qtd = c.construcoes[id] ?? 0;
            return (
              <div key={id} className="obra-item">
                <span className="obra-emoji">{def.emoji}</span>
                <div className="obra-info">
                  <b>{def.nome}</b>
                  <small>{def.desc}</small>
                  <small className="dim">Custo {fmtNum(def.custo, 2)}% PIB · Manut. {fmtNum(def.manut, 3)}% PIB/ano · Atuais: {qtd}</small>
                </div>
                <div className="enc-grid obra-acoes">
                  <button className="btn" onClick={() => construir(id)} title="Construir">➕</button>
                  <button className="btn" disabled={qtd <= 0} onClick={() => demolir(id)} title="Demolir">➖</button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

const PESQUISA_DEFS: { k: PesquisaKey; nome: string; icon: string; cor: string; desc: string }[] = [
  { k: 'militar', nome: 'Militar', icon: '🪖', cor: '#f87171', desc: 'Tecnologia de defesa, veículos e armamento.' },
  { k: 'industrial', nome: 'Industrial', icon: '🏭', cor: '#38bdf8', desc: 'Automação, energia e produtividade.' },
  { k: 'social', nome: 'Social', icon: '🎓', cor: '#4ade80', desc: 'Educação, saúde e bem-estar.' },
  { k: 'espacial', nome: 'Espacial', icon: '🚀', cor: '#a78bfa', desc: 'Propulsão, exploração e colônias.' },
];

const PESQ_LABEL: Record<PesquisaKey, string> = {
  militar: 'Nível militar', industrial: 'Nível industrial', social: 'Nível social', espacial: 'Espacial',
};

export const PanelPesquisa = ({ c, w }: { c: Country; w: World }) => {
  const setInvestPesquisa = useGame((s) => s.setInvestPesquisa);
  const criarPrograma = useGame((s) => s.criarPrograma);
  const cancelarPrograma = useGame((s) => s.cancelarPrograma);
  const [nomeProg, setNomeProg] = useState('');
  const [tipoSel, setTipoSel] = useState<ProgramaTipo>('orbital');
  const alloc = c.pesquisaInvest;
  const iset = c.pesquisa;
  const cap = capacidadeEspacial(c);

  const mudarAlocacao = (k: PesquisaKey, v: number) => {
    setInvestPesquisa(k, v);
  };

  return (
    <div className="col-2">
      <Panel titulo="Pesquisa Geral">
        <div className="pesquisa-niveis">
          {PESQUISA_DEFS.map((p) => (
            <div key={p.k} className="pesquisa-nivel" style={{ borderColor: p.cor }}>
              <span className="obra-emoji">{p.icon}</span>
              <div>
                <b>{p.nome}</b>
                <small>{PESQ_LABEL[p.k]}: {fmtNum(iset[p.k] ?? 0, 1)}</small>
              </div>
            </div>
          ))}
        </div>
        <p className="dim">O avanço ocorre mensalmente conforme o investimento dedicado a cada área.</p>
        <CausaEfeito aba="pesquisa" cor="#a78bfa" />
      </Panel>

      <Panel titulo="Alocação de Investimento">
        {PESQUISA_DEFS.map((p) => (
          <Slider
            key={p.k}
            nome={p.nome}
            desc={p.desc}
            emoji={p.icon}
            min={0}
            max={100}
            step={5}
            valor={alloc[p.k]}
            unidade="pct"
            onChange={(v) => mudarAlocacao(p.k, v)}
          />
        ))}
        <div className="totais">
          <span>Total alocado</span>
          <b>{Object.values(alloc).reduce((a, b) => a + (b ?? 0), 0)}%</b>
        </div>
        <p className="dim">Os percentuais direcionam o avanço: pesquisa espacial desbloqueia o setor espacial (a partir de 5 pontos).</p>
      </Panel>

      <Panel titulo="Programa Espacial">
        <div className="meg-grupo">
          <div className="programa-tipos">
            {(Object.keys(PROGRAMA_TIPOS) as ProgramaTipo[]).map((t) => {
              const spec = PROGRAMA_TIPOS[t];
              const bloqueado = c.pesquisa?.espacial < spec.reqResearch;
              const emAndamento = c.programasEspaciais.some((p) => p.tipo === t && !p.concluido);
              return (
                <button
                  key={t}
                  className={`programa-tipo ${tipoSel === t ? 'ativo' : ''} ${bloqueado || emAndamento ? 'bloqueado' : ''}`}
                  onClick={() => setTipoSel(t)}
                  title={blocked(c, t)}
                >
                  <span className="obra-emoji">{spec.emoji}</span>
                  <b>{spec.nome}</b>
                  <small>Custo {spec.custo}% PIB · Eficiência {spec.ganho}/mês · Requer esp. {spec.reqResearch}</small>
                  {emAndamento && <em>Em andamento</em>}
                </button>
              );
            })}
          </div>
          <div className="enc-grid">
            <input className="inp" placeholder="Nome opcional do programa" value={nomeProg} onChange={(e) => setNomeProg(e.target.value)} />
            <button className="btn btn-grande" disabled={!cap.podeLancar} onClick={() => { criarPrograma(tipoSel, nomeProg || undefined); setNomeProg(''); }}>
              🚀 Lançar programa
            </button>
          </div>
          <small className={`dim ${cap.podeLancar ? 'txt-bom' : ''}`}>
            {cap.podeLancar ? 'Você pode lançar programas espaciais.' : 'Disponível quando pesquisa espacial ≥ 5 e investimento espacial ≥ 10%.'}
          </small>
        </div>
        {c.programasEspaciais.length > 0 && (
          <div className="programa-lista">
            {c.programasEspaciais.map((p) => {
              const spec = PROGRAMA_TIPOS[p.tipo];
              return (
                <div key={p.id} className="programa-item">
                  <span className="obra-emoji">{spec.emoji}</span>
                  <div className="obra-info">
                    <b>{p.nome}</b>
                    <small>{spec.nome} · Investido {fmtNum(p.investido, 1)}/{p.custo}% PIB</small>
                    <div className="gauge-track">
                      <div className="gauge-fill" style={{ width: `${p.progresso}%`, background: p.concluido ? '#4ade80' : '#a78bfa' }} />
                    </div>
                  </div>
                  {p.concluido
                    ? <span className="status ap-bom">✔ Concluído</span>
                    : <button className="btn" onClick={() => cancelarPrograma(p.id)}>✖ Cancelar</button>}
                </div>
              );
            })}
          </div>
        )}
        <div className="totais">
          <span>Outros</span>
          <b>Pode sondar: {cap.podeSondar ? '✅' : '❌'} · Pode colonizar: {cap.podeColonizar ? '✅' : '❌'}</b>
        </div>
      </Panel>
    </div>
  );
};

function blocked(c: Country, t: ProgramaTipo): string {
  const spec = PROGRAMA_TIPOS[t];
  if (c.pesquisa?.espacial < spec.reqResearch) return `Requer pesquisa espacial ${spec.reqResearch}`;
  if (t === 'lunar' && !c.programasEspaciais.some((p) => p.tipo === 'orbital' && p.concluido)) return 'Requer programa orbital concluído';
  if (t === 'interplanetario' && !c.programasEspaciais.some((p) => p.tipo === 'lunar' && p.concluido)) return 'Requer base lunar concluída';
  return '';
}