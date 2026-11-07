"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clock,
  FileQuestion,
  Loader2,
  PackageCheck,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  createMaterialRequestAction,
  updateRequestStatusAction,
  type MaterialRequestWithDetails,
} from "@/actions/requests";
import {
  materialRequestSchema,
  type MaterialRequestInput,
} from "@/lib/validators/request";
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
import type { Item, Location, RequestStatus, UserRole } from "@/types/inventory";

interface RequestsManagementViewProps {
  requests: MaterialRequestWithDetails[];
  items: Item[];
  crews: Location[];
  userRole: UserRole;
  userBranchId: string;
  userCrewId?: string;
}

export const RequestsManagementView: React.FC<RequestsManagementViewProps> = ({
  requests,
  items,
  crews,
  userRole,
  userBranchId,
  userCrewId,
}) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const defaultCrewId = userCrewId || crews[0]?.id || "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaterialRequestInput>({
    resolver: zodResolver(materialRequestSchema),
    defaultValues: {
      branch_id: userBranchId,
      crew_location_id: defaultCrewId,
      item_id: items[0]?.id || "",
      quantity: 5,
      ticket_ref: "",
      notes: "",
    },
  });

  const onSubmit = async (data: MaterialRequestInput): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await createMaterialRequestAction(data);
      if (!res.success) {
        toast.error("Error al crear solicitud", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Solicitud creada con éxito", {
        description: `Correlativo asignado: ${res.data?.request_number}`,
      });

      setIsModalOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Error inesperado en el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    requestId: string,
    status: RequestStatus
  ): Promise<void> => {
    try {
      const res = await updateRequestStatusAction(requestId, status);
      if (!res.success) {
        toast.error("No se pudo actualizar la solicitud", {
          description: res.error,
        });
        return;
      }

      toast.success(
        status === "APPROVED"
          ? "Solicitud Aprobada"
          : status === "DELIVERED"
          ? "Material Despachado y Entregado"
          : "Solicitud Rechazada"
      );
      router.refresh();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const canApprove = ["superadmin", "admin_sucursal"].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-primary" aria-hidden="true" />
            Solicitudes de Material
          </h1>
          <p className="text-sm text-muted-foreground">
            Flujo de abastecimiento de cuadrillas: Solicitado → Aprobado →
            Entregado.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2 font-semibold shadow-sm min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud de Material
        </Button>
      </div>

      {/* Requests Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">N° Solicitud</TableHead>
              <TableHead>Solicitante / Cuadrilla</TableHead>
              <TableHead>Material Requerido</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden md:table-cell">Ticket / OT</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              {canApprove && (
                <TableHead className="text-center w-[160px]">
                  Gestión Admin
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canApprove ? 7 : 6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No hay solicitudes registradas actualmente.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono font-bold text-xs">
                    {req.request_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {req.requester_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {req.crew_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{req.item_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      SKU: {req.item_sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatNumber(Number(req.quantity), 0)} {req.item_unit}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono">
                    {req.ticket_ref || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={req.status} type="request" />
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-center">
                      {req.status === "REQUESTED" && (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleUpdateStatus(req.id, "APPROVED")
                            }
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700 min-h-[36px]"
                            title="Aprobar solicitud"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleUpdateStatus(req.id, "REJECTED")
                            }
                            className="h-8 text-xs text-destructive hover:text-destructive min-h-[36px]"
                            title="Rechazar solicitud"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {req.status === "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, "DELIVERED")}
                          className="h-8 text-xs gap-1 bg-primary text-primary-foreground min-h-[36px]"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Despachar
                        </Button>
                      )}

                      {["DELIVERED", "REJECTED"].includes(req.status) && (
                        <span className="text-xs text-muted-foreground">
                          Procesado
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Request Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              Crear Solicitud de Abastecimiento
            </DialogTitle>
            <DialogDescription>
              La solicitud será enviada al Administrador de Sucursal para su
              aprobación y despacho.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="crew_location_id">Cuadrilla Receptora</Label>
              <select
                id="crew_location_id"
                {...register("crew_location_id")}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[44px]"
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item_id">Material / Equipo Solicitado</Label>
              <select
                id="item_id"
                {...register("item_id")}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[44px]"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.sku}] {i.name} ({i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="any"
                  {...register("quantity", { valueAsNumber: true })}
                  className="min-h-[44px] text-right font-mono"
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket_ref">Ticket / OT (opcional)</Label>
                <Input
                  id="ticket_ref"
                  placeholder="Ej. OT-90214"
                  {...register("ticket_ref")}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Justificación / Notas</Label>
              <Input
                id="notes"
                placeholder="Indique motivo o requerimiento especial..."
                {...register("notes")}
                className="min-h-[44px]"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 font-semibold shadow-md min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
