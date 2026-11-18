import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Satellite, Cable, Router } from "lucide-react";

interface RestockAlertCardProps {
  productName?: string;
  sku?: string;
  branch?: string;
  currentStock?: number;
  minThreshold?: number;
  productType?: "lnb" | "cable" | "router";
}

export const RestockAlertCard: React.FC<RestockAlertCardProps> = ({
  productName = "LNB Universal Ku Dual",
  sku = "LNB-KU-DUAL-02",
  branch = "Sucursal Valencia",
  currentStock = 12,
  minThreshold = 35,
  productType = "lnb",
}) => {
  const getProductIcon = () => {
    switch (productType) {
      case "cable":
        return <Cable className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
      case "router":
        return <Router className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
      default:
        return <Satellite className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border border-border/80 p-4 sm:p-5 shadow-lg shadow-black/5 dark:shadow-royal/10 transition-all duration-300 hover:border-royal/40">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          <span>Alerta de reposición</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{branch}</span>
      </div>

      {/* Product Information */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
          {getProductIcon()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">
            {productName}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Stock actual:{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {currentStock} uds
            </span>{" "}
            (Mínimo: {minThreshold})
          </span>
        </div>
      </div>

      {/* Interactive Action Row */}
      <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Sugerido:</span>
          <span className="rounded-md bg-royal/10 text-royal dark:text-cielo px-1.5 py-0.5 text-[10px] font-bold font-mono">
            +50 uds
          </span>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:text-royal/80 dark:text-cielo transition-colors group"
          aria-label="Generar traslado para reponer stock"
        >
          <span>Generar traslado</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
