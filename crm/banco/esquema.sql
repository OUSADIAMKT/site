-- esquema do CRM Ousadia
-- aplicar num Postgres novo e vazio, de uma vez (ver crm/README.md)
-- nao contem dado de cliente nenhum: so a estrutura

-- As funcoes vem em ordem alfabetica e algumas chamam outras: em SQL puro o
-- Postgres valida o corpo na criacao e reclamaria da que ainda nao existe.
-- Desligar a validacao de corpo e o que o proprio pg_dump faz; as dependencias
-- ficam todas resolvidas quando o arquivo termina.
set check_function_bodies = off;

-- 0. extensoes de que o esquema depende
-- (um projeto Supabase novo ja traz as duas; estas linhas so garantem)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- 1. sequencias
create sequence if not exists public.pesquisa_votos_id_seq;
create sequence if not exists public.report_acoes_id_seq;
create sequence if not exists public.report_coletas_id_seq;
create sequence if not exists public.uso_id_seq;

-- 2. tabelas
create table if not exists public.agendamentos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  profissional_id uuid not null,
  conversa_id uuid,
  paciente_nome text not null,
  telefone text not null,
  inicio timestamp with time zone not null,
  fim timestamp with time zone not null,
  situacao text default 'marcado'::text not null,
  observacao text,
  lembrete_enviado_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.agente_config (
  cliente_id uuid not null,
  persona text default ''::text not null,
  contexto text default ''::text not null,
  regras text default ''::text not null,
  saudacao text,
  modelo_padrao text default 'claude-haiku-4-5'::text not null,
  modelo_complexo text default 'claude-opus-5'::text not null,
  atualizado_em timestamp with time zone default now() not null,
  gatilho_comentario text,
  link_inicial text,
  comentario_dm boolean default true not null,
  link_reforco text
);

create table if not exists public.atendentes (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  email text not null,
  senha_hash text not null,
  disponivel boolean default false not null,
  ativo boolean default true not null,
  ultima_atribuicao timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  papel text default 'atendente'::text not null,
  auth_user_id uuid,
  assuntos text[] default '{}'::text[] not null,
  versao_sessao integer default 1 not null
);

create table if not exists public.atendimentos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  conversa_id uuid not null,
  atendente_id uuid,
  entrou_fila timestamp with time zone default now() not null,
  assumida_em timestamp with time zone,
  encerrada_em timestamp with time zone,
  desfecho text,
  motivo text,
  assumido_por text
);

create table if not exists public.bloqueios (
  id uuid default gen_random_uuid() not null,
  profissional_id uuid not null,
  inicio timestamp with time zone not null,
  fim timestamp with time zone not null,
  motivo text
);

create table if not exists public.canais (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  waba_id text,
  phone_number_id text,
  numero_e164 text,
  nome_exibicao text,
  token_cifrado text not null,
  app_secret_cifrado text,
  verify_token text,
  coexistencia boolean default false not null,
  tier text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  tipo text default 'whatsapp'::text not null,
  ig_user_id text,
  ig_base text,
  conta_mensagens_id text
);

create table if not exists public.clientes (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  slug text not null,
  plano text default 'essencial'::text not null,
  teto_conversas integer default 200 not null,
  ativo boolean default true not null,
  wa_phone_number_id text,
  wa_token text,
  wa_verify_token text,
  wa_app_secret text,
  criado_em timestamp with time zone default now() not null,
  fuso text default 'America/Belem'::text not null,
  ig_user_id text,
  ig_token text,
  acesso_url text,
  acesso_token text,
  ig_base text,
  ia_pausada boolean default false not null,
  modulos jsonb default '{}'::jsonb not null
);

create table if not exists public.contatos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  telefone_e164 text not null,
  nome text,
  email text,
  etiquetas text[] default '{}'::text[] not null,
  origem text default 'importado'::text not null,
  opt_out boolean default false not null,
  ultima_interacao_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  empresa text,
  documento text,
  campos jsonb default '{}'::jsonb not null,
  responsavel_id uuid,
  score integer,
  origem_id uuid,
  canal text,
  foto_url text
);

create table if not exists public.conversas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  telefone text,
  nome_contato text,
  modo text default 'ia'::text not null,
  score integer default 0 not null,
  etiquetas text[] default '{}'::text[] not null,
  origem jsonb,
  ultima_em timestamp with time zone default now() not null,
  criado_em timestamp with time zone default now() not null,
  atendente_id uuid,
  fila_desde timestamp with time zone,
  assumida_em timestamp with time zone,
  motivo_fila text,
  canal text default 'whatsapp'::text not null,
  contato text not null,
  janela_expira_em timestamp with time zone,
  assumido_por text
);

