import { useState } from 'react';
import { sairDaConta, type UsuarioGoogle } from './auth';
import { dadosDoSalvo } from '../store/game';
import { fmtNum } from '../engine/util';
import { baixarArquivo, excluirMinhaConta, exportarMeusDados } from '../lib/privacidade';

export default function PainelJogador({ usuario }: { usuario: UsuarioGoogle }) {
  const [salvo] = useState(() => dadosDoSalvo());
  const [saindo, setSaindo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const sair = async () => {
    setSaindo(true);
    try {
      await sairDaConta();
    } catch {
      setSaindo(false);
    }
  };

  const exportar = async () => {
    setExportando(true);
    setErro(null);
    try {
      const dados = await exportarMeusDados(usuario);
      baixarArquivo(dados, `${usuario.uid}.axioma-dados.json`);
    } catch {
      setErro('Não foi possível exportar seus dados agora.');
    } finally {
      setExportando(false);
    }
  };

  const excluir = async () => {
    const ok = window.confirm(
      'Apagar permanentemente sua conta, propostas, votos e dados salvos neste navegador? Esta ação é irreversível (LGPD).',
    );
    if (!ok) return;
    setExcluindo(true);
    setErro(null);
    try {
      await excluirMinhaConta(usuario);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a conta.');
      setExcluindo(false);
    }
  };

  return (
    <div className="menu-user">
      <div className="menu-user-info">
        {usuario.foto ? (
          <img className="menu-user-foto" src={usuario.foto} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="menu-user-foto menu-user-foto-inicial" aria-hidden="true">
            {(usuario.nome.trim()[0] ?? '?').toUpperCase()}
          </span>
        )}
        <div className="menu-user-texto">
          <b className="menu-user-nome">{usuario.nome}</b>
          <small className="dim">{usuario.email}</small>
        </div>
      </div>

      {salvo && (
        <div className="menu-user-salvo">
          <span>💾 Partida salva: <b>{salvo.paisNome}</b></span>
          <small className="dim">
            {fmtNum(salvo.anosPoder, 1)} anos no poder · aprovação {fmtNum(salvo.aprovacao, 0)}
          </small>
        </div>
      )}

      <div className="menu-user-acoes">
        <button className="btn" onClick={exportar} disabled={exportando}>
          {exportando ? 'Exportando…' : '📄 Exportar meus dados (LGPD)'}
        </button>
        <button className="btn menu-user-excluir" onClick={excluir} disabled={excluindo}>
          {excluindo ? 'Excluindo…' : '🗑 Excluir minha conta'}
        </button>
      </div>

      {erro && (
        <p className="menu-user-erro" role="alert">
          {erro}
        </p>
      )}

      <button className="btn menu-user-sair" onClick={sair} disabled={saindo}>
        {saindo ? 'Saindo…' : 'Sair'}
      </button>
    </div>
  );
}