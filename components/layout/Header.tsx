"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS, wa } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ink-deep/80 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between">
        <Link href="/" aria-label="Ousadia Marketing, início">
          {/* A trava oficial é larga: abaixo de ~h-10 o "MARKETING" some. */}
          <Logo className="h-10" priority />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-wider text-cinza-ink transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
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
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 font-mono text-sm uppercase tracking-wider text-cinza-ink hover:text-amarelo"
                >
                  {link.label}
                </Link>
              ))}
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
