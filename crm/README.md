# CRM Ousadia

O CRM da Ousadia Marketing, em `https://crm.ousadiamarketing.com.br`.
Leads do site, funil de vendas, contatos, tarefas, automações, disparos,
atendimento por WhatsApp e Instagram com IA (quando houver número),
relatórios de anúncios da Meta, landing pages e agenda.

Projeto separado do site (que é Next.js estático na raiz do repositório):
aqui é React + Vite no painel e Node puro no servidor, com Postgres na
própria VPS.

| Peça | O que é |
|---|---|
| `src/` | o painel (React). `npm run build` gera `dist/` |
| `api/` | as rotas. Cada arquivo sem `_` é uma rota `/api/<nome>` |
| `servidor.js` | o processo Node que serve `dist/` e as rotas na VPS |
| `banco/` | o banco do zero, em cinco arquivos, na ordem do nome |
| `sql/` | histórico de migrações da origem. **Não usar para instalar**; os testes usam |
| `infra/` | Caddy, PostgREST, systemd, cron e backup para a VPS |
| `scripts/` | utilitários: gerar ambiente, conectar WhatsApp, diagnósticos |
| `test/` | `npm test`, com Postgres de verdade em memória (PGlite) |

## Desenvolver

```bash
cd crm
npm install
npm test
```

O painel sozinho (sem dados) abre com `npm run dev` em `http://localhost:5173/painel.html`.
Para ter a API, rode `node --env-file=.env servidor.js` em outra janela, com
um `.env` copiado de `.env.exemplo` apontando para um banco de teste.

## Como os dados entram

- **Site → CRM.** Todo formulário do site (`lib/crm.ts`) manda uma cópia para
  `POST /api/lead`, em paralelo com as planilhas. Vira negócio no funil
  **Alunos**, etapa **Novo lead**, com a origem (Site, Diagnóstico, Newsletter)
  e uma nota com tudo o que a pessoa preencheu. Quem preenche de novo ganha
  nota nova, não negócio duplicado. A rota só aceita origem
  `ousadiamarketing.com.br`, tem freio por IP e campo-isca (`_gotcha`).
- **WhatsApp e Instagram.** Ainda sem número: tudo pronto e desligado. Ver
  "WhatsApp, depois" abaixo.
- **Importação.** Em Contatos > Importar, CSV ou colado.

## Assuntos da fila

A IA e a fila separam a conversa em três assuntos (`api/_assunto.js`):

| Assunto | Quando | Etiquetas |
|---|---|---|
| `matricula` | quer entrar na escola, mentoria, curso, turma | `lead`, `matricula` |
| `suporte` | já é aluno: acesso, aula, certificado, reembolso | `suporte` |
| `agencia` | empresa querendo contratar a agência | `lead`, `agencia` |

Cada atendente marca em Atendentes quais assuntos recebe; as frentes
(Matrículas, Suporte ao aluno, Agência) já nascem na semente.

---

## Instalar na VPS

Uma vez só. Tudo como `root` na VPS (`ssh root@189.24.18.136`), salvo onde
estiver dito. **Antes: snapshot da VPS na Hostinger.**

A VPS tem 1 CPU e 4 GB: Postgres + PostgREST + o CRM cabem com folga nesta
carga (centenas de leads por dia), mas não é para mais nada pesado.

### 1. DNS

No Registro.br, zona de `ousadiamarketing.com.br`, criar:

| Tipo | Nome | Valor |
|---|---|---|
| A | `crm` | `189.24.18.136` |

Não mexer em nenhum outro registro (e-mail e comunidade continuam como estão).

### 2. Pacotes

```bash
apt update && apt install -y postgresql nodejs npm
node --version   # precisa ser 22 ou mais novo
```

