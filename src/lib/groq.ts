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
   - "suggested_name": nombre con el que se da de alta el equipo. Si la etiqueta dice ONU/ONT WiFi de doble banda de Lanly, usa "ONU Lanly doble banda". Si no hay marca ni modelo impresos, devuelve null.

5. HOJA DE CAJA CON VARIOS SERIALES DEL MISMO EQUIPO (MUY IMPORTANTE):
   - A veces la foto NO es la etiqueta de un solo ONU. Es la hoja pegada a la caja: un encabezado y una grilla de códigos de barras.
   - Ejemplo real: "SN: L2604012321 -- L2604012340" y debajo dos columnas de códigos, uno por equipo (L2604012321, L2604012322, ... hasta L2604012340).
   - Cada código de barras es UN equipo del mismo producto. Hay que devolverlos TODOS en "serial_numbers", sin omitir ni repetir.
   - "serial_number" es solo el primero de esa lista.
   - "quantity" es la cantidad de seriales (en el ejemplo, 20: desde 12321 hasta 12340).
   - Si lees el rango "INICIO -- FIN" (mismo prefijo, números seguidos), llena "serial_range_start" y "serial_range_end" con los extremos EXACTOS que están impresos. Aunque algún código de la grilla se vea borroso, el rango del encabezado manda.
   - Esa hoja normalmente NO trae MAC ni PON SN. Déjalos en null. Nunca uses un serial como MAC.
   - Si la hoja solo muestra seriales, fecha y país de origen, brand, model y suggested_name van en null. No inventes el modelo.
   - El rango de ejemplo L2604012321 -- L2604012340 solo se usa si ESOS números están impresos en la foto. Si la foto trae otros seriales, transcribe los que ves.

