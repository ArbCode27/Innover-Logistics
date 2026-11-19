"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import {
  consumptionSchema,
  type ConsumptionInput,
} from "@/lib/validators/consumption";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
import type { DocumentWithDetails } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

let demoConsumptions: DocumentWithDetails[] = [];

export const consumeStockAction = async (
  values: ConsumptionInput
): Promise<ActionResult<{ document_number: string }>> => {
  const parsed = consumptionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de consumo inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  const { crew_location_id, ticket_ref, reason, lines, notes } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_consume_stock", {
      p_crew_location_id: crew_location_id,
      p_ticket_ref: ticket_ref,
      p_reason: reason,
      p_lines: lines,
      p_notes: notes || undefined,
    });

    if (!error && data) {
      revalidatePath("/consumos");
      revalidatePath("/inventario");
      revalidatePath("/historial");
      return { success: true, data: { document_number: data.document_number } };
    }
  } catch {
    // Demo fallback
  }

  const branches = await getBranches();
  const locations = await getLocations();
  const items = await getItemsCatalog();

  const crewLoc = locations.find((l) => l.id === crew_location_id);
  const branch = branches.find((b) => b.id === crewLoc?.branch_id) || branches[0];
  const docNumber = `CON-${branch.code}-${String(
    demoConsumptions.length + 43
  ).padStart(6, "0")}`;

  const newDoc: DocumentWithDetails = {
    id: `doc-${Date.now()}`,
    document_type: "consumption",
    document_number: docNumber,
    branch_id: branch.id,
    origin_location_id: crew_location_id,
    destination_location_id: null,
    status: "APPROVED",
    ticket_ref,
    reason,
    notes: notes || null,
    created_by: profile.id,
    approved_by: profile.id,
    approved_at: new Date().toISOString(),
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    branch,
    creator: profile,
    origin_location: crewLoc || null,
    lines: lines.map((l, index) => ({
      id: `cline-${Date.now()}-${index}`,
      document_id: `doc-${Date.now()}`,
      item_id: l.item_id,
      quantity: l.quantity,
      received_quantity: l.quantity,
      unit_price: null,
      serial_unit_id: l.serial_unit_id || null,
      notes: null,
      created_at: new Date().toISOString(),
      item: items.find((i) => i.id === l.item_id) || items[0],
    })),
  };

  demoConsumptions = [newDoc, ...demoConsumptions];

  revalidatePath("/consumos");
  revalidatePath("/inventario");
  revalidatePath("/historial");

  return {
    success: true,
    data: { document_number: docNumber },
  };
};

export const getConsumptionsList = async (
  branchId?: string,
  crewLocationId?: string
): Promise<DocumentWithDetails[]> => {
  let dbDocs: DocumentWithDetails[] = [];

  try {
    const supabase = await createClient();
    let query = supabase
      .from("documents")
      .select(
        `
        *,
        branch:branches(*),
        creator:profiles(*),
        origin_location:locations!documents_origin_location_id_fkey(*),
        lines:document_lines(
          *,
          item:items(*)
        )
      `
      )
      .eq("document_type", "consumption")
      .order("created_at", { ascending: false });

    if (crewLocationId) {
      query = query.eq("origin_location_id", crewLocationId);
    } else if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (!error && data) {
      dbDocs = data as unknown as DocumentWithDetails[];
    }
  } catch {
    // Demo fallback
  }

  const combinedMap = new Map<string, DocumentWithDetails>();
  demoConsumptions.forEach((d) => combinedMap.set(d.id, d));
  dbDocs.forEach((d) => combinedMap.set(d.id, d));

  const allConsumptions = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (crewLocationId) {
    return allConsumptions.filter(
      (d) => d.origin_location_id === crewLocationId
    );
  }
  if (branchId) {
    return allConsumptions.filter((d) => d.branch_id === branchId);
  }

  return allConsumptions;
};
