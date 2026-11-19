"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { acceptTransferAction } from "@/actions/transfers";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { DocumentVoucherModal } from "@/components/features/history/document-voucher-modal";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { buttons, explainError, nav, terms } from "@/lib/glossary";
import { Printer } from "lucide-react";
import type { DocumentWithDetails, UserRole } from "@/types/inventory";

interface TransfersReceptionViewProps {
  transfers: DocumentWithDetails[];
  userRole: UserRole;
  userBranchId: string | null;
}

export const TransfersReceptionView: React.FC<TransfersReceptionViewProps> = ({
  transfers,
  userRole,
  userBranchId,
}) => {
  const router = useRouter();
  const [selectedTransfer, setSelectedTransfer] =
    React.useState<DocumentWithDetails | null>(null);
  const [actionType, setActionType] = React.useState<"ACCEPT" | "REJECT" | null>(
    null
  );
  const [receivedQuantities, setReceivedQuantities] = React.useState<
    Record<string, number>
  >({});
  const [receptionNotes, setReceptionNotes] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [printTransferId, setPrintTransferId] = React.useState<string | null>(null);
  const [confirmReject, setConfirmReject] = React.useState(false);

  const handleOpenDetails = (doc: DocumentWithDetails): void => {
    setSelectedTransfer(doc);
    setActionType(null);
    setReceptionNotes("");
    const initialQty: Record<string, number> = {};
    doc.lines.forEach((l) => {
      initialQty[l.id] = Number(l.quantity);
    });
    setReceivedQuantities(initialQty);
  };

  const handleQuantityChange = (lineId: string, value: string): void => {
    const val = parseFloat(value) || 0;
    setReceivedQuantities((prev) => ({
      ...prev,
      [lineId]: val,
    }));
  };

  const handleConfirmReception = async (action: "ACCEPT" | "REJECT"): Promise<void> => {
    if (!selectedTransfer) return;
    setIsProcessing(true);

    const acceptedLines = selectedTransfer.lines.map((l) => ({
      line_id: l.id,
      received_quantity: receivedQuantities[l.id] ?? Number(l.quantity),
    }));

    try {
      const res = await acceptTransferAction({
        document_id: selectedTransfer.id,
        action,
        accepted_lines: acceptedLines,
        notes: receptionNotes,
      });

      if (!res.success) {
        toast.error(explainError("recibir el traslado", res.error));
        setIsProcessing(false);
        return;
      }

      if (action === "ACCEPT") {
        toast.success("Traslado recibido", {
          description: "La cantidad ya está en el almacén de destino.",
        });
      } else {
        toast.success("Traslado rechazado", {
          description: "La cantidad volvió al almacén de origen.",
        });
      }

      setSelectedTransfer(null);
      router.refresh();
    } catch {
      toast.error("No hay conexión. Espera un momento e inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = transfers.filter((t) => t.status === "PENDING").length;

  const filteredTransfers = transfers.filter(
    (t) =>
      t.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.origin_location?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        icon={PackageCheck}
        title={nav.receiveTransfer}
        description="Revisa la cantidad que llegó antes de recibir o rechazar."
      />

      <Input
        placeholder="Buscar por número de traslado"
        aria-label="Buscar traslado"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full min-h-[44px] sm:max-w-sm"
      />

      {/* Pending Alert banner if incoming shipments exist */}
      {pendingCount > 0 && (
        <div
          role="status"
          className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300"
        >
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 animate-pulse text-amber-500" />
            <span className="text-sm font-semibold">
              Hay {pendingCount} {pendingCount === 1 ? "traslado" : "traslados"} en camino. Revísalos antes de recibirlos.
            </span>
          </div>
        </div>
      )}

      {/* Transfers List Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Número</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="hidden md:table-cell">Fecha Emisión</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No hay traslados.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono font-bold text-xs text-foreground">
                    {doc.document_number}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium text-foreground">
                      {doc.origin_location?.name || "Almacén Origen"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {doc.branch?.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium text-foreground">
                      {doc.destination_location?.name || "Almacén Destino"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant={doc.status === "PENDING" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleOpenDetails(doc)}
                      className="gap-1 min-h-[36px]"
                    >
                      {doc.status === "PENDING" ? (
                        <>
                          <FileCheck2 className="h-4 w-4" />
                          {buttons.review}
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          {buttons.seeDetail}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reception / Detail Modal Dialog */}
      <Dialog
        open={!!selectedTransfer}
        onOpenChange={(open) => !open && setSelectedTransfer(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Traslado {selectedTransfer?.document_number}
              </span>
              <StatusBadge status={selectedTransfer?.status || "PENDING"} />
            </DialogTitle>
            <DialogDescription>
              {selectedTransfer?.origin_location?.name} →{" "}
              {selectedTransfer?.destination_location?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4 my-2">
              {/* Shipment Notes */}
              {selectedTransfer.notes && (
                <div className="p-3 rounded-md bg-muted/40 border text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Observaciones de envío:
                  </span>{" "}
                  {selectedTransfer.notes}
                </div>
              )}

              {selectedTransfer.status === "PENDING_APPROVAL" && (
                <div
                  role="status"
                  className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300"
                >
                  Esta guía espera la aprobación del administrador general. El material sigue en el almacén de origen.
                </div>
              )}

              {/* Items Breakdown */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant. Enviada</TableHead>
                      {selectedTransfer.status === "PENDING" ? (
                        <TableHead className="text-right w-36">
                          Cant. Recibida
                        </TableHead>
                      ) : (
                        <TableHead className="text-right">
                          Cant. Recibida
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTransfer.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-semibold text-sm">
                            {line.item?.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {terms.code}: {line.item?.sku} ({line.item?.unit})
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatNumber(Number(line.quantity), 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {selectedTransfer.status === "PENDING" ? (
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              max={Number(line.quantity)}
                              value={receivedQuantities[line.id] ?? Number(line.quantity)}
                              onChange={(e) =>
                                handleQuantityChange(line.id, e.target.value)
                              }
                              className="w-28 text-right ml-auto h-9 font-mono"
                              aria-label={`Cantidad recibida de ${line.item?.name || "producto"}`}
                            />
                          ) : selectedTransfer.status === "PENDING_APPROVAL" ? (
                            <span className="text-xs text-muted-foreground">Aún no sale</span>
                          ) : (
                            <span className="font-mono font-bold text-foreground">
                              {formatNumber(
                                Number(
                                  line.received_quantity ?? line.quantity
                                ),
                                0
                              )}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedTransfer.status === "PENDING" && (
                <div className="space-y-2">
                  <label
                    htmlFor="reception-notes"
                    className="text-xs font-semibold text-foreground"
                  >
                    Nota de Recepción (opcional si hay discrepancias)
                  </label>
                  <Input
                    id="reception-notes"
                    placeholder="Ej. Recibido completo y verificado sin daños..."
                    value={receptionNotes}
                    onChange={(e) => setReceptionNotes(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedTransfer(null)}
                disabled={isProcessing}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPrintTransferId(selectedTransfer?.id || null)}
                disabled={selectedTransfer?.status === "PENDING_APPROVAL"}
                className="gap-1.5 text-xs h-9"
              >
                <Printer className="h-4 w-4" />
                Imprimir Guía Oficial
              </Button>
            </div>

            {selectedTransfer?.status === "PENDING" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmReject(true)}
                  disabled={isProcessing}
                  className="gap-1 min-h-[44px]"
                >
                  <XCircle className="h-4 w-4" />
                  {buttons.rejectTransfer}
                </Button>
                <Button
                  onClick={() => handleConfirmReception("ACCEPT")}
                  disabled={isProcessing}
                  className="gap-1 font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {buttons.receiveTransfer}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReject}
        title="¿Rechazar este traslado?"
        description="La cantidad vuelve al almacén de origen. Si el producto sí llegó, ciérralo y recíbelo."
        confirmLabel={buttons.rejectTransfer}
        destructive
        pending={isProcessing}
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => {
          setConfirmReject(false);
          void handleConfirmReception("REJECT");
        }}
      />

      <DocumentVoucherModal
        documentId={printTransferId}
        docNumber={null}
        onClose={() => setPrintTransferId(null)}
      />
    </div>
  );
};
