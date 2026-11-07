export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "superadmin" | "admin_sucursal" | "reportador" | "tecnico";
export type LocationType = "branch" | "crew";
export type UnitOfMeasure = "metros" | "bobinas" | "unidades" | "kilogramos" | "pares";
export type DocumentType = "purchase" | "transfer" | "assignment" | "consumption" | "return" | "adjustment";
export type DocumentStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type RequestStatus = "REQUESTED" | "APPROVED" | "DELIVERED" | "CONSUMED" | "RETURNED" | "REJECTED";
export type SerialStatus = "in_stock" | "in_transit" | "assigned_crew" | "consumed" | "damaged" | "returned";
export type MovementType =
  | "purchase"
  | "transfer_out"
  | "transfer_in"
  | "assignment_out"
  | "assignment_in"
  | "consumption"
  | "return"
  | "adjustment_in"
  | "adjustment_out"
  | "void";

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          code: string;
          name: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          branch_id: string;
          code: string;
          name: string;
          type: LocationType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          code: string;
          name: string;
          type: LocationType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          branch_id?: string;
          code?: string;
          name?: string;
          type?: LocationType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          branch_id: string | null;
          crew_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          branch_id?: string | null;
          crew_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          branch_id?: string | null;
          crew_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string;
          unit: UnitOfMeasure;
          is_serialized: boolean;
          min_stock: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category: string;
          unit: UnitOfMeasure;
          is_serialized?: boolean;
          min_stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category?: string;
          unit?: UnitOfMeasure;
          is_serialized?: boolean;
          min_stock?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      serial_units: {
        Row: {
          id: string;
          item_id: string;
          serial_number: string;
          mac_address: string | null;
          status: SerialStatus;
          current_location_id: string;
          last_document_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          serial_number: string;
          mac_address?: string | null;
          status?: SerialStatus;
          current_location_id: string;
          last_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          serial_number?: string;
          mac_address?: string | null;
          status?: SerialStatus;
          current_location_id?: string;
          last_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_sequences: {
        Row: {
          id: string;
          branch_id: string;
          doc_type: DocumentType;
          prefix: string;
          current_number: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          doc_type: DocumentType;
          prefix: string;
          current_number?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          branch_id?: string;
          doc_type?: DocumentType;
          prefix?: string;
          current_number?: number;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          document_type: DocumentType;
          document_number: string;
          branch_id: string;
          origin_location_id: string | null;
          destination_location_id: string | null;
          status: DocumentStatus;
          ticket_ref: string | null;
          reason: string | null;
          notes: string | null;
          created_by: string;
          approved_by: string | null;
          approved_at: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          related_document_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_type: DocumentType;
          document_number: string;
          branch_id: string;
          origin_location_id?: string | null;
          destination_location_id?: string | null;
          status?: DocumentStatus;
          ticket_ref?: string | null;
          reason?: string | null;
          notes?: string | null;
          created_by: string;
          approved_by?: string | null;
          approved_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          related_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_type?: DocumentType;
          document_number?: string;
          branch_id?: string;
          origin_location_id?: string | null;
          destination_location_id?: string | null;
          status?: DocumentStatus;
          ticket_ref?: string | null;
          reason?: string | null;
          notes?: string | null;
          created_by?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          related_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_lines: {
        Row: {
          id: string;
          document_id: string;
          item_id: string;
          quantity: number;
          received_quantity: number | null;
          unit_price: number | null;
          serial_unit_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          item_id: string;
          quantity: number;
          received_quantity?: number | null;
          unit_price?: number | null;
          serial_unit_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          item_id?: string;
          quantity?: number;
          received_quantity?: number | null;
          unit_price?: number | null;
          serial_unit_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          document_id: string;
          document_line_id: string | null;
          item_id: string;
          location_id: string;
          serial_unit_id: string | null;
          quantity: number;
          movement_type: MovementType;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          document_line_id?: string | null;
          item_id: string;
          location_id: string;
          serial_unit_id?: string | null;
          quantity: number;
          movement_type: MovementType;
          created_by: string;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      stock_balances: {
        Row: {
          id: string;
          location_id: string;
          item_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          item_id: string;
          quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          item_id?: string;
          quantity?: number;
          updated_at?: string;
        };
      };
      material_requests: {
        Row: {
          id: string;
          request_number: string;
          branch_id: string;
          requester_id: string;
          crew_location_id: string;
          item_id: string;
          quantity: number;
          status: RequestStatus;
          ticket_ref: string | null;
          notes: string | null;
          assigned_document_id: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_number: string;
          branch_id: string;
          requester_id: string;
          crew_location_id: string;
          item_id: string;
          quantity: number;
          status?: RequestStatus;
          ticket_ref?: string | null;
          notes?: string | null;
          assigned_document_id?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_number?: string;
          branch_id?: string;
          requester_id?: string;
          crew_location_id?: string;
          item_id?: string;
          quantity?: number;
          status?: RequestStatus;
          ticket_ref?: string | null;
          notes?: string | null;
          assigned_document_id?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          actor_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          actor_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fn_generate_document_number: {
        Args: {
          p_branch_id: string;
          p_doc_type: DocumentType;
        };
        Returns: string;
      };
      rpc_issue_transfer: {
        Args: {
          p_origin_location_id: string;
          p_destination_location_id: string;
          p_lines: Json;
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          document_id: string;
          document_number: string;
        };
      };
      rpc_accept_transfer: {
        Args: {
          p_document_id: string;
          p_action: "ACCEPT" | "REJECT";
          p_accepted_lines?: Json;
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          status: string;
        };
      };
      rpc_assign_to_crew: {
        Args: {
          p_origin_location_id: string;
          p_crew_location_id: string;
          p_lines: Json;
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          document_id: string;
          document_number: string;
        };
      };
      rpc_consume_stock: {
        Args: {
          p_crew_location_id: string;
          p_ticket_ref: string;
          p_reason: string;
          p_lines: Json;
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          document_id: string;
          document_number: string;
        };
      };
      rpc_void_document: {
        Args: {
          p_document_id: string;
          p_cancellation_reason: string;
        };
        Returns: {
          success: boolean;
          status: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      location_type: LocationType;
      unit_of_measure: UnitOfMeasure;
      document_type: DocumentType;
      document_status: DocumentStatus;
      request_status: RequestStatus;
      serial_status: SerialStatus;
      movement_type: MovementType;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
