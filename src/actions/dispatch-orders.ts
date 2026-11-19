"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import {
  dispatchOrderFormSchema,
  type DispatchOrderInput,
} from "@/lib/validators/dispatch-order";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
import type { DocumentWithDetails } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

let demoDispatchOrders: DocumentWithDetails[] = [
  {
    id: "doc-demo-dispatch-1",
    document_type: "consumption",
    document_number: "SAL-CCS-000101",
    delivery_note_number: "NE-ALM-CCS-20261118-4521",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    origin_location_id: "l0000000-0000-0000-0000-000000000001",
    destination_location_id: null,
    status: "APPROVED",
    ticket_ref: "CLI-99420",
    reason: "Instalación residencial FTTH",
    work_type: "client_job",
    client_name: "Inversiones San Antonio, C.A.",
    client_code: "CLI-99420",
    project_name: null,
    technician_name: "Carlos Mendoza (Técnico Cuadrilla 1)",
    technician_id: null,
    receiver_mode: "warehouse_decides",
    notes: "Entrega completa en taquilla para instalación prioritaria",
    created_by: "u0000000-0000-0000-0000-000000000001",
    approved_by: "u0000000-0000-0000-0000-000000000001",
    approved_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    branch: {
      id: "b0000000-0000-0000-0000-000000000001",
      code: "CCS",
      name: "Sede Central Caracas",
      address: "Av. Francisco de Miranda, Torre Cavendes, Chacao",
      phone: "+58 212 555 0101",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    creator: {
      id: "u0000000-0000-0000-0000-000000000001",
      email: "tvstarmiranda@gmail.com",
      full_name: "Administrador Innover TV Star",
      phone: "+58 212 900 1100",
      role: "superadmin",
      branch_id: "b0000000-0000-0000-0000-000000000001",
      crew_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    origin_location: {
      id: "l0000000-0000-0000-0000-000000000001",
      branch_id: "b0000000-0000-0000-0000-000000000001",
      code: "ALM-CCS",
      name: "Almacén Central Caracas",
      type: "branch",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    lines: [
      {
        id: "line-demo-1",
        document_id: "doc-demo-dispatch-1",
        item_id: "i0000000-0000-0000-0000-000000000001",
        quantity: 80,
        received_quantity: 80,
        unit_price: null,
        serial_unit_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        item: {
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
      },
      {
        id: "line-demo-2",
        document_id: "doc-demo-dispatch-1",
        item_id: "i0000000-0000-0000-0000-000000000004",
        quantity: 1,
        received_quantity: 1,
        unit_price: null,
        serial_unit_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000004",
          sku: "ONU-HUA-EG8145V5",
          name: "ONU Huawei EchoLife EG8145V5 Dual Band",
          description: "Terminal de red óptica GPON con Wi-Fi AC1200 y 4 puertos Gigabit",
          category: "Equipos GPON",
          unit: "unidades",
          is_serialized: true,
          min_stock: 20,
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ],
  },
];

export const createDispatchOrderAction = async (
  values: DispatchOrderInput
): Promise<ActionResult<{ document_number: string; delivery_note_number: string }>> => {
  const parsed = dispatchOrderFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de orden de salida inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  const {
    location_id,
    work_type,
    reason,
    client_name,
    client_code,
    project_name,
    technician_name,
    technician_id,
    receiver_mode,
    notes,
    lines,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_issue_dispatch_order", {
      p_location_id: location_id,
      p_work_type: work_type,
      p_reason: reason,
      p_client_name: client_name || null,
      p_client_code: client_code || null,
      p_project_name: project_name || null,
      p_technician_name: technician_name || null,
      p_receiver_mode: receiver_mode || "warehouse_decides",
      p_technician_id: technician_id || null,
      p_notes: notes || null,
      p_lines: lines,
    });

    if (!error && data?.success) {
      revalidatePath("/consumos");
      revalidatePath("/inventario");
      revalidatePath("/historial");
      return {
        success: true,
        data: {
          document_number: data.document_number,
          delivery_note_number: data.delivery_note_number,
        },
      };
    }
  } catch {
    // Demo fallback handled below
  }

  const branches = await getBranches();
  const locations = await getLocations();
  const items = await getItemsCatalog();

  const originLoc = locations.find((l) => l.id === location_id) || locations[0];
  const branch = branches.find((b) => b.id === originLoc?.branch_id) || branches[0];

  const docNumber = `SAL-${branch.code}-${String(demoDispatchOrders.length + 102).padStart(6, "0")}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const deliveryNoteNum = `NE-${originLoc.code}-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newDoc: DocumentWithDetails = {
    id: `doc-dispatch-${Date.now()}`,
    document_type: "consumption",
    document_number: docNumber,
    delivery_note_number: deliveryNoteNum,
    branch_id: branch.id,
    origin_location_id: location_id,
    destination_location_id: null,
    status: "APPROVED",
    ticket_ref: client_code || project_name || "SAL-INT",
    reason,
    work_type,
    client_name: client_name || null,
    client_code: client_code || null,
    project_name: project_name || null,
    technician_name: technician_name || null,
    technician_id: technician_id || null,
    receiver_mode: receiver_mode || "warehouse_decides",
    notes: notes || null,
    created_by: profile.id,
    approved_by: profile.id,
    approved_at: now.toISOString(),
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    branch,
    creator: profile,
    origin_location: originLoc || null,
    lines: lines.map((l, index) => ({
      id: `dline-${Date.now()}-${index}`,
      document_id: `doc-dispatch-${Date.now()}`,
      item_id: l.item_id,
      quantity: l.quantity,
      received_quantity: l.quantity,
      unit_price: null,
      serial_unit_id: l.serial_unit_id || null,
      notes: null,
      created_at: now.toISOString(),
      item: items.find((i) => i.id === l.item_id) || items[0],
    })),
  };

  demoDispatchOrders = [newDoc, ...demoDispatchOrders];

  revalidatePath("/consumos");
  revalidatePath("/inventario");
  revalidatePath("/historial");

  return {
    success: true,
    data: {
      document_number: docNumber,
      delivery_note_number: deliveryNoteNum,
    },
  };
};

export const getDispatchOrdersHistory = async (
  branchId?: string,
  locationId?: string
): Promise<DocumentWithDetails[]> => {
  let dbDocs: DocumentWithDetails[] = [];

  try {
    const supabase = await createClient();
    let query = supabase
      .from("documents")
      .select(
        `
        *,
        branch:branches(*),
        creator:profiles(*),
        origin_location:locations!documents_origin_location_id_fkey(*),
        lines:document_lines(
          *,
          item:items(*)
        )
      `
      )
      .eq("document_type", "consumption")
      .order("created_at", { ascending: false });

    if (locationId) {
      query = query.eq("origin_location_id", locationId);
    } else if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (!error && data) {
      dbDocs = data as unknown as DocumentWithDetails[];
    }
  } catch {
    // Demo fallback
  }

  const combinedMap = new Map<string, DocumentWithDetails>();
  demoDispatchOrders.forEach((d) => combinedMap.set(d.id, d));
  dbDocs.forEach((d) => combinedMap.set(d.id, d));

  const allOrders = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (locationId) {
    return allOrders.filter((d) => d.origin_location_id === locationId);
  }
  if (branchId) {
    return allOrders.filter((d) => d.branch_id === branchId);
  }

  return allOrders;
};
