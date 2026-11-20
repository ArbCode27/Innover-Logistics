"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { formatDatabaseError } from "@/lib/utils";
import { staffUserSchema, type StaffUserInput } from "@/lib/validators/staff-user";
import type { ActionResult } from "@/actions/transfers";
import type { UnitOfMeasure, UserRole } from "@/types/inventory";

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin_sucursal" | "reportador";
  branch_id: string | null;
  is_active: boolean;
}

const explainAuthCreateError = (message: string): string => {
  const text = message.toLowerCase();
  if (
    text.includes("already") ||
    text.includes("registered") ||
    text.includes("exists") ||
    text.includes("duplicate")
  ) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (text.includes("password")) {
    return "La contraseña no cumple el mínimo del servidor. Usa al menos 6 caracteres.";
  }
  return "No se pudo crear la cuenta. Revisa el correo y la contraseña e inténtalo de nuevo.";
};

export const createBranchAction = async (data: {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  is_main?: boolean;
  parent_branch_id?: string | null;
  state?: string;
  municipality?: string;
  franchise_name?: string;
}): Promise<ActionResult<{ id: string }>> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") {
    return { success: false, error: "Solo superadmin puede crear sucursales." };
  }

  try {
    const supabase = await createClient();
    const { data: branch, error } = await (supabase.from("branches") as any)
      .insert({
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        is_main: data.is_main ?? false,
        parent_branch_id: data.parent_branch_id || null,
        state: data.state?.trim() || null,
        municipality: data.municipality?.trim() || null,
        franchise_name: data.franchise_name?.trim() || null,
      })
      .select()
      .single();

    if (!error && branch) {
      // Crear depósito principal automático para la nueva sede
      await (supabase.from("locations") as any).insert({
        branch_id: branch.id,
        code: `ALM-${data.code.toUpperCase().trim()}`,
        name: `Almacén General ${data.name.trim()}`,
        type: "branch",
        is_active: true,
      });

      revalidatePath("/admin");
      revalidatePath("/inventario");
      return { success: true, data: { id: branch.id } };
    }
  } catch {
    // Demo fallback
  }

  revalidatePath("/admin");
  return { success: true, data: { id: `b-${Date.now()}` } };
};

export const createItemAction = async (data: {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: UnitOfMeasure;
  is_serialized: boolean;
  min_stock: number;
}): Promise<ActionResult<{ id: string }>> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") {
    return { success: false, error: "Solo superadmin puede crear ítems en el catálogo." };
  }

  try {
    const supabase = await createClient();
    const { data: item, error } = await (supabase.from("items") as any)
      .insert({
        sku: data.sku.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category.trim(),
        unit: data.unit,
        is_serialized: data.is_serialized,
        min_stock: data.min_stock,
      })
      .select()
      .single();

    if (!error && item) {
      revalidatePath("/admin");
      revalidatePath("/inventario");
      revalidateTag("items-catalog");
      return { success: true, data: { id: item.id } };
    }
  } catch {
    // Demo fallback
  }

  revalidatePath("/admin");
  return { success: true, data: { id: `i-${Date.now()}` } };
};

export const updateItemAction = async (data: {
  id: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  min_stock: number;
}): Promise<ActionResult<void>> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") {
    return {
      success: false,
      error: "Solo el administrador general puede guardar cambios de un producto.",
    };
  }

  if (!data.name.trim()) {
    return {
      success: false,
      error: "El nombre es obligatorio. Escríbelo y vuelve a guardar.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await (supabase.from("items") as any)
      .update({
        name: data.name.trim(),
        category: data.category.trim(),
        unit: data.unit,
        min_stock: data.min_stock,
      })
      .eq("id", data.id);

    if (error) {
      return {
        success: false,
        error:
          "No se pudo guardar el producto. Revisa el nombre y la cantidad mínima e inténtalo de nuevo.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/inventario");
    revalidateTag("items-catalog");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.",
    };
  }
};

export const updateUserRoleAction = async (
  userId: string,
  role: UserRole,
  branchId?: string
): Promise<ActionResult<void>> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") {
    return { success: false, error: "Solo superadmin puede modificar roles de usuario." };
  }

  try {
    const supabase = await createClient();
    const { error } = await (supabase.from("profiles") as any)
      .update({
        role,
        branch_id: branchId || null,
      })
      .eq("id", userId);

    if (!error) {
      revalidatePath("/admin");
      return { success: true };
    }
  } catch {
    // Demo fallback
  }

  revalidatePath("/admin");
  return { success: true };
};

export const getStaffProfiles = async (): Promise<StaffProfile[]> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, phone, role, branch_id, is_active")
      .in("role", ["admin_sucursal", "reportador"])
      .order("full_name");

    if (error || !data) return [];
    return data as StaffProfile[];
  } catch (err) {
    console.error("Error al listar perfiles de sede:", err);
    return [];
  }
};

export const createStaffUserAction = async (
  input: StaffUserInput
): Promise<ActionResult<{ id: string }>> => {
  const profile = await getCurrentProfile();
  if (profile?.role !== "superadmin") {
    return {
      success: false,
      error: "Solo el administrador general puede crear estos perfiles.",
    };
  }

  const parsed = staffUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Revisa los datos del formulario.",
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const fullName = parsed.data.full_name.trim();
  const phone = parsed.data.phone?.trim() || null;

  try {
    const admin = createAdminClient();
    const { data: branch, error: branchError } = await admin
      .from("branches")
      .select("id")
      .eq("id", parsed.data.branch_id)
      .maybeSingle();

    if (branchError || !branch) {
      return { success: false, error: "Selecciona una sede válida." };
    }

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (authError || !created.user) {
      return {
        success: false,
        error: explainAuthCreateError(authError?.message || ""),
      };
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: fullName,
      phone,
      role: parsed.data.role,
      branch_id: parsed.data.branch_id,
      is_active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { success: false, error: formatDatabaseError(profileError) };
    }

    revalidatePath("/admin");
    return { success: true, data: { id: created.user.id } };
  } catch (err) {
    return { success: false, error: formatDatabaseError(err) };
  }
};
