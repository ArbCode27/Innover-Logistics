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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageHeader } from "@/components/shared/page-header";
import { ListPager } from "@/components/shared/list-pager";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RequiredMark } from "@/components/shared/required-mark";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { buttons, explainError, hints, nav, terms } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import { clearFormDraft, readFormDraft, useFormDraft } from "@/lib/use-form-draft";
import { formatNumber } from "@/lib/utils";
import type { Item, Location, RequestStatus, UserRole } from "@/types/inventory";

interface RequestsManagementViewProps {
  requests: MaterialRequestWithDetails[];
  items: Item[];
  crews: Location[];
  userRole: UserRole;
  userBranchId: string;
  userCrewId?: string;
  initialProductId?: string;
}

export const RequestsManagementView: React.FC<RequestsManagementViewProps> = ({
  requests,
  items,
  crews,
  userRole,
  userBranchId,
  userCrewId,
  initialProductId,
}) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(Boolean(initialProductId));
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<{
    id: string;
    status: RequestStatus;
  } | null>(null);

  const defaultCrewId = userCrewId || crews[0]?.id || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MaterialRequestInput>({
    resolver: zodResolver(materialRequestSchema),
    mode: "onChange",
    defaultValues: {
      branch_id: userBranchId,
      crew_location_id: defaultCrewId,
      item_id: initialProductId || items[0]?.id || "",
      quantity: 1,
      ticket_ref: "",
      notes: "",
    },
  });

  useFormDraft<MaterialRequestInput>("draft:pedido", watch);
  const restoredDraft = React.useRef(false);

  React.useEffect(() => {
    if (restoredDraft.current || initialProductId) return;
    restoredDraft.current = true;
    const saved = readFormDraft<MaterialRequestInput>("draft:pedido");
    if (!saved?.item_id) return;
    reset({ ...saved, branch_id: userBranchId, quantity: Number(saved.quantity) || 1 });
  }, [initialProductId, reset, userBranchId]);

  React.useEffect(() => {
    if (!initialProductId) return;
    setValue("item_id", initialProductId, { shouldValidate: true });
    setIsModalOpen(true);
  }, [initialProductId, setValue]);

  const onSubmit = async (data: MaterialRequestInput): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await createMaterialRequestAction(data);
      if (!res.success) {
        toast.error(explainError("crear el pedido", res.error));
        setIsSubmitting(false);
        return;
      }

      toast.success("Pedido creado", {
        description: `Número: ${res.data?.request_number}`,
      });

      setIsModalOpen(false);
      clearFormDraft("draft:pedido");
      reset();
      router.refresh();
    } catch {
      toast.error(hints.connection);
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
        toast.error(explainError("actualizar el pedido", res.error));
        return;
      }

      toast.success(
        status === "APPROVED"
          ? "Pedido aprobado"
          : status === "DELIVERED"
          ? "Pedido entregado"
          : "Pedido rechazado"
      );
      router.refresh();
    } catch {
      toast.error(explainError("actualizar el pedido"), { description: hints.connection });
    }
  };

  const canApprove = ["superadmin", "admin_sucursal"].includes(userRole);
  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.toLowerCase();
    if (!query) return true;
    return (
      request.request_number.toLowerCase().includes(query) ||
      request.item_name.toLowerCase().includes(query) ||
      request.requester_name.toLowerCase().includes(query) ||
      (request.item_sku || "").toLowerCase().includes(query)
    );
  });
  const pager = usePagedList(filteredRequests, searchTerm);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        icon={FileQuestion}
        title={nav.requests}
        description="Pide productos para una cuadrilla. El administrador aprueba y luego entrega."
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            {buttons.newRequest}
          </Button>
        }
      />

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Buscar por número, producto o persona"
        aria-label="Buscar pedidos"
        className="min-h-[44px]"
      />

      {/* Requests Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">N° Solicitud</TableHead>
              <TableHead>Solicitante / Cuadrilla</TableHead>
              <TableHead>Material Requerido</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden md:table-cell">Orden de trabajo</TableHead>
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
                <TableCell colSpan={canApprove ? 7 : 6} className="p-4">
                  <EmptyState
                    title="Todavía no hay pedidos"
                    description="Crea un pedido cuando una cuadrilla necesite productos."
                    actionLabel={buttons.newRequest}
                    onAction={() => setIsModalOpen(true)}
                  />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canApprove ? 7 : 6} className="p-4">
                  <EmptyState
                    title="Ningún pedido coincide"
                    description="Prueba con otro nombre o quita la búsqueda."
                    actionLabel={buttons.clearFilters}
                    onAction={() => setSearchTerm("")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pager.rows.map((req) => (
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
                      {terms.code}: {req.item_sku}
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
                            {buttons.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPendingAction({ id: req.id, status: "REJECTED" })
                            }
                            className="h-8 text-xs text-destructive hover:text-destructive min-h-[36px]"
                            aria-label={buttons.rejectRequest}
                            title={buttons.rejectRequest}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {req.status === "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => setPendingAction({ id: req.id, status: "DELIVERED" })}
                          className="h-8 text-xs gap-1 bg-primary text-primary-foreground min-h-[36px]"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          {buttons.deliver}
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
        <ListPager page={pager.page} pageCount={pager.pageCount} total={pager.total} onPage={pager.setPage} />
      </Card>

      {/* New Request Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              {buttons.newRequest}
            </DialogTitle>
            <DialogDescription>
              El administrador de la sede lo revisa. Los campos con * son obligatorios. Lo que escribas se guarda en este navegador hasta que crees el pedido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="crew_location_id">{terms.crew}<RequiredMark /></Label>
              <Select
                value={watch("crew_location_id")}
                onValueChange={(val) =>
                  setValue("crew_location_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="crew_location_id" className="min-h-[44px]">
                  <SelectValue placeholder="Seleccione cuadrilla" />
                </SelectTrigger>
                <SelectContent>
                  {crews.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item_id">{terms.product}<RequiredMark /></Label>
              <Select
                value={watch("item_id")}
                onValueChange={(val) =>
                  setValue("item_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="item_id" className="min-h-[44px]">
                  <SelectValue placeholder="Seleccione material" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      [{i.sku}] {i.name} ({i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">{terms.quantity}<RequiredMark /></Label>
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
                <Label htmlFor="ticket_ref">Orden de trabajo ({hints.optional})</Label>
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
                    {buttons.createRequest}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={pendingAction?.status === "REJECTED" || pendingAction?.status === "DELIVERED"}
        title={pendingAction?.status === "DELIVERED" ? "¿Entregar este pedido?" : "¿Rechazar este pedido?"}
        description={
          pendingAction?.status === "DELIVERED"
            ? "Los productos salen del almacén y quedan en la cuadrilla. Si te equivocas, anula el comprobante en el historial."
            : "El pedido queda rechazado. La cuadrilla tendrá que crear uno nuevo si todavía lo necesita."
        }
        confirmLabel={pendingAction?.status === "DELIVERED" ? buttons.deliver : buttons.rejectRequest}
        destructive={pendingAction?.status === "REJECTED"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          const next = pendingAction;
          setPendingAction(null);
          void handleUpdateStatus(next.id, next.status);
        }}
      />
    </div>
  );
};
