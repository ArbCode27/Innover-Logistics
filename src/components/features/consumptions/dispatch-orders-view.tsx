"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  Building2,
  User,
  Briefcase,
  History,
  Send,
  Loader2,
  Camera,
  Boxes,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  PackageOpen,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

import {
  dispatchOrderFormSchema,
  type DispatchOrderInput,
} from "@/lib/validators/dispatch-order";
import { createDispatchOrderAction } from "@/actions/dispatch-orders";
import { exportDeliveryNotesToExcel } from "@/lib/export-excel";
import { buttons } from "@/lib/glossary";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatNumber } from "@/lib/utils";
import { DocumentVoucherModal } from "@/components/features/history/document-voucher-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { Printer } from "lucide-react";
import type {
  DocumentWithDetails,
  Item,
  Location,
  SerializedItemWithDetails,
  Technician,
  UserRole,
} from "@/types/inventory";

interface DispatchOrdersViewProps {
  locations: Location[];
  items: ItemsCatalogProps;
  historyDocuments: DocumentWithDetails[];
  technicians: Technician[];
  userRole: UserRole;
  defaultLocationId?: string;
  serializedUnits: SerializedItemWithDetails[];
}

type ItemsCatalogProps = Item[];

// Kits predefinidos de materiales
const MATERIAL_KITS = [
  {
    id: "kit-ftth-standard",
    name: "Kit Instalación Residencial FTTH",
    description: "60m cable drop, 2 conectores SC/APC, 2 tensores y 1 ONU GPON",
    badge: "Instalación",
    items: [
      { sku: "FIB-DRP-001", quantity: 60 },
      { sku: "CON-RAP-SCAPC", quantity: 2 },
      { sku: "HER-TEN-DRP", quantity: 2 },
      { sku: "ONU-HUA-EG8145V5", quantity: 1 },
    ],
  },
  {
    id: "kit-obra-troncal",
    name: "Kit Despliegue Proyecto / Obra",
    description: "1 Bobina Drop 1000m, 20 tensores y 25 conectores",
    badge: "Obra",
    items: [
      { sku: "BOB-DRP-1KM", quantity: 1 },
      { sku: "HER-TEN-DRP", quantity: 20 },
      { sku: "CON-RAP-SCAPC", quantity: 25 },
    ],
  },
  {
    id: "kit-mantenimiento",
    name: "Kit Mantenimiento Rápido de Acometida",
    description: "25m drop, 2 conectores y 1 tensor",
    badge: "Mantenimiento",
    items: [
      { sku: "FIB-DRP-001", quantity: 25 },
      { sku: "CON-RAP-SCAPC", quantity: 2 },
      { sku: "HER-TEN-DRP", quantity: 1 },
    ],
  },
];

