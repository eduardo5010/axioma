# Axioma

Simulador geopolítico paramétrico de código aberto. O jogador governa qualquer um dos 196 países,
decidindo sobre constituição, legislação, orçamento e tributos, gastos militares e sociais,
mercado, diplomacia e sistema penal. Uma base de fórmulas explícitas
deduz as consequências — o mesmo esquema único gera todos os países, sem lógica específica para
nenhum.

Antes chamado **Mandato**, o jogo foi renomeado para **Axioma**: na matemática, axioma é a premissa
da qual tudo o mais se deduz — e governar é escolher premissas.

## Stack

- React 18 + TypeScript (strict), Vite
- Three.js (globo 3D), d3-geo + topojson + world-atlas (geometria dos países)
- Zustand (estado), Firebase Authentication (login com Google)
- Backend Express (`server/`) com banco **Postgres no Neon** (propostas e assinaturas)

## Rodando

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:5173, proxy de /api → :3000)
npm run typecheck  # tsc --noEmit
npm run build      # build de produção
npm run server     # backend (propostas, assinatura Mercado Pago), porta 3000
```

> O frontend **não** fala direto com o Postgres: tudo passa pelo `/api` do servidor Express
> (em dev o Vite faz o proxy; em produção aponte `/api` para o servidor).

## Login com Google

O login usa Firebase Authentication com GoogleAuthProvider. A sessão é persistida no navegador
(persistência LOCAL) e um botão de "Sair" fica no menu do jogo.

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável                         | Onde encontra                                          |
| -------------------------------- | ------------------------------------------------------ |
| `VITE_FIREBASE_API_KEY`          | Console do Firebase → Config. → Seus apps → Web        |
| `VITE_FIREBASE_AUTH_DOMAIN`      | idem (`seu-projeto.firebaseapp.com`)                   |
| `VITE_FIREBASE_PROJECT_ID`       | idem                                                  |
| `VITE_FIREBASE_APP_ID`           | idem                                                  |
| `VITE_FIREBASE_STORAGE_BUCKET`   | opcional                                              |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | opcional                                            |

> Chaves de configuração do Firebase são públicas por natureza (deploy em Vite injeta as
> variáveis `VITE_*` no bundle). Mesmo assim, não as coloque no repositório: use `.env.local`.

### Configuração sem `.env` (na tela)

Sem as variáveis de ambiente, a landing mostra o botão **⚙** (canto superior direito). Ele abre
um formulário com os 4 campos (API Key, Auth domain, Project ID, App ID); as chaves são salvas
apenas neste navegador (localStorage, chave `axioma_firebase_config`) e o app recarrega na hora.
Use o botão "Remover configuração" para limpar. As variáveis de ambiente têm precedência sobre
o formulário.

### Console do Firebase

1. Crie um projeto em https://console.firebase.google.com
2. Adicione um **App Web** (ícone `</>`) e copie a configuração para `.env.local`.
3. Em **Authentication → Sign-in method**, habilite o **Google**.
4. Em **Authentication → Settings → Authorized domains**, adicione:
   - `localhost` (já vem por padrão, necessário em dev);
   - o domínio de produção (ex.: `axioma.exemplo.com`).
   Sem isso o login falha com o erro de "domínio não autorizado" exibido na tela.
5. Opcional — Google Cloud Console → APIs → Credenciais: ajuste o **OAuth consent screen**
   (marca, domínios e e-mail de suporte) para o pop-up do Google mostrar o nome do jogo.

### Estado de erro tratados

- Pop-up bloqueado pelo navegador → aviso para habilitar pop-ups.
- Cancelamento → nenhum erro exibido.
- Domínio não autorizado → mensagem pedindo a configuração no console.
- Configuração ausente (`VITE_FIREBASE_*`) → mensagem no próprio botão de login.

## Roteiro & Votações (propostas da comunidade)

Sistema de loop da comunidade: qualquer jogador lança uma proposta, a comunidade vota e as
aprovadas entram no simulador em ciclos contínuos. Os dados ficam no **Postgres (Neon)**,
acessados pelo servidor Express.

1. Crie um projeto no **Neon** (neon.tech → Dashboard → New project) e copie a **connection
   string** para `DATABASE_URL` em `server/.env`. Na primeira subida o servidor cria as tabelas
   (`propostas` e `membros`) automaticamente.
2. (Opcional, recomendado) Gere uma **chave da API do Gemini** gratuita em
   https://aistudio.google.com/apikey e coloque em `GEMINI_API_KEY` no `server/.env`
   (`GEMINI_MODEL` padrão: `gemini-2.0-flash`). Com a chave, toda proposta recebe uma
   **análise do motor** mostrada ao lado dela: resumo técnico, mudanças necessárias no motor,
   possíveis **quebras de save** (com risco alto/médio/baixo e o campo afetado) e módulos do
   jogo impactados. O autor (ou admin) pode reanalisar pelo botão "Reanalisar".
3. Inicie o backend: `npm run server`.
4. Opcional: defina `ADMIN_UIDS=` em `server/.env` com os UIDs (separados por vírgula) que podem
   mudar o status de qualquer proposta. Sem isso, só o autor muda o status da própria.
5. O painel aparece na landing (seção "Roteiro & Votações") e no jogo em **Comunidade →
   Roteiro & Votações**. A lista de propostas é pública (leitura sem login).

**Propor sem conta:** todos — membros e não membros — podem lançar uma proposta **sem login**
(identificada por um id de dispositivo no navegador, com nome opcional). O voto continua exigindo
login com o Google (token validado pelo servidor). Para evitar spam na cota gratuita da IA, cada
navegador sem conta lança até `PROPOSTAS_DISPOSITIVO_DIA` propostas por dia (padrão: 3;
`GEMINI_API_KEY` indisponível → as propostas entram com status `pendente` de análise).

Status: `votacao` → `aprovada` → `desenvolvimento` → `implementada` (ou `recusada`).

## Assinatura de apoio (Mercado Pago)

Apoio recorrente (R$ 5/mês padrão) via assinaturas do Mercado Pago, funcionando para **pessoa
física (sem CNPJ)**: cartão e PIX. Fluxo:

```
navegador ──/api/mp/assinar──> express (server/) ──> Mercado Pago PreApproval ──> init_point
navegador <─init_point (redireciona p/ pagamento)
Mercado Pago ──webhook──> /api/mp/webhook ──> Postgres (Neon): membros/{uid}.ativo
```

O cliente lê `/api/membros/{uid}` (somente o próprio usuário autenticado) e mostra o estado da
assinatura.

### 1) Conta no Mercado Pago

1. Crie uma conta em **mercadopago.com.br** (pessoa física é o suficiente para testar e receber).
2. Vá em **Seus integrações (ou Desenvolvedores) → Suas aplicações → Criar aplicação**.
3. Nas **Credenciais de produção**, copie **Public key** e **Access token**. O access token é
   secreto — fica só no servidor, nunca no `VITE_*`.

### 2) Servidor

```bash
cd server
cp .env.example .env
npm install
```

Preencha em `server/.env`:

| Variável                     | O que é                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `MP_PUBLIC_KEY`              | Public key do Mercado Pago (aplicação de produção)             |
| `MP_ACCESS_TOKEN`            | Access token (secreto)                                         |
| `MP_BACK_URL`                | URL do site p/ voltar após pagar. Dev: `http://localhost:5174` |
| `MP_WEBHOOK_SECRET`          | Segredo do webhook (opcional; valida que o aviso veio do MP)   |
| `MP_PRECO_DEFAULT`           | Preço do plano em BRL/mês (padrão 5)                           |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho do JSON da conta de serviço do Firebase (verifica o token de login) |
| `DATABASE_URL`               | Connection string do Postgres no Neon (cria as tabelas sozinho) |
| `ADMIN_UIDS`                 | UIDs que podem mudar o status de qualquer proposta (opcional)   |
| `PORT`                       | Porta do servidor (3000)                                       |

