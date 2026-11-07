"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Flame,
  History,
  Loader2,
  Plus,
  Send,
  Ticket,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  consumptionSchema,
  type ConsumptionInput,
} from "@/lib/validators/consumption";
import { consumeStockAction } from "@/actions/consumptions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import type {
  DocumentWithDetails,
  Item,
  Location,
  SerializedItemWithDetails,
  UserRole,
} from "@/types/inventory";

interface FieldConsumptionFormProps {
  crews: Location[];
  items: Item[];
  consumptions: DocumentWithDetails[];
  userRole: UserRole;
  defaultCrewId?: string;
  serializedUnits: SerializedItemWithDetails[];
}

export const FieldConsumptionForm: React.FC<FieldConsumptionFormProps> = ({
  crews,
  items,
  consumptions,
  userRole,
  defaultCrewId,
  serializedUnits,
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [viewHistory, setViewHistory] = React.useState<boolean>(false);

  const initialCrewId = defaultCrewId || crews[0]?.id || "";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ConsumptionInput>({
    resolver: zodResolver(consumptionSchema),
    defaultValues: {
      crew_location_id: initialCrewId,
      ticket_ref: "",
      reason: "Instalación residencial FTTH",
      notes: "",
      lines: [
        {
          item_id: items[0]?.id || "",
          quantity: 75,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const selectedCrew = watch("crew_location_id");

  // Filter serialized units available in this crew
  const availableSerials = React.useMemo(() => {
    return serializedUnits.filter(
      (u) =>
        u.current_location_id === selectedCrew ||
        u.status === "assigned_crew" ||
        u.status === "in_stock"
    );
  }, [serializedUnits, selectedCrew]);

  const onSubmit = async (data: ConsumptionInput): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await consumeStockAction(data);
      if (!res.success) {
        toast.error("Error al registrar consumo", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("¡Consumo registrado exitosamente!", {
        description: `Comprobante auditado: ${res.data?.document_number} asignado a ${data.ticket_ref}`,
      });

      // Quick reset for next field job
      reset({
        crew_location_id: data.crew_location_id,
        ticket_ref: "",
        reason: data.reason,
        notes: "",
        lines: [
          {
            item_id: items[0]?.id || "",
            quantity: 50,
          },
        ],
      });

      router.refresh();
    } catch {
      toast.error("Error inesperado al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddCommonMaterial = (itemId: string, defaultQty: number) => {
    append({
      item_id: itemId,
      quantity: defaultQty,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header and Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Flame className="h-7 w-7 text-orange-500" aria-hidden="true" />
              Consumo de Material en Campo
            </h1>
            <Badge variant="warning" className="gap-1 font-mono text-xs">
              <Zap className="h-3 w-3" /> &lt;30s
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Registro ultra-rápido de gasto por orden de trabajo (OT) o ticket de
            avería.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewHistory(!viewHistory)}
          className="gap-1.5 self-start sm:self-auto min-h-[44px]"
        >
          <History className="h-4 w-4" />
          {viewHistory ? "Registrar Nuevo Consumo" : "Ver Historial de Consumos"}
        </Button>
      </div>

      {viewHistory ? (
        /* History of field consumptions */
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              Comprobantes de Consumo en Campo
            </CardTitle>
            <CardDescription className="text-xs">
              Todos los consumos registrados con deducción inmediata del stock de
              cuadrilla.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correlativo</TableHead>
                  <TableHead>OT / Ticket</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Cuadrilla</TableHead>
                  <TableHead>Materiales</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No hay registros de consumo previos.
                    </TableCell>
                  </TableRow>
                ) : (
                  consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold text-xs">
                        {c.document_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" className="font-mono">
                          {c.ticket_ref}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {c.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.origin_location?.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.lines.map((l) => (
                          <div key={l.id}>
                            {formatNumber(Number(l.quantity), 0)}{" "}
                            {l.item?.unit} {l.item?.name}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Fast mobile-first field registration form */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Work Order Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                1. Datos de la Orden de Trabajo (Obligatorio)
              </CardTitle>
              <CardDescription className="text-xs">
                Exigido por auditoría para asociar el gasto de material al abonado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crew_location_id">Cuadrilla Responsable</Label>
                <select
                  id="crew_location_id"
                  {...register("crew_location_id")}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                >
                  {crews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.crew_location_id && (
                  <p className="text-xs text-destructive">
                    {errors.crew_location_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket_ref">N° de Ticket / OT</Label>
                <Input
                  id="ticket_ref"
                  placeholder="Ej. OT-88421 o INC-901"
                  {...register("ticket_ref")}
                  className="min-h-[44px] font-mono font-bold"
                  aria-invalid={!!errors.ticket_ref}
                />
                {errors.ticket_ref && (
                  <p className="text-xs text-destructive">
                    {errors.ticket_ref.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="reason">Motivo del Consumo</Label>
                <Input
                  id="reason"
                  placeholder="Ej. Acometida FTTH nueva, sustitución de conector dañado..."
                  {...register("reason")}
                  className="min-h-[44px]"
                />
                {errors.reason && (
                  <p className="text-xs text-destructive">
                    {errors.reason.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Item Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Atajos rápidos:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickAddCommonMaterial(
                  items.find((i) => i.sku === "FIB-DRP-001")?.id || items[0].id,
                  60
                )
              }
              className="text-xs min-h-[38px]"
            >
              + 60m Fibra Drop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickAddCommonMaterial(
                  items.find((i) => i.sku === "CON-RAP-SCAPC")?.id || items[0].id,
                  2
                )
              }
              className="text-xs min-h-[38px]"
            >
              + 2 Conectores SC/APC
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickAddCommonMaterial(
                  items.find((i) => i.sku === "HER-TEN-DRP")?.id || items[0].id,
                  2
                )
              }
              className="text-xs min-h-[38px]"
            >
              + 2 Tensores Drop
            </Button>
          </div>

          {/* Items Consumed Lines Card */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  2. Materiales y Equipos Utilizados
                </CardTitle>
                <CardDescription className="text-xs">
                  Descuenta directamente del balance de la cuadrilla.
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
                  })
                }
                className="gap-1 min-h-[38px]"
              >
                <Plus className="h-4 w-4" />
                Añadir Otro
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const currentItemId = watch(`lines.${index}.item_id`);
                const currentItem = items.find((i) => i.id === currentItemId);

                return (
                  <div
                    key={field.id}
                    className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-3 rounded-lg border bg-muted/20"
                  >
                    <div className="flex-1 w-full space-y-1.5">
                      <Label className="text-xs">Material / Equipo</Label>
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
                      <Label className="text-xs">
                        Cantidad ({currentItem?.unit || "cant"})
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        {...register(`lines.${index}.quantity` as const, {
                          valueAsNumber: true,
                        })}
                        className="min-h-[44px] text-right font-mono font-bold"
                      />
                    </div>

                    {/* Serial selector if item is serialized */}
                    {currentItem?.is_serialized && (
                      <div className="flex-1 w-full space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-primary" />
                          Serial del Equipo
                        </Label>
                        <select
                          {...register(
                            `lines.${index}.serial_unit_id` as const
                          )}
                          className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground min-h-[44px]"
                        >
                          <option value="">Seleccione serial...</option>
                          {availableSerials
                            .filter((s) => s.item_id === currentItem.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                SN: {s.serial_number} (MAC: {s.mac_address})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:bg-destructive/10 shrink-0 h-11 w-11"
                        aria-label="Quitar material"
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
                    "Indique al menos un ítem"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Optional Notes & Fast Submit */}
          <Card className="border shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Label htmlFor="notes" className="text-xs">
                Observaciones del Trabajo (opcional)
              </Label>
              <Input
                id="notes"
                placeholder="Ej. Conexión en caja NAP-04 puerto 6, potencia normalizada"
                {...register("notes")}
                className="min-h-[44px]"
              />
            </CardContent>

            <CardFooter className="flex justify-end gap-3 pt-3 pb-4 px-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto font-bold gap-2 text-base shadow-lg bg-orange-600 hover:bg-orange-500 text-white min-h-[48px] px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Registrando en Ledger...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Registrar Consumo en &lt;30s
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
};
