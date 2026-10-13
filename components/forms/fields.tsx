import type { ReactNode } from "react";

const controlClass =
  "w-full rounded-lg border border-input bg-ink-void/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-cinza-ink/60 focus:border-amarelo aria-[invalid=true]:border-destructive";

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-mono text-xs uppercase tracking-wider text-cinza-ink"
    >
      {children}
      {required && <span className="text-amarelo"> *</span>}
    </label>
  );
}

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={controlClass} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={`${controlClass} min-h-32 resize-y`} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={controlClass} />;
}

/**
 * Link pra Política de Privacidade dentro das caixas de consentimento. Abre em
 * outra aba de propósito: quem está no meio de um diagnóstico perderia as
 * respostas se a página trocasse.
 */
export function LinkPolitica({ children = "Política de Privacidade" }: { children?: ReactNode }) {
  return (
    <a
      href="/politica-de-privacidade/"
      target="_blank"
      rel="noopener"
      className="text-amarelo underline underline-offset-4"
    >
      {children}
    </a>
  );
}

/** Nome do campo-armadilha anti-robô (ver `Armadilha`). */
export const ARMADILHA = "site_empresa";

/**
 * Campo fora da tela que nenhuma pessoa vê nem preenche. Robô que sai
 * preenchendo tudo cai nele: o formulário segue normal, pra não dar pista, mas
 * a resposta não é gravada (`caiuNaArmadilha`). Não barra quem manda dados
 * direto pra URL do Apps Script: isso é tratado nos próprios scripts.
 */
export function Armadilha() {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
      <input name={ARMADILHA} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

export function caiuNaArmadilha(form: HTMLFormElement) {
  return Boolean(new FormData(form).get(ARMADILHA));
}

export function Field({
  id,
  label,
  required,
  children,
  full,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function FormError({ show }: { show: boolean }) {
  return (
    <p
      role="alert"
      hidden={!show}
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive"
    >
      Confere os campos destacados: tem coisa faltando.
    </p>
  );
}