### 3) Firebase Admin (valida o token de login)

1. Console Firebase → ⚙ Configurações do projeto → **Contas de serviço** →
   **Gerar nova chave privada** → salve o JSON no projeto (raiz ou `server/`).
2. Aponte `GOOGLE_APPLICATION_CREDENTIALS` para ele. O servidor usa a conta de serviço **apenas
   para verificar o token do Firebase Auth** (o banco é o Postgres); sem ela, as escritas que exigem
   login (`/api/propostas`, `/api/conta/excluir`, `/api/membros`) são recusadas.

### 4) Neon (banco de dados)

1. Crie um projeto em **neon.tech** e copie a connection string no formato
   `postgresql://user:password@ep-xxxx.aws.neon.tech/neondb`.
2. Cole em `DATABASE_URL` em `server/.env`.
3. As tabelas `propostas` e `membros` são criadas automaticamente na primeira execução do servidor.

### 5) Webhook (notificações)

1. No Mercado Pago, na sua aplicação → **Configurações → Notificações de webhooks**, cadastre:
   - URL: `https://SEU-DOMINIO/api/mp/webhook` (em dev local, use um túnel tipo ngrok/cloude).
   - Eventos: assinaturas (**preapproval**). O endpoint também aceita o ping de teste.
2. Se gerar um **segredo** na aplicação, copie para `MP_WEBHOOK_SECRET` e ative a verificação.
3. O webhook responde `200` imediatamente e processa de forma assíncrona:
   `preapproval.authorized` → `membros/{uid}` fica `ativo: true`; cancelada/expiração → `ativo: false`.

### 6) Subir e testar

```bash
npm run server    # raiz → roda o backend na 3000
npm run dev       # outro terminal → Vite proxeia /api para :3000
```

