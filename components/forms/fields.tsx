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
