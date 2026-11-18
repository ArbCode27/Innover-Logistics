"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Truck,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "./glass-card";
import { StockGauge } from "./stock-gauge";
import { BranchActivityCard } from "./branch-activity-card";
import { RestockAlertCard } from "./restock-alert-card";

type TabMode = "stock" | "traslados" | "consumo" | "auditoria";

interface TabMeta {
  id: TabMode;
  label: string;
  icon: React.ElementType;
  badge: string;
  gaugePercentage: number;
  gaugeLabel: string;
  gaugeSublabel: string;
  branchName: string;
  activityLevel: "ALTA" | "MEDIA" | "REGULAR";
  activeCrews: number;
  openDispatches: number;
  alertProduct: string;
  alertStock: number;
  alertBranch: string;
  alertType: "lnb" | "cable" | "router";
}

const TABS: TabMeta[] = [
  {
    id: "stock",
    label: "Stock Central",
    icon: Boxes,
    badge: "PRECISIÓN ATÓMICA",
    gaugePercentage: 99.9,
    gaugeLabel: "Exactitud en almacén",
    gaugeSublabel: "3,480 items serializados",
    branchName: "Almacén Central Valencia",
    activityLevel: "ALTA",
    activeCrews: 24,
    openDispatches: 6,
    alertProduct: "LNB Universal Ku Dual",
    alertStock: 12,
    alertBranch: "Sucursal Valencia",
    alertType: "lnb",
  },
  {
    id: "traslados",
    label: "Guías de Traslado",
    icon: Truck,
    badge: "DESPACHO ATÓMICO",
    gaugePercentage: 100,
    gaugeLabel: "Guías sin discrepancias",
    gaugeSublabel: "Validación doble QR en tránsito",
    branchName: "Ruta Valencia - Maracay",
    activityLevel: "MEDIA",
    activeCrews: 14,
    openDispatches: 3,
    alertProduct: "Bobina Coaxial RG6 300m",
    alertStock: 4,
    alertBranch: "Sede Maracay",
    alertType: "cable",
  },
  {
    id: "consumo",
    label: "Consumo en Campo",
    icon: Users,
    badge: "VINCULACIÓN OT",
    gaugePercentage: 99.4,
    gaugeLabel: "Consumo ligado a Tickets",
    gaugeSublabel: "Promedio registro: 18 segundos",
    branchName: "Zona Norte / Cuadrilla 08",
    activityLevel: "ALTA",
    activeCrews: 32,
    openDispatches: 9,
    alertProduct: "Router Wi-Fi 6 Gigabit",
    alertStock: 8,
    alertBranch: "Cuadrilla 04 Caracas",
    alertType: "router",
  },
  {
    id: "auditoria",
    label: "Auditoría Inmutable",
    icon: ShieldCheck,
    badge: "HISTORIAL CRIPTOGRÁFICO",
    gaugePercentage: 100,
    gaugeLabel: "Integridad de registros",
    gaugeSublabel: "Inalterable con hash de bloque",
    branchName: "Nodo Nacional Auditado",
    activityLevel: "ALTA",
    activeCrews: 120,
    openDispatches: 0,
    alertProduct: "Decodificador Satelital 4K",
    alertStock: 15,
    alertBranch: "Almacén Barquisimeto",
    alertType: "lnb",
  },
];

