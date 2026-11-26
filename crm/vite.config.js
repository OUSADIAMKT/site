import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    // O calculo de gzip de cada chunk estoura a memoria do node nesta maquina,
    // no passo [vite:reporter], depois do bundle ja estar pronto. E so o numero
    // impresso no log: desligar nao muda um byte do que vai para o ar.
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        // O painel de verdade.
        //
        // Chama-se painel.html, e NÃO index.html, por uma razão de
        // roteamento: na Vercel o sistema de arquivos é consultado ANTES dos
        // rewrites, então um index.html no raiz seria servido para "/" em
        // QUALQUER domínio, inclusive no domínio do cliente que aponta para
        // cá esperando a landing page dele. Sem arquivo no raiz, "/" cai nos
        // rewrites do vercel.json, que mandam o painel para os domínios do
        // painel e a landing page para os domínios dos clientes.
        main: resolve(process.cwd(), "painel.html"),
        // REPORT: o relatório que o cliente abre pelo link /r/<código>.
        relatorio: resolve(process.cwd(), "relatorio.html"),
        // A prévia da landing page em aba separada. Página mínima, sem React e
        // sem token: ela só hospeda o iframe sandbox e espera o documento
        // chegar por postMessage da aba que a abriu. O código importado
        // continua rodando em origem opaca dentro do sandbox, e nada do
        // rascunho fica num endereço que alguém consiga abrir sozinho.
        previaPagina: resolve(process.cwd(), "previa-pagina.html"),
      },
    },
  },
});
