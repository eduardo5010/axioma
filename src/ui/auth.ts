import { useSyncExternalStore } from 'react';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

export interface UsuarioGoogle {
  uid: string;
  nome: string;
  email: string;
  foto: string | null;
}

export class ErroLogin extends Error {
  readonly contexto: 'config' | 'popup_bloqueado' | 'cancelado' | 'dominio' | 'outro';
  constructor(contexto: ErroLogin['contexto'], mensagem: string) {
    super(mensagem);
    this.contexto = contexto;
  }
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const CONFIG_LS_KEY = 'axioma_firebase_config';

const daEnvio = (): FirebaseConfig | null => {
  const f: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };
  return f.apiKey && f.authDomain && f.projectId && f.appId ? f : null;
};

const doNavegador = (): FirebaseConfig | null => {
  try {
    const raw = localStorage.getItem(CONFIG_LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as FirebaseConfig;
    if (!o.apiKey || !o.authDomain || !o.projectId || !o.appId) return null;
    return {
      apiKey: o.apiKey,
      authDomain: o.authDomain,
      projectId: o.projectId,
      appId: o.appId,
      storageBucket: o.storageBucket,
      messagingSenderId: o.messagingSenderId,
    };
  } catch {
    return null;
  }
};

const config = daEnvio() ?? doNavegador();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (config) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    void setPersistence(auth, browserLocalPersistence);
  } catch {
    app = null;
    auth = null;
  }
}

export const firebaseApp: FirebaseApp | null = app;

const paraUi = (u: User): UsuarioGoogle => ({
  uid: u.uid,
  nome: u.displayName ?? u.email ?? 'Jogador(a)',
  email: u.email ?? '',
  foto: u.photoURL,
});

interface EstadoAuth {
  status: 'carregando' | 'deslogado' | 'logado';
  usuario: UsuarioGoogle | null;
}

const EstadoInicial: EstadoAuth = { status: 'carregando', usuario: null };
let cache = EstadoInicial;
const ouvintes = new Set<(e: EstadoAuth) => void>();

function notificar(e: EstadoAuth) {
  cache = e;
  for (const fn of ouvintes) fn(e);
}

if (auth) {
  onAuthStateChanged(auth, (u) => {
    notificar({ status: u ? 'logado' : 'deslogado', usuario: u ? paraUi(u) : null });
  });
} else {
  notificar({ status: 'deslogado', usuario: null });
}

export function useAuth(): EstadoAuth {
  const estado = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    () => cache,
  );
  return estado;
}

export const loginConfigurado = config !== null && auth !== null;

export type FonteConfig = 'env' | 'navegador' | 'nenhuma';

export interface ConfigAtual {
  fonte: FonteConfig;
  config: FirebaseConfig;
}

export function configFirebaseAtual(): ConfigAtual {
  const daEnv = daEnvio();
  if (daEnv) return { fonte: 'env', config: daEnv };
  const navegador = doNavegador();
  if (navegador) return { fonte: 'navegador', config: navegador };
  return { fonte: 'nenhuma', config: { apiKey: '', authDomain: '', projectId: '', appId: '' } };
}

export function salvarConfigFirebase(c: FirebaseConfig): void {
  try {
    localStorage.setItem(CONFIG_LS_KEY, JSON.stringify(c));
  } catch {
    throw new ErroLogin(
      'outro',
      'Não foi possível salvar a configuração (armazenamento do navegador indisponível).',
    );
  }
}

export function limparConfigFirebase(): void {
  try {
    localStorage.removeItem(CONFIG_LS_KEY);
  } catch {
    /* noop */
  }
}

export async function entrarComGoogle(): Promise<void> {
  if (!auth) {
    throw new ErroLogin(
      'config',
      'Login com Google ainda não está configurado neste deploy. Configure as variáveis VITE_FIREBASE_* (veja o README).',
    );
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (erro) {
    if (erro instanceof Error) {
      const cod = (erro as { code?: string }).code ?? '';
      if (cod === 'auth/popup-blocked') {
        throw new ErroLogin('popup_bloqueado', 'O navegador bloqueou o pop-up de login. Habilite pop-ups para este site e tente novamente.');
      }
      if (cod === 'auth/popup-closed-by-user' || cod === 'auth/cancelled-popup-request') {
        throw new ErroLogin('cancelado', 'Login cancelado.');
      }
      if (cod === 'auth/unauthorized-domain' || cod === 'auth/operation-not-allowed') {
        throw new ErroLogin('dominio', `Este domínio (${window.location.hostname}) não está autorizado no Firebase Authentication. Adicione-o em Console do Firebase → Authentication → Configurações.`);
      }
    }
    throw new ErroLogin('outro', 'Não foi possível entrar com o Google. Tente novamente.');
  }
}

export async function sairDaConta(): Promise<void> {
  if (auth) await signOut(auth);
}

export function authAtual(): Auth | null {
  return auth;
}

export async function tokenAtual(): Promise<string | null> {
  const u = auth?.currentUser;
  if (!u) return null;
  try {
    return await u.getIdToken();
  } catch {
    return null;
  }
}