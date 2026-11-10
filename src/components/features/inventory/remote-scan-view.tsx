"use client";

import * as React from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Boxes,
  Cpu,
  Layers,
  Wifi,
  WifiOff,
  Check,
  Plus,
  ShieldAlert,
  ArrowRight,
  Package,
  FileCheck2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  registerPurchaseAction,
  checkSerialAndMacDuplicate,
} from "@/actions/scan";
import type {
  ExtractedLabelData,
  RegisterPurchaseInput,
  ScanSession,
} from "@/types/scan";
import type { Item, Location, UserRole } from "@/types/inventory";

interface RemoteScanViewProps {
  initialSession: ScanSession;
  baseUrl: string;
  items: Item[];
  locations: Location[];
  userRole: UserRole;
  defaultLocationId: string;
  userName: string;
}

export const RemoteScanView: React.FC<RemoteScanViewProps> = ({
  initialSession,
  baseUrl,
  items: initialItems,
  locations,
  userRole,
  defaultLocationId,
  userName,
}) => {
  // Estado de catálogo y ubicaciones
  const [items, setItems] = React.useState<Item[]>(initialItems);
  const [selectedLocationId, setSelectedLocationId] =
    React.useState<string>(defaultLocationId);

  // Estado de sesión y vinculación
  const [session, setSession] = React.useState<ScanSession>(initialSession);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>("");
  const [isConnected, setIsConnected] = React.useState<boolean>(false);
  const [isProcessingCapture, setIsProcessingCapture] =
    React.useState<boolean>(false);

  // Datos capturados
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [extractedData, setExtractedData] =
    React.useState<ExtractedLabelData | null>(null);

  // Formulario de registro de compra
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [isNewItemMode, setIsNewItemMode] = React.useState<boolean>(false);
  const [newItemName, setNewItemName] = React.useState<string>("");
  const [newItemSku, setNewItemSku] = React.useState<string>("");
  const [newItemCategory, setNewItemCategory] =
    React.useState<string>("Equipos Activos");
  const [isSkuConfirmed, setIsSkuConfirmed] = React.useState<boolean>(false);

  // Serial y MAC simultáneos
  const [serialNumber, setSerialNumber] = React.useState<string>("");
  const [macAddress, setMacAddress] = React.useState<string>("");
  const [isDuplicateSerial, setIsDuplicateSerial] =
    React.useState<boolean>(false);
  const [isDuplicateMac, setIsDuplicateMac] = React.useState<boolean>(false);

  // Metadatos de documento contable
  const [ticketRef, setTicketRef] = React.useState<string>("");
  const [supplierNotes, setSupplierNotes] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [continuousMode, setContinuousMode] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const channelRef = React.useRef<any>(null);

  const scanUrl = React.useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : baseUrl;
    return `${origin}/scan/${session.session_token}`;
  }, [baseUrl, session.session_token]);

  // Generar código QR
  React.useEffect(() => {
    QRCode.toDataURL(scanUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.error("Error generando QR:", err));
  }, [scanUrl]);

  // Reproducir sonido sutil de escaneo
  const playScanBeep = React.useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(
        1320,
        audioCtx.currentTime + 0.12
      );
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch {
      // AudioContext no disponible
    }
  }, []);

  // Suscripción al canal de Supabase Realtime
  React.useEffect(() => {
    const supabase = createClient();
    const channelName = `scan-session:${session.session_token}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "device_connected" }, () => {
        setIsConnected(true);
        toast.success("Teléfono vinculado exitosamente a la sesión");
      })
      .on("broadcast", { event: "capture_received" }, () => {
        setIsProcessingCapture(true);
      })
      .on("broadcast", { event: "scan_analyzed" }, (payload) => {
        setIsProcessingCapture(false);
        const data: ExtractedLabelData = payload.payload?.data;
        const img: string = payload.payload?.imageUrl;

        if (img) setCapturedImage(img);
        if (data) {
          handleApplyExtractedData(data, img);
          playScanBeep();
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Canal listo
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.session_token, playScanBeep]);

  // Aplicar datos extraídos por la lectura óptica
  const handleApplyExtractedData = (
    data: ExtractedLabelData,
    imageUrl?: string
  ) => {
    setExtractedData(data);

    // 1. Serial y MAC simultáneos
    if (data.serial_number) {
      setSerialNumber(data.serial_number);
    }
    if (data.mac_address) {
      setMacAddress(data.mac_address);
    }

    // 2. Coincidencia con catálogo o producto nuevo
    if (data.matched_item_id) {
      setSelectedItemId(data.matched_item_id);
      setIsNewItemMode(false);
      setIsSkuConfirmed(true);
      toast.info(`Producto identificado en catálogo: ${data.suggested_name}`);
    } else {
      // No existe en catálogo
      const isAdmin = userRole === "superadmin" || userRole === "admin_sucursal";

      if (isAdmin) {
        setIsNewItemMode(true);
        setSelectedItemId("");
        setNewItemName(data.suggested_name || "Equipo Desconocido");
        setNewItemSku(data.suggested_sku || "ONT-GEN-001");
        setNewItemCategory(data.category || "Equipos Activos");
        setIsSkuConfirmed(false); // Requiere confirmación obligatoria
        toast.warning(
          "Producto no encontrado en catálogo. Modo de alta con SKU sugerido activado."
        );
      } else {
        setIsNewItemMode(false);
        toast.error(
          "El modelo no existe en catálogo. Como técnico, debes vincularlo a un producto existente o solicitar el alta a un administrador."
        );
      }
    }

    // Verificar duplicados si se asoció un ítem
    const targetItem = data.matched_item_id || selectedItemId;
    if (targetItem && data.serial_number) {
      checkSerialAndMacDuplicate(
        targetItem,
        data.serial_number,
        data.mac_address
      ).then((res) => {
        setIsDuplicateSerial(res.isSerialDuplicate);
        setIsDuplicateMac(res.isMacDuplicate);
        if (res.isSerialDuplicate) {
          toast.error("¡Atención! Este número de serie ya está registrado.");
        }
      });
    }
  };

  // Copiar enlace al portapapeles
  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanUrl);
    toast.success("Enlace de vinculación copiado al portapapeles");
  };

  // Ítem actualmente seleccionado
  const currentSelectedItem = React.useMemo(() => {
    return items.find((i) => i.id === selectedItemId);
  }, [items, selectedItemId]);

  // Validar y enviar registro de compra / entrada
  const handleSavePurchase = async () => {
    if (!selectedLocationId) {
      toast.error("Seleccione la ubicación de ingreso");
      return;
    }

    if (isNewItemMode) {
      if (!isSkuConfirmed) {
        toast.error("Debe confirmar o verificar el código SKU propuesto antes de guardar");
        return;
      }
      if (!newItemName.trim() || !newItemSku.trim()) {
        toast.error("Complete el nombre y el código SKU del producto");
        return;
      }
    } else {
      if (!selectedItemId) {
        toast.error("Seleccione un producto del catálogo");
        return;
      }
    }

    if (!serialNumber.trim()) {
      toast.error("El número de serial es obligatorio");
      return;
    }

    if (isDuplicateSerial) {
      toast.error("No se puede guardar un serial duplicado");
      return;
    }

    setIsSubmitting(true);

    const input: RegisterPurchaseInput = {
      location_id: selectedLocationId,
      quantity: 1, // Registro unitario por serie
      serial_number: serialNumber.trim(),
      mac_address: macAddress.trim() || undefined,
      ticket_ref: ticketRef.trim() || undefined,
      supplier_notes: supplierNotes.trim() || undefined,
      image_url: capturedImage || undefined,
      is_new_item: isNewItemMode,
      new_item: isNewItemMode
        ? {
            sku: newItemSku.trim(),
            name: newItemName.trim(),
            category: newItemCategory,
            unit: "unidades",
            is_serialized: true,
            image_url: capturedImage || undefined,
          }
        : undefined,
    };

    if (!isNewItemMode) {
      input.item_id = selectedItemId;
    }

    try {
      const result = await registerPurchaseAction(input);

      if (!result.success) {
        toast.error(result.error || "Error al procesar el ingreso");
        return;
      }

      toast.success(result.message || "Ingreso registrado correctamente");

      // Notificar al teléfono para que muestre checkmark y quede listo para el siguiente
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "scan_saved",
          payload: {
            serial: serialNumber,
            document_number: result.document_number,
          },
        });
      }

      // Si se dio de alta un ítem nuevo, agregarlo a la lista local
      if (isNewItemMode && result.item_id) {
        const newlyCreatedItem: Item = {
          id: result.item_id,
          sku: newItemSku,
          name: newItemName,
          category: newItemCategory,
          unit: "unidades",
          is_serialized: true,
          min_stock: 5,
          image_url: capturedImage || null,
          description: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems((prev) => [newlyCreatedItem, ...prev]);
        setSelectedItemId(result.item_id);
        setIsNewItemMode(false);
      }

      // Preparar para el siguiente equipo
      if (continuousMode) {
        setSerialNumber("");
        setMacAddress("");
        setIsDuplicateSerial(false);
        setIsDuplicateMac(false);
        setExtractedData(null);
        // Mantiene la ubicación y notas para agilizar la jornada
      } else {
        setCapturedImage(null);
        setSerialNumber("");
        setMacAddress("");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el comprobante");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span>Recepción y Registro Remoto con Teléfono</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Vinculación móvil en tiempo real para captura simultánea de Serial, MAC y catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-3 py-1">
              <Wifi className="h-3.5 w-3.5 animate-pulse" />
              <span>Teléfono Vinculado</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Esperando teléfono</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Grid principal: Izquierda (Vinculación y Captura) / Derecha (Formulario) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel izquierdo: QR de emparejamiento y Vista previa de captura */}
        <div className="lg:col-span-5 space-y-6">
          {!isConnected ? (
            /* Tarjeta de Código QR */
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <span>Vincular Cámara del Teléfono</span>
                </CardTitle>
                <CardDescription>
                  Escanee con la cámara de su teléfono móvil (sin necesidad de iniciar sesión).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="p-3 bg-white rounded-xl shadow-md border">
                  {qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeUrl}
                      alt="Código QR de Vinculación"
                      className="w-56 h-56 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    O acceda directamente en el móvil mediante este enlace:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={scanUrl}
                      className="text-xs font-mono h-9 bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="h-9 px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/40 p-3 text-xs text-muted-foreground rounded-b-xl flex justify-between items-center">
                <span>Operador: {userName}</span>
                <span className="font-mono text-[11px]">Válido por 4 horas</span>
              </CardFooter>
            </Card>
          ) : (
            /* Tarjeta de Visor del Teléfono Activo */
            <Card className="border-emerald-500/30 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-500" />
                    <span>Captura en Vivo</span>
                  </CardTitle>
                  <CardDescription>
                    {isProcessingCapture
                      ? "Procesando lectura óptica de la etiqueta..."
                      : "Esperando captura desde el teléfono"}
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs">
                  Listo
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-950 border flex items-center justify-center">
                  {capturedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={capturedImage}
                      alt="Última captura"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-zinc-500 space-y-2">
                      <Camera className="h-10 w-10 mx-auto opacity-40 animate-pulse" />
                      <p className="text-xs">
                        Presiona &quot;Capturar Etiqueta&quot; en el teléfono para iniciar
                      </p>
                    </div>
                  )}

                  {isProcessingCapture && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-medium">Extrayendo datos de etiqueta...</span>
                    </div>
                  )}
                </div>

                {/* Foto única de catálogo (Regla: 1 foto por tipo de producto) */}
                <div className="p-3 bg-muted/50 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Foto de Catálogo (1 por tipo):</span>
                    {currentSelectedItem?.image_url ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        Foto registrada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                        Se asignará esta captura
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-12 w-12 rounded border overflow-hidden bg-background flex items-center justify-center flex-shrink-0">
                      {currentSelectedItem?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSelectedItem.image_url}
                          alt={currentSelectedItem.name}
                          className="h-full w-full object-cover"
                        />
                      ) : capturedImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={capturedImage}
                          alt="Propuesta"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-foreground">
                        {currentSelectedItem?.name || newItemName || "Sin producto seleccionado"}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        SKU: {currentSelectedItem?.sku || newItemSku || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tarjeta de guía operativa */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Reglas de Recepción Activa:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>El registro se contabiliza contablemente como <strong>Compra (COM)</strong>.</li>
                <li>Serial y MAC se vinculan de forma atómica en el inventario.</li>
                <li>Cada tipo de equipo mantiene una sola imagen oficial en catálogo.</li>
                <li>Altas de nuevos productos restringidas a Superadmin y Admin Sucursal.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho: Formulario de Registro de Ingreso */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-primary" />
                    <span>Entrada de Mercancía (Compra / Recepción)</span>
                  </CardTitle>
                  <CardDescription>
                    Los campos se completan automáticamente tras la captura de la etiqueta.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Doc: COM-AUTO
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Ubicación de Destino (Por defecto del perfil) */}
              <div className="space-y-2">
                <Label htmlFor="location-select" className="text-xs font-semibold">
                  Ubicación de Destino (Almacén o Cuadrilla)
                </Label>
                <Select
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger id="location-select" className="h-10">
                    <SelectValue placeholder="Seleccione almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code}) — {loc.type === "crew" ? "Cuadrilla" : "Almacén"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Selección de Producto o Alta de Nuevo Ítem */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Producto en Catálogo
                  </Label>

                  {/* Toggle para Administradores: Alta de Nuevo Producto */}
                  {(userRole === "superadmin" || userRole === "admin_sucursal") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNewItemMode(!isNewItemMode);
                        setIsSkuConfirmed(false);
                      }}
                      className="h-7 text-xs text-primary"
                    >
                      {isNewItemMode ? (
                        <span>Seleccionar existente</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Dar de alta producto nuevo</span>
                        </span>
                      )}
                    </Button>
                  )}
                </div>

                {isNewItemMode ? (
                  /* Modo Alta de Nuevo Ítem (Solo Superadmin y Admin Sucursal) */
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span>Nuevo Producto detectado - Alta en Catálogo</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Nombre del Equipo</Label>
                        <Input
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Ej: Router Wi-Fi 6 ZTE F670L"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Categoría</Label>
                        <Select
                          value={newItemCategory}
                          onValueChange={setNewItemCategory}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equipos Activos">Equipos Activos</SelectItem>
                            <SelectItem value="Fibra Óptica">Fibra Óptica</SelectItem>
                            <SelectItem value="Ferretería y Pasivos">Ferretería y Pasivos</SelectItem>
                            <SelectItem value="Herramientas">Herramientas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* SKU Propuesto con Confirmación Obligatoria */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px]">
                          Código SKU (Propuesto automáticamente)
                        </Label>
                        {isSkuConfirmed ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            SKU Confirmado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                            Confirmación Requerida
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={newItemSku}
                          onChange={(e) => {
                            setNewItemSku(e.target.value.toUpperCase());
                            setIsSkuConfirmed(false);
                          }}
                          placeholder="Ej: ONT-ZTE-F670L"
                          className="h-9 text-xs font-mono uppercase"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={isSkuConfirmed ? "secondary" : "default"}
                          onClick={() => {
                            if (!newItemSku.trim()) {
                              toast.error("El SKU no puede estar vacío");
                              return;
                            }
                            setIsSkuConfirmed(true);
                            toast.success("SKU confirmado correctamente");
                          }}
                          className="h-9 text-xs px-3"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          <span>Confirmar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modo Selección de Producto Existente */
                  <div className="space-y-2">
                    <Select
                      value={selectedItemId}
                      onValueChange={(val) => {
                        setSelectedItemId(val);
                        // Comprobar duplicado para el ítem seleccionado
                        if (serialNumber) {
                          checkSerialAndMacDuplicate(val, serialNumber, macAddress).then(
                            (res) => {
                              setIsDuplicateSerial(res.isSerialDuplicate);
                              setIsDuplicateMac(res.isMacDuplicate);
                            }
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccione o escanee equipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Captura simultánea de Serial + MAC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="serial-input" className="text-xs font-semibold flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      <span>Número de Serie (SN)</span>
                    </Label>
                    {isDuplicateSerial && (
                      <Badge variant="destructive" className="text-[10px]">
                        Duplicado
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="serial-input"
                    value={serialNumber}
                    onChange={(e) => {
                      setSerialNumber(e.target.value);
                      setIsDuplicateSerial(false);
                    }}
                    placeholder="Ej: 48575443A1B2C3D4"
                    className={`h-10 font-mono text-xs uppercase ${
                      isDuplicateSerial ? "border-red-500 focus-visible:ring-red-500" : ""
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mac-input" className="text-xs font-semibold flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-primary" />
                      <span>Dirección MAC (Opcional)</span>
                    </Label>
                    {isDuplicateMac && (
                      <Badge variant="destructive" className="text-[10px]">
                        MAC Duplicada
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="mac-input"
                    value={macAddress}
                    onChange={(e) => {
                      setMacAddress(e.target.value);
                      setIsDuplicateMac(false);
                    }}
                    placeholder="Ej: 00:1A:2B:3C:4D:01"
                    className="h-10 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Datos de Comprobante / Proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-ref" className="text-xs">
                    Referencia / Factura / Proveedor
                  </Label>
                  <Input
                    id="ticket-ref"
                    value={ticketRef}
                    onChange={(e) => setTicketRef(e.target.value)}
                    placeholder="Ej: FAC-2026-9901 / ZTE Corp"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplier-notes" className="text-xs">
                    Observaciones de Recepción
                  </Label>
                  <Input
                    id="supplier-notes"
                    value={supplierNotes}
                    onChange={(e) => setSupplierNotes(e.target.value)}
                    placeholder="Caja sellada, precinto verificado"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t bg-muted/10">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={continuousMode}
                  onChange={(e) => setContinuousMode(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Modo continuo (mantener sesión lista para siguiente equipo)</span>
              </label>

              <Button
                size="lg"
                disabled={
                  isSubmitting ||
                  !serialNumber ||
                  isDuplicateSerial ||
                  (isNewItemMode && !isSkuConfirmed)
                }
                onClick={handleSavePurchase}
                className="w-full sm:w-auto px-6 h-11 text-sm font-semibold flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Guardando en Ledger...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Guardar Ingreso de Compra (+1)</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
