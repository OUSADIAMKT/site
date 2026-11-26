#!/bin/sh
# Backup diário do banco do CRM. Roda como o usuário postgres (ver cron).
# Guarda 14 dias em /var/backups/crm. Lembre: backup que nunca foi
# restaurado não é backup. Teste a restauração (README, seção Backup).
set -eu
PASTA=/var/backups/crm
mkdir -p "$PASTA"
ARQ="$PASTA/crm-$(date +%Y-%m-%d).dump"
pg_dump --format=custom --no-owner crm > "$ARQ.tmp"
mv "$ARQ.tmp" "$ARQ"
find "$PASTA" -name 'crm-*.dump' -mtime +14 -delete
