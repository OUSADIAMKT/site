-- Link de reforço: quando a resposta sai longa, ela termina com o link.
--
-- A regra está escrita no prompt ("se não cabe em duas frases, a resposta é a
-- aula"), e o Haiku não obedece: ele explica em três balões e escreve "a aula
-- que eu te mandei" sem mandar nada. O Opus obedece, mas custa vinte vezes mais
-- em TODA mensagem para consertar uma minoria delas.
--
-- Então o reforço é determinístico: passou do tamanho de duas frases e o link
-- não saiu nesta resposta nem na rodada anterior, o sistema manda. O modelo
-- continua livre para mandar antes, por conta dele.
alter table agente_config
  add column if not exists link_reforco text;
