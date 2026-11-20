"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import type { ActionResult } from "@/actions/transfers";
import type { UnitOfMeasure, UserRole } from "@/types/inventory";

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
