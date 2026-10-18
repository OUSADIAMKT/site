"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS, wa, type NavItem } from "@/lib/site";

/**
 * Tamanho da fonte do menu: 20% acima do que era (12px no computador e 14px
 * no celular, pedido de 18/10/2026). Com a fonte maior, o menu completo só
 * cabe a partir de 1280px (`xl`); abaixo disso vale o menu de celular.
 */
const FONTE_DESK = "text-[0.9rem]";
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
        className={`flex items-center gap-1 py-2 font-mono ${FONTE_DESK} uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground`}
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

        <nav className="hidden items-center gap-6 whitespace-nowrap xl:flex">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <Dropdown key={link.label} label={link.label}>
                {link.children}
              </Dropdown>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono ${FONTE_DESK} uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground`}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={wa("home")}
            className="btn btn-primary hidden !px-4 !py-2.5 sm:inline-flex"
          >
            Falar no WhatsApp
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-foreground xl:hidden"
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
            className="overflow-hidden border-t border-border bg-ink xl:hidden"
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
              <a href={wa("home")} className="btn btn-primary mt-3">
                Falar no WhatsApp
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
