"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import type { ActionResult } from "@/actions/transfers";
import type { DocumentWithDetails, StockMovement } from "@/types/inventory";

export interface StockMovementWithDetails extends StockMovement {
  item_name: string;
  item_sku: string;
  item_unit: string;
  location_name: string;
  doc_number: string;
  creator_name: string;
}

export const getMovementsLedger = async (
  locationId?: string
): Promise<StockMovementWithDetails[]> => {
  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("stock_movements")
      .select(
        `
        id,
        document_id,
        item_id,
        location_id,
        quantity,
        movement_type,
        created_at,
        item:items(name, sku, unit),
        location:locations(name),
        document:documents(document_number),
        creator:profiles(full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener movimientos del libro contable:", error.message || error);
      return [];
    }

    return (data || []).map((m: any) => ({
      ...m,
      item_name: m.item?.name || "Material",
      item_sku: m.item?.sku || "SKU",
      item_unit: m.item?.unit || "unidades",
      location_name: m.location?.name || "Ubicación",
      doc_number: m.document?.document_number || "DOC-S/N",
      creator_name: m.creator?.full_name || "Sistema",
    }));
  } catch (err) {
    console.error("Excepción en getMovementsLedger:", err);
    return [];
  }
};

export const voidDocumentAction = async (
  documentId: string,
  cancellationReason: string
): Promise<ActionResult<{ status: string }>> => {
  if (!cancellationReason || cancellationReason.trim().length === 0) {
    return { success: false, error: "El motivo de anulación es obligatorio." };
  }

  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Usuario no autenticado" };

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_void_document", {
      p_document_id: documentId,
      p_cancellation_reason: cancellationReason.trim(),
    });

    if (error) {
      return {
        success: false,
        error: formatDatabaseError(error),
      };
    }

    revalidatePath("/historial");
    revalidatePath("/inventario");
    return { success: true, data: { status: data?.status || "CANCELLED" } };
  } catch (err: any) {
    return {
      success: false,
      error: formatDatabaseError(err),
    };
  }
};

export const getDocumentVoucherDetails = async (
  documentId: string
): Promise<DocumentWithDetails | null> => {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("documents")
      .select(
        `
        *,
        branch:branches(*),
        creator:profiles!documents_created_by_fkey(*),
        origin_location:locations!documents_origin_location_id_fkey(*),
        destination_location:locations!documents_destination_location_id_fkey(*),
        lines:document_lines(
          *,
          item:items(*),
          serial_unit:serial_units(*)
        )
      `
      )
      .eq("id", documentId)
      .single();

    if (error) {
      console.error("Error al obtener detalle del comprobante:", error.message || error);
      return null;
    }

    return (data || null) as unknown as DocumentWithDetails | null;
  } catch (err) {
    console.error("Excepción en getDocumentVoucherDetails:", err);
    return null;
  }
};
