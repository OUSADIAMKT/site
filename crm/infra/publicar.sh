#!/bin/sh
# Troca a versão no ar pela que acabou de chegar, com volta atrás.
#
# Chamado pelo deploy automático (deploy-crm.yml), como o usuário deploy:
#   sh /opt/ousadia-crm/releases/<versao>/infra/publicar.sh <versao>
#
# Cada versão mora em /opt/ousadia-crm/releases/<versao>, e
# /opt/ousadia-crm/atual é só um atalho para a que está no ar. Trocar de
# versão é trocar o atalho (operação atômica) e reiniciar. Se a versão nova
# não responder em 30 segundos, o atalho volta para a anterior sozinho.
set -eu
BASE=${CRM_BASE:-/opt/ousadia-crm}
# Como reiniciar (trocável só para testar o script fora da VPS).
REINICIAR=${CRM_REINICIAR:-sudo /usr/bin/systemctl restart ousadia-crm}
NOVA="$1"
DIR="$BASE/releases/$NOVA"
test -d "$DIR" || { echo "versão $NOVA não existe em $BASE/releases"; exit 1; }

cd "$DIR"
${CRM_NPM:-npm ci --omit=dev --no-audit --no-fund}

ANTERIOR=$(readlink "$BASE/atual" 2>/dev/null || true)

trocar() {
  ln -sfn "$1" "$BASE/atual.tmp"
  mv -T "$BASE/atual.tmp" "$BASE/atual"
  $REINICIAR
}

no_ar() {
  # 405 no login = o servidor subiu e carregou as rotas.
  i=0
  while [ $i -lt "${CRM_ESPERA:-30}" ]; do
    c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${CRM_PORTA:-3100}/api/painel-entrar || true)
    [ "$c" = "405" ] && return 0
    i=$((i + 1)); sleep 1
  done
  return 1
}

trocar "$DIR"
if no_ar; then
  echo "no ar: $NOVA"
  # Guarda as 5 versões mais recentes; o resto sai.
  ls -1dt "$BASE"/releases/*/ | tail -n +6 | xargs -r rm -rf
  exit 0
fi

echo "a versão $NOVA não respondeu."
if [ -n "$ANTERIOR" ] && [ -d "$ANTERIOR" ]; then
  trocar "$ANTERIOR"
  echo "voltou para $(basename "$ANTERIOR")"
fi
exit 1
