"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import {
  materialRequestSchema,
  type MaterialRequestInput,
} from "@/lib/validators/request";
import { getBranches } from "@/actions/inventory";
import type { MaterialRequest, RequestStatus } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

export interface MaterialRequestWithDetails extends MaterialRequest {
  item_name: string;
  item_sku: string;
  item_unit: string;
  requester_name: string;
  crew_name: string;
}

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
  const branch = branches.find((b) => b.id === branch_id) || branches[0];
  const reqNumber = `SOL-${branch?.code || "REQ"}-${String(Date.now()).slice(-6)}`;

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase.from("material_requests") as any)
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

    if (error) {
      return {
        success: false,
        error: error.message || "Error al registrar la solicitud de material en base de datos",
      };
    }

    revalidatePath("/solicitudes");
    return { success: true, data: { request_number: data?.request_number || reqNumber } };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error de conexión al crear solicitud de material",
    };
  }
};

export const updateRequestStatusAction = async (
  requestId: string,
  newStatus: RequestStatus
): Promise<ActionResult<{ status: RequestStatus }>> => {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Usuario no autenticado" };

  try {
    const adminSupabase = createAdminClient();
    const { error } = await (adminSupabase.from("material_requests") as any)
      .update({
        status: newStatus,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      return {
        success: false,
        error: error.message || "Error al actualizar el estado de la solicitud",
      };
    }

    revalidatePath("/solicitudes");
    return { success: true, data: { status: newStatus } };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error de conexión al actualizar la solicitud",
    };
  }
};

export const getRequestsList = async (
  branchId?: string
): Promise<MaterialRequestWithDetails[]> => {
  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase
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
    if (error) {
      console.error("Error al obtener solicitudes:", error.message || error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      item_name: r.item?.name || "Ítem",
      item_sku: r.item?.sku || "SKU",
      item_unit: r.item?.unit || "unidades",
      requester_name: r.requester?.full_name || "Usuario",
      crew_name: r.crew?.name || "Cuadrilla",
    }));
  } catch (err) {
    console.error("Excepción en getRequestsList:", err);
    return [];
  }
};
