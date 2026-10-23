import { useEffect, useRef, useState, type ReactNode } from 'react';
import { entrarComGoogle, ErroLogin, configFirebaseAtual } from './auth';
import FirebaseSetup from './FirebaseSetup';
import { PainelPropostas } from './propostas';
import { Assinar } from './assinatura';
import { PaginaLegal, type PaginaLegalTipo } from './legal';
import { SEMENTES } from '../engine/data/countries';
import '../landing.css';

const QTD_PAISES = SEMENTES.length;

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('lp-visivel');
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('lp-visivel');
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useParallax() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) return;
    const alvo = ref.current?.querySelector<HTMLElement>('.lp-hero-bg');
    if (!alvo) return;
    let raf = 0;
    const aoRolar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        alvo.style.transform = `translate3d(0, ${window.scrollY * 0.16}px, 0)`;
      });
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

function Marca() {
  return (
    <span className="lp-marca" aria-label="Axioma">
      <span className="lp-marca-sigla" aria-hidden="true">Λ</span>
      <span className="lp-marca-nome">AXIOMA</span>
    </span>
  );
}

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.56-5.17 3.56-8.86Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.6 1.79l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4.01 3.09C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

function BotaoGoogle({ variante = 'primario' }: { variante?: 'primario' | 'fantasma' }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      await entrarComGoogle();
    } catch (e) {
      if (e instanceof ErroLogin && e.contexto !== 'cancelado') setErro(e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="lp-login">
      <button
        type="button"
        className={`lp-btn ${variante === 'fantasma' ? 'lp-btn-fantasma' : 'lp-btn-primario'}`}
        onClick={entrar}
        disabled={ocupado}
        aria-busy={ocupado}
      >
        <IconeGoogle />
        {ocupado ? <span>Entrando…</span> : <span>Entrar com Google</span>}
      </button>
      {erro && (
        <p className="lp-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

function Secao({ id, titulo, rotulo, children }: { id: string; titulo: string; rotulo?: string; children: ReactNode }) {
  const ref = useReveal();
  return (
    <section id={id} className="lp-secao lp-reveal" ref={ref}>
      {rotulo && <p className="lp-rotulo lp-mono">{rotulo}</p>}
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

const SISTEMAS: Array<{ sigla: string; nome: string; desc: string }> = [
  { sigla: '∫', nome: 'Constituição & Leis', desc: 'Modelos institucionais, reformas de lei e o adensamento das regras que sustentam o regime.' },
  { sigla: '△', nome: 'Legislativo & Partidos', desc: 'Apoio parlamentar, eleições e reformas que podem ser aprovadas — ou rejeitadas.' },
  { sigla: 'Ʃ', nome: 'Orçamento & Tributos', desc: 'Receita, despesa, dívida e pacotes de socorro. Toda promessa tem preço no balanço.' },
  { sigla: '↑', nome: 'Militar & Defesa', desc: 'Efetivos, tecnologia, gastos e a integridade territorial do seu país.' },
  { sigla: 'Ж', nome: 'Bem-estar Social', desc: 'Padrão de vida, saúde, educação e migração. Política deixa marcas nas pessoas.' },
  { sigla: '⚖', nome: 'Sistema Penal & Justiça', desc: 'Polícia, endurecimento legal e a (in)dependência das cortes.' },
  { sigla: '◐', nome: 'Diplomacia & Geopolítica', desc: 'Tratados, crises, espionagem e o tabuleiro em que os 196 países se movem.' },
];

const PASSOS: Array<{ n: string; titulo: string; desc: string; mono: string }> = [
  { n: '01', titulo: 'Decisão', desc: 'Você propõe políticas: imposto, gasto militar, lei, reforma ou modelo institucional.', mono: '(premissa)' },
  { n: '02', titulo: 'Fórmula', desc: 'Cada efeito é calculado por fórmulas explícitas. Nada é sorteado por trás dos bastidores.', mono: '(dedução)' },
  { n: '03', titulo: 'Consequência', desc: 'O parlamento resiste, os mercados reagem e a população aprova ou abandona você.', mono: '(resultado)' },
];

const NOMES: Array<{ t: string; c: string }> = [
  { t: 'Axioma = premissa', c: 'Na matemática, axioma é a base aceita da qual tudo o mais é deduzido. O motor funciona assim: um esquema genérico e único deriva os 196 países — não existe lógica específica para nenhum deles.' },
  { t: 'Governar é escolher premissas', c: 'Cada decisão sua é uma premissa. Escolher um imposto, endurecer uma lei — uma a uma — e depois seguir as consequências até onde elas levam.' },
  { t: 'Um nome que atravessa idiomas', c: '"Mandato" prendia a ideia a um período de governo num único país. "Axioma" fala de qualquer governo, em qualquer língua — é um jogo sobre governar, em geral.' },
];

export default function Landing() {
  const [tema, setTema] = useState<'escuro' | 'claro'>(() => {
    try {
      return localStorage.getItem('axioma_tema') === 'claro' ? 'claro' : 'escuro';
    } catch {
      return 'escuro';
    }
  });
  const [configAberta, setConfigAberta] = useState(false);
  const [paginaLegal, setPaginaLegal] = useState<PaginaLegalTipo | null>(null);
  const heroRef = useParallax();
  const ano = new Date().getFullYear();
  const firebaseConfigurando = configFirebaseAtual().fonte !== 'env';

  const alternarTema = () => {
    const proximo = tema === 'escuro' ? 'claro' : 'escuro';
    setTema(proximo);
    try {
      localStorage.setItem('axioma_tema', proximo);
    } catch {
      /* noop */
    }
  };

  return (
    <div className={`lp lp-${tema}`}>
      <a className="lp-pular" href="#jogo">
        Pular para o conteúdo
      </a>

      <header className="lp-nav">
        <a className="lp-nav-marca" href="#inicio" aria-label="Axioma — início">
          <Marca />
        </a>
        <nav className="lp-nav-links" aria-label="Navegação principal">
          <a href="#jogo">O jogo</a>
          <a href="#como">Como funciona</a>
          <a href="#sistemas">Sistemas</a>
          <a href="#votar">Roteiro & Votações</a>
          <a href="#apoio">Apoiar</a>
          <a href="#nome">Por que Axioma</a>
          <a href="#codigo">Código aberto</a>
        </nav>
        <div className="lp-nav-acoes">
          {firebaseConfigurando && (
            <button
              type="button"
              className="lp-tema"
              onClick={() => setConfigAberta(true)}
              title="Configurar o login com Google (Firebase)"
              aria-haspopup="dialog"
            >
              <span aria-hidden="true">⚙</span>
              <span className="lp-sr">Configurar Firebase</span>
            </button>
          )}
          <button
            type="button"
            className="lp-tema"
            onClick={alternarTema}
            aria-pressed={tema === 'claro'}
            title={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <span aria-hidden="true">{tema === 'escuro' ? '☀' : '☾'}</span>
            <span className="lp-sr">{tema === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'}</span>
          </button>
          <a href="#entrar" className="lp-btn lp-btn-fantasma lp-btn-pequeno">
            Entrar
          </a>
        </div>
      </header>

      <main id="inicio" className="lp-hero" ref={heroRef}>
        <div className="lp-hero-bg" aria-hidden="true">
          <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" className="lp-graticula">
            <g stroke="var(--lp-line)" fill="none">
              <ellipse cx="600" cy="280" rx="470" ry="210" />
              <ellipse cx="600" cy="280" rx="330" ry="120" />
              <ellipse cx="600" cy="280" rx="190" ry="56" />
              <line x1="130" y1="280" x2="1070" y2="280" />
              <line x1="600" y1="70" x2="600" y2="490" />
            </g>
            <g className="lp-lat" stroke="var(--lp-line)">
              <line x1="200" y1="120" x2="200" y2="440" />
              <line x1="1000" y1="120" x2="1000" y2="440" />
            </g>
            <g className="lp-pontos" fill="var(--lp-geo)">
              <circle cx="330" cy="330" r="3.2" />
              <circle cx="700" cy="180" r="3.2" />
              <circle cx="880" cy="360" r="3.2" />
              <circle cx="500" cy="400" r="3.2" />
              <circle cx="950" cy="140" r="3.2" />
            </g>
          </svg>
          <div className="lp-simb lp-mono" aria-hidden="true">
            <span>∀ p ∈ Países</span>
            <span>f: Estado(t) → Estado(t+1)</span>
            <span>Σ decisões → consequências</span>
          </div>
        </div>

        <div className="lp-hero-conteudo">
          <p className="lp-rotulo lp-mono">
            SIMULAÇÃO PARAMÉTRICA · {QTD_PAISES} PAÍSES · CÓDIGO ABERTO
          </p>
          <h1 className="lp-hero-titulo">
            <span className="lp-hero-sigla" aria-hidden="true">Λ</span>
            AXIOMA
          </h1>
          <p className="lp-hero-slogan">Governar é escolher premissas.</p>
          <p className="lp-hero-sub">
            Assuma um país e decida: constituição, leis, orçamento, impostos, defesa,
            bem-estar e justiça. Cada decisão se propaga por fórmulas explícitas — e você
            segura as consequências.
          </p>
          <div className="lp-hero-acoes">
            <BotaoGoogle />
            <a href="#jogo" className="lp-btn lp-btn-fantasma">
              Como funciona ↓
            </a>
          </div>
          <p className="lp-hero-mono lp-mono">
            Estado inicial: {QTD_PAISES} países · economia, demografia e regimes reais
          </p>
        </div>
      </main>

      <Secao id="jogo" rotulo="O QUE É" titulo="Uma simulação, não um roteiro.">
        <p className="lp-lead">
          Um esquema genérico e único gera os {QTD_PAISES} países. Sem roteiro, sem cenário fixo,
          sem lógica específica para nenhum deles: a mesma base de fórmulas conduz democracias,
          autocracias e tudo o que existe entre elas.
        </p>
        <div className="lp-cards">
          <div className="lp-card">
            <span className="lp-card-sigla lp-mono" aria-hidden="true">A(p)</span>
            <h3>Esquema único</h3>
            <p>Um só motor deriva cada país a partir de parâmetros. Nenhum país tem tratamento especial.</p>
          </div>
          <div className="lp-card">
            <span className="lp-card-sigla lp-mono" aria-hidden="true">∂</span>
            <h3>Realismo paramétrico</h3>
            <p>Economia, demografia, recursos e instituições como ponto de partida — não como texto decorativo.</p>
          </div>
          <div className="lp-card">
            <span className="lp-card-sigla lp-mono" aria-hidden="true">◉</span>
            <h3>O mundo reage</h3>
            <p>Os outros países simulam em paralelo: diplomacia, comércio, crises e feitos que ecoam no mundo.</p>
          </div>
        </div>
      </Secao>

      <Secao id="como" rotulo="COMO FUNCIONA" titulo="Decisão → Fórmula → Consequência.">
        <ol className="lp-passos">
          {PASSOS.map((p) => (
            <li key={p.n} className="lp-passo">
              <span className="lp-passo-n lp-mono" aria-hidden="true">{p.n}</span>
              <h3>{p.titulo}</h3>
              <p>{p.desc}</p>
              <code className="lp-passo-mono lp-mono">{p.mono}</code>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao id="sistemas" rotulo="SISTEMAS DO JOGO" titulo="Um Estado inteiro, em alavancas.">
        <div className="lp-cards lp-cards-sistemas">
          {SISTEMAS.map((s) => (
            <div className="lp-card" key={s.nome}>
              <span className="lp-card-sigla lp-mono" aria-hidden="true">{s.sigla}</span>
              <h3>{s.nome}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="lp-mono lp-nota">
          ainda no motor: mercado · setores produtivos · indicadores · o mundo em tempo real
        </p>
      </Secao>

      <Secao id="votar" rotulo="COMUNIDADE" titulo="O jogo cresce por votação.">
        <p className="lp-lead">
          Proposta → votação → implementação. Cada jogador pode lançar ideias para o simulador;
          a comunidade vota; as aprovadas entram no motor em ciclos contínuos de melhoria.
          O Axioma não é um produto pronto — é um simulador que se aperfeiçoa indefinidamente,
          dirigido por quem joga.
        </p>
        <PainelPropostas />
      </Secao>

      <Secao id="apoio" rotulo="APOIO" titulo="O Axioma é mantido por quem joga.">
        <p className="lp-lead">
          Curta economia, geopolítica ou votações? Quem apoia sustenta o desenvolvimento
          contínuo do simulador e mantém tudo aberto para todos.
        </p>
        <Assinar />
      </Secao>

      <Secao id="nome" rotulo="POR QUE AXIOMA" titulo="Um nome é uma premissa.">
        <div className="lp-nome-blocos">
          {NOMES.map((n) => (
            <div className="lp-nome-bloco" key={n.t}>
              <span className="lp-card-sigla lp-mono" aria-hidden="true">Λ</span>
              <h3>{n.t}</h3>
              <p>{n.c}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao id="codigo" rotulo="CÓDIGO ABERTO" titulo="O motor é aberto. As fórmulas também.">
        <div className="lp-codigo">
          <p>
            O Axioma é um projeto de código aberto. Você pode ler, auditar e contribuir
            com o motor de simulação — inclusive as próprias fórmulas que movem o mundo.
          </p>
          <a
            className="lp-btn lp-btn-fantasma"
            href="/"
            target="_blank"
            rel="noreferrer"
            aria-label="Repositório do Axioma no GitHub (link provisório)"
          >
            Ver repositório ↗
            <span className="lp-sr"> ([PLACEHOLDER] — defina a URL do repositório público)</span>
          </a>
        </div>
      </Secao>

      <Secao id="entrar" rotulo="CHAMADA FINAL" titulo="Escolha uma premissa.">
        <div className="lp-cta">
          <p className="lp-lead">
            Pegue um país. Defina políticas. Veja o que acontece — e o que os outros {QTD_PAISES - 1} fazem enquanto isso.
          </p>
          <BotaoGoogle />
        </div>
      </Secao>

      <footer className="lp-rodape">
        <div className="lp-rodape-linha">
          <Marca />
          <span className="lp-mono">f: Estado(t) → Estado(t+1)</span>
        </div>
        <nav className="lp-rodape-nav" aria-label="Rodapé">
          <a href="#jogo">O jogo</a>
          <a href="#como">Como funciona</a>
          <a href="#sistemas">Sistemas</a>
          <a href="#votar">Roteiro & Votações</a>
          <a href="#apoio">Apoiar</a>
          <a href="#nome">Por que Axioma</a>
          <a href="#codigo">Código aberto</a>
        </nav>
        <p className="lp-rodape-meta lp-mono">
          Simulação paramétrica · {QTD_PAISES} países, um esquema único · Licença: [PLACEHOLDER]
        </p>
        <p className="lp-rodape-direitos">© {ano} Axioma</p>
        <p className="lp-rodape-legal">
          <button type="button" onClick={() => setPaginaLegal('privacidade')}>
            Política de Privacidade
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setPaginaLegal('termos')}>
            Termos de Uso
          </button>
        </p>
      </footer>

      <FirebaseSetup aberto={configAberta} aoFechar={() => setConfigAberta(false)} />

      {paginaLegal && <PaginaLegal tipo={paginaLegal} aoFechar={() => setPaginaLegal(null)} />}
    </div>
  );
}