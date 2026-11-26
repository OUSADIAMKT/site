// Agenda: consulta de horário livre e marcação.
// Toda data que chega perto da IA ou da tela vira texto no fuso do cliente.
// ISO cru só circula entre o banco e as ferramentas.

import { db } from "./_db.js";

export const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatarHorario(iso, fuso) {
  const data = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso, weekday: "long", day: "2-digit", month: "2-digit",
  }).format(data);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso, hour: "2-digit", minute: "2-digit",
  }).format(data);
  return `${dia} às ${hora}`;
}

// Agrupa por dia para a IA falar "quinta tenho 14h, 14h30 e 16h" em vez de
// despejar uma lista de vinte horários iguais. Aceita tanto a lista de ISO
// quanto a lista com local, que é o que vem do banco.
export function agruparPorDia(horarios, fuso) {
  const dias = new Map();

  for (const item of horarios) {
    const iso = typeof item === "string" ? item : item.inicio;
    const local = typeof item === "string" ? null : montarLocal(item);
    const data = new Date(iso);

    const chave = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fuso, weekday: "long", day: "2-digit", month: "2-digit",
    }).format(data);
    const hora = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fuso, hour: "2-digit", minute: "2-digit",
    }).format(data);

    if (!dias.has(chave)) dias.set(chave, []);
    dias.get(chave).push({ hora, iso, local });
  }

  return [...dias].map(([dia, horas]) => ({
    dia,
    horas,
    // Se o dia inteiro é no mesmo lugar, o local vira do dia e a IA diz uma vez.
    local: horas.every((h) => h.local === horas[0].local) ? horas[0].local : null,
  }));
}

export function montarLocal({ cidade, estado }) {
  if (!cidade && !estado) return null;
  if (cidade && estado) return `${cidade} (${estado})`;
  return cidade || estado;
}

// Devolve { inicio, cidade, estado }. O local vem junto porque o especialista
// pode estar em outra cidade naquele dia, e o paciente precisa saber onde ir.
export async function horariosLivres(profissionalId, dias = 7) {
  const sb = db();
  const { data, error } = await sb.rpc("horarios_livres", {
    p_profissional: profissionalId,
    p_dias: dias,
  });
  if (error) throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  return data || [];
}

export async function marcar({ clienteId, profissionalId, conversaId, nome, telefone, inicio }) {
  const sb = db();
  const fim = new Date(new Date(inicio).getTime() + 30 * 60 * 1000).toISOString();

  const { data, error } = await sb.from("agendamentos").insert({
    cliente_id: clienteId,
    profissional_id: profissionalId,
    conversa_id: conversaId || null,
    paciente_nome: nome,
    telefone,
    inicio,
    fim,
  }).select().single();

  // 23505 = o índice único barrou: alguém pegou esse horário primeiro.
  if (error?.code === "23505") return { ocupado: true };
  if (error) throw new Error(`Falha ao marcar: ${error.message}`);
  return { agendamento: data };
}

// O instante exato em que começa uma hora local, num fuso qualquer.
// "2026-09-05 meia-noite em Belém" é 2026-09-05T03:00Z, é isso que isto resolve.
export function instanteLocal(diaISO, hora, fuso) {
  const comoSeFosseUTC = new Date(`${diaISO}T${hora}Z`);
  const emUTC = new Date(comoSeFosseUTC.toLocaleString("en-US", { timeZone: "UTC" }));
  const noFuso = new Date(comoSeFosseUTC.toLocaleString("en-US", { timeZone: fuso }));
  return new Date(comoSeFosseUTC.getTime() + (emUTC.getTime() - noFuso.getTime()));
}

// Um dia de trabalho da recepção. O "dia" é o dela, no fuso da clínica,
// não o do servidor, que pode estar em outro continente.
export async function agendamentosDoDia(clienteId, diaISO, fuso) {
  const sb = db();

  const inicio = instanteLocal(diaISO, "00:00:00", fuso);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await sb
    .from("agendamentos")
    .select("*, profissionais(nome, especialidade)")
    .eq("cliente_id", clienteId)
    .gte("inicio", inicio.toISOString())
    .lt("inicio", fim.toISOString())
    .order("inicio");

  if (error) throw new Error(`Falha ao ler a agenda do dia: ${error.message}`);
  return data || [];
}