Teste com o **modo de testes do Mercado Pago** (cartões de teste, sem cobrança real). Depois de
aprovar, o apoio aparece ativo. Para testar fora do localhost, rode o servidor Node criado
(Vite só proxeia em dev) ou configure o proxy no host.

A visão fica na landing (seção **Apoiar**) e no jogo em **Comunidade → Apoio ao projeto**.
Cancelamento: botão na própria seção ou em **mercadopago.com.br/subscriptions**. As assinaturas
criadas aparecem no painel do Mercado Pago.

> **Teste (credenciais de teste):** o Mercado Pago exige que comprador e vendedor sejam usuários de
> teste. O usuário de teste mostrado no painel (ex.: `TESTUSER...`) é o **vendedor**. Use o
> **Modo de teste** para criar uma conta de teste do **comprador** (ou gere uma via
> `POST /users/test_user`) e use o e-mail dela como `payer_email` nas chamadas de teste.

## Privacidade (LGPD)

O jogo coleta o mínimo:

- **Firebase Authentication**: nome, e-mail e foto do Google (com seu consentimento no login).
- **Postgres (Neon) via `server/`**: propostas que você cria (por login, `autor`, ou sem login,
  um identificador de dispositivo) e seus votos (`votos_por`). Sem login não há e-mail guardado —
  apenas o id de dispositivo do navegador. No apoio, um registro `membros/{uid}` com o estado da
  assinatura.
- **localStorage (navegador)**: partida salva (`axioma_save_v1`), configuração do Firebase
  (`axioma_firebase_config`) e tema (`axioma_tema`). **Não há** rastreadores nem analytics.

Direitos do titular já implementados no jogo:

- **Exportar dados**: menu do jogador → *Exportar meus dados (LGPD)* gera um `.json` com perfil,
  saves, propostas e votos (código: `src/lib/privacidade.ts`).
- **Excluir conta**: *Excluir minha conta* apaga as propostas do autor, remove seus votos
  (decrementando contadores), limpa o localStorage e exclui o usuário no Firebase Auth.

Textos legais (Política de Privacidade e Termos de Uso) ficam em `src/ui/legal.tsx` e são
exibidos na landing (rodapé). **Antes de publicar**, revise:

- O endereço de e-mail nos textos (`privacidade@axioma.app`).
- Seus dados de contato reais e a base legal (consentimento no login).
- Política de retenção (o servidor mantém o vínculo `membros` enquanto ativo).
- Público: menores de 16 anos precisam de representante legal.
- Se a operação passar a ser tratada como prestadora, avalie o registro na ANPD.

## Renomeação Mandato → Axioma

Todas as referências à marca foram trocadas (título da página, favicon, menu, textos, chave de
salvamento). A chave de save migra de `mandato_save_v1` para `axioma_save_v1` automaticamente
ao primeiro carregamento; o campo do motor `mandatoMeses` (duração do mandato constitucional em
meses, usado nas fórmulas) foi mantido por ser parte do esquema de simulação.

## Deploy na Railway

A Railway (planos gratuitos/triais sem exigir repositório Git) sobe **site + API num único
serviço**: o `railpack.json` fixa o provedor Node e o start command, as dependências do servidor
(express, firebase-admin, etc.) ficam na **raiz** do `package.json` para o Railpack instalá-las,
e o Express serve os arquivos estáticos (`dist/`) + a API (fallback SPA). Teste local:
`npm run build` e depois `PORT=3000 node server/index.mjs` já serve tudo em `http://localhost:3000`.

Pré-requisitos:

- CLI instalada e logada: `npm i -g @railway/cli && railway login`.
- Em `server/.env`: `DATABASE_URL`, `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
  `GEMINI_API_KEY` (a conta de serviço do Firebase pode continuar como caminho de arquivo — o
  script de deploy a converte para `GOOGLE_APPLICATION_CREDENTIALS_JSON`).
- Em `.env.local`: as `VITE_FIREBASE_*` (o frontend as embute na build, então precisam estar no
  Railway como variáveis — o script as envia).

Comandos:

```bash
./deploy.sh                    # 1º deploy
railway domain                 # gera o domínio público (ou Dashboard → Networking)
./deploy.sh https://SEU-NOME.up.railway.app   # fixa MP_BACK_URL e atualiza
```

Para publicar mudanças depois, basta repetir `./deploy.sh <mesma-URL>` (o script reaponta as
variáveis e sobe). O `MP_BACK_URL` precisa ser o domínio de produção: é para onde o Mercado Pago
volta o jogador depois de autorizar a assinatura (o MP rejeita `localhost`; em dev o código troca
para `127.0.0.1`).

Rodando fora da Railway (VPS, etc.): instale as mesmas variáveis, execute a build do frontend e
inicie `node server/index.mjs` na raiz do repositório. O servidor mantém os dados no Postgres
(Neon), então subir uma nova instância não perde nada.

## Repositório

[PLACEHOLDER] — informe a URL pública do repositório.

## Licença

[PLACEHOLDER]