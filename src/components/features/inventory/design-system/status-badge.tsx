import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Flame,
  ShieldAlert,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InventoryStatusType =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "in_transit"
  | "damaged"
  | "allocated";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: InventoryStatusType;
  label?: string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  InventoryStatusType,
  {
    defaultLabel: string;
    icon: LucideIcon;
    classes: string;
    dotClass: string;
  }
> = {
  in_stock: {
    defaultLabel: "En Stock",
    icon: CheckCircle2,
    classes:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dotClass: "bg-emerald-500",
  },
  low_stock: {
    defaultLabel: "Bajo Stock",
    icon: AlertTriangle,
    classes:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  out_of_stock: {
    defaultLabel: "Agotado",
    icon: XCircle,
    classes:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dotClass: "bg-rose-500",
  },
  in_transit: {
    defaultLabel: "En Tránsito",
    icon: Truck,
    classes:
      "bg-royal/10 text-royal dark:text-cielo border-royal/30",
    dotClass: "bg-royal",
  },
  damaged: {
    defaultLabel: "Dañado",
    icon: ShieldAlert,
    classes:
      "bg-rose-500/5 text-rose-700 dark:text-rose-300 border-rose-500/40 border-dashed",
    dotClass: "bg-rose-400",
  },
  allocated: {
    defaultLabel: "Asignado",
    icon: Flame,
    classes:
      "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dotClass: "bg-sky-500",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
  className,
  ...props
}) => {
  const config = STATUS_CONFIG[status] || {
    defaultLabel: "Desconocido",
    icon: HelpCircle,
    classes: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  };

  const IconComponent = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      role="status"
      aria-label={`Estado: ${displayLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border tracking-tight transition-colors select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        config.classes,
        className
      )}
      {...props}
    >
      <IconComponent
        className={cn(
          "shrink-0",
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
        )}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
};
