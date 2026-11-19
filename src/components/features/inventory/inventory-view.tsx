"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Camera,
  CheckCircle2,
  Cpu,
  Flame,
  Layers,
  Plus,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Wrench,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import { MassiveScanModal } from "@/components/features/inventory/massive-scan-modal";
import { LocalPurchaseModal } from "@/components/features/inventory/local-purchase-modal";
import { ShoppingCart } from "lucide-react";
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
  const router = useRouter();

  // Filter States
  const [selectedLocation, setSelectedLocation] =
    React.useState<string>(currentLocationId);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [natureFilter, setNatureFilter] = React.useState<string>("all");
  const [onlyLowStock, setOnlyLowStock] = React.useState<boolean>(false);

  // Modals
  const [activeSerialItem, setActiveSerialItem] =
    React.useState<StockItemWithBalance | null>(null);
  const [isMassiveScanOpen, setIsMassiveScanOpen] =
    React.useState<boolean>(false);
  const [isLocalPurchaseOpen, setIsLocalPurchaseOpen] =
    React.useState<boolean>(false);
  const [preselectedItemId, setPreselectedItemId] =
    React.useState<string | null>(null);

  // Available categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    initialStock.forEach((i) => cats.add(i.category));
    return Array.from(cats);
  }, [initialStock]);

  // Stock Filter Logic
  const filteredStock = React.useMemo(() => {
    return initialStock.filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const isTool = item.category === "Herramientas";
      const isSerializedActive =
        item.is_serialized && item.category !== "Herramientas";
      const isConsumable = !item.is_serialized;

      let matchesNature = true;
      if (natureFilter === "serialized") {
        matchesNature = isSerializedActive;
      } else if (natureFilter === "tools") {
        matchesNature = isTool;
      } else if (natureFilter === "consumables") {
        matchesNature = isConsumable;
      }

      const matchesLowStock = !onlyLowStock || item.is_low_stock;

      return matchesSearch && matchesCategory && matchesNature && matchesLowStock;
    });
  }, [initialStock, searchTerm, categoryFilter, natureFilter, onlyLowStock]);

  // Counts & Statistics
  const lowStockCount = initialStock.filter((i) => i.is_low_stock).length;
  const serializedCount = initialStock.filter(
    (i) => i.is_serialized && i.category !== "Herramientas"
  ).length;
  const toolsCount = initialStock.filter((i) => i.category === "Herramientas").length;
  const consumablesCount = initialStock.filter((i) => !i.is_serialized).length;

  const currentItemSerials = React.useMemo(() => {
    if (!activeSerialItem) return [];
    return serializedUnits.filter((u) => u.item_id === activeSerialItem.id);
  }, [activeSerialItem, serializedUnits]);

  // Open scan modal for specific item
  const handleOpenScanForItem = (itemId: string): void => {
    setPreselectedItemId(itemId);
    setIsMassiveScanOpen(true);
  };

  // Open scan modal generic
  const handleOpenGenericScan = (): void => {
    setPreselectedItemId(null);
    setIsMassiveScanOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Navigation */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="h-7 w-7 text-primary" aria-hidden="true" />
            Control de Inventario & Almacén
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stock en tiempo real y registro ágil de entradas con cámara para ONUs, Routers, consumibles y herramientas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          {/* Main Action: Massive Ingestion Modal with Camera */}
          <Button
            onClick={handleOpenGenericScan}
            size="sm"
            className="gap-2 shadow-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 min-h-[40px]"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Ingreso con Cámara
          </Button>

          {/* Action: Local Purchase for Branches */}
          {["superadmin", "admin_sucursal"].includes(userRole) && (
            <Button
              onClick={() => setIsLocalPurchaseOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10 font-semibold px-3 min-h-[40px]"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Ingreso Compra Local
            </Button>
          )}

          {["superadmin", "admin_sucursal"].includes(userRole) && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-sm min-h-[40px]">
              <Link href="/guias/enviar">
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                Emitir Traslado
              </Link>
            </Button>
          )}

          <Button asChild variant="outline" size="sm" className="gap-1.5 min-h-[40px]">
            <Link href="/consumos">
              <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              Órdenes de Salida
            </Link>
          </Button>

          {userRole === "superadmin" && (
            <Button asChild variant="secondary" size="sm" className="gap-1.5 min-h-[40px]">
              <Link href="/admin">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Nuevo Tipo
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card
          onClick={() => setNatureFilter("all")}
          className={`border shadow-sm cursor-pointer transition-all hover:border-primary/50 ${
            natureFilter === "all" ? "ring-2 ring-primary/30 border-primary" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Total Catálogo
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{initialStock.length}</span>
              <Boxes className="h-5 w-5 text-muted-foreground/60" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Ítems activos en inventario
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setNatureFilter(natureFilter === "serialized" ? "all" : "serialized")}
          className={`border shadow-sm cursor-pointer transition-all hover:border-primary/50 ${
            natureFilter === "serialized" ? "ring-2 ring-primary/30 border-primary" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Equipos Serial + MAC
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between text-primary">
              <span>{serializedCount}</span>
              <Cpu className="h-5 w-5 text-primary/70" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ONUs Lanly, Routers, Switches
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setNatureFilter(natureFilter === "tools" ? "all" : "tools")}
          className={`border shadow-sm cursor-pointer transition-all hover:border-primary/50 ${
            natureFilter === "tools" ? "ring-2 ring-primary/30 border-primary" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Herramientas
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{toolsCount}</span>
              <Wrench className="h-5 w-5 text-muted-foreground/60" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Fusionadoras, OTDRs, Medidores
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border shadow-sm transition-all ${
            lowStockCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Alertas de Stock
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {lowStockCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              size="sm"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className="p-0 h-auto text-xs font-semibold text-primary underline underline-offset-4"
            >
              {onlyLowStock ? "Ver todos los ítems" : "Filtrar bajo stock mínimo"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Location Selector Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Quick Nature Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Filtrar por tipo:</span>
            <Button
              size="sm"
              variant={natureFilter === "all" ? "default" : "outline"}
              onClick={() => setNatureFilter("all")}
              className="h-8 text-xs rounded-full px-3"
            >
              Todos ({initialStock.length})
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "serialized" ? "default" : "outline"}
              onClick={() => setNatureFilter("serialized")}
              className="h-8 text-xs rounded-full px-3 gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5" /> Equipos (ONU / Router)
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "consumables" ? "default" : "outline"}
              onClick={() => setNatureFilter("consumables")}
              className="h-8 text-xs rounded-full px-3 gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" /> Consumibles ({consumablesCount})
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "tools" ? "default" : "outline"}
              onClick={() => setNatureFilter("tools")}
              className="h-8 text-xs rounded-full px-3 gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5" /> Herramientas ({toolsCount})
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción, modelo (Lanly), SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
                aria-label="Buscar material en inventario"
              />
            </div>

            {/* Category and Location Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="w-full sm:w-56">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => setCategoryFilter(val)}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-64">
                <Select
                  value={selectedLocation}
                  onValueChange={(val) => setSelectedLocation(val)}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Almacén o cuadrilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type === "crew" ? "Cuadrilla" : "Almacén"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">SKU</TableHead>
              <TableHead>Producto / Tipo de Equipo</TableHead>
              <TableHead className="hidden md:table-cell">Control / Tipo</TableHead>
              <TableHead className="text-center">Unidad</TableHead>
              <TableHead className="text-right">Stock Mínimo</TableHead>
              <TableHead className="text-right font-bold">
                Stock Disponible
              </TableHead>
              <TableHead className="text-center w-[160px]">Acciones</TableHead>
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
              filteredStock.map((item) => {
                const isLanly = item.name.toLowerCase().includes("lanly");
                const isTool = item.category === "Herramientas";

                return (
                  <TableRow
                    key={item.id}
                    className={item.is_low_stock ? "bg-amber-500/5" : undefined}
                  >
                    <TableCell className="font-mono text-xs font-semibold">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : isTool ? (
                            <Wrench className="h-5 w-5 text-muted-foreground/60" />
                          ) : item.is_serialized ? (
                            <Cpu className="h-5 w-5 text-primary/60" />
                          ) : (
                            <Boxes className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isLanly && (
                              <Badge className="bg-primary/15 text-primary text-[10px] px-1.5 py-0">
                                Lanly
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.is_serialized ? (
                        item.category === "Herramientas" ? (
                          <Badge variant="outline" className="text-[11px] gap-1">
                            <Wrench className="h-3 w-3 text-primary" /> Serial
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] gap-1 font-mono">
                            <Cpu className="h-3 w-3 text-primary" /> SN + MAC
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
                          <Layers className="h-3 w-3" /> Consumible
                        </Badge>
                      )}
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
                          <span title="Stock por debajo del mínimo">
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
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenScanForItem(item.id)}
                          className="h-8 px-2.5 text-xs gap-1 shadow-sm"
                          title="Registrar entrada de este producto con cámara"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Ingresar</span>
                        </Button>

                        {item.is_serialized ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveSerialItem(item)}
                            className="text-xs h-8 px-2"
                            aria-label={`Ver seriales de ${item.name}`}
                          >
                            Series
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 px-2 text-muted-foreground"
                          >
                            <Link href="/solicitudes">Pedir</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Massive Ingestion with Camera Modal */}
      <MassiveScanModal
        open={isMassiveScanOpen}
        onOpenChange={setIsMassiveScanOpen}
        items={initialStock}
        locations={locations}
        defaultLocationId={selectedLocation}
        userRole={userRole}
        preselectedItemId={preselectedItemId}
        onSuccessRegistration={() => {
          router.refresh();
        }}
      />

      {/* Local Purchase Modal for Direct Supplier Ingestion */}
      <LocalPurchaseModal
        open={isLocalPurchaseOpen}
        onOpenChange={setIsLocalPurchaseOpen}
        locations={locations}
        currentLocationId={selectedLocation}
        catalogItems={initialStock}
      />
    </div>
  );
};
