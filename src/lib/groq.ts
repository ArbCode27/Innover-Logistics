import type { ExtractedLabelData } from "@/types/scan";

interface GroqVisionMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

const SYSTEM_PROMPT = `
Eres un sistema de visión artificial de alta precisión para inventario de telecomunicaciones (Star Conectados).
Tu objetivo es leer etiquetas de equipos (ONUs, Routers, OLTs, switches, etc.) y extraer ÚNICAMENTE los datos visibles reales.
NO inventes datos. Si un campo no es visible o legible en la foto, déjalo como null.

Devuelve estrictamente un objeto JSON con esta estructura exacta (sin markdown ni texto adicional):
{
  "brand": "Marca del equipo (ej: ZTE, Huawei, FiberHome, TP-Link, Mercusys, etc.) o null",
  "model": "Modelo exacto (ej: EchoLife HG8310M, ZXHN F670L, Archer C6) o null",
  "serial_number": "Número de serie alfanumérico limpio sin prefijo SN/SN: o null",
  "mac_address": "Dirección MAC física en formato XX:XX:XX:XX:XX:XX o null",
  "suggested_sku": "SKU sugerido en mayúsculas (ej: ONT-ZTE-F670L) o null",
  "suggested_name": "Nombre descriptivo (ej: Router Wi-Fi 6 ZTE ZXHN F670L) o null",
  "category": "Equipos Activos",
  "unit": "unidades",
  "is_serialized": true,
  "confidence": 0.95,
  "raw_text": "Texto completo leído de la etiqueta"
}
`;

export const analyzeImageWithGroq = async (
  imageDataUrl: string,
  detectedBarcodes: string[] = []
): Promise<ExtractedLabelData> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn("[Groq Vision] Falta la variable GROQ_API_KEY en el entorno");
    return generateHonestFallback(detectedBarcodes, "No se ha configurado la variable de entorno GROQ_API_KEY");
  }

  const primaryModel = process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview";
  const fallbackModel = "llama-3.2-90b-vision-preview";

  const userPrompt = `
Analiza la etiqueta en la imagen adjunta.
${
  detectedBarcodes.length > 0
    ? `Códigos de barras / QR pre-detectados: ${detectedBarcodes.join(", ")}`
    : ""
}
Lee el número de serie (SN), la dirección MAC, la marca y el modelo.
Responde únicamente con el JSON válido.
`;

  // Intento con modelo principal y fallback automático si el modelo cambia
  for (const modelToTry of [primaryModel, fallbackModel]) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelToTry,
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
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Groq Vision] Error con modelo ${modelToTry} (${response.status}):`, errText);
        if (modelToTry !== fallbackModel) continue;
        return generateHonestFallback(detectedBarcodes, `Error de Groq API: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        if (modelToTry !== fallbackModel) continue;
        return generateHonestFallback(detectedBarcodes, "Groq no devolvió texto");
      }

      const parsed = extractJson(rawContent);
      if (!parsed) {
        if (modelToTry !== fallbackModel) continue;
        return generateHonestFallback(detectedBarcodes, "Respuesta de Groq no contenía JSON válido");
      }

      // Normalizar datos extraídos
      let serialNumber =
        cleanSerial(parsed.serial_number) ||
        detectedBarcodes.find((b) => !b.includes(":") && b.length >= 8) ||
        undefined;

      let macAddress = formatMacAddress(
        parsed.mac_address ||
          detectedBarcodes.find((b) => isLikelyMac(b)) ||
          undefined
      );

      // Si Groq devolvió raw_text pero falló en el JSON estricto para SN o MAC, pasar regex de respaldo
      if ((!serialNumber || !macAddress) && rawContent) {
        const regexMatch = extractMacAndSerialFromText(rawContent);
        if (!serialNumber && regexMatch.serial) serialNumber = regexMatch.serial;
        if (!macAddress && regexMatch.mac) macAddress = regexMatch.mac;
      }

      const brand = parsed.brand?.trim() || "Equipo ISP";
      const model = parsed.model?.trim() || "";
      const suggestedSku =
        parsed.suggested_sku?.toUpperCase().replace(/\s+/g, "-") ||
        (brand && model
          ? `ONT-${brand.substring(0, 3).toUpperCase()}-${model.replace(/[^A-Za-z0-9]/g, "").substring(0, 6).toUpperCase()}`
          : "ONT-GEN-001");

      const suggestedName =
        parsed.suggested_name?.trim() ||
        `${brand} ${model}`.trim() ||
        "Equipo de Telecomunicaciones";

      return {
        brand,
        model,
        serial_number: serialNumber,
        mac_address: macAddress,
        suggested_sku: suggestedSku,
        suggested_name: suggestedName,
        category: parsed.category || "Equipos Activos",
        unit: parsed.unit || "unidades",
        is_serialized: parsed.is_serialized ?? true,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
        raw_text: parsed.raw_text || rawContent,
        detected_barcodes: detectedBarcodes,
      };
    } catch (error: any) {
      console.warn(`[Groq Vision] Excepción con modelo ${modelToTry}:`, error.message);
      if (modelToTry === fallbackModel) {
        return generateHonestFallback(detectedBarcodes, error.message);
      }
    }
  }

  return generateHonestFallback(detectedBarcodes, "No se pudo procesar la imagen con Groq");
};

