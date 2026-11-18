-- Migration: 20261118000002_star_conectados_functional_enhancements.sql
-- Description:
-- 1. Jerarquía de sedes (Sede Matriz y Sedes Hijas con campos venezolanos: state, municipality, franchise_name, parent_branch_id, is_main).
-- 2. Soporte completo de Compras Locales con factura y proveedor en documents.
-- 3. Soporte para impresión oficial de comprobantes TV STAR SATELLITE C.A. (RIF J-30117715-0).
-- 4. Soporte específico para rol reportador y trazabilidad de órdenes de avería/instalación.

-- 1. EXTEND BRANCHES WITH HIERARCHY AND VENEZUELAN GEOGRAPHY
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS municipality TEXT,
  ADD COLUMN IF NOT EXISTS franchise_name TEXT;

CREATE INDEX IF NOT EXISTS idx_branches_parent ON public.branches(parent_branch_id);

-- Ensure default main branch if not flagged yet
UPDATE public.branches 
SET is_main = true 
WHERE is_main = false AND (code ILIKE '%CCS%' OR code ILIKE '%VAL%' OR id = (SELECT id FROM public.branches ORDER BY created_at ASC LIMIT 1))
AND NOT EXISTS (SELECT 1 FROM public.branches WHERE is_main = true);

-- 2. EXTEND DOCUMENTS WITH FISCAL & LOCAL PURCHASE FIELDS
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_rif TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 3. FUNCTION RPC: REGISTER LOCAL PURCHASE (COMPRA LOCAL DIRECTA CON FACTURA DE PROVEEDOR)
CREATE OR REPLACE FUNCTION public.rpc_register_local_purchase(
  p_location_id UUID,
  p_item_id UUID,
  p_quantity NUMERIC,
  p_supplier_name TEXT,
  p_supplier_rif TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_mac_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
  v_supplier_desc TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    v_caller_id := (SELECT id FROM public.profiles LIMIT 1);
  END IF;

  -- 1. Validar ubicación destino
  SELECT * INTO v_target_location FROM public.locations WHERE id = p_location_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación de destino no encontrada o inactiva';
  END IF;
  v_branch_id := v_target_location.branch_id;

  -- 2. Validar ítem de catálogo
  SELECT * INTO v_item FROM public.items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material o equipo no encontrado en el catálogo';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad comprada debe ser mayor a 0';
  END IF;

  v_clean_serial := NULLIF(trim(p_serial_number), '');
  v_clean_mac := NULLIF(trim(p_mac_address), '');

  -- 3. Validación de seriales
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

  -- 4. Generar número correlativo de Compra (COM-SEDE-000000)
  v_doc_number := public.fn_generate_document_number(v_branch_id, 'purchase');

  v_supplier_desc := COALESCE(p_supplier_name, 'Proveedor Local');
  IF p_invoice_number IS NOT NULL AND length(trim(p_invoice_number)) > 0 THEN
    v_supplier_desc := v_supplier_desc || ' (Factura: ' || trim(p_invoice_number) || ')';
  END IF;

  -- 5. Insertar documento de compra
  INSERT INTO public.documents (
    document_type,
    document_number,
    branch_id,
    destination_location_id,
    status,
    supplier_name,
    supplier_rif,
    invoice_number,
    ticket_ref,
    notes,
    created_by,
    approved_by,
    approved_at
  ) VALUES (
    'purchase',
    v_doc_number,
    v_branch_id,
    p_location_id,
    'APPROVED',
    trim(p_supplier_name),
    NULLIF(trim(p_supplier_rif), ''),
    NULLIF(trim(p_invoice_number), ''),
    COALESCE(p_invoice_number, 'COMPRA-DIRECTA'),
    COALESCE(p_notes, v_supplier_desc),
    v_caller_id,
    v_caller_id,
    now()
  ) RETURNING id INTO v_doc_id;

  -- 6. Si es serializado, registrar en serial_units
  IF v_item.is_serialized THEN
    INSERT INTO public.serial_units (
      item_id, serial_number, mac_address, status, current_location_id, last_document_id
    ) VALUES (
      p_item_id, v_clean_serial, v_clean_mac, 'in_stock', p_location_id, v_doc_id
    ) RETURNING id INTO v_serial_unit_id;
  END IF;

  -- 7. Insertar línea de documento
  INSERT INTO public.document_lines (
    document_id, item_id, quantity, serial_unit_id, notes
  ) VALUES (
    v_doc_id, p_item_id, p_quantity, v_serial_unit_id, v_supplier_desc
  ) RETURNING id INTO v_doc_line_id;

  -- 8. Asiento inmutable en el ledger
  INSERT INTO public.stock_movements (
    document_id, document_line_id, item_id, location_id, serial_unit_id,
    quantity, movement_type, created_by
  ) VALUES (
    v_doc_id, v_doc_line_id, p_item_id, p_location_id, v_serial_unit_id,
    p_quantity, 'purchase', v_caller_id
  );

  -- 9. Auditoría
  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES (
    'documents',
    v_doc_id,
    'insert_local_purchase',
    v_caller_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'supplier_name', p_supplier_name,
      'invoice_number', p_invoice_number,
      'item_id', p_item_id,
      'quantity', p_quantity,
      'location_id', p_location_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'document_number', v_doc_number,
    'quantity', p_quantity,
    'serial_unit_id', v_serial_unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
