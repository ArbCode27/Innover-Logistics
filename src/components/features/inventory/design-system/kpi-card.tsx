import * as React from "react";
import { TrendingUp, TrendingDown, LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "./surface";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon: LucideIcon;
  sparklineData?: number[];
  severity?: "default" | "warning" | "danger" | "success" | "brand";
  onClick?: () => void;
  isActive?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  sparklineData = [20, 35, 25, 45, 30, 55, 40, 60],
  severity = "default",
  onClick,
  isActive = false,
}) => {
  // Sparkline SVG path calculation
  const sparklinePath = React.useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return "";
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData) || 1;
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    return sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [sparklineData]);

  return (
    <Surface
      variant="glass"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative p-4 sm:p-5 flex flex-col justify-between overflow-hidden cursor-default transition-all duration-300",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-royal/5 hover:border-royal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal",
        isActive && "border-royal ring-2 ring-royal/20 bg-royal/[0.03]",
        severity === "danger" && "hover:border-rose-500/40",
        severity === "warning" && "hover:border-amber-500/40"
      )}
    >
      {/* Subtle top indicator */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            "p-2 rounded-xl border border-border/50 transition-colors",
            severity === "default" && "bg-muted/50 text-foreground group-hover:bg-royal/10 group-hover:text-royal",
            severity === "brand" && "bg-royal/10 text-royal border-royal/20",
            severity === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
            severity === "danger" && "bg-rose-500/10 text-rose-600 border-rose-500/20",
            severity === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {/* Main Metric Value & Delta */}
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {subtitle}
            </div>
          )}
        </div>

        {/* Mini Sparkline Chart */}
        <div className="hidden sm:block opacity-70 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-20 h-7 overflow-visible"
            viewBox="0 0 80 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={sparklinePath}
              className={cn(
                "stroke-2 stroke-linecap-round stroke-linejoin-round transition-all",
                severity === "danger"
                  ? "stroke-rose-500"
                  : severity === "warning"
                  ? "stroke-amber-500"
                  : "stroke-royal"
              )}
            />
          </svg>
        </div>
      </div>

      {/* Delta Row */}
      {delta && (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              delta.isNeutral
                ? "text-muted-foreground"
                : delta.isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {delta.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {delta.value}
          </span>
          <span className="text-[11px] text-muted-foreground">vs. periodo anterior</span>
        </div>
      )}
    </Surface>
  );
};
