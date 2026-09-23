"use client";

import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Field, FormError, Input } from "@/components/forms/fields";
import type { LeadAluno } from "@/lib/metodo-satoyiro/tipos";

export function TelaCaptura({
  primeiroNome,
  onEnviar,
}: {
  primeiroNome: string;
  onEnviar: (lead: LeadAluno) => void;
}) {
  const [erro, setErro] = useState(false);
  const [consentErro, setConsentErro] = useState(false);

  function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const dados = new FormData(form);
    const valores = {
      nomeCompleto: String(dados.get("nomeCompleto") ?? "").trim(),
      email: String(dados.get("email") ?? "").trim(),
      contato: String(dados.get("contato") ?? "").trim(),
      redeSocial: String(dados.get("redeSocial") ?? "").trim(),
    };

    const invalidos: string[] = [];
    if (valores.nomeCompleto.length < 2) invalidos.push("nomeCompleto");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) invalidos.push("email");
    if (valores.contato.replace(/\D/g, "").length < 8) invalidos.push("contato");
    if (!dados.get("consent")) invalidos.push("consent");

    form.querySelectorAll<HTMLInputElement>("input[name]").forEach((f) => {
      f.setAttribute("aria-invalid", String(invalidos.includes(f.name)));
    });
    setConsentErro(invalidos.includes("consent"));

    if (invalidos.length) {
      setErro(true);
      form.querySelector<HTMLInputElement>(`[name="${invalidos[0]}"]`)?.focus();
      return;
    }

    setErro(false);
    onEnviar({
      primeiroNome,
      turma: "",
      nomeCompleto: valores.nomeCompleto,
      email: valores.email,
      contato: valores.contato,
      redeSocial: valores.redeSocial,
    });
  }

  return (
    <section className="card-surface animate-in fade-in duration-300 p-7 sm:p-10">
      <p className="eyebrow">Seu mapa está pronto</p>
      <h2 className="headline-section mt-4">
        {primeiroNome ? `${primeiroNome}, para` : "Para"} onde enviamos seu mapa completo?
      </h2>
      <p className="text-body mt-4 max-w-2xl">
        Encontramos seu tipo e como você enxerga a si mesmo(a), seu caminho e
        suas expectativas de sucesso. Preencha para desbloquear o mapa
        detalhado, com gráficos e recomendações.
      </p>

      <form onSubmit={enviar} noValidate className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="os_nomeCompleto" label="Nome completo" required>
            <Input
              id="os_nomeCompleto"
              name="nomeCompleto"
              autoComplete="name"
              placeholder="Seu nome completo"
            />
          </Field>
          <Field id="os_email" label="E-mail" required>
            <Input
              id="os_email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
            />
          </Field>
          <Field id="os_contato" label="WhatsApp ou telefone" required>
            <Input
              id="os_contato"
              name="contato"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field id="os_redeSocial" label="Instagram ou outra rede">
            <Input
              id="os_redeSocial"
              name="redeSocial"
              placeholder="@seuperfil"
            />
          </Field>
        </div>

        <label
          className={`flex items-start gap-3 text-sm ${
            consentErro ? "text-destructive" : "text-cinza-ink"
          }`}
        >
          <input
            type="checkbox"
            name="consent"
            value="sim"
            onChange={() => setConsentErro(false)}
            className={`mt-1 size-4 shrink-0 rounded-sm accent-[var(--amarelo)] ${
              consentErro ? "outline outline-2 outline-destructive" : ""
            }`}
          />
          <span>
            Sei que meu resultado será guardado pela Ousadia Marketing e
            autorizo o uso dos meus dados para receber meu mapa e conteúdos
            relacionados ao método Satoyiro.
          </span>
        </label>

        <p className="flex items-center gap-3 rounded-xl border border-amarelo/30 bg-amarelo/5 px-5 py-4 text-sm">
          <Lock size={16} className="shrink-0 text-amarelo" aria-hidden />
          <span>Seus dados só são usados para te enviar o mapa e conteúdos do método Satoyiro.</span>
        </p>

        <FormError show={erro} />

        <button type="submit" className="btn btn-primary w-full sm:w-auto">
          Ver meu mapa completo <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
