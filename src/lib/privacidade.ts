import { GoogleAuthProvider, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { authAtual, firebaseApp, tokenAtual, type UsuarioGoogle } from '../ui/auth';

export interface PropostaExportavel {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  votos: number;
  criadaEm: Date;
}

export interface DadosExportaveis {
  geradoEm: string;
  perfil: { uid: string; nome: string; email: string; foto: string | null };
  salvamentos: Record<string, string>;
  propostas: PropostaExportavel[];
  votos: Array<{ id: string; titulo: string; data: Date }>;
}

interface ApiProposta {
  id: string;
  titulo: string;
  descricao: string;
  autor_uid: string;
  status: string;
  votos: number;
  votos_por: string[];
  criada_em: string;
}

function lerSalvos(): Record<string, string> {
  try {
    const r: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('axioma_')) r[k] = localStorage.getItem(k) ?? '';
    }
    return r;
  } catch {
    return {};
  }
}

async function todasPropostas(): Promise<ApiProposta[]> {
  const r = await fetch('/api/propostas');
  if (!r.ok) throw new Error('Não foi possível ler as propostas do servidor.');
  return r.json() as Promise<ApiProposta[]>;
}

export async function exportarMeusDados(usuario: UsuarioGoogle): Promise<DadosExportaveis> {
  const dados: DadosExportaveis = {
    geradoEm: new Date().toISOString(),
    perfil: {
      uid: usuario.uid,
      nome: usuario.nome,
      email: usuario.email,
      foto: usuario.foto,
    },
    salvamentos: lerSalvos(),
    propostas: [],
    votos: [],
  };
  if (!firebaseApp) return dados;

  const lista = await todasPropostas();
  for (const a of lista) {
    const criada = new Date(a.criada_em);
    const data = Number.isNaN(criada.getTime()) ? new Date() : criada;
    if (a.autor_uid === usuario.uid) {
      dados.propostas.push({
        id: String(a.id ?? ''),
        titulo: String(a.titulo ?? ''),
        descricao: String(a.descricao ?? ''),
        status: String(a.status ?? 'votacao'),
        votos: typeof a.votos === 'number' ? a.votos : 0,
        criadaEm: data,
      });
    }
    if (Array.isArray(a.votos_por) && a.votos_por.includes(usuario.uid)) {
      dados.votos.push({
        id: String(a.id ?? ''),
        titulo: String(a.titulo ?? ''),
        data,
      });
    }
  }

  return dados;
}

export function baixarArquivo(conteudo: object, nome: string): void {
  const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function excluirMinhaConta(usuario: UsuarioGoogle): Promise<void> {
  const token = await tokenAtual();
  if (token) {
    const r = await fetch('/api/conta/excluir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid: usuario.uid }),
    });
    if (!r.ok) {
      const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
      throw new Error(dados?.erro ?? 'Não foi possível apagar seus dados no servidor.');
    }
  }

  try {
    for (const k of ['axioma_save_v1', 'axioma_firebase_config', 'axioma_tema']) {
      localStorage.removeItem(k);
    }
  } catch {
    /* noop */
  }

  const auth = authAtual();
  const u = auth?.currentUser;
  if (!u) return;
  try {
    await deleteUser(u);
  } catch (e) {
    const cod = e instanceof Error ? (e as { code?: string }).code : '';
    if (cod === 'auth/requires-recent-login') {
      await reauthenticateWithPopup(u, new GoogleAuthProvider());
      await deleteUser(u);
    } else {
      throw new Error(
        'Não foi possível excluir a conta agora. Faça login novamente e tente outra vez.',
      );
    }
  }
}