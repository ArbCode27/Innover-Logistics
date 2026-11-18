"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, Zap } from "lucide-react";

interface MetricItem {
  icon: React.ElementType;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  description: string;
}

const METRICS: MetricItem[] = [
  {
    icon: CheckCircle2,
    value: 99.9,
    prefix: "+",
    suffix: "%",
    label: "Precisión de stock",
    description: "Cero discrepancias entre sistema y almacén físico",
  },
  {
    icon: Clock,
    value: 30,
    prefix: "<",
    suffix: " s",
    label: "Registro de OT",
    description: "Descuento en campo desde el móvil del técnico",
  },
  {
    icon: ShieldCheck,
    value: 0,
    prefix: "",
    suffix: " desc.",
    label: "Discrepancias en traslados",
    description: "Confirmación en dos pasos mediante recepción atómica",
  },
  {
    icon: Zap,
    value: 100,
    prefix: "",
    suffix: "%",
    label: "Multi-sucursal en vivo",
    description: "Sincronización instantánea de bodegas y cuadrillas",
  },
];

export const ImpactMetrics: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative z-20 -mt-6 sm:-mt-10 px-4 sm:px-6 lg:px-8"
      aria-label="Métricas de impacto"
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-white/40 bg-white/60 dark:bg-card/60 dark:border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-royal/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y sm:divide-y-0 lg:divide-x divide-border/50">
            {METRICS.map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex flex-col space-y-2 ${
                    idx > 0 ? "pt-6 sm:pt-0 lg:pl-8" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal/10 text-royal dark:bg-royal/20">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {metric.label}
                    </span>
                  </div>

                  {/* Big Number Counter */}
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                    <span className="text-royal">{metric.prefix}</span>
                    <span>
                      {isVisible ? (
                        metric.value % 1 === 0 ? (
                          metric.value
                        ) : (
                          metric.value.toFixed(1)
                        )
                      ) : (
                        "0"
                      )}
                    </span>
                    <span className="text-xl sm:text-2xl text-muted-foreground">
                      {metric.suffix}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {metric.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
