import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-white/25 bg-white/15 dark:bg-white/5 dark:border-white/10 backdrop-blur-xl shadow-xl shadow-royal/5 p-5 sm:p-6 transition-all duration-300 hover:border-cielo/40 hover:shadow-2xl hover:shadow-royal/10",
        className
      )}
    >
      {/* Specular edge highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20"
        aria-hidden="true"
      />
      {children}
    </div>
  );
};
