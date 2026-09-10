import * as runtime from "react/jsx-runtime";
import type { ReactNode } from "react";
import { mdxComponents } from "@/components/mdx/mdx-components";

type MdxModule = {
  default: (props: { components?: typeof mdxComponents }) => ReactNode;
};

/**
 * O Velite compila cada `.mdx` para um corpo de função (`outputFormat:
 * 'function-body'`) guardado no campo `code`. Aqui esse corpo é instanciado e
 * executado no servidor, em build — a página continua estática.
 *
 * A função compilada é chamada diretamente, em vez de virar um `<Componente />`:
 * o MDX gerado não usa hooks, e criar um componente durante o render trocaria a
 * identidade dele a cada passagem.
 */
const cache = new Map<string, MdxModule["default"]>();

function compilar(code: string) {
  const emCache = cache.get(code);
  if (emCache) return emCache;
  const { default: conteudo } = new Function(code)(runtime) as MdxModule;
  cache.set(code, conteudo);
  return conteudo;
}

export function MdxContent({ code }: { code: string }) {
  return compilar(code)({ components: mdxComponents });
}
