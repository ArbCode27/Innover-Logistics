"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { nav, terms } from "@/lib/glossary";
import type { UserRole } from "@/types/inventory";

interface Destination {
  title: string;
  href: string;
  roles: UserRole[];
}

const DESTINATIONS: Destination[] = [
  { title: nav.inventory, href: "/inventario", roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"] },
  { title: nav.phoneEntry, href: "/inventario/registro-remoto", roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"] },
  { title: nav.receiveTransfer, href: "/guias/recepcion", roles: ["superadmin", "admin_sucursal"] },
  { title: nav.sendTransfer, href: "/guias/enviar", roles: ["superadmin", "admin_sucursal"] },
  { title: nav.crews, href: "/cuadrillas", roles: ["superadmin", "admin_sucursal"] },
  { title: nav.technicians, href: "/tecnicos", roles: ["superadmin", "admin_sucursal"] },
  { title: nav.approvals, href: "/aprobaciones", roles: ["superadmin"] },
  { title: nav.exits, href: "/consumos", roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"] },
  { title: nav.requests, href: "/solicitudes", roles: ["superadmin", "admin_sucursal", "reportador", "tecnico"] },
  { title: nav.history, href: "/historial", roles: ["superadmin", "admin_sucursal", "reportador"] },
  { title: nav.admin, href: "/admin", roles: ["superadmin"] },
];

interface GlobalSearchProps {
  role: UserRole;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ role }) => {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();
  const pages = DESTINATIONS.filter(
    (item) =>
      item.roles.includes(role) &&
      (trimmed.length === 0 || item.title.toLowerCase().includes(trimmed))
  ).slice(0, 6);

  React.useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    router.push(`/inventario?buscar=${encodeURIComponent(value)}`);
  };

  const handleOpenPage = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="global-search" className="sr-only">
          {terms.search} {terms.products.toLowerCase()} o pantallas
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="global-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={`${terms.search} producto o pantalla`}
          className="h-10 min-h-10 pl-9"
          autoComplete="off"
        />
      </form>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {trimmed.length > 0 ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                router.push(`/inventario?buscar=${encodeURIComponent(query.trim())}`);
              }}
            >
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Buscar «{query.trim()}» en inventario</span>
            </button>
          ) : null}
          {pages.map((page) => (
            <button
              key={page.href}
              type="button"
              className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
              onClick={() => handleOpenPage(page.href)}
            >
              {page.title}
            </button>
          ))}
          {pages.length === 0 && trimmed.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              Escribe un producto o el nombre de una pantalla.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
