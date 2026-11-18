import React from "react";
import Link from "next/link";
import { ArrowRight, Satellite, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FinalCTA: React.FC = () => {
  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="mx-auto max-w-5xl relative">
        {/* Glow ambient background behind the CTA Card */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-marino via-royal to-cielo opacity-30 blur-[130px] rounded-full pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-br from-marino/90 via-carbon/95 to-marino/90 text-white p-8 sm:p-14 lg:p-16 shadow-2xl shadow-royal/20 text-center space-y-8 backdrop-blur-2xl">
          {/* Subtle top badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-md">
            <Satellite className="h-4 w-4 text-cielo animate-pulse" aria-hidden="true" />
            <span>Tv Star Satellite, C.A. • Solución Innover Logistics</span>
          </div>

          {/* Heading */}
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Tome el control absoluto de su inventario satelital hoy mismo
            </h2>
            <p className="text-sm sm:text-base text-hielo/80 leading-relaxed">
              Unifique sus sucursales, elimine las pérdidas ocultas en cuadrillas y
              asegure la máxima rentabilidad de cada instalación en campo.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-marino hover:bg-hielo font-bold px-8 h-13 shadow-xl transition-all hover:scale-105"
            >
              <Link href="/login" aria-label="Ingresar al sistema de inventario">
                Ingresar al sistema
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10 text-xs text-hielo/70">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Acceso seguro y protegido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-cielo" />
              <span>Sincronización en vivo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Satellite className="h-4 w-4 text-white" />
              <span>Soporte satelital integral</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
