import * as React from "react";
import { cn } from "@/lib/utils";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "subtle" | "floating";
  glow?: boolean;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, variant = "default", glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-300",
          // Variant mappings aligned with Star Conectados Luxury tokens
          variant === "default" &&
            "bg-card text-card-foreground border border-border/60 shadow-xs",
          variant === "glass" &&
            "bg-card/85 text-card-foreground border border-border/50 backdrop-blur-md shadow-sm hover:border-royal/40",
          variant === "subtle" &&
            "bg-muted/40 text-foreground border border-border/30",
          variant === "floating" &&
            "bg-card/90 text-card-foreground border border-border/40 shadow-xl backdrop-blur-md",
          glow &&
            "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-royal/10 before:to-cielo/10 before:-z-10",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Surface.displayName = "Surface";

export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Surface
      ref={ref}
      variant="glass"
      className={cn("p-5 sm:p-6", className)}
      {...props}
    >
      {children}
    </Surface>
  );
});
GlassCard.displayName = "GlassCard";
