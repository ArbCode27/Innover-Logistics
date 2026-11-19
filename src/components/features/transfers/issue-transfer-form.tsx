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
import { getInventoryStock } from "@/actions/inventory";
import { buttons, explainError, hints, nav, terms } from "@/lib/glossary";
import { RequiredMark } from "@/components/shared/required-mark";
import { PageHeader } from "@/components/shared/page-header";
import { clearFormDraft, useFormDraft } from "@/lib/use-form-draft";
import { readFormDraft } from "@/lib/use-form-draft";
import type { Item, Location, StockItemWithBalance } from "@/types/inventory";

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

  const [originStock, setOriginStock] = React.useState<StockItemWithBalance[]>([]);

  const warehouseLocations = locations.filter((l) => l.type === "branch");

  const defaultOrigin =
    defaultOriginLocationId || warehouseLocations[0]?.id || "";
  const defaultDest =
    warehouseLocations.find((l) => l.id !== defaultOrigin)?.id || "";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<IssueTransferInput>({
    resolver: zodResolver(issueTransferSchema),
    mode: "onChange",
    defaultValues: {
      origin_location_id: defaultOrigin,
      destination_location_id: defaultDest,
      notes: "",
      lines: [
        {
          item_id: items[0]?.id || "",
          quantity: 1,
          notes: "",
        },
      ],
    },
  });

  useFormDraft<IssueTransferInput>("draft:traslado", watch);
  const restoredDraft = React.useRef(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const selectedOrigin = watch("origin_location_id");
  const selectedDest = watch("destination_location_id");

  React.useEffect(() => {
    if (restoredDraft.current) return;
    restoredDraft.current = true;
    const saved = readFormDraft<IssueTransferInput>("draft:traslado");
    if (!saved?.origin_location_id) return;
    reset(saved);
  }, [reset]);

  React.useEffect(() => {
    if (!selectedOrigin) return;
    void getInventoryStock(selectedOrigin).then(setOriginStock).catch(() => setOriginStock([]));
  }, [selectedOrigin]);

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
        toast.error(explainError("registrar el traslado", res.error));
        setIsSubmitting(false);
        return;
      }

      toast.success("Traslado enviado a aprobación", {
        description: `Número ${res.data?.document_number}. El material sigue en el origen hasta que el administrador general lo autorice.`,
      });
      clearFormDraft("draft:traslado");

      router.push("/guias/recepcion");
      router.refresh();
    } catch {
      toast.error(hints.connection);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        icon={Truck}
        title={nav.sendTransfer}
        description="La orden queda pendiente de aprobación. El material sale del origen cuando el administrador general la autoriza, y el destino lo recibe después."
      />

      <form onSubmit={handleSubmit(handleOpenConfirm)} className="space-y-6">
        {/* Origin & Destination Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              1. Almacenes
            </CardTitle>
            <CardDescription>
              Elige de dónde sale y a dónde llega. Los campos con * son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin_location_id">{terms.warehouse} de origen<RequiredMark /></Label>
              <Select
                value={selectedOrigin}
                onValueChange={(val) =>
                  setValue("origin_location_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="origin_location_id" className="min-h-[44px]">
                  <SelectValue placeholder="Seleccione almacén de origen" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.origin_location_id && (
                <p className="text-xs text-destructive">
                  {errors.origin_location_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination_location_id">{terms.warehouse} de destino<RequiredMark /></Label>
              <Select
                value={watch("destination_location_id")}
                onValueChange={(val) =>
                  setValue("destination_location_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="destination_location_id" className="min-h-[44px]">
                  <SelectValue placeholder="Seleccione almacén de destino" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseLocations
                    .filter((l) => l.id !== selectedOrigin)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
                2. {terms.products}
              </CardTitle>
              <CardDescription>
                Agrega cada producto y la cantidad. Se muestra cuánto hay en el origen.
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
              {buttons.addLine}
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
                    <Label className="text-xs">{terms.product}<RequiredMark /></Label>
                    <Select
                      value={watch(`lines.${index}.item_id`)}
                      onValueChange={(val) =>
                        setValue(`lines.${index}.item_id`, val, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="min-h-[44px]">
                        <SelectValue placeholder="Elige un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => {
                          const available =
                            originStock.find((stockItem) => stockItem.id === item.id)
                              ?.current_stock ?? 0;
                          return (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} · {available} disponibles
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:w-32 space-y-1.5">
                    <Label className="text-xs">{terms.quantity}<RequiredMark /></Label>
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
                    aria-label={buttons.removeLine}
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
              3. Notas del traslado
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
                  {buttons.registerTransfer}
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
              ¿Registrar este traslado?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
              <p>
                La cantidad no sale todavía. El administrador general debe aprobar el traslado. Después, el destino lo recibe.
              </p>
              <p className="font-semibold text-foreground">
                Productos en este traslado: {pendingData?.lines.length}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar datos</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {buttons.registerTransfer}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
