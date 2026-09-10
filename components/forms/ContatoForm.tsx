"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Field, FormError, Input, Select, Textarea } from "./fields";
import { submitForm, type FormPayload } from "@/lib/submit";

const LABELS: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  assunto: "Assunto",
  mensagem: "Mensagem",
};

/** Formulário de contato (PRD 9.7). */
export function ContatoForm() {
  const router = useRouter();
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const invalidos = Array.from(
      form.querySelectorAll<HTMLInputElement>("[required]"),
    ).filter((f) => {
      const bad =
        !f.value.trim() ||
        (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
      f.setAttribute("aria-invalid", String(bad));
      return bad;
    });

    if (invalidos.length) {
      setErro(true);
      invalidos[0].focus();
      return;
    }

    setErro(false);
    setEnviando(true);
    const data: FormPayload = {};
    new FormData(form).forEach((v, k) => {
      data[k] = String(v);
    });

    const { whatsappUrl } = await submitForm("contato", data, LABELS);
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener");
    router.push("/obrigado");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="nome" label="Seu nome" required>
          <Input id="nome" name="nome" required autoComplete="name" />
        </Field>
        <Field id="email" label="Seu e-mail" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <Field id="assunto" label="Assunto" required full>
          <Select id="assunto" name="assunto" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            <option>Cursos</option>
            <option>Mentoria</option>
            <option>Agência / proposta para marca</option>
            <option>Comunidade</option>
            <option>Imprensa / parcerias</option>
            <option>Outro</option>
          </Select>
        </Field>
        <Field id="mensagem" label="Mensagem" required full>
          <Textarea id="mensagem" name="mensagem" required />
        </Field>
      </div>

      <FormError show={erro} />

      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar mensagem"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
