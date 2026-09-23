"use client";

import { ArrowRight, Info } from "lucide-react";
import { Field, Input } from "@/components/forms/fields";

const SELOS = [
  "15 perguntas · ~5 min",
  "Sem resposta certa ou errada",
  "Mapa personalizado no final",
];

export function TelaBoasVindas({
  onComecar,
}: {
  onComecar: (primeiroNome: string, turma: string) => void;
}) {
  return (
    <section className="card-surface animate-in fade-in duration-300 p-7 sm:p-10">
      <p className="eyebrow">Ouse Ser Você</p>
      <h1 className="headline-section mt-4">Quem é você de verdade?</h1>
      <p className="text-body mt-5 text-[1.05rem]">
        Aqui não existe resposta certa ou errada. Responda pensando em quem
        você é <strong className="text-foreground">hoje</strong>, não em
        quem acham que você deveria ser.
      </p>

      <ul className="mt-7 flex flex-wrap gap-2">
        {SELOS.map((s) => (
          <li
            key={s}
            className="rounded-full border border-border bg-white/5 px-4 py-2 font-mono text-xs text-cinza-ink"
          >
            {s}
          </li>
        ))}
      </ul>

      <p className="mt-8 flex items-start gap-3 rounded-xl border border-rio/25 bg-rio/5 px-5 py-4 text-sm text-foreground/85">
        <Info size={18} className="mt-0.5 shrink-0 text-rio" aria-hidden />
        <span>
          Ferramenta pedagógica de reflexão, do método Satoyiro. Não é um
          teste psicológico. No fim, vamos pedir seu nome completo, e-mail,
          contato, rede social, data de nascimento e seu consentimento, para
          liberar o mapa completo.
        </span>
      </p>

      <form
        className="mt-9 grid gap-5 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          const dados = new FormData(ev.currentTarget);
          const primeiroNome = String(dados.get("primeiroNome") ?? "").trim();
          const turma = String(dados.get("turma") ?? "").trim();
          if (!primeiroNome) return;
          onComecar(primeiroNome, turma);
        }}
      >
        <Field id="os_nome" label="Seu primeiro nome" required>
          <Input
            id="os_nome"
            name="primeiroNome"
            autoComplete="given-name"
            placeholder="Como podemos te chamar"
            required
          />
        </Field>
        <Field id="os_turma" label="Turma (opcional)">
          <Input id="os_turma" name="turma" placeholder="Ex.: 2º B" />
        </Field>

        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary">
            Bora começar <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
