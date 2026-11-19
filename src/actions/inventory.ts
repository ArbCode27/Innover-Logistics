"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import type {
  Branch,
  Item,
  Location,
  SerializedItemWithDetails,
  StockItemWithBalance,
} from "@/types/inventory";

// Mock/Initial seed fallback data for instant demo / offline reliability
const FALLBACK_BRANCHES: Branch[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    code: "CCS",
    name: "Sede Central Caracas",
    address: "Av. Francisco de Miranda, Chacao, Caracas",
    phone: "+58 212 900 1100",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    code: "MAR",
    name: "Sucursal Maracaibo",
    address: "Av. 5 de Julio con Av. 15, Maracaibo, Zulia",
    phone: "+58 261 700 2200",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    code: "VAL",
    name: "Sucursal Valencia",
    address: "Urb. El Viñedo, Valencia, Carabobo",
    phone: "+58 241 800 3300",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const FALLBACK_LOCATIONS: Location[] = [
  {
    id: "l0000000-0000-0000-0000-000000000001",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    code: "ALM-CCS",
    name: "Almacén Central Caracas",
    type: "branch",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000002",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    code: "ALM-MAR",
    name: "Almacén Principal Maracaibo",
    type: "branch",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000003",
    branch_id: "b0000000-0000-0000-0000-000000000003",
    code: "ALM-VAL",
    name: "Almacén Principal Valencia",
    type: "branch",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000010",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    code: "CD-MAR-01",
    name: "Cuadrilla 01 FTTH Maracaibo Norte",
    type: "crew",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000011",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    code: "CD-MAR-02",
    name: "Cuadrilla 02 Averías Maracaibo Sur",
    type: "crew",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000020",
    branch_id: "b0000000-0000-0000-0000-000000000003",
    code: "CD-VAL-01",
    name: "Cuadrilla 01 Valencia Centro",
    type: "crew",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "l0000000-0000-0000-0000-000000000030",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    code: "CD-CCS-01",
    name: "Cuadrilla 01 Caracas Este",
    type: "crew",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const FALLBACK_ITEMS: Item[] = [
  {
    id: "i0000000-0000-0000-0000-000000000001",
    sku: "FIB-DRP-001",
    name: "Cable Fibra Óptica Drop 1 Hilo G.657A2",
    description: "Fibra óptica drop autosoportada exterior con mensajero",
    category: "Fibra Óptica",
    unit: "metros",
    is_serialized: false,
    min_stock: 1500,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000002",
    sku: "BOB-DRP-1KM",
    name: "Bobina Drop 1 Hilo 1000m",
    description: "Bobina cerrada de cable drop para acometidas",
    category: "Fibra Óptica",
    unit: "bobinas",
    is_serialized: false,
    min_stock: 5,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000003",
    sku: "ONU-LAN-XPON",
    name: "ONU Lanly XPON Dual Band",
    description: "Terminal de red óptica ONU Lanly con soporte EPON/GPON",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    min_stock: 25,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000004",
    sku: "ONU-HUA-8310",
    name: "ONU GPON Huawei EchoLife HG8310M",
    description: "Terminal de red óptica 1GE Bridge",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    min_stock: 20,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000006",
    sku: "RTR-LAN-AX18",
    name: "Router Lanly Wi-Fi 6 AX1800 Gigabit",
    description: "Router Lanly Dual Band Gigabit con puertos GE",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    min_stock: 20,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000005",
    sku: "RTR-ZTE-F670L",
    name: "Router Wi-Fi 6 ZTE ZXHN F670L",
    description: "Gateway Dual Band Gigabit Wi-Fi 6 4 GE + 1 POTS",
    category: "Equipos Activos",
    unit: "unidades",
    is_serialized: true,
    min_stock: 15,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000009",
    sku: "FUS-FIB-S01",
    name: "Fusionadora de Fibra Óptica Núcleo a Núcleo",
    description: "Empalmadora de precisión para campo y altas",
    category: "Herramientas",
    unit: "unidades",
    is_serialized: true,
    min_stock: 2,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000010",
    sku: "OTDR-MINI-PRO",
    name: "Mini OTDR Óptico con VFL y Medidor de Potencia",
    description: "Herramienta de diagnóstico de traza óptica",
    category: "Herramientas",
    unit: "unidades",
    is_serialized: true,
    min_stock: 2,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000007",
    sku: "HER-TEN-DRP",
    name: "Tensor Tipo Gancho Abrazadera Drop",
    description: "Herraje de sujeción para postes",
    category: "Ferretería y Pasivos",
    unit: "unidades",
    is_serialized: false,
    min_stock: 300,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "i0000000-0000-0000-0000-000000000008",
    sku: "CON-RAP-SCAPC",
    name: "Conector Rápido SC/APC Monomodo",
    description: "Conector mecánico pre-pulido para armado en campo",
    category: "Ferretería y Pasivos",
    unit: "unidades",
    is_serialized: false,
    min_stock: 200,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getBranches = cache(async (): Promise<Branch[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name");
    if (!error && data && data.length > 0) return data as Branch[];
  } catch {
    // Return fallback
  }
  return FALLBACK_BRANCHES;
});

export const getLocations = cache(async (branchId?: string): Promise<Location[]> => {
  try {
    const supabase = await createClient();
    let query = supabase.from("locations").select("*").eq("is_active", true);
    if (branchId) {
      query = query.eq("branch_id", branchId);
    }
    const { data, error } = await query.order("name");
    if (!error && data && data.length > 0) return data as Location[];
  } catch {
    // Return fallback
  }
  return branchId
    ? FALLBACK_LOCATIONS.filter((l) => l.branch_id === branchId)
    : FALLBACK_LOCATIONS;
});

export const getItemsCatalog = cache(async (): Promise<Item[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (!error && data && data.length > 0) return data as Item[];
  } catch {
    // Return fallback
  }
  return FALLBACK_ITEMS;
});

export const getInventoryStock = async (
  targetLocationId?: string
): Promise<StockItemWithBalance[]> => {
  const [profile, branches, locations, items] = await Promise.all([
    getCurrentProfile(),
    getBranches(),
    getLocations(),
    getItemsCatalog(),
  ]);

  // Determine effective location
  let locationId = targetLocationId;
  if (!locationId) {
    if (profile?.crew_id) {
      locationId = profile.crew_id;
    } else if (profile?.branch_id) {
      const branchWarehouse = locations.find(
        (l) => l.branch_id === profile.branch_id && l.type === "branch"
      );
      locationId = branchWarehouse?.id || locations[0]?.id;
    } else {
      locationId = locations[0]?.id;
    }
  }

  const selectedLoc = locations.find((l) => l.id === locationId) || locations[0];
  const selectedBranch =
    branches.find((b) => b.id === selectedLoc?.branch_id) || branches[0];

  try {
    const supabase = await createClient();
    const { data: balances, error } = await supabase
      .from("stock_balances")
      .select("*")
      .eq("location_id", selectedLoc.id);

    if (!error && balances && balances.length > 0) {
      const balanceMap = new Map<string, number>();
      (balances as any[]).forEach((b) => balanceMap.set(b.item_id, Number(b.quantity)));

      return items.map((item) => {
        const qty = balanceMap.get(item.id) || 0;
        return {
          ...item,
          current_stock: qty,
          location_id: selectedLoc.id,
          location_name: selectedLoc.name,
          branch_name: selectedBranch.name,
          is_low_stock: qty <= Number(item.min_stock),
        };
      });
    }
  } catch {
    // Si falla la consulta, retornar 0 unidades en almacén
  }

  // Stock real inicial: 0 para cada item hasta registrar ingresos reales
  return items.map((item) => ({
    ...item,
    current_stock: 0,
    location_id: selectedLoc.id,
    location_name: selectedLoc.name,
    branch_name: selectedBranch.name,
    is_low_stock: Number(item.min_stock) > 0,
  }));
};

export const getSerializedUnits = async (
  locationId?: string
): Promise<SerializedItemWithDetails[]> => {
  const [items, locations] = await Promise.all([
    getItemsCatalog(),
    getLocations(),
  ]);

  try {
    const supabase = await createClient();
    let query = supabase.from("serial_units").select("*");
    if (locationId) {
      query = query.eq("current_location_id", locationId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      return (data as any[]).map((unit) => ({
        ...unit,
        item: items.find((i) => i.id === unit.item_id) || items[0],
        location: locations.find((l) => l.id === unit.current_location_id) || locations[0],
      }));
    }
  } catch {
    // Fall back
  }

  return [];
};

export const registerLocalPurchaseAction = async (input: {
  location_id: string;
  item_id: string;
  quantity: number;
  supplier_name: string;
  supplier_rif?: string;
  invoice_number?: string;
  serial_number?: string;
  mac_address?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  document_number?: string;
  error?: string;
  message?: string;
}> => {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado." };
  }

  if (!input.supplier_name || !input.supplier_name.trim()) {
    return { success: false, error: "El nombre del proveedor local es obligatorio." };
  }

  if (input.quantity <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0." };
  }

  try {
    const supabase = await createClient();
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
      "rpc_register_local_purchase",
      {
        p_location_id: input.location_id,
        p_item_id: input.item_id,
        p_quantity: input.quantity,
        p_supplier_name: input.supplier_name.trim(),
        p_supplier_rif: input.supplier_rif?.trim() || null,
        p_invoice_number: input.invoice_number?.trim() || null,
        p_serial_number: input.serial_number?.trim() || null,
        p_mac_address: input.mac_address?.trim() || null,
        p_notes: input.notes?.trim() || null,
      }
    );

    if (rpcError) {
      return { success: false, error: `Error de base de datos: ${rpcError.message}` };
    }

    const res = rpcResult as any;
    revalidatePath("/inventario");
    revalidatePath("/historial");

    return {
      success: true,
      document_number: res.document_number,
      message: `Comprobante de compra local ${res.document_number} emitido exitosamente (+${input.quantity} en stock).`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error al conectar con la base de datos para registrar la compra local",
    };
  }
};
