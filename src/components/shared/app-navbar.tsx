"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Building2, LogOut, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logoutAction } from "@/actions/auth";
import type { Profile } from "@/types/inventory";

interface AppNavbarProps {
  profile: Profile;
  branchName?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ profile, branchName }) => {
  const [isLoggingOut, setIsLoggingOut] = React.useState<boolean>(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    await logoutAction();
  };

  const getRoleLabel = (role: string): { label: string; variant: "default" | "info" | "warning" | "success" } => {
    switch (role) {
      case "superadmin":
        return { label: "Superadmin Global", variant: "default" };
      case "admin_sucursal":
        return { label: "Admin Sucursal", variant: "info" };
      case "reportador":
        return { label: "Reportador Campo", variant: "warning" };
      case "tecnico":
        return { label: "Técnico Cuadrilla", variant: "success" };
      default:
        return { label: role, variant: "default" };
    }
  };

  const roleInfo = getRoleLabel(profile.role);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <Link href="/inventario" className="flex items-center gap-2 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-extrabold tracking-tight leading-none text-foreground">
                Star Conectados
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Tv Star Satellite • Innover
              </span>
            </div>
          </Link>

          {branchName && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium text-foreground">{branchName}</span>
            </div>
          )}
        </div>

        {/* Right User & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Badge */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 border text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold text-foreground max-w-[120px] sm:max-w-[180px] truncate">
              {profile.full_name}
            </span>
            <Badge variant={roleInfo.variant} className="text-[10px] py-0 px-1.5">
              {roleInfo.label}
            </Badge>
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px] px-2 sm:px-3"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline text-xs font-medium">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
