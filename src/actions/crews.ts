"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
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
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_assign_to_crew", {
      p_origin_location_id: values.origin_location_id,
      p_crew_location_id: values.crew_location_id,
      p_lines: values.lines,
      p_notes: values.notes,
    });

    if (!error && data) {
      revalidatePath("/cuadrillas");
      revalidatePath("/inventario");
      return { success: true, data: { document_number: data.document_number } };
    }
  } catch {
    // Demo fallback
  }

  const branches = await getBranches();
  const branch = branches.find((b) => b.id === profile.branch_id) || branches[0];
  const docNumber = `ASG-${branch.code}-${String(
    Math.floor(Math.random() * 900000) + 100000
  )}`;

  revalidatePath("/cuadrillas");
  revalidatePath("/inventario");

  return {
    success: true,
    data: { document_number: docNumber },
  };
};

export const getCrewStock = async (
  crewLocationId: string
): Promise<StockItemWithBalance[]> => {
  const items = await getItemsCatalog();
  const locations = await getLocations();
  const crew = locations.find((l) => l.id === crewLocationId) || locations[0];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_balances")
      .select("*")
      .eq("location_id", crewLocationId);

    if (!error && data && data.length > 0) {
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
  } catch {
    // Demo fallback
  }

  // Demo fallback stock in crew
  const defaultCrewBalances: Record<string, number> = {
    "i0000000-0000-0000-0000-000000000001": 250, // 250m Drop
    "i0000000-0000-0000-0000-000000000004": 6, // 6 ONUs
    "i0000000-0000-0000-0000-000000000005": 3, // 3 Routers
    "i0000000-0000-0000-0000-000000000007": 35, // 35 Tensores
    "i0000000-0000-0000-0000-000000000008": 40, // 40 Conectores
  };

  return items.map((item) => {
    const qty = defaultCrewBalances[item.id] || 0;
    return {
      ...item,
      current_stock: qty,
      location_id: crew.id,
      location_name: crew.name,
      branch_name: "",
      is_low_stock: qty <= Number(item.min_stock),
    };
  });
};
