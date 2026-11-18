"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
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

let demoMovements: StockMovementWithDetails[] = [];

export const getMovementsLedger = async (
  locationId?: string
): Promise<StockMovementWithDetails[]> => {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("stock_movements")
      .select(
        `
        *,
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
    if (!error && data && data.length > 0) {
      return (data as any[]).map((m) => ({
        ...m,
        item_name: m.item?.name || "Material",
        item_sku: m.item?.sku || "SKU",
        item_unit: m.item?.unit || "unidades",
        location_name: m.location?.name || "Ubicación",
        doc_number: m.document?.document_number || "DOC-S/N",
        creator_name: m.creator?.full_name || "Sistema",
      }));
    }
  } catch {
    // Demo fallback
  }

  if (locationId) {
    return demoMovements.filter((m) => m.location_id === locationId);
  }

  return demoMovements;
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
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_void_document", {
      p_document_id: documentId,
      p_cancellation_reason: cancellationReason.trim(),
    });

    if (!error && data) {
      revalidatePath("/historial");
      revalidatePath("/inventario");
      return { success: true, data: { status: "CANCELLED" } };
    }
  } catch {
    // Demo fallback
  }

  // Create contra-asiento in demo ledger
  const originalMovs = demoMovements.filter((m) => m.document_id === documentId);
  const voidMovements: StockMovementWithDetails[] = originalMovs.map((m) => ({
    ...m,
    id: `void-${Date.now()}-${m.id}`,
    quantity: -m.quantity, // Reversed contra-asiento
    movement_type: "void",
    created_by: profile.id,
    created_at: new Date().toISOString(),
    creator_name: profile.full_name,
  }));

  demoMovements = [...voidMovements, ...demoMovements];

  revalidatePath("/historial");
  revalidatePath("/inventario");

  return { success: true, data: { status: "CANCELLED" } };
};

export const getDocumentVoucherDetails = async (
  documentId: string
): Promise<DocumentWithDetails | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        *,
        branch:branches(*),
        creator:profiles(*),
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

    if (!error && data) {
      return data as unknown as DocumentWithDetails;
    }
  } catch {
    // Demo fallback
  }

  return null;
};
