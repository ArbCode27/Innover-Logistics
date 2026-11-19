"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
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

  const { origin_location_id, destination_location_id, lines, notes } = parsed.data;

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_issue_transfer", {
      p_origin_location_id: origin_location_id,
      p_destination_location_id: destination_location_id,
      p_lines: lines,
      p_notes: notes || undefined,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Error al emitir la guía de traslado en base de datos",
      };
    }

    if (!data?.document_number) {
      return {
        success: false,
        error: "No se recibió el número de correlativo de la guía",
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
      error: err?.message || "Error inesperado al conectar con el servidor de base de datos",
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
        error: error.message || "Error al procesar la guía en base de datos",
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
      error: err?.message || "Error de conexión al procesar la guía",
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
        creator:profiles(*),
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
