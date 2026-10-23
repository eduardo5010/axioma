#!/usr/bin/env bash
# Deploy do Axioma na Railway.
#
# Lê server/.env + .env.local, converte a conta de serviço do Firebase em JSON
# inline, aplica tudo como variáveis no projeto Railway atual, e faz o deploy.
#
# Uso:
#   ./deploy.sh [URL_PUBLICA]        # 1º deploy: rode sem URL, gere o domínio e rode de novo
#   ./deploy.sh https://axioma-xxx.up.railway.app   # define MP_BACK_URL e atualiza
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI não encontrada. Instale com:  npm i -g @railway/cli"
  exit 1
fi

BACK_URL="${1:-}"

declare -A VARS

carregar() {
  local arquivo="$1"
  local so_vite="$2"  # "1" = só chaves VITE_* (frontend)
  [[ -f "$arquivo" ]] || { echo "  → $arquivo ausente (ignorado)"; return 0; }
  echo "  → lendo $arquivo"
  while IFS= read -r linha || [[ -n "$linha" ]]; do
    linha="${linha//[$'\r']/}"
    [[ -n "$linha" ]] || continue
    [[ "$linha" == \#* ]] || [[ "$linha" != *=* ]] && continue
    chave="${linha%%=*}"
    valor="${linha#*=}"
    chave="$(printf '%s' "$chave" | tr -d '[:space:]')"
    [[ -n "$chave" ]] || continue
    # remove aspas em volta do valor
    if [[ "$valor" == \"*\" ]]; then
      valor="${valor#\"}"; valor="${valor%\"}"
    elif [[ "$valor" == \'*\' ]]; then
      valor="${valor#\'}"; valor="${valor%\'}"
    fi
    # barulho do CLI do Neon / chaves locais que não servem em produção
    [[ "$chave" == NEON_* || "$chave" == DATABASE_URL_UNPOOLED ]] && continue
    if [[ "$so_vite" == "1" && "$chave" != VITE_* ]]; then continue; fi
    # conta de serviço por caminho (dev) → JSON inline (nuvem).
    # O caminho em server/.env é relativo à pasta server/, então resolve nesta base.
    if [[ "$chave" == "GOOGLE_APPLICATION_CREDENTIALS" ]]; then
      local caminho_conta="$valor"
      local base_env="$(cd "$(dirname "$arquivo")" && pwd)"
      [[ -f "$caminho_conta" ]] || caminho_conta="$base_env/$valor"
      if [[ -f "$caminho_conta" ]]; then
        chave="GOOGLE_APPLICATION_CREDENTIALS_JSON"
        valor="$(node -e 'const fs=require("fs");process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8"))))' "$caminho_conta")"
        echo "  → GOOGLE_APPLICATION_CREDENTIALS (arquivo) → GOOGLE_APPLICATION_CREDENTIALS_JSON (inline)"
      fi
    fi
    VARS["$chave"]="$valor"
  done < "$arquivo"
}

echo "[1/3] Coletando variáveis..."
carregar "server/.env" "0"
carregar ".env.local" "1"
unset 'VARS[GOOGLE_APPLICATION_CREDENTIALS]' 2>/dev/null || true

if [[ -n "$BACK_URL" ]]; then
  BACK_URL="${BACK_URL%/}"
  VARS[MP_BACK_URL]="$BACK_URL"
  echo "  → MP_BACK_URL=${BACK_URL}"
  if [[ -n "${VARS[CORS_ORIGIN]:-}" ]]; then
    VARS[CORS_ORIGIN]="$(printf '%s' "${VARS[CORS_ORIGIN]}" | sed "s#http://127.0.0.1:5174#${BACK_URL}#g")"
  fi
fi

echo "[2/3] Aplicando variáveis no Railway..."
local_args=()
for k in "${!VARS[@]}"; do
  local_args+=( "$k=${VARS[$k]}" )
done
if [[ ${#local_args[@]} -gt 0 ]]; then
  railway variables set "${local_args[@]}"
else
  echo "  → nenhuma variável a aplicar"
fi

echo "[3/3] Deploy..."
railway up

echo
echo "Pronto. Para gerar o domínio público (se ainda não tiver):"
echo "    railway domain       (ou Dashboard → Networking → Generate domain)"
echo "Dai rode de novo com a URL para o Mercado Pago voltar certo:"
echo "    ./deploy.sh https://SEU-NOME.up.railway.app"
echo "Para atualizar depois:  ./deploy.sh <mesma-URL>"