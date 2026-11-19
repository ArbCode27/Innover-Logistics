"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CheckCircle2,
  Cpu,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { assignStockToCrewAction, createCrewLocationAction, getCrewStock } from "@/actions/crews";
import { getInventoryStock } from "@/actions/inventory";
import { buttons, explainError, hints, nav, terms } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import { PageHeader } from "@/components/shared/page-header";
import { ListPager } from "@/components/shared/list-pager";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { InventoryTableSkeleton } from "@/components/features/inventory/design-system/inventory-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import type {
  Item,
  Location,
  StockItemWithBalance,
  UserRole,
} from "@/types/inventory";

interface CrewsManagementViewProps {
  crews: Location[];
  warehouses: Location[];
  items: Item[];
  initialCrewStock: StockItemWithBalance[];
  userRole: UserRole;
}

export const CrewsManagementView: React.FC<CrewsManagementViewProps> = ({
  crews,
  warehouses,
  items,
  initialCrewStock,
  userRole,
}) => {
  const router = useRouter();
  const [selectedCrewId, setSelectedCrewId] = React.useState<string>(
    crews[0]?.id || ""
  );
  const [isAssignModalOpen, setIsAssignModalOpen] =
    React.useState<boolean>(false);
  const [isCreateCrewOpen, setIsCreateCrewOpen] =
    React.useState<boolean>(false);
  const [newCrewName, setNewCrewName] = React.useState<string>("");
  const [newCrewCode, setNewCrewCode] = React.useState<string>("");
  const [isCreatingCrew, setIsCreatingCrew] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Assignment form state
  const [originWarehouseId, setOriginWarehouseId] = React.useState<string>(
    warehouses[0]?.id || ""
  );
  const [assignmentLines, setAssignmentLines] = React.useState<
    { item_id: string; quantity: number }[]
  >([{ item_id: items[0]?.id || "", quantity: 1 }]);
  const [assignmentNotes, setAssignmentNotes] = React.useState<string>("");
  const [crewStock, setCrewStock] = React.useState(initialCrewStock);
  React.useEffect(() => {
    setCrewStock(initialCrewStock);
  }, [initialCrewStock]);
  const [isLoadingCrew, setIsLoadingCrew] = React.useState(false);
  const [crewSearch, setCrewSearch] = React.useState("");
  const [onlyWithStock, setOnlyWithStock] = React.useState(true);
  const [originStock, setOriginStock] = React.useState<StockItemWithBalance[]>([]);
  const [showAssignConfirm, setShowAssignConfirm] = React.useState(false);

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) || crews[0];

  const handleSelectCrew = async (crewId: string): Promise<void> => {
    setSelectedCrewId(crewId);
    setIsLoadingCrew(true);
    try {
      const next = await getCrewStock(crewId);
      setCrewStock(next);
    } catch {
      toast.error(explainError("cargar la cuadrilla"), { description: hints.connection });
    } finally {
      setIsLoadingCrew(false);
    }
  };

  React.useEffect(() => {
    if (!originWarehouseId) return;
    void getInventoryStock(originWarehouseId).then(setOriginStock).catch(() => setOriginStock([]));
  }, [originWarehouseId, isAssignModalOpen]);

  const handleAddLine = (): void => {
    setAssignmentLines((prev) => [
      ...prev,
      { item_id: items[0]?.id || "", quantity: 1 },
    ]);
  };

  const handleRemoveLine = (index: number): void => {
    setAssignmentLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (
    index: number,
    field: "item_id" | "quantity",
    value: string | number
  ): void => {
    setAssignmentLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const handleConfirmAssignment = async (): Promise<void> => {
    if (!selectedCrew) return;
    setIsSubmitting(true);

    try {
      const res = await assignStockToCrewAction({
        origin_location_id: originWarehouseId,
        crew_location_id: selectedCrew.id,
        lines: assignmentLines.map((l) => ({
          item_id: l.item_id,
          quantity: Number(l.quantity),
        })),
        notes: assignmentNotes,
      });

      if (!res.success) {
        toast.error(explainError("asignar los productos", res.error));
        setIsSubmitting(false);
        return;
      }

      toast.success("Productos asignados a la cuadrilla", {
        description: `Comprobante: ${res.data?.document_number}`,
      });

      setIsAssignModalOpen(false);
      setAssignmentNotes("");
      const next = await getCrewStock(selectedCrew.id);
      setCrewStock(next);
      router.refresh();
    } catch {
      toast.error(hints.connection);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleCrewStock = crewStock.filter((item) => {
    const query = crewSearch.toLowerCase();
    const matches =
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query);
    const hasQty = !onlyWithStock || Number(item.current_stock) > 0;
    return matches && hasQty;
  });
  const crewPager = usePagedList(
    visibleCrewStock,
    `${crewSearch}|${onlyWithStock}|${selectedCrewId}`
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        icon={Users}
        title={nav.crews}
        description="Mira lo que lleva cada cuadrilla y asígnale productos desde el almacén."
        action={
          ["superadmin", "admin_sucursal"].includes(userRole) ? (
            <>
              <Button variant="outline" onClick={() => setIsCreateCrewOpen(true)} className="gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                {buttons.newCrew}
              </Button>
              <Button onClick={() => setIsAssignModalOpen(true)} className="gap-2 font-semibold">
                <PackagePlus className="h-4 w-4" />
                {buttons.assignToCrew}
              </Button>
            </>
          ) : null
        }
      />

      {/* Crew Selector Buttons */}
      <div className="flex flex-wrap gap-2">
        {crews.map((crew) => (
          <Button
            key={crew.id}
            variant={crew.id === selectedCrewId ? "default" : "outline"}
            size="sm"
            onClick={() => {
              void handleSelectCrew(crew.id);
            }}
            className="gap-2 min-h-[44px]"
          >
            <Users className="h-4 w-4" />
            {crew.name}
          </Button>
        ))}
      </div>

      {/* Selected Crew Stock Card */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-lg">
              {terms.products} de {selectedCrew?.name || "la cuadrilla"}
            </CardTitle>
            <CardDescription>
              Solo se muestra lo que esta cuadrilla tiene ahora.
            </CardDescription>
          </div>
          <Badge variant="secondary">{terms.code}: {selectedCrew?.code}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={crewSearch}
              onChange={(event) => setCrewSearch(event.target.value)}
              placeholder="Buscar por nombre o código"
              aria-label="Buscar producto de la cuadrilla"
              className="min-h-[44px]"
            />
            <Button
              type="button"
              variant={onlyWithStock ? "default" : "outline"}
              onClick={() => setOnlyWithStock((current) => !current)}
            >
              {onlyWithStock ? "Con cantidad" : "Ver todos"}
            </Button>
          </div>
        </CardContent>
        <CardContent className="p-0">
          {isLoadingCrew ? (
            <InventoryTableSkeleton rows={4} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{terms.code}</TableHead>
                <TableHead>{terms.product}</TableHead>
                <TableHead className="text-center">{terms.unit}</TableHead>
                <TableHead className="text-right font-bold">{terms.available}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCrewStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-4">
                    <EmptyState
                      title="Esta cuadrilla no tiene productos"
                      description="Asigna productos desde el almacén para que el técnico pueda usarlos."
                      actionLabel={buttons.assignToCrew}
                      onAction={() => setIsAssignModalOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                crewPager.rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.is_serialized ? (
                      <span className="text-xs text-muted-foreground">Con número de serie</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <Badge variant="outline">{item.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-base font-bold">
                    {formatNumber(Number(item.current_stock), 0)}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
          <ListPager page={crewPager.page} pageCount={crewPager.pageCount} total={crewPager.total} onPage={crewPager.setPage} />
        </CardContent>
      </Card>

      {/* Assignment Modal Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Asignar productos a {selectedCrew?.name}
            </DialogTitle>
            <DialogDescription>
              Se resta del almacén y se suma a la cuadrilla. Esta acción no se puede deshacer desde aquí: si hay un error, anúlala en el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Almacén Origen</Label>
              <Select
                value={originWarehouseId}
                onValueChange={(val) => setOriginWarehouseId(val)}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Seleccione el almacén de origen" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  {terms.products}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="gap-1 min-h-[36px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {buttons.addLine}
                </Button>
              </div>

              {assignmentLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/20"
                >
                  <div className="flex-1">
                    <Select
                      value={line.item_id}
                      onValueChange={(val) =>
                        handleLineChange(idx, "item_id", val)
                      }
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Seleccione material" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => {
                          const available =
                            originStock.find((stockItem) => stockItem.id === item.id)
                              ?.current_stock ?? 0;
                          return (
                            <SelectItem key={item.id} value={item.id} className="text-xs">
                              {item.name} · {available} disponibles
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      handleLineChange(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-24 h-10 text-right font-mono text-sm"
                  />
                  {Number(line.quantity) >
                  Number(originStock.find((stockItem) => stockItem.id === line.item_id)?.current_stock ?? 0) ? (
                    <p className="w-full text-xs text-destructive">
                      Pides más de lo que hay en el almacén. Baja la cantidad o elige otro producto.
                    </p>
                  ) : null}

                  {assignmentLines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-destructive h-10 w-10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-notes" className="text-xs">
                Notas / Motivo de Entrega
              </Label>
              <Input
                id="assign-notes"
                placeholder="Ej. Dotación semanal para cuadrilla de averías..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setShowAssignConfirm(true)}
              disabled={isSubmitting}
              className="gap-2 font-semibold shadow-md min-h-[44px]"
            >
              {buttons.assignToCrew}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Crear Nueva Cuadrilla */}
      <Dialog open={isCreateCrewOpen} onOpenChange={setIsCreateCrewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              Crear cuadrilla
            </DialogTitle>
            <DialogDescription>
              Registra el equipo o el vehículo que va a llevar productos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCrewName.trim() || !newCrewCode.trim()) {
                toast.error("El nombre y código de cuadrilla son obligatorios");
                return;
              }

              setIsCreatingCrew(true);
              try {
                const res = await createCrewLocationAction({
                  branch_id: warehouses[0]?.branch_id || "",
                  name: newCrewName.trim(),
                  code: newCrewCode.toUpperCase().trim(),
                });

                if (!res.success) {
                  toast.error("Error al registrar cuadrilla", {
                    description: res.error,
                  });
                  setIsCreatingCrew(false);
                  return;
                }

                toast.success("Cuadrilla creada exitosamente");
                setNewCrewName("");
                setNewCrewCode("");
                setIsCreateCrewOpen(false);
                router.refresh();
              } catch {
                toast.error("Error inesperado en el servidor");
              } finally {
                setIsCreatingCrew(false);
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label htmlFor="crew-code" className="text-xs font-semibold">
                Código de Cuadrilla (Ej. C-09 o TEC-JP)
              </Label>
              <Input
                id="crew-code"
                placeholder="Ej. C-09"
                value={newCrewCode}
                onChange={(e) => setNewCrewCode(e.target.value.toUpperCase())}
                className="font-mono min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="crew-name" className="text-xs font-semibold">
                Nombre de la Cuadrilla / Técnico
              </Label>
              <Input
                id="crew-name"
                placeholder="Ej. Cuadrilla 09 - Juan Pérez (Acometida)"
                value={newCrewName}
                onChange={(e) => setNewCrewName(e.target.value)}
                className="min-h-[44px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCrewOpen(false)}
                disabled={isCreatingCrew}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCrew}
                className="gap-2 bg-primary font-semibold min-h-[44px]"
              >
                {isCreatingCrew ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {buttons.newCrew}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={showAssignConfirm}
        title="¿Asignar estos productos?"
        description="La cantidad sale del almacén y entra a la cuadrilla. Si te equivocas, anula el comprobante en el historial."
        confirmLabel={buttons.assignToCrew}
        pending={isSubmitting}
        onCancel={() => setShowAssignConfirm(false)}
        onConfirm={() => {
          setShowAssignConfirm(false);
          void handleConfirmAssignment();
        }}
      />
    </div>
  );
};
