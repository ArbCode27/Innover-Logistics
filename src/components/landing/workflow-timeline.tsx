import React from "react";
import { ShoppingCart, Warehouse, ArrowRightLeft, Users2, CheckCircle } from "lucide-react";

interface Step {
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Compra & Proveedor",
    tagline: "Ingreso formal de material",
    description: "Carga de orden de compra con listas de seriales e importaciones de bobinas y equipos.",
    icon: ShoppingCart,
  },
  {
    number: "02",
    title: "Recepción en Almacén",
    tagline: "Inspección y alta en stock",
    description: "Validación por pistola o cámara móvil. Los equipos ingresan al almacén central.",
    icon: Warehouse,
  },
  {
    number: "03",
    title: "Traslado a Sucursal",
    tagline: "Guía de despacho segura",
    description: "Material viaja en estado 'En Tránsito'. Imposible de duplicar o perder entre sedes.",
    icon: ArrowRightLeft,
  },
  {
    number: "04",
    title: "Asignación a Cuadrilla",
    tagline: "Custodia del técnico",
    description: "El supervisor transfiere los insumos al móvil del técnico responsable de la zona.",
    icon: Users2,
  },
  {
    number: "05",
    title: "Consumo en OT",
    tagline: "Cierre exitoso en campo",
    description: "El instalador liquida el material contra el número de Ticket/OT en menos de 30 segundos.",
    icon: CheckCircle,
  },
];

export const WorkflowTimeline: React.FC = () => {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-muted/20 border-y border-border/40">
      <div className="mx-auto max-w-7xl">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="rounded-full border border-royal/30 bg-royal/10 px-3.5 py-1 text-xs font-semibold text-royal dark:text-cielo uppercase tracking-wider">
            Flujo Operativo
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            De Almacén a Cuadrilla: 5 pasos sin fisuras
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Una cadena de custodia inquebrantable donde cada actor tiene una función clara,
            rápida y verificable.
          </p>
        </div>

        {/* Timeline Layout (Horizontal on Desktop, Vertical on Mobile) */}
        <div className="relative">
          {/* Desktop Connecting Line */}
          <div
            className="hidden lg:block absolute top-12 left-12 right-12 h-0.5 bg-gradient-to-r from-royal via-cielo to-emerald-500 opacity-40"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative flex flex-col items-start lg:items-center text-left lg:text-center group"
                >
                  {/* Step Icon Node */}
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-card border-2 border-royal/40 text-royal shadow-lg shadow-royal/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-royal">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-royal text-[10px] font-bold text-white shadow-sm">
                      {step.number}
                    </span>
                  </div>

                  {/* Step Description */}
                  <div className="mt-5 space-y-2">
                    <h3 className="text-base font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs font-semibold text-royal dark:text-cielo">
                      {step.tagline}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