const extractJson = (text: string): any => {
  // 1. Direct parse
  try {
    return JSON.parse(text.trim());
  } catch {}

  // 2. Markdown ```json ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Outermost { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
};

const formatMacAddress = (mac?: string): string | undefined => {
  if (!mac) return undefined;
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,2}/g)?.join(":") || undefined;
  }
  if (mac.includes(":") && mac.length === 17) {
    return mac.toUpperCase();
  }
  if (mac.includes("-") && mac.length === 17) {
    return mac.replace(/-/g, ":").toUpperCase();
  }
  return undefined;
};

const isLikelyMac = (text: string): boolean => {
  const cleaned = text.replace(/[^0-9A-Fa-f]/g, "");
  return cleaned.length === 12;
};

const cleanSerial = (sn?: string | null): string | undefined => {
  if (!sn) return undefined;
  const cleaned = sn.replace(/^(SN|S\/N|SERIAL|GPON\s*SN|PON\s*SN):?\s*/i, "").trim();
  return cleaned.length >= 4 ? cleaned : undefined;
};

/**
 * Intenta extraer MAC y Serial a partir de texto libre o códigos detectados
 */
const extractMacAndSerialFromText = (
  text: string
): { serial?: string; mac?: string } => {
  let foundMac: string | undefined;
  let foundSerial: string | undefined;

  // Regex para MAC: XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX o 12 hex continuos con prefijo MAC
  const macRegex = /(?:MAC(?:\s*(?:ADDR|ADDRESS))?[:\s]*)?([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/i;
  const macMatch = text.match(macRegex);
  if (macMatch && macMatch[1]) {
    foundMac = formatMacAddress(macMatch[1]);
  } else {
    // Buscar 12 caracteres hex precedidos de "MAC"
    const macPlainRegex = /MAC[:\s]*([0-9A-Fa-f]{12})/i;
    const plainMatch = text.match(macPlainRegex);
    if (plainMatch && plainMatch[1]) {
      foundMac = formatMacAddress(plainMatch[1]);
    }
  }

  // Regex para Serial de telecomunicaciones:
  // e.g. SN: LANLY-ONU-89211 o S/N: 48575443... o GPON SN: ALCLB...
  const snRegex = /(?:(?:GPON|PON)?\s*(?:S\/N|SN|SERIAL)(?:\s*(?:NO|NUM|NUMBER))?[:\s]*)([A-Za-z0-9\-_]{6,30})/i;
  const snMatch = text.match(snRegex);
  if (snMatch && snMatch[1]) {
    const candidate = cleanSerial(snMatch[1]);
    // Asegurarse de que no sea la misma MAC
    if (candidate && (!foundMac || candidate.replace(/[:\-]/g, "") !== foundMac.replace(/[:\-]/g, ""))) {
      foundSerial = candidate;
    }
  }

  return { serial: foundSerial, mac: foundMac };
};

/**
 * Fallback honesto con extracción inteligente por Regex y Códigos de barras:
 * NO inventa seriales ni MACs falsos.
 */
const generateHonestFallback = (
  detectedBarcodes: string[],
  reason: string
): ExtractedLabelData => {
  let serial: string | undefined;
  let mac: string | undefined;

  // 1. Probar entre los códigos de barras detectados
  for (const b of detectedBarcodes) {
    if (!mac && isLikelyMac(b)) {
      mac = formatMacAddress(b);
    } else if (!serial) {
      const cleaned = cleanSerial(b);
      if (cleaned && cleaned.length >= 6) {
        serial = cleaned;
      }
    }
  }

  // 2. Si hay texto crudo en la razón, intentar regex
  if (reason) {
    const extracted = extractMacAndSerialFromText(reason);
    if (!serial && extracted.serial) serial = extracted.serial;
    if (!mac && extracted.mac) mac = extracted.mac;
  }

  return {
    brand: "Equipo Detectado",
    model: "",
    serial_number: serial,
    mac_address: mac,
    suggested_sku: serial ? `EQ-${serial.substring(0, 6)}` : "EQ-MANUAL-001",
    suggested_name: "Equipo de Telecomunicaciones",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    confidence: serial ? 0.7 : 0.0,
    raw_text: reason,
    detected_barcodes: detectedBarcodes,
  };
};
