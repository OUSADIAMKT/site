// Trabalho que continua depois da resposta.
//
// Na Vercel isto era o `waitUntil` de `@vercel/functions`: a função morria ao
// responder, e só o que estivesse registrado ali sobrevivia. Na VPS o
// processo não morre, então basta deixar a promessa correr. O que este
// arquivo acrescenta é não deixar uma rejeição solta derrubar o processo, e
// registrar no log o que falhou.
//
// O nome continua `waitUntil` para quem chama não mudar uma linha.

export function waitUntil(promessa) {
  Promise.resolve(promessa).catch((e) => {
    console.error("[segundo plano]", e?.stack || e?.message || e);
  });
}
