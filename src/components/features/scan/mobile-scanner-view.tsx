"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Scan,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { ScanSession } from "@/types/scan";

interface MobileScannerViewProps {
  token: string;
  initialSession: ScanSession;
  locationName?: string;
  userName?: string;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  token,
  initialSession: _initialSession,
  locationName,
  userName,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const channelRef = React.useRef<any>(null);

  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isConnectedToPc, setIsConnectedToPc] = React.useState<boolean>(false);
  const [isCapturing, setIsCapturing] = React.useState<boolean>(false);
  const [hasTorch, setHasTorch] = React.useState<boolean>(false);
  const [torchOn, setTorchOn] = React.useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string>(
    "Apunta a la etiqueta con el Serial y MAC"
  );
  const [lastSavedSerial, setLastSavedSerial] = React.useState<string | null>(
    null
  );

  // 1. Detener pistas de la cámara activas
  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignorar error al detener pista
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  // 2. Iniciar cámara trasera con resolución progresiva y captura de errores
  const handleStartCamera = React.useCallback(async () => {
    setCameraError(null);
    stopStream();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Tu navegador no soporta acceso a la cámara o la página no está servida sobre HTTPS."
      );
      return;
    }

    let mediaStream: MediaStream | null = null;

    // Intento 1: Cámara trasera en alta definición
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch {
      // Intento 2: Cámara trasera con resolución estándar
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        // Intento 3: Cualquier cámara disponible
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err: any) {
          console.error("[Cámara] Error al solicitar cámara:", err);
          setCameraError(
            "No se pudo acceder a la cámara. Asegúrate de otorgar permisos de cámara en tu navegador móvil (se requiere conexión HTTPS en dispositivos remotos)."
          );
          return;
        }
      }
    }

    if (mediaStream) {
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track?.getCapabilities?.() as any) || {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    }
  }, [stopStream]);

  // 3. Montar cámara una única vez al iniciar el componente
  React.useEffect(() => {
    handleStartCamera();
    return () => {
      stopStream();
    };
  }, [handleStartCamera, stopStream]);

  // 4. Vincular el flujo de video al elemento <video> del DOM de forma robusta
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn("[Video] Auto-play retrasado esperando interacción:", err);
      }
    };

    video.onloadedmetadata = () => {
      playVideo();
    };

    playVideo();
  }, [stream]);

  // 5. Wake Lock API en ciclo de vida independiente para mantener la pantalla activa
  React.useEffect(() => {
    let wakeLockInstance: any = null;

    const acquireWakeLock = async () => {
      if (typeof window !== "undefined" && "wakeLock" in navigator) {
        try {
          wakeLockInstance = await (navigator as any).wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLockInstance.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.warn("[WakeLock] No se pudo activar Wake Lock:", err);
        }
      }
    };

    acquireWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockInstance) {
        try {
          wakeLockInstance.release();
        } catch {}
      }
    };
  }, []);

  // 6. Conexión estable a Supabase Realtime (aislada, dependiente únicamente de token)
  React.useEffect(() => {
    if (!token) return;

    const supabase = createClient();
    const channelName = `scan-session:${token}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "scan_saved" }, (payload) => {
        const serial = payload.payload?.serial || "Equipo guardado";
        setLastSavedSerial(serial);
        setStatusMessage(`¡Guardado exitoso: ${serial}! Listo para el siguiente.`);

        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([80, 50, 80]);
        }

        setTimeout(() => {
          setStatusMessage("Apunta al siguiente equipo");
        }, 3000);
      })
      .on("broadcast", { event: "pc_ping" }, () => {
        setIsConnectedToPc(true);
        channel.send({
          type: "broadcast",
          event: "device_connected",
          payload: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          },
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnectedToPc(true);

          // Anunciar conexión a la PC
          channel.send({
            type: "broadcast",
            event: "device_connected",
            payload: {
              timestamp: Date.now(),
              userAgent: navigator.userAgent,
            },
          });

          // Actualizar estado en base de datos
          fetch(`/api/scan/session/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "connected",
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
              },
            }),
          }).catch(() => {});
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnectedToPc(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [token]);

  // Alternar linterna / flash
  const handleToggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("[Torch] Error al activar flash:", err);
    }
  };

  // Capturar fotograma en alta definición
  const handleCaptureFrame = async () => {
    if (!videoRef.current || isCapturing) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setStatusMessage("La cámara se está inicializando, intente de nuevo en un segundo.");
      return;
    }

    setIsCapturing(true);
    setStatusMessage("Capturando y enviando a la PC...");

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }

    try {
      const canvas = canvasRef.current || document.createElement("canvas");

      // Escalar manteniendo proporción adecuada para OCR
      const maxWidth = 1600;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo obtener contexto 2D del canvas");

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

      // Generar micro-miniatura ultraliviana (~6KB a 10KB) garantizada para WebSocket sin superar límites
      let microThumb = "";
      try {
        const thumbCanvas = document.createElement("canvas");
        const thumbWidth = 320;
        const thumbHeight = Math.round((height * thumbWidth) / width);
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const tCtx = thumbCanvas.getContext("2d");
        if (tCtx) {
          tCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
          microThumb = thumbCanvas.toDataURL("image/jpeg", 0.45);
        }
      } catch (thumbErr) {
        console.warn("[Captura] Error generando micro-miniatura:", thumbErr);
      }

      // Avisar a la PC inmediatamente vía Realtime WebSocket con la micro-foto para que aparezca al instante
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "capture_received",
          payload: { timestamp: Date.now(), imageUrl: microThumb || undefined },
        });
      }

      // Procesar en API de extracción con la imagen en alta definición
      const response = await fetch("/api/scan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: token,
          image: dataUrl,
          barcodes: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Error en el servidor al analizar imagen");
      }

      const result = await response.json();

      if (result.success && result.data) {
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "scan_analyzed",
            payload: {
              data: result.data,
              imageUrl: microThumb || undefined,
            },
          });
        }

        const sn = result.data.serial_number || "Equipo";
        const mac = result.data.mac_address
          ? ` | MAC: ${result.data.mac_address}`
          : "";
        setStatusMessage(`Detectado: ${sn}${mac}. Revisando en PC...`);

        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([50, 40, 50]);
        }
      } else {
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "scan_analyzed",
            payload: {
              data: {
                brand: null,
                model: null,
                serial_number: null,
                mac_address: null,
                suggested_sku: null,
                suggested_name: null,
                category: "Equipos Activos",
                unit: "unidades",
                is_serialized: true,
                confidence: 0,
                is_new_catalog_item: false,
              },
              imageUrl: microThumb || undefined,
            },
          });
        }
        setStatusMessage(
          "Imagen enviada a la PC. Verifica los datos en la pantalla de la PC."
        );
      }
    } catch (err: any) {
      console.error("[Captura] Error:", err);
      setStatusMessage("Error al procesar. Verifique la conexión a la red.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Barra superior de estado */}
      <header className="z-20 flex items-center justify-between p-3 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          {isConnectedToPc ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs">
              <Wifi className="h-3.5 w-3.5 animate-pulse" />
              <span>Vinculado a PC</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Esperando PC...</span>
            </Badge>
          )}

          {wakeLockActive && (
            <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
              Pantalla activa
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleTorch}
              className={`h-8 w-8 p-0 rounded-full border-white/20 ${
                torchOn
                  ? "bg-amber-400 text-black hover:bg-amber-300"
                  : "bg-black/40 text-white hover:bg-white/10"
              }`}
            >
              {torchOn ? (
                <Flashlight className="h-4 w-4" />
              ) : (
                <FlashlightOff className="h-4 w-4 text-white/60" />
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleStartCamera}
            className="h-8 w-8 p-0 rounded-full border-white/20 bg-black/40 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5 text-white/80" />
          </Button>
        </div>
      </header>

      {/* Visor de cámara en vivo */}
      <main className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center max-w-sm space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
            <p className="text-sm text-zinc-300">{cameraError}</p>
            <Button
              onClick={handleStartCamera}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reintentar permiso
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                (e.currentTarget as HTMLVideoElement).play().catch(() => {});
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Guía visual de alineación para la etiqueta */}
            <div className="relative z-10 w-[84%] max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex flex-col justify-between p-4 pointer-events-none">
              <div className="flex justify-between items-center text-[11px] font-mono text-emerald-300 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                <span>SERIAL + MAC</span>
              </div>

              {/* Centro de mira */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan className="h-10 w-10 text-emerald-400/40 animate-pulse" />
              </div>

              <div className="text-[10px] text-center text-white/80 bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
                Enfoca la etiqueta con nitidez
              </div>
            </div>
          </>
        )}
      </main>

      {/* Barra inferior de controles y disparo */}
      <footer className="z-20 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col items-center gap-3">
        {/* Mensaje de estado dinámico */}
        <div className="w-full text-center px-4 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-200">
          {statusMessage}
        </div>

        {/* Botón táctil grande de captura */}
        <div className="flex items-center justify-center w-full max-w-xs">
          <Button
            size="lg"
            disabled={isCapturing || !!cameraError}
            onClick={handleCaptureFrame}
            className="w-full h-14 rounded-full text-base font-semibold shadow-lg bg-emerald-500 hover:bg-emerald-600 text-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Extrayendo datos...</span>
              </>
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span>Capturar Etiqueta</span>
              </>
            )}
          </Button>
        </div>

        {/* Info de sesión de almacén */}
        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          <span>{locationName || "Ubicación asignada"}</span>
          <span>•</span>
          <span>{userName || "Operador"}</span>
        </div>
      </footer>
    </div>
  );
};
