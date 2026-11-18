import React from "react";
import { Activity, Radio, MapPin } from "lucide-react";

interface BranchActivityCardProps {
  branchName?: string;
  activityLevel?: "ALTA" | "MEDIA" | "REGULAR";
  activeCrews?: number;
  openDispatches?: number;
}

export const BranchActivityCard: React.FC<BranchActivityCardProps> = ({
  branchName = "Nodo Central Valencia",
  activityLevel = "ALTA",
  activeCrews = 18,
  openDispatches = 4,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cielo/20 text-royal dark:bg-cielo/15 dark:text-cielo">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
            Actividad por sucursal
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-royal/10 border border-royal/20 px-2.5 py-0.5 text-[10px] font-bold text-royal dark:text-cielo">
          <span className="h-1.5 w-1.5 rounded-full bg-royal animate-ping" />
          <span>ACTIVIDAD: {activityLevel}</span>
        </div>
      </div>

      {/* Abstract Topo Map SVG with Pulsing Radar Nodes (Spot Intel Inspired) */}
      <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-muted/20 dark:bg-black/20 border border-border/30 p-3 flex flex-col justify-between">
        <svg
          className="absolute inset-0 h-full w-full opacity-30 dark:opacity-40"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M 10 20 Q 80 5 150 25 T 320 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="2 3"
          />
          <path
            d="M 0 50 Q 90 35 180 55 T 340 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <path
            d="M 15 80 Q 110 65 210 85 T 350 70"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="4 4"
          />
          <circle cx="65" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="210" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
        </svg>

        {/* Pulsing Nodes Overlay */}
        <div className="relative z-10 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
            {branchName}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">CARABOBO-01</span>
        </div>

        {/* Node Points */}
        <div className="relative z-10 flex items-center gap-6 self-center my-auto">
          {/* Node 1 */}
          <div className="relative flex flex-col items-center">
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="h-8 w-8 rounded-full bg-background/80 dark:bg-carbon/80 border border-royal/40 flex items-center justify-center text-royal shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-[9px] text-muted-foreground mt-1">Cuadrilla Alfa</span>
          </div>

          {/* Node 2 */}
          <div className="relative flex flex-col items-center">
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-royal opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-royal" />
            </span>
            <div className="h-8 w-8 rounded-full bg-background/80 dark:bg-carbon/80 border border-royal/40 flex items-center justify-center text-royal shadow-sm">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-[9px] text-muted-foreground mt-1">Sede Central</span>
          </div>

          {/* Node 3 */}
          <div className="relative flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-background/80 dark:bg-carbon/80 border border-border flex items-center justify-center text-muted-foreground shadow-sm">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="text-[9px] text-muted-foreground mt-1">Almacén B</span>
          </div>
        </div>

        {/* Sub metrics */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
          <span>{activeCrews} cuadrillas en ruta</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {openDispatches} traslados validados
          </span>
        </div>
      </div>
    </div>
  );
};
