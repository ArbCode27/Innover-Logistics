import { NextRequest, NextResponse } from "next/server";
import { analyzeImageWithGroq } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { checkSerialAndMacDuplicate, saveLatestCapture } from "@/actions/scan";
import type { ExtractedLabelData, ScanAnalyzeResponse } from "@/types/scan";

export const runtime = "nodejs";

export const POST = async (request: NextRequest): Promise<NextResponse<ScanAnalyzeResponse>> => {
  try {
    const body = await request.json();
    const { sessionId, image, barcodes = [] } = body;

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

      // Búsqueda inteligente por SKU propuesto o por modelo
      let query = supabase.from("items").select("*").eq("is_active", true);

      if (extractedData.suggested_sku) {
        query = query.or(
          `sku.ilike.%${extractedData.suggested_sku}%,name.ilike.%${extractedData.model || ""}%`
        );
      } else if (extractedData.model) {
        query = query.ilike("name", `%${extractedData.model}%`);
      }

      const { data: matchedItems } = await (query as any).limit(1);

      if (matchedItems && (matchedItems as any[]).length > 0) {
        const item = (matchedItems as any[])[0];
        extractedData.matched_item_id = item.id;
        extractedData.is_new_catalog_item = false;
        extractedData.suggested_name = item.name;
        extractedData.suggested_sku = item.sku;
        extractedData.category = item.category;

        // Comprobación de duplicados de Serial y MAC si el producto ya existe
        if (extractedData.serial_number) {
          const dupCheck = await checkSerialAndMacDuplicate(
            item.id,
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
    await saveLatestCapture(sessionId, image, extractedData);

    return NextResponse.json({
      success: true,
      data: extractedData,
      imageUrl: image,
    });
  } catch (error: any) {
    console.error("[Analyze Route] Error general:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la captura" },
      { status: 500 }
    );
  }
};
