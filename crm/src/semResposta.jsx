// O que quem atende precisa ver antes de abrir a conversa: esta aqui já foi
// respondida, aquela não.
//
// Mora num arquivo só porque são quatro telas mostrando a mesma coisa (quadro,
// fila, lista de conversas e a conversa aberta), e quatro cópias disso iam
// divergir na primeira vez que alguém mudasse o texto.
//
// "Sem resposta" é contado no banco, da última mensagem que saiu para a pessoa
// em diante. Resposta da IA conta como resposta: a bolinha some quando o robô
// responde. O que não some é o aviso de que a conversa está na fila, porque aí
// a IA já fez o que podia e a pessoa está esperando gente.

import { faz, frasePendente, numeroDaBolinha, quemRespondeu } from "./semResposta.js";

export { faz, frasePendente };

/**
 * A bolinha com o número, igual à do WhatsApp.
 *
 * Mostra o número de mensagens que a pessoa mandou e ninguém respondeu. Acima
 * de 99 vira "99+": o que importa a partir dali é que é muita coisa.
 */
export function Pendente({ conversa }) {
  const n = conversa?.sem_resposta || 0;
  if (!n) return null;
  const texto = frasePendente(conversa);
  return (
    <span className="pendente" title={texto} aria-label={texto}>
      {numeroDaBolinha(n)}
    </span>
  );
}

/** O selo de quem está na fila esperando uma pessoa. */
export function Aguardando({ conversa }) {
  if (conversa?.modo !== "fila") return null;
  return (
    <span className="selo-espera" title="A IA passou esta conversa para a equipe e ninguém assumiu ainda.">
      aguardando atendimento
    </span>
  );
}

/**
 * A faixa no alto da conversa aberta.
 *
 * Duas informações diferentes, e por isso duas frases: quantas mensagens estão
 * sem resposta, e se a conversa está na fila esperando gente. Uma conversa
 * pode ter as duas, uma só, ou nenhuma.
 */
export function AvisoSemResposta({ estado }) {
  if (!estado) return null;
  const n = estado.sem_resposta || 0;
  const naFila = estado.modo === "fila";
  if (!n && !naFila) return null;

  const porQuem = quemRespondeu(estado.respondida_por);

  return (
    <div className="aviso atencao sem-resposta" role="status">
      {n > 0 && <strong>{frasePendente(estado)}.</strong>}
      {n > 0 && estado.respondida_em && (
        <> A última resposta foi {porQuem}, há {faz(estado.respondida_em)}.</>
      )}
      {n > 0 && !estado.respondida_em && <> Ninguém respondeu esta conversa ainda.</>}
      {naFila && (
        <> {n > 0 ? "E ela está" : "Esta conversa está"} na fila, aguardando atendimento.</>
      )}
    </div>
  );
}
