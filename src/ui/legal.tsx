import { useEffect, type ReactNode } from 'react';

export type PaginaLegalTipo = 'privacidade' | 'termos';

interface SecaoLegal {
  titulo: string;
  texto: ReactNode;
}

const UL = ({ itens }: { itens: string[] }) => (
  <ul>
    {itens.map((it) => (
      <li key={it}>{it}</li>
    ))}
  </ul>
);

const PRIVACIDADE: SecaoLegal[] = [
  {
    titulo: 'Quem somos',
    texto: (
      <p>
        O Axioma é um simulador de chefe de estado mantido por seus jogadores. Esta política
        explica, em linguagem simples, o que coletamos e o que você pode fazer com seus dados,
        em linha com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>
    ),
  },
  {
    titulo: 'O que coletamos',
    texto: (
      <UL
        itens={[
          'Conta Google: nome, e-mail, foto de perfil e identificador interno do Firebase Auth — necessários para você ter conta e participar (votações, propostas e apoio).',
          'Conteúdo que você cria: propostas de roteiro com seu nome e identificador.',
          'Seus votos em propostas, vinculados ao seu identificador.',
          'Dados de assinatura (via Mercado Pago): apenas o identificador da sua conta no simulador e o status da assinatura. Não armazenamos número de cartão ou dados de pagamento.',
          'No seu próprio navegador (localStorage): partidas salvas, tema e configuração do Firebase.',
        ]}
      />
    ),
  },
  {
    titulo: 'O que NÃO coletamos',
    texto: (
      <p>
        Não usamos rastreadores, não vendemos dados, não fazemos publicidade e não coletamos
        dados de navegação fora do que está descrito acima. Pagamento é processado inteiramente
        pelo Mercado Pago.
      </p>
    ),
  },
  {
    titulo: 'Base legal e finalidades',
    texto: (
      <p>
        Tratamos dados pessoais para a execução do serviço (login, votações e assinatura) e,
        para os casos previstos, com base no legítimo interesse de manter o produto funcional e
        seguro. Não há tratamento para finalidades incompatíveis com estas.
      </p>
    ),
  },
  {
    titulo: 'Onde os dados ficam (operadores)',
    texto: (
      <UL
        itens={[
          'Google / Firebase: autenticação e banco de dados (servidores nos EUA). A transferência internacional é feita pelas garantias contratuais da Google.',
          'Mercado Pago: processamento de pagamentos e assinaturas, sujeito à política própria deles.',
        ]}
      />
    ),
  },
  {
    titulo: 'Seus direitos (LGPD)',
    texto: (
      <UL
        itens={[
          'Acesso: exporte seus dados na tela de conta, a qualquer momento.',
          'Correção: mantenha seus dados de perfil atualizados na sua conta Google.',
          'Eliminação: o botão "Excluir minha conta" apaga perfil, propostas, votos e dados locais. Dados de faturamento podem ser retidos pelo tempo exigido por lei pelas operadoras de pagamento.',
          'Revogação: você pode cancelar a assinatura a qualquer momento no seu painel do Mercado Pago.',
        ]}
      />
    ),
  },
  {
    titulo: 'Menores de idade',
    texto: (
      <p>
        O produto é destinado a maiores de 16 anos. Menores de 16 não devem criar conta sem o
        consentimento de um responsável.
      </p>
    ),
  },
  {
    titulo: 'Retenção',
    texto: (
      <p>
        Guardamos os dados enquanto sua conta existir. Ao excluir a conta, removemos os dados
        pessoais em até 90 dias, ressalvadas obrigações legais de retenção.
      </p>
    ),
  },
  {
    titulo: 'Contato',
    texto: (
      <p>
        Dúvidas, pedidos de acesso ou reclamações: <b>privacidade@axioma.app</b> (substitua pelo
        e-mail real antes de publicar). Você também pode pedir intervenção junto à ANPD.
      </p>
    ),
  },
];

