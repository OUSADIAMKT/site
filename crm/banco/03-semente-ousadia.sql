-- 03 · a Ousadia, para o painel não abrir vazio
--
-- Rodar uma vez, depois do 02-permissoes.sql. Pode rodar de novo: o que já
-- existe não é duplicado nem sobrescrito (quem mudou um nome na tela não
-- perde a mudança).
--
-- Só configuração: nenhuma pessoa, nenhum contato, nenhuma conversa. O que
-- está aqui é o ponto de partida e tudo se edita depois em
-- Comercial > Configurações.
--
-- Os valores dos produtos nascem em zero de propósito: preço é decisão da
-- Ousadia e não pode sair de um palpite.

-- ---------------------------------------------------------------------------
-- 1. A empresa

insert into public.clientes (nome, slug, plano, teto_conversas, fuso, ativo, modulos)
values ('Ousadia Marketing', 'ousadia', 'escola', 2000, 'America/Sao_Paulo', true, '{}'::jsonb)
on conflict (slug) do nothing;

-- A IA nasce configurada, mas DESLIGADA da conversa (ia_pausada): sem número
-- de WhatsApp e sem chave da Anthropic não há o que responder, e ligar é
-- decisão de quem escreveu a persona.
update public.clientes set ia_pausada = true
where slug = 'ousadia' and not exists (
  select 1 from public.agente_config a where a.cliente_id = clientes.id
);

insert into public.agente_config (cliente_id, persona, contexto, regras, saudacao)
select c.id,
  'Você é a Bia, do atendimento da Ousadia Marketing, uma escola de marketing digital. '
  || 'Simpática, direta, trata as pessoas por você e escreve como gente, em mensagens curtas.',
  'A Ousadia Marketing ensina marketing digital na prática: escola, mentorias, aulões e a comunidade. '
  || 'Também é agência: faz gestão de redes, tráfego e conteúdo para empresas. '
  || 'Site: https://ousadiamarketing.com.br. Comunidade: https://comunidade.ousadiamarketing.com.br.',
  'Nunca invente preço, data de turma, bônus ou condição de pagamento: se não estiver no contexto, '
  || 'diga que vai confirmar e passe para a equipe. Não prometa resultado financeiro. '
  || 'Quem já é aluno e tem problema de acesso vai para a equipe de suporte.',
  'Oi! Aqui é a Bia, da Ousadia. Me conta: você quer aprender marketing ou está procurando alguém para cuidar do marketing da sua empresa?'
