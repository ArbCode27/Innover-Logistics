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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/inventory";

interface AppSidebarProps {
  role: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Inventario",
    href: "/inventario",
    icon: Boxes,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: "Registro con Teléfono",
    href: "/inventario/registro-remoto",
    icon: Camera,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
    badge: "QR",
  },
  {
    title: "Recepción de Guías",
    href: "/guias/recepcion",
    icon: PackageCheck,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: "Emitir Traslado",
    href: "/guias/enviar",
    icon: Truck,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: "Cuadrillas",
    href: "/cuadrillas",
    icon: Users,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: "Consumos de Campo",
    href: "/consumos",
    icon: Flame,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
    badge: "<30s",
  },
  {
    title: "Solicitudes",
    href: "/solicitudes",
    icon: FileQuestion,
    roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"],
  },
  {
    title: "Historial & Ledger",
    href: "/historial",
    icon: History,
    roles: ["superadmin", "admin_sucursal"],
  },
  {
    title: "Administración",
    href: "/admin",
    icon: Settings,
    roles: ["superadmin"],
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({ role }) => {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = React.useState<boolean>(false);

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleToggleMobile = (): void => {
    setIsOpenMobile(!isOpenMobile);
  };

  const handleCloseMobile = (): void => {
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Menu Trigger Header Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleToggleMobile}
          size="icon"
          className="h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground focus:ring-4 focus:ring-primary/40"
          aria-label={isOpenMobile ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        >
          {isOpenMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-card transition-transform duration-300 md:sticky md:translate-x-0 overflow-y-auto",
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col gap-1 p-4">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operaciones ISP
          </div>

          <nav className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/inventario" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleCloseMobile}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{item.title}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 px-3 py-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Regla de Stock:</p>
            <p>
              El stock nunca se edita manualmente. Es el resultado directo del
              ledger auditado.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
