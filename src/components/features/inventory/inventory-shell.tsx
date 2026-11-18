import * as React from "react";
import { cn } from "@/lib/utils";

interface InventoryShellProps {
  children: React.ReactNode;
  className?: string;
}

export const InventoryShell: React.FC<InventoryShellProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative w-full space-y-6 pb-16 selection:bg-royal/20 selection:text-royal",
        className
      )}
    >
      {/* Sutil halo ambiental Star Conectados Luxury (sin topomapa ni ruido visual en zona operativa) */}
      <div
        className="pointer-events-none fixed top-0 right-1/4 -z-10 h-[500px] w-[600px] rounded-full bg-radial from-royal/5 via-cielo/5 to-transparent blur-3xl opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-10 left-10 -z-10 h-[400px] w-[500px] rounded-full bg-radial from-marino/5 via-royal/5 to-transparent blur-3xl opacity-50"
        aria-hidden="true"
      />

      {children}
    </div>
  );
};
