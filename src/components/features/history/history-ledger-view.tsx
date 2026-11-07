"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Boxes,
  CheckCircle2,
  FileText,
  History,
  Info,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  getMovementsLedger,
  voidDocumentAction,
  type StockMovementWithDetails,
} from "@/actions/history";
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
import { formatDate, formatNumber } from "@/lib/utils";
import type { MovementType, UserRole } from "@/types/inventory";

interface HistoryLedgerViewProps {
  initialMovements: StockMovementWithDetails[];
  userRole: UserRole;
}

export const HistoryLedgerView: React.FC<HistoryLedgerViewProps> = ({
  initialMovements,
  userRole,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [movementFilter, setMovementFilter] = React.useState<string>("all");
  const [selectedVoidDoc, setSelectedVoidDoc] = React.useState<{
    docId: string;
    docNumber: string;
  } | null>(null);
  const [cancellationReason, setCancellationReason] =
    React.useState<string>("");
  const [isVoiding, setIsVoiding] = React.useState<boolean>(false);

  const filteredMovements = initialMovements.filter((m) => {
    const matchesSearch =
      m.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.doc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.location_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      movementFilter === "all" || m.movement_type === movementFilter;

    return matchesSearch && matchesType;
  });

  const handleOpenVoidModal = (docId: string, docNumber: string): void => {
    setSelectedVoidDoc({ docId, docNumber });
    setCancellationReason("");
  };

  const handleConfirmVoid = async (): Promise<void> => {
    if (!selectedVoidDoc) return;
    if (!cancellationReason.trim()) {
      toast.error("Debe ingresar el motivo de la anulación");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidDocumentAction(
        selectedVoidDoc.docId,
        cancellationReason
      );
      if (!res.success) {
        toast.error("Error al anular documento", {
          description: res.error,
        });
        setIsVoiding(false);
        return;
      }

      toast.success("Documento anulado", {
        description:
          "Se ha generado un contra-asiento inmutable que restituye el stock en el ledger.",
      });

      setSelectedVoidDoc(null);
      router.refresh();
    } catch {
      toast.error("Error inesperado en el servidor");
    } finally {
      setIsVoiding(false);
    }
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case "purchase":
        return <Badge variant="success">Compra (+)</Badge>;
      case "transfer_in":
        return <Badge variant="info">Entrada Traslado (+)</Badge>;
      case "transfer_out":
        return <Badge variant="warning">Salida Traslado (-)</Badge>;
      case "assignment_in":
        return <Badge variant="info">Entrada Cuadrilla (+)</Badge>;
      case "assignment_out":
        return <Badge variant="secondary">Salida Cuadrilla (-)</Badge>;
      case "consumption":
        return <Badge variant="destructive">Consumo Campo (-)</Badge>;
      case "void":
        return <Badge variant="outline">Contra-asiento Anulación</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" aria-hidden="true" />
            Ledger Inmutable & Trazabilidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Auditoría de todos los asientos contables de inventario. Nunca se
            borran registros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 min-h-[44px]"
          >
            <Printer className="h-4 w-4" />
            Imprimir Comprobante
          </Button>
        </div>
      </div>

      {/* Domain Rule Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-300">
        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
        <span>
          <strong>Regla de Dominio N° 1 y 5:</strong> El balance de stock es el
          resultado directo de la sumatoria de este libro contable. Los errores
          se corrigen exclusivamente mediante contra-asiento inverso con motivo
          justificado.
        </span>
      </div>

      {/* Search and Filters Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por comprobante, material o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 min-h-[44px]"
            />
          </div>

          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            <option value="all">Todos los tipos de movimiento</option>
            <option value="purchase">Compras Locales (+)</option>
            <option value="transfer_out">Salidas de Traslado (-)</option>
            <option value="transfer_in">Entradas de Traslado (+)</option>
            <option value="consumption">Consumo de Campo (-)</option>
            <option value="void">Contra-asientos de Anulación</option>
          </select>
        </CardContent>
      </Card>

      {/* Movements Ledger Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Documento</TableHead>
              <TableHead>Tipo Asiento</TableHead>
              <TableHead>Material / Ítem</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Movimiento</TableHead>
              <TableHead className="hidden md:table-cell">Responsable</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
              {["superadmin", "admin_sucursal"].includes(userRole) && (
                <TableHead className="text-center w-[100px]">Acción</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  No se encontraron movimientos registrados en el ledger.
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((mov) => {
                const isPositive = Number(mov.quantity) > 0;
                return (
                  <TableRow key={mov.id}>
                    <TableCell className="font-mono font-bold text-xs">
                      {mov.doc_number}
                    </TableCell>
                    <TableCell>{getMovementBadge(mov.movement_type)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {mov.item_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        SKU: {mov.item_sku}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {mov.location_name}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-base">
                      <span
                        className={
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }
                      >
                        {isPositive ? "+" : ""}
                        {formatNumber(Number(mov.quantity), 0)} {mov.item_unit}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {mov.creator_name}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(mov.created_at)}
                    </TableCell>
                    {["superadmin", "admin_sucursal"].includes(userRole) && (
                      <TableCell className="text-center">
                        {mov.movement_type !== "void" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleOpenVoidModal(
                                mov.document_id,
                                mov.doc_number
                              )
                            }
                            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2 min-h-[36px]"
                            title="Anular documento con contra-asiento"
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            Anular
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Void Document Modal Dialog */}
      <Dialog
        open={!!selectedVoidDoc}
        onOpenChange={(open) => !open && setSelectedVoidDoc(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Anular Documento {selectedVoidDoc?.docNumber}
            </DialogTitle>
            <DialogDescription>
              El documento NO será eliminado. Se registrará un contra-asiento
              inverso en el ledger para restaurar el balance previo con fines de
              auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <Label htmlFor="void-reason" className="text-xs font-semibold">
              Motivo de Anulación (Obligatorio)
            </Label>
            <Input
              id="void-reason"
              placeholder="Ej. Error en digitación de cantidad de cable..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setSelectedVoidDoc(null)}
              disabled={isVoiding}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmVoid}
              disabled={isVoiding}
              className="gap-2 font-semibold min-h-[44px]"
            >
              {isVoiding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando Contra-asiento...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Confirmar Anulación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
