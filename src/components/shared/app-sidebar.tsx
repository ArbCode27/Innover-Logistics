"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Camera,
  Truck,
  PackageCheck,
  Users,
  Flame,
  FileQuestion,
  History,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hints, nav } from "@/lib/glossary";
import type { UserRole } from "@/types/inventory";

interface AppSidebarProps {
  role: UserRole;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: nav.inventory,
    href: "/inventario",
    icon: Boxes,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: nav.phoneEntry,
    href: "/inventario/registro-remoto",
    icon: Camera,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: nav.receiveTransfer,
    href: "/guias/recepcion",
    icon: PackageCheck,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: nav.sendTransfer,
    href: "/guias/enviar",
    icon: Truck,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: nav.crews,
    href: "/cuadrillas",
    icon: Users,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: nav.technicians,
    href: "/tecnicos",
    icon: UserRound,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: nav.approvals,
    href: "/aprobaciones",
    icon: ShieldCheck,
    roles: ["superadmin"],
  },
  {
    title: nav.exits,
    href: "/consumos",
    icon: Flame,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: nav.requests,
    href: "/solicitudes",
    icon: FileQuestion,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: nav.history,
    href: "/historial",
    icon: History,
    roles: ["superadmin", "admin_sucursal", "reportador"],
  },
  {
    title: nav.admin,
    href: "/admin",
    icon: Settings,
    roles: ["superadmin"],
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  mobileOpen,
  onMobileOpenChange,
}) => {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  React.useEffect(() => {
    onMobileOpenChange(false);
    // El setter de React es estable; se cierra el menú al cambiar de pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleClose = (): void => {
    onMobileOpenChange(false);
  };

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={handleClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed top-16 z-40 h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r bg-card transition-transform duration-300 md:sticky md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col gap-1 p-4">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {nav.section}
          </div>

          <nav className="space-y-1" aria-label="Secciones">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/inventario"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={handleClose}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 space-y-1 rounded-lg border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Cantidad disponible</p>
            <p>{hints.stockRule}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
