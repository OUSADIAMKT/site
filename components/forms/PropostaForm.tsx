"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Field, FormError, Input, Select, Textarea } from "./fields";
import { submitForm, type FormPayload } from "@/lib/submit";

const LABELS: Record<string, string> = {
  empresa: "Empresa",
  segmento: "Segmento",
  objetivo: "Objetivo",
  orcamento: "Orçamento aproximado",
};

/** Solicitação de proposta da agência (PRD 9.4). */
export function PropostaForm() {
  const router = useRouter();
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const invalidos = Array.from(
      form.querySelectorAll<HTMLInputElement>("[required]"),
    ).filter((f) => {
      const bad = !f.value.trim();
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

    const { whatsappUrl } = await submitForm("agência", data, LABELS);
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener");
    router.push("/obrigado");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="empresa" label="Empresa" required>
          <Input id="empresa" name="empresa" required autoComplete="organization" />
        </Field>
        <Field id="segmento" label="Segmento" required>
          <Input id="segmento" name="segmento" required />
        </Field>
        <Field id="objetivo" label="Principal objetivo" required full>
          <Textarea id="objetivo" name="objetivo" required />
        </Field>
        <Field id="orcamento" label="Orçamento aproximado mensal" required full>
          <Select id="orcamento" name="orcamento" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            <option>Até R$ 3 mil</option>
            <option>R$ 3 mil a R$ 10 mil</option>
            <option>R$ 10 mil a R$ 30 mil</option>
            <option>Acima de R$ 30 mil</option>
            <option>Prefiro conversar</option>
          </Select>
        </Field>
      </div>

      <FormError show={erro} />

      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar e falar com o time"}{" "}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
