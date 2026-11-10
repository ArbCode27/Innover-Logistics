"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import {
  consumptionSchema,
  type ConsumptionInput,
} from "@/lib/validators/consumption";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
import type { DocumentWithDetails } from "@/types/inventory";
import type { ActionResult } from "@/actions/transfers";

let demoConsumptions: DocumentWithDetails[] = [
  {
    id: "doc-con-01",
    document_type: "consumption",
    document_number: "CON-MAR-000042",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    origin_location_id: "l0000000-0000-0000-0000-000000000010",
    destination_location_id: null,
    status: "APPROVED",
    ticket_ref: "OT-88219",
    reason: "Instalación residencial FTTH nuevo cliente",
    notes: "Instalación completada satisfactoriamente con potencia -19 dBm",
    created_by: "u0000000-0000-0000-0000-000000000004",
    approved_by: "u0000000-0000-0000-0000-000000000004",
    approved_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    branch: {
      id: "b0000000-0000-0000-0000-000000000002",
      code: "MAR",
      name: "Sucursal Maracaibo",
      address: null,
      phone: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    creator: {
      id: "u0000000-0000-0000-0000-000000000004",
      email: "tecnico.maracaibo@tvstar.com",
      full_name: "José Pirela (Técnico)",
      phone: null,
      role: "tecnico",
      branch_id: "b0000000-0000-0000-0000-000000000002",
      crew_id: "l0000000-0000-0000-0000-000000000010",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    origin_location: {
      id: "l0000000-0000-0000-0000-000000000010",
      branch_id: "b0000000-0000-0000-0000-000000000002",
      code: "CD-MAR-01",
      name: "Cuadrilla 01 FTTH Maracaibo Norte",
      type: "crew",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    lines: [
      {
        id: "con-l-01",
        document_id: "doc-con-01",
        item_id: "i0000000-0000-0000-0000-000000000001",
        quantity: 85,
        received_quantity: 85,
        unit_price: null,
        serial_unit_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000001",
          sku: "FIB-DRP-001",
          name: "Cable Fibra Óptica Drop 1 Hilo G.657A2",
          description: "Metros instalados desde poste",
          category: "Fibra Óptica",
          unit: "metros",
          is_serialized: false,
          min_stock: 1500,
          image_url: null,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      },
      {
        id: "con-l-02",
        document_id: "doc-con-01",
        item_id: "i0000000-0000-0000-0000-000000000008",
        quantity: 2,
        received_quantity: 2,
        unit_price: null,
        serial_unit_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000008",
          sku: "CON-RAP-SCAPC",
          name: "Conector Rápido SC/APC Monomodo",
          description: "Conectores mecánicos instalados",
          category: "Ferretería y Pasivos",
          unit: "unidades",
          is_serialized: false,
          min_stock: 200,
          image_url: null,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      },
      {
        id: "con-l-03",
        document_id: "doc-con-01",
        item_id: "i0000000-0000-0000-0000-000000000004",
        quantity: 1,
        received_quantity: 1,
        unit_price: null,
        serial_unit_id: "s0000000-0000-0000-0000-000000000004",
        notes: null,
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000004",
          sku: "ONU-HUA-8310",
          name: "ONU GPON Huawei EchoLife HG8310M",
          description: "Serial activado en OLT",
          category: "Equipos Activos",
          unit: "unidades",
          is_serialized: true,
          min_stock: 20,
          image_url: null,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      },
    ],
  },
];

export const consumeStockAction = async (
  values: ConsumptionInput
): Promise<ActionResult<{ document_number: string }>> => {
  const parsed = consumptionSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de consumo inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  const { crew_location_id, ticket_ref, reason, lines, notes } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_consume_stock", {
      p_crew_location_id: crew_location_id,
      p_ticket_ref: ticket_ref,
      p_reason: reason,
      p_lines: lines,
      p_notes: notes || undefined,
    });

    if (!error && data) {
      revalidatePath("/consumos");
      revalidatePath("/inventario");
      revalidatePath("/historial");
      return { success: true, data: { document_number: data.document_number } };
    }
  } catch {
    // Demo fallback
  }

  const branches = await getBranches();
  const locations = await getLocations();
  const items = await getItemsCatalog();

  const crewLoc = locations.find((l) => l.id === crew_location_id);
  const branch = branches.find((b) => b.id === crewLoc?.branch_id) || branches[0];
  const docNumber = `CON-${branch.code}-${String(
    demoConsumptions.length + 43
  ).padStart(6, "0")}`;

  const newDoc: DocumentWithDetails = {
    id: `doc-${Date.now()}`,
    document_type: "consumption",
    document_number: docNumber,
    branch_id: branch.id,
    origin_location_id: crew_location_id,
    destination_location_id: null,
    status: "APPROVED",
    ticket_ref,
    reason,
    notes: notes || null,
    created_by: profile.id,
    approved_by: profile.id,
    approved_at: new Date().toISOString(),
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    branch,
    creator: profile,
    origin_location: crewLoc || null,
    lines: lines.map((l, index) => ({
      id: `cline-${Date.now()}-${index}`,
      document_id: `doc-${Date.now()}`,
      item_id: l.item_id,
      quantity: l.quantity,
      received_quantity: l.quantity,
      unit_price: null,
      serial_unit_id: l.serial_unit_id || null,
      notes: null,
      created_at: new Date().toISOString(),
      item: items.find((i) => i.id === l.item_id) || items[0],
    })),
  };

  demoConsumptions = [newDoc, ...demoConsumptions];

  revalidatePath("/consumos");
  revalidatePath("/inventario");
  revalidatePath("/historial");

  return {
    success: true,
    data: { document_number: docNumber },
  };
};

export const getConsumptionsList = async (
  branchId?: string,
  crewLocationId?: string
): Promise<DocumentWithDetails[]> => {
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

    if (crewLocationId) {
      query = query.eq("origin_location_id", crewLocationId);
    } else if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as unknown as DocumentWithDetails[];
    }
  } catch {
    // Demo fallback
  }

  if (crewLocationId) {
    return demoConsumptions.filter(
      (d) => d.origin_location_id === crewLocationId
    );
  }
  if (branchId) {
    return demoConsumptions.filter((d) => d.branch_id === branchId);
  }

  return demoConsumptions;
};
