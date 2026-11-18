"use client";

import React, { useRef, useState } from "react";
import { Boxes, Truck, Smartphone, ShieldCheck, ArrowRight, BarChart3, ScanLine, QrCode } from "lucide-react";
import Link from "next/link";

interface BentoCardProps {
  title: string;
  tagline: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  className?: string;
  children?: React.ReactNode;
}

const SpotlightCard: React.FC<BentoCardProps> = ({
  title,
  tagline,
  description,
  badge,
  icon: Icon,
  className = "",
  children,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-3xl border border-border/80 bg-white/70 dark:bg-card/70 backdrop-blur-xl p-6 sm:p-8 transition-all duration-300 hover:scale-[1.01] hover:border-royal/50 hover:shadow-2xl hover:shadow-royal/10 ${className}`}
    >
      {/* Spotlight Cursor Glow Effect */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-100"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 224, 0.15), transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Card Content Structure */}
      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-royal/10 text-royal dark:bg-royal/20">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {badge}
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-sm font-semibold text-royal dark:text-cielo">
              {tagline}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Visual Slot */}
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
};

export const FeatureBento: React.FC = () => {
  return (
    <section id="modulos" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="rounded-full border border-royal/30 bg-royal/10 px-3.5 py-1 text-xs font-semibold text-royal dark:text-cielo uppercase tracking-wider">
            Arquitectura de Módulos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Diseñado para la velocidad en campo y la certeza en almacén
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Elimina cuadernos, planillas Excel desactualizadas y pérdidas no registradas.
            Toda la cadena logística satelital y de telecomunicaciones en una suite integral.
          </p>
        </div>

        {/* Bento Grid (4 Cards: 2 Large, 2 Medium) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Module 1: Stock Central (7 cols) */}
          <SpotlightCard
            title="Stock Central & Sucursales"
            tagline="Cero pérdidas: trazabilidad de cada equipo y cada metro de cable en tiempo real"
            description="Control de existencias individualizado por número de serie, MAC address o metraje. Escaneo masivo bidireccional y balance contable continuo."
            badge="Existencias"
            icon={Boxes}
            className="lg:col-span-7"
          >
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ScanLine className="h-4 w-4 text-royal" /> Escaneo masivo por cámara o pistola
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  +124 seriales en 12s
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full w-[94%] bg-gradient-to-r from-royal to-cielo rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Routers, LNBs, Antenas Offset, Conectores RG6</span>
                <span className="font-mono">Exactitud: 100%</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Module 2: Guías de Traslado (5 cols) */}
          <SpotlightCard
            title="Guías de Traslado"
            tagline="Mueve material entre sedes con guías de despacho que nunca quedan a medias"
            description="Despachos protegidos contra extravíos. El material pasa a estado 'En Tránsito' y solo se acredita en destino cuando el receptor escanea y confirma recepción."
            badge="Intersedes"
            icon={Truck}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal/10 text-royal">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Guía GD-2026-089</span>
                  <span className="text-[11px] text-muted-foreground">Valencia → Maracay</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Atómico
              </span>
            </div>
          </SpotlightCard>

          {/* Module 3: Consumo en Campo (5 cols) */}
          <SpotlightCard
            title="Consumo en Campo"
            tagline="Cada material usado queda ligado a su Ticket/OT desde el celular del técnico"
            description="Interfaz ultra-liviana diseñada para condiciones de sol y baja señal. El instalador selecciona su cuadrilla, escanea el equipo e ingresa el ID de Orden de Trabajo."
            badge="Móvil PWA"
            icon={Smartphone}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">OT #9921 - Instalación DTH</span>
                <span className="text-[11px] text-muted-foreground">1x Decodificador • 25m RG6 • 1x LNB</span>
              </div>
              <span className="font-mono text-xs font-bold text-royal dark:text-cielo">
                18 seg
              </span>
            </div>
          </SpotlightCard>

          {/* Module 4: Auditoría y Seguridad (7 cols) */}
          <SpotlightCard
            title="Auditoría y Seguridad"
            tagline="Historial que no se puede alterar: cada movimiento deja huella"
            description="Bitácora inmutable en base de datos. Ningún usuario puede borrar existencias o alterar consumos pasados. Cada acción queda firmada con usuario, IP, fecha y hash de verificación."
            badge="Seguridad Estricta"
            icon={ShieldCheck}
            className="lg:col-span-7"
          >
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-500" /> Registro de Eventos Criptográficos
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">AUDIT-LOG-2026</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inalterabilidad garantizada a nivel de motor de base de datos. Certificación lista para auditorías operativas y fiscales.
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Action Link below Bento */}
        <div className="mt-12 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-royal hover:text-royal/80 dark:text-cielo transition-colors group"
          >
            <span>Conoce todos los reportes y vistas operativas</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};
