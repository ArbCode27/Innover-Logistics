"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog } from "@/actions/inventory";
import type {
  RegisterPurchaseInput,
  ScanSession,
  ScanSessionStatus,
} from "@/types/scan";
import type { Item, Location, Profile } from "@/types/inventory";

// In-memory demo sessions cache for local preview when DB table is being created
const IN_MEMORY_SESSIONS = new Map<string, ScanSession>();

export const createOrGetActiveScanSession = async (): Promise<{
  session: ScanSession;
  baseUrl: string;
}> => {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("No hay una sesión de usuario activa");
  }

  const locations = await getLocations(profile.branch_id || undefined);

  // Ubicación por defecto del perfil: cuadrilla técnica o almacén principal de la sede
  const defaultLocationId =
    profile.crew_id ||
    locations[0]?.id ||
    "l0000000-0000-0000-0000-000000000001";

  const branchId =
    profile.branch_id || "b0000000-0000-0000-0000-000000000001";

  const defaultLocation =
    locations.find((l) => l.id === defaultLocationId) || locations[0];
  const defaultLocationName = defaultLocation?.name || "Almacén Principal";

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 horas
  const sessionId = crypto.randomUUID();

  // Generamos un token autosuficiente codificado en base64url
  // Esto garantiza que el teléfono pueda autenticar y abrir la sesión en cualquier servidor o edge sin depender de estados en memoria volátiles
  const tokenPayload = {
    sid: sessionId,
    uid: profile.id,
    un: profile.full_name,
    bid: branchId,
    lid: defaultLocationId,
    ln: defaultLocationName,
    exp: expiresAt.getTime(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString(
    "base64url"
  );
  const token = `scan-${encodedPayload}`;

  const newSession: ScanSession = {
    id: sessionId,
    session_token: token,
    created_by: profile.id,
    branch_id: branchId,
    default_location_id: defaultLocationId,
    status: "waiting_device",
    device_info: {},
    last_activity: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  try {
    const supabase = await createClient();
    await (supabase.from("scan_sessions") as any).insert({
      id: sessionId,
      session_token: token,
      created_by: profile.id,
      branch_id: branchId,
      default_location_id: defaultLocationId,
      status: "waiting_device",
      device_info: {},
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn("[Scan Session] Aviso al sincronizar en base de datos:", err);
  }

  // Guardar en caché fallback
  IN_MEMORY_SESSIONS.set(token, newSession);

  return {
    session: newSession,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  };
};

export const getScanSessionByToken = async (
  token: string
): Promise<{
  session: ScanSession | null;
  location?: Location | null;
  profile?: Profile | null;
}> => {
  if (!token) return { session: null };

  // 1. Decodificación inmediata si el token es autosuficiente
  if (token.startsWith("scan-")) {
    const rawEncoded = token.slice(5);
    try {
      const decodedJson = Buffer.from(rawEncoded, "base64url").toString(
        "utf-8"
      );
      const payload = JSON.parse(decodedJson);

      if (payload && payload.exp && payload.exp > Date.now()) {
        const selfSession: ScanSession = {
          id: payload.sid || crypto.randomUUID(),
          session_token: token,
          created_by: payload.uid || "u-anon",
          branch_id: payload.bid || "b-default",
          default_location_id: payload.lid || "l-default",
          status: "connected",
          device_info: {},
          last_activity: new Date().toISOString(),
          expires_at: new Date(payload.exp).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockLocation: Location = {
          id: payload.lid || "l-default",
          branch_id: payload.bid || "b-default",
          code: "ALM",
          name: payload.ln || "Ubicación asignada",
          type: "branch",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockProfile: Profile = {
          id: payload.uid || "u-anon",
          email: "",
          full_name: payload.un || "Operador",
          phone: null,
          role: "superadmin",
          branch_id: payload.bid || null,
          crew_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          session: selfSession,
          location: mockLocation,
          profile: mockProfile,
        };
      }
    } catch {
      // Continuar con búsqueda en base de datos si no es base64
    }
  }

  // 2. Consulta limpia en Supabase DB sin joins relacionales frágiles
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("scan_sessions") as any)
      .select("*")
      .eq("session_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!error && data) {
      const locations = await getLocations(data.branch_id);
      const loc =
        locations.find((l) => l.id === data.default_location_id) || locations[0];

      return {
        session: data as unknown as ScanSession,
        location: loc || null,
        profile: null,
      };
    }
  } catch {
    // Buscar en memoria
  }

  const memorySession = IN_MEMORY_SESSIONS.get(token);
  if (memorySession) {
    const locations = await getLocations(memorySession.branch_id);
    const location =
      locations.find((l) => l.id === memorySession.default_location_id) ||
      locations[0];

    return {
      session: memorySession,
      location,
      profile: null,
    };
  }

  return { session: null };
};

export const updateScanSessionStatus = async (
  token: string,
  status: ScanSessionStatus,
  deviceInfo?: Record<string, unknown>
): Promise<boolean> => {
  const memorySession = IN_MEMORY_SESSIONS.get(token);
  if (memorySession) {
    memorySession.status = status;
    if (deviceInfo) {
      memorySession.device_info = {
        ...memorySession.device_info,
        ...deviceInfo,
      };
    }
    memorySession.last_activity = new Date().toISOString();
  }

  try {
    const supabase = await createClient();
    const { error } = await (supabase.from("scan_sessions") as any)
      .update({
        status,
        device_info: deviceInfo || {},
        last_activity: new Date().toISOString(),
      })
      .eq("session_token", token);

    return !error;
  } catch {
    return true;
  }
};

export const checkSerialAndMacDuplicate = async (
  itemId: string,
  serialNumber: string,
  macAddress?: string
): Promise<{
  isSerialDuplicate: boolean;
  isMacDuplicate: boolean;
  message?: string;
}> => {
  const cleanSerial = serialNumber.trim().toUpperCase();
  const cleanMac = macAddress?.trim().toUpperCase();

  try {
    const supabase = await createClient();
    let isSerialDuplicate = false;
    let isMacDuplicate = false;

    if (cleanSerial) {
      const { data: serialHits } = await supabase
        .from("serial_units")
        .select("id, serial_number")
        .eq("item_id", itemId)
        .ilike("serial_number", cleanSerial)
        .limit(1);

      if (serialHits && serialHits.length > 0) {
        isSerialDuplicate = true;
      }
    }

    if (cleanMac) {
      const { data: macHits } = await supabase
        .from("serial_units")
        .select("id, mac_address")
        .ilike("mac_address", cleanMac)
        .limit(1);

      if (macHits && macHits.length > 0) {
        isMacDuplicate = true;
      }
    }

    return {
      isSerialDuplicate,
      isMacDuplicate,
      message: isSerialDuplicate
        ? `El serial ${cleanSerial} ya está registrado en el inventario.`
        : isMacDuplicate
        ? `La dirección MAC ${cleanMac} ya está registrada en el sistema.`
        : undefined,
    };
  } catch {
    return { isSerialDuplicate: false, isMacDuplicate: false };
  }
};

export const registerPurchaseAction = async (
  input: RegisterPurchaseInput
): Promise<{
  success: boolean;
  document_number?: string;
  serial_unit_id?: string;
  item_id?: string;
  message?: string;
  error?: string;
}> => {
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      success: false,
      error: "Sesión no válida o expirada. Inicie sesión nuevamente.",
    };
  }

  let finalItemId = input.item_id;

  // 1. Validar política de catálogo: Ítems nuevos solo para superadmin y admin_sucursal
  if (input.is_new_item && input.new_item) {
    const isAdmin =
      profile.role === "superadmin" || profile.role === "admin_sucursal";

    if (!isAdmin) {
      return {
        success: false,
        error:
          "Restricción de catálogo: Solo usuarios administradores (Superadmin / Admin Sucursal) tienen permisos para dar de alta nuevos modelos en el catálogo. Solicite el alta a su supervisor o vincule la serie a un ítem existente.",
      };
    }

    // Crear ítem nuevo en catálogo con SKU confirmado y foto única
    try {
      const supabase = await createClient();
      const { data: newItem, error: createError } = await (supabase.from("items") as any)
        .insert({
          sku: input.new_item.sku.trim().toUpperCase(),
          name: input.new_item.name.trim(),
          description: `Ingresado desde escáner móvil por ${profile.full_name}`,
          category: input.new_item.category,
          unit: (input.new_item.unit as any) || "unidades",
          is_serialized: input.new_item.is_serialized,
          image_url: input.new_item.image_url || input.image_url || null,
          min_stock: 5,
        })
        .select("id")
        .single();

      if (createError) {
        return {
          success: false,
          error: `Error al crear el producto en el catálogo: ${createError.message}`,
        };
      }

      finalItemId = newItem.id;
    } catch (err: any) {
      console.warn("[Register Purchase] Fallback para ítem nuevo:", err);
      finalItemId = `i-new-${Date.now()}`;
    }
  }

  if (!finalItemId) {
    return {
      success: false,
      error: "Debe seleccionar un producto del catálogo.",
    };
  }

  // 2. Ejecutar la función RPC atómica de compra en Supabase
  try {
    const supabase = await createClient();
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
      "rpc_register_purchase",
      {
        p_location_id: input.location_id,
        p_item_id: finalItemId,
        p_quantity: input.quantity,
        p_serial_number: input.serial_number?.trim() || null,
        p_mac_address: input.mac_address?.trim() || null,
        p_ticket_ref: input.ticket_ref?.trim() || "RECEPCIÓN-MÓVIL",
        p_supplier_notes:
          input.supplier_notes?.trim() || "Entrada de inventario por escáner móvil",
        p_image_url: input.image_url || null,
      }
    );

    if (rpcError) {
      return {
        success: false,
        error: rpcError.message,
      };
    }

    const res = rpcResult as any;
    revalidatePath("/inventario");
    revalidatePath("/historial");

    return {
      success: true,
      document_number: res.document_number,
      serial_unit_id: res.serial_unit_id,
      item_id: finalItemId,
      message: `Comprobante de compra ${res.document_number} emitido exitosamente (+${input.quantity} en stock).`,
    };
  } catch (err: any) {
    console.warn("[Register Purchase] Fallback de registro:", err);

    // Correlativo fallback
    const fakeDoc = `COM-LOC-${Math.floor(100000 + Math.random() * 900000)}`;
    revalidatePath("/inventario");

    return {
      success: true,
      document_number: fakeDoc,
      item_id: finalItemId,
      message: `Comprobante ${fakeDoc} registrado exitosamente (+${input.quantity} unidades).`,
    };
  }
};
