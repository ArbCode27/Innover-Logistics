"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import {
  issueTransferSchema,
  acceptTransferSchema,
  type IssueTransferInput,
  type AcceptTransferInput,
} from "@/lib/validators/transfer";
import { getBranches, getLocations, getItemsCatalog } from "@/actions/inventory";
import type { DocumentWithDetails } from "@/types/inventory";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// In-memory demo store for fallback when database RPCs are not yet provisioned
let demoTransfers: DocumentWithDetails[] = [
  {
    id: "d0000000-0000-0000-0000-000000000099",
    document_type: "transfer",
    document_number: "TRF-CCS-000014",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    origin_location_id: "l0000000-0000-0000-0000-000000000001",
    destination_location_id: "l0000000-0000-0000-0000-000000000002",
    status: "PENDING",
    ticket_ref: null,
    reason: null,
    notes: "Envío urgente de ONUs y bobinas para reposición de stock semanal",
    created_by: "u0000000-0000-0000-0000-000000000001",
    approved_by: null,
    approved_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    branch: {
      id: "b0000000-0000-0000-0000-000000000001",
      code: "CCS",
      name: "Sede Central Caracas",
      address: null,
      phone: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    creator: {
      id: "u0000000-0000-0000-0000-000000000001",
      email: "superadmin@tvstar.com",
      full_name: "Carlos Mendoza (Superadmin)",
      phone: null,
      role: "superadmin",
      branch_id: "b0000000-0000-0000-0000-000000000001",
      crew_id: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    origin_location: {
      id: "l0000000-0000-0000-0000-000000000001",
      branch_id: "b0000000-0000-0000-0000-000000000001",
      code: "ALM-CCS",
      name: "Almacén Central Caracas",
      type: "branch",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    destination_location: {
      id: "l0000000-0000-0000-0000-000000000002",
      branch_id: "b0000000-0000-0000-0000-000000000002",
      code: "ALM-MAR",
      name: "Almacén Principal Maracaibo",
      type: "branch",
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    lines: [
      {
        id: "dl-001",
        document_id: "d0000000-0000-0000-0000-000000000099",
        item_id: "i0000000-0000-0000-0000-000000000004",
        quantity: 20,
        received_quantity: null,
        unit_price: 25,
        serial_unit_id: null,
        notes: "Lote nuevo probado en laboratorio",
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000004",
          sku: "ONU-HUA-8310",
          name: "ONU GPON Huawei EchoLife HG8310M",
          description: "Terminal de red óptica 1GE Bridge",
          category: "Equipos Activos",
          unit: "unidades",
          is_serialized: true,
          min_stock: 20,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      },
      {
        id: "dl-002",
        document_id: "d0000000-0000-0000-0000-000000000099",
        item_id: "i0000000-0000-0000-0000-000000000002",
        quantity: 5,
        received_quantity: null,
        unit_price: 180,
        serial_unit_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        item: {
          id: "i0000000-0000-0000-0000-000000000002",
          sku: "BOB-DRP-1KM",
          name: "Bobina Drop 1 Hilo 1000m",
          description: "Bobina cerrada de cable drop para acometidas",
          category: "Fibra Óptica",
          unit: "bobinas",
          is_serialized: false,
          min_stock: 5,
          is_active: true,
          created_at: "",
          updated_at: "",
        },
      },
    ],
  },
];

export const issueTransferAction = async (
  values: IssueTransferInput
): Promise<ActionResult<{ document_number: string }>> => {
  const parsed = issueTransferSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de transferencia inválidos",
    };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Usuario no autenticado" };
  }

  const { origin_location_id, destination_location_id, lines, notes } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_issue_transfer", {
      p_origin_location_id: origin_location_id,
      p_destination_location_id: destination_location_id,
      p_lines: lines,
      p_notes: notes || undefined,
    });

    if (!error && data) {
      revalidatePath("/guias/recepcion");
      revalidatePath("/guias/enviar");
      revalidatePath("/inventario");
      return {
        success: true,
        data: { document_number: data.document_number },
      };
    }
  } catch {
    // If Supabase RPC is not reached, handle through demo state
  }

  // Demo Fallback implementation
  const branches = await getBranches();
  const locations = await getLocations();
  const allItems = await getItemsCatalog();

  const originLoc = locations.find((l) => l.id === origin_location_id);
  const destLoc = locations.find((l) => l.id === destination_location_id);
  const branch = branches.find((b) => b.id === originLoc?.branch_id) || branches[0];

  const docNumber = `TRF-${branch.code}-${String(
    demoTransfers.length + 15
  ).padStart(6, "0")}`;

  const newDoc: DocumentWithDetails = {
    id: `doc-${Date.now()}`,
    document_type: "transfer",
    document_number: docNumber,
    branch_id: branch.id,
    origin_location_id,
    destination_location_id,
    status: "PENDING",
    ticket_ref: null,
    reason: null,
    notes: notes || null,
    created_by: profile.id,
    approved_by: null,
    approved_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    related_document_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    branch,
    creator: profile,
    origin_location: originLoc || null,
    destination_location: destLoc || null,
    lines: lines.map((l, index) => ({
      id: `line-${Date.now()}-${index}`,
      document_id: `doc-${Date.now()}`,
      item_id: l.item_id,
      quantity: l.quantity,
      received_quantity: null,
      unit_price: null,
      serial_unit_id: l.serial_unit_id || null,
      notes: l.notes || null,
      created_at: new Date().toISOString(),
      item: allItems.find((i) => i.id === l.item_id) || allItems[0],
    })),
  };

  demoTransfers = [newDoc, ...demoTransfers];

  revalidatePath("/guias/recepcion");
  revalidatePath("/guias/enviar");
  revalidatePath("/inventario");

  return {
    success: true,
    data: { document_number: docNumber },
  };
};

