"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  FileText,
  History,
  Loader2,
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
import { PageHeader } from "@/components/shared/page-header";
import { ListPager } from "@/components/shared/list-pager";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { buttons, explainError, hints, nav, terms } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import { formatDate, formatNumber } from "@/lib/utils";
import { DocumentVoucherModal } from "@/components/features/history/document-voucher-modal";
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
  const [viewVoucherDoc, setViewVoucherDoc] = React.useState<{
    docId: string;
    docNumber: string;
  } | null>(null);

  const filteredMovements = React.useMemo(() => {
    const query = searchTerm.toLowerCase();
    return initialMovements.filter((m) => {
      const matchesSearch =
        m.item_name.toLowerCase().includes(query) ||
        m.doc_number.toLowerCase().includes(query) ||
        m.location_name.toLowerCase().includes(query);

      const matchesType =
        movementFilter === "all" || m.movement_type === movementFilter;

      return matchesSearch && matchesType;
    });
  }, [initialMovements, searchTerm, movementFilter]);

  const handleOpenVoidModal = (docId: string, docNumber: string): void => {
    setSelectedVoidDoc({ docId, docNumber });
    setCancellationReason("");
  };

  const handleConfirmVoid = async (): Promise<void> => {
    if (!selectedVoidDoc) return;
    if (!cancellationReason.trim()) {
      toast.error("Escribe por qué se anula. Sin ese motivo no se puede corregir el movimiento.");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidDocumentAction(
        selectedVoidDoc.docId,
        cancellationReason
      );
      if (!res.success) {
        toast.error(explainError("anular el documento", res.error));
        setIsVoiding(false);
        return;
      }

      toast.success("Documento anulado", {
        description:
          "La cantidad volvió al estado anterior. El documento sigue en el historial para que se pueda revisar.",
      });

      setSelectedVoidDoc(null);
      router.refresh();
    } catch {
      toast.error(hints.connection);
    } finally {
      setIsVoiding(false);
    }
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case "purchase":
        return <Badge variant="success">Entrada por compra</Badge>;
      case "transfer_in":
        return <Badge variant="info">Entrada por traslado</Badge>;
      case "transfer_out":
        return <Badge variant="warning">Salida por traslado</Badge>;
      case "assignment_in":
        return <Badge variant="info">Entrada a cuadrilla</Badge>;
      case "assignment_out":
        return <Badge variant="secondary">Salida a cuadrilla</Badge>;
      case "consumption":
        return <Badge variant="destructive">Salida</Badge>;
      case "void":
        return <Badge variant="outline">Anulación</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const pager = usePagedList(
    filteredMovements,
    `${searchTerm}|${movementFilter}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title={nav.history}
        description="Cada entrada, salida y traslado queda escrito aquí. Un error se corrige anulando el documento, no borrándolo."
      />

      <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-900 dark:text-blue-200">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-500" />
        <span>{hints.stockRule} Si hubo un error, anula el documento y escribe el motivo.</span>
      </div>

      {/* Search and Filters Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, producto o almacén"
              aria-label="Buscar en el historial"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 min-h-[44px]"
            />
          </div>

          <div className="w-full sm:w-72">
            <Select
              value={movementFilter}
              onValueChange={(val) => setMovementFilter(val)}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los movimientos</SelectItem>
                <SelectItem value="purchase">Entradas por compra</SelectItem>
                <SelectItem value="transfer_out">Salidas por traslado</SelectItem>
                <SelectItem value="transfer_in">Entradas por traslado</SelectItem>
                <SelectItem value="assignment_out">Salidas a cuadrilla</SelectItem>
                <SelectItem value="assignment_in">Entradas a cuadrilla</SelectItem>
                <SelectItem value="consumption">Salidas</SelectItem>
                <SelectItem value="void">Anulaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Ledger Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>{terms.product}</TableHead>
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
                <TableCell colSpan={8} className="p-4">
                  <EmptyState
                    title="No hay movimientos con este filtro"
                    description="Quita la búsqueda o registra una entrada, una salida o un traslado."
                    actionLabel={buttons.clearFilters}
                    onAction={() => {
                      setSearchTerm("");
                      setMovementFilter("all");
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pager.rows.map((mov) => {
                const isPositive = Number(mov.quantity) > 0;
                return (
                  <TableRow key={mov.id}>
                    <TableCell className="font-mono font-bold text-xs">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setViewVoucherDoc({
                            docId: mov.document_id,
                            docNumber: mov.doc_number,
                          })
                        }
                        className="p-0 h-auto font-mono font-bold text-xs text-primary hover:underline"
                        title="Ver comprobante oficial e imprimir"
                      >
                        {mov.doc_number}
                      </Button>
                    </TableCell>
                    <TableCell>{getMovementBadge(mov.movement_type)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {mov.item_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {terms.code}: {mov.item_sku}
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
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setViewVoucherDoc({
                                docId: mov.document_id,
                                docNumber: mov.doc_number,
                              })
                            }
                            className="text-xs text-muted-foreground hover:text-primary h-8 px-2 min-h-[36px]"
                            title="Ver Comprobante Oficial"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            {buttons.viewVoucher}
                          </Button>
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
                              title={buttons.voidDocument}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <ListPager page={pager.page} pageCount={pager.pageCount} total={pager.total} onPage={pager.setPage} />
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
              Anular documento {selectedVoidDoc?.docNumber}
            </DialogTitle>
            <DialogDescription>
              El documento se queda en el historial. Se crea un movimiento contrario para devolver la cantidad. Escribe el motivo para que otra persona entienda la corrección.
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
                  Anulando...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  {buttons.voidDocument}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Voucher Print/PDF Dialog */}
      <DocumentVoucherModal
        documentId={viewVoucherDoc?.docId || null}
        docNumber={viewVoucherDoc?.docNumber || null}
        onClose={() => setViewVoucherDoc(null)}
      />
    </div>
  );
};
