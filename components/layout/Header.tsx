"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS, wa } from "@/lib/site";

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

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div key={link.href} className="group relative">
                <div className="flex items-center gap-1 py-2">
                  <Link
                    href={link.href}
                    className="font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                  <ChevronDown
                    size={12}
                    className="text-cinza-ink transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                    aria-hidden
                  />
                </div>
                <div className="invisible absolute left-1/2 top-full z-10 min-w-[190px] -translate-x-1/2 rounded-lg border border-border bg-ink-deep/95 p-2 opacity-0 shadow-lg backdrop-blur-md transition-all duration-150 group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:bg-white/5 hover:text-amarelo"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground"
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
                  <div key={link.href} className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <Link
                        href={link.href}
                        onClick={closeMobile}
                        className="flex-1 py-2 font-mono text-sm uppercase tracking-wider text-cinza-ink hover:text-amarelo"
                      >
                        {link.label}
                      </Link>
                      <button
                        onClick={() =>
                          setExpanded((v) => (v === link.href ? null : link.href))
                        }
                        aria-expanded={expanded === link.href}
                        aria-label={`Submenu de ${link.label}`}
                        className="p-2 text-cinza-ink"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            expanded === link.href ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <AnimatePresence>
                      {expanded === link.href && (
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
                              className="block py-2 font-mono text-sm uppercase tracking-wider text-cinza-ink/80 hover:text-amarelo"
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
                    className="py-2 font-mono text-sm uppercase tracking-wider text-cinza-ink hover:text-amarelo"
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
