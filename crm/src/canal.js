// O pouco que a lateral e a tela de Canais precisam saber em comum sobre um
// canal. Vive sozinho num arquivo para a lateral não ter que importar a tela
// inteira, que puxa formulário, ícones e o resto junto.

export const TIPOS_DE_CANAL = {
  whatsapp: "WA",
  instagram: "IG",
};

function bonito(e164) {
  const d = String(e164 || "");
  if (d.length < 12) return d;
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, -4)}-${d.slice(-4)}`;
}

// Como o canal se chama na tela. O nome de exibição é o que a pessoa escreveu
// e sempre ganha; sem ele, o identificador cru, que é feio mas nunca é vazio.
export function nomeDoCanal(c) {
  if (!c) return "";
  if (c.tipo === "instagram") return c.nome_exibicao || `@${c.ig_user_id}`;
  return c.nome_exibicao || bonito(c.numero_e164);
}

export { bonito as numeroBonito };
