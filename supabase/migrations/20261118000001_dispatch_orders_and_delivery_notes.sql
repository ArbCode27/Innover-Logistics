-- Migration: 20261118000001_dispatch_orders_and_delivery_notes.sql
-- Description: Agrega soporte completo para Órdenes de Salida Internas y Notas de Entrega con campos dinámicos (cliente vs obra/proyecto), kits y exportación.

-- 1. EXTENDER TABLA DOCUMENTS
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT 'client_job',
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_code TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS technician_name TEXT,
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receiver_mode TEXT DEFAULT 'warehouse_decides',
  ADD COLUMN IF NOT EXISTS delivery_note_number TEXT;

-- 2. ÍNDICES DE RENDIMIENTO PARA FILTROS DE HISTORIAL
CREATE INDEX IF NOT EXISTS idx_documents_work_type ON public.documents(work_type);
CREATE INDEX IF NOT EXISTS idx_documents_client_code ON public.documents(client_code);
CREATE INDEX IF NOT EXISTS idx_documents_project_name ON public.documents(project_name);
CREATE INDEX IF NOT EXISTS idx_documents_delivery_note ON public.documents(delivery_note_number);

-- 3. RPC TRANSACCIONAL: rpc_issue_dispatch_order
-- Emite la orden de salida / nota de entrega, descuenta stock de la ubicación seleccionada y actualiza seriales
CREATE OR REPLACE FUNCTION public.rpc_issue_dispatch_order(
  p_location_id UUID,
  p_work_type TEXT,
  p_reason TEXT,
  p_client_name TEXT DEFAULT NULL,
  p_client_code TEXT DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_technician_name TEXT DEFAULT NULL,
  p_receiver_mode TEXT DEFAULT 'warehouse_decides',
  p_technician_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_loc RECORD;
  v_doc_number TEXT;
  v_delivery_note_num TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
  v_doc_line_id UUID;
  v_current_stock NUMERIC(12, 2);
  v_item RECORD;
BEGIN
  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un almacén o ubicación de origen válida';
  END IF;

  SELECT * INTO v_loc FROM public.locations WHERE id = p_location_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación no encontrada';
  END IF;

  IF jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Debe registrar al menos un producto en la orden de salida';
  END IF;

  -- Generar números correlativos
  v_doc_number := public.fn_generate_document_number(v_loc.branch_id, 'consumption');
  v_delivery_note_num := 'NE-' || v_loc.code || '-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 8999 + 1000)::int)::text, 4, '0');

  INSERT INTO public.documents (
    document_type,
    document_number,
    branch_id,
    origin_location_id,
    status,
    ticket_ref,
    reason,
    notes,
    work_type,
    client_name,
    client_code,
    project_name,
    technician_name,
    technician_id,
    receiver_mode,
    delivery_note_number,
    created_by,
    approved_by,
    approved_at
  ) VALUES (
    'consumption',
    v_doc_number,
    v_loc.branch_id,
    p_location_id,
    'APPROVED',
    COALESCE(p_client_code, p_project_name, 'OT-S/N'),
    COALESCE(p_reason, 'Salida Interna'),
    p_notes,
    p_work_type,
    p_client_name,
    p_client_code,
    p_project_name,
    p_technician_name,
    p_technician_id,
    p_receiver_mode,
    v_delivery_note_num,
    COALESCE(v_caller_id, (SELECT id FROM public.profiles LIMIT 1)),
    COALESCE(v_caller_id, (SELECT id FROM public.profiles LIMIT 1)),
    now()
  ) RETURNING id INTO v_doc_id;

  -- Procesar líneas y registrar movimientos de stock
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;

    IF v_line_qty <= 0 THEN
      RAISE EXCEPTION 'La cantidad de salida debe ser mayor a 0';
    END IF;

    SELECT * INTO v_item FROM public.items WHERE id = v_line_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El producto seleccionado no existe';
    END IF;

    INSERT INTO public.document_lines (
      document_id,
      item_id,
      quantity,
      serial_unit_id
    ) VALUES (
      v_doc_id,
      v_line_item_id,
      v_line_qty,
      v_line_serial_id
    ) RETURNING id INTO v_doc_line_id;

    -- Movimiento negativo en el inventario inmutable
    INSERT INTO public.stock_movements (
      document_id,
      document_line_id,
      item_id,
      location_id,
      serial_unit_id,
      quantity,
      movement_type,
      created_by
    ) VALUES (
      v_doc_id,
      v_doc_line_id,
      v_line_item_id,
      p_location_id,
      v_line_serial_id,
      -v_line_qty,
      'consumption',
      COALESCE(v_caller_id, (SELECT id FROM public.profiles LIMIT 1))
    );

    -- Si se asignó un serial individual, actualizar su estado a 'consumed'
    IF v_line_serial_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET
        status = 'consumed',
        last_document_id = v_doc_id,
        updated_at = now()
      WHERE id = v_line_serial_id;
    END IF;
  END LOOP;

  -- Bitácora de auditoría
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    actor_id,
    new_data
  ) VALUES (
    'documents',
    v_doc_id,
    'ISSUE_DISPATCH_ORDER',
    COALESCE(v_caller_id, (SELECT id FROM public.profiles LIMIT 1)),
    jsonb_build_object(
      'document_number', v_doc_number,
      'delivery_note_number', v_delivery_note_num,
      'work_type', p_work_type,
      'client_name', p_client_name,
      'project_name', p_project_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'document_number', v_doc_number,
    'delivery_note_number', v_delivery_note_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
