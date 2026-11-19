"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import {
  reviewDocumentSchema,
  type ReviewDocumentInput,
} from "@/lib/validators/technician";
import type { ActionResult } from "@/actions/transfers";
import type { DocumentWithDetails } from "@/types/inventory";

const DOCUMENT_SELECT = `
  *,
  branch:branches(*),
  creator:profiles!documents_created_by_fkey(*),
  origin_location:locations!documents_origin_location_id_fkey(*),
  destination_location:locations!documents_destination_location_id_fkey(*),
  lines:document_lines(
    *,
    item:items(*)
  )
`;

export const getPendingApprovals = async (): Promise<DocumentWithDetails[]> => {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("documents")
      .select(DOCUMENT_SELECT)
      .eq("status", "PENDING_APPROVAL")
      .in("document_type", ["consumption", "transfer"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al obtener órdenes pendientes:", error.message || error);
      return [];
    }

    return (data || []) as unknown as DocumentWithDetails[];
  } catch (err) {
    console.error("Excepción en getPendingApprovals:", err);
    return [];
  }
};

export const reviewDocumentAction = async (
  values: ReviewDocumentInput
): Promise<ActionResult<{ status: string }>> => {
  const parsed = reviewDocumentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de revisión inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }
  if (profile.role !== "superadmin") {
    return {
      success: false,
      error: "Solo el administrador general puede aprobar o rechazar esta orden.",
    };
  }

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_review_document", {
      p_document_id: parsed.data.document_id,
      p_action: parsed.data.action,
      p_actor_id: profile.id,
      p_notes: parsed.data.notes || null,
    });

    if (error) {
      return { success: false, error: formatDatabaseError(error) };
    }

    if (!data?.success) {
      return {
        success: false,
        error: "No se pudo registrar la revisión. Inténtelo de nuevo.",
      };
    }

    revalidatePath("/aprobaciones");
    revalidatePath("/consumos");
    revalidatePath("/guias/enviar");
    revalidatePath("/guias/recepcion");
    revalidatePath("/inventario");
    revalidatePath("/historial");

    return {
      success: true,
      data: { status: data.status || parsed.data.action },
    };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
};
