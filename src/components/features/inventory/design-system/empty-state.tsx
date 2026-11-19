import * as React from "react";
import { PackageSearch, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageSearch,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      role="region"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-border/70 rounded-2xl bg-card/40 backdrop-blur-xs",
        className
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-royal/10 text-royal flex items-center justify-center mb-4 ring-8 ring-royal/5">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="min-h-[44px] px-5 font-semibold"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size="sm"
              className="min-h-[44px] px-4 text-xs font-semibold"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
