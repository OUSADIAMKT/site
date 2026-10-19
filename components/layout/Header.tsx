"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS, REDES, SOCIAL, type NavItem } from "@/lib/site";
import { SocialIcon } from "@/components/ui/SocialIcon";

/**
 * Tamanho da fonte do menu: 20% acima do que era (12px no computador e 14px
 * no celular, pedido de 18/10/2026). O menu completo aparece a partir de
 * 1024px (`lg`); abaixo disso vale o menu de celular.
 */
const FONTE_DESK = "text-[0.9rem]";
/**
 * Itens do topo: encolhem sozinhos conforme a tela (13px em 1024px, 14,4px a
 * partir de 1280px) para o menu completo caber em tablet na horizontal.
 */
const FONTE_NAV = "text-[length:clamp(0.78rem,0.4rem_+_0.625vw,0.9rem)]";
const FONTE_MOBILE = "text-[1.05rem]";

/**
 * Rótulo sem link próprio que abre um submenu. Abre ao clicar (ou tocar) e
 * também ao passar o mouse; fecha ao escolher um item, com Esc ou ao clicar
 * fora.
 */
function Dropdown({ label, children }: { label: string; children: NavItem[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  // Com mouse o submenu já abriu ao passar por cima: o clique não pode fechar.
  const tipo = useRef("");

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div
      ref={raiz}
      className="relative"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="true"
        onPointerDown={(e) => (tipo.current = e.pointerType)}
        onClick={() => {
          const mouse = tipo.current === "mouse";
          tipo.current = "";
          setAberto((v) => mouse || !v);
        }}
        className={`flex items-center gap-1 py-2 font-mono ${FONTE_NAV} uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`absolute left-1/2 top-full z-10 min-w-[210px] -translate-x-1/2 rounded-lg border border-border bg-ink-deep/95 p-2 shadow-lg backdrop-blur-md transition-all duration-150 ${
          aberto
            ? "visible translate-y-1 opacity-100"
            : "invisible opacity-0"
        }`}
      >
        {children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            onClick={() => setAberto(false)}
            className={`block rounded-md px-3 py-2 font-mono ${FONTE_DESK} uppercase tracking-wider text-cinza-ink transition-colors hover:bg-white/5 hover:text-amarelo`}
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function closeMobile() {
    setOpen(false);
    setExpanded(null);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ink-deep/80 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between">
        <Link href="/" aria-label="Ousadia Marketing, início">
          {/* A trava oficial é larga: abaixo de ~h-10 o "MARKETING" some. */}
          <Logo className="h-10" priority />
        </Link>

        <nav className="hidden items-center gap-4 whitespace-nowrap lg:flex xl:gap-6">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <Dropdown key={link.label} label={link.label}>
                {link.children}
              </Dropdown>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono ${FONTE_NAV} uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground`}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          {/* Teste de 18/10/2026: ícones das redes no lugar do botão de WhatsApp. */}
          <ul className="hidden items-center gap-1 sm:flex">
            {REDES.filter(({ rede }) => SOCIAL[rede]).map(({ rede, label }) => (
              <li key={rede}>
                <a
                  href={SOCIAL[rede]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} da Ousadia`}
                  className="flex size-10 items-center justify-center text-cinza-ink transition-[scale,translate,color] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-0.5 hover:scale-[1.2] hover:text-amarelo focus-visible:-translate-y-0.5 focus-visible:scale-[1.2] focus-visible:text-amarelo motion-reduce:transform-none"
                >
                  <SocialIcon rede={rede} size={22} />
                </a>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-foreground lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-ink lg:hidden"
          >
            <div className="container-site flex flex-col gap-1 py-4">
              {NAV_LINKS.map((link) =>
                link.children ? (
                  <div key={link.label} className="flex flex-col">
                    <button
                      onClick={() =>
                        setExpanded((v) => (v === link.label ? null : link.label))
                      }
                      aria-expanded={expanded === link.label}
                      className={`flex items-center justify-between py-2 text-left font-mono ${FONTE_MOBILE} uppercase tracking-wider text-cinza-ink hover:text-amarelo`}
                    >
                      {link.label}
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${
                          expanded === link.label ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    <AnimatePresence>
                      {expanded === link.label && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-4"
                        >
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMobile}
                              className={`block py-2 font-mono ${FONTE_MOBILE} uppercase tracking-wider text-cinza-ink/80 hover:text-amarelo`}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className={`py-2 font-mono ${FONTE_MOBILE} uppercase tracking-wider text-cinza-ink hover:text-amarelo`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              {/* O topo só mostra as redes a partir de 640px; no celular elas vêm aqui. */}
              <ul className="mt-3 flex items-center gap-1 sm:hidden">
                {REDES.filter(({ rede }) => SOCIAL[rede]).map(({ rede, label }) => (
                  <li key={rede}>
                    <a
                      href={SOCIAL[rede]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} da Ousadia`}
                      className="flex size-11 items-center justify-center text-cinza-ink transition-colors hover:text-amarelo"
                    >
                      <SocialIcon rede={rede} size={24} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