Se o Node do Ubuntu for mais velho que 22, instale pelo NodeSource
(https://github.com/nodesource/distributions) antes de seguir.

PostgREST (binário único, https://github.com/PostgREST/postgrest/releases,
o `linux-static-x64`):

```bash
cd /tmp
curl -fsSLO https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz
tar xJf postgrest-v12.2.3-linux-static-x64.tar.xz
install -m 755 postgrest /usr/local/bin/postgrest
postgrest --version
```

### 3. Usuários e pastas

```bash
useradd --system --no-create-home --shell /usr/sbin/nologin crm
useradd --system --no-create-home --shell /usr/sbin/nologin postgrest
install -d -o deploy -g deploy -m 755 /opt/ousadia-crm
```

O usuário `deploy` (o mesmo do site) escreve o código; o `crm` só lê e roda.
Para o deploy automático reiniciar o serviço, e só isso:

```bash
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ousadia-crm' > /etc/sudoers.d/deploy-crm
chmod 440 /etc/sudoers.d/deploy-crm && visudo -c
```

### 4. O código, a primeira vez

Da sua máquina, na raiz do repositório (ou deixe o deploy automático fazer,
passo 10, e volte aqui):

```bash
cd crm && npm ci && npm run build
rsync -rltz --delete --exclude node_modules/ --exclude test/ ./ deploy@189.24.18.136:/opt/ousadia-crm/
ssh deploy@189.24.18.136 'cd /opt/ousadia-crm && npm ci --omit=dev'
```

### 5. Ambiente e segredos

```bash
cd /opt/ousadia-crm
node scripts/gerar-ambiente.js /etc/ousadia-crm.env
chown root:crm /etc/ousadia-crm.env && chmod 640 /etc/ousadia-crm.env
```

Ele imprime o **segredo do PostgREST**, a **senha do operador** e o
**CRON_SECRET**. Depois:

- abra `/etc/ousadia-crm.env` e preencha `IP_PUBLICO=189.24.18.136`;
- guarde a senha do operador no gerenciador de senhas;
- **copie o arquivo inteiro para fora da máquina** (por causa da `CHAVE_CIFRA`).

### 6. Banco

```bash
sudo -u postgres createdb crm
for f in 00-base 01-esquema 02-ousadia 03-permissoes 04-semente-ousadia; do
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d crm -f /opt/ousadia-crm/banco/$f.sql || break
done
sudo -u postgres psql -c "alter role authenticator password 'UMA_SENHA_FORTE_NOVA'"
```

Os cinco arquivos foram testados em Postgres 16 limpo (`test/banco-vps.test.js`
roda o mesmo no PGlite). O banco nasce com 56 tabelas, RLS em todas, e só a
Ousadia como empresa: funis Alunos e Agência, origens, motivos, produtos
(valor zero, preencher na tela), etiquetas e frentes. Nenhuma pessoa.

### 7. PostgREST

```bash
install -d -o postgrest -m 750 /etc/postgrest
cp /opt/ousadia-crm/infra/postgrest.conf.exemplo /etc/postgrest/crm.conf
chown postgrest /etc/postgrest/crm.conf && chmod 600 /etc/postgrest/crm.conf
nano /etc/postgrest/crm.conf   # trocar a senha do authenticator e o jwt-secret
cp /opt/ousadia-crm/infra/postgrest.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now postgrest
curl -s http://127.0.0.1:3000/ -o /dev/null -w '%{http_code}\n'   # 200
```

### 8. Caddy

Acrescente o conteúdo de `infra/Caddyfile.crm` ao `/etc/caddy/Caddyfile`
(os blocos do site ficam como estão; se já houver um bloco global `{ }` no
topo, junte o `on_demand_tls` a ele). Depois:

```bash
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

### 9. O serviço do CRM

```bash
cp /opt/ousadia-crm/infra/ousadia-crm.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now ousadia-crm
journalctl -u ousadia-crm -n 20 --no-pager
```

Conferir (as mesmas provas do deploy automático):

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://crm.ousadiamarketing.com.br/                     # 200
curl -s -o /dev/null -w '%{http_code}\n' https://crm.ousadiamarketing.com.br/api/painel-entrar    # 405
curl -s -o /dev/null -w '%{http_code}\n' https://crm.ousadiamarketing.com.br/api/painel-clientes  # 401
```

Entrar: abra o endereço, deixe o **email vazio** e use a senha do operador.

### 10. Cron, backup e deploy automático

```bash
cp /opt/ousadia-crm/infra/cron.exemplo /etc/cron.d/ousadia-crm
nano /etc/cron.d/ousadia-crm   # colar o CRON_SECRET
chmod 600 /etc/cron.d/ousadia-crm
```

No GitHub: Settings > Secrets and variables > Actions > **Variables** > New
repository variable: `CRM_DEPLOY_ATIVO` = `true`. A partir daí todo merge que
mexe em `crm/` roda `.github/workflows/deploy-crm.yml`: testes, build, envio,
`npm ci`, reinício e conferência no ar. Se teste ou build falhar, nada é
enviado.

### Backup

`infra/backup.sh` roda às 3h (cron acima) e guarda 14 dias em
`/var/backups/crm`. Teste a restauração uma vez, num banco à parte:

```bash
sudo -u postgres createdb crm_teste
sudo -u postgres pg_restore -d crm_teste /var/backups/crm/crm-AAAA-MM-DD.dump
sudo -u postgres psql -d crm_teste -c 'select count(*) from crm_negocios'
sudo -u postgres dropdb crm_teste
```

O backup fica na mesma máquina: copie de tempos em tempos para fora (o
snapshot semanal da Hostinger também cobre).

---

## WhatsApp, depois

Tudo pronto e desligado. Quando houver número:

1. App na Meta (developers.facebook.com), tipo Business, produto WhatsApp.
2. Webhook: `https://crm.ousadiamarketing.com.br/api/webhook`, token de
   verificação = `WA_VERIFY_TOKEN` do `/etc/ousadia-crm.env`. Assinar `messages`
   **na conta de mensagens**, não na WABA (assinar a WABA responde 200 e não
   entrega nada).
3. `META_APP_SECRET` no ambiente.
4. Conectar o número (o token entra cifrado no banco e pode sair do arquivo):
   ```bash
   cd /opt/ousadia-crm
   OUSADIA_WABA_ID=... OUSADIA_PHONE_NUMBER_ID=... OUSADIA_TOKEN=... \
     node --env-file=/etc/ousadia-crm.env scripts/conectar-whatsapp.js ousadia
   ```
5. `ANTHROPIC_API_KEY` no ambiente, revisar a persona em **Contexto**, e tirar
   a pausa da IA na tela de Clientes. A IA nasce pausada de propósito.
6. `systemctl restart ousadia-crm`.

`DISPARO_ENVIO_REAL` nasce `0`: a campanha roda inteira e não envia. Só mude
para `1` quando quiser que saia de verdade. Fora da janela de 24 horas só sai
mensagem por modelo aprovado na Meta.

## Landing pages em domínio próprio

Em Landing Pages > Domínios, cadastre o domínio. A tela mostra o registro a
criar (tipo `A` para `IP_PUBLICO`). Quando o DNS apontar, o Caddy emite o
certificado sozinho na primeira visita; ele só emite para domínio cadastrado
(pergunta ao CRM em `127.0.0.1:3101/tls`).

## O que não fazer

- **Não desligar o RLS** nem criar política: só o `service_role` (servidor)
  lê e escreve. Política aberta expõe o banco.
- **Não aplicar migração depois do código que a lê.** Primeiro o banco, depois
  o deploy. Depois de migração nova, rode `banco/03-permissoes.sql` de novo.
- **Não perder a `CHAVE_CIFRA`.**
