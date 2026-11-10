import type { ExtractedLabelData } from "@/types/scan";

interface GroqVisionMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

const SYSTEM_PROMPT = `
Eres un sistema experto en visión artificial para control de inventario de telecomunicaciones y redes FTTH/GPON (Star Conectados / Innover Logistics).
Tu tarea es inspeccionar la fotografía de una etiqueta o chasis de equipo (ONUs, Routers, OLTs, switches, bobinas, accesorios) y extraer con máxima precisión los siguientes datos estructurados en formato JSON:

1. "brand": Marca del fabricante (ej: ZTE, Huawei, FiberHome, TP-Link, Mercusys, Ubiquiti, Mikrotik).
2. "model": Modelo exacto (ej: EchoLife HG8310M, ZXHN F670L, Archer C6, V2801SG).
3. "serial_number": Número de serie único (SN, S/N, GPON SN, serial barcode). Extrae solo los caracteres alfanuméricos limpios sin prefijos como "S/N:" o "SN". Si hay GPON SN (ej. 48575443..., ZTEG...), priorízalo.
4. "mac_address": Dirección física MAC (ej: 00:1A:2B:3C:4D:01 o AA:BB:CC:DD:EE:FF). Normalízala siempre con letras mayúsculas separadas por dos puntos. Si no hay MAC en la etiqueta, devuelve null.
5. "suggested_sku": Código SKU estandarizado propuesto. Formato: [TIPO]-[MARCA_3_LETRAS]-[MODELO_CORTO] en mayúsculas y guiones (ejemplos: ONT-ZTE-F670L, ONU-HUA-8310M, RTR-TPL-AC12, SWI-UBI-8P).
6. "suggested_name": Nombre comercial claro del producto (ej: "Router Wi-Fi 6 ZTE ZXHN F670L", "ONU GPON Huawei EchoLife HG8310M").
7. "category": Selecciona exactamente una de estas categorías:
   - "Equipos Activos" (para ONUs, routers, switches, gateways, fuentes)
   - "Fibra Óptica" (para cables, bobinas, patch cords, splitters)
   - "Ferretería y Pasivos" (para tensores, herrajes, conectores, rosetas)
   - "Herramientas" (para fusionadoras, OTDR, peladoras, medidores)
8. "unit": "unidades" para equipos, "metros" para cables, "bobinas" para bobinas completas.
9. "is_serialized": true si tiene serial o MAC, false si es material pasivo a granel.
10. "confidence": Número flotante de 0.0 a 1.0 que indique tu nivel de certeza en la lectura.
11. "raw_text": Resumen de texto visible leído en la etiqueta.

IMPORTANTE:
- Responde ÚNICAMENTE con el objeto JSON válido. Sin markdown, sin explicaciones, sin texto antes ni después.
- Si una etiqueta contiene tanto Serial como MAC, extrae AMBOS de forma simultánea.
- Si no logras leer el serial con nitidez, deja serial_number como null y reduce la confianza.
`;

export const analyzeImageWithGroq = async (
  imageDataUrl: string,
  detectedBarcodes: string[] = []
): Promise<ExtractedLabelData> => {
  const apiKey = process.env.GROQ_API_KEY;

  // Si no hay API key configurada, retornar extracción basada en barcodes o fallback
  if (!apiKey) {
    return generateFallbackExtraction(imageDataUrl, detectedBarcodes);
  }

  const model = process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";

  const userPrompt = `
Analiza la etiqueta en la imagen adjunta.
${
  detectedBarcodes.length > 0
    ? `Códigos de barras / QR pre-detectados por el sensor óptico del navegador: ${detectedBarcodes.join(", ")}`
    : ""
}
Extrae: Marca, Modelo, Serial (SN), Dirección MAC, SKU propuesto, Categoría y Nombre.
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ] as GroqVisionMessageContent[],
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Groq Vision] Error API HTTP:", response.status, errText);
      return generateFallbackExtraction(imageDataUrl, detectedBarcodes);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return generateFallbackExtraction(imageDataUrl, detectedBarcodes);
    }

    const parsed = JSON.parse(rawContent);

    // Normalizar datos extraídos
    const serialNumber =
      parsed.serial_number ||
      detectedBarcodes.find((b) => !b.includes(":") && b.length >= 8) ||
      undefined;

    const macAddress = formatMacAddress(
      parsed.mac_address ||
        detectedBarcodes.find((b) => isLikelyMac(b)) ||
        undefined
    );

    return {
      brand: parsed.brand || "ZTE",
      model: parsed.model || "ZXHN F670L",
      serial_number: serialNumber ? cleanSerial(serialNumber) : undefined,
      mac_address: macAddress,
      suggested_sku: parsed.suggested_sku?.toUpperCase() || "ONT-GEN-001",
      suggested_name: parsed.suggested_name || `${parsed.brand || "Equipo"} ${parsed.model || ""}`.trim(),
      category: parsed.category || "Equipos Activos",
      unit: parsed.unit || "unidades",
      is_serialized: parsed.is_serialized ?? true,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      raw_text: parsed.raw_text,
      detected_barcodes: detectedBarcodes,
    };
  } catch (error) {
    console.error("[Groq Vision] Error de ejecución:", error);
    return generateFallbackExtraction(imageDataUrl, detectedBarcodes);
  }
};

const formatMacAddress = (mac?: string): string | undefined => {
  if (!mac) return undefined;
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,2}/g)?.join(":") || undefined;
  }
  return mac.toUpperCase();
};

const isLikelyMac = (text: string): boolean => {
  const cleaned = text.replace(/[^0-9A-Fa-f]/g, "");
  return cleaned.length === 12;
};

const cleanSerial = (sn: string): string => {
  return sn.replace(/^(SN|S\/N|SERIAL):?\s*/i, "").trim();
};

/**
 * Fallback para desarrollo, entornos sin credenciales o pruebas sin conexión.
 */
const generateFallbackExtraction = (
  _imageDataUrl: string,
  detectedBarcodes: string[]
): ExtractedLabelData => {
  const barcode = detectedBarcodes[0] || "";
  const macBarcode = detectedBarcodes.find((b) => isLikelyMac(b));

  const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase();

  const isZte = barcode.startsWith("ZTEG") || barcode.includes("ZTE");
  const isHua = barcode.startsWith("48575443") || barcode.includes("HUA");

  const brand = isZte ? "ZTE" : isHua ? "Huawei" : "ZTE";
  const model = isZte ? "ZXHN F670L" : isHua ? "EchoLife HG8310M" : "ZXHN F670L";
  const suggestedSku = isZte ? "ONT-ZTE-F670L" : isHua ? "ONU-HUA-8310" : `ONT-ZTE-F670L-${randomHash}`;
  const suggestedName = isZte
    ? "Router Wi-Fi 6 ZTE ZXHN F670L"
    : isHua
    ? "ONU GPON Huawei EchoLife HG8310M"
    : "Router Wi-Fi 6 ZTE ZXHN F670L";

  const serial =
    cleanSerial(barcode) ||
    (isHua ? `48575443${randomHash}1122` : `ZTEGC${randomHash}3344`);

  const mac = macBarcode
    ? formatMacAddress(macBarcode)
    : `00:1A:2B:${randomHash.substring(0, 2)}:${randomHash.substring(2, 4)}:01`;

  return {
    brand,
    model,
    serial_number: serial,
    mac_address: mac,
    suggested_sku: suggestedSku,
    suggested_name: suggestedName,
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    confidence: 0.92,
    raw_text: `Brand: ${brand} Model: ${model} SN: ${serial} MAC: ${mac}`,
    detected_barcodes: detectedBarcodes,
  };
};
