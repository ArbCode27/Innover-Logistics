import { NextRequest, NextResponse } from "next/server";
import { analyzeImageWithGroq } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { checkSerialAndMacDuplicate, saveLatestCapture } from "@/actions/scan";
import type { ExtractedLabelData, ScanAnalyzeResponse } from "@/types/scan";

export const runtime = "nodejs";

export const POST = async (request: NextRequest): Promise<NextResponse<ScanAnalyzeResponse>> => {
  try {
    const body = await request.json();
    const { sessionId, image, previewUrl, barcodes = [] } = body;

    if (!sessionId || !image) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros requeridos (sessionId o image)" },
        { status: 400 }
      );
    }

    // 1. Análisis de visión por IA con Groq
    const extractedData: ExtractedLabelData = await analyzeImageWithGroq(
      image,
      barcodes
    );

    // 2. Comprobación contra el catálogo existente en Supabase
    try {
      const supabase = await createClient();
      let matchedItem: any = null;

      // 2a. Intento 1: Coincidencia por SKU
      if (extractedData.suggested_sku && extractedData.suggested_sku.length >= 3) {
        const { data: bySku } = await supabase
          .from("items")
          .select("*")
          .eq("is_active", true)
          .ilike("sku", `%${extractedData.suggested_sku}%`)
          .limit(1);

        if (bySku && (bySku as any[]).length > 0) {
          matchedItem = (bySku as any[])[0];
        }
      }

      // 2b. Intento 2: Coincidencia por nombre sugerido (ej. "ONU Lanly doble banda")
      if (!matchedItem && extractedData.suggested_name && extractedData.suggested_name.trim().length >= 3) {
        const { data: byName } = await supabase
          .from("items")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${extractedData.suggested_name.trim()}%`)
          .limit(1);

        if (byName && (byName as any[]).length > 0) {
          matchedItem = (byName as any[])[0];
        }
      }

      // 2c. Intento 3: Coincidencia por modelo en el nombre si no hubo coincidencia por SKU
      if (!matchedItem && extractedData.model && extractedData.model.trim().length >= 3) {
        const { data: byModel } = await supabase
          .from("items")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${extractedData.model.trim()}%`)
          .limit(1);

        if (byModel && (byModel as any[]).length > 0) {
          matchedItem = (byModel as any[])[0];
        }
      }

      if (matchedItem) {
        extractedData.matched_item_id = matchedItem.id;
        extractedData.is_new_catalog_item = false;
        extractedData.suggested_name = matchedItem.name;
        extractedData.suggested_sku = matchedItem.sku;
        extractedData.category = matchedItem.category;

        const serialsToCheck = (
          extractedData.serial_numbers?.length
            ? extractedData.serial_numbers
            : extractedData.serial_number
              ? [extractedData.serial_number]
              : []
        ).map((serial) => serial.trim().toUpperCase());

        if (serialsToCheck.length > 0) {
          const duplicateFlags = await Promise.all(
            serialsToCheck.map(async (serial) => {
              const dupCheck = await checkSerialAndMacDuplicate(
                matchedItem.id,
                serial,
                serialsToCheck.length === 1 ? extractedData.mac_address : undefined
              );
              return dupCheck.isSerialDuplicate || dupCheck.isMacDuplicate ? serial : null;
            })
          );

          const duplicates = duplicateFlags.filter((serial): serial is string => Boolean(serial));
          if (duplicates.length > 0) {
            extractedData.duplicate_serials = duplicates;
            extractedData.is_duplicate_serial = true;
          }
        }
      } else {
        // No se encontró coincidencia: Es un producto nuevo en catálogo
        extractedData.is_new_catalog_item = true;
      }
    } catch (dbErr) {
      console.warn("[Analyze Route] Aviso en validación DB:", dbErr);
    }

    // 3. Guardar la captura para sincronización inmediata con la PC
    const captureImageToStore = previewUrl || (image.length > 100000 ? image.substring(0, 100000) : image);
    await saveLatestCapture(sessionId, captureImageToStore, extractedData);

    return NextResponse.json({
      success: true,
      data: extractedData,
      imageUrl: captureImageToStore,
    });
  } catch (error: any) {
    console.error("[Analyze Route] Error general:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la captura" },
      { status: 500 }
    );
  }
};