export const DispatchOrdersView: React.FC<DispatchOrdersViewProps> = ({
  locations,
  items,
  historyDocuments,
  technicians,
  userRole,
  defaultLocationId,
  serializedUnits,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"form" | "history">("form");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [filterSearch, setFilterSearch] = React.useState<string>("");
  const [filterWorkType, setFilterWorkType] = React.useState<string>("all");
  const [selectedDocDetails, setSelectedDocDetails] = React.useState<DocumentWithDetails | null>(null);
  const [printVoucherId, setPrintVoucherId] = React.useState<string | null>(null);
  const [pendingExit, setPendingExit] = React.useState<DispatchOrderInput | null>(null);

  // Fecha de hoy por defecto (YYYY-MM-DD)
  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const initialLocationId = defaultLocationId || locations[0]?.id || "";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DispatchOrderInput>({
    resolver: zodResolver(dispatchOrderFormSchema),
    mode: "onChange",
    defaultValues: {
      location_id: initialLocationId,
      date: todayStr,
      work_type: "client_job",
      reason: "Instalación",
      client_name: "",
      client_code: "",
      project_name: "",
      technician_name: "",
      assigned_technician_id: "",
      receiver_mode: "warehouse_decides",
      notes: "",
      lines: [
        {
          item_id: items[0]?.id || "",
          quantity: 1,
        },
      ],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "lines",
  });

  const selectedWorkType = watch("work_type");
  const selectedLocation = watch("location_id");
  const selectedTechnicianId = watch("assigned_technician_id");
  const canIssue = userRole === "superadmin" || userRole === "admin_sucursal";

  const techniciansForBranch = React.useMemo(() => {
    const location = locations.find((item) => item.id === selectedLocation);
    return technicians.filter(
      (technician) =>
        technician.is_active &&
        (!location || technician.branch_id === location.branch_id)
    );
  }, [technicians, locations, selectedLocation]);

  React.useEffect(() => {
    if (!selectedTechnicianId) return;
    const stillAvailable = techniciansForBranch.some(
      (technician) => technician.id === selectedTechnicianId
    );
    if (!stillAvailable) {
      setValue("assigned_technician_id", "");
      setValue("technician_name", "");
    }
  }, [selectedTechnicianId, techniciansForBranch, setValue]);

  // Filtro de seriales disponibles para la ubicación seleccionada
  const availableSerialsForLocation = React.useMemo(() => {
    return serializedUnits.filter(
      (unit) =>
        unit.current_location_id === selectedLocation &&
        (unit.status === "in_stock" || unit.status === "assigned_crew")
    );
  }, [serializedUnits, selectedLocation]);

  // Aplicar un kit de materiales al formulario
  const handleApplyKit = (kitId: string) => {
    const selectedKit = MATERIAL_KITS.find((k) => k.id === kitId);
    if (!selectedKit) return;

    const newLines = selectedKit.items
      .map((kItem) => {
        const found = items.find((i) => i.sku === kItem.sku);
        if (!found) return null;
        return {
          item_id: found.id,
          quantity: kItem.quantity,
          serial_unit_id: null,
        };
      })
      .filter(Boolean) as { item_id: string; quantity: number; serial_unit_id: null }[];

    if (newLines.length > 0) {
      replace(newLines);
      toast.info(`Kit aplicado: "${selectedKit.name}"`);
    }
  };

  // Enviar orden de salida
  const onSubmit = (data: DispatchOrderInput): void => {
    setPendingExit(data);
  };

  const handleConfirmExit = async (): Promise<void> => {
    if (!pendingExit) return;
    const data = pendingExit;
    setPendingExit(null);
    setIsSubmitting(true);
    try {
      const res = await createDispatchOrderAction(data);
      if (!res.success) {
        toast.error("No se pudo registrar la salida. Revisa la cantidad y el almacén e inténtalo de nuevo.", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Salida enviada a aprobación", {
        description: `Comprobante ${res.data?.document_number}. El material sale cuando el administrador general la autorice.`,
      });

      // Resetear campos del formulario manteniendo almacén y fecha
      reset({
        location_id: data.location_id,
        date: todayStr,
        work_type: data.work_type,
        reason: data.reason,
        client_name: "",
        client_code: "",
        project_name: "",
        technician_name: "",
        assigned_technician_id: "",
        receiver_mode: "warehouse_decides",
        notes: "",
        lines: [
          {
            item_id: items[0]?.id || "",
            quantity: 1,
          },
        ],
      });

      router.refresh();
      setActiveTab("history");
    } catch {
      toast.error("No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de documentos en historial
  const filteredHistory = React.useMemo(() => {
    return historyDocuments.filter((doc) => {
      const matchesWorkType =
        filterWorkType === "all" || doc.work_type === filterWorkType;

      const query = filterSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        doc.document_number.toLowerCase().includes(query) ||
        (doc.delivery_note_number && doc.delivery_note_number.toLowerCase().includes(query)) ||
        (doc.client_name && doc.client_name.toLowerCase().includes(query)) ||
        (doc.client_code && doc.client_code.toLowerCase().includes(query)) ||
        (doc.project_name && doc.project_name.toLowerCase().includes(query)) ||
        (doc.technician_name && doc.technician_name.toLowerCase().includes(query)) ||
        (doc.reason && doc.reason.toLowerCase().includes(query));

      return matchesWorkType && matchesSearch;
    });
  }, [historyDocuments, filterWorkType, filterSearch]);

  const handleExportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.warning("No hay notas de entrega para exportar con los filtros seleccionados");
      return;
    }
    exportDeliveryNotesToExcel(filteredHistory, "Notas_de_Entrega_Innover");
    toast.success("Reporte Excel descargado con éxito");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Encabezado General */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Salidas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            El encargado de almacén emite la salida. El material se descuenta cuando el administrador general la aprueba.
          </p>
        </div>

        {/* Botones de navegación interna y Exportación */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "form" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("form")}
            className="gap-2 min-h-[40px]"
          >
            <FileText className="h-4 w-4" />
            {buttons.registerExit}
          </Button>

          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className="gap-2 min-h-[40px]"
          >
            <History className="h-4 w-4" />
            Historial de Notas ({historyDocuments.length})
          </Button>

          {activeTab === "history" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 min-h-[40px]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* PESTAÑA 1: FORMULARIO DE SALIDA */}
      {activeTab === "form" && canIssue && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-xl font-bold flex items-center justify-between">
                <span>Solicitar salida del almacén</span>
                <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
                  Pendiente hasta la aprobación
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                La nota de entrega se genera ahora. El inventario baja cuando el administrador general aprueba la orden.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* FILA 1: MOTIVO (TIPO TRABAJO), ALMACÉN, FECHA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work_type" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Motivo / Tipo de Trabajo
                  </Label>
                  <Select
                    value={watch("work_type")}
                    onValueChange={(val: any) =>
                      setValue("work_type", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Seleccione motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_job">Instalación (Trabajo con Cliente)</SelectItem>
                      <SelectItem value="field_project">Trabajo de Campo (Proyecto u Obra)</SelectItem>
                      <SelectItem value="internal_maintenance">Mantenimiento Interno / Operativo</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.work_type && (
                    <p className="text-xs text-destructive">{errors.work_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_id" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Almacén
                  </Label>
                  <Select
                    value={watch("location_id")}
                    onValueChange={(val) =>
                      setValue("location_id", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Seleccione almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type === "branch" ? "Almacén" : "Cuadrilla"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location_id && (
                    <p className="text-xs text-destructive">{errors.location_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Fecha
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("date")}
                    className="min-h-[44px]"
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>
              </div>

              {/* FILA 2 CONDICIONAL: CAMPOS SEGÚN EL TIPO DE TRABAJO */}
              {selectedWorkType === "client_job" && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <User className="h-4 w-4" />
                    Datos del Abonado / Cliente
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="client_name" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                        Cliente <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="client_name"
                        placeholder="Nombre completo o Razón Social del cliente"
                        {...register("client_name")}
                        className="min-h-[44px]"
                      />
                      {errors.client_name && (
                        <p className="text-xs text-destructive">{errors.client_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="client_code" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                        Contrato o Código del Cliente <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="client_code"
                        placeholder="Ej. CTR-98421 o CI-V-12345678"
                        {...register("client_code")}
                        className="min-h-[44px] font-mono"
                      />
                      {errors.client_code && (
                        <p className="text-xs text-destructive">{errors.client_code.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedWorkType === "field_project" && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Briefcase className="h-4 w-4" />
                    Datos del Proyecto / Obra de Red
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="project_name" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                        Proyecto u Obra <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="project_name"
                        placeholder="Ej. Despliegue Troncal Manzana 4, Tendido Fibra Sector Este..."
                        {...register("project_name")}
                        className="min-h-[44px]"
                      />
                      {errors.project_name && (
                        <p className="text-xs text-destructive">{errors.project_name.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* FILA 3: RESPONSABLE / TÉCNICO & DESTINATARIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <Label htmlFor="assigned_technician_id" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Técnico que recibe el material <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedTechnicianId || undefined}
                    onValueChange={(value) => {
                      const technician = techniciansForBranch.find((item) => item.id === value);
                      setValue("assigned_technician_id", value, { shouldValidate: true });
                      setValue("technician_name", technician?.full_name || "", {
                        shouldValidate: true,
                      });
                    }}
                  >
                    <SelectTrigger id="assigned_technician_id" className="min-h-[44px]">
                      <SelectValue placeholder="Seleccione un técnico activo" />
                    </SelectTrigger>
                    <SelectContent>
                      {techniciansForBranch.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.full_name} · {technician.document_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {techniciansForBranch.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No hay técnicos activos en esta sede.{" "}
                      <Link href="/tecnicos" className="font-semibold text-primary underline-offset-2 hover:underline">
                        Registrar técnico
                      </Link>
                    </p>
                  ) : null}
                  {errors.assigned_technician_id && (
                    <p className="text-xs text-destructive">{errors.assigned_technician_id.message}</p>
                  )}
                </motion.div>

                <div className="space-y-2">
                  <Label htmlFor="receiver_mode" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Se Entregará A
                  </Label>
                  <Select
                    value={watch("receiver_mode")}
                    onValueChange={(val) =>
                      setValue("receiver_mode", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Modo de entrega" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse_decides">Lo decide el almacén al despachar</SelectItem>
                      <SelectItem value="technician_direct">Entrega directa al técnico solicitante</SelectItem>
                      <SelectItem value="third_party_contractor">Contratista / Cuadrilla externa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SECCIÓN PRODUCTOS CON BARRA DE ACCIÓN: KITS, ESCANEAR, AGREGAR LÍNEA */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Productos</h3>
                    <p className="text-xs text-muted-foreground">
                      Materiales y equipos que saldrán del inventario físico.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selector de Kits */}
                    <div className="w-48">
                      <Select
                        onValueChange={(val) => {
                          if (val) handleApplyKit(val);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Agregar kit..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_KITS.map((kit) => (
                            <SelectItem key={kit.id} value={kit.id} className="text-xs">
                              {kit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.info("El lector está listo. Apunta al código o al número de serie.");
                      }}
                      className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Escanear
                    </Button>

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
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar línea
                    </Button>
                  </div>
                </div>

                {/* Líneas de productos */}
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const currentItemId = watch(`lines.${index}.item_id`);
                    const currentItem = items.find((i) => i.id === currentItemId);
                    const isSerialized = currentItem?.is_serialized;

                    return (
                      <div
                        key={field.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors"
                      >
                        {/* Selector de producto */}
                        <div className="flex-1 w-full space-y-1">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Producto / Código o Nombre
                          </Label>
                          <Select
                            value={currentItemId}
                            onValueChange={(val) =>
                              setValue(`lines.${index}.item_id`, val, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue placeholder="Seleccione producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.id} value={item.id} className="text-xs">
                                  [{item.sku}] {item.name} ({item.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Cantidad */}
                        <div className="w-full sm:w-32 space-y-1">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Cantidad ({currentItem?.unit || "und"})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            {...register(`lines.${index}.quantity` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-10 text-center font-bold"
                          />
                        </div>

                        {/* Serial si el producto es serializado */}
                        {isSerialized && (
                          <div className="w-full sm:w-56 space-y-1">
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Serial / MAC
                            </Label>
                            <Select
                              value={watch(`lines.${index}.serial_unit_id`) || "none"}
                              onValueChange={(val) =>
                                setValue(
                                  `lines.${index}.serial_unit_id`,
                                  val === "none" ? null : val
                                )
                              }
                            >
                              <SelectTrigger className="h-10 text-xs">
                                <SelectValue placeholder="Asignar en almacén..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">
                                  Asignar en almacén...
                                </SelectItem>
                                {availableSerialsForLocation
                                  .filter((s) => s.item_id === currentItemId)
                                  .map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs font-mono">
                                      S/N: {s.serial_number} {s.mac_address ? `(${s.mac_address})` : ""}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Botón eliminar fila */}
                        <div className="self-end sm:self-center pt-2 sm:pt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.lines && (
                  <p className="text-xs text-destructive">{errors.lines.message}</p>
                )}
              </div>

              {/* SECCIÓN NOTAS / OBSERVACIONES */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="notes" className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                  Notas / Observaciones
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Detalles adicionales sobre la entrega, condiciones de retiro o autorizaciones..."
                  rows={2}
                  {...register("notes")}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>

            <CardFooter className="bg-muted/20 border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Total de líneas agregadas: <strong className="text-foreground">{fields.length}</strong>
              </span>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto gap-2 min-h-[44px] px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando salida...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {buttons.registerExit}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {activeTab === "form" && !canIssue && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Solo el encargado de almacén puede emitir una salida. Puedes consultar el historial de notas.
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE NOTAS DE ENTREGA */}
      {activeTab === "history" && (
        <Card className="border shadow-sm">
          <CardHeader className="p-4 sm:p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Registro Histórico de Notas de Entrega
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Bitácora inmutable de salidas internas con trazabilidad completa de clientes, obras y materiales.
                </CardDescription>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, obra, N° o técnico..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="w-48">
                  <Select
                    value={filterWorkType}
                    onValueChange={(val) => setFilterWorkType(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Tipo de salida" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los motivos</SelectItem>
                      <SelectItem value="client_job">Clientes / Instalación</SelectItem>
                      <SelectItem value="field_project">Obras / Proyectos</SelectItem>
                      <SelectItem value="internal_maintenance">Mantenimiento Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Nota de Entrega</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo / Destino</TableHead>
                  <TableHead>Técnico / Cuadrilla</TableHead>
                  <TableHead>Materiales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No se encontraron registros de notas de entrega con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((doc) => {
                    const isClient = doc.work_type === "client_job";
                    const totalQty = doc.lines?.reduce((acc, l) => acc + Number(l.quantity || 0), 0) || 0;

                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold">
                          <div>{doc.delivery_note_number || doc.document_number}</div>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {doc.document_number}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </TableCell>

                        <TableCell className="text-xs">
                          {isClient ? (
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1">
                                <User className="h-3 w-3 text-blue-500" />
                                {doc.client_name || "Cliente S/N"}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Cód: {doc.client_code || "-"}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-amber-500" />
                                {doc.project_name || "Obra sin nombre"}
                              </div>
                              <span className="text-[11px] text-muted-foreground">Proyecto de campo</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-foreground">
                          {doc.technician_name || "Almacén decide"}
                        </TableCell>

                        <TableCell className="text-xs">
                          <span className="font-medium text-foreground">
                            {doc.lines?.length || 0} ítems
                          </span>{" "}
                          <span className="text-muted-foreground">({totalQty} unid.)</span>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDocDetails(doc)}
                            className="h-8 px-2 text-xs text-primary gap-1"
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG DE DETALLE DE NOTA DE ENTREGA */}
      {selectedDocDetails && (
        <Dialog open={!!selectedDocDetails} onOpenChange={() => setSelectedDocDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <span>Nota de Entrega: {selectedDocDetails.delivery_note_number}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedDocDetails.document_number}
                  </Badge>
                </DialogTitle>
                {selectedDocDetails.status === "APPROVED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintVoucherId(selectedDocDetails.id)}
                  className="gap-1.5 text-xs h-8 mr-6"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Comprobante Oficial
                </Button>
                ) : (
                  <Badge variant="outline" className="mr-6">
                    {selectedDocDetails.status === "PENDING_APPROVAL"
                      ? "Aún no despachada"
                      : "Sin despacho"}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs">
                Emisión registrada el {formatDate(selectedDocDetails.created_at)} por{" "}
                <strong>{selectedDocDetails.creator?.full_name || "Sistema"}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Almacén Origen:</span>{" "}
                  {selectedDocDetails.origin_location?.name || selectedDocDetails.branch?.name}
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Técnico que Instala:</span>{" "}
                  {selectedDocDetails.technician_name || "No especificado"}
                </div>
                {selectedDocDetails.work_type === "client_job" ? (
                  <>
                    <div>
                      <span className="text-muted-foreground font-semibold">Cliente:</span>{" "}
                      {selectedDocDetails.client_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold">Código Contrato:</span>{" "}
                      {selectedDocDetails.client_code}
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <span className="text-muted-foreground font-semibold">Proyecto u Obra:</span>{" "}
                    {selectedDocDetails.project_name}
                  </div>
                )}
                {selectedDocDetails.notes && (
                  <div className="col-span-2 pt-1 border-t border-muted">
                    <span className="text-muted-foreground font-semibold">Observaciones:</span>{" "}
                    {selectedDocDetails.notes}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Detalle de Materiales Despachados
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="text-xs">Material / Equipo</TableHead>
                        <TableHead className="text-xs text-right">Cantidad</TableHead>
                        <TableHead className="text-xs text-right">Unidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDocDetails.lines?.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-xs">{line.item?.sku}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {line.item?.name}
                            {line.serial_unit && (
                              <div className="text-[10px] text-muted-foreground">
                                S/N: {line.serial_unit.serial_number}{" "}
                                {line.serial_unit.mac_address ? `| MAC: ${line.serial_unit.mac_address}` : ""}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold">
                            {formatNumber(Number(line.quantity), 0)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">
                            {line.item?.unit}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Voucher Print Dialog */}
      <ConfirmDialog
        open={Boolean(pendingExit)}
        title="¿Registrar esta salida?"
        description="La orden queda pendiente de aprobación. La cantidad sale del almacén cuando el administrador general la autoriza."
        confirmLabel={buttons.registerExit}
        pending={isSubmitting}
        onCancel={() => setPendingExit(null)}
        onConfirm={() => {
          void handleConfirmExit();
        }}
      />

      <DocumentVoucherModal
        documentId={printVoucherId}
        docNumber={null}
        onClose={() => setPrintVoucherId(null)}
      />
    </div>
  );
};
