# Infraestrutura e publicação

Estado em 26/11/2026. Sem senhas nem chaves: só endereços e procedimentos.

## Visão geral

| Peça | Onde está |
|---|---|
| Código-fonte | GitHub `OUSADIAMKT/site`, branch `main` |
| Site (estático) | VPS Hostinger KVM 1 (Ubuntu 26.04, Campinas), IP `189.24.18.136`, pasta `/var/www/ousadia` |
| Servidor web | Caddy 2 (HTTPS automático), config em `/etc/caddy/Caddyfile` |
| DNS | Registro.br (zona avançada). Domínio `ousadiamarketing.com.br` |
| E-mail | Hostinger Email (`contato@ousadiamarketing.com.br`). Continua na Hostinger |
| Comunidade | `comunidade.ousadiamarketing.com.br`, CNAME para a Vercel. Não mexer |

O site é **exportação estática** (`output: "export"` em `next.config.ts`): o
`next build` gera `out/` e não há Node rodando no servidor.

## Como publicar

Automático. Todo push na `main` dispara `.github/workflows/deploy.yml`:

1. `npm ci` e `npm run build` (gera `out/`).
2. `rsync --delete` de `out/` para `/var/www/ousadia/` na VPS, pelo usuário `deploy`.
3. Teste final: `https://ousadiamarketing.com.br/` precisa responder 200.

Se o build falhar, nada é enviado e o site no ar continua intacto. Também dá
para rodar à mão em GitHub > Actions > Deploy > Run workflow.

Fluxo de trabalho: alterar numa branch, abrir PR, fazer merge na `main`.

Segredos do repositório (Settings > Secrets and variables > Actions):
`VPS_HOST`, `VPS_USER` (`deploy`), `VPS_SSH_KEY` (chave privada do `deploy`).
O workflow confere a impressão digital da chave do servidor; se a VPS for
recriada, atualize `VPS_HOST_FINGERPRINT` no workflow.

A chave privada fica em `~/.ssh/deploy_ousadia` no PC do administrador (a
pública, `github-deploy`, está em `/home/deploy/.ssh/authorized_keys` na VPS).
O workflow remove `\r` (caso o secret tenha sido colado com CRLF) e testa a
chave antes do `rsync`. Se o passo "Configurar SSH" falhar com "VPS_SSH_KEY
invalida", cole o arquivo inteiro de novo, de `BEGIN` a `END`. No log da VPS,
`journalctl -u ssh` mostra `Accepted publickey for deploy` quando funciona e
`Connection closed by authenticating user deploy ... [preauth]` quando a chave
é recusada.

## Acesso à VPS

- SSH somente por chave. Login por senha desligado
  (`/etc/ssh/sshd_config.d/00-hardening.conf`).
- `ssh root@189.24.18.136` (chave do PC do administrador).
- Usuário `deploy`: sem root, dono apenas de `/var/www/ousadia`. Usado só pelo GitHub.
- Firewall `ufw`: portas 22, 80 e 443. `fail2ban` e atualizações automáticas ativos.
- Swap de 2 GB em `/swapfile`. A VPS tem 1 CPU e 4 GB: não é para serviços pesados.
- Backup da Hostinger é semanal. Faça snapshot manual antes de mudanças grandes.

## Caddyfile

Traduz o antigo `.htaccess` (Apache, já removido do repositório): redireciona
`www` para o domínio sem `www`, os redirects de páginas antigas, cabeçalhos de
segurança, cache, compressão e a página 404.

A cópia versionada está em [`docs/Caddyfile`](Caddyfile), idêntica à da VPS em
26/11/2026. **Quem manda é o arquivo da VPS** (`/etc/caddy/Caddyfile`): o
deploy não o envia, só publica o `out/`. Para mudar uma regra, edite
`docs/Caddyfile` aqui, commite, e aplique na VPS:

```bash
scp docs/Caddyfile root@189.24.18.136:/etc/caddy/Caddyfile
ssh root@189.24.18.136 'caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy'
```

Se mexer direto na VPS, copie o resultado de volta para `docs/Caddyfile`.

## E-mail e DNS

- Registros de e-mail (`MX`, SPF, DKIM, DMARC) ficam no Registro.br. **Não alterar.**
- Para mudar o site de servidor, troque só o registro `A` de
  `ousadiamarketing.com.br`. O `www` é um CNAME para o domínio raiz.

## Hostinger: o que não renovar

- **Premium Web Hosting**: não renovar. Expira em 10/12/2026; o site já saiu de lá.
- **Starter Business Email** de `ousadiamarketing.com.br`: **renovar** (vence em 10/12/2026).
- Antes de 10/12, guardar uma cópia local dos arquivos do Premium Web Hosting.

## Pendências

- [ ] Renovar o e-mail da Hostinger antes de 10/12.
- [ ] Copiar os arquivos do Premium Web Hosting antes de ele expirar.
- [x] Remover `scripts/deploy.mjs`, o script `deploy` do `package.json`,
      `public/.htaccess` e a branch `deploy` (feito em 26/11/2026; a branch
      terminava no commit `f7ae523`, e o site antigo se reconstrói da `main`).
- [x] Guardar uma cópia do Caddyfile no repositório (`docs/Caddyfile`).
- [ ] Tirar snapshot da VPS depois do primeiro deploy bem-sucedido.
- [ ] Migrar o site do Instituto Xingu (projeto separado, em
      `D:\CLAUDE\CLIENTES\instituto-xingu`) para a mesma VPS: outra pasta em
      `/var/www/` e outro bloco no Caddyfile. O e-mail do Xingu foi descartado.
