/** Dados de contato capturados antes de liberar o resultado do diagnóstico. */
export type Lead = {
  nome: string;
  wpp: string;
  email: string;
  social: string;
  local: string;
};

export const LEAD_VAZIO: Lead = {
  nome: "",
  wpp: "",
  email: "",
  social: "",
  local: "",
};
