"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import {
  technicianFormSchema,
  type TechnicianFormInput,
} from "@/lib/validators/technician";
import type { ActionResult } from "@/actions/transfers";
import type { Technician } from "@/types/inventory";

const canManageTechnicians = (role: string | undefined): boolean =>
  role === "superadmin" || role === "admin_sucursal";

export const getTechnicians = async (options?: {
  branchId?: string;
  activeOnly?: boolean;
}): Promise<Technician[]> => {
  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase.from("technicians").select("*").order("full_name");

    if (options?.branchId) {
      query = query.eq("branch_id", options.branchId);
    }
    if (options?.activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener técnicos:", error.message || error);
      return [];
    }

    return (data || []) as Technician[];
  } catch (err) {
    console.error("Excepción en getTechnicians:", err);
    return [];
  }
};

export const saveTechnicianAction = async (
  values: TechnicianFormInput,
  technicianId?: string
): Promise<ActionResult<{ id: string }>> => {
  const parsed = technicianFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos del técnico inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!canManageTechnicians(profile?.role)) {
    return {
      success: false,
      error: "Solo el encargado de almacén o el administrador general pueden registrar técnicos.",
    };
  }

  const branchId =
    profile?.role === "admin_sucursal"
      ? profile.branch_id
      : parsed.data.branch_id;

  if (!branchId) {
    return {
      success: false,
      error: "Seleccione la sede del técnico.",
    };
  }

  if (
    profile?.role === "admin_sucursal" &&
    parsed.data.branch_id !== profile.branch_id
  ) {
    return {
      success: false,
      error: "Solo puede registrar técnicos de su sede.",
    };
  }

  const payload = {
    full_name: parsed.data.full_name.trim(),
    document_id: parsed.data.document_id.trim(),
    phone: parsed.data.phone?.trim() || null,
    branch_id: branchId,
    is_active: parsed.data.is_active,
  };

  try {
    const adminSupabase = createAdminClient();
    const query = technicianId
      ? adminSupabase.from("technicians").update(payload).eq("id", technicianId).select("id").single()
      : adminSupabase.from("technicians").insert(payload).select("id").single();

    const { data, error } = await query;
    if (error || !data) {
      return { success: false, error: formatDatabaseError(error) };
    }

    revalidatePath("/tecnicos");
    revalidatePath("/consumos");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
};

export const setTechnicianActiveAction = async (
  technicianId: string,
  isActive: boolean
): Promise<ActionResult<void>> => {
  const profile = await getCurrentProfile();
  if (!canManageTechnicians(profile?.role)) {
    return {
      success: false,
      error: "Solo el encargado de almacén o el administrador general pueden registrar técnicos.",
    };
  }

  try {
    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("technicians")
      .update({ is_active: isActive })
      .eq("id", technicianId);

    if (profile?.role === "admin_sucursal" && profile.branch_id) {
      query = query.eq("branch_id", profile.branch_id);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: formatDatabaseError(error) };
    }

    revalidatePath("/tecnicos");
    revalidatePath("/consumos");
    return { success: true };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
};
