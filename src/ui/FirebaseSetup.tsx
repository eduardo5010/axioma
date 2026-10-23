import { useEffect, useRef, useState } from 'react';
import {
  configFirebaseAtual,
  salvarConfigFirebase,
  limparConfigFirebase,
  type FirebaseConfig,
} from './auth';

const CAMPOS: Array<{ chave: keyof FirebaseConfig; rotulo: string; hint: string; extra?: string }> = [
  {
    chave: 'apiKey',
    rotulo: 'API Key',
    hint: 'Console do Firebase → ⚙ Configurações do projeto → Seus apps → app Web → "apiKey".',
    extra: 'Começa com AIza…',
  },
  {
    chave: 'authDomain',
    rotulo: 'Auth domain',
    hint: 'Mesmo lugar, campo "authDomain". Ex.: meu-projeto.firebaseapp.com.',
  },
  {
    chave: 'projectId',
    rotulo: 'Project ID',
    hint: 'Mesmo lugar, campo "projectId". É o identificador do projeto (letras, números e hífens).',
  },
  {
    chave: 'appId',
    rotulo: 'App ID',
    hint: 'Mesmo lugar, campo "appId".',
    extra: 'Começa com 1:…',
  },
];

function validar(c: FirebaseConfig): Partial<Record<keyof FirebaseConfig, string>> {
  const erros: Partial<Record<keyof FirebaseConfig, string>> = {};
  if (!c.apiKey.trim()) erros.apiKey = 'Informe a apiKey.';
  else if (!c.apiKey.trim().startsWith('AIza')) erros.apiKey = 'Uma apiKey do Firebase começa com "AIza". Confira se copiou o campo certo.';
  if (!c.authDomain.trim()) erros.authDomain = 'Informe o authDomain.';
  else if (!c.authDomain.includes('.')) erros.authDomain = 'Parece não ser um domínio válido (ex.: projeto.firebaseapp.com).';
  if (!c.projectId.trim()) erros.projectId = 'Informe o projectId.';
  if (!c.appId.trim()) erros.appId = 'Informe o appId.';
  else if (!c.appId.trim().startsWith('1:')) erros.appId = 'Um appId do Firebase começa com "1:". Confira se copiou o campo certo.';
  return erros;
}

export default function FirebaseSetup({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const atual = configFirebaseAtual();
  const [fonte] = useState(atual.fonte);
  const [form, setForm] = useState<FirebaseConfig>(atual.config);
  const [erros, setErros] = useState<Partial<Record<keyof FirebaseConfig, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const primeiroCampo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    primeiroCampo.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const definir = (chave: keyof FirebaseConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [chave]: e.target.value }));
    setErros((prev) => ({ ...prev, [chave]: undefined }));
    setStatus(null);
  };

  const salvar = () => {
    const errosFinal = validar(form);
    setErros(errosFinal);
    if (Object.values(errosFinal).some(Boolean)) return;
    try {
      salvarConfigFirebase(form);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return;
    }
    setStatus('Configuração salva. Atualizando o app…');
    window.setTimeout(() => window.location.reload(), 500);
  };

  const limpar = () => {
    limparConfigFirebase();
    setStatus('Configuração removida. Atualizando o app…');
    window.setTimeout(() => window.location.reload(), 300);
  };

  const somenteEnvio = fonte === 'env';

  return (
    <div className="fs-escuro" onClick={aoFechar}>
      <div
        className="fs-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fs-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fs-hd">
          <div>
            <h2 id="fs-titulo">⚙️ Configurar Firebase</h2>
            <p className="fs-sub dim">
              Cole abaixo as credenciais do seu projeto (passo a passo no README). Elas ficam salvas só
              neste navegador e clicam "Salvar" recarrega o app.
            </p>
          </div>
          <button className="btn btn-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>

        {somenteEnvio && (
          <p className="fs-aviso">
            Este app já está configurado via variáveis de ambiente (<span className="lp-mono">VITE_FIREBASE_*</span>).
            Os valores abaixo estão apenas informativos.
          </p>
        )}

        <form
          className="fs-form"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {CAMPOS.map((campo, i) => (
            <div className="fs-campo" key={campo.chave}>
              <label htmlFor={`fs-${campo.chave}`}>{campo.rotulo}</label>
              <input
                ref={i === 0 ? primeiroCampo : undefined}
                id={`fs-${campo.chave}`}
                type="text"
                value={form[campo.chave] ?? ''}
                onChange={definir(campo.chave)}
                readOnly={somenteEnvio}
                placeholder={campo.extra ?? ''}
                spellCheck={false}
                autoComplete="off"
              />
              <small className="fs-hint">{campo.hint}</small>
              {erros[campo.chave] && <small className="fs-erro">{erros[campo.chave]}</small>}
            </div>
          ))}

          {status && <p className="fs-status" role="status">{status}</p>}

          <div className="fs-acoes">
            {!somenteEnvio && (
              <>
                <button type="submit" className="btn btn-jogar">Salvar e recarregar</button>
                {fonte === 'navegador' && (
                  <button type="button" className="btn" onClick={limpar}>Remover configuração</button>
                )}
              </>
            )}
            <span className="dim fs-nota">As chaves do Firebase são públicas por natureza no client.</span>
          </div>
        </form>
      </div>
    </div>
  );
}