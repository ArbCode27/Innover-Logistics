"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { reviewDocumentAction } from "@/actions/approvals";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buttons, nav } from "@/lib/glossary";
import { formatDate, formatNumber } from "@/lib/utils";
import type { DocumentWithDetails } from "@/types/inventory";

interface ApprovalsInboxViewProps {
  documents: DocumentWithDetails[];
  currentUserId: string;
}

const workTypeLabel = (workType?: string | null): string => {
  if (workType === "client_job") return "Instalación con cliente";
  if (workType === "field_project") return "Obra o proyecto";
  return "Mantenimiento interno";
};

export const ApprovalsInboxView: React.FC<ApprovalsInboxViewProps> = ({
  documents,
  currentUserId,
}) => {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [approveTarget, setApproveTarget] = React.useState<DocumentWithDetails | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<DocumentWithDetails | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const exits = documents.filter((document) => document.document_type === "consumption");
  const transfers = documents.filter((document) => document.document_type === "transfer");

  const handleReview = async (
    document: DocumentWithDetails,
    action: "APPROVE" | "REJECT",
    notes?: string
  ): Promise<void> => {
    setPendingId(document.id);
    try {
      const result = await reviewDocumentAction({
        document_id: document.id,
        action,
        notes: notes || null,
      });

      if (!result.success) {
        toast.error("No se pudo registrar la revisión", { description: result.error });
        return;
      }

      if (action === "APPROVE" && document.document_type === "consumption") {
        toast.success("Salida aprobada", {
          description: "El material ya salió del almacén.",
        });
      } else if (action === "APPROVE") {
        toast.success("Traslado aprobado", {
          description: "El material salió del origen y queda en camino.",
        });
      } else {
        toast.success("Orden rechazada", {
          description: "El material sigue disponible en el almacén de origen.",
        });
      }

      setApproveTarget(null);
      setRejectTarget(null);
      setRejectReason("");
      router.refresh();
    } catch {
      toast.error("No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.");
    } finally {
      setPendingId(null);
    }
  };

  const renderDocument = (document: DocumentWithDetails, index: number) => {
    const isOwn = document.created_by === currentUserId;
    const isExit = document.document_type === "consumption";

    return (
      <motion.article
        key={document.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, delay: index * 0.04 }}
        className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm font-bold">
                {document.delivery_note_number || document.document_number}
              </h2>
              <Badge variant="warning">Pendiente de aprobación</Badge>
              {isOwn ? <Badge variant="outline">Emitida por ti</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {document.origin_location?.name || document.branch?.name}
              {document.destination_location
                ? ` → ${document.destination_location.name}`
                : ""}
              {" · "}
              {formatDate(document.created_at)}
              {" · "}
              {document.creator?.full_name || "Almacén"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] gap-2"
              disabled={pendingId === document.id || isOwn}
              onClick={() => {
                setRejectReason("");
                setRejectTarget(document);
              }}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {buttons.rejectOrder}
            </Button>
            <Button
              type="button"
              className="min-h-[44px] gap-2"
              disabled={pendingId === document.id || isOwn}
              onClick={() => setApproveTarget(document)}
            >
              {pendingId === document.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {buttons.approveOrder}
            </Button>
          </div>
        </div>

        {isOwn ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Quien emite la orden no puede aprobarla. Tiene que revisarla otro administrador general.
          </p>
        ) : null}

        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {isExit ? (
            <>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Motivo
                </dt>
                <dd>{workTypeLabel(document.work_type)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Técnico que recibe
                </dt>
                <dd>{document.technician_name || "Sin técnico"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Destino del trabajo
                </dt>
                <dd>
                  {document.work_type === "client_job"
                    ? `${document.client_name || "Cliente"} · ${document.client_code || "sin código"}`
                    : document.project_name || document.reason || "Salida interna"}
                </dd>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notas del traslado
              </dt>
              <dd>{document.notes || "Sin notas"}</dd>
            </div>
          )}
        </dl>

        <ul className="divide-y rounded-lg border">
          {document.lines?.map((line) => (
            <li key={line.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{line.item?.name || "Producto"}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {line.item?.sku}
                </span>
              </span>
              <span className="font-mono font-semibold">
                {formatNumber(Number(line.quantity), 0)} {line.item?.unit || ""}
              </span>
            </li>
          ))}
        </ul>
      </motion.article>
    );
  };

  const renderList = (rows: DocumentWithDetails[], emptyTitle: string, emptyDescription: string) => {
    if (rows.length === 0) {
      return <EmptyState icon={ShieldCheck} title={emptyTitle} description={emptyDescription} />;
    }

    return (
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {rows.map((document, index) => renderDocument(document, index))}
        </div>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <PageHeader
        icon={ShieldCheck}
        title={nav.approvals}
        description="El almacén ya emitió estas órdenes. El material se mueve cuando las apruebas."
      />

      <Tabs defaultValue="exits">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="exits" className="min-h-[44px] gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Salidas ({exits.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="min-h-[44px] gap-2">
            <Truck className="h-4 w-4" aria-hidden="true" />
            Traslados ({transfers.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="exits" className="mt-4">
          {renderList(
            exits,
            "No hay salidas por aprobar",
            "Cuando el almacén emita una orden de salida, aparecerá aquí."
          )}
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          {renderList(
            transfers,
            "No hay traslados por aprobar",
            "Cuando el almacén emita un traslado, aparecerá aquí antes de salir del origen."
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="¿Aprobar esta orden?"
        description={
          approveTarget?.document_type === "transfer"
            ? "Al aprobarla, la cantidad sale del almacén de origen y queda en camino hasta que el destino la reciba."
            : "Al aprobarla, la cantidad sale del almacén y la nota de entrega queda despachada."
        }
        confirmLabel={buttons.approveOrder}
        pending={Boolean(pendingId)}
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (!approveTarget) return;
          void handleReview(approveTarget, "APPROVE");
        }}
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingId) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar orden</DialogTitle>
            <DialogDescription>
              El material no se mueve y los equipos reservados vuelven a estar disponibles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Explica por qué no se autoriza esta orden"
              className="min-h-[96px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(pendingId)}
              onClick={() => setRejectTarget(null)}
            >
              {buttons.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              disabled={Boolean(pendingId) || rejectReason.trim().length < 3}
              onClick={() => {
                if (!rejectTarget) return;
                void handleReview(rejectTarget, "REJECT", rejectReason.trim());
              }}
            >
              {buttons.rejectOrder}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
