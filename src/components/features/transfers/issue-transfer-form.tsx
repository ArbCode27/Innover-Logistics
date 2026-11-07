"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Loader2,
  Plus,
  Send,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import {
  issueTransferSchema,
  type IssueTransferInput,
} from "@/lib/validators/transfer";
import { issueTransferAction } from "@/actions/transfers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Item, Location } from "@/types/inventory";

interface IssueTransferFormProps {
  locations: Location[];
  items: Item[];
  defaultOriginLocationId?: string;
}

export const IssueTransferForm: React.FC<IssueTransferFormProps> = ({
  locations,
  items,
  defaultOriginLocationId,
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] =
    React.useState<boolean>(false);
  const [pendingData, setPendingData] =
    React.useState<IssueTransferInput | null>(null);

  const warehouseLocations = locations.filter((l) => l.type === "branch");

  const defaultOrigin =
    defaultOriginLocationId || warehouseLocations[0]?.id || "";
  const defaultDest =
    warehouseLocations.find((l) => l.id !== defaultOrigin)?.id || "";

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IssueTransferInput>({
    resolver: zodResolver(issueTransferSchema),
    defaultValues: {
      origin_location_id: defaultOrigin,
      destination_location_id: defaultDest,
      notes: "",
      lines: [
        {
          item_id: items[0]?.id || "",
          quantity: 10,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const selectedOrigin = watch("origin_location_id");
  const selectedDest = watch("destination_location_id");

  const handleOpenConfirm = (data: IssueTransferInput): void => {
    setPendingData(data);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async (): Promise<void> => {
    if (!pendingData) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await issueTransferAction(pendingData);
      if (!res.success) {
        toast.error("Error al emitir guía de traslado", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Guía de traslado emitida exitosamente", {
        description: `Correlativo generado: ${res.data?.document_number}. El material queda en tránsito.`,
      });

      router.push("/guias/recepcion");
      router.refresh();
    } catch {
      toast.error("Error inesperado en el servidor");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Truck className="h-7 w-7 text-primary" aria-hidden="true" />
          Emitir Guía de Traslado Inter-Sedes
        </h1>
        <p className="text-sm text-muted-foreground">
          Al emitir, el stock se descuenta inmediatamente del almacén origen y
          permanece en estado PENDIENTE hasta su recepción formal en destino.
        </p>
      </div>

      <form onSubmit={handleSubmit(handleOpenConfirm)} className="space-y-6">
        {/* Origin & Destination Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              1. Sedes y Almacenes Involucrados
            </CardTitle>
            <CardDescription className="text-xs">
              Especifique la procedencia y el destino del envío físico.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin_location_id">Almacén Origen</Label>
              <select
                id="origin_location_id"
                {...register("origin_location_id")}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                {warehouseLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              {errors.origin_location_id && (
                <p className="text-xs text-destructive">
                  {errors.origin_location_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination_location_id">Almacén Destino</Label>
              <select
                id="destination_location_id"
                {...register("destination_location_id")}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                {warehouseLocations
                  .filter((l) => l.id !== selectedOrigin)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
              </select>
              {errors.destination_location_id && (
                <p className="text-xs text-destructive">
                  {errors.destination_location_id.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Items Lines Card */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                2. Materiales y Equipos a Transferir
              </CardTitle>
              <CardDescription className="text-xs">
                Añada cada línea con su cantidad exacta.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  item_id: items[0]?.id || "",
                  quantity: 1,
                  notes: "",
                })
              }
              className="gap-1 min-h-[38px]"
            >
              <Plus className="h-4 w-4" />
              Añadir Ítem
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              return (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-3 rounded-lg border bg-muted/20"
                >
                  <div className="flex-1 w-full space-y-1.5">
                    <Label className="text-xs">Ítem / Descripción</Label>
                    <select
                      {...register(`lines.${index}.item_id` as const)}
                      className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[44px]"
                    >
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          [{item.sku}] {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-32 space-y-1.5">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      {...register(`lines.${index}.quantity` as const, {
                        valueAsNumber: true,
                      })}
                      className="min-h-[44px] text-right font-mono"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-1.5">
                    <Label className="text-xs">Observación de línea (opcional)</Label>
                    <Input
                      placeholder="Lote, número de precinto..."
                      {...register(`lines.${index}.notes` as const)}
                      className="min-h-[44px]"
                    />
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10 shrink-0 h-11 w-11"
                      aria-label="Eliminar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}

            {errors.lines && (
              <p className="text-xs text-destructive">
                {errors.lines.message ||
                  errors.lines.root?.message ||
                  "Verifique las cantidades especificadas"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes & Actions Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              3. Motivo y Observaciones del Traslado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Indique chofer, placa del vehículo, motivo de reposición o precinto de seguridad..."
              {...register("notes")}
              className="min-h-[90px]"
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
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
                  Emitiendo...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Emitir Guía de Traslado
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              ¿Confirmar emisión de guía de traslado?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
              <p>
                Esta acción creará un correlativo oficial y descontará de forma
                inmediata los ítems del almacén de origen en el ledger contable.
              </p>
              <p className="font-semibold text-foreground">
                Total de líneas a transferir: {pendingData?.lines.length}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar datos</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-primary text-primary-foreground font-semibold"
            >
              Sí, emitir traslado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
