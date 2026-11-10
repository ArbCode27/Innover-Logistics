import type {
  Database,
  DocumentStatus,
  DocumentType,
  LocationType,
  MovementType,
  RequestStatus,
  SerialStatus,
  UnitOfMeasure,
  UserRole,
} from "./database.types";

export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type SerialUnit = Database["public"]["Tables"]["serial_units"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentLine = Database["public"]["Tables"]["document_lines"]["Row"];
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type StockBalance = Database["public"]["Tables"]["stock_balances"]["Row"];
export type MaterialRequest = Database["public"]["Tables"]["material_requests"]["Row"];
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"];
export type ScanSessionRecord = Database["public"]["Tables"]["scan_sessions"]["Row"];

export interface StockItemWithBalance extends Item {
  current_stock: number;
  location_id: string;
  location_name: string;
  branch_name: string;
  is_low_stock: boolean;
}

export interface SerializedItemWithDetails extends SerialUnit {
  item: Item;
  location: Location;
}

export interface DocumentWithDetails extends Document {
  origin_location?: Location | null;
  destination_location?: Location | null;
  branch: Branch;
  creator: Profile;
  lines: (DocumentLine & { item: Item; serial_unit?: SerialUnit | null })[];
}

export interface TransferLineInput {
  item_id: string;
  quantity: number;
  serial_unit_id?: string;
  notes?: string;
}

export interface ConsumptionLineInput {
  item_id: string;
  quantity: number;
  serial_unit_id?: string;
}

export {
  type DocumentStatus,
  type DocumentType,
  type LocationType,
  type MovementType,
  type RequestStatus,
  type SerialStatus,
  type UnitOfMeasure,
  type UserRole,
};
