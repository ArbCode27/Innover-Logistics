"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Cpu,
  Flame,
  PlusCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import type {
  Location,
  SerializedItemWithDetails,
  StockItemWithBalance,
  UserRole,
} from "@/types/inventory";

interface InventoryViewProps {
  initialStock: StockItemWithBalance[];
  locations: Location[];
  serializedUnits: SerializedItemWithDetails[];
  userRole: UserRole;
  currentLocationId: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  initialStock,
  locations,
  serializedUnits,
  userRole,
  currentLocationId,
}) => {
  const [selectedLocation, setSelectedLocation] =
    React.useState<string>(currentLocationId);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [onlyLowStock, setOnlyLowStock] = React.useState<boolean>(false);
  const [activeSerialItem, setActiveSerialItem] =
    React.useState<StockItemWithBalance | null>(null);

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    initialStock.forEach((i) => cats.add(i.category));
    return Array.from(cats);
  }, [initialStock]);

  const filteredStock = React.useMemo(() => {
    return initialStock.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesLowStock = !onlyLowStock || item.is_low_stock;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [initialStock, searchTerm, categoryFilter, onlyLowStock]);

  const lowStockCount = initialStock.filter((i) => i.is_low_stock).length;
  const serializedCount = initialStock.filter((i) => i.is_serialized).length;

  const currentItemSerials = React.useMemo(() => {
    if (!activeSerialItem) return [];
    return serializedUnits.filter((u) => u.item_id === activeSerialItem.id);
  }, [activeSerialItem, serializedUnits]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="h-7 w-7 text-primary" aria-hidden="true" />
            Control de Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            Stock en tiempo real calculado por el ledger inmutable de
            movimientos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["superadmin", "admin_sucursal"].includes(userRole) && (
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link href="/guias/enviar">
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                Emitir Traslado
              </Link>
            </Button>
          )}

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/consumos">
              <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              Reportar Consumo
            </Link>
          </Button>

          {userRole === "superadmin" && (
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link href="/admin">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Nuevo Ítem
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Ítems en Catálogo
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {initialStock.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {serializedCount} equipos controlados por serial / MAC
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border shadow-sm ${
            lowStockCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Alertas de Stock Crítico
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {lowStockCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className="text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-none"
            >
              {onlyLowStock ? "Ver todos los ítems" : "Filtrar bajo stock mínimo"}
            </button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Ubicación Consultada
            </CardDescription>
            <CardTitle className="text-lg font-bold truncate">
              {locations.find((l) => l.id === selectedLocation)?.name ||
                "Almacén Principal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">
              {locations.find((l) => l.id === selectedLocation)?.type === "crew"
                ? "Cuadrilla Técnica de Campo"
                : "Depósito / Almacén de Sede"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Location Selector Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción, modelo o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
                aria-label="Buscar material en inventario"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                aria-label="Filtrar por categoría"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Location Selector */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                aria-label="Seleccionar almacén o cuadrilla"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type === "crew" ? "Cuadrilla" : "Almacén"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">SKU</TableHead>
              <TableHead>Descripción / Material</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead className="text-center">Unidad</TableHead>
              <TableHead className="text-right">Stock Mínimo</TableHead>
              <TableHead className="text-right font-bold">
                Stock Disponible
              </TableHead>
              <TableHead className="text-center w-[110px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <SlidersHorizontal className="h-6 w-6 text-muted-foreground/50" />
                    <p className="font-medium">
                      No se encontraron materiales con los filtros aplicados.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStock.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.is_low_stock ? "bg-amber-500/5" : undefined}
                >
                  <TableCell className="font-mono text-xs font-semibold">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </div>
                    )}
                    {item.is_serialized && (
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] gap-1"
                      >
                        <Cpu className="h-3 w-3" />
                        Serial / MAC individual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {item.category}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <Badge variant="outline">{item.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {formatNumber(Number(item.min_stock), 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-base">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.is_low_stock && (
                        <span title="Stock por debajo o igual al mínimo">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        </span>
                      )}
                      <span
                        className={
                          item.is_low_stock
                            ? "text-amber-600 dark:text-amber-400 font-extrabold"
                            : "text-foreground"
                        }
                      >
                        {formatNumber(Number(item.current_stock), 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.is_serialized ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSerialItem(item)}
                        className="text-xs h-8 px-2 min-h-[36px]"
                        aria-label={`Ver seriales de ${item.name}`}
                      >
                        Ver Serials
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-2 text-muted-foreground min-h-[36px]"
                      >
                        <Link href="/solicitudes">Pedir</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Serial Units Modal Dialog */}
      <Dialog
        open={!!activeSerialItem}
        onOpenChange={(open) => !open && setActiveSerialItem(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Unidades Serializadas ({activeSerialItem?.name})
            </DialogTitle>
            <DialogDescription>
              Control trazable individual por Serial Number y dirección MAC.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
              <span>SKU: {activeSerialItem?.sku}</span>
              <span>
                Total registrados en esta ubicación:{" "}
                {currentItemSerials.length}
              </span>
            </div>

            {currentItemSerials.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay unidades físicas disponibles en este depósito para este
                ítem.
              </div>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {currentItemSerials.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <div className="font-mono font-semibold">
                        {s.serial_number}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        MAC: {s.mac_address || "Sin MAC"}
                      </div>
                    </div>
                    <Badge variant="success">Disponible en stock</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