from public.clientes c
where c.slug = 'ousadia'
on conflict (cliente_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Os funis
--
-- "Alunos" recebe sozinho toda conversa nova (entrada automática) e é onde o
-- lead da escola é aquecido até a matrícula. "Agência" é o funil de quem quer
-- contratar o serviço, que tem outro ritmo: reunião e proposta.

insert into public.crm_funis (cliente_id, nome, ordem, ativo, entrada_automatica)
select c.id, v.nome, v.ordem, true, v.entrada
from public.clientes c
cross join (values ('Alunos', 0, true), ('Agência', 1, false)) as v(nome, ordem, entrada)
where c.slug = 'ousadia'
  and not exists (select 1 from public.crm_funis f where f.cliente_id = c.id and f.nome = v.nome);

insert into public.crm_etapas (cliente_id, funil_id, nome, cor, ordem, tipo, limite_dias)
select f.cliente_id, f.id, v.nome, v.cor, v.ordem, v.tipo, v.limite
from public.crm_funis f
join public.clientes c on c.id = f.cliente_id and c.slug = 'ousadia'
join (values
  ('Alunos',  'Novo lead',          '#18A5C9', 0, 'aberta',  2),
  ('Alunos',  'Aquecendo',          '#7C3AED', 1, 'aberta',  14),
  ('Alunos',  'Diagnóstico',        '#FFC61A', 2, 'aberta',  3),
  ('Alunos',  'Conversa comercial', '#F59E5B', 3, 'aberta',  3),
  ('Alunos',  'Matriculado',        '#23B26F', 4, 'ganho',   null),
  ('Alunos',  'Perdido',            '#B42318', 5, 'perdido', null),
  ('Agência', 'Novo contato',       '#18A5C9', 0, 'aberta',  2),
  ('Agência', 'Reunião marcada',    '#7C3AED', 1, 'aberta',  7),
  ('Agência', 'Proposta enviada',   '#FFC61A', 2, 'aberta',  5),
  ('Agência', 'Fechado',            '#23B26F', 3, 'ganho',   null),
  ('Agência', 'Perdido',            '#B42318', 4, 'perdido', null)
) as v(funil, nome, cor, ordem, tipo, limite) on v.funil = f.nome
where not exists (
  select 1 from public.crm_etapas e where e.funil_id = f.id and e.nome = v.nome
);

-- ---------------------------------------------------------------------------
-- 3. De onde a pessoa veio
--
-- As chaves `anuncio`, `instagram`, `equipe` e `direto` são as que o próprio
-- WhatsApp sinaliza (ver sql/043). As outras casam com as etiquetas de origem
-- da lista abaixo e com o campo `origem` que os formulários do site mandam.

insert into public.crm_origens (cliente_id, nome, chave, ordem)
select c.id, v.nome, v.chave, v.ordem
from public.clientes c
cross join (values
  ('Site',             'veio do site',    0),
  ('Diagnóstico',      'diagnostico',     1),
  ('Newsletter',       'newsletter',      2),
  ('Comunidade',       'comunidade',      3),
  ('Disparo',          'veio do disparo', 4),
  ('Indicação',        'indicacao',       5),
  ('Anúncio',          'anuncio',        20),
  ('Instagram',        'instagram',      30),
  ('Equipe procurou',  'equipe',         40),
  ('WhatsApp direto',  'direto',         50)
) as v(nome, chave, ordem)
where c.slug = 'ousadia'
on conflict (cliente_id, chave) where chave is not null do nothing;

-- ---------------------------------------------------------------------------
-- 4. Por que ganhou, por que perdeu

insert into public.crm_motivos (cliente_id, nome, tipo, ordem)
select c.id, v.nome, v.tipo, v.ordem
from public.clientes c
cross join (values
  ('Sem dinheiro agora',         'perdido', 0),
  ('Achou caro',                 'perdido', 1),
  ('Sem tempo para estudar',     'perdido', 2),
  ('Escolheu outro curso',       'perdido', 3),
  ('Parou de responder',         'perdido', 4),
  ('Não era o público',          'perdido', 5),
  ('Veio da comunidade pronto',  'ganho',   0),
  ('Fechou depois do diagnóstico','ganho',  1),
  ('Fechou na conversa comercial','ganho',  2)
) as v(nome, tipo, ordem)
where c.slug = 'ousadia'
  and not exists (select 1 from public.crm_motivos m where m.cliente_id = c.id and m.nome = v.nome);

-- ---------------------------------------------------------------------------
-- 5. O que a Ousadia vende (valor em zero: preencher na tela)

insert into public.crm_produtos (cliente_id, nome, descricao, valor)
select c.id, v.nome, v.descricao, 0
from public.clientes c
cross join (values
  ('Escola Ousadia',               'escola de marketing digital'),
  ('Mentoria',                     'acompanhamento individual'),
  ('Mentoria Viver do Digital',    'mentoria'),
  ('Método Satoyiro',              'curso'),
  ('Aulão Social Media',           'aula ao vivo'),
  ('Mapa do UGC',                  'curso'),
  ('Momento UGC',                  'curso'),
  ('Agência: gestão de redes',     'serviço mensal'),
  ('Agência: tráfego pago',        'serviço mensal')
) as v(nome, descricao)
where c.slug = 'ousadia'
  and not exists (select 1 from public.crm_produtos p where p.cliente_id = c.id and p.nome = v.nome);

-- ---------------------------------------------------------------------------
-- 6. As etiquetas que a IA e a equipe usam
--
-- A mesma lista que o _assunto.js e o _etiquetas.js esperam: o assunto
-- (matricula, suporte, agencia) e as famílias de estado, origem, campanha,
-- intenção e suporte. Os apelidos são as grafias que caem em cada uma.

insert into public.etiquetas_conhecidas (cliente_id, etiqueta, chave, apelidos, familia, origem)
select c.id, v.etiqueta, public.etiqueta_chave(v.etiqueta), v.apelidos, v.familia, 'lista'
from public.clientes c
cross join (values
  ('matricula',       array['interesse matricula','possivel aluno','interesse no curso','quer se matricular'], 'assunto'),
  ('suporte',         array['aluno com duvida','problema de acesso','ajuda','duvida de aluno'], 'assunto'),
  ('agencia',         array['gestao de redes','trafego pago','social media','orcamento agencia','quer contratar'], 'assunto'),
  ('lead',            array['interesse','interesse geral','interesse ativo','procurando informacoes','possivel cliente'], 'estado'),
  ('aluno',           array['aluna','ja e aluno','aluno ativo','matriculado','matriculada','ja comprou'], 'estado'),
  ('transferido',     array['transferida','passou para humano'], 'estado'),
  ('veio do disparo', array['veio de disparo','chegou do disparo','veio da campanha','disparo'], 'origem'),
  ('veio do site',    array['site','veio pelo site','formulario do site'], 'origem'),
  ('instagram',       array['veio do instagram','ig','direct'], 'origem'),
  ('comunidade',      array['veio da comunidade','membro da comunidade'], 'origem'),
  ('indicacao',       array['indicado','veio por indicacao'], 'origem'),
  ('mentoria',        array['quer mentoria','interesse em mentoria'], 'intencao'),
  ('escola',          array['quer a escola','interesse na escola'], 'intencao'),
  ('parceria',        array['interesse em parceria','parceiro','quer parceria'], 'intencao'),
  ('acesso',          array['sem acesso','nao consegue acessar','login','senha'], 'suporte'),
  ('certificado',     array['quer certificado','pediu certificado'], 'suporte'),
  ('cancelamento',    array['quer cancelar','cancelar','cancelado','pediu cancelamento'], 'suporte')
) as v(etiqueta, apelidos, familia)
where c.slug = 'ousadia'
on conflict (cliente_id, chave) do nothing;

-- ---------------------------------------------------------------------------
-- 7. As frentes de atendimento
--
-- Quem recebe a conversa quando a IA passa para gente. Os responsáveis ficam
-- em branco até as atendentes serem cadastradas no painel.

insert into public.frentes (cliente_id, nome, assuntos, padrao)
select c.id, v.nome, v.assuntos, v.padrao
from public.clientes c
cross join (values
  ('Matrículas',        array['matricula'], true),
  ('Suporte ao aluno',  array['suporte'],   false),
  ('Agência',           array['agencia'],   false)
) as v(nome, assuntos, padrao)
where c.slug = 'ousadia'
  and not exists (select 1 from public.frentes f where f.cliente_id = c.id and f.nome = v.nome);