create table if not exists public.crm_automacao_execucoes (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  automacao_id uuid not null,
  chave text not null,
  alvo_id uuid,
  profundidade integer default 0 not null,
  resultado jsonb default '{}'::jsonb not null,
  erro text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_automacoes (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  gatilho text not null,
  condicoes jsonb default '{}'::jsonb not null,
  acoes jsonb default '[]'::jsonb not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_campos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  chave text not null,
  tipo text default 'texto'::text not null,
  obrigatorio boolean default false not null,
  ordem integer default 0 not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_etapas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  funil_id uuid not null,
  nome text not null,
  cor text default '#437EE5'::text not null,
  ordem integer default 0 not null,
  tipo text default 'aberta'::text not null,
  criado_em timestamp with time zone default now() not null,
  limite_dias integer
);

create table if not exists public.crm_etiquetas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  cor text default '#437EE5'::text not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_funis (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  ordem integer default 0 not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  entrada_automatica boolean default false not null
);

create table if not exists public.crm_historico (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  negocio_id uuid not null,
  tipo text not null,
  detalhe jsonb default '{}'::jsonb not null,
  quem text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_ia_config (
  cliente_id uuid not null,
  classificar boolean default false not null,
  pontuar boolean default false not null,
  resumir boolean default false not null,
  sugerir_acao boolean default false not null,
  sugerir_etapa boolean default false not null,
  mover_sozinha boolean default false not null,
  criar_negocio boolean default false not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_ia_sugestoes (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  negocio_id uuid,
  conversa_id uuid,
  tipo text not null,
  sugestao jsonb default '{}'::jsonb not null,
  aplicada boolean default false not null,
  aplicada_em timestamp with time zone,
  aplicada_por text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_motivos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  tipo text default 'perdido'::text not null,
  ativo boolean default true not null,
  ordem integer default 0 not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_negocio_produtos (
  id uuid default gen_random_uuid() not null,
  negocio_id uuid not null,
  produto_id uuid,
  nome text not null,
  quantidade numeric(12,2) default 1 not null,
  valor_unitario numeric(12,2) default 0 not null
);

create table if not exists public.crm_negocios (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  funil_id uuid not null,
  etapa_id uuid not null,
  contato_id uuid,
  conversa_id uuid,
  titulo text not null,
  telefone text,
  email text,
  valor numeric(12,2) default 0 not null,
  responsavel_id uuid,
  origem_id uuid,
  motivo_id uuid,
  motivo_texto text,
  situacao text default 'aberto'::text not null,
  etiquetas text[] default '{}'::text[] not null,
  campos jsonb default '{}'::jsonb not null,
  observacoes text,
  posicao double precision default 0 not null,
  etapa_desde timestamp with time zone default now() not null,
  fechado_em timestamp with time zone,
  criado_por text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  prioridade text default 'normal'::text not null,
  previsao_em timestamp with time zone,
  valor_fechado numeric(12,2),
  score integer
);

create table if not exists public.crm_notas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  negocio_id uuid,
  contato_id uuid,
  texto text not null,
  autor text,
  autor_id uuid,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_origens (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  ativo boolean default true not null,
  ordem integer default 0 not null,
  criado_em timestamp with time zone default now() not null,
  chave text
);

create table if not exists public.crm_produtos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  descricao text,
  valor numeric(12,2) default 0 not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_quadro_campos (
  cliente_id uuid not null,
  quem text not null,
  campos jsonb default '{}'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_regras_palavras (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  palavras text[] default '{}'::text[] not null,
  funil_id uuid not null,
  etapa_id uuid not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.crm_tarefas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  negocio_id uuid,
  contato_id uuid,
  titulo text not null,
  descricao text,
  tipo text default 'tarefa'::text not null,
  vence_em timestamp with time zone,
  concluida_em timestamp with time zone,
  concluida_por text,
  responsavel_id uuid,
  criado_por text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.disparo_envios (
  id uuid default gen_random_uuid() not null,
  disparo_id uuid not null,
  contato_id uuid,
  telefone text not null,
  estado text default 'pendente'::text not null,
  motivo text,
  wa_message_id text,
  enviado_em timestamp with time zone,
  reservado_em timestamp with time zone,
  tentativa_id uuid,
  tentativas integer default 0 not null,
  atualizado_em timestamp with time zone,
  erro_codigo text
);

create table if not exists public.disparo_tentativas (
  id uuid default gen_random_uuid() not null,
  envio_id uuid not null,
  disparo_id uuid not null,
  tentativa_id uuid not null,
  numero integer not null,
  reservada_em timestamp with time zone default now() not null,
  enviando_em timestamp with time zone,
  terminada_em timestamp with time zone,
  estado_final text,
  wa_message_id text,
  motivo text,
  erro_codigo text
);

create table if not exists public.disparos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  texto text not null,
  midia_id uuid,
  link_id uuid,
  template_nome text,
  template_idioma text default 'pt_BR'::text,
  publico jsonb default '{}'::jsonb not null,
  estado text default 'rascunho'::text not null,
  totais jsonb default '{}'::jsonb not null,
  criado_por text,
  criado_em timestamp with time zone default now() not null,
  iniciado_em timestamp with time zone,
  concluido_em timestamp with time zone,
  frente_id uuid
);

create table if not exists public.disponibilidade (
  id uuid default gen_random_uuid() not null,
  profissional_id uuid not null,
  dia_semana integer not null,
  hora_inicio time without time zone not null,
  hora_fim time without time zone not null,
  vigencia_inicio date,
  vigencia_fim date,
  estado text,
  cidade text
);

create table if not exists public.etiquetas_conhecidas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  etiqueta text not null,
  chave text not null,
  apelidos text[] default '{}'::text[] not null,
  familia text,
  origem text default 'ia'::text not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.frentes (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  assuntos text[] default '{}'::text[] not null,
  padrao boolean default false not null,
  responsavel_id uuid,
  ativa boolean default true not null,
  criada_em timestamp with time zone default now() not null,
  atualizada_em timestamp with time zone
);

create table if not exists public.ig_comentarios (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  comment_id text not null,
  ig_user_id text,
  conversa_id uuid,
  texto text,
  respondeu_publico boolean default false not null,
  respondeu_dm boolean default false not null,
  criado_em timestamp with time zone default now() not null,
  resposta_publica text
);

create table if not exists public.leituras_conversa (
  conversa_id uuid not null,
  quem text not null,
  lido_ate timestamp with time zone default now() not null,
  nao_lido boolean default false not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.links (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  chave text not null,
  url text not null,
  descricao text not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null,
  texto_fixo text,
  cliques integer default 0 not null,
  destino_rotulo text
);


create table if not exists public.mensagens (
  id uuid default gen_random_uuid() not null,
  conversa_id uuid not null,
  papel text not null,
  conteudo jsonb not null,
  wa_message_id text,
  criado_em timestamp with time zone default now() not null,
  direcao text,
  tipo text default 'texto'::text not null,
  midia_id text,
  midia_url text,
  status text,
  status_em timestamp with time zone,
  erro text,
  interna boolean default false not null,
  autor_atendente_id uuid,
  wa_message_ids text[]
);

create table if not exists public.midias (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  chave text not null,
  tipo text not null,
  descricao text not null,
  legenda text,
  wa_media_id text,
  url text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.pagina_dominios (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  pagina_id uuid not null,
  dominio text not null,
  estado text default 'pendente'::text not null,
  verificacao jsonb default '[]'::jsonb not null,
  conferido_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.pagina_eventos_dia (
  id uuid default gen_random_uuid() not null,
  pagina_id uuid not null,
  dia date not null,
  visitas integer default 0 not null,
  leads integer default 0 not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.pagina_versoes (
  id uuid default gen_random_uuid() not null,
  pagina_id uuid not null,
  numero integer not null,
  html text default ''::text not null,
  css text default ''::text not null,
  js text default ''::text not null,
  configuracoes jsonb default '{}'::jsonb not null,
  impressao text not null,
  rotulo text,
  aprovada_em timestamp with time zone,
  criada_por text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.paginas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  slug text not null,
  titulo text not null,
  configuracoes jsonb default '{}'::jsonb not null,
  rascunho_html text default ''::text not null,
  rascunho_css text default ''::text not null,
  rascunho_js text default ''::text not null,
  rascunho_em timestamp with time zone,
  versao_publicada_id uuid,
  publicado_html text,
  publicada_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  arquivada_em timestamp with time zone
);


create table if not exists public.pesquisa_campanhas (
  slug text not null,
  candidato text not null,
  instagram_url text,
  chave_hash text not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.pesquisa_votos (
  id bigint not null,
  campanha text not null,
  voto boolean not null,
  cliente_id text not null,
  ip_hash text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.profissionais (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  nome text not null,
  especialidade text,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.report_acoes (
  id bigint default nextval('report_acoes_id_seq'::regclass) not null,
  conta_id uuid,
  objeto_tipo text not null,
  objeto_id text not null,
  objeto_nome text,
  acao text not null,
  antes jsonb,
  depois jsonb,
  origem text not null,
  ok boolean default true not null,
  erro text,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.report_anuncios_diarios (
  conta_id uuid not null,
  data date not null,
  anuncio_id text not null,
  anuncio_nome text,
  conjunto_id text,
  conjunto_nome text,
  campanha_id text,
  campanha_nome text,
  objetivo text,
  gasto numeric(14,2),
  impressoes bigint,
  alcance bigint,
  cliques bigint,
  cliques_link bigint,
  conversoes bigint,
  leads bigint,
  conversas_iniciadas bigint,
  valor_conversoes numeric(14,2),
  miniatura_url text,
  extras jsonb default '{}'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.report_clientes (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  slug text not null,
  ativo boolean default true not null,
  crm_cliente_id uuid,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.report_coletas (
  id bigint default nextval('report_coletas_id_seq'::regclass) not null,
  conta_id uuid,
  iniciada_em timestamp with time zone default now() not null,
  terminada_em timestamp with time zone,
  status text default 'rodando'::text not null,
  linhas integer default 0 not null,
  erro text
);

create table if not exists public.report_conexoes (
  id uuid default gen_random_uuid() not null,
  provedor text default 'meta'::text not null,
  usuario_id text not null,
  usuario_nome text,
  token_cifrado text not null,
  escopos text[] default '{}'::text[] not null,
  expira_em timestamp with time zone,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.report_contas (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid,
  plataforma text not null,
  id_externo text not null,
  nome text,
  moeda text default 'BRL'::text not null,
  fuso text default 'America/Sao_Paulo'::text not null,
  ativo boolean default true not null,
  ultima_coleta_em timestamp with time zone,
  ultimo_erro text,
  criado_em timestamp with time zone default now() not null,
  bm_id text,
  bm_nome text,
  status_externo text,
  pagina_id text,
  descoberta_em timestamp with time zone
);

create table if not exists public.report_metricas_diarias (
  conta_id uuid not null,
  data date not null,
  gasto numeric(14,2),
  impressoes bigint,
  alcance bigint,
  cliques bigint,
  cliques_link bigint,
  conversoes bigint,
  leads bigint,
  conversas_iniciadas bigint,
  valor_conversoes numeric(14,2),
  seguidores bigint,
  seguidores_novos bigint,
  visitas_perfil bigint,
  interacoes bigint,
  cliques_site bigint,
  extras jsonb default '{}'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.report_metricas_periodo (
  conta_id uuid not null,
  inicio date not null,
  fim date not null,
  alcance bigint,
  frequencia numeric(8,2),
  extras jsonb default '{}'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.report_posts (
  id uuid default gen_random_uuid() not null,
  conta_id uuid not null,
  id_externo text not null,
  tipo text,
  legenda text,
  link text,
  miniatura_url text,
  publicado_em timestamp with time zone not null,
  alcance bigint,
  visualizacoes bigint,
  curtidas bigint,
  comentarios bigint,
  salvos bigint,
  compartilhamentos bigint,
  interacoes bigint,
  extras jsonb default '{}'::jsonb not null,
  atualizado_em timestamp with time zone default now() not null
);

create table if not exists public.report_relatorios (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  inicio date not null,
  fim date not null,
  comparar_inicio date,
  comparar_fim date,
  resumo text,
  dados jsonb default '{}'::jsonb not null,
  codigo text default encode(gen_random_bytes(12), 'hex'::text) not null,
  criado_em timestamp with time zone default now() not null
);

create table if not exists public.uso (
  id bigint default nextval('uso_id_seq'::regclass) not null,
  cliente_id uuid not null,
  conversa_id uuid,
  modelo text not null,
  tokens_entrada integer default 0 not null,
  tokens_cache_leitura integer default 0 not null,
  tokens_cache_escrita integer default 0 not null,
  tokens_saida integer default 0 not null,
  custo_usd numeric(12,6) default 0 not null,
  criado_em timestamp with time zone default now() not null
);

-- 3. chaves primarias
alter table public.agendamentos add constraint agendamentos_pkey PRIMARY KEY (id);
alter table public.agente_config add constraint agente_config_pkey PRIMARY KEY (cliente_id);
alter table public.atendentes add constraint atendentes_pkey PRIMARY KEY (id);
alter table public.atendimentos add constraint atendimentos_pkey PRIMARY KEY (id);
alter table public.bloqueios add constraint bloqueios_pkey PRIMARY KEY (id);
alter table public.canais add constraint canais_wa_pkey PRIMARY KEY (id);
alter table public.clientes add constraint clientes_pkey PRIMARY KEY (id);
alter table public.contatos add constraint contatos_pkey PRIMARY KEY (id);
alter table public.conversas add constraint conversas_pkey PRIMARY KEY (id);
alter table public.crm_automacao_execucoes add constraint crm_automacao_execucoes_pkey PRIMARY KEY (id);
alter table public.crm_automacoes add constraint crm_automacoes_pkey PRIMARY KEY (id);
alter table public.crm_campos add constraint crm_campos_pkey PRIMARY KEY (id);
alter table public.crm_etapas add constraint crm_etapas_pkey PRIMARY KEY (id);
alter table public.crm_etiquetas add constraint crm_etiquetas_pkey PRIMARY KEY (id);
alter table public.crm_funis add constraint crm_funis_pkey PRIMARY KEY (id);
alter table public.crm_historico add constraint crm_historico_pkey PRIMARY KEY (id);
alter table public.crm_ia_config add constraint crm_ia_config_pkey PRIMARY KEY (cliente_id);
alter table public.crm_ia_sugestoes add constraint crm_ia_sugestoes_pkey PRIMARY KEY (id);
alter table public.crm_motivos add constraint crm_motivos_pkey PRIMARY KEY (id);
alter table public.crm_negocio_produtos add constraint crm_negocio_produtos_pkey PRIMARY KEY (id);
alter table public.crm_negocios add constraint crm_negocios_pkey PRIMARY KEY (id);
alter table public.crm_notas add constraint crm_notas_pkey PRIMARY KEY (id);
alter table public.crm_origens add constraint crm_origens_pkey PRIMARY KEY (id);
alter table public.crm_produtos add constraint crm_produtos_pkey PRIMARY KEY (id);
alter table public.crm_quadro_campos add constraint crm_quadro_campos_pkey PRIMARY KEY (cliente_id, quem);
alter table public.crm_regras_palavras add constraint crm_regras_palavras_pkey PRIMARY KEY (id);
alter table public.crm_tarefas add constraint crm_tarefas_pkey PRIMARY KEY (id);
alter table public.disparo_envios add constraint disparo_envios_pkey PRIMARY KEY (id);
alter table public.disparo_tentativas add constraint disparo_tentativas_pkey PRIMARY KEY (id);
alter table public.disparos add constraint disparos_pkey PRIMARY KEY (id);
alter table public.disponibilidade add constraint disponibilidade_pkey PRIMARY KEY (id);
alter table public.etiquetas_conhecidas add constraint etiquetas_conhecidas_pkey PRIMARY KEY (id);
alter table public.frentes add constraint frentes_pkey PRIMARY KEY (id);
alter table public.ig_comentarios add constraint ig_comentarios_pkey PRIMARY KEY (id);
alter table public.leituras_conversa add constraint leituras_conversa_pkey PRIMARY KEY (conversa_id, quem);
alter table public.links add constraint links_pkey PRIMARY KEY (id);
alter table public.mensagens add constraint mensagens_pkey PRIMARY KEY (id);
alter table public.midias add constraint midias_pkey PRIMARY KEY (id);
alter table public.pagina_dominios add constraint pagina_dominios_pkey PRIMARY KEY (id);
alter table public.pagina_eventos_dia add constraint pagina_eventos_dia_pkey PRIMARY KEY (id);
alter table public.pagina_versoes add constraint pagina_versoes_pkey PRIMARY KEY (id);
alter table public.paginas add constraint paginas_pkey PRIMARY KEY (id);
alter table public.pesquisa_campanhas add constraint pesquisa_campanhas_pkey PRIMARY KEY (slug);
alter table public.pesquisa_votos add constraint pesquisa_votos_pkey PRIMARY KEY (id);
alter table public.profissionais add constraint profissionais_pkey PRIMARY KEY (id);
alter table public.report_acoes add constraint report_acoes_pkey PRIMARY KEY (id);
alter table public.report_anuncios_diarios add constraint report_anuncios_diarios_pkey PRIMARY KEY (conta_id, data, anuncio_id);
alter table public.report_clientes add constraint report_clientes_pkey PRIMARY KEY (id);
alter table public.report_coletas add constraint report_coletas_pkey PRIMARY KEY (id);
alter table public.report_conexoes add constraint report_conexoes_pkey PRIMARY KEY (id);
alter table public.report_contas add constraint report_contas_pkey PRIMARY KEY (id);
alter table public.report_metricas_diarias add constraint report_metricas_diarias_pkey PRIMARY KEY (conta_id, data);
alter table public.report_metricas_periodo add constraint report_metricas_periodo_pkey PRIMARY KEY (conta_id, inicio, fim);
alter table public.report_posts add constraint report_posts_pkey PRIMARY KEY (id);
alter table public.report_relatorios add constraint report_relatorios_pkey PRIMARY KEY (id);
alter table public.uso add constraint uso_pkey PRIMARY KEY (id);

-- 4. unicidade
alter table public.atendentes add constraint atendentes_email_key UNIQUE (email);
alter table public.atendentes add constraint atendentes_id_cliente_key UNIQUE (id, cliente_id);
alter table public.canais add constraint canais_wa_phone_number_id_key UNIQUE (phone_number_id);
alter table public.clientes add constraint clientes_slug_key UNIQUE (slug);
alter table public.clientes add constraint clientes_wa_phone_number_id_key UNIQUE (wa_phone_number_id);
alter table public.contatos add constraint contatos_cliente_id_telefone_e164_key UNIQUE (cliente_id, telefone_e164);
alter table public.contatos add constraint contatos_id_cliente UNIQUE (id, cliente_id);
alter table public.crm_automacao_execucoes add constraint crm_automacao_execucoes_automacao_id_chave_key UNIQUE (automacao_id, chave);
alter table public.crm_campos add constraint crm_campos_cliente_id_chave_key UNIQUE (cliente_id, chave);
alter table public.crm_etiquetas add constraint crm_etiquetas_cliente_id_nome_key UNIQUE (cliente_id, nome);
alter table public.crm_negocios add constraint crm_negocios_id_cliente UNIQUE (id, cliente_id);
alter table public.crm_origens add constraint crm_origens_cliente_id_nome_key UNIQUE (cliente_id, nome);
alter table public.disparo_envios add constraint disparo_envios_disparo_id_telefone_key UNIQUE (disparo_id, telefone);
alter table public.disparo_tentativas add constraint disparo_tentativas_envio_id_tentativa_id_key UNIQUE (envio_id, tentativa_id);
alter table public.etiquetas_conhecidas add constraint etiquetas_conhecidas_unica UNIQUE (cliente_id, chave);
alter table public.frentes add constraint frentes_id_cliente_id_key UNIQUE (id, cliente_id);
alter table public.ig_comentarios add constraint ig_comentarios_comment_id_key UNIQUE (comment_id);
alter table public.links add constraint links_cliente_id_chave_key UNIQUE (cliente_id, chave);
alter table public.midias add constraint midias_cliente_id_chave_key UNIQUE (cliente_id, chave);
alter table public.pagina_eventos_dia add constraint pagina_eventos_dia_pagina_id_dia_key UNIQUE (pagina_id, dia);
alter table public.pagina_versoes add constraint pagina_versoes_pagina_id_numero_key UNIQUE (pagina_id, numero);
alter table public.pesquisa_votos add constraint pesquisa_votos_campanha_cliente_id_key UNIQUE (campanha, cliente_id);
alter table public.profissionais add constraint profissionais_cliente_id_nome_key UNIQUE (cliente_id, nome);
alter table public.report_clientes add constraint report_clientes_slug_key UNIQUE (slug);
alter table public.report_conexoes add constraint report_conexoes_provedor_usuario_id_key UNIQUE (provedor, usuario_id);
alter table public.report_contas add constraint report_contas_plataforma_id_externo_key UNIQUE (plataforma, id_externo);
alter table public.report_posts add constraint report_posts_conta_id_id_externo_key UNIQUE (conta_id, id_externo);
alter table public.report_relatorios add constraint report_relatorios_codigo_key UNIQUE (codigo);

-- 5. checagens
alter table public.agendamentos add constraint agendamentos_situacao_check CHECK ((situacao = ANY (ARRAY['marcado'::text, 'confirmado'::text, 'em_atendimento'::text, 'atendido'::text, 'faltou'::text, 'cancelado'::text])));
alter table public.atendentes add constraint atendentes_papel_valido CHECK ((papel = ANY (ARRAY['gestor'::text, 'atendente'::text])));
alter table public.bloqueios add constraint bloqueios_check CHECK ((fim > inicio));
alter table public.canais add constraint canais_campos_do_tipo CHECK ((((tipo = 'whatsapp'::text) AND (phone_number_id IS NOT NULL) AND (waba_id IS NOT NULL) AND (numero_e164 IS NOT NULL) AND (verify_token IS NOT NULL)) OR ((tipo = 'instagram'::text) AND (ig_user_id IS NOT NULL))));
alter table public.canais add constraint canais_tipo_conhecido CHECK ((tipo = ANY (ARRAY['whatsapp'::text, 'instagram'::text])));
alter table public.contatos add constraint contatos_origem_check CHECK ((origem = ANY (ARRAY['importado'::text, 'conversa'::text, 'pedido'::text, 'crm'::text])));
alter table public.contatos add constraint contatos_score_check CHECK (((score IS NULL) OR ((score >= 0) AND (score <= 100))));
alter table public.conversas add constraint conversas_canal_valido CHECK ((canal = ANY (ARRAY['whatsapp'::text, 'instagram'::text])));
alter table public.crm_automacoes add constraint crm_automacoes_acoes_lista CHECK ((jsonb_typeof(acoes) = 'array'::text));
alter table public.crm_automacoes add constraint crm_automacoes_gatilho_check CHECK ((gatilho = ANY (ARRAY['contato_novo'::text, 'negocio_novo'::text, 'etapa_mudou'::text, 'etiqueta_mudou'::text, 'responsavel_mudou'::text, 'sem_interacao'::text, 'tarefa_vencida'::text, 'venda_ganha'::text, 'venda_perdida'::text, 'score_atingido'::text])));
alter table public.crm_automacoes add constraint crm_automacoes_nome_nao_vazio CHECK ((length(btrim(nome)) > 0));
alter table public.crm_campos add constraint crm_campos_tipo_check CHECK ((tipo = ANY (ARRAY['texto'::text, 'inteiro'::text, 'decimal'::text, 'booleano'::text, 'data'::text, 'datahora'::text])));
alter table public.crm_etapas add constraint crm_etapas_limite_check CHECK (((limite_dias IS NULL) OR (limite_dias > 0)));
alter table public.crm_etapas add constraint crm_etapas_tipo_check CHECK ((tipo = ANY (ARRAY['aberta'::text, 'ganho'::text, 'perdido'::text])));
alter table public.crm_ia_sugestoes add constraint crm_ia_sugestoes_tipo_check CHECK ((tipo = ANY (ARRAY['classificacao'::text, 'score'::text, 'resumo'::text, 'proxima_acao'::text, 'etapa'::text, 'interesse'::text, 'negocio'::text])));
alter table public.crm_motivos add constraint crm_motivos_tipo_check CHECK ((tipo = ANY (ARRAY['ganho'::text, 'perdido'::text])));
alter table public.crm_negocios add constraint crm_negocios_prioridade_check CHECK ((prioridade = ANY (ARRAY['baixa'::text, 'normal'::text, 'alta'::text, 'urgente'::text])));
alter table public.crm_negocios add constraint crm_negocios_score_check CHECK (((score IS NULL) OR ((score >= 0) AND (score <= 100))));
alter table public.crm_negocios add constraint crm_negocios_situacao_check CHECK ((situacao = ANY (ARRAY['aberto'::text, 'ganho'::text, 'perdido'::text])));
alter table public.crm_notas add constraint crm_notas_tem_alvo CHECK (((negocio_id IS NOT NULL) OR (contato_id IS NOT NULL)));
alter table public.crm_notas add constraint crm_notas_texto_nao_vazio CHECK ((length(btrim(texto)) > 0));
alter table public.crm_quadro_campos add constraint crm_quadro_campos_objeto CHECK ((jsonb_typeof(campos) = 'object'::text));
alter table public.crm_tarefas add constraint crm_tarefas_tem_alvo CHECK (((negocio_id IS NOT NULL) OR (contato_id IS NOT NULL)));
alter table public.crm_tarefas add constraint crm_tarefas_tipo_check CHECK ((tipo = ANY (ARRAY['tarefa'::text, 'ligacao'::text, 'mensagem'::text, 'reuniao'::text, 'proposta'::text, 'visita'::text])));
alter table public.crm_tarefas add constraint crm_tarefas_titulo_nao_vazio CHECK ((length(btrim(titulo)) > 0));
alter table public.disparo_envios add constraint disparo_envios_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'reservado'::text, 'enviando'::text, 'enviado'::text, 'falhou'::text, 'pulado'::text, 'desconhecido'::text])));
alter table public.disparos add constraint disparos_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'testando'::text, 'enviando'::text, 'concluido'::text, 'parado'::text])));
alter table public.disponibilidade add constraint disponibilidade_check CHECK ((hora_fim > hora_inicio));
alter table public.disponibilidade add constraint disponibilidade_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6)));
alter table public.etiquetas_conhecidas add constraint etiquetas_conhecidas_origem CHECK ((origem = ANY (ARRAY['lista'::text, 'ia'::text])));
alter table public.frentes add constraint frentes_nome_nao_vazio CHECK ((length(btrim(nome)) > 0));
alter table public.midias add constraint midia_tem_origem CHECK (((wa_media_id IS NOT NULL) OR (url IS NOT NULL)));
alter table public.pagina_dominios add constraint pagina_dominios_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'ativo'::text, 'erro'::text])));
alter table public.pagina_dominios add constraint pagina_dominios_formato CHECK ((dominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'::text));
alter table public.pagina_eventos_dia add constraint pagina_eventos_dia_nao_negativo CHECK (((visitas >= 0) AND (leads >= 0)));
alter table public.paginas add constraint paginas_publicacao_completa CHECK ((((versao_publicada_id IS NULL) AND (publicado_html IS NULL) AND (publicada_em IS NULL)) OR ((versao_publicada_id IS NOT NULL) AND (publicado_html IS NOT NULL) AND (publicada_em IS NOT NULL))));
alter table public.paginas add constraint paginas_slug_formato CHECK ((slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'::text));
alter table public.report_contas add constraint report_plataforma_valida CHECK ((plataforma = ANY (ARRAY['meta_ads'::text, 'instagram'::text, 'facebook'::text, 'google_ads'::text])));

-- 6. chaves estrangeiras
alter table public.agendamentos add constraint agendamentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.agendamentos add constraint agendamentos_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE SET NULL;
alter table public.agendamentos add constraint agendamentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE;
alter table public.agente_config add constraint agente_config_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.atendentes add constraint atendentes_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.atendentes add constraint atendentes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.atendimentos add constraint atendimentos_atendente_id_fkey FOREIGN KEY (atendente_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.atendimentos add constraint atendimentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.atendimentos add constraint atendimentos_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE;
alter table public.bloqueios add constraint bloqueios_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE;
alter table public.canais add constraint canais_wa_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.contatos add constraint contatos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.contatos add constraint contatos_origem_id_fkey FOREIGN KEY (origem_id) REFERENCES crm_origens(id) ON DELETE SET NULL;
alter table public.contatos add constraint contatos_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.conversas add constraint conversas_atendente_id_fkey FOREIGN KEY (atendente_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.conversas add constraint conversas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_automacao_execucoes add constraint crm_automacao_execucoes_automacao_id_fkey FOREIGN KEY (automacao_id) REFERENCES crm_automacoes(id) ON DELETE CASCADE;
alter table public.crm_automacao_execucoes add constraint crm_automacao_execucoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_automacoes add constraint crm_automacoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_campos add constraint crm_campos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_etapas add constraint crm_etapas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_etapas add constraint crm_etapas_funil_id_fkey FOREIGN KEY (funil_id) REFERENCES crm_funis(id) ON DELETE CASCADE;
alter table public.crm_etiquetas add constraint crm_etiquetas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_funis add constraint crm_funis_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_historico add constraint crm_historico_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_historico add constraint crm_historico_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES crm_negocios(id) ON DELETE CASCADE;
alter table public.crm_ia_config add constraint crm_ia_config_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_ia_sugestoes add constraint crm_ia_sugestoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_ia_sugestoes add constraint crm_ia_sugestoes_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE SET NULL;
alter table public.crm_ia_sugestoes add constraint crm_ia_sugestoes_negocio_mesma_empresa FOREIGN KEY (negocio_id, cliente_id) REFERENCES crm_negocios(id, cliente_id) ON DELETE CASCADE;
alter table public.crm_motivos add constraint crm_motivos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_negocio_produtos add constraint crm_negocio_produtos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES crm_negocios(id) ON DELETE CASCADE;
alter table public.crm_negocio_produtos add constraint crm_negocio_produtos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES crm_produtos(id) ON DELETE SET NULL;
alter table public.crm_negocios add constraint crm_negocios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_negocios add constraint crm_negocios_contato_id_fkey FOREIGN KEY (contato_id) REFERENCES contatos(id) ON DELETE SET NULL;
alter table public.crm_negocios add constraint crm_negocios_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE SET NULL;
alter table public.crm_negocios add constraint crm_negocios_etapa_id_fkey FOREIGN KEY (etapa_id) REFERENCES crm_etapas(id) ON DELETE RESTRICT;
alter table public.crm_negocios add constraint crm_negocios_funil_id_fkey FOREIGN KEY (funil_id) REFERENCES crm_funis(id) ON DELETE CASCADE;
alter table public.crm_negocios add constraint crm_negocios_motivo_id_fkey FOREIGN KEY (motivo_id) REFERENCES crm_motivos(id) ON DELETE SET NULL;
alter table public.crm_negocios add constraint crm_negocios_origem_id_fkey FOREIGN KEY (origem_id) REFERENCES crm_origens(id) ON DELETE SET NULL;
alter table public.crm_negocios add constraint crm_negocios_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.crm_notas add constraint crm_notas_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.crm_notas add constraint crm_notas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_notas add constraint crm_notas_contato_mesma_empresa FOREIGN KEY (contato_id, cliente_id) REFERENCES contatos(id, cliente_id) ON DELETE CASCADE;
alter table public.crm_notas add constraint crm_notas_negocio_mesma_empresa FOREIGN KEY (negocio_id, cliente_id) REFERENCES crm_negocios(id, cliente_id) ON DELETE CASCADE;
alter table public.crm_origens add constraint crm_origens_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_produtos add constraint crm_produtos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_quadro_campos add constraint crm_quadro_campos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_regras_palavras add constraint crm_regras_palavras_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_regras_palavras add constraint crm_regras_palavras_etapa_id_fkey FOREIGN KEY (etapa_id) REFERENCES crm_etapas(id) ON DELETE CASCADE;
alter table public.crm_regras_palavras add constraint crm_regras_palavras_funil_id_fkey FOREIGN KEY (funil_id) REFERENCES crm_funis(id) ON DELETE CASCADE;
alter table public.crm_tarefas add constraint crm_tarefas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.crm_tarefas add constraint crm_tarefas_contato_mesma_empresa FOREIGN KEY (contato_id, cliente_id) REFERENCES contatos(id, cliente_id) ON DELETE CASCADE;
alter table public.crm_tarefas add constraint crm_tarefas_negocio_mesma_empresa FOREIGN KEY (negocio_id, cliente_id) REFERENCES crm_negocios(id, cliente_id) ON DELETE CASCADE;
alter table public.crm_tarefas add constraint crm_tarefas_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.disparo_envios add constraint disparo_envios_contato_id_fkey FOREIGN KEY (contato_id) REFERENCES contatos(id) ON DELETE SET NULL;
alter table public.disparo_envios add constraint disparo_envios_disparo_id_fkey FOREIGN KEY (disparo_id) REFERENCES disparos(id) ON DELETE CASCADE;
alter table public.disparo_tentativas add constraint disparo_tentativas_disparo_id_fkey FOREIGN KEY (disparo_id) REFERENCES disparos(id) ON DELETE CASCADE;
alter table public.disparo_tentativas add constraint disparo_tentativas_envio_id_fkey FOREIGN KEY (envio_id) REFERENCES disparo_envios(id) ON DELETE CASCADE;
alter table public.disparos add constraint disparos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.disparos add constraint disparos_frente_mesma_empresa FOREIGN KEY (frente_id, cliente_id) REFERENCES frentes(id, cliente_id);
alter table public.disparos add constraint disparos_link_id_fkey FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE SET NULL;
alter table public.disparos add constraint disparos_midia_id_fkey FOREIGN KEY (midia_id) REFERENCES midias(id) ON DELETE SET NULL;
alter table public.disponibilidade add constraint disponibilidade_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE;
alter table public.etiquetas_conhecidas add constraint etiquetas_conhecidas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.frentes add constraint frentes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.frentes add constraint frentes_responsavel_mesma_empresa FOREIGN KEY (responsavel_id, cliente_id) REFERENCES atendentes(id, cliente_id);
alter table public.ig_comentarios add constraint ig_comentarios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.ig_comentarios add constraint ig_comentarios_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE SET NULL;
alter table public.leituras_conversa add constraint leituras_conversa_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE;
alter table public.links add constraint links_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.mensagens add constraint mensagens_autor_atendente_id_fkey FOREIGN KEY (autor_atendente_id) REFERENCES atendentes(id) ON DELETE SET NULL;
alter table public.mensagens add constraint mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE;
alter table public.midias add constraint midias_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.pagina_dominios add constraint pagina_dominios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.pagina_dominios add constraint pagina_dominios_pagina_id_fkey FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE CASCADE;
alter table public.pagina_eventos_dia add constraint pagina_eventos_dia_pagina_id_fkey FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE CASCADE;
alter table public.pagina_versoes add constraint pagina_versoes_pagina_id_fkey FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE CASCADE;
alter table public.paginas add constraint paginas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.paginas add constraint paginas_versao_publicada_fk FOREIGN KEY (versao_publicada_id) REFERENCES pagina_versoes(id) ON DELETE RESTRICT;
alter table public.pesquisa_votos add constraint pesquisa_votos_campanha_fkey FOREIGN KEY (campanha) REFERENCES pesquisa_campanhas(slug) ON DELETE CASCADE;
alter table public.profissionais add constraint profissionais_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.report_acoes add constraint report_acoes_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE SET NULL;
alter table public.report_anuncios_diarios add constraint report_anuncios_diarios_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE CASCADE;
alter table public.report_clientes add constraint report_clientes_crm_cliente_id_fkey FOREIGN KEY (crm_cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
alter table public.report_coletas add constraint report_coletas_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE CASCADE;
alter table public.report_contas add constraint report_contas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES report_clientes(id) ON DELETE CASCADE;
alter table public.report_metricas_diarias add constraint report_metricas_diarias_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE CASCADE;
alter table public.report_metricas_periodo add constraint report_metricas_periodo_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE CASCADE;
alter table public.report_posts add constraint report_posts_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES report_contas(id) ON DELETE CASCADE;
alter table public.report_relatorios add constraint report_relatorios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES report_clientes(id) ON DELETE CASCADE;
alter table public.uso add constraint uso_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.uso add constraint uso_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE SET NULL;

-- 7. indices
CREATE UNIQUE INDEX agendamento_horario_unico ON public.agendamentos USING btree (profissional_id, inicio) WHERE (situacao <> 'cancelado'::text);
CREATE INDEX IF NOT EXISTS agendamentos_dia ON public.agendamentos USING btree (cliente_id, inicio);
CREATE INDEX IF NOT EXISTS agendamentos_lembrete ON public.agendamentos USING btree (inicio) WHERE ((situacao = 'marcado'::text) AND (lembrete_enviado_em IS NULL));
CREATE UNIQUE INDEX atendentes_auth_user ON public.atendentes USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS atendentes_cliente ON public.atendentes USING btree (cliente_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS atendimentos_aberto ON public.atendimentos USING btree (conversa_id) WHERE (encerrada_em IS NULL);
CREATE INDEX IF NOT EXISTS atendimentos_atendente ON public.atendimentos USING btree (atendente_id, encerrada_em);
CREATE INDEX IF NOT EXISTS atendimentos_cliente ON public.atendimentos USING btree (cliente_id, entrou_fila);
CREATE INDEX IF NOT EXISTS bloqueios_prof ON public.bloqueios USING btree (profissional_id, inicio);
CREATE INDEX IF NOT EXISTS canais_cliente ON public.canais USING btree (cliente_id) WHERE ativo;
CREATE UNIQUE INDEX canais_ig ON public.canais USING btree (ig_user_id) WHERE (ig_user_id IS NOT NULL);
CREATE UNIQUE INDEX clientes_ig_user_id ON public.clientes USING btree (ig_user_id) WHERE (ig_user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS contatos_cliente_idx ON public.contatos USING btree (cliente_id, opt_out);
CREATE INDEX IF NOT EXISTS contatos_documento ON public.contatos USING btree (cliente_id, documento);
CREATE INDEX IF NOT EXISTS contatos_empresa ON public.contatos USING btree (cliente_id, empresa);
CREATE INDEX IF NOT EXISTS contatos_etiquetas_idx ON public.contatos USING gin (etiquetas);
CREATE INDEX IF NOT EXISTS contatos_responsavel ON public.contatos USING btree (cliente_id, responsavel_id);
CREATE INDEX IF NOT EXISTS conversas_cliente_canal ON public.conversas USING btree (cliente_id, canal);
CREATE UNIQUE INDEX conversas_cliente_canal_contato ON public.conversas USING btree (cliente_id, canal, contato);
CREATE INDEX IF NOT EXISTS conversas_do_atendente ON public.conversas USING btree (atendente_id) WHERE (modo = 'humano'::text);
CREATE INDEX IF NOT EXISTS conversas_fila ON public.conversas USING btree (cliente_id, fila_desde) WHERE (modo = 'fila'::text);
CREATE INDEX IF NOT EXISTS conversas_janela ON public.conversas USING btree (janela_expira_em) WHERE (janela_expira_em IS NOT NULL);
CREATE INDEX IF NOT EXISTS crm_automacoes_gatilho ON public.crm_automacoes USING btree (cliente_id, gatilho) WHERE ativo;
CREATE INDEX IF NOT EXISTS crm_etapas_funil ON public.crm_etapas USING btree (funil_id, ordem);
CREATE INDEX IF NOT EXISTS crm_execucoes_cliente ON public.crm_automacao_execucoes USING btree (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_funis_cliente ON public.crm_funis USING btree (cliente_id, ordem);
CREATE INDEX IF NOT EXISTS crm_historico_cliente ON public.crm_historico USING btree (cliente_id, tipo, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_historico_negocio ON public.crm_historico USING btree (negocio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_ia_sugestoes_negocio ON public.crm_ia_sugestoes USING btree (negocio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_ia_sugestoes_pendentes ON public.crm_ia_sugestoes USING btree (cliente_id, tipo, criado_em DESC) WHERE (NOT aplicada);
CREATE INDEX IF NOT EXISTS crm_motivos_cliente ON public.crm_motivos USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS crm_negocio_produtos_negocio ON public.crm_negocio_produtos USING btree (negocio_id);
CREATE INDEX IF NOT EXISTS crm_negocios_contato ON public.crm_negocios USING btree (contato_id);
CREATE INDEX IF NOT EXISTS crm_negocios_conversa ON public.crm_negocios USING btree (conversa_id);
CREATE UNIQUE INDEX crm_negocios_conversa_automatica ON public.crm_negocios USING btree (cliente_id, conversa_id) WHERE ((conversa_id IS NOT NULL) AND (criado_por = ANY (ARRAY['entrada automática'::text, 'conversas trazidas'::text])));
CREATE INDEX IF NOT EXISTS crm_negocios_criado ON public.crm_negocios USING btree (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_negocios_parado ON public.crm_negocios USING btree (cliente_id, etapa_desde) WHERE (situacao = 'aberto'::text);
CREATE INDEX IF NOT EXISTS crm_negocios_previsao ON public.crm_negocios USING btree (cliente_id, previsao_em) WHERE (situacao = 'aberto'::text);
CREATE INDEX IF NOT EXISTS crm_negocios_quadro ON public.crm_negocios USING btree (cliente_id, funil_id, etapa_id, posicao);
CREATE INDEX IF NOT EXISTS crm_notas_contato ON public.crm_notas USING btree (contato_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS crm_notas_negocio ON public.crm_notas USING btree (negocio_id, criado_em DESC);
CREATE UNIQUE INDEX crm_origens_cliente_chave ON public.crm_origens USING btree (cliente_id, chave) WHERE (chave IS NOT NULL);
CREATE INDEX IF NOT EXISTS crm_produtos_cliente ON public.crm_produtos USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS crm_regras_cliente ON public.crm_regras_palavras USING btree (cliente_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS crm_tarefas_agenda ON public.crm_tarefas USING btree (cliente_id, responsavel_id, vence_em) WHERE (concluida_em IS NULL);
CREATE INDEX IF NOT EXISTS crm_tarefas_contato ON public.crm_tarefas USING btree (contato_id, vence_em);
CREATE INDEX IF NOT EXISTS crm_tarefas_negocio ON public.crm_tarefas USING btree (negocio_id, vence_em);
CREATE INDEX IF NOT EXISTS disparo_envios_fila_idx ON public.disparo_envios USING btree (disparo_id, estado);
CREATE INDEX IF NOT EXISTS disparo_envios_relogio_idx ON public.disparo_envios USING btree (estado, reservado_em) WHERE (estado = ANY (ARRAY['reservado'::text, 'enviando'::text]));
CREATE INDEX IF NOT EXISTS disparo_envios_wa_id_idx ON public.disparo_envios USING btree (wa_message_id) WHERE (wa_message_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS disparo_tentativas_disparo_idx ON public.disparo_tentativas USING btree (disparo_id, reservada_em DESC);
CREATE INDEX IF NOT EXISTS disparos_cliente_idx ON public.disparos USING btree (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS disparos_frente_idx ON public.disparos USING btree (frente_id) WHERE (frente_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS disponibilidade_prof ON public.disponibilidade USING btree (profissional_id, dia_semana);
CREATE INDEX IF NOT EXISTS etiquetas_conhecidas_cliente ON public.etiquetas_conhecidas USING btree (cliente_id, etiqueta);
CREATE INDEX IF NOT EXISTS frentes_cliente_idx ON public.frentes USING btree (cliente_id, ativa);
CREATE UNIQUE INDEX frentes_nome_idx ON public.frentes USING btree (cliente_id, lower(btrim(nome))) WHERE ativa;
CREATE UNIQUE INDEX frentes_padrao_idx ON public.frentes USING btree (cliente_id) WHERE (ativa AND padrao);
CREATE INDEX IF NOT EXISTS ig_comentarios_cliente ON public.ig_comentarios USING btree (cliente_id, criado_em);
CREATE INDEX IF NOT EXISTS ig_comentarios_respostas ON public.ig_comentarios USING btree (cliente_id, criado_em DESC) WHERE (resposta_publica IS NOT NULL);
CREATE INDEX IF NOT EXISTS leituras_conversa_quem ON public.leituras_conversa USING btree (quem);
CREATE INDEX IF NOT EXISTS links_cliente_ativo ON public.links USING btree (cliente_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS mensagens_conversa ON public.mensagens USING btree (conversa_id, criado_em);
CREATE UNIQUE INDEX mensagens_id_externo ON public.mensagens USING btree (wa_message_id) WHERE (wa_message_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS mensagens_wa_id ON public.mensagens USING btree (wa_message_id) WHERE (wa_message_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS mensagens_wa_ids ON public.mensagens USING gin (wa_message_ids) WHERE (wa_message_ids IS NOT NULL);
CREATE INDEX IF NOT EXISTS midias_cliente_ativo ON public.midias USING btree (cliente_id) WHERE ativo;
CREATE UNIQUE INDEX pagina_dominios_dominio ON public.pagina_dominios USING btree (dominio);
CREATE INDEX IF NOT EXISTS pagina_dominios_pagina ON public.pagina_dominios USING btree (pagina_id);
CREATE INDEX IF NOT EXISTS pagina_eventos_dia_pagina ON public.pagina_eventos_dia USING btree (pagina_id, dia DESC);
CREATE INDEX IF NOT EXISTS pagina_versoes_pagina ON public.pagina_versoes USING btree (pagina_id, numero DESC);
CREATE INDEX IF NOT EXISTS paginas_cliente ON public.paginas USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS paginas_cliente_ativas ON public.paginas USING btree (cliente_id) WHERE (arquivada_em IS NULL);
CREATE UNIQUE INDEX paginas_slug ON public.paginas USING btree (slug);
CREATE INDEX IF NOT EXISTS pesquisa_votos_ip_idx ON public.pesquisa_votos USING btree (campanha, ip_hash, criado_em);
CREATE INDEX IF NOT EXISTS report_acoes_conta ON public.report_acoes USING btree (conta_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS report_acoes_objeto ON public.report_acoes USING btree (objeto_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS report_anuncios_campanha ON public.report_anuncios_diarios USING btree (conta_id, campanha_id, data);
CREATE INDEX IF NOT EXISTS report_coletas_conta ON public.report_coletas USING btree (conta_id, iniciada_em DESC);
CREATE INDEX IF NOT EXISTS report_contas_cliente ON public.report_contas USING btree (cliente_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS report_contas_sem_cliente ON public.report_contas USING btree (plataforma) WHERE (cliente_id IS NULL);
CREATE INDEX IF NOT EXISTS report_metricas_data ON public.report_metricas_diarias USING btree (data);
CREATE INDEX IF NOT EXISTS report_posts_conta_data ON public.report_posts USING btree (conta_id, publicado_em DESC);
CREATE INDEX IF NOT EXISTS report_relatorios_cliente ON public.report_relatorios USING btree (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS uso_cliente_data ON public.uso USING btree (cliente_id, criado_em);

-- 8. funcoes
CREATE OR REPLACE FUNCTION public.atendente_ocioso(p_cliente uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select a.id
  from atendentes a
  left join conversas c
    on c.atendente_id = a.id and c.modo = 'humano'
  where a.cliente_id = p_cliente
    and a.ativo
    and a.disponivel
  group by a.id, a.ultima_atribuicao
  order by count(c.id) asc, a.ultima_atribuicao asc nulls first
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.atendente_ocioso_assunto(p_cliente uuid, p_assunto text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select a.id
  from atendentes a
  left join conversas c
    on c.atendente_id = a.id and c.modo = 'humano'
  where a.cliente_id = p_cliente
    and a.ativo
    and a.disponivel
  group by a.id, a.ultima_atribuicao, a.assuntos
  order by
    case
      when p_assunto is null                      then 1
      when p_assunto = any (a.assuntos)           then 0
      when cardinality(a.assuntos) = 0            then 1
      else 2
    end asc,
    count(c.id) asc,
    a.ultima_atribuicao asc nulls first
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.carimbar_envio_status(p_wa_message_id text, p_status text, p_em timestamp with time zone DEFAULT now(), p_erro text DEFAULT NULL::text, p_erro_codigo text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  quantas int;
begin
  if p_wa_message_id is null then return 0; end if;
  with alvo as (
    update disparo_envios
       set estado = case
             when p_status = 'failed'      then 'falhou'
             when estado = 'desconhecido'  then 'enviado'
             when estado = 'enviando'      then 'enviado'
             else estado
           end,
           motivo = case when p_status = 'failed' then coalesce(p_erro, motivo) else motivo end,
           erro_codigo = case when p_status = 'failed' then coalesce(p_erro_codigo, erro_codigo) else erro_codigo end,
           enviado_em = coalesce(enviado_em, p_em),
           atualizado_em = now()
     where wa_message_id = p_wa_message_id
       and estado in ('enviado','desconhecido','enviando')
    returning 1
  )
  select count(*)::int into quantas from alvo;
  return quantas;
end $function$
;

CREATE OR REPLACE FUNCTION public.carimbar_status(p_wa_message_id text, p_status text, p_em timestamp with time zone, p_erro text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE sql
AS $function$
  with alvo as (
    update mensagens
       set status    = p_status,
           status_em = p_em,
           erro      = coalesce(p_erro, erro)
     where (wa_message_id = p_wa_message_id
            or p_wa_message_id = any(wa_message_ids))
       and peso_status(p_status) > peso_status(coalesce(status, ''))
    returning 1
  )
  select coalesce(count(*)::int, 0) from alvo;
$function$
;

CREATE OR REPLACE FUNCTION public.cliente_do_usuario()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cliente_id from atendentes
  where auth_user_id = auth.uid() and ativo
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.concluir_envio(p_envio uuid, p_tentativa uuid, p_estado text, p_wa_message_id text DEFAULT NULL::text, p_motivo text DEFAULT NULL::text, p_erro_codigo text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  achou int;
begin
  if p_estado not in ('enviado','falhou','desconhecido') then
    raise exception 'estado final invalido: %', p_estado using errcode = 'check_violation';
  end if;
  update disparo_envios
     set estado        = p_estado,
         wa_message_id = coalesce(p_wa_message_id, wa_message_id),
         enviado_em    = case when p_estado = 'enviado' then coalesce(enviado_em, now()) else enviado_em end,
         motivo        = p_motivo,
         erro_codigo   = p_erro_codigo,
         atualizado_em = now()
   where id = p_envio
     and tentativa_id = p_tentativa
     and (estado = 'enviando'
          or (estado = 'desconhecido' and p_estado = 'enviado' and p_wa_message_id is not null));
  get diagnostics achou = row_count;
  if achou = 1 then
    update disparo_tentativas
       set terminada_em = now(), estado_final = p_estado,
           wa_message_id = coalesce(p_wa_message_id, wa_message_id),
           motivo = p_motivo, erro_codigo = p_erro_codigo
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $function$
;

CREATE OR REPLACE FUNCTION public.disparo_envio_guarda()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if not disparo_envio_transicao_ok(old.estado, new.estado) then
    raise exception
      'transicao de envio invalida: % -> % (envio %)', old.estado, new.estado, old.id
      using errcode = 'check_violation';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.disparo_envio_transicao_ok(de text, para text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when de = para then true
    when de = 'pendente'     and para in ('reservado','pulado')                     then true
    when de = 'reservado'    and para in ('enviando','pendente','pulado','falhou')  then true
    when de = 'enviando'     and para in ('enviado','falhou','desconhecido')        then true
    when de = 'desconhecido' and para in ('enviado','falhou')                       then true
    when de = 'enviado'      and para in ('falhou')                                 then true
    when de = 'pulado'       and para in ('pendente')                               then true
    when de = 'falhou'       and para in ('pendente')                               then true
    else false
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.encerrar_reserva(p_envio uuid, p_tentativa uuid, p_estado text, p_motivo text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  achou int;
begin
  if p_estado not in ('pulado','falhou','pendente') then
    raise exception 'estado invalido para encerrar reserva: %', p_estado using errcode = 'check_violation';
  end if;
  update disparo_envios
     set estado        = p_estado,
         motivo        = p_motivo,
         tentativa_id  = case when p_estado = 'pendente' then null else tentativa_id end,
         reservado_em  = case when p_estado = 'pendente' then null else reservado_em end,
         atualizado_em = now()
   where id = p_envio and tentativa_id = p_tentativa and estado = 'reservado';
  get diagnostics achou = row_count;
  if achou = 1 then
    update disparo_tentativas
       set terminada_em = now(), estado_final = p_estado, motivo = p_motivo
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $function$
;

CREATE OR REPLACE FUNCTION public.etiqueta_chave(texto text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select nullif(
    trim(regexp_replace(
      lower(translate(
        coalesce(texto, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      )),
      '[^a-z0-9]+', ' ', 'g'
    )),
    ''
  );
$function$
;

CREATE OR REPLACE FUNCTION public.expirar_enviando(p_disparo uuid DEFAULT NULL::uuid, p_validade interval DEFAULT '00:05:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  quantas int;
  recado  text := 'sem resposta da Meta dentro do prazo; pode ter sido entregue';
begin
  update disparo_tentativas t
     set terminada_em = now(), estado_final = 'desconhecido', motivo = recado
   where t.terminada_em is null
     and t.enviando_em is not null
     and t.enviando_em < now() - p_validade
     and (p_disparo is null or t.disparo_id = p_disparo);
  with venceram as (
    update disparo_envios
       set estado        = 'desconhecido',
           motivo        = recado,
           atualizado_em = now()
     where estado = 'enviando'
       and atualizado_em < now() - p_validade
       and (p_disparo is null or disparo_id = p_disparo)
    returning id
  )
  select count(*)::int into quantas from venceram;
  return quantas;
end $function$
;

CREATE OR REPLACE FUNCTION public.frente_assunto_sem_conflito()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  outra text;
begin
  perform pg_advisory_xact_lock(1033, hashtext(new.cliente_id::text));

  if not new.ativa or coalesce(array_length(new.assuntos, 1), 0) = 0 then
    return new;
  end if;

  select f.nome into outra
    from frentes f
   where f.cliente_id = new.cliente_id
     and f.id <> new.id
     and f.ativa
     and f.assuntos && new.assuntos
   limit 1;

  if outra is not null then
    raise exception
      'o assunto ja pertence a frente "%" nesta empresa', outra
      using errcode = 'unique_violation';
  end if;

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.frente_carimbar()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.atualizada_em := now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.horarios_livres(p_profissional uuid, p_dias integer DEFAULT 7, p_antecedencia_min integer DEFAULT 60)
 RETURNS TABLE(inicio timestamp with time zone, cidade text, estado text)
 LANGUAGE sql
 STABLE
AS $function$
  with prof as (
    select p.id, c.fuso from profissionais p
    join clientes c on c.id = p.cliente_id
    where p.id = p_profissional and p.ativo
  ),
  dias as (
    select ((now() at time zone (select fuso from prof))::date + i) as dia
    from generate_series(0, greatest(p_dias, 0)) as i
  ),
  slots as (
    select generate_series(
        ((d.dia + disp.hora_inicio) at time zone pr.fuso),
        ((d.dia + disp.hora_fim)    at time zone pr.fuso) - interval '30 minutes',
        interval '30 minutes') as inicio,
      disp.cidade, disp.estado
    from dias d
    cross join prof pr
    join disponibilidade disp
      on disp.profissional_id = pr.id
     and disp.dia_semana = extract(dow from d.dia)
     and (disp.vigencia_inicio is null or d.dia >= disp.vigencia_inicio)
     and (disp.vigencia_fim    is null or d.dia <= disp.vigencia_fim)
  )
  select s.inicio, s.cidade, s.estado
  from slots s
  where s.inicio > now() + make_interval(mins => greatest(p_antecedencia_min, 0))
    and not exists (select 1 from bloqueios b
      where b.profissional_id = p_profissional
        and s.inicio >= b.inicio and s.inicio < b.fim)
    and not exists (select 1 from agendamentos a
      where a.profissional_id = p_profissional
        and a.inicio = s.inicio and a.situacao <> 'cancelado')
  order by s.inicio;
$function$
;

CREATE OR REPLACE FUNCTION public.incrementar_versao_sessao_atendente()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.senha_hash is distinct from old.senha_hash
     or new.papel is distinct from old.papel
     or new.cliente_id is distinct from old.cliente_id
     or (old.ativo and not new.ativo) then
    new.versao_sessao := old.versao_sessao + 1;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.marcar_enviando(p_envio uuid, p_tentativa uuid, p_validade interval DEFAULT '00:10:00'::interval)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  achou int;
begin
  update disparo_envios
     set estado = 'enviando', atualizado_em = now()
   where id = p_envio
     and tentativa_id = p_tentativa
     and estado = 'reservado'
     and reservado_em > now() - p_validade;
  get diagnostics achou = row_count;
  if achou = 1 then
    update disparo_tentativas set enviando_em = now()
     where envio_id = p_envio and tentativa_id = p_tentativa;
  end if;
  return achou = 1;
end $function$
;

CREATE OR REPLACE FUNCTION public.nao_lidas_das_conversas(ids uuid[], p_quem text)
 RETURNS TABLE(conversa_id uuid, nao_lidas integer, marcada boolean, lido_ate timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id,
         count(m.id)::int,
         coalesce(l.nao_lido, false),
         l.lido_ate
  from unnest(ids) as c(id)
  left join leituras_conversa l on l.conversa_id = c.id and l.quem = p_quem
  left join mensagens m
         on m.conversa_id = c.id
        and m.direcao = 'entrada'
        and (l.lido_ate is null or m.criado_em > l.lido_ate)
  group by c.id, l.nao_lido, l.lido_ate
$function$
;

CREATE OR REPLACE FUNCTION public.pagina_versao_numero()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.numero is null or new.numero = 0 then
    select coalesce(max(numero), 0) + 1 into new.numero
    from public.pagina_versoes where pagina_id = new.pagina_id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.peso_status(s text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case s
    when 'falhou'    then 5  -- falha e definitiva: nunca e sobrescrita
    when 'lida'      then 4
    when 'entregue'  then 3
    when 'enviada'   then 2
    when 'pendente'  then 1
    else 0
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.pesquisa_publico(p_campanha text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select json_build_object('candidato', candidato, 'instagram_url', instagram_url)
  from pesquisa_campanhas where slug = p_campanha;
$function$
;

CREATE OR REPLACE FUNCTION public.pesquisa_resultado(p_campanha text, p_chave text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  c pesquisa_campanhas;
begin
  select * into c from pesquisa_campanhas where slug = p_campanha;
  if c is null or c.chave_hash <> encode(digest(coalesce(p_chave, ''), 'sha256'), 'hex') then
    return json_build_object('ok', false);
  end if;
  return json_build_object(
    'ok', true,
    'instagram_url', c.instagram_url,
    'sim', (select count(*) from pesquisa_votos where campanha = p_campanha and voto),
    'nao', (select count(*) from pesquisa_votos where campanha = p_campanha and not voto),
    'por_dia', coalesce((
      select json_agg(d order by d.dia desc) from (
        select (criado_em at time zone 'America/Belem')::date as dia,
               count(*) filter (where voto) as sim,
               count(*) filter (where not voto) as nao
        from pesquisa_votos where campanha = p_campanha group by 1
      ) d), '[]'::json)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pesquisa_salvar_video(p_campanha text, p_chave text, p_url text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  update pesquisa_campanhas set instagram_url = nullif(trim(p_url), '')
  where slug = p_campanha and chave_hash = encode(digest(coalesce(p_chave, ''), 'sha256'), 'hex');
  return json_build_object('ok', found);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pesquisa_votar(p_campanha text, p_voto boolean, p_cliente text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_ip text;
  v_ip_hash text;
  v_recentes int;
begin
  if p_cliente is null or length(p_cliente) < 16 or length(p_cliente) > 64 then
    return json_build_object('ok', false, 'erro', 'cliente');
  end if;
  if not exists (select 1 from pesquisa_campanhas where slug = p_campanha) then
    return json_build_object('ok', false, 'erro', 'campanha');
  end if;
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
  if v_ip <> '' then
    v_ip_hash := encode(digest(v_ip || ':' || p_campanha, 'sha256'), 'hex');
    select count(*) into v_recentes from pesquisa_votos
      where campanha = p_campanha and ip_hash = v_ip_hash and criado_em > now() - interval '1 hour';
    if v_recentes >= 30 then
      return json_build_object('ok', false, 'erro', 'limite');
    end if;
  end if;
  insert into pesquisa_votos (campanha, voto, cliente_id, ip_hash)
  values (p_campanha, p_voto, p_cliente, v_ip_hash)
  on conflict (campanha, cliente_id) do nothing;
  return json_build_object('ok', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.previa_das_conversas(ids uuid[])
 RETURNS TABLE(conversa_id uuid, papel text, conteudo jsonb, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct on (m.conversa_id) m.conversa_id, m.papel, m.conteudo, m.criado_em
  from mensagens m
  where m.conversa_id = any(ids)
  order by m.conversa_id, m.criado_em desc
$function$
;

CREATE OR REPLACE FUNCTION public.recuperar_reservas(p_disparo uuid DEFAULT NULL::uuid, p_validade interval DEFAULT '00:10:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  quantas int;
begin
  update disparo_tentativas t
     set terminada_em = now(), estado_final = 'recuperada',
         motivo = 'reserva recuperada por prazo vencido'
   where t.terminada_em is null
     and t.enviando_em is null
     and t.reservada_em < now() - p_validade
     and (p_disparo is null or t.disparo_id = p_disparo);
  with voltaram as (
    update disparo_envios
       set estado        = 'pendente',
           tentativa_id  = null,
           reservado_em  = null,
           motivo        = 'reserva recuperada por prazo vencido',
           atualizado_em = now()
     where estado = 'reservado'
       and reservado_em < now() - p_validade
       and (p_disparo is null or disparo_id = p_disparo)
    returning id
  )
  select count(*)::int into quantas from voltaram;
  return quantas;
end $function$
;

CREATE OR REPLACE FUNCTION public.report_resumo_periodo(p_cliente uuid, p_inicio date, p_fim date)
 RETURNS TABLE(plataforma text, gasto numeric, impressoes bigint, cliques bigint, cliques_link bigint, conversoes bigint, leads bigint, conversas_iniciadas bigint, valor_conversoes numeric, seguidores_novos bigint, seguidores_fim bigint, visitas_perfil bigint, interacoes bigint, ctr numeric, cpc numeric, cpm numeric, custo_por_conversao numeric, custo_por_lead numeric, custo_por_conversa numeric, roas numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with base as (
    select
      c.plataforma,
      sum(m.gasto)                       as gasto,
      sum(m.impressoes)::bigint          as impressoes,
      sum(m.cliques)::bigint             as cliques,
      sum(m.cliques_link)::bigint        as cliques_link,
      sum(m.conversoes)::bigint          as conversoes,
      sum(m.leads)::bigint               as leads,
      sum(m.conversas_iniciadas)::bigint as conversas_iniciadas,
      sum(m.valor_conversoes)            as valor_conversoes,
      sum(m.seguidores_novos)::bigint    as seguidores_novos,
      sum(m.visitas_perfil)::bigint      as visitas_perfil,
      sum(m.interacoes)::bigint          as interacoes
    from report_contas c
    join report_metricas_diarias m on m.conta_id = c.id
    where c.cliente_id = p_cliente
      and m.data between p_inicio and p_fim
    group by c.plataforma
  ),
  seguidores as (
    select c.plataforma, sum(ult.seguidores)::bigint as seguidores_fim
    from report_contas c
    cross join lateral (
      select m.seguidores from report_metricas_diarias m
      where m.conta_id = c.id and m.data between p_inicio and p_fim and m.seguidores is not null
      order by m.data desc limit 1
    ) ult
    where c.cliente_id = p_cliente
    group by c.plataforma
  )
  select
    b.plataforma,
    b.gasto, b.impressoes, b.cliques, b.cliques_link, b.conversoes, b.leads,
    b.conversas_iniciadas, b.valor_conversoes, b.seguidores_novos,
    s.seguidores_fim, b.visitas_perfil, b.interacoes,
    round(100.0 * b.cliques / nullif(b.impressoes, 0), 2)  as ctr,
    round(b.gasto / nullif(b.cliques, 0), 2)               as cpc,
    round(1000.0 * b.gasto / nullif(b.impressoes, 0), 2)   as cpm,
    round(b.gasto / nullif(b.conversoes, 0), 2)            as custo_por_conversao,
    round(b.gasto / nullif(b.leads, 0), 2)                 as custo_por_lead,
    round(b.gasto / nullif(b.conversas_iniciadas, 0), 2)   as custo_por_conversa,
    round(b.valor_conversoes / nullif(b.gasto, 0), 2)      as roas
  from base b
  left join seguidores s on s.plataforma = b.plataforma;
$function$
;

CREATE OR REPLACE FUNCTION public.reservar_envios(p_disparo uuid, p_lote integer)
 RETURNS SETOF disparo_envios
 LANGUAGE plpgsql
AS $function$
declare
  linha disparo_envios;
begin
  for linha in
    update disparo_envios e
       set estado        = 'reservado',
           tentativa_id  = gen_random_uuid(),
           reservado_em  = now(),
           tentativas    = e.tentativas + 1,
           atualizado_em = now(),
           motivo        = null
     where e.id in (
       select id from disparo_envios
        where disparo_id = p_disparo
          and estado = 'pendente'
        order by id
        limit greatest(p_lote, 0)
        for update skip locked
     )
    returning e.*
  loop
    insert into disparo_tentativas
      (envio_id, disparo_id, tentativa_id, numero, reservada_em)
    values
      (linha.id, linha.disparo_id, linha.tentativa_id, linha.tentativas, linha.reservado_em);
    return next linha;
  end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.revogar_sessoes_cliente_desativado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.atendentes
     set versao_sessao = versao_sessao + 1
   where cliente_id = new.id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sem_resposta_das_conversas(ids uuid[])
 RETURNS TABLE(conversa_id uuid, sem_resposta integer, desde timestamp with time zone, respondida_em timestamp with time zone, respondida_por text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with resposta as (
    select distinct on (m.conversa_id)
           m.conversa_id, m.criado_em, m.autor_atendente_id
    from mensagens m
    where m.conversa_id = any(ids)
      and m.direcao = 'saida'
      and coalesce(m.interna, false) = false
    order by m.conversa_id, m.criado_em desc
  )
  select c.id,
         count(m.id)::int,
         min(m.criado_em),
         r.criado_em,
         case
           when r.criado_em is null then null
           when r.autor_atendente_id is not null then 'atendente'
           else 'ia'
         end
  from unnest(ids) as c(id)
  left join resposta r on r.conversa_id = c.id
  left join mensagens m
         on m.conversa_id = c.id
        and m.direcao = 'entrada'
        and (r.criado_em is null or m.criado_em > r.criado_em)
  group by c.id, r.criado_em, r.autor_atendente_id
$function$
;

CREATE OR REPLACE FUNCTION public.somar_clique(p_link uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update links set cliques = cliques + 1 where id = p_link;
$function$
;

CREATE OR REPLACE FUNCTION public.somar_evento_pagina(p_pagina uuid, p_tipo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_tipo not in ('visita', 'lead') then
    raise exception 'tipo de evento desconhecido: %', p_tipo;
  end if;

  insert into public.pagina_eventos_dia (pagina_id, dia, visitas, leads)
  values (
    p_pagina,
    (now() at time zone 'America/Sao_Paulo')::date,
    case when p_tipo = 'visita' then 1 else 0 end,
    case when p_tipo = 'lead' then 1 else 0 end
  )
  on conflict (pagina_id, dia) do update set
    visitas = public.pagina_eventos_dia.visitas + excluded.visitas,
    leads   = public.pagina_eventos_dia.leads   + excluded.leads;
end;
$function$
;

-- 9. gatilhos
CREATE TRIGGER incrementar_versao_sessao BEFORE UPDATE ON public.atendentes FOR EACH ROW EXECUTE FUNCTION incrementar_versao_sessao_atendente();
CREATE TRIGGER revogar_sessoes_cliente_desativado AFTER UPDATE OF ativo ON public.clientes FOR EACH ROW WHEN ((old.ativo AND (NOT new.ativo))) EXECUTE FUNCTION revogar_sessoes_cliente_desativado();
CREATE TRIGGER disparo_envio_guarda_trg BEFORE UPDATE OF estado ON public.disparo_envios FOR EACH ROW EXECUTE FUNCTION disparo_envio_guarda();
CREATE TRIGGER frente_assunto_trg BEFORE INSERT OR UPDATE OF assuntos, ativa, cliente_id ON public.frentes FOR EACH ROW EXECUTE FUNCTION frente_assunto_sem_conflito();
CREATE TRIGGER frente_carimbar_trg BEFORE UPDATE ON public.frentes FOR EACH ROW EXECUTE FUNCTION frente_carimbar();
CREATE TRIGGER pagina_versao_numero BEFORE INSERT ON public.pagina_versoes FOR EACH ROW EXECUTE FUNCTION pagina_versao_numero();

-- 10. seguranca por linha
alter table public.agendamentos enable row level security;
alter table public.agente_config enable row level security;
alter table public.atendentes enable row level security;
alter table public.atendimentos enable row level security;
alter table public.bloqueios enable row level security;
alter table public.canais enable row level security;
alter table public.clientes enable row level security;
alter table public.contatos enable row level security;
alter table public.conversas enable row level security;
alter table public.crm_automacao_execucoes enable row level security;
alter table public.crm_automacoes enable row level security;
alter table public.crm_campos enable row level security;
alter table public.crm_etapas enable row level security;
alter table public.crm_etiquetas enable row level security;
alter table public.crm_funis enable row level security;
alter table public.crm_historico enable row level security;
alter table public.crm_ia_config enable row level security;
alter table public.crm_ia_sugestoes enable row level security;
alter table public.crm_motivos enable row level security;
alter table public.crm_negocio_produtos enable row level security;
alter table public.crm_negocios enable row level security;
alter table public.crm_notas enable row level security;
alter table public.crm_origens enable row level security;
alter table public.crm_produtos enable row level security;
alter table public.crm_quadro_campos enable row level security;
alter table public.crm_regras_palavras enable row level security;
alter table public.crm_tarefas enable row level security;
alter table public.disparo_envios enable row level security;
alter table public.disparo_tentativas enable row level security;
alter table public.disparos enable row level security;
alter table public.disponibilidade enable row level security;
alter table public.etiquetas_conhecidas enable row level security;
alter table public.frentes enable row level security;
alter table public.ig_comentarios enable row level security;
alter table public.leituras_conversa enable row level security;
alter table public.links enable row level security;
alter table public.mensagens enable row level security;
alter table public.midias enable row level security;
alter table public.pagina_dominios enable row level security;
alter table public.pagina_eventos_dia enable row level security;
alter table public.pagina_versoes enable row level security;
alter table public.paginas enable row level security;
alter table public.pesquisa_campanhas enable row level security;
alter table public.pesquisa_votos enable row level security;
alter table public.profissionais enable row level security;
alter table public.report_acoes enable row level security;
alter table public.report_anuncios_diarios enable row level security;
alter table public.report_clientes enable row level security;
alter table public.report_coletas enable row level security;
alter table public.report_conexoes enable row level security;
alter table public.report_contas enable row level security;
alter table public.report_metricas_diarias enable row level security;
alter table public.report_metricas_periodo enable row level security;
alter table public.report_posts enable row level security;
alter table public.report_relatorios enable row level security;
alter table public.uso enable row level security;

-- 11. politicas
-- nenhuma politica criada: o acesso e so pela chave de servico

-- 12. extensoes presentes na producao (o Supabase ja traz estas)
-- http
-- pg_stat_statements
-- pgcrypto
-- supabase_vault
-- uuid-ossp