const TERMOS: SecaoLegal[] = [
  {
    titulo: 'Aceitação',
    texto: (
      <p>
        Ao criar uma conta, usar o jogo ou assinar o plano de apoio, você concorda com estes
        termos. O Axioma é distribuído como está, em evolução contínua.
      </p>
    ),
  },
  {
    titulo: 'Conta e acesso',
    texto: (
      <UL
        itens={[
          'A conta é pessoal e intransferível, feita com login Google.',
          'Uma conta por pessoa; a exclusão é de direito e pode ser feita na tela de conta.',
          'Não toleramos uso para práticas ilegais, abuso ou manipulação das votações.',
        ]}
      />
    ),
  },
  {
    titulo: 'Votações da comunidade',
    texto: (
      <p>
        Propostas são votadas pelos jogadores e implementadas conforme o roteiro do projeto. O
        desenvolvimento segue critérios próprios do mantenedor; votar não garante implementação
        nem prazo.
      </p>
    ),
  },
  {
    titulo: 'Plano de apoio (recorrente mensal)',
    texto: (
      <UL
        itens={[
          'O apoio é uma assinatura mensal recorrente de R$ 5,00 processada pelo Mercado Pago.',
          'Você pode cancelar quando quiser; o cancelamento vale para cobranças futuras.',
          'Nossa política é manter o jogo aberto; o apoio sustenta hospedagem e desenvolvimento.',
          'A cobrança segue as condições de pagamento do Mercado Pago para o seu meio de pagamento.',
        ]}
      />
    ),
  },
  {
    titulo: 'Propriedade e licença',
    texto: (
      <p>
        O código do motor é aberto. A marca, o nome e o conteúdo do produto pertencem ao Axioma.
        O jogo (a forma jogável) é licenciado para uso pessoal, não comercial, salvo disposição
        em contrário no repositório.
      </p>
    ),
  },
  {
    titulo: 'Limites de responsabilidade',
    texto: (
      <p>
        O simulador serve para entretenimento e aprendizado; não constitui aconselhamento
        econômico, jurídico ou político. Não garantimos disponibilidade ininterrupta nem
        resultados. Na máxima extensão permitida por lei, a responsabilidade do projeto limita-se
        ao valor efetivamente pago nos últimos 12 meses.
      </p>
    ),
  },
  {
    titulo: 'Alterações',
    texto: (
      <p>
        Estes termos podem mudar conforme o produto evolui. Alterações relevantes serão
        comunicadas no canal oficial do projeto.
      </p>
    ),
  },
];

export function PaginaLegal({ tipo, aoFechar }: { tipo: PaginaLegalTipo; aoFechar: () => void }) {
  const secoes = tipo === 'privacidade' ? PRIVACIDADE : TERMOS;
  const titulo = tipo === 'privacidade' ? 'Política de Privacidade' : 'Termos de Uso';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="legal" role="dialog" aria-modal="true" aria-label={titulo}>
      <header className="legal-hd">
        <span className="lp-marca" aria-label="Axioma">
          <span className="lp-marca-sigla" aria-hidden="true">
            Λ
          </span>
          <span className="lp-marca-nome">AXIOMA</span>
        </span>
        <button type="button" className="lp-btn lp-btn-fantasma lp-btn-pequeno" onClick={aoFechar}>
          Voltar
        </button>
      </header>
      <main className="legal-corpo">
        <p className="lp-rotulo lp-mono">{tipo === 'privacidade' ? 'LGPD · PRIVACIDADE' : 'CONTRATO DE USO'}</p>
        <h1>{titulo}</h1>
        <p className="lp-lead">
          Última atualização: setembro de {new Date().getFullYear()}. Em linguagem simples, sem
          juridiquês desnecessário.
        </p>
        {secoes.map((s, i) => (
          <section className="legal-secao" key={s.titulo}>
            <h2>
              <span className="legal-num lp-mono">{String(i + 1).padStart(2, '0')}</span>
              {s.titulo}
            </h2>
            {s.texto}
          </section>
        ))}
        <p className="legal-dim legal-rodape">
          Dúvidas: privacidade@axioma.app (substitua pelo e-mail real antes de publicar).
        </p>
      </main>
    </div>
  );
}