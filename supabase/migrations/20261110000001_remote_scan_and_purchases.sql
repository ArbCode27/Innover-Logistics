-- Migration: 20261110000001_remote_scan_and_purchases.sql
-- Description: Adds product image_url, scan_sessions for phone pairing, rpc_register_purchase, and admin catalog policies

-- 1. ADD IMAGE_URL TO ITEMS (ONE PHOTO PER PRODUCT TYPE)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. UPDATE POLICIES FOR CATALOG CREATION (SUPERADMIN & ADMIN_SUCURSAL)
DROP POLICY IF EXISTS "superadmin_manage_items" ON public.items;
CREATE POLICY "admins_manage_items" ON public.items
  FOR ALL USING (public.fn_auth_role() IN ('superadmin', 'admin_sucursal'));

-- 3. SCAN SESSIONS FOR PHONE-PC PAIRING
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  default_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting_device' CHECK (status IN ('waiting_device', 'connected', 'scanning', 'closed', 'expired')),
  device_info JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '4 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_token ON public.scan_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status ON public.scan_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_created_by ON public.scan_sessions(created_by);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their scan sessions
CREATE POLICY "users_manage_own_scan_sessions" ON public.scan_sessions
  FOR ALL USING (created_by = auth.uid());

-- Allow phone connection via valid unexpired token without requiring phone login
CREATE POLICY "public_access_scan_session_by_token" ON public.scan_sessions
  FOR SELECT USING (expires_at > now());

CREATE POLICY "public_update_scan_session_status" ON public.scan_sessions
  FOR UPDATE USING (expires_at > now());

-- Realtime publication for scan_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'scan_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_sessions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. INDEXES FOR FAST SERIAL & MAC LOOKUPS
CREATE INDEX IF NOT EXISTS idx_serial_units_mac ON public.serial_units(mac_address);
CREATE INDEX IF NOT EXISTS idx_serial_units_serial_text ON public.serial_units(serial_number);

-- 5. ATOMIC RPC: REGISTER PURCHASE (COMPRA / ENTRADA DE PROVEEDOR)
CREATE OR REPLACE FUNCTION public.rpc_register_purchase(
  p_location_id UUID,
  p_item_id UUID,
  p_quantity NUMERIC,
  p_serial_number TEXT DEFAULT NULL,
  p_mac_address TEXT DEFAULT NULL,
  p_ticket_ref TEXT DEFAULT NULL,
  p_supplier_notes TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_location RECORD;
  v_item RECORD;
  v_branch_id UUID;
  v_doc_number TEXT;
  v_doc_id UUID;
  v_doc_line_id UUID;
  v_serial_unit_id UUID := NULL;
  v_clean_serial TEXT;
  v_clean_mac TEXT;
BEGIN
  -- Fallback de usuario si no está en contexto auth directo
  IF v_caller_id IS NULL THEN
    v_caller_id := (SELECT id FROM public.profiles LIMIT 1);
  END IF;

  -- Validar ubicación destino
  SELECT * INTO v_target_location FROM public.locations WHERE id = p_location_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación destino no encontrada o inactiva';
  END IF;
  v_branch_id := v_target_location.branch_id;

  -- Validar ítem de catálogo
  SELECT * INTO v_item FROM public.items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ítem no encontrado o inactivo en el catálogo';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;

  v_clean_serial := NULLIF(trim(p_serial_number), '');
  v_clean_mac := NULLIF(trim(p_mac_address), '');

  -- Si es un equipo serializado, verificar unicidad de serial
  IF v_item.is_serialized THEN
    IF v_clean_serial IS NULL THEN
      RAISE EXCEPTION 'El número de serial es obligatorio para productos serializados';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.serial_units 
      WHERE item_id = p_item_id AND LOWER(serial_number) = LOWER(v_clean_serial)
    ) THEN
      RAISE EXCEPTION 'El serial "%" ya se encuentra registrado en el sistema para este producto', v_clean_serial;
    END IF;
  END IF;

  -- Generar número correlativo de Compra (COM-SEDE-000000)
  v_doc_number := public.fn_generate_document_number(v_branch_id, 'purchase');

  -- Insertar documento de compra aprobado
  INSERT INTO public.documents (
    document_type, document_number, branch_id, destination_location_id,
    status, ticket_ref, notes, created_by, approved_by, approved_at
  ) VALUES (
    'purchase', v_doc_number, v_branch_id, p_location_id,
    'APPROVED', p_ticket_ref, p_supplier_notes, v_caller_id, v_caller_id, now()
  ) RETURNING id INTO v_doc_id;

  -- Si es serializado, registrar la unidad con Serial + MAC simultáneo
  IF v_item.is_serialized THEN
    INSERT INTO public.serial_units (
      item_id, serial_number, mac_address, status, current_location_id, last_document_id
    ) VALUES (
      p_item_id, v_clean_serial, v_clean_mac, 'in_stock', p_location_id, v_doc_id
    ) RETURNING id INTO v_serial_unit_id;
  END IF;

  -- Insertar línea de documento
  INSERT INTO public.document_lines (
    document_id, item_id, quantity, serial_unit_id, notes
  ) VALUES (
    v_doc_id, p_item_id, p_quantity, v_serial_unit_id, p_supplier_notes
  ) RETURNING id INTO v_doc_line_id;

  -- Registrar en ledger inmutable (stock_movements)
  -- El trigger sincroniza automáticamente stock_balances
  INSERT INTO public.stock_movements (
    document_id, document_line_id, item_id, location_id, serial_unit_id,
    quantity, movement_type, created_by
  ) VALUES (
    v_doc_id, v_doc_line_id, p_item_id, p_location_id, v_serial_unit_id,
    p_quantity, 'purchase', v_caller_id
  );

  -- Si se suministró foto y el ítem aún no tiene foto de catálogo, guardarla (1 foto por tipo)
  IF p_image_url IS NOT NULL AND length(trim(p_image_url)) > 0 THEN
    UPDATE public.items
    SET image_url = p_image_url, updated_at = now()
    WHERE id = p_item_id AND (image_url IS NULL OR length(trim(image_url)) = 0);
  END IF;

  -- Registrar auditoría
  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES (
    'documents', v_doc_id, 'REGISTER_PURCHASE', v_caller_id,
    jsonb_build_object(
      'doc_number', v_doc_number,
      'item_id', p_item_id,
      'serial', v_clean_serial,
      'mac', v_clean_mac,
      'quantity', p_quantity,
      'location_id', p_location_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'document_number', v_doc_number,
    'serial_unit_id', v_serial_unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
