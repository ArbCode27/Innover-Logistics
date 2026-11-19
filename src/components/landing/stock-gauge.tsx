import React from "react";
import { CheckCircle2, Shield } from "lucide-react";

interface StockGaugeProps {
  percentage?: number;
  label?: string;
  sublabel?: string;
}

export const StockGauge: React.FC<StockGaugeProps> = ({
  percentage = 99.9,
  label = "Precisión de stock",
  sublabel = "Trazabilidad serializada",
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Arc calculation for 75% gauge sweep
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength * (1 - Math.min(percentage, 100) / 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-royal/10 text-royal dark:bg-royal/20">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          <span>Historial activo</span>
        </div>
      </div>

      {/* Circular SVG Gauge (SyncDepth Bite Alert Inspired) */}
      <div className="relative flex items-center justify-center py-2 px-4">
        <svg
          className="h-36 w-36 -rotate-90 transform"
          viewBox="0 0 130 130"
          aria-hidden="true">
          {/* Background Outer Dotted Track */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="2 6"
            className="text-muted/40 dark:text-white/10"
          />

          {/* Solid Arc Backdrop */}
          <circle
            cx="65"
            cy="65"
            r={radius - 8}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference}`}
            className="text-muted/30 dark:text-white/10"
            strokeLinecap="round"
          />

          {/* Active Animated Gauge Progress Bar */}
          <circle
            cx="65"
            cy="65"
            r={radius - 8}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id="gauge-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%">
              <stop offset="0%" stopColor="hsl(var(--royal))" />
              <stop offset="100%" stopColor="hsl(var(--cielo))" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {percentage}%
          </span>
          <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Cero Merma
          </span>
        </div>
      </div>

      {/* Footer info pills */}
      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
        <span>{sublabel}</span>
        <span className="font-mono font-medium text-foreground">
          OT-8842-OK
        </span>
      </div>
    </div>
  );
};
