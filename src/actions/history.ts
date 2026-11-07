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

let demoMovements: StockMovementWithDetails[] = [
  {
    id: "mov-001",
    document_id: "doc-con-01",
    document_line_id: "con-l-01",
    item_id: "i0000000-0000-0000-0000-000000000001",
    location_id: "l0000000-0000-0000-0000-000000000010",
    serial_unit_id: null,
    quantity: -85,
    movement_type: "consumption",
    created_by: "u0000000-0000-0000-0000-000000000004",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    item_name: "Cable Fibra Óptica Drop 1 Hilo G.657A2",
    item_sku: "FIB-DRP-001",
    item_unit: "metros",
    location_name: "Cuadrilla 01 FTTH Maracaibo Norte",
    doc_number: "CON-MAR-000042",
    creator_name: "José Pirela",
  },
  {
    id: "mov-002",
    document_id: "doc-con-01",
    document_line_id: "con-l-02",
    item_id: "i0000000-0000-0000-0000-000000000008",
    location_id: "l0000000-0000-0000-0000-000000000010",
    serial_unit_id: null,
    quantity: -2,
    movement_type: "consumption",
    created_by: "u0000000-0000-0000-0000-000000000004",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    item_name: "Conector Rápido SC/APC Monomodo",
    item_sku: "CON-RAP-SCAPC",
    item_unit: "unidades",
    location_name: "Cuadrilla 01 FTTH Maracaibo Norte",
    doc_number: "CON-MAR-000042",
    creator_name: "José Pirela",
  },
  {
    id: "mov-003",
    document_id: "d0000000-0000-0000-0000-000000000099",
    document_line_id: "dl-001",
    item_id: "i0000000-0000-0000-0000-000000000004",
    location_id: "l0000000-0000-0000-0000-000000000001",
    serial_unit_id: null,
    quantity: -20,
    movement_type: "transfer_out",
    created_by: "u0000000-0000-0000-0000-000000000001",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    item_name: "ONU GPON Huawei EchoLife HG8310M",
    item_sku: "ONU-HUA-8310",
    item_unit: "unidades",
    location_name: "Almacén Central Caracas",
    doc_number: "TRF-CCS-000014",
    creator_name: "Carlos Mendoza",
  },
  {
    id: "mov-004",
    document_id: "d0000000-0000-0000-0000-000000000001",
    document_line_id: "e0000000-0000-0000-0000-000000000001",
    item_id: "i0000000-0000-0000-0000-000000000001",
    location_id: "l0000000-0000-0000-0000-000000000002",
    serial_unit_id: null,
    quantity: 3500,
    movement_type: "purchase",
    created_by: "u0000000-0000-0000-0000-000000000002",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    item_name: "Cable Fibra Óptica Drop 1 Hilo G.657A2",
    item_sku: "FIB-DRP-001",
    item_unit: "metros",
    location_name: "Almacén Principal Maracaibo",
    doc_number: "COM-MAR-000001",
    creator_name: "Mariana Rivas",
  },
];

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
