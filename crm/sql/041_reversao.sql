-- Reversão da 041.
--
-- Desfaz a estrutura: a lista conhecida e a função de chave somem, e o código
-- volta a gravar a etiqueta como o modelo escreveu.
--
-- NÃO desfaz a reescrita do item 4. As etiquetas duplicadas foram fundidas e
-- as de texto livre saíram das conversas; isto não volta por SQL. O que existe
-- é o retrato de antes, salvo em `docs/041-etiquetas-antes.csv` na hora de
-- aplicar (24/11/2026): uma linha por conversa, com as etiquetas como estavam,
-- separadas por ` | `. Voltar é regravar a coluna a partir daquele arquivo, e
-- é trabalho manual de propósito, porque desfazer uma limpeza nunca deveria
-- ser um comando solto.
drop table if exists public.etiquetas_conhecidas;
drop function if exists public.etiqueta_chave(text);
