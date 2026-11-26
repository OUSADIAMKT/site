#!/bin/sh
# Backup diário do banco do CRM. Roda como root (cron, ver cron.exemplo).
#
#   1. pg_dump do banco `crm` (formato custom, restaura com pg_restore);
#   2. cifra com `age` para a CHAVE PÚBLICA em /etc/ousadia-crm/backup.pub
#      (a privada fica fora da VPS: quem invadir a máquina não lê o backup);
#   3. envia para o Cloudflare R2 (backups/crm/);
#   4. guarda 7 dias na própria máquina, para restauração rápida.
#
# Sem a chave pública o backup fica só local e o script avisa e falha, para o
# cron mandar e-mail: backup que não sai da máquina não é backup.
set -eu
PASTA=/var/backups/crm
CHAVE_PUBLICA=/etc/ousadia-crm/backup.pub
APP=/opt/ousadia-crm/atual

umask 077
mkdir -p "$PASTA"
DIA=$(date +%Y-%m-%d)
ARQ="$PASTA/crm-$DIA.dump"

sudo -u postgres pg_dump --format=custom --no-owner crm > "$ARQ.tmp"
mv "$ARQ.tmp" "$ARQ"
find "$PASTA" -name 'crm-*.dump*' -mtime +7 -delete

if [ ! -s "$CHAVE_PUBLICA" ]; then
  echo "backup: $CHAVE_PUBLICA não existe. Backup ficou só local." >&2
  exit 1
fi

age -R "$CHAVE_PUBLICA" -o "$ARQ.age" "$ARQ"
node --env-file=/etc/ousadia-crm.env "$APP/scripts/enviar-backup.js" "$ARQ.age"
rm -f "$ARQ.age"