REGLAS DE PREVENCIÓN DE ALUCINACIÓN:
- NUNCA inventes números ni letras.
- Si un campo no es visible o no estás seguro, devuélvelo como null.
- Transcribe exactamente los caracteres que ves bajo los códigos de barras de la etiqueta.
- En una hoja de varios seriales, no te quedes con un solo código: lista todos los que alcances a leer y siempre reporta el rango del encabezado.

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto antes o después) con esta estructura:
{
  "brand": "Nombre de marca o null",
  "model": "Modelo exacto o null",
  "serial_number": "Primer serial de fábrica o null",
  "serial_numbers": ["L2604012321", "L2604012322"],
  "serial_range_start": "L2604012321 o null",
  "serial_range_end": "L2604012340 o null",
  "quantity": 1,
  "pon_sn": "PON SN si existe o null",
  "mac_address": "XX:XX:XX:XX:XX:XX o null",
  "suggested_sku": "SKU sugerido en mayúsculas o null",
  "suggested_name": "ONU Lanly doble banda o null",
  "category": "Equipos Activos",
  "unit": "unidades",
  "is_serialized": true,
  "confidence": 0.98,
  "raw_text": "Transcripción de todas las líneas legibles, incluido el rango SN: INICIO -- FIN y cada serial bajo su código"
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
1. Decide primero qué tipo de foto es.
   - Etiqueta de UN equipo: tiene un SN, a veces PON SN y MAC.
   - Hoja de caja: muchos códigos de barras del mismo producto, a menudo con un rango "SN: INICIO -- FIN" (ejemplo L2604012321 -- L2604012340).
2. Si es hoja de caja:
   - Copia el rango del encabezado en serial_range_start y serial_range_end.
   - Lista en serial_numbers cada serial impreso bajo un código de barras, de izquierda a derecha y de arriba a abajo.
   - quantity = cantidad de equipos. No devuelvas solo el primero.
   - mac_address y pon_sn = null si no están impresos.
   - Si no aparece marca ni modelo, brand, model y suggested_name = null.
3. Si es etiqueta de un solo equipo:
   - Localiza "MAC:" y formatea XX:XX:XX:XX:XX:XX.
   - Localiza "SN:" de fábrica sin confundirlo con el PON SN.
   - Si existe "PON SN:" o "GPON SN:", va en pon_sn.
   - Extrae marca y modelo. Si es un ONU WiFi Lanly de doble banda, suggested_name = "ONU Lanly doble banda".
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
          max_tokens: 2048,
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

      // 3. Hoja de varios seriales, o un solo SN de fábrica
      const sheetSerials = collectSheetSerials(parsed, rawContent, detectedBarcodes);
      let serialNumber = sheetSerials[0] || cleanSerial(parsed.serial_number);

      // Si el serial coincide con la MAC o con el PON SN mientras hay otro serial disponible
      const macCompact = macAddress?.replace(/[:\-]/g, "").toUpperCase();
      if (serialNumber && macCompact && serialNumber.replace(/[:\-]/g, "").toUpperCase() === macCompact) {
        serialNumber = sheetSerials.find((sn) => sn.replace(/[:\-]/g, "").toUpperCase() !== macCompact);
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

      const serialNumbers = sheetSerials.length > 0
        ? sheetSerials
        : serialNumber
          ? [serialNumber]
          : [];
      const isSheet = serialNumbers.length > 1;

      // Una hoja de caja no trae una sola MAC para todos los equipos
      if (isSheet) {
        macAddress = undefined;
      }

      const parsedBrand = parsed.brand?.trim();
      const parsedModel = parsed.model?.trim();
      const brand = parsedBrand || (isSheet ? undefined : "Lanly Technology");
      const model = parsedModel || (isSheet ? undefined : "G54XT");
      const suggestedSku =
        parsed.suggested_sku?.toUpperCase().replace(/\s+/g, "-") ||
        (brand && model
          ? `ONT-${brand.substring(0, 3).toUpperCase()}-${model.replace(/[^A-Za-z0-9]/g, "").substring(0, 6).toUpperCase()}`
          : undefined);

      const suggestedName =
        parsed.suggested_name?.trim() ||
        (brand && model ? `${brand} ${model}`.trim() : undefined);

      return {
        brand,
        model,
        serial_number: serialNumbers[0] || serialNumber,
        serial_numbers: serialNumbers,
        quantity: serialNumbers.length || 1,
        pon_sn: isSheet ? undefined : ponSn,
        mac_address: macAddress,
        suggested_sku: suggestedSku,
        suggested_name: suggestedName,
        category: parsed.category || "Equipos Activos",
        unit: parsed.unit || "unidades",
        is_serialized: parsed.is_serialized ?? true,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : isSheet ? 0.9 : 0.98,
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

  // 2. Hoja de seriales o texto crudo
  const sheetSerials = collectSheetSerials(
    { raw_text: reason, serial_numbers: detectedBarcodes },
    reason,
    detectedBarcodes
  );
  if (!serial && sheetSerials[0]) serial = sheetSerials[0];

  if (reason) {
    const extracted = extractMacAndSerialFromText(reason);
    if (!serial && extracted.serial) serial = extracted.serial;
    if (!mac && extracted.mac) mac = extracted.mac;
    if (!ponSn && extracted.ponSn) ponSn = extracted.ponSn;
  }

  const serialNumbers = sheetSerials.length > 0 ? sheetSerials : serial ? [serial] : [];
  const isSheet = serialNumbers.length > 1;

  return {
    brand: isSheet ? undefined : "Equipo Detectado",
    model: "",
    serial_number: serialNumbers[0] || serial,
    serial_numbers: serialNumbers,
    quantity: serialNumbers.length || 1,
    pon_sn: isSheet ? undefined : ponSn,
    mac_address: isSheet ? undefined : mac,
    suggested_sku: !isSheet && serial ? `EQ-${serial.substring(0, 6)}` : undefined,
    suggested_name: isSheet ? undefined : "Equipo de Telecomunicaciones",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    confidence: serialNumbers.length > 1 ? 0.85 : serial ? 0.7 : 0.0,
    raw_text: reason,
    detected_barcodes: detectedBarcodes,
  };
};

const HARDWARE_SERIAL = /^[A-Z]{1,6}\d{6,16}$/i;
const MAX_SHEET_SPAN = 80;

const isHardwareSerial = (value: string): boolean => {
  const cleaned = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (!HARDWARE_SERIAL.test(cleaned)) return false;
  if (isLikelyMac(cleaned)) return false;
  if (/^(XPON|GPON|EPON)/i.test(cleaned)) return false;
  return true;
};

const normalizeHardwareSerial = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const cleaned = cleanSerial(value)?.replace(/\s+/g, "").toUpperCase();
  if (!cleaned || !isHardwareSerial(cleaned)) return undefined;
  return cleaned;
};

const expandSerialRange = (startRaw: string, endRaw: string): string[] | null => {
  const start = normalizeHardwareSerial(startRaw);
  const end = normalizeHardwareSerial(endRaw);
  if (!start || !end) return null;

  const startMatch = start.match(/^([A-Z]+)(\d+)$/i);
  const endMatch = end.match(/^([A-Z]+)(\d+)$/i);
  if (!startMatch || !endMatch) return null;
  if (startMatch[1].toUpperCase() !== endMatch[1].toUpperCase()) return null;
  if (startMatch[2].length !== endMatch[2].length) return null;

  const prefix = startMatch[1].toUpperCase();
  const width = startMatch[2].length;
  const from = Number(startMatch[2]);
  const to = Number(endMatch[2]);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;

  const low = Math.min(from, to);
  const high = Math.max(from, to);
  if (high - low < 1 || high - low > MAX_SHEET_SPAN) return null;

  const series: string[] = [];
  for (let n = low; n <= high; n += 1) {
    series.push(`${prefix}${String(n).padStart(width, "0")}`);
  }
  return series;
};

const sortSerials = (list: string[]): string[] => {
  return [...new Set(list)].sort((a, b) => {
    const aMatch = a.match(/^([A-Z]+)(\d+)$/i);
    const bMatch = b.match(/^([A-Z]+)(\d+)$/i);
    if (aMatch && bMatch && aMatch[1].toUpperCase() === bMatch[1].toUpperCase()) {
      return Number(aMatch[2]) - Number(bMatch[2]);
    }
    return a.localeCompare(b);
  });
};

/**
 * Une los seriales leídos por la IA, los códigos del sensor y el rango
 * impreso en la hoja de la caja (SN: INICIO -- FIN).
 */
const collectSheetSerials = (
  parsed: any,
  rawText: string,
  detectedBarcodes: string[]
): string[] => {
  const explicit = new Set<string>();
  const push = (value?: string | null) => {
    const serial = normalizeHardwareSerial(value);
    if (serial) explicit.add(serial);
  };

  if (Array.isArray(parsed?.serial_numbers)) {
    parsed.serial_numbers.forEach((value: string) => push(value));
  }
  push(parsed?.serial_number);
  detectedBarcodes.forEach((code) => push(code));

  const transcript = `${rawText || ""}\n${parsed?.raw_text || ""}`;
  const tokenPattern = /\b([A-Za-z]{1,6}\d{6,16})\b/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(transcript))) {
    push(tokenMatch[1]);
  }

  const ranges: Array<{ start: string; end: string }> = [];
  if (parsed?.serial_range_start && parsed?.serial_range_end) {
    ranges.push({
      start: String(parsed.serial_range_start),
      end: String(parsed.serial_range_end),
    });
  }
  const rangePattern = /\b([A-Za-z]{1,6}\d{6,16})\s*(?:--|—|–|-|~)\s*([A-Za-z]{1,6}\d{6,16})\b/g;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangePattern.exec(transcript))) {
    ranges.push({ start: rangeMatch[1], end: rangeMatch[2] });
  }

  let bestRange: string[] | null = null;
  for (const range of ranges) {
    const series = expandSerialRange(range.start, range.end);
    if (series && (!bestRange || series.length > bestRange.length)) {
      bestRange = series;
    }
  }

  if (bestRange) {
    return bestRange;
  }

  return sortSerials([...explicit]);
};
