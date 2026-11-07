-- Migration: 20261107000001_initial_schema.sql
-- Description: Core schema, immutable ledger, triggers, RLS and transactional RPCs for Star Conectados (Tv Star Satellite, C.A.)

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'admin_sucursal', 'reportador', 'tecnico');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('branch', 'crew');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE unit_of_measure AS ENUM ('metros', 'bobinas', 'unidades', 'kilogramos', 'pares');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('purchase', 'transfer', 'assignment', 'consumption', 'return', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('REQUESTED', 'APPROVED', 'DELIVERED', 'CONSUMED', 'RETURNED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE serial_status AS ENUM ('in_stock', 'in_transit', 'assigned_crew', 'consumed', 'damaged', 'returned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'purchase', 
    'transfer_out', 
    'transfer_in', 
    'assignment_out', 
    'assignment_in', 
    'consumption', 
    'return', 
    'adjustment_in', 
    'adjustment_out', 
    'void'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. CORE TABLES

-- Branches (Sedes / Sucursales)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locations (Depósitos de sucursal y cuadrillas técnicas)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type location_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_locations_branch_code UNIQUE (branch_id, code)
);

-- User Profiles (Vinculados con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'tecnico',
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  crew_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items (Catálogo de materiales y equipos)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit unit_of_measure NOT NULL,
  is_serialized BOOLEAN NOT NULL DEFAULT false,
  min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serial Units (Control individual de ONUs, Routers por Serial y MAC)
CREATE TABLE IF NOT EXISTS public.serial_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  mac_address TEXT,
  status serial_status NOT NULL DEFAULT 'in_stock',
  current_location_id UUID NOT NULL REFERENCES public.locations(id),
  last_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_serial UNIQUE (item_id, serial_number)
);

-- Document Sequences (Generación atómica de números correlativos por sede y tipo)
CREATE TABLE IF NOT EXISTS public.document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_branch_doc_type UNIQUE (branch_id, doc_type)
);

-- Documents (Comprobantes auditables)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL,
  document_number TEXT NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  origin_location_id UUID REFERENCES public.locations(id),
  destination_location_id UUID REFERENCES public.locations(id),
  status document_status NOT NULL DEFAULT 'PENDING',
  ticket_ref TEXT,
  reason TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  related_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_consumption_ticket_reason CHECK (
    document_type <> 'consumption' OR (
      ticket_ref IS NOT NULL AND length(trim(ticket_ref)) > 0 AND
      reason IS NOT NULL AND length(trim(reason)) > 0
    )
  ),
  CONSTRAINT chk_transfer_locations CHECK (
    document_type <> 'transfer' OR (
      origin_location_id IS NOT NULL AND
      destination_location_id IS NOT NULL AND
      origin_location_id <> destination_location_id
    )
  )
);

