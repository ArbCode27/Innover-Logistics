import React from "react";
import Link from "next/link";
import { Satellite, Shield, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background/80 py-12 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand identity */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-royal text-white shadow-sm">
            <Satellite className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">
              Star Conectados • Tv Star Satellite, C.A.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Tecnología de gestión e inventario desarrollada por Innover Logistics.
            </p>
          </div>
        </div>

        {/* System Version & Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-mono">
            <Shield className="h-3 w-3 text-royal" />
            <span>Versión 2.4.0-Production</span>
          </div>

          <Link href="/login" className="hover:text-foreground transition-colors font-medium">
            Acceso Técnicos & Almacén
          </Link>

          <a
            href="mailto:soporte@starconectados.com"
            className="hover:text-foreground transition-colors font-medium"
          >
            Soporte Central
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center sm:text-right text-[11px]">
          <p>© {currentYear} Tv Star Satellite, C.A. Todos los derechos reservados.</p>
          <p className="flex items-center justify-center sm:justify-end gap-1 mt-0.5">
            <span>Diseñado con precisión para operaciones críticas</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
