"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog } from "@/actions/inventory";
import type { ActionResult } from "@/actions/transfers";
import type { StockItemWithBalance } from "@/types/inventory";

export const assignStockToCrewAction = async (values: {
  origin_location_id: string;
  crew_location_id: string;
  lines: { item_id: string; quantity: number; serial_unit_id?: string }[];
  notes?: string;
}): Promise<ActionResult<{ document_number: string }>> => {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Usuario no autenticado" };

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (adminSupabase as any).rpc("rpc_assign_to_crew", {
      p_origin_location_id: values.origin_location_id,
      p_crew_location_id: values.crew_location_id,
      p_lines: values.lines,
      p_notes: values.notes,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Error al asignar material a la cuadrilla en base de datos",
      };
    }

    if (!data?.document_number) {
      return {
        success: false,
        error: "No se recibió el número de documento de asignación",
      };
    }

    revalidatePath("/cuadrillas");
    revalidatePath("/inventario");
    return { success: true, data: { document_number: data.document_number } };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error de conexión al asignar material a la cuadrilla",
    };
  }
};

export const createCrewLocationAction = async (data: {
  branch_id: string;
  name: string;
  code: string;
}): Promise<ActionResult<{ id: string }>> => {
  const profile = await getCurrentProfile();
  if (!profile || !["superadmin", "admin_sucursal"].includes(profile.role)) {
    return { success: false, error: "No tiene permisos para crear cuadrillas técnicas." };
  }

  const targetBranchId = profile.role === "superadmin" ? data.branch_id : profile.branch_id || data.branch_id;

  try {
    const adminSupabase = createAdminClient();
    const { data: newLoc, error } = await (adminSupabase.from("locations") as any)
      .insert({
        branch_id: targetBranchId,
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        type: "crew",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || "Error al registrar la cuadrilla en base de datos",
      };
    }

    revalidatePath("/cuadrillas");
    revalidatePath("/inventario");
    return { success: true, data: { id: newLoc.id } };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error de conexión al registrar la cuadrilla",
    };
  }
};

export const getCrewStock = async (
  crewLocationId: string
): Promise<StockItemWithBalance[]> => {
  const items = await getItemsCatalog();
  const locations = await getLocations();
  const crew = locations.find((l) => l.id === crewLocationId) || locations[0];

  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("stock_balances")
      .select("*")
      .eq("location_id", crewLocationId);

    if (!error && data) {
      const balanceMap = new Map<string, number>();
      (data as any[]).forEach((b) => balanceMap.set(b.item_id, Number(b.quantity)));

      return items.map((item) => ({
        ...item,
        current_stock: balanceMap.get(item.id) || 0,
        location_id: crew.id,
        location_name: crew.name,
        branch_name: "",
        is_low_stock: (balanceMap.get(item.id) || 0) <= Number(item.min_stock),
      }));
    }
  } catch (err) {
    console.error("Error al obtener stock de cuadrilla:", err);
  }

  return items.map((item) => ({
    ...item,
    current_stock: 0,
    location_id: crew.id,
    location_name: crew.name,
    branch_name: "",
    is_low_stock: true,
  }));
};
