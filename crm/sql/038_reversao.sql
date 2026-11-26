-- Reversão da 038. A função é só leitura: derrubá-la não perde dado nenhum,
-- as telas voltam a não mostrar a contagem de mensagens sem resposta.
drop function if exists public.sem_resposta_das_conversas(uuid[]);
