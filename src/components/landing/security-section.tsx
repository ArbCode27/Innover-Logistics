import React from "react";
import { ShieldCheck, Lock, Users, Layers, KeyRound, DatabaseZap } from "lucide-react";

interface Pillar {
  title: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
}

const PILLARS: Pillar[] = [
  {
    title: "Aislamiento por Sucursal",
    tagline: "Privacidad y control territorial",
    description: "Cada sede solo visualiza y gestiona sus activos. La dirección general tiene visión consolidada en tiempo real.",
    icon: Lock,
  },
  {
    title: "Auditoría Inalterable",
    tagline: "Bitácora permanente sin opción de borrado",
    description: "Cada cambio de estado queda asentado de forma indeleble. Conoce con precisión quién, cuándo y desde dónde se realizó cada transacción.",
    icon: ShieldCheck,
  },
  {
    title: "Operaciones Blindadas",
    tagline: "Nunca más un traslado a medias",
    description: "Si falla la conexión a mitad de un proceso de carga o despacho, el sistema revierte automáticamente la operación evitando duplicados o inventario flotante.",
    icon: DatabaseZap,
  },
  {
    title: "Control Granular de Roles",
    tagline: "Permisos estrictos según la jerarquía",
    description: "Perfiles claros para Almacenistas, Técnicos de Cuadrilla, Supervisores Zonales y Gerencia de Operaciones.",
    icon: Users,
  },
];

export const SecuritySection: React.FC = () => {
  return (
    <section id="seguridad" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-white/80 via-white/40 to-white/90 dark:from-card/80 dark:via-carbon/50 dark:to-card/90 backdrop-blur-2xl p-8 sm:p-12 lg:p-16 shadow-2xl shadow-royal/5">
          {/* Header */}
          <div className="max-w-3xl space-y-4 mb-14">
            <span className="rounded-full border border-royal/30 bg-royal/10 px-3.5 py-1 text-xs font-semibold text-royal dark:text-cielo uppercase tracking-wider">
              Seguridad de Nivel Empresarial
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Protección estricta para el activo más valioso de su operación
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Diseñado con estándares bancarios para compañías de telecomunicaciones con
              múltiples sedes, cientos de instaladores y alto volumen diario de materiales.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-border/60 bg-background/50 p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:border-royal/40 hover:shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal/10 text-royal dark:bg-royal/20">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="text-xs font-semibold text-royal dark:text-cielo">
                      {pillar.tagline}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Certified Seal Note */}
          <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-500" />
              <span>Autenticación robusta y sesiones blindadas por dispositivo</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-royal" />
              <span>Respaldos automáticos continuos y redundancia de datos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
