-- Texto fixo por link: quando o cliente escreve a copy dele, ela sai palavra por
-- palavra e o modelo não encosta.
--
-- Nasceu como `agente_config.aviso_link_inicial`, amarrado ao link de entrada da
-- conversa. Durou uma hora: a dona da plataforma viu a primeira mensagem já
-- chegando com link e vetou. A copy continua sendo dela, mas o lugar dela é no
-- fim da conversa, quando a IA já entendeu o problema da pessoa e oferece a aula
-- como solução. Por isso o texto fixo virou propriedade DO LINK, não da abertura:
-- vale em qualquer momento em que aquele link for enviado.
alter table links
  add column if not exists texto_fixo text;

alter table agente_config
  drop column if exists aviso_link_inicial;
