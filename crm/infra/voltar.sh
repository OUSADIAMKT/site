#!/bin/sh
# Volta o CRM para a versão anterior à que está no ar.
#   sh /opt/ousadia-crm/atual/infra/voltar.sh            (a anterior)
#   sh /opt/ousadia-crm/atual/infra/voltar.sh <versao>   (uma específica)
# As versões disponíveis: ls -1t /opt/ousadia-crm/releases
set -eu
BASE=${CRM_BASE:-/opt/ousadia-crm}
# Como reiniciar (trocável só para testar o script fora da VPS).
REINICIAR=${CRM_REINICIAR:-sudo /usr/bin/systemctl restart ousadia-crm}
ATUAL=$(basename "$(readlink "$BASE/atual")")
if [ $# -ge 1 ]; then
  ALVO="$1"
else
  ALVO=$(ls -1t "$BASE/releases" | grep -vx "$ATUAL" | head -n 1)
fi
test -n "$ALVO" && test -d "$BASE/releases/$ALVO" || { echo "não há versão para voltar"; exit 1; }
ln -sfn "$BASE/releases/$ALVO" "$BASE/atual.tmp"
mv -T "$BASE/atual.tmp" "$BASE/atual"
$REINICIAR
echo "no ar: $ALVO (antes: $ATUAL)"
