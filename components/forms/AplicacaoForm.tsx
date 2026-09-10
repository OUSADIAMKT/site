"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Field, FormError, Input, Select, Textarea } from "./fields";
import { submitForm, type FormPayload } from "@/lib/submit";

const LABELS: Record<string, string> = {
  nome: "Nome",
  arroba: "@",
  cidade: "Cidade/Estado",
  atuacao: "O que faz hoje",
  faturamento: "Faturamento/estágio",
  trava: "Maior trava",
  perfil: "Perfil",
};

/** Formulário de aplicação da mentoria (PRD 9.3) — gera aplicação, não venda direta. */
export function AplicacaoForm() {
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
        (f.type === "url" && !/^https?:\/\/.+\..+/.test(f.value));
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

    const { whatsappUrl } = await submitForm("mentoria", data, LABELS);
    if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener");
    router.push("/obrigado");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="nome" label="Seu nome" required>
          <Input id="nome" name="nome" required autoComplete="name" />
        </Field>
        <Field id="arroba" label="Seu @ principal" required>
          <Input id="arroba" name="arroba" required placeholder="@seuperfil" />
        </Field>
        <Field id="cidade" label="Cidade / Estado" required>
          <Input id="cidade" name="cidade" required />
        </Field>
        <Field id="atuacao" label="O que você faz hoje?" required>
          <Input id="atuacao" name="atuacao" required />
        </Field>
        <Field id="faturamento" label="Faturamento / estágio atual" required full>
          <Select id="faturamento" name="faturamento" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            <option>Ainda não faturo com o digital</option>
            <option>Até R$ 2 mil/mês</option>
            <option>R$ 2 mil a R$ 10 mil/mês</option>
            <option>R$ 10 mil a R$ 30 mil/mês</option>
            <option>Acima de R$ 30 mil/mês</option>
          </Select>
        </Field>
        <Field id="trava" label="Qual sua maior trava hoje?" required full>
          <Textarea id="trava" name="trava" required />
        </Field>
        <Field id="perfil" label="Link do seu perfil principal" required full>
          <Input
            id="perfil"
            name="perfil"
            type="url"
            required
            placeholder="https://instagram.com/seuperfil"
          />
        </Field>
      </div>

      <FormError show={erro} />

      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar aplicação"} <ArrowRight size={16} />
      </button>
      <p className="font-mono text-xs text-cinza-ink">
        Ao enviar, você é levado(a) pra página de confirmação. Falamos com você
        em até 1h útil.
      </p>
    </form>
  );
}
