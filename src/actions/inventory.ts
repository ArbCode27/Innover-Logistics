"use server";

import { cache } from "react";
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
    // Fall back to seed demo stock
  }

  // Demo dynamic values
  const defaultBalances: Record<string, number> = {
    "i0000000-0000-0000-0000-000000000001": 3500, // 3500m drop
    "i0000000-0000-0000-0000-000000000002": 8, // 8 bobinas
    "i0000000-0000-0000-0000-000000000004": 50, // 50 ONUs
    "i0000000-0000-0000-0000-000000000005": 30, // 30 Routers
    "i0000000-0000-0000-0000-000000000007": 450, // 450 tensores
    "i0000000-0000-0000-0000-000000000008": 500, // 500 conectores
  };

  return items.map((item) => {
    const qty = defaultBalances[item.id] || 0;
    return {
      ...item,
      current_stock: qty,
      location_id: selectedLoc.id,
      location_name: selectedLoc.name,
      branch_name: selectedBranch.name,
      is_low_stock: qty <= Number(item.min_stock),
    };
  });
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

  // Demo fallback serial units
  return [
    {
      id: "s0000000-0000-0000-0000-000000000001",
      item_id: "i0000000-0000-0000-0000-000000000004",
      serial_number: "48575443A1B2C3D4",
      mac_address: "00:1A:2B:3C:4D:01",
      status: "in_stock",
      current_location_id: locationId || "l0000000-0000-0000-0000-000000000002",
      last_document_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item: items[2] || items[0],
      location: locations[1] || locations[0],
    },
    {
      id: "s0000000-0000-0000-0000-000000000002",
      item_id: "i0000000-0000-0000-0000-000000000004",
      serial_number: "48575443A1B2C3D5",
      mac_address: "00:1A:2B:3C:4D:02",
      status: "in_stock",
      current_location_id: locationId || "l0000000-0000-0000-0000-000000000002",
      last_document_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item: items[2] || items[0],
      location: locations[1] || locations[0],
    },
    {
      id: "s0000000-0000-0000-0000-000000000006",
      item_id: "i0000000-0000-0000-0000-000000000005",
      serial_number: "ZTEGC98811223344",
      mac_address: "E8:65:D4:11:22:33",
      status: "in_stock",
      current_location_id: locationId || "l0000000-0000-0000-0000-000000000002",
      last_document_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item: items[3] || items[0],
      location: locations[1] || locations[0],
    },
  ];
};
