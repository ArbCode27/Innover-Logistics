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

      // 2b. Intento 2: Coincidencia por modelo en el nombre si no hubo coincidencia por SKU
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

        // Comprobación de duplicados de Serial y MAC si el producto ya existe
        if (extractedData.serial_number) {
          const dupCheck = await checkSerialAndMacDuplicate(
            matchedItem.id,
            extractedData.serial_number,
            extractedData.mac_address
          );

          if (dupCheck.isSerialDuplicate || dupCheck.isMacDuplicate) {
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
