"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Satellite, ArrowRight, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const NAV_LINKS = [
  { label: "Plataforma", href: "#plataforma" },
  { label: "Módulos", href: "#modulos" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Seguridad", href: "#seguridad" },
];

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8">
      <nav
        aria-label="Navegación principal"
        className="mx-auto max-w-6xl rounded-full border border-border/50 bg-background/70 backdrop-blur-xl shadow-lg shadow-royal/5 transition-all duration-300 dark:border-white/10 dark:bg-carbon/70"
      >
        <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 focus:outline-none"
            aria-label="Star Conectados - Inicio"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-marino via-royal to-cielo text-white shadow-md shadow-royal/20 transition-transform group-hover:scale-105">
              <Satellite className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                Star Conectados
              </span>
              <span className="hidden text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:inline">
                Tv Star Satellite
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 text-xs lg:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-full"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Action Elements */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Status Pill */}
            <div
              className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              aria-label="Estado: Sistema Operativo"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Sistema Operativo</span>
            </div>

            {/* Dark / Light Toggle */}
            <ThemeToggle />

            {/* CTA Acceder Pill */}
            <Button
              asChild
              size="sm"
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium px-4 shadow-sm"
            >
              <Link href="/login" aria-label="Acceder a la plataforma">
                Acceder
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={handleToggleMenu}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-border/40 px-4 py-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Red Satelital Operativa • +120 Cuadrillas</span>
            </div>

            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleCloseMenu}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-2 border-t border-border/30 flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-royal" /> Tv Star Satellite C.A.
              </span>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/login" onClick={handleCloseMenu}>
                  Ingresar
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
