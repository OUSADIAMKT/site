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
- **Dono do produto.** Em Comercial > Configurações > Produtos, cada produto
  tem dono (Jackson, Juh, Thascila...), funil e a lista de formulários do site
  que o vendem. Lead que chega por um deles nasce com o produto e o dono, e o
  dono ganha uma tarefa "Primeiro contato", vencendo em 2 horas. Formulário da
  agência vai para o funil Agência. Quem atende abre o funil em "Minhas".
- **Vendas da HeroSpark.** `POST /api/vendas?fonte=herospark&chave=...`.
  Aprovada: o negócio da pessoa vai para ganho com o valor pago (ou nasce
  ganho) e ganha a etiqueta "aluno". Reembolso: vai para perdido. Pendente
  (boleto/Pix): tarefa "Recuperar pagamento" para o dono. Ver "HeroSpark".
- **Comunidade (Creators da Amazônia).** `POST /api/comunidade`: membro novo
  vira contato com a etiqueta "comunidade"; empresa cadastrada vira lead no
  funil Agência; certificado de curso grátis vira lead quente (+20 de score).
  Ver "Comunidade".
- **WhatsApp e Instagram.** Ainda sem número: tudo pronto e desligado. Ver
  "WhatsApp, depois" abaixo.
- **Importação.** Em Contatos > Importar, CSV ou colado.

## O relógio do CRM (fila de tarefas)

O próprio servidor dá uma volta por minuto na tabela `tarefas_sistema`
(`api/_fila_tarefas.js`), sem cron, Redis ou n8n:

| O quê | Quando |
|---|---|
| automações "Contato novo", "Ficou sem interação" e "Tarefa venceu" | a cada 5 min |
| conversa esquecida na mão de alguém volta para a IA | a cada 15 min |
| coleta dos anúncios da Meta | 1x por dia, a partir das 9h |
| processar venda da HeroSpark e evento da comunidade | assim que chegam, com novas tentativas |

O follow-up é uma automação: "Ficou sem interação há N dias" → "Criar tarefa"
para o responsável. Mensagem automática no WhatsApp continua desligada de
propósito (janela de 24h e modelo aprovado da Meta).

## Receita por campanha

Marketing > Receita (gestão e operador). Junta o gasto da Meta, os leads do
CRM e as vendas pagas da HeroSpark (sem reembolsos) no período: investimento,
leads, custo por lead, vendas, conversão, receita e ROAS por campanha. Cada
negócio conta para o anúncio de clique para WhatsApp de onde veio, ou para a
`utm_campaign` do formulário (que casa com o id ou o nome da campanha na
Meta), ou para a origem dele no CRM. Para a atribuição funcionar, use
`utm_campaign={{campaign.id}}` nos links dos anúncios.

## Respostas rápidas

Digite `/` na conversa: aparecem as respostas da equipe e as suas. `{nome}`
vira o primeiro nome da pessoa. O botão de raio abre a lista para criar e
editar. Só a gestão cria respostas da equipe; cada um cria as próprias.

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

Cada versão mora em `/opt/ousadia-crm/releases/<versao>` e
`/opt/ousadia-crm/atual` é um atalho para a que está no ar (é o que o serviço e
o cron usam). `infra/publicar.sh` instala, troca o atalho, reinicia e, se a
versão nova não responder em 30 segundos, volta sozinho para a anterior.

```bash
cd crm && npm ci && npm run build
V=inicial
rsync -rltz --exclude node_modules/ --exclude test/ --rsync-path="mkdir -p /opt/ousadia-crm/releases && rsync" \
  ./ deploy@189.24.18.136:/opt/ousadia-crm/releases/$V/
ssh deploy@189.24.18.136 "cd /opt/ousadia-crm/releases/$V && npm ci --omit=dev && ln -sfn /opt/ousadia-crm/releases/$V /opt/ousadia-crm/atual"
```

(Na primeira vez o serviço ainda não existe, por isso o atalho é criado à mão.
Do segundo deploy em diante quem faz tudo é o `publicar.sh`.)

Voltar para a versão anterior, a qualquer momento:

```bash
sudo -u deploy sh /opt/ousadia-crm/atual/infra/voltar.sh
```

### 5. Ambiente e segredos

```bash
cd /opt/ousadia-crm/atual
node scripts/gerar-ambiente.js /etc/ousadia-crm.env
chown root:crm /etc/ousadia-crm.env && chmod 640 /etc/ousadia-crm.env
```

Ele imprime o **segredo do PostgREST**, a **senha do operador** e o
**endereço do webhook da HeroSpark**. Depois:

- abra `/etc/ousadia-crm.env` e preencha `IP_PUBLICO=189.24.18.136`;
- guarde a senha do operador no gerenciador de senhas;
- **copie o arquivo inteiro para fora da máquina** (por causa da `CHAVE_CIFRA`).

### 6. Banco

```bash
sudo -u postgres createdb crm
for f in 00-base 01-esquema 02-ousadia 03-permissoes 04-semente-ousadia; do
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d crm -f /opt/ousadia-crm/atual/banco/$f.sql || break
done
sudo -u postgres psql -c "alter role authenticator password 'UMA_SENHA_FORTE_NOVA'"
```

