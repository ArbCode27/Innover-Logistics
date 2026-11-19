"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import {
  issueTransferSchema,
  acceptTransferSchema,
  type IssueTransferInput,
  type AcceptTransferInput,
} from "@/lib/validators/transfer";
import type { DocumentWithDetails } from "@/types/inventory";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const issueTransferAction = async (
  values: IssueTransferInput
): Promise<ActionResult<{ document_number: string }>> => {
  const parsed = issueTransferSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de transferencia inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  if (profile.role !== "superadmin" && profile.role !== "admin_sucursal") {
    return {
      success: false,
      error: "Solo el encargado de almacén puede emitir este traslado.",
    };
  }

  const { origin_location_id, destination_location_id, lines, notes } = parsed.data;

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_issue_transfer", {
      p_origin_location_id: origin_location_id,
      p_destination_location_id: destination_location_id,
      p_lines: lines,
      p_notes: notes || undefined,
      p_actor_id: profile.id,
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
        error: "No se recibió el número de correlativo de la guía.",
      };
    }

    revalidatePath("/guias/recepcion");
    revalidatePath("/guias/enviar");
    revalidatePath("/inventario");

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

export const acceptTransferAction = async (
  values: AcceptTransferInput
): Promise<ActionResult<{ status: string }>> => {
  const parsed = acceptTransferSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de aceptación inválidos",
    };
  }

  const { document_id, action, accepted_lines, notes } = parsed.data;

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_accept_transfer", {
      p_document_id: document_id,
      p_action: action,
      p_accepted_lines: accepted_lines || [],
      p_notes: notes || undefined,
    });

    if (error) {
      return {
        success: false,
        error: formatDatabaseError(error),
      };
    }

    revalidatePath("/guias/recepcion");
    revalidatePath("/inventario");

    return {
      success: true,
      data: { status: data?.status || (action === "ACCEPT" ? "APPROVED" : "REJECTED") },
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatDatabaseError(err),
    };
  }
};

export const getTransfersList = async (
  filterBranchId?: string
): Promise<DocumentWithDetails[]> => {
  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase
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
          item:items(*)
        )
      `
      )
      .eq("document_type", "transfer")
      .order("created_at", { ascending: false });

    if (filterBranchId) {
      query = query.or(`branch_id.eq.${filterBranchId},destination_location.branch_id.eq.${filterBranchId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener guías de traslado:", error.message || error);
      return [];
    }

    return (data || []) as unknown as DocumentWithDetails[];
  } catch (err) {
    console.error("Excepción en getTransfersList:", err);
    return [];
  }
};