-- Document Lines (Detalle de cada documento)
CREATE TABLE IF NOT EXISTS public.document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  received_quantity NUMERIC(12, 2) CHECK (received_quantity >= 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
  serial_unit_id UUID REFERENCES public.serial_units(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Movements (LEDGER INMUTABLE - Nunca se edita ni borra)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id),
  document_line_id UUID REFERENCES public.document_lines(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  serial_unit_id UUID REFERENCES public.serial_units(id),
  quantity NUMERIC(12, 2) NOT NULL, -- Positivo: entrada; Negativo: salida
  movement_type movement_type NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Balances (Snapshot sincronizado exclusivamente por trigger sobre stock_movements)
CREATE TABLE IF NOT EXISTS public.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_location_item_balance UNIQUE (location_id, item_id)
);

-- Material Requests (Solicitudes de material por técnicos/cuadrillas)
CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  crew_location_id UUID NOT NULL REFERENCES public.locations(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  status request_status NOT NULL DEFAULT 'REQUESTED',
  ticket_ref TEXT,
  notes TEXT,
  assigned_document_id UUID REFERENCES public.documents(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log (Trazabilidad total)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_locations_branch ON public.locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_crew ON public.profiles(crew_id);
CREATE INDEX IF NOT EXISTS idx_serial_units_location ON public.serial_units(current_location_id, status);
CREATE INDEX IF NOT EXISTS idx_serial_units_item ON public.serial_units(item_id);
CREATE INDEX IF NOT EXISTS idx_documents_branch ON public.documents(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_document_lines_doc ON public.document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_loc_item ON public.stock_movements(location_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_doc ON public.stock_movements(document_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_loc ON public.stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_branch_status ON public.material_requests(branch_id, status);

-- 4. TRIGGERS: IMMUTABILITY & STOCK BALANCE SYNCHRONIZATION

-- Inmutabilidad de stock_movements
CREATE OR REPLACE FUNCTION public.fn_prevent_stock_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Stock movements are strictly immutable. Updates and deletions are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_mutation ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_mutation
BEFORE UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_stock_movement_mutation();

-- Actualización automática de stock_balances al insertar un movimiento
CREATE OR REPLACE FUNCTION public.fn_sync_stock_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance NUMERIC(12, 2);
BEGIN
  INSERT INTO public.stock_balances (location_id, item_id, quantity, updated_at)
  VALUES (NEW.location_id, NEW.item_id, NEW.quantity, now())
  ON CONFLICT (location_id, item_id)
  DO UPDATE SET
    quantity = public.stock_balances.quantity + EXCLUDED.quantity,
    updated_at = now()
  RETURNING quantity INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Location % does not have enough stock for item % (Resulting balance: %)', 
      NEW.location_id, NEW.item_id, v_new_balance;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_stock_balance ON public.stock_movements;
CREATE TRIGGER trg_sync_stock_balance
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_stock_balance();

-- Actualización de updated_at genérico
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_serial_units_updated_at BEFORE UPDATE ON public.serial_units FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_material_requests_updated_at BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 5. CORRELATIVE NUMBER GENERATOR (ATOMIC & CONSECUTIVE)
CREATE OR REPLACE FUNCTION public.fn_generate_document_number(
  p_branch_id UUID,
  p_doc_type document_type
)
RETURNS TEXT AS $$
DECLARE
  v_branch_code VARCHAR(10);
  v_prefix TEXT;
  v_next_num INTEGER;
  v_result TEXT;
BEGIN
  SELECT code INTO v_branch_code FROM public.branches WHERE id = p_branch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found: %', p_branch_id;
  END IF;

  -- Determinar prefijo por tipo de documento
  v_prefix := CASE p_doc_type
    WHEN 'purchase' THEN 'COM'
    WHEN 'transfer' THEN 'TRF'
    WHEN 'assignment' THEN 'ASG'
    WHEN 'consumption' THEN 'CON'
    WHEN 'return' THEN 'DEV'
    WHEN 'adjustment' THEN 'AJU'
  END;

  -- Bloqueo pesimista de fila en la secuencia
  INSERT INTO public.document_sequences (branch_id, doc_type, prefix, current_number, updated_at)
  VALUES (p_branch_id, p_doc_type, v_prefix, 1, now())
  ON CONFLICT (branch_id, doc_type)
  DO UPDATE SET
    current_number = public.document_sequences.current_number + 1,
    updated_at = now()
  RETURNING current_number INTO v_next_num;

  v_result := v_prefix || '-' || v_branch_code || '-' || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. TRANSACTIONAL RPC FUNCTIONS (ATOMIC OPERATIONS)

-- RPC 1: Emitir Transferencia entre Sedes (Deduce origen y deja en PENDING)
CREATE OR REPLACE FUNCTION public.rpc_issue_transfer(
  p_origin_location_id UUID,
  p_destination_location_id UUID,
  p_lines JSONB, -- Array de { item_id: UUID, quantity: NUMERIC, serial_unit_id?: UUID, notes?: TEXT }
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_origin_loc RECORD;
  v_dest_loc RECORD;
  v_doc_number TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
  v_line_notes TEXT;
  v_doc_line_id UUID;
  v_serial RECORD;
BEGIN
  -- Validar ubicaciones
  SELECT * INTO v_origin_loc FROM public.locations WHERE id = p_origin_location_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ubicación origen no encontrada o inactiva'; END IF;

  SELECT * INTO v_dest_loc FROM public.locations WHERE id = p_destination_location_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ubicación destino no encontrada o inactiva'; END IF;

  IF v_origin_loc.branch_id = v_dest_loc.branch_id THEN
    RAISE EXCEPTION 'La transferencia entre sedes requiere que origen y destino pertenezcan a sucursales diferentes';
  END IF;

  -- Generar número correlativo
  v_doc_number := public.fn_generate_document_number(v_origin_loc.branch_id, 'transfer');

  -- Crear documento en PENDING
  INSERT INTO public.documents (
    document_type, document_number, branch_id, origin_location_id, destination_location_id,
    status, notes, created_by
  ) VALUES (
    'transfer', v_doc_number, v_origin_loc.branch_id, p_origin_location_id, p_destination_location_id,
    'PENDING', p_notes, v_caller_id
  ) RETURNING id INTO v_doc_id;

  -- Procesar líneas
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;
    v_line_notes := v_line->>'notes';

    IF v_line_qty <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a 0 para el ítem %', v_line_item_id;
    END IF;

    -- Validar serial si aplica
    IF v_line_serial_id IS NOT NULL THEN
      SELECT * INTO v_serial FROM public.serial_units 
      WHERE id = v_line_serial_id AND current_location_id = p_origin_location_id AND status = 'in_stock';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'El serial % no se encuentra disponible en stock en el origen', v_line_serial_id;
      END IF;

      -- Marcar serial en tránsito
      UPDATE public.serial_units
      SET status = 'in_transit', last_document_id = v_doc_id, updated_at = now()
      WHERE id = v_line_serial_id;
    END IF;

    -- Insertar línea de documento
    INSERT INTO public.document_lines (
      document_id, item_id, quantity, serial_unit_id, notes
    ) VALUES (
      v_doc_id, v_line_item_id, v_line_qty, v_line_serial_id, v_line_notes
    ) RETURNING id INTO v_doc_line_id;

    -- Ledger: salida de stock en origen (el trigger sincroniza stock_balances y valida si hay stock suficiente)
    INSERT INTO public.stock_movements (
      document_id, document_line_id, item_id, location_id, serial_unit_id,
      quantity, movement_type, created_by
    ) VALUES (
      v_doc_id, v_doc_line_id, v_line_item_id, p_origin_location_id, v_line_serial_id,
      -v_line_qty, 'transfer_out', v_caller_id
    );
  END LOOP;

  -- Auditoría
  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES ('documents', v_doc_id, 'ISSUE_TRANSFER', v_caller_id, jsonb_build_object('doc_number', v_doc_number));

  RETURN jsonb_build_object('success', true, 'document_id', v_doc_id, 'document_number', v_doc_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: Aceptar o Rechazar Transferencia en Destino
CREATE OR REPLACE FUNCTION public.rpc_accept_transfer(
  p_document_id UUID,
  p_action TEXT, -- 'ACCEPT' | 'REJECT'
  p_accepted_lines JSONB DEFAULT '[]'::JSONB, -- Array de { line_id: UUID, received_quantity: NUMERIC }
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_doc RECORD;
  v_line RECORD;
  v_received_qty NUMERIC(12, 2);
  v_accepted_entry JSONB;
BEGIN
  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;

  IF v_doc.document_type <> 'transfer' THEN
    RAISE EXCEPTION 'El documento no es una transferencia';
  END IF;

  IF v_doc.status <> 'PENDING' THEN
    RAISE EXCEPTION 'El documento no está en estado PENDIENTE (Estado actual: %)', v_doc.status;
  END IF;

  IF p_action = 'REJECT' THEN
    -- RECHAZO: Se devuelve el stock a la sede de origen
    FOR v_line IN SELECT * FROM public.document_lines WHERE document_id = p_document_id
    LOOP
      -- Contra-asiento en origen para reponer el stock
      INSERT INTO public.stock_movements (
        document_id, document_line_id, item_id, location_id, serial_unit_id,
        quantity, movement_type, created_by
      ) VALUES (
        v_doc.id, v_line.id, v_line.item_id, v_doc.origin_location_id, v_line.serial_unit_id,
        v_line.quantity, 'transfer_in', v_caller_id
      );

      -- Restaurar serial a origen
      IF v_line.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET status = 'in_stock', current_location_id = v_doc.origin_location_id, updated_at = now()
        WHERE id = v_line.serial_unit_id;
      END IF;
    END LOOP;

    UPDATE public.documents
    SET status = 'REJECTED', approved_by = v_caller_id, approved_at = now(), notes = COALESCE(notes || ' | ', '') || 'Rechazado: ' || COALESCE(p_notes, 'Sin nota')
    WHERE id = p_document_id;

    INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
    VALUES ('documents', p_document_id, 'REJECT_TRANSFER', v_caller_id, jsonb_build_object('status', 'REJECTED'));

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');

  ELSIF p_action = 'ACCEPT' THEN
    -- ACEPTACIÓN: Se acredita en destino
    FOR v_line IN SELECT * FROM public.document_lines WHERE document_id = p_document_id
    LOOP
      -- Verificar si vino cantidad recibida específica
      v_received_qty := v_line.quantity;
      FOR v_accepted_entry IN SELECT * FROM jsonb_array_elements(p_accepted_lines)
      LOOP
        IF (v_accepted_entry->>'line_id')::UUID = v_line.id THEN
          v_received_qty := (v_accepted_entry->>'received_quantity')::NUMERIC;
        END IF;
      END LOOP;

      UPDATE public.document_lines
      SET received_quantity = v_received_qty
      WHERE id = v_line.id;

      -- Acreditar stock recibido en destino
      IF v_received_qty > 0 THEN
        INSERT INTO public.stock_movements (
          document_id, document_line_id, item_id, location_id, serial_unit_id,
          quantity, movement_type, created_by
        ) VALUES (
          v_doc.id, v_line.id, v_line.item_id, v_doc.destination_location_id, v_line.serial_unit_id,
          v_received_qty, 'transfer_in', v_caller_id
        );
      END IF;

      -- Actualizar ubicación del serial a destino
      IF v_line.serial_unit_id IS NOT NULL AND v_received_qty > 0 THEN
        UPDATE public.serial_units
        SET status = 'in_stock', current_location_id = v_doc.destination_location_id, updated_at = now()
        WHERE id = v_line.serial_unit_id;
      END IF;
    END LOOP;

    UPDATE public.documents
    SET status = 'APPROVED', approved_by = v_caller_id, approved_at = now(), notes = COALESCE(notes || ' | ', '') || COALESCE(p_notes, '')
    WHERE id = p_document_id;

    INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
    VALUES ('documents', p_document_id, 'ACCEPT_TRANSFER', v_caller_id, jsonb_build_object('status', 'APPROVED'));

    RETURN jsonb_build_object('success', true, 'status', 'APPROVED');
  ELSE
    RAISE EXCEPTION 'Acción inválida. Utilice ACCEPT o REJECT.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: Asignar Material a Cuadrilla Técnica
CREATE OR REPLACE FUNCTION public.rpc_assign_to_crew(
  p_origin_location_id UUID,
  p_crew_location_id UUID,
  p_lines JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_origin_loc RECORD;
  v_crew_loc RECORD;
  v_doc_number TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
  v_doc_line_id UUID;
BEGIN
  SELECT * INTO v_origin_loc FROM public.locations WHERE id = p_origin_location_id AND type = 'branch';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ubicación origen debe ser un almacén de sucursal'; END IF;

  SELECT * INTO v_crew_loc FROM public.locations WHERE id = p_crew_location_id AND type = 'crew';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ubicación destino debe ser una cuadrilla técnica válida'; END IF;

  v_doc_number := public.fn_generate_document_number(v_origin_loc.branch_id, 'assignment');

  INSERT INTO public.documents (
    document_type, document_number, branch_id, origin_location_id, destination_location_id,
    status, notes, created_by, approved_by, approved_at
  ) VALUES (
    'assignment', v_doc_number, v_origin_loc.branch_id, p_origin_location_id, p_crew_location_id,
    'APPROVED', p_notes, v_caller_id, v_caller_id, now()
  ) RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;

    INSERT INTO public.document_lines (
      document_id, item_id, quantity, serial_unit_id
    ) VALUES (
      v_doc_id, v_line_item_id, v_line_qty, v_line_serial_id
    ) RETURNING id INTO v_doc_line_id;

    -- Salida de bodega
    INSERT INTO public.stock_movements (
      document_id, document_line_id, item_id, location_id, serial_unit_id,
      quantity, movement_type, created_by
    ) VALUES (
      v_doc_id, v_doc_line_id, v_line_item_id, p_origin_location_id, v_line_serial_id,
      -v_line_qty, 'assignment_out', v_caller_id
    );

    -- Entrada a cuadrilla
    INSERT INTO public.stock_movements (
      document_id, document_line_id, item_id, location_id, serial_unit_id,
      quantity, movement_type, created_by
    ) VALUES (
      v_doc_id, v_doc_line_id, v_line_item_id, p_crew_location_id, v_line_serial_id,
      v_line_qty, 'assignment_in', v_caller_id
    );

    IF v_line_serial_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET status = 'assigned_crew', current_location_id = p_crew_location_id, last_document_id = v_doc_id, updated_at = now()
      WHERE id = v_line_serial_id;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES ('documents', v_doc_id, 'ASSIGN_CREW', v_caller_id, jsonb_build_object('doc_number', v_doc_number));

  RETURN jsonb_build_object('success', true, 'document_id', v_doc_id, 'document_number', v_doc_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 4: Registrar Consumo de Campo (Exige ticket_ref y reason, < 30 segundos)
CREATE OR REPLACE FUNCTION public.rpc_consume_stock(
  p_crew_location_id UUID,
  p_ticket_ref TEXT,
  p_reason TEXT,
  p_lines JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_crew_loc RECORD;
  v_doc_number TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
  v_doc_line_id UUID;
BEGIN
  IF p_ticket_ref IS NULL OR length(trim(p_ticket_ref)) = 0 THEN
    RAISE EXCEPTION 'El número de ticket u orden de trabajo (OT) es obligatorio para registrar un consumo';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio para registrar un consumo de campo';
  END IF;

  SELECT * INTO v_crew_loc FROM public.locations WHERE id = p_crew_location_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ubicación de cuadrilla no encontrada'; END IF;

  v_doc_number := public.fn_generate_document_number(v_crew_loc.branch_id, 'consumption');

  INSERT INTO public.documents (
    document_type, document_number, branch_id, origin_location_id,
    status, ticket_ref, reason, notes, created_by, approved_by, approved_at
  ) VALUES (
    'consumption', v_doc_number, v_crew_loc.branch_id, p_crew_location_id,
    'APPROVED', trim(p_ticket_ref), trim(p_reason), p_notes, v_caller_id, v_caller_id, now()
  ) RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;

    INSERT INTO public.document_lines (
      document_id, item_id, quantity, serial_unit_id
    ) VALUES (
      v_doc_id, v_line_item_id, v_line_qty, v_line_serial_id
    ) RETURNING id INTO v_doc_line_id;

    -- Salida por consumo
    INSERT INTO public.stock_movements (
      document_id, document_line_id, item_id, location_id, serial_unit_id,
      quantity, movement_type, created_by
    ) VALUES (
      v_doc_id, v_doc_line_id, v_line_item_id, p_crew_location_id, v_line_serial_id,
      -v_line_qty, 'consumption', v_caller_id
    );

    IF v_line_serial_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET status = 'consumed', last_document_id = v_doc_id, updated_at = now()
      WHERE id = v_line_serial_id;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES ('documents', v_doc_id, 'CONSUME_STOCK', v_caller_id, jsonb_build_object('doc_number', v_doc_number, 'ticket', p_ticket_ref));

  RETURN jsonb_build_object('success', true, 'document_id', v_doc_id, 'document_number', v_doc_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 5: Anular Documento con Contra-Asiento Inmutable
CREATE OR REPLACE FUNCTION public.rpc_void_document(
  p_document_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_doc RECORD;
  v_movement RECORD;
BEGIN
  IF p_cancellation_reason IS NULL OR length(trim(p_cancellation_reason)) = 0 THEN
    RAISE EXCEPTION 'Debe especificar el motivo de la anulación';
  END IF;

  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;

  IF v_doc.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'El documento ya se encuentra anulado';
  END IF;

  -- Generar contra-asiento por cada movimiento original del documento
  FOR v_movement IN SELECT * FROM public.stock_movements WHERE document_id = p_document_id
  LOOP
    INSERT INTO public.stock_movements (
      document_id, document_line_id, item_id, location_id, serial_unit_id,
      quantity, movement_type, created_by
    ) VALUES (
      v_doc.id, v_movement.document_line_id, v_movement.item_id, v_movement.location_id, v_movement.serial_unit_id,
      -v_movement.quantity, 'void', v_caller_id
    );

    -- Restaurar estado del serial si aplica
    IF v_movement.serial_unit_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET status = 'in_stock', current_location_id = v_doc.origin_location_id, updated_at = now()
      WHERE id = v_movement.serial_unit_id;
    END IF;
  END LOOP;

  -- Actualizar documento a CANCELLED
  UPDATE public.documents
  SET status = 'CANCELLED',
      cancelled_by = v_caller_id,
      cancelled_at = now(),
      cancellation_reason = trim(p_cancellation_reason)
  WHERE id = p_document_id;

  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES ('documents', p_document_id, 'VOID_DOCUMENT', v_caller_id, jsonb_build_object('reason', p_cancellation_reason));

  RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper RLS functions
CREATE OR REPLACE FUNCTION public.fn_auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_auth_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_auth_crew_id()
RETURNS UUID AS $$
  SELECT crew_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies: branches
CREATE POLICY "superadmin_all_branches" ON public.branches
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_users_read_own_branch" ON public.branches
  FOR SELECT USING (id = public.fn_auth_branch_id());

-- Policies: locations
CREATE POLICY "superadmin_all_locations" ON public.locations
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_users_read_locations" ON public.locations
  FOR SELECT USING (branch_id = public.fn_auth_branch_id());

CREATE POLICY "admin_sucursal_manage_locations" ON public.locations
  FOR ALL USING (public.fn_auth_role() = 'admin_sucursal' AND branch_id = public.fn_auth_branch_id());

-- Policies: profiles
CREATE POLICY "superadmin_all_profiles" ON public.profiles
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "users_read_profiles" ON public.profiles
  FOR SELECT USING (branch_id = public.fn_auth_branch_id() OR id = auth.uid());

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Policies: items
CREATE POLICY "all_users_read_items" ON public.items
  FOR SELECT USING (true);

CREATE POLICY "superadmin_manage_items" ON public.items
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

-- Policies: serial_units
CREATE POLICY "superadmin_all_serials" ON public.serial_units
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_serials" ON public.serial_units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.locations l 
      WHERE l.id = serial_units.current_location_id AND l.branch_id = public.fn_auth_branch_id()
    )
  );

-- Policies: documents & lines
CREATE POLICY "superadmin_all_documents" ON public.documents
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_documents" ON public.documents
  FOR SELECT USING (
    branch_id = public.fn_auth_branch_id() OR
    destination_location_id IN (SELECT id FROM public.locations WHERE branch_id = public.fn_auth_branch_id())
  );

CREATE POLICY "superadmin_all_lines" ON public.document_lines
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_lines" ON public.document_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_lines.document_id AND (
        d.branch_id = public.fn_auth_branch_id() OR
        d.destination_location_id IN (SELECT id FROM public.locations WHERE branch_id = public.fn_auth_branch_id())
      )
    )
  );

-- Policies: stock_movements & stock_balances
CREATE POLICY "superadmin_all_movements" ON public.stock_movements
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_movements" ON public.stock_movements
  FOR SELECT USING (
    location_id IN (SELECT id FROM public.locations WHERE branch_id = public.fn_auth_branch_id())
  );

CREATE POLICY "superadmin_all_balances" ON public.stock_balances
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_balances" ON public.stock_balances
  FOR SELECT USING (
    location_id IN (SELECT id FROM public.locations WHERE branch_id = public.fn_auth_branch_id())
  );

-- Policies: material_requests
CREATE POLICY "superadmin_all_requests" ON public.material_requests
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "branch_read_requests" ON public.material_requests
  FOR SELECT USING (branch_id = public.fn_auth_branch_id());

CREATE POLICY "technician_insert_requests" ON public.material_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid() AND branch_id = public.fn_auth_branch_id()
  );

-- Policies: audit_log
CREATE POLICY "superadmin_read_audit" ON public.audit_log
  FOR SELECT USING (public.fn_auth_role() = 'superadmin');

CREATE POLICY "admin_branch_read_audit" ON public.audit_log
  FOR SELECT USING (public.fn_auth_role() = 'admin_sucursal');