Os cinco arquivos foram testados em Postgres 16 limpo (`test/banco-vps.test.js`
roda o mesmo no PGlite). O banco nasce com 59 tabelas, RLS em todas, e só a
Ousadia como empresa: funis Alunos e Agência, origens, motivos, produtos
(valor zero, preencher na tela), etiquetas e frentes. Nenhuma pessoa.

### 7. PostgREST

```bash
install -d -o postgrest -m 750 /etc/postgrest
cp /opt/ousadia-crm/atual/infra/postgrest.conf.exemplo /etc/postgrest/crm.conf
chown postgrest /etc/postgrest/crm.conf && chmod 600 /etc/postgrest/crm.conf
nano /etc/postgrest/crm.conf   # trocar a senha do authenticator e o jwt-secret
cp /opt/ousadia-crm/atual/infra/postgrest.service /etc/systemd/system/
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
cp /opt/ousadia-crm/atual/infra/ousadia-crm.service /etc/systemd/system/
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

### 10. Backup, monitoramento e deploy automático

**Backup cifrado fora da VPS.** O backup é cifrado com `age` para uma chave
pública; a chave privada fica **só no seu computador** (e num cofre), nunca
na VPS. Quem invadir a máquina não lê o backup.

1. No seu computador (Windows: `winget install FiloSottile.age`):
   ```bash
   age-keygen -o ousadia-crm-backup.key
   ```
   Guarde `ousadia-crm-backup.key` no gerenciador de senhas. A linha
   `# public key: age1...` é a pública.
2. Na VPS:
   ```bash
   apt install -y age
   install -d -m 700 /etc/ousadia-crm
   echo 'age1...a-chave-publica...' > /etc/ousadia-crm/backup.pub
   ```
3. No Cloudflare: crie um bucket R2 (`ousadia-crm`), uma chave de API com
   acesso a ele, e preencha `R2_*` em `/etc/ousadia-crm.env`. Em Settings >
   Object lifecycle rules, apague `backups/` depois de 30 dias.
4. O cron:
   ```bash
   cp /opt/ousadia-crm/atual/infra/cron.exemplo /etc/cron.d/ousadia-crm
   sh /opt/ousadia-crm/atual/infra/backup.sh   # primeiro backup, na mão
   ```

Ele roda às 3h, guarda 7 dias em `/var/backups/crm` e manda a cópia cifrada
para o R2. Teste a restauração uma vez (no seu computador, com a chave
privada):

```bash
age -d -i ousadia-crm-backup.key crm-AAAA-MM-DD.dump.age > crm.dump
pg_restore -d um_banco_de_teste crm.dump
```

**Monitoramento externo.** Em UptimeRobot (grátis), um monitor HTTP para
`https://crm.ousadiamarketing.com.br/api/saude`, a cada 5 minutos, com alerta
por e-mail. Ele responde 503 se o banco ou a fila de tarefas pararem.

**Deploy automático.** No GitHub: Settings > Secrets and variables > Actions >
**Variables** > New repository variable: `CRM_DEPLOY_ATIVO` = `true`. A partir
daí todo merge que mexe em `crm/` roda `.github/workflows/deploy-crm.yml`:
testes, build, envio para uma pasta nova em `releases/` e `publicar.sh`. Se
teste ou build falhar, nada é enviado; se a versão nova não subir, a anterior
volta sozinha.

### 11. A equipe e os produtos

No painel, como operador: **Atendentes** → cadastre Jackson, Juh e Thascila com
papel **gestor** (cada um entra com o próprio e-mail e senha). Depois,
**Comercial > Configurações > Produtos**: preço, dono e formulários de cada
produto.

---

## HeroSpark

1. HeroSpark > Configurações > Webhooks > novo webhook, com o endereço que o
   `gerar-ambiente.js` imprimiu:
   `https://crm.ousadiamarketing.com.br/api/vendas?fonte=herospark&chave=<VENDAS_CHAVE>`
   e os eventos de venda (aprovada, reembolso/estorno, boleto/Pix gerado).
2. Em cada produto do CRM, preencha "Ids do produto na HeroSpark" (ou deixe o
   nome igual ao da HeroSpark).
3. Faça uma venda de teste. O evento chega inteiro em `vendas_eventos`. Se
   ficar como `ignorado` (formato que a leitura não conhecia), mande o
   conteúdo do campo `bruto` para ajustar `api/_vendas.js` e rode:
   ```bash
   cd /opt/ousadia-crm/atual
   node --env-file=/etc/ousadia-crm.env scripts/reprocessar-vendas.js --confirmar
   ```

## Comunidade

No Supabase da comunidade (Creators da Amazônia): Database > Webhooks > Create
a new hook, três vezes, todos com:

- Tipo: HTTP Request, método POST
- URL: `https://crm.ousadiamarketing.com.br/api/comunidade`
- Cabeçalho HTTP: `x-ousadia-chave` = o `COMUNIDADE_CHAVE` de `/etc/ousadia-crm.env`

| Tabela | Eventos |
|---|---|
| `users` | Insert, Update |
| `company_profiles` | Insert |
| `certificates` | Insert |

Nada muda no código da comunidade.

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
