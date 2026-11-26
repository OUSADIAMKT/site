-- Reversão da 046.
--
-- A coluna sai por último: a tabela e a função não dependem dela, mas uma
-- página arquivada volta a aparecer na galeria no instante em que a coluna
-- morre, e é bom que isso seja o último efeito e não o primeiro.
drop function if exists public.somar_evento_pagina(uuid, text);

drop table if exists public.pagina_eventos_dia;

alter table if exists public.paginas drop column if exists arquivada_em;
