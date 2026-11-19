"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import {
  dispatchOrderFormSchema,
  type DispatchOrderInput,
} from "@/lib/validators/dispatch-order";
import type { DocumentWithDetails } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

export const createDispatchOrderAction = async (
  values: DispatchOrderInput
): Promise<ActionResult<{ document_number: string; delivery_note_number: string }>> => {
  const parsed = dispatchOrderFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de orden de salida inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  const {
    location_id,
    work_type,
    reason,
    client_name,
    client_code,
    project_name,
    technician_name,
    technician_id,
    receiver_mode,
    notes,
    lines,
  } = parsed.data;

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_issue_dispatch_order", {
      p_location_id: location_id,
      p_work_type: work_type,
      p_reason: reason,
      p_client_name: client_name || null,
      p_client_code: client_code || null,
      p_project_name: project_name || null,
      p_technician_name: technician_name || null,
      p_receiver_mode: receiver_mode || "warehouse_decides",
      p_technician_id: technician_id || null,
      p_notes: notes || null,
      p_lines: lines,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Error al emitir orden de despacho en base de datos",
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: "No se pudo procesar la orden de despacho",
      };
    }

    revalidatePath("/consumos");
    revalidatePath("/inventario");
    revalidatePath("/historial");

    return {
      success: true,
      data: {
        document_number: data.document_number,
        delivery_note_number: data.delivery_note_number,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error de conexión al emitir orden de despacho",
    };
  }
};

export const getDispatchOrdersHistory = async (
  branchId?: string,
  locationId?: string
): Promise<DocumentWithDetails[]> => {
  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase
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

    if (locationId) {
      query = query.eq("origin_location_id", locationId);
    } else if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener historial de despachos:", error.message || error);
      return [];
    }

    return (data || []) as unknown as DocumentWithDetails[];
  } catch (err) {
    console.error("Excepción en getDispatchOrdersHistory:", err);
    return [];
  }
};
