"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import {
  materialRequestSchema,
  type MaterialRequestInput,
} from "@/lib/validators/request";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
import type { MaterialRequest, RequestStatus } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

export interface MaterialRequestWithDetails extends MaterialRequest {
  item_name: string;
  item_sku: string;
  item_unit: string;
  requester_name: string;
  crew_name: string;
}

let demoRequests: MaterialRequestWithDetails[] = [
  {
    id: "req-001",
    request_number: "SOL-MAR-000108",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    requester_id: "u0000000-0000-0000-0000-000000000004",
    crew_location_id: "l0000000-0000-0000-0000-000000000010",
    item_id: "i0000000-0000-0000-0000-000000000004",
    quantity: 10,
    status: "REQUESTED",
    ticket_ref: "PROY-AMPL-2026",
    notes: "Se requieren ONUs para jornada de instalaciones del fin de semana",
    assigned_document_id: null,
    approved_by: null,
    approved_at: null,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    item_name: "ONU GPON Huawei EchoLife HG8310M",
    item_sku: "ONU-HUA-8310",
    item_unit: "unidades",
    requester_name: "José Pirela",
    crew_name: "Cuadrilla 01 FTTH Maracaibo Norte",
  },
  {
    id: "req-002",
    request_number: "SOL-MAR-000107",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    requester_id: "u0000000-0000-0000-0000-000000000004",
    crew_location_id: "l0000000-0000-0000-0000-000000000010",
    item_id: "i0000000-0000-0000-0000-000000000001",
    quantity: 500,
    status: "APPROVED",
    ticket_ref: "AV-44910",
    notes: "Reparación de acometidas dañadas por tormenta",
    assigned_document_id: null,
    approved_by: "u0000000-0000-0000-0000-000000000002",
    approved_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    item_name: "Cable Fibra Óptica Drop 1 Hilo G.657A2",
    item_sku: "FIB-DRP-001",
    item_unit: "metros",
    requester_name: "José Pirela",
    crew_name: "Cuadrilla 01 FTTH Maracaibo Norte",
  },
];

export const createMaterialRequestAction = async (
  values: MaterialRequestInput
): Promise<ActionResult<{ request_number: string }>> => {
  const parsed = materialRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de solicitud inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Usuario no autenticado" };

  const { branch_id, crew_location_id, item_id, quantity, ticket_ref, notes } = parsed.data;

  const branches = await getBranches();
  const locations = await getLocations();
  const items = await getItemsCatalog();

  const branch = branches.find((b) => b.id === branch_id) || branches[0];
  const item = items.find((i) => i.id === item_id) || items[0];
  const crew = locations.find((l) => l.id === crew_location_id) || locations[0];

  const reqNumber = `SOL-${branch.code}-${String(
    demoRequests.length + 109
  ).padStart(6, "0")}`;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("material_requests") as any)
      .insert({
        request_number: reqNumber,
        branch_id,
        requester_id: profile.id,
        crew_location_id,
        item_id,
        quantity,
        status: "REQUESTED",
        ticket_ref: ticket_ref || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (!error && data) {
      revalidatePath("/solicitudes");
      return { success: true, data: { request_number: reqNumber } };
    }
  } catch {
    // Demo fallback
  }

  const newReq: MaterialRequestWithDetails = {
    id: `req-${Date.now()}`,
    request_number: reqNumber,
    branch_id,
    requester_id: profile.id,
    crew_location_id,
    item_id,
    quantity,
    status: "REQUESTED",
    ticket_ref: ticket_ref || null,
    notes: notes || null,
    assigned_document_id: null,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_name: item.name,
    item_sku: item.sku,
    item_unit: item.unit,
    requester_name: profile.full_name,
    crew_name: crew.name,
  };

  demoRequests = [newReq, ...demoRequests];

  revalidatePath("/solicitudes");
  return { success: true, data: { request_number: reqNumber } };
};

export const updateRequestStatusAction = async (
  requestId: string,
  newStatus: RequestStatus
): Promise<ActionResult<{ status: RequestStatus }>> => {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Usuario no autenticado" };

  try {
    const supabase = await createClient();
    const { error } = await (supabase.from("material_requests") as any)
      .update({
        status: newStatus,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (!error) {
      revalidatePath("/solicitudes");
      return { success: true, data: { status: newStatus } };
    }
  } catch {
    // Demo fallback
  }

  demoRequests = demoRequests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          status: newStatus,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        }
      : r
  );

  revalidatePath("/solicitudes");
  return { success: true, data: { status: newStatus } };
};

export const getRequestsList = async (
  branchId?: string
): Promise<MaterialRequestWithDetails[]> => {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("material_requests")
      .select(
        `
        *,
        item:items(name, sku, unit),
        requester:profiles(full_name),
        crew:locations(name)
      `
      )
      .order("created_at", { ascending: false });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return (data as any[]).map((r) => ({
        ...r,
        item_name: r.item?.name || "Ítem",
        item_sku: r.item?.sku || "SKU",
        item_unit: r.item?.unit || "unidades",
        requester_name: r.requester?.full_name || "Usuario",
        crew_name: r.crew?.name || "Cuadrilla",
      }));
    }
  } catch {
    // Demo fallback
  }

  if (branchId) {
    return demoRequests.filter((r) => r.branch_id === branchId);
  }

  return demoRequests;
};
