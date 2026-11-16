import type { ExtractedLabelData } from "@/types/scan";

interface GroqVisionMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

const SYSTEM_PROMPT = `
Eres un sistema de visión artificial experto en inventario de telecomunicaciones (Star Conectados).
Tu objetivo es examinar la etiqueta del equipo (ONU, Router, ONT, OLT, Switch) y extraer de forma exhaustiva y precisa:
1. "serial_number": El número de serie (SN, S/N, GPON SN, PON SN, Barcode).
2. "mac_address": La dirección MAC física del equipo (frecuentemente etiquetada como MAC, MAC ADDR, WAN MAC, LAN MAC o BSSID). Búscala con mucha atención: puede estar formateada como XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX o como 12 caracteres hexadecimales continuos. Si la encuentras sin dos puntos o con guiones, normalízala siempre al formato XX:XX:XX:XX:XX:XX.
3. "brand": Marca del fabricante (ej: Lanly, ZTE, Huawei, FiberHome, TP-Link, Mercusys, V-Sol, etc.).
4. "model": Modelo exacto (ej: XPON Dual Band, HG8310M, F670L, etc.).

IMPORTANTE:
- Revisa minuciosamente todas las líneas de texto, números y códigos de barras de la etiqueta.
- La dirección MAC casi siempre está presente en ONUs y Routers junto a su código de barras o debajo del serial.
- Devuelve estrictamente un JSON válido con esta estructura (sin texto explicativo ni formato adicional):
{
  "brand": "Marca o null",
  "model": "Modelo o null",
  "serial_number": "Número de serie alfanumérico limpio o null",
  "mac_address": "XX:XX:XX:XX:XX:XX o null",
  "suggested_sku": "SKU sugerido en mayúsculas o null",
  "suggested_name": "Nombre descriptivo o null",
  "category": "Equipos Activos",
  "unit": "unidades",
  "is_serialized": true,
  "confidence": 0.95,
  "raw_text": "Todo el texto legible encontrado en la etiqueta"
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
Examina con máxima atención la etiqueta en la imagen adjunta.
${
  detectedBarcodes.length > 0
    ? `Códigos de barras / QR pre-detectados: ${detectedBarcodes.join(", ")}`
    : ""
}
Instrucciones críticas:
1. Extrae el número de serie (SN / Serial Number).
2. Extrae la dirección MAC (MAC / MAC Address). Fíjate en los bloques de 12 dígitos hexadecimales o con formato XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX.
3. Extrae la marca y modelo.
Devuelve únicamente el objeto JSON con los campos extraídos.
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
  // Una MAC tiene exactamente 12 caracteres hexadecimales
  return cleaned.length === 12 && /^[0-9A-Fa-f]{12}$/.test(cleaned);
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

  // 1. Regex para MAC estándar: XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX
  const macRegex = /(?:MAC(?:\s*(?:ADDR|ADDRESS|ID))?[:\s]*)?([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/i;
  const macMatch = text.match(macRegex);
  if (macMatch && macMatch[1]) {
    foundMac = formatMacAddress(macMatch[1]);
  }

  // 2. Si no encontró con separadores, buscar "MAC" seguido de 12 dígitos hex
  if (!foundMac) {
    const macPlainRegex = /(?:MAC(?:\s*(?:ADDR|ADDRESS|ID))?[:\s]*)([0-9A-Fa-f]{12})/i;
    const plainMatch = text.match(macPlainRegex);
    if (plainMatch && plainMatch[1]) {
      foundMac = formatMacAddress(plainMatch[1]);
    }
  }

  // 3. Buscar cualquier secuencia de 12 dígitos hex que no sea el serial
  if (!foundMac) {
    const allHexWords = text.match(/\b([0-9A-Fa-f]{12})\b/g);
    if (allHexWords && allHexWords.length > 0) {
      for (const hex of allHexWords) {
        // Asegurar que contenga letras y números típicos de MAC o prefijo reconocible
        if (/[A-Fa-f]/.test(hex)) {
          foundMac = formatMacAddress(hex);
          break;
        }
      }
    }
  }

  // Regex para Serial de telecomunicaciones:
  // e.g. SN: LANLY-ONU-89211 o S/N: 48575443... o GPON SN: ALCLB... o L2604005011...
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
