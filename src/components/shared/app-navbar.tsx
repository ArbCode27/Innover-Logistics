"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Building2, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GlobalSearch } from "@/components/shared/global-search";
import { logoutAction } from "@/actions/auth";
import { buttons, roles } from "@/lib/glossary";
import type { Profile } from "@/types/inventory";

interface AppNavbarProps {
  profile: Profile;
  branchName?: string;
  onOpenMenu: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  profile,
  branchName,
  onOpenMenu,
}) => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    await logoutAction();
  };

  const roleLabel =
    roles[profile.role as keyof typeof roles] ?? profile.role;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Link
          href="/inventario"
          className="flex shrink-0 items-center gap-2 rounded-md p-1 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="hidden lg:block">
            <div className="text-base font-extrabold leading-none tracking-tight text-foreground">
              Star Conectados
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Inventario
            </span>
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <GlobalSearch role={profile.role} />
        </div>

        {branchName ? (
          <div className="hidden items-center gap-1.5 border-l pl-3 text-xs text-muted-foreground xl:flex">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">{branchName}</span>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs sm:flex">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-[8rem] truncate font-semibold text-foreground md:max-w-[10rem]">
              {profile.full_name}
            </span>
            <Badge variant="secondary" className="hidden px-1.5 py-0 text-[10px] lg:inline-flex">
              {roleLabel}
            </Badge>
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-2 text-muted-foreground hover:text-destructive sm:px-3"
            aria-label={buttons.logout}
          >
            <LogOut className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden text-xs font-medium sm:inline">
              {isLoggingOut ? "Saliendo..." : buttons.logout}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
