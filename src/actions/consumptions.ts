"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import {
  consumptionSchema,
  type ConsumptionInput,
} from "@/lib/validators/consumption";
import type { DocumentWithDetails } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

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
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_consume_stock", {
      p_crew_location_id: crew_location_id,
      p_ticket_ref: ticket_ref,
      p_reason: reason,
      p_lines: lines,
      p_notes: notes || undefined,
    });

    if (error) {
      return {
        success: false,
        error: formatDatabaseError(error),
      };
    }

    if (!data?.document_number) {
      return {
        success: false,
        error: "No se recibió confirmación del documento de consumo.",
      };
    }

    revalidatePath("/consumos");
    revalidatePath("/inventario");
    revalidatePath("/historial");

    return {
      success: true,
      data: { document_number: data.document_number },
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatDatabaseError(err),
    };
  }
};

export const getConsumptionsList = async (
  branchId?: string,
  crewLocationId?: string
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

    if (crewLocationId) {
      query = query.eq("origin_location_id", crewLocationId);
    } else if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener lista de consumos:", error.message || error);
      return [];
    }

    return (data || []) as unknown as DocumentWithDetails[];
  } catch (err) {
    console.error("Excepción en getConsumptionsList:", err);
    return [];
  }
};
