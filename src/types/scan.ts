export type ScanSessionStatus =
  | "waiting_device"
  | "connected"
  | "scanning"
  | "closed"
  | "expired";

export interface ScanSession {
  id: string;
  session_token: string;
  created_by: string;
  branch_id: string;
  default_location_id: string;
  status: ScanSessionStatus;
  device_info: Record<string, unknown>;
  last_activity: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedLabelData {
  brand?: string;
  model?: string;
  serial_number?: string;
  mac_address?: string;
  suggested_sku?: string;
  suggested_name?: string;
  category?: string;
  unit?: string;
  is_serialized: boolean;
  confidence: number;
  raw_text?: string;
  detected_barcodes?: string[];
  matched_item_id?: string;
  is_duplicate_serial?: boolean;
  is_new_catalog_item?: boolean;
}

export interface ScanAnalyzeResponse {
  success: boolean;
  data?: ExtractedLabelData;
  imageUrl?: string;
  error?: string;
}

export interface RegisterPurchaseInput {
  item_id?: string;
  is_new_item?: boolean;
  new_item?: {
    sku: string;
    name: string;
    category: string;
    unit: string;
    is_serialized: boolean;
    image_url?: string;
  };
  location_id: string;
  quantity: number;
  serial_number?: string;
  mac_address?: string;
  ticket_ref?: string;
  supplier_notes?: string;
  image_url?: string;
}

export interface ScanRealtimePayload {
  type:
    | "device_connected"
    | "device_heartbeat"
    | "capture_started"
    | "capture_received"
    | "scan_analyzed"
    | "scan_saved"
    | "session_closed"
    | "error";
  sessionId: string;
  timestamp: number;
  payload?: any;
}
