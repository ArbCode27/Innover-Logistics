"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  Cpu,
  Flashlight,
  FlashlightOff,
  History,
  Layers,
  Loader2,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Inbox,
  ArrowRight,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  registerPurchaseAction,
  checkSerialAndMacDuplicate,
  createOrGetActiveScanSession,
} from "@/actions/scan";
import type { ExtractedLabelData, ScanSession } from "@/types/scan";
import type { Item, Location, UserRole } from "@/types/inventory";

interface RegisteredBatchEntry {
  id: string;
  itemName: string;
  sku: string;
  serialNumber?: string;
  macAddress?: string;
  quantity: number;
  documentNumber: string;
  time: string;
}

interface PendingScanDraft {
  id: string;
  imageUrl?: string;
  serialNumber: string;
  macAddress?: string;
  matchedItemId?: string;
  itemName: string;
  sku: string;
  timestamp: number;
  isDuplicate?: boolean;
}

interface MassiveScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  locations: Location[];
  defaultLocationId: string;
  userRole: UserRole;
  preselectedItemId?: string | null;
  onSuccessRegistration?: () => void;
}

export const MassiveScanModal: React.FC<MassiveScanModalProps> = ({
  open,
  onOpenChange,
  items,
  locations,
  defaultLocationId,
  userRole,
  preselectedItemId,
  onSuccessRegistration,
}) => {
  // References
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const channelRef = React.useRef<any>(null);
  const lastCaptureTimeRef = React.useRef<number>(0);

  // General Form State
  const [selectedLocationId, setSelectedLocationId] =
    React.useState<string>(defaultLocationId);
  const [selectedItemId, setSelectedItemId] = React.useState<string>(
    preselectedItemId || items[0]?.id || ""
  );
  const [itemSearchTerm, setItemSearchTerm] = React.useState<string>("");
  const [isProductPickerOpen, setIsProductPickerOpen] = React.useState<boolean>(false);
  const productPickerRef = React.useRef<HTMLDivElement>(null);
  const [ticketRef, setTicketRef] = React.useState<string>("FAC-ING-LOTE");
  const [supplierNotes, setSupplierNotes] = React.useState<string>("");

  // Target inputs
  const [serialNumber, setSerialNumber] = React.useState<string>("");
  const [macAddress, setMacAddress] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);

  // Duplication checking
  const [isDuplicateSerial, setIsDuplicateSerial] = React.useState<boolean>(false);
  const [isDuplicateMac, setIsDuplicateMac] = React.useState<boolean>(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState<boolean>(false);

  // Mode: local camera vs phone qr connect
  const [activeSource, setActiveSource] = React.useState<"local_cam" | "phone_qr">("local_cam");

  // Local Camera State
  const [cameraActive, setCameraActive] = React.useState<boolean>(true);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [hasTorch, setHasTorch] = React.useState<boolean>(false);
  const [torchOn, setTorchOn] = React.useState<boolean>(false);
  const [isScanningOcr, setIsScanningOcr] = React.useState<boolean>(false);

  // Phone QR Sync State
  const [scanSession, setScanSession] = React.useState<ScanSession | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>("");
  const [scanUrl, setScanUrl] = React.useState<string>("");
  const [isPhoneConnected, setIsPhoneConnected] = React.useState<boolean>(false);
  const [isPhoneProcessing, setIsPhoneProcessing] = React.useState<boolean>(false);
  const [remoteCapturedImage, setRemoteCapturedImage] = React.useState<string | null>(null);

  // Processing & History
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [registeredBatch, setRegisteredBatch] = React.useState<RegisteredBatchEntry[]>([]);
  const [pendingDrafts, setPendingDrafts] = React.useState<PendingScanDraft[]>([]);

  // Find selected item configuration
  const currentItem = React.useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || items[0];
  }, [items, selectedItemId]);

  // Filtered items based on search input
  const filteredItemsForSelect = React.useMemo(() => {
    if (!itemSearchTerm.trim()) return items;
    const query = itemSearchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
    );
  }, [items, itemSearchTerm]);

  // Close product search picker on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      if (
        productPickerRef.current &&
        !productPickerRef.current.contains(e.target as Node)
      ) {
        setIsProductPickerOpen(false);
      }
    };
    if (isProductPickerOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProductPickerOpen]);

  // Derived nature & requirements
  const isSerialized = Boolean(currentItem?.is_serialized);
  const isLanlyOrActive =
    currentItem?.category === "Equipos Activos" ||
    currentItem?.name?.toLowerCase().includes("onu") ||
    currentItem?.name?.toLowerCase().includes("router");
  const requiresMac = isSerialized && isLanlyOrActive;
  const isTool = currentItem?.category === "Herramientas";
  const isConsumable = !isSerialized;

  // Sync preselected item if opened from specific row
  React.useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    }
  }, [preselectedItemId]);

  // Handle stream stop
  const stopCameraStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  // Handle start camera stream
  const startCamera = React.useCallback(async () => {
    if (!cameraActive || activeSource !== "local_cam") return;
    setCameraError(null);
    stopCameraStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("La cámara no está disponible en este dispositivo. Puedes usar el botón 'Conectar Teléfono' para escanear con tu móvil.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => {});
      }

      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track?.getCapabilities?.() as any) || {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError("No se detectó cámara local en este equipo. Usa la pestaña 'Conectar Teléfono' con código QR.");
      }
    }
  }, [cameraActive, activeSource, stopCameraStream]);

  // Lifecycle when modal opens/closes for local camera
  React.useEffect(() => {
    if (open && cameraActive && !isConsumable && activeSource === "local_cam") {
      startCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [open, cameraActive, isConsumable, activeSource, startCamera, stopCameraStream]);

  // Toggle flash
  const handleToggleTorch = async (): Promise<void> => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const next = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch {
      // ignore
    }
  };

  // Play subtle sound and haptic feedback
  const playSuccessFeedback = React.useCallback(() => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([60, 40, 60]);
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio context may not be allowed
    }
  }, []);

  // Duplicate Check on Input
  const handleVerifyDuplicates = React.useCallback(
    async (sVal: string, mVal: string): Promise<boolean> => {
      if (!selectedItemId || !sVal.trim()) {
        setIsDuplicateSerial(false);
        setIsDuplicateMac(false);
        return false;
      }

      setIsCheckingDuplicate(true);
      try {
        const res = await checkSerialAndMacDuplicate(selectedItemId, sVal, mVal);
        setIsDuplicateSerial(res.isSerialDuplicate);
        setIsDuplicateMac(res.isMacDuplicate);
        return res.isSerialDuplicate || res.isMacDuplicate;
      } catch {
        return false;
      } finally {
        setIsCheckingDuplicate(false);
      }
    },
    [selectedItemId]
  );

  // Initialize or fetch QR Scan Session when modal opens
  React.useEffect(() => {
    if (!open) return;

    let isMounted = true;
    createOrGetActiveScanSession()
      .then(async ({ session, baseUrl }) => {
        if (!isMounted) return;
        setScanSession(session);

        const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;
        const targetUrl = `${origin}/scan/${session.session_token}`;
        setScanUrl(targetUrl);

        try {
          const qrDataUrl = await QRCode.toDataURL(targetUrl, {
            width: 260,
            margin: 1.5,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          if (isMounted) setQrCodeUrl(qrDataUrl);
        } catch (err) {
          console.error("Error al generar QR:", err);
        }
      })
      .catch((err) => console.warn("Error creando sesión de escaneo QR:", err));

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Apply data received from Phone or OCR
  const handleApplyRemoteData = React.useCallback(
    async (data: ExtractedLabelData, imageUrl?: string) => {
      if (imageUrl) setRemoteCapturedImage(imageUrl);

      const detectedSn = data.serial_number?.trim() || "";
      const detectedMac = data.mac_address?.trim() || "";

      // Si no detectó serial ni MAC
      if (!detectedSn && !detectedMac) {
        toast.warning(
          "Foto recibida, pero no se reconoció el código de barras o serial. Enfoca más de cerca o ingresa los datos manualmente."
        );
        return;
      }

      // Rellenar formulario activo
      if (detectedSn) {
        setSerialNumber(detectedSn);
      }
      if (detectedMac) {
        setMacAddress(detectedMac);
      }

      let activeItem = currentItem;
      if (data.matched_item_id && items.some((i) => i.id === data.matched_item_id)) {
        setSelectedItemId(data.matched_item_id);
        const found = items.find((i) => i.id === data.matched_item_id);
        if (found) activeItem = found;
      }

      let isDup = false;
      if (detectedSn) {
        isDup = await handleVerifyDuplicates(detectedSn, detectedMac || macAddress);
      }

      // Crear nuevo borrador encolado en la lista de items detectados
      const newDraft: PendingScanDraft = {
        id: crypto.randomUUID(),
        imageUrl: imageUrl,
        serialNumber: detectedSn,
        macAddress: detectedMac || undefined,
        matchedItemId: activeItem.id,
        itemName: activeItem.name,
        sku: activeItem.sku,
        timestamp: Date.now(),
        isDuplicate: isDup,
      };

      setPendingDrafts((prev) => {
        // Evitar duplicar el mismo serial dentro de la lista de borradores pendientes
        if (detectedSn && prev.some((p) => p.serialNumber === detectedSn)) {
          return prev;
        }
        return [newDraft, ...prev];
      });

      playSuccessFeedback();
      toast.success(
        `Detectado: ${detectedSn || "Equipo"}${detectedMac ? ` (MAC: ${detectedMac})` : ""} - Agregado a la lista`
      );
    },
    [currentItem, items, macAddress, handleVerifyDuplicates, playSuccessFeedback]
  );

  const applyRemoteDataRef = React.useRef(handleApplyRemoteData);
  React.useEffect(() => {
    applyRemoteDataRef.current = handleApplyRemoteData;
  });

  // Supabase Realtime channel for Phone Sync
  React.useEffect(() => {
    if (!open || !scanSession) return;

    const supabase = createClient();
    const syncId = scanSession.id || scanSession.session_token;
    const channelName = `scan-sync:${syncId}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "device_connected" }, () => {
        setIsPhoneConnected(true);
        toast.success("Teléfono vinculado exitosamente a este modal");
      })
      .on("broadcast", { event: "capture_received" }, (payload: any) => {
        setIsPhoneConnected(true);
        setIsPhoneProcessing(true);
        const dataPayload = payload.payload || payload;
        if (dataPayload?.imageUrl) setRemoteCapturedImage(dataPayload.imageUrl);
      })
      .on("broadcast", { event: "scan_analyzed" }, (payload: any) => {
        setIsPhoneConnected(true);
        setIsPhoneProcessing(false);
        const dataPayload = payload.payload || payload;
        const data: ExtractedLabelData = dataPayload?.data;
        const img: string = dataPayload?.imageUrl;
        const ts: number = dataPayload?.timestamp || Date.now();

        lastCaptureTimeRef.current = ts;
        if (img) setRemoteCapturedImage(img);
        if (data) {
          applyRemoteDataRef.current(data, img);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "pc_ping",
            payload: { timestamp: Date.now() },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [open, scanSession]);

  // Polling fallback for phone sync
  React.useEffect(() => {
    if (!open || !scanSession?.session_token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan/session/${scanSession.session_token}`);
        if (!res.ok) return;
        const data = await res.json();

        if (
          !isPhoneConnected &&
          (data.session?.status === "connected" || data.session?.status === "scanning")
        ) {
          setIsPhoneConnected(true);
        }

        if (
          data.latestCapture &&
          data.latestCapture.timestamp > lastCaptureTimeRef.current
        ) {
          lastCaptureTimeRef.current = data.latestCapture.timestamp;
          if (data.latestCapture.imageUrl) {
            setRemoteCapturedImage(data.latestCapture.imageUrl);
          }
          if (data.latestCapture.data) {
            applyRemoteDataRef.current(data.latestCapture.data, data.latestCapture.imageUrl);
          }
          setIsPhoneProcessing(false);
        }
      } catch {
        // Silent fallback
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [open, isPhoneConnected, scanSession?.session_token]);

  // Copy link
  const handleCopyPhoneLink = (): void => {
    if (!scanUrl) return;
    navigator.clipboard.writeText(scanUrl);
    toast.success("Enlace de vinculación copiado al portapapeles");
  };

  // Trigger frame capture and optical scan on local camera
  const handleCaptureOpticalFrame = async (): Promise<void> => {
    if (!videoRef.current || isScanningOcr) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("La cámara aún se está inicializando");
      return;
    }

    setIsScanningOcr(true);
    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      const maxWidth = 1400;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context no disponible");

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const response = await fetch("/api/scan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "modal-camera-session",
          image: dataUrl,
          barcodes: [],
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo procesar la imagen");
      }

      const result = await response.json();
      if (result.success && result.data) {
        await handleApplyRemoteData(result.data, dataUrl);
      } else {
        toast.info("No se reconoció automáticamente el serial. Puedes ingresarlo manualmente.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al leer etiqueta");
    } finally {
      setIsScanningOcr(false);
    }
  };

  // Save product registration
  const handleSaveProduct = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();

    if (!selectedLocationId) {
      toast.error("Seleccione la ubicación de almacén");
      return;
    }

    if (!selectedItemId) {
      toast.error("Seleccione un producto");
      return;
    }

    if (isSerialized && !serialNumber.trim()) {
      toast.error("El número de serie (SN) es obligatorio");
      return;
    }

    if (requiresMac && !macAddress.trim()) {
      toast.warning("Para este equipo se recomienda registrar la dirección MAC");
    }

    if (isDuplicateSerial) {
      toast.error("El número de serie ingresado ya existe en stock");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerPurchaseAction({
        location_id: selectedLocationId,
        item_id: selectedItemId,
        quantity: isSerialized ? 1 : Math.max(1, quantity),
        serial_number: isSerialized ? serialNumber.trim().toUpperCase() : undefined,
        mac_address: requiresMac && macAddress ? macAddress.trim().toUpperCase() : undefined,
        ticket_ref: ticketRef.trim(),
        supplier_notes: supplierNotes.trim() || undefined,
        is_new_item: false,
      });

      if (!res.success) {
        toast.error(res.error || "Error al procesar el ingreso");
        return;
      }

      playSuccessFeedback();
      toast.success(
        `Registrado: ${currentItem.name} (+${isSerialized ? 1 : quantity} ${currentItem.unit})`
      );

      // Notify connected phone if active
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "scan_saved",
          payload: {
            serial: serialNumber,
            document_number: res.document_number,
          },
        });
      }

      // Append to session batch
      const newEntry: RegisteredBatchEntry = {
        id: crypto.randomUUID(),
        itemName: currentItem.name,
        sku: currentItem.sku,
        serialNumber: isSerialized ? serialNumber.trim().toUpperCase() : undefined,
        macAddress: requiresMac && macAddress ? macAddress.trim().toUpperCase() : undefined,
        quantity: isSerialized ? 1 : quantity,
        documentNumber: res.document_number || "COM-AUTO",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setRegisteredBatch((prev) => [newEntry, ...prev]);

      // Remover de borradores pendientes si el serial registrado estaba en la cola
      const currentSn = serialNumber.trim().toUpperCase();
      setPendingDrafts((prev) => prev.filter((d) => d.serialNumber.toUpperCase() !== currentSn));

      // Reset serial inputs while maintaining item and location for burst/batch scanning
      setSerialNumber("");
      setMacAddress("");
      setIsDuplicateSerial(false);
      setIsDuplicateMac(false);

      if (onSuccessRegistration) {
        onSuccessRegistration();
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar ingreso");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 gap-5">
        <DialogHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span>Ingreso Masivo con Cámara</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    Modo Ráfaga
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Usa la cámara web de tu PC o escanea con la cámara de tu teléfono móvil.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPhoneConnected && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  <span>Móvil Vinculado</span>
                </Badge>
              )}
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {registeredBatch.length} cargados en lote
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Camera Scanner HUD & QR Connect Switcher */}
          <div className="lg:col-span-6 space-y-4">
            {/* Source Switcher Tabs: PC WebCam vs Mobile Phone QR */}
            {isSerialized && (
              <div className="flex items-center p-1 bg-muted/60 rounded-xl border">
                <Button
                  type="button"
                  variant={activeSource === "local_cam" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSource("local_cam")}
                  className="flex-1 h-8 text-xs gap-1.5 font-medium rounded-lg"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Cámara PC / Laptop</span>
                </Button>
                <Button
                  type="button"
                  variant={activeSource === "phone_qr" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSource("phone_qr")}
                  className="flex-1 h-8 text-xs gap-1.5 font-medium rounded-lg relative"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Conectar Teléfono</span>
                  {isPhoneConnected && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  )}
                </Button>
              </div>
            )}

            {isSerialized ? (
              activeSource === "phone_qr" ? (
                /* Phone QR Code Panel */
                <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm flex flex-col items-center text-center">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <span>Escanear con Teléfono Móvil</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Abre la cámara de tu teléfono y escanea este código. Los datos aparecerán aquí automáticamente.
                    </p>
                  </div>

                  {/* QR Image Box */}
                  <div className="p-3 bg-white rounded-xl shadow-md border flex items-center justify-center">
                    {qrCodeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeUrl}
                        alt="Código QR de vinculación para cámara de teléfono"
                        className="w-48 h-48 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Quick Copy Link */}
                  <div className="w-full flex gap-1.5 items-center pt-1">
                    <Input
                      readOnly
                      value={scanUrl}
                      className="text-[11px] font-mono h-8 bg-muted/50"
                      title="Enlace para el móvil"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPhoneLink}
                      className="h-8 px-2.5"
                      title="Copiar enlace"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Remote Capture Preview (if received from phone) */}
                  {remoteCapturedImage && (
                    <div className="w-full pt-2 border-t flex items-center gap-2 text-left">
                      <div className="h-10 w-10 rounded border bg-black overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={remoteCapturedImage}
                          alt="Última foto del teléfono"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="text-[11px]">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Foto sincronizada
                        </p>
                        <p className="text-muted-foreground">Captura recibida desde el teléfono</p>
                      </div>
                    </div>
                  )}

                  {isPhoneProcessing && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Procesando lectura óptica del teléfono...</span>
                    </div>
                  )}
                </div>
              ) : (
                /* PC Camera HUD */
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-md flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center p-4 text-zinc-300 space-y-3">
                      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                      <p className="text-xs leading-relaxed">{cameraError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={startCamera}
                          className="text-xs h-8 text-black bg-white hover:bg-zinc-200"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reintentar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setActiveSource("phone_qr")}
                          className="text-xs h-8 gap-1"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Usar Teléfono
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Laser Target Area */}
                      <div className="relative z-10 w-[85%] aspect-[16/9] rounded-xl border-2 border-dashed border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex flex-col justify-between p-3 pointer-events-none">
                        <div className="flex justify-between items-center text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                          <span>{requiresMac ? "SERIAL + MAC" : "SERIAL NUMBER"}</span>
                        </div>
                        <div className="flex justify-center">
                          <Scan className="h-8 w-8 text-emerald-400/60 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-center text-white/90 bg-black/60 rounded px-2 py-0.5 backdrop-blur-sm">
                          Enfoca la etiqueta con nitidez
                        </div>
                      </div>

                      {/* Camera Top Controls */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                        {hasTorch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleToggleTorch}
                            className={`h-8 w-8 p-0 rounded-full border border-white/20 backdrop-blur-md ${
                              torchOn ? "bg-amber-400 text-black" : "bg-black/60 text-white"
                            }`}
                            aria-label="Encender linterna"
                          >
                            {torchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={startCamera}
                          className="h-8 w-8 p-0 rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md"
                          aria-label="Reiniciar cámara"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Camera Bottom OCR Trigger */}
                      <div className="absolute bottom-3 inset-x-3 z-20 flex justify-center">
                        <Button
                          type="button"
                          onClick={handleCaptureOpticalFrame}
                          disabled={isScanningOcr || !!cameraError}
                          className="h-10 px-4 rounded-full shadow-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs flex items-center gap-2 active:scale-95 transition-all"
                        >
                          {isScanningOcr ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Leyendo datos...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4" />
                              <span>Capturar y Extraer</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              /* Consumable or Camera Disabled Placeholder */
              <div className="rounded-2xl border-2 border-dashed p-6 text-center bg-muted/20 flex flex-col items-center justify-center min-h-[220px] space-y-3">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  {isTool ? (
                    <Wrench className="h-8 w-8" />
                  ) : isConsumable ? (
                    <Layers className="h-8 w-8" />
                  ) : (
                    <Package className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isConsumable
                      ? "Control por Volumen o Metraje"
                      : "Entrada Manual o por Pistola USB"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {isConsumable
                      ? `Este ítem se mide en "${currentItem.unit}". No requiere seriales individuales.`
                      : "Puedes conectar un lector de código de barras USB/Bluetooth o activar la cámara."}
                  </p>
                </div>
                {isSerialized && !cameraActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCameraActive(true)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" /> Activar Cámara
                  </Button>
                )}
              </div>
            )}

            {/* Product Quick Info Card */}
            <div className="p-3 bg-muted/40 rounded-xl border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Naturaleza del producto:</span>
                <Badge
                  variant={isSerialized ? "secondary" : "outline"}
                  className="font-medium text-[11px] gap-1"
                >
                  {isLanlyOrActive ? (
                    <>
                      <Cpu className="h-3 w-3 text-primary" /> Serial + MAC
                    </>
                  ) : isTool ? (
                    <>
                      <Wrench className="h-3 w-3 text-primary" /> Herramienta / Serial
                    </>
                  ) : (
                    <>
                      <Layers className="h-3 w-3 text-primary" /> Consumible ({currentItem.unit})
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>SKU: <strong className="text-foreground font-mono">{currentItem.sku}</strong></span>
                <span>Unidad: <strong className="text-foreground uppercase">{currentItem.unit}</strong></span>
              </div>
            </div>

            {/* Pending Scanned Drafts Queue */}
            {pendingDrafts.length > 0 && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Inbox className="h-4 w-4" />
                    <span>Equipos pendientes de registrar ({pendingDrafts.length})</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">Click en uno para cargarlo</span>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y bg-background text-xs">
                  {pendingDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      onClick={() => {
                        setSerialNumber(draft.serialNumber);
                        if (draft.macAddress) setMacAddress(draft.macAddress);
                        if (draft.matchedItemId) setSelectedItemId(draft.matchedItemId);
                        handleVerifyDuplicates(draft.serialNumber, draft.macAddress || macAddress);
                        toast.info(`Cargado: ${draft.serialNumber}`);
                      }}
                      className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-muted/60 transition-colors cursor-pointer group"
                      title="Hacer clic para cargar en el formulario"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {draft.imageUrl ? (
                          <div className="h-10 w-10 rounded border bg-black overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={draft.imageUrl}
                              alt="Foto equipo"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                            <Cpu className="h-4 w-4" />
                          </div>
                        )}
                        <div className="truncate text-left">
                          <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span>{draft.itemName}</span>
                            {draft.isDuplicate && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                Duplicado
                              </Badge>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-primary font-medium">
                            SN: {draft.serialNumber}
                          </div>
                          {draft.macAddress && (
                            <div className="font-mono text-[10px] text-muted-foreground">
                              MAC: {draft.macAddress}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDrafts((prev) => prev.filter((p) => p.id !== draft.id));
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Descartar de la lista"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSerialNumber(draft.serialNumber);
                            if (draft.macAddress) setMacAddress(draft.macAddress);
                            if (draft.matchedItemId) setSelectedItemId(draft.matchedItemId);
                            handleVerifyDuplicates(draft.serialNumber, draft.macAddress || macAddress);
                          }}
                          className="h-7 px-2 text-[10px] gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          <span>Cargar</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Session History Table */}
            {registeredBatch.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" />
                    Registros en esta sesión ({registeredBatch.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Más recientes primero</span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-lg border divide-y bg-card text-xs">
                  {registeredBatch.map((entry) => (
                    <div key={entry.id} className="p-2 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{entry.itemName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {entry.serialNumber ? `SN: ${entry.serialNumber}` : `Cant: +${entry.quantity}`}
                          {entry.macAddress ? ` | MAC: ${entry.macAddress}` : ""}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          {entry.documentNumber}
                        </Badge>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{entry.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Form Fields */}
          <div className="lg:col-span-6 space-y-4">
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product and Location Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Searchable Product Type Selector */}
                <div className="space-y-1 relative" ref={productPickerRef}>
                  <Label className="text-xs font-semibold">
                    Tipo de Producto
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen((prev) => !prev)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[40px] text-left"
                    aria-expanded={isProductPickerOpen}
                    aria-label="Seleccionar y buscar tipo de producto"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-foreground">
                        {currentItem?.name || "Seleccionar..."}
                      </span>{" "}
                      <span className="text-muted-foreground font-mono text-[11px]">
                        ({currentItem?.sku})
                      </span>
                    </div>
                    <Search className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                  </button>

                  {/* Dropdown with live search filter */}
                  {isProductPickerOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 w-full sm:w-[320px] rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={itemSearchTerm}
                          onChange={(e) => setItemSearchTerm(e.target.value)}
                          placeholder="Buscar por nombre, modelo, SKU..."
                          className="h-8 pl-8 text-xs bg-muted/40"
                          autoFocus
                        />
                        {itemSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setItemSearchTerm("")}
                            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 text-xs">
                        {filteredItemsForSelect.length === 0 ? (
                          <div className="p-3 text-center text-muted-foreground text-xs">
                            No se encontraron productos coincidentes.
                          </div>
                        ) : (
                          filteredItemsForSelect.map((i) => {
                            const isSelected = i.id === selectedItemId;
                            return (
                              <button
                                key={i.id}
                                type="button"
                                onClick={() => {
                                  setSelectedItemId(i.id);
                                  setIsProductPickerOpen(false);
                                  setItemSearchTerm("");
                                  setSerialNumber("");
                                  setMacAddress("");
                                  setIsDuplicateSerial(false);
                                  setIsDuplicateMac(false);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-md transition-colors text-left text-xs ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="truncate">{i.name}</div>
                                  <div
                                    className={`text-[10px] font-mono ${
                                      isSelected
                                        ? "text-primary-foreground/80"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    SKU: {i.sku} • {i.category}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="modal-loc-select" className="text-xs font-semibold">
                    Ubicación Almacén
                  </Label>
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                  >
                    <SelectTrigger id="modal-loc-select" className="h-10 text-xs">
                      <SelectValue placeholder="Almacén de destino..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} className="text-xs">
                          {loc.name} ({loc.type === "crew" ? "Cuadrilla" : "Almacén"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Inputs: Serial & MAC vs Quantity */}
              {isSerialized ? (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                  {/* Serial Number Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="serial-field" className="text-xs font-semibold flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                        <span>Número de Serie (SN) *</span>
                      </Label>
                      {isCheckingDuplicate ? (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Verificando...
                        </span>
                      ) : isDuplicateSerial ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Serial Duplicado
                        </Badge>
                      ) : null}
                    </div>
                    <Input
                      id="serial-field"
                      value={serialNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSerialNumber(val);
                        handleVerifyDuplicates(val, macAddress);
                      }}
                      placeholder="Ej. LANLY-ONU-89211 o 48575443..."
                      className={`h-10 font-mono text-xs uppercase min-h-[44px] ${
                        isDuplicateSerial ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      autoFocus
                    />
                  </div>

                  {/* MAC Address Field (for Lanly ONUs & Routers) */}
                  {requiresMac && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mac-field" className="text-xs font-semibold flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5 text-primary" />
                          <span>Dirección MAC (ONU / Router)</span>
                        </Label>
                        {isDuplicateMac && (
                          <Badge variant="destructive" className="text-[10px]">
                            MAC Duplicada
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="mac-field"
                        value={macAddress}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setMacAddress(val);
                          handleVerifyDuplicates(serialNumber, val);
                        }}
                        placeholder="Ej. A4:B2:39:10:44:EE"
                        className={`h-10 font-mono text-xs uppercase min-h-[44px] ${
                          isDuplicateMac ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Consumable Quantity Selector */
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <Label htmlFor="qty-field" className="text-xs font-semibold">
                    Cantidad a Ingresar ({currentItem.unit}) *
                  </Label>
                  <Input
                    id="qty-field"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuantity(Number.isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    placeholder="Ingrese la cantidad..."
                    className="h-10 text-left font-mono font-semibold text-sm min-h-[44px]"
                  />
                </div>
              )}

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ticket-field" className="text-xs">
                    Comprobante / N° Factura
                  </Label>
                  <Input
                    id="ticket-field"
                    value={ticketRef}
                    onChange={(e) => setTicketRef(e.target.value)}
                    placeholder="FAC-2026-901"
                    className="h-9 text-xs min-h-[40px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes-field" className="text-xs">
                    Notas de Recepción
                  </Label>
                  <Input
                    id="notes-field"
                    value={supplierNotes}
                    onChange={(e) => setSupplierNotes(e.target.value)}
                    placeholder="Caja sellada / Verificado"
                    className="h-9 text-xs min-h-[40px]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="min-h-[44px] text-xs"
                >
                  Finalizar Sesión
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (isSerialized && !serialNumber.trim()) ||
                    isDuplicateSerial
                  }
                  className="min-h-[44px] px-6 font-semibold text-xs gap-2 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>
                        {isSerialized
                          ? "Registrar e Ir al Siguiente (+1)"
                          : `Registrar Entrada (+${quantity} ${currentItem.unit})`}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