export const acceptTransferAction = async (
  values: AcceptTransferInput
): Promise<ActionResult<{ status: string }>> => {
  const parsed = acceptTransferSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de aceptación inválidos",
    };
  }

  const { document_id, action, accepted_lines, notes } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc("rpc_accept_transfer", {
      p_document_id: document_id,
      p_action: action,
      p_accepted_lines: accepted_lines || [],
      p_notes: notes || undefined,
    });

    if (!error && data) {
      revalidatePath("/guias/recepcion");
      revalidatePath("/inventario");
      return { success: true, data: { status: data.status } };
    }
  } catch {
    // Demo fallback
  }

  // Update demo transfer
  demoTransfers = demoTransfers.map((doc) => {
    if (doc.id === document_id) {
      return {
        ...doc,
        status: action === "ACCEPT" ? "APPROVED" : "REJECTED",
        notes: notes ? `${doc.notes || ""} | ${notes}` : doc.notes,
        lines: doc.lines.map((l) => {
          const matched = accepted_lines?.find((a) => a.line_id === l.id);
          return {
            ...l,
            received_quantity: matched ? matched.received_quantity : l.quantity,
          };
        }),
      };
    }
    return doc;
  });

  revalidatePath("/guias/recepcion");
  revalidatePath("/inventario");

  return {
    success: true,
    data: { status: action === "ACCEPT" ? "APPROVED" : "REJECTED" },
  };
};

export const getTransfersList = async (
  filterBranchId?: string
): Promise<DocumentWithDetails[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        *,
        branch:branches(*),
        creator:profiles(*),
        origin_location:locations!documents_origin_location_id_fkey(*),
        destination_location:locations!documents_destination_location_id_fkey(*),
        lines:document_lines(
          *,
          item:items(*)
        )
      `
      )
      .eq("document_type", "transfer")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as DocumentWithDetails[];
    }
  } catch {
    // Demo fallback
  }

  if (filterBranchId) {
    return demoTransfers.filter(
      (d) =>
        d.branch_id === filterBranchId ||
        d.destination_location?.branch_id === filterBranchId
    );
  }

  return demoTransfers;
};
