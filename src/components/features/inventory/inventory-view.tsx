"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Camera,
  Cpu,
  Eye,
  Flame,
  Layers,
  Plus,
  PlusCircle,
  Search,
  SlidersHorizontal,
  ShoppingCart,
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
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import { getInventoryStock, getSerializedUnits } from "@/actions/inventory";
import { buttons, explainError, hints, nav, terms } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import { PageHeader } from "@/components/shared/page-header";
import { ListPager } from "@/components/shared/list-pager";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { InventoryTableSkeleton } from "@/components/features/inventory/design-system/inventory-skeleton";
import { LocalPurchaseModal } from "@/components/features/inventory/local-purchase-modal";
import type {
  Location,
  SerializedItemWithDetails,
  StockItemWithBalance,
  UserRole,
} from "@/types/inventory";

const MassiveScanModal = dynamic(
  () =>
    import("@/components/features/inventory/massive-scan-modal").then(
      (mod) => mod.MassiveScanModal,
    ),
  { ssr: false },
);

interface InventoryViewProps {
  initialStock: StockItemWithBalance[];
  locations: Location[];
  serializedUnits: SerializedItemWithDetails[];
  userRole: UserRole;
  currentLocationId: string;
  initialQuery?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  initialStock,
  locations,
  serializedUnits,
  userRole,
  currentLocationId,
  initialQuery = "",
}) => {
  const router = useRouter();

  const [stock, setStock] =
    React.useState<StockItemWithBalance[]>(initialStock);
  const [serials, setSerials] =
    React.useState<SerializedItemWithDetails[]>(serializedUnits);
  const [scanMounted, setScanMounted] = React.useState(false);
  const [isLoadingStock, setIsLoadingStock] = React.useState(false);
  const [selectedLocation, setSelectedLocation] =
    React.useState<string>(currentLocationId);
  const [searchTerm, setSearchTerm] = React.useState<string>(initialQuery);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [natureFilter, setNatureFilter] = React.useState<string>("all");
  const [stockAlert, setStockAlert] = React.useState<"all" | "low" | "out">(
    "all",
  );
  const [sortKey, setSortKey] = React.useState<"name" | "stock">("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  // Modals
  const [activeSerialItem, setActiveSerialItem] =
    React.useState<StockItemWithBalance | null>(null);
  const [isMassiveScanOpen, setIsMassiveScanOpen] =
    React.useState<boolean>(false);
  const [isLocalPurchaseOpen, setIsLocalPurchaseOpen] =
    React.useState<boolean>(false);
  const [preselectedItemId, setPreselectedItemId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    setStock(initialStock);
  }, [initialStock]);

  React.useEffect(() => {
    setSerials(serializedUnits);
  }, [serializedUnits]);

  React.useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  const handleLocationChange = async (locationId: string): Promise<void> => {
    setSelectedLocation(locationId);
    setIsLoadingStock(true);
    try {
      const [nextStock, nextSerials] = await Promise.all([
        getInventoryStock(locationId),
        getSerializedUnits(locationId),
      ]);
      setStock(nextStock);
      setSerials(nextSerials);
    } catch {
      toast.error(explainError("cargar el almacén"), {
        description: hints.connection,
      });
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleSort = (key: "name" | "stock"): void => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "stock" ? "desc" : "asc");
  };

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    stock.forEach((i) => cats.add(i.category));
    return Array.from(cats);
  }, [stock]);

  const filteredStock = React.useMemo(() => {
    const list = stock.filter((item) => {
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

      const matchesAlert =
        stockAlert === "all" ||
        (stockAlert === "out" && Number(item.current_stock) <= 0) ||
        (stockAlert === "low" && item.is_low_stock);

      return matchesSearch && matchesCategory && matchesNature && matchesAlert;
    });

    return list.sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      if (sortKey === "stock") {
        return (Number(a.current_stock) - Number(b.current_stock)) * factor;
      }
      return a.name.localeCompare(b.name, "es") * factor;
    });
  }, [
    stock,
    searchTerm,
    categoryFilter,
    natureFilter,
    stockAlert,
    sortKey,
    sortDir,
  ]);

  const pager = usePagedList(
    filteredStock,
    `${searchTerm}|${categoryFilter}|${natureFilter}|${stockAlert}|${sortKey}|${sortDir}|${selectedLocation}`,
  );

  const lowStockCount = stock.filter((i) => i.is_low_stock).length;
  const outOfStockCount = stock.filter(
    (i) => Number(i.current_stock) <= 0,
  ).length;
  const serializedCount = stock.filter(
    (i) => i.is_serialized && i.category !== "Herramientas",
  ).length;
  const toolsCount = stock.filter((i) => i.category === "Herramientas").length;
  const consumablesCount = stock.filter((i) => !i.is_serialized).length;

  const currentItemSerials = React.useMemo(() => {
    if (!activeSerialItem) return [];
    return serials.filter(
      (unit) =>
        unit.item_id === activeSerialItem.id &&
        unit.current_location_id === selectedLocation,
    );
  }, [activeSerialItem, serials, selectedLocation]);

  // Open scan modal for specific item
  const handleOpenScanForItem = (itemId: string): void => {
    setPreselectedItemId(itemId);
    setScanMounted(true);
    setIsMassiveScanOpen(true);
  };

  const handleOpenGenericScan = (): void => {
    setPreselectedItemId(null);
    setScanMounted(true);
    setIsMassiveScanOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Navigation */}
      <PageHeader
        icon={Boxes}
        title={nav.inventory}
        description="Mira la cantidad disponible y registra entradas, salidas o traslados."
        flex={false}
        action={
          <>
            <Button
              onClick={handleOpenGenericScan}
              className="gap-2 font-semibold">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {buttons.registerEntry}
            </Button>
            <Button asChild variant="outline">
              <Link href="/inventario/registro-remoto">{buttons.usePhone}</Link>
            </Button>
            {["superadmin", "admin_sucursal"].includes(userRole) ? (
              <Button
                onClick={() => setIsLocalPurchaseOpen(true)}
                variant="outline"
                className="gap-2">
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                {buttons.localPurchase}
              </Button>
            ) : null}
            {["superadmin", "admin_sucursal"].includes(userRole) ? (
              <Button asChild variant="outline">
                <Link href="/guias/enviar">
                  <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                  {nav.sendTransfer}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/consumos">
                <Flame className="h-4 w-4" aria-hidden="true" />
                {buttons.registerExit}
              </Link>
            </Button>
            {userRole === "superadmin" ? (
              <Button asChild variant="outline">
                <Link href="/admin">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  {buttons.addProduct}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {/* KPI Cards */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <p>
              {outOfStockCount > 0
                ? `${outOfStockCount} ${outOfStockCount === 1 ? "producto agotado" : "productos agotados"}. `
                : ""}
              {lowStockCount > 0 ? `${lowStockCount} con poca cantidad.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStockCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant={stockAlert === "out" ? "default" : "outline"}
                onClick={() =>
                  setStockAlert(stockAlert === "out" ? "all" : "out")
                }>
                {buttons.seeOut}
              </Button>
            ) : null}
            {lowStockCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant={stockAlert === "low" ? "default" : "outline"}
                onClick={() =>
                  setStockAlert(stockAlert === "low" ? "all" : "low")
                }>
                {buttons.seeLow}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              {terms.products}
            </CardDescription>
            <CardTitle className="flex items-center justify-between text-2xl font-bold">
              <span>{stock.length}</span>
              <Boxes className="h-5 w-5 text-muted-foreground/60" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">En este almacén</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              Con número de serie
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

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
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
          className={`border shadow-sm ${
            outOfStockCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""
          }`}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {terms.outOfStock}
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {outOfStockCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {lowStockCount} con poca cantidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Location Selector Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Quick Nature Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Filtrar por tipo:
            </span>
            <Button
              size="sm"
              variant={natureFilter === "all" ? "default" : "outline"}
              onClick={() => setNatureFilter("all")}
              className="h-8 text-xs rounded-full px-3">
              Todos ({stock.length})
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "serialized" ? "default" : "outline"}
              onClick={() => setNatureFilter("serialized")}
              className="h-8 text-xs rounded-full px-3 gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> Equipos (ONU / Router)
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "consumables" ? "default" : "outline"}
              onClick={() => setNatureFilter("consumables")}
              className="h-8 text-xs rounded-full px-3 gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Consumibles ({consumablesCount}
              )
            </Button>
            <Button
              size="sm"
              variant={natureFilter === "tools" ? "default" : "outline"}
              onClick={() => setNatureFilter("tools")}
              className="h-8 text-xs rounded-full px-3 gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Herramientas ({toolsCount})
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
                aria-label="Buscar producto en el inventario"
              />
            </div>

            {/* Category and Location Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="w-full sm:w-56">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => setCategoryFilter(val)}>
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
                  onValueChange={(val) => {
                    void handleLocationChange(val);
                  }}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Almacén o cuadrilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} (
                        {loc.type === "crew" ? "Cuadrilla" : "Almacén"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoadingStock ? (
        <InventoryTableSkeleton rows={6} />
      ) : (
        <Card className="overflow-hidden border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[130px] sm:table-cell">
                  {terms.code}
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="font-medium"
                    onClick={() => handleSort("name")}>
                    {terms.product}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden text-center sm:table-cell">
                  {terms.unit}
                </TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  {terms.minimum}
                </TableHead>
                <TableHead className="text-right font-bold">
                  <button
                    type="button"
                    className="font-bold"
                    onClick={() => handleSort("stock")}>
                    {terms.available}
                  </button>
                </TableHead>
                <TableHead className="w-[240px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-4">
                    <EmptyState
                      icon={SlidersHorizontal}
                      title="No hay productos con estos filtros"
                      description="Quita la búsqueda o elige otro almacén para ver la cantidad disponible."
                      actionLabel={buttons.clearFilters}
                      onAction={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                        setNatureFilter("all");
                        setStockAlert("all");
                      }}
                      secondaryActionLabel={buttons.registerEntry}
                      onSecondaryAction={handleOpenGenericScan}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pager.rows.map((item) => {
                  const isTool = item.category === "Herramientas";
                  const isOut = Number(item.current_stock) <= 0;

                  return (
                    <TableRow
                      key={item.id}
                      className={
                        isOut
                          ? "bg-amber-500/10"
                          : item.is_low_stock
                            ? "bg-amber-500/5"
                            : undefined
                      }>
                      <TableCell className="hidden font-mono text-xs font-semibold sm:table-cell">
                        {item.sku}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
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
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {terms.code}: {item.sku}
                              {isOut
                                ? ` · ${terms.outOfStock}`
                                : item.is_low_stock
                                  ? ` · ${terms.lowStock}`
                                  : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.is_serialized ? (
                          <Badge variant="secondary">Con serie</Badge>
                        ) : (
                          <Badge variant="outline">Por cantidad</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-center text-xs sm:table-cell">
                        <Badge variant="outline">{item.unit}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-right font-mono text-xs text-muted-foreground lg:table-cell">
                        {formatNumber(Number(item.min_stock), 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-base font-bold">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.is_low_stock ? (
                            <span
                              title={isOut ? terms.outOfStock : terms.lowStock}>
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            </span>
                          ) : null}
                          <span
                            className={
                              item.is_low_stock
                                ? "font-extrabold text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                            }>
                            {formatNumber(Number(item.current_stock), 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenScanForItem(item.id)}
                            className="h-9 w-[92px] shrink-0 px-2 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            <span className="ml-1">Entrada</span>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 w-[72px] shrink-0 px-2 text-xs">
                            <Link href={`/solicitudes?producto=${item.id}`}>
                              Pedir
                            </Link>
                          </Button>
                          {item.is_serialized ? (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setActiveSerialItem(item)}
                              className="size-11 shrink-0"
                              aria-label={`Ver números de serie de ${item.name}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span
                              className="inline-block size-11 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <ListPager
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            onPage={pager.setPage}
          />
        </Card>
      )}

      {/* Serial Units Modal Dialog */}
      <Dialog
        open={!!activeSerialItem}
        onOpenChange={(open) => !open && setActiveSerialItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Números de serie ({activeSerialItem?.name})
            </DialogTitle>
            <DialogDescription>
              Cada equipo de este almacén, con su número de serie y dirección
              MAC.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
              <span>
                {terms.code}: {activeSerialItem?.sku}
              </span>
              <span>En este almacén: {currentItemSerials.length}</span>
            </div>

            {currentItemSerials.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay equipos con número de serie en este almacén.
              </div>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {currentItemSerials.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-mono font-semibold">
                        {s.serial_number}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        MAC: {s.mac_address || "Sin dirección MAC"}
                      </div>
                    </div>
                    <Badge variant="success">Disponible</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {scanMounted ? (
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
      ) : null}

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
