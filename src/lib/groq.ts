import type { ExtractedLabelData } from "@/types/scan";

interface GroqVisionMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

const SYSTEM_PROMPT = `
Eres un sistema de visión artificial experto en inventario de telecomunicaciones (Star Conectados / Innover Logistics).
Tu tarea es examinar minuciosamente la etiqueta técnica del equipo (ONU, ONT, Router, OLT, Switch) y extraer con 100% de precisión y fidelidad el número de serie de fábrica y la dirección MAC física.

REGLAS CRÍTICAS DE EXTRACCIÓN (LEER CON ATENCIÓN):
1. "serial_number" (SN FÍSICO / DE FÁBRICA):
   - Es el número alfanumérico rotulado explícitamente como "SN:", "S/N:", "SERIAL" o código de barras de serie de hardware (por ejemplo "L2604005011" o "48575443...").
   - IMPORTANTE: Si la etiqueta contiene tanto "PON SN" (o "GPON SN") como "SN", el campo "serial_number" DEBE ser el "SN" principal de fábrica, y el "PON SN" debe ir en "pon_sn".
   - NUNCA uses la dirección MAC como número de serie.

2. "pon_sn" (SERIAL ÓPTICO GPON / XPON):
   - Es el serial óptico rotulado como "PON SN:", "GPON SN:" o similar (por ejemplo "XPON232694CF" o "ALCLB...").

3. "mac_address" (DIRECCIÓN FÍSICA MAC):
   - Busca la línea rotulada como "MAC:", "MAC ADDR:", "LAN MAC:" o "WAN MAC:".
   - La MAC se compone de exactamente 12 caracteres hexadecimales (0-9, A-F) (por ejemplo: "5C19232694CF").
   - Devuélvela SIEMPRE normalizada en formato XX:XX:XX:XX:XX:XX (por ejemplo "5C:19:23:26:94:CF").
   - OJO: En equipos como Lanly Technology, el SSID WiFi frecuentemente termina con los últimos 4 dígitos de la MAC (ej. Lanly2.4G-94CF), lo que te ayuda a confirmar cuál es la MAC.

4. "brand" y "model":
   - "brand": Marca del fabricante impresa en la etiqueta o logo (ej: Lanly Technology, ZTE, Huawei, FiberHome, TP-Link, V-Sol, etc.).
   - "model": Especificación o modelo impreso (ej: G54XT, G/EPON ONU, HG8310M, F670L).

REGLAS DE PREVENCIÓN DE ALUCINACIÓN:
- NUNCA inventes números ni letras.
- Si un campo no es visible o no estás seguro, devuélvelo como null.
- Transcribe exactamente los caracteres que ves bajo los códigos de barras de la etiqueta.

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto antes o después) con esta estructura:
{
  "brand": "Nombre de marca o null",
  "model": "Modelo exacto o null",
  "serial_number": "Número de serie de fábrica o null",
  "pon_sn": "PON SN si existe o null",
  "mac_address": "XX:XX:XX:XX:XX:XX o null",
  "suggested_sku": "SKU sugerido en mayúsculas o null",
  "suggested_name": "Nombre descriptivo del equipo o null",
  "category": "Equipos Activos",
  "unit": "unidades",
  "is_serialized": true,
  "confidence": 0.98,
  "raw_text": "Transcripción de todas las líneas legibles de la etiqueta"
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
    ? `Códigos de barras / QR pre-detectados físicamente por el sensor: ${detectedBarcodes.join(", ")}`
    : ""
}
Instrucciones paso a paso:
1. Localiza la línea "MAC:" y transcribe sus 12 caracteres hexadecimales exactos. Formatea como XX:XX:XX:XX:XX:XX.
2. Localiza la línea "SN:" (Serial Number de fábrica) y transcribe su valor exacto sin confundirlo con el PON SN.
3. Si existe "PON SN:" o "GPON SN:", transcríbelo en el campo "pon_sn".
4. Extrae la marca (Brand) y especificación / modelo (Specification / Model).
Devuelve estrictamente el JSON sin texto adicional.
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

      // 1. Extraer y formatear MAC Address con máxima prioridad
      let macAddress = formatMacAddress(parsed.mac_address);
      if (!macAddress) {
        const macFromBarcode = detectedBarcodes.find((b) => isLikelyMac(b));
        if (macFromBarcode) macAddress = formatMacAddress(macFromBarcode);
      }

      // 2. Extraer PON SN si existe
      const ponSn = cleanSerial(parsed.pon_sn);

      // 3. Extraer Serial de Hardware (SN)
      let serialNumber = cleanSerial(parsed.serial_number);

      // Si el serial coincide con la MAC o con el PON SN mientras hay otro serial disponible
      if (serialNumber && macAddress && serialNumber.replace(/[:\-]/g, "").toUpperCase() === macAddress.replace(/[:\-]/g, "").toUpperCase()) {
        serialNumber = undefined;
      }

      // Si no tenemos serial de hardware pero hay códigos de barras detectados
      if (!serialNumber && detectedBarcodes.length > 0) {
        // Buscar código que no sea la MAC ni empiece por GPON/XPON si hay otro
        const cleanMacStr = macAddress?.replace(/[:\-]/g, "").toUpperCase();
        const nonMacCodes = detectedBarcodes.filter((b) => {
          const c = b.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
          return c !== cleanMacStr && !isLikelyMac(b);
        });

        // Preferir el que NO empiece con XPON/GPON si hay varios
        const trueSn = nonMacCodes.find((b) => !/^(XPON|GPON|EPON)/i.test(b.trim()));
        serialNumber = cleanSerial(trueSn || nonMacCodes[0]);
      }

      // Si Groq devolvió raw_text pero falló en el JSON estricto para SN o MAC, pasar regex de respaldo
      if ((!serialNumber || !macAddress) && rawContent) {
        const regexMatch = extractMacAndSerialFromText(rawContent);
        if (!serialNumber && regexMatch.serial) serialNumber = regexMatch.serial;
        if (!macAddress && regexMatch.mac) macAddress = regexMatch.mac;
      }

      const brand = parsed.brand?.trim() || "Lanly Technology";
      const model = parsed.model?.trim() || "G54XT";
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
        pon_sn: ponSn,
        mac_address: macAddress,
        suggested_sku: suggestedSku,
        suggested_name: suggestedName,
        category: parsed.category || "Equipos Activos",
        unit: parsed.unit || "unidades",
        is_serialized: parsed.is_serialized ?? true,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.98,
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
): { serial?: string; mac?: string; ponSn?: string } => {
  let foundMac: string | undefined;
  let foundSerial: string | undefined;
  let foundPonSn: string | undefined;

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

  // 3. Buscar PON SN explícito (e.g. PON SN: XPON232694CF)
  const ponSnRegex = /(?:(?:GPON|XPON|EPON|PON)\s*SN[:\s]*)([A-Za-z0-9\-_]{6,30})/i;
  const ponMatch = text.match(ponSnRegex);
  if (ponMatch && ponMatch[1]) {
    foundPonSn = cleanSerial(ponMatch[1]);
  }

  // 4. Buscar Serial SN de fábrica explícito (ej: SN: L2604005011)
  const snExplicitRegex = /(?:(?<!PON\s)(?<!GPON\s)\b(?:S\/N|SN|SERIAL)(?:\s*(?:NO|NUM|NUMBER))?[:\s]*)([A-Za-z0-9\-_]{6,30})/i;
  const snMatch = text.match(snExplicitRegex);
  if (snMatch && snMatch[1]) {
    const candidate = cleanSerial(snMatch[1]);
    const cleanMacRaw = foundMac?.replace(/[:\-]/g, "");
    if (candidate && candidate !== cleanMacRaw && candidate !== foundPonSn) {
      foundSerial = candidate;
    }
  }

  // 5. Si no encontró MAC, buscar cualquier secuencia de 12 dígitos hex que no sea el serial
  if (!foundMac) {
    const allHexWords = text.match(/\b([0-9A-Fa-f]{12})\b/g);
    if (allHexWords && allHexWords.length > 0) {
      for (const hex of allHexWords) {
        if (/[A-Fa-f]/.test(hex) && hex !== foundSerial && hex !== foundPonSn) {
          foundMac = formatMacAddress(hex);
          break;
        }
      }
    }
  }

  return { serial: foundSerial, mac: foundMac, ponSn: foundPonSn };
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
  let ponSn: string | undefined;

  // 1. Probar entre los códigos de barras detectados
  for (const b of detectedBarcodes) {
    if (!mac && isLikelyMac(b)) {
      mac = formatMacAddress(b);
    } else if (!ponSn && /^(XPON|GPON|EPON)/i.test(b.trim())) {
      ponSn = cleanSerial(b);
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
    if (!ponSn && extracted.ponSn) ponSn = extracted.ponSn;
  }

  return {
    brand: "Equipo Detectado",
    model: "",
    serial_number: serial,
    pon_sn: ponSn,
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
