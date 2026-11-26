import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Materiais de referência das versões antigas — não são código do projeto.
    "legado/**",
    // O CRM é um projeto separado (Vite + Node), com lint e testes próprios.
    "crm/**",
  ]),
]);

export default eslintConfig;
