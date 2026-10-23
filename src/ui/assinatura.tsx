import { useEffect, useState } from 'react';
import { ErroLogin, tokenAtual, useAuth, entrarComGoogle } from './auth';
import '../assinar.css';

interface MpConfig {
  habilitado: boolean;
  preco: number;
  moeda: string;
  razao: string;
  backUrl: string;
}

interface Membro {
  ativo: boolean;
  estado?: string;
  desde?: string;
}

interface EstadoPanel {
  configCarregada: boolean;
  config: MpConfig | null;
  configErro: boolean;
  membro: Membro | null;
  membroCarregando: boolean;
}

export function Assinar() {
  const { status, usuario } = useAuth();
  const logado = status === 'logado' && !!usuario;
  const uid = usuario?.uid;

  const [estado, setEstado] = useState<EstadoPanel>({
    configCarregada: false,
    config: null,
    configErro: false,
    membro: null,
    membroCarregando: !!uid,
  });
  const [assinando, setAssinando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [ocupadoLogin, setOcupadoLogin] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/mp/config')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('erro'))))
      .then((c: MpConfig) => vivo && setEstado((e) => ({ ...e, config: c, configCarregada: true })))
      .catch(() => vivo && setEstado((e) => ({ ...e, configErro: true, configCarregada: true })));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    setEstado((e) => ({ ...e, membroCarregando: true }));
    let vivo = true;

    const consultar = () =>
      tokenAtual()
        .then((token) =>
          fetch(`/api/membros/${encodeURIComponent(uid)}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          }),
        )
        .then((r) => (r.ok ? r.json() : null))
        .then((o: Membro | null) => {
          if (!vivo) return;
          setEstado((e) => ({
            ...e,
            membro: o
              ? {
                  ativo: o.ativo === true,
                  estado: typeof o.estado === 'string' ? o.estado : undefined,
                  desde: typeof o.desde === 'string' ? o.desde : undefined,
                }
              : null,
            membroCarregando: false,
          }));
        })
        .catch(() => vivo && setEstado((e) => ({ ...e, membroCarregando: false })));

    consultar();
    const t = setInterval(consultar, 10000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [uid]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const preapprovalId = p.get('preapproval_id');
    if (!preapprovalId) return;
    setAviso(
      'Vínculo com o Mercado Pago criado. Assim que o primeiro pagamento for confirmado, seu apoio é ativado.',
    );
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }, []);

  const entrar = async () => {
    setOcupadoLogin(true);
    setAviso(null);
    try {
      await entrarComGoogle();
    } catch (e) {
      if (e instanceof ErroLogin && e.contexto !== 'cancelado') setAviso(e.message);
    } finally {
      setOcupadoLogin(false);
    }
  };

  const assinar = async () => {
    if (!usuario) return;
    setAssinando(true);
    setAviso(null);
    try {
      const token = await tokenAtual();
      const r = await fetch('/api/mp/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid: usuario.uid, email: usuario.email }),
      });
      const dados = (await r.json()) as { init_point?: string; erro?: string };
      if (!r.ok || !dados.init_point) {
        setAviso(dados.erro ?? 'O Mercado Pago não retornou o link de pagamento. Tente de novo.');
        return;
      }
      window.location.href = dados.init_point;
    } catch {
      setAviso('Não foi possível falar com o servidor de pagamento.');
    } finally {
      setAssinando(false);
    }
  };

  const cancelar = async () => {
    if (!usuario) return;
    setCancelando(true);
    setAviso(null);
    try {
      const token = await tokenAtual();
      const r = await fetch('/api/mp/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid: usuario.uid }),
      });
      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAviso(dados?.erro ?? 'Não foi possível cancelar agora.');
        return;
      }
      setAviso('Assinatura cancelada. Cobranças futuras serão interrompidas.');
    } catch {
      setAviso('Não foi possível falar com o servidor de pagamento.');
    } finally {
      setCancelando(false);
    }
  };

  const config = estado.config;
  const preco = config?.preco ?? 5;

  return (
    <div className="prp aps">
      <div className="aps-cartao">
        <p className="prp-rotulo">PLANO DE APOIO · RECORRENTE</p>
        <h3>Apoie o Axioma para mantê-lo evoluindo.</h3>
        <p className="prp-dim">
          O simulador cresce em ciclos contínuos guiados pela comunidade. Quem apoia ajuda a pagar
          hospedagem e dá mais tempo de desenvolvimento — e o jogo segue aberto para todos.
        </p>
        <div className="aps-preco">
          R$ {preco.toFixed(2).replace('.', ',')}
          <span>/mês</span>
        </div>
        <ul className="aps-perks">
          <li>Ciclos contínuos de melhorias no motor</li>
          <li>Participação nas votações da comunidade</li>
          <li>Cancelamento a qualquer momento, sem fidelidade</li>
        </ul>

        {!logado && (
          <div className="aps-acoes">
            <button type="button" className="prp-bt prp-bt-primario" onClick={entrar} disabled={ocupadoLogin}>
              {ocupadoLogin ? 'Entrando…' : 'Entrar com Google para apoiar'}
            </button>
          </div>
        )}

        {logado && !estado.configCarregada && <p className="prp-dim">Consultando planos…</p>}

        {logado && estado.configCarregada && estado.configErro && (
          <div className="aps-caixa-dim">
            <p className="prp-dim">
              O servidor de pagamento não respondeu. Verifique se o serviço está no ar (veja o README).
            </p>
          </div>
        )}

        {logado && !estado.configErro && config && !config.habilitado && (
          <div className="aps-caixa-dim">
            <p className="prp-dim">
              Página do Mercado Pago ainda não configurada no servidor. Quem administra o projeto
              precisa definir MP_PUBLIC_KEY e MP_ACCESS_TOKEN no servidor (README).
            </p>
          </div>
        )}

        {logado && config?.habilitado && (
          <div className="aps-acoes">
            {estado.membroCarregando && <p className="prp-dim">Consultando sua assinatura…</p>}
            {!estado.membroCarregando && estado.membro?.ativo ? (
              <>
                <span className="aps-ativo">✓ Assinatura ativa</span>
                <a
                  className="prp-bt"
                  href="https://www.mercadopago.com.br/subscriptions"
                  target="_blank"
                  rel="noreferrer"
                >
                  Gerenciar no Mercado Pago ↗
                </a>
                <button type="button" className="prp-bt" onClick={cancelar} disabled={cancelando}>
                  {cancelando ? 'Cancelando…' : 'Cancelar apoio'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="prp-bt prp-bt-primario"
                onClick={assinar}
                disabled={assinando}
              >
                {assinando ? 'Abrindo Mercado Pago…' : `Assinar por R$ ${preco.toFixed(2).replace('.', ',')}/mês`}
              </button>
            )}
          </div>
        )}

        {aviso && (
          <p className="prp-aviso" role="status">
            {aviso}
          </p>
        )}
      </div>
    </div>
  );
}