export const HeroInteractive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>("stock");

  const currentTabData = TABS.find((t) => t.id === activeTab) || TABS[0];

  const handleTabChange = (tabId: TabMode) => {
    setActiveTab(tabId);
  };

  return (
    <section className="relative pt-6 pb-16 md:pt-12 md:pb-24 lg:pt-16 lg:pb-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Horizontal Tabs Bar for Mobile Screens */}
        <div className="lg:hidden mb-8 flex items-center justify-start gap-1 overflow-x-auto pb-2 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-royal text-white shadow-md shadow-royal/25"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3-Column Layout: Left Text | Center Glass Cards | Right Vertical Selector */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          {/* Column 1: Left Copy & CTAs (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col items-start text-left space-y-6"
          >
            {/* Context Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-royal/30 bg-royal/10 px-3.5 py-1 text-xs font-semibold text-royal dark:text-cielo shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{currentTabData.badge}</span>
            </div>

            {/* H1 Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] xl:text-[3.25rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
              Cada equipo. Cada cuadrilla.{" "}
              <span className="bg-gradient-to-r from-royal via-cielo to-primary bg-clip-text text-transparent">
                Cada metro de cable
              </span>
              , bajo control.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Plataforma B2B para telecomunicaciones y servicios satelitales. Control de stock por
              sucursal y móvil, guías de traslado atómicas y consumo en campo
              vinculado a OTs con auditoría inmutable.
            </p>

            {/* Double CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-royal text-white hover:bg-royal/90 shadow-lg shadow-royal/25 font-semibold px-6 h-12"
              >
                <Link href="/login" aria-label="Ingresar al sistema Star Conectados">
                  Ingresar al sistema
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-border/80 bg-background/60 backdrop-blur-md hover:bg-muted font-medium px-6 h-12"
              >
                <a href="#como-funciona" aria-label="Ver cómo funciona el flujo de inventario">
                  Ver cómo funciona
                </a>
              </Button>
            </div>

            {/* Micro Feature Proof Points */}
            <div className="grid grid-cols-2 gap-3 pt-4 text-xs font-medium text-muted-foreground border-t border-border/40 w-full">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Descuento de stock atómico</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Escaneo masivo de seriales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Aislamiento estricto de sucursal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>Registro móvil en menos de 30s</span>
              </div>
            </div>
          </motion.div>

          {/* Column 2: Center Floating Glass Stack (5 cols) */}
          <div className="lg:col-span-5 relative">
            {/* Ambient Radial Backlight */}
            <div
              className="absolute -inset-4 rounded-full bg-royal/10 blur-2xl dark:bg-royal/20 pointer-events-none"
              aria-hidden="true"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col gap-4"
              >
                {/* Card 1: Stock Gauge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="z-20"
                >
                  <GlassCard>
                    <StockGauge
                      percentage={currentTabData.gaugePercentage}
                      label={currentTabData.gaugeLabel}
                      sublabel={currentTabData.gaugeSublabel}
                    />
                  </GlassCard>
                </motion.div>

                {/* Card 2: Branch Activity Map */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="z-10 -mt-2"
                >
                  <GlassCard>
                    <BranchActivityCard
                      branchName={currentTabData.branchName}
                      activityLevel={currentTabData.activityLevel}
                      activeCrews={currentTabData.activeCrews}
                      openDispatches={currentTabData.openDispatches}
                    />
                  </GlassCard>
                </motion.div>

                {/* Card 3: Solid White Restock Alert Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="z-30 -mt-2"
                >
                  <RestockAlertCard
                    productName={currentTabData.alertProduct}
                    branch={currentTabData.alertBranch}
                    currentStock={currentTabData.alertStock}
                    productType={currentTabData.alertType}
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Column 3: Right Vertical Pillar Selector (2 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center relative"
          >
            {/* Orbital Curve / Line Background */}
            <div
              className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-royal/30 to-transparent"
              aria-hidden="true"
            />

            <div
              className="flex flex-col gap-5 relative z-10 w-full"
              role="tablist"
              aria-label="Selector de módulos de inventario"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`hero-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`hero-panel-${tab.id}`}
                    onClick={() => handleTabChange(tab.id)}
                    className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? "bg-white/90 dark:bg-card/90 shadow-md shadow-royal/10 border border-royal/30 translate-x-1"
                        : "bg-muted/30 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {/* Active Accent Dot on Line */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-royal text-white shadow-sm shadow-royal/30"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-xs font-bold tracking-tight truncate ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 truncate">
                        {isActive ? "Visualizando" : "Explorar"}
                      </span>
                    </div>

                    <ChevronRight
                      className={`ml-auto h-3.5 w-3.5 transition-transform ${
                        isActive ? "text-royal translate-x-0.5" : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Hero Bottom Anchor Elements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground"
        >
          {/* Bottom Left: Avatars + +120 Técnicos Activos */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-royal text-[11px] font-bold text-white ring-2 ring-background">
                JD
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cielo text-[11px] font-bold text-marino ring-2 ring-background">
                CM
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-marino text-[11px] font-bold text-white ring-2 ring-background">
                RR
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background ring-2 ring-background">
                +120
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-xs">
                +120 técnicos y coordinadores
              </span>
              <span>Operando en campo en tiempo real</span>
            </div>
          </div>

          {/* Bottom Right: Connected Branches Pin */}
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 backdrop-blur-sm">
            <MapPin className="h-4 w-4 text-royal shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">
              Sucursales conectadas en tiempo real:
            </span>
            <span className="font-mono text-xs font-semibold text-royal dark:text-cielo">
              Valencia • Maracay • Caracas • Barquisimeto
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
