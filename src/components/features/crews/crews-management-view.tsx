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

import { assignStockToCrewAction } from "@/actions/crews";
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
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Assignment form state
  const [originWarehouseId, setOriginWarehouseId] = React.useState<string>(
    warehouses[0]?.id || ""
  );
  const [assignmentLines, setAssignmentLines] = React.useState<
    { item_id: string; quantity: number }[]
  >([{ item_id: items[0]?.id || "", quantity: 10 }]);
  const [assignmentNotes, setAssignmentNotes] = React.useState<string>("");

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) || crews[0];

  const handleAddLine = (): void => {
    setAssignmentLines((prev) => [
      ...prev,
      { item_id: items[0]?.id || "", quantity: 5 },
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
        toast.error("Error al asignar material", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Material asignado a la cuadrilla", {
        description: `Comprobante de entrega generado: ${res.data?.document_number}`,
      });

      setIsAssignModalOpen(false);
      setAssignmentNotes("");
      router.refresh();
    } catch {
      toast.error("Error inesperado en el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" aria-hidden="true" />
            Control de Cuadrillas Técnicas
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo de stock en móviles de instalación y asignaciones directas
            desde almacén.
          </p>
        </div>

        {["superadmin", "admin_sucursal"].includes(userRole) && (
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            className="gap-2 font-semibold shadow-sm min-h-[44px]"
          >
            <PackagePlus className="h-4 w-4" />
            Asignar Material a Cuadrilla
          </Button>
        )}
      </div>

      {/* Crew Selector Buttons */}
      <div className="flex flex-wrap gap-2">
        {crews.map((crew) => (
          <Button
            key={crew.id}
            variant={crew.id === selectedCrewId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCrewId(crew.id)}
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
              Inventario de la Cuadrilla: {selectedCrew?.name}
            </CardTitle>
            <CardDescription className="text-xs">
              Material cargado y disponible para consumo en campo en vehículos y
              móviles.
            </CardDescription>
          </div>
          <Badge variant="info">Código: {selectedCrew?.code}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Descripción del Material</TableHead>
                <TableHead className="text-center">Unidad</TableHead>
                <TableHead className="text-right font-bold">
                  Stock en Móvil
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCrewStock.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.is_serialized && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> Equipo serializado
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <Badge variant="outline">{item.unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-base">
                    {formatNumber(Number(item.current_stock), 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Modal Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Asignar Material desde Almacén a {selectedCrew?.name}
            </DialogTitle>
            <DialogDescription>
              Esta operación descuenta de la bodega central y suma al stock de la
              cuadrilla mediante comprobante auditado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Almacén Origen</Label>
              <select
                value={originWarehouseId}
                onChange={(e) => setOriginWarehouseId(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[44px]"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Líneas de Material a Entregar
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="gap-1 min-h-[36px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir
                </Button>
              </div>

              {assignmentLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/20"
                >
                  <select
                    value={line.item_id}
                    onChange={(e) =>
                      handleLineChange(idx, "item_id", e.target.value)
                    }
                    className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.sku}] {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>

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
              onClick={handleConfirmAssignment}
              disabled={isSubmitting}
              className="gap-2 font-semibold shadow-md min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Asignación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
