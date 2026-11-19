-- Aprobación de salidas y traslados por el administrador general,
-- y catálogo de técnicos que reciben material.

-- 1. Catálogo de técnicos (persona que retira material, no necesariamente una cuenta)
CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  phone TEXT,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_technicians_document_id UNIQUE (document_id),
  CONSTRAINT chk_technicians_full_name CHECK (length(trim(full_name)) >= 3),
  CONSTRAINT chk_technicians_document_id CHECK (length(trim(document_id)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_technicians_branch ON public.technicians(branch_id);
CREATE INDEX IF NOT EXISTS idx_technicians_active ON public.technicians(is_active);

DROP TRIGGER IF EXISTS trg_technicians_updated_at ON public.technicians;
CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_all_technicians" ON public.technicians;
CREATE POLICY "superadmin_all_technicians" ON public.technicians
  FOR ALL USING (public.fn_auth_role() = 'superadmin');

DROP POLICY IF EXISTS "branch_read_technicians" ON public.technicians;
CREATE POLICY "branch_read_technicians" ON public.technicians
  FOR SELECT USING (branch_id = public.fn_auth_branch_id());

DROP POLICY IF EXISTS "admin_sucursal_manage_technicians" ON public.technicians;
CREATE POLICY "admin_sucursal_manage_technicians" ON public.technicians
  FOR ALL USING (
    public.fn_auth_role() = 'admin_sucursal'
    AND branch_id = public.fn_auth_branch_id()
  );

-- 2. Documento: técnico asignado y nota de la revisión
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_pending_approval
  ON public.documents(status)
  WHERE status = 'PENDING_APPROVAL';

CREATE INDEX IF NOT EXISTS idx_documents_assigned_technician
  ON public.documents(assigned_technician_id);

-- 3. Disponibilidad real = saldo menos lo ya comprometido en órdenes sin aprobar
CREATE OR REPLACE FUNCTION public.fn_assert_available_stock(
  p_location_id UUID,
  p_lines JSONB
)
RETURNS VOID AS $$
DECLARE
  v_item_id UUID;
  v_requested NUMERIC(12, 2);
  v_balance NUMERIC(12, 2);
  v_committed NUMERIC(12, 2);
  v_serial UUID;
  v_line JSONB;
BEGIN
  FOR v_item_id, v_requested IN
    SELECT (elem->>'item_id')::UUID, SUM((elem->>'quantity')::NUMERIC)
    FROM jsonb_array_elements(p_lines) AS elem
    GROUP BY 1
  LOOP
    SELECT quantity INTO v_balance
    FROM public.stock_balances
    WHERE location_id = p_location_id AND item_id = v_item_id;

    IF NOT FOUND THEN
      v_balance := 0;
    END IF;

    SELECT COALESCE(SUM(dl.quantity), 0) INTO v_committed
    FROM public.document_lines dl
    JOIN public.documents d ON d.id = dl.document_id
    WHERE d.status = 'PENDING_APPROVAL'
      AND d.origin_location_id = p_location_id
      AND dl.item_id = v_item_id;

    IF v_balance - v_committed < v_requested THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: no hay cantidad disponible considerando órdenes pendientes de aprobación';
    END IF;
  END LOOP;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_serial := NULLIF(v_line->>'serial_unit_id', '')::UUID;
    IF v_serial IS NULL THEN
      CONTINUE;
    END IF;

    PERFORM 1
    FROM public.serial_units
    WHERE id = v_serial
      AND current_location_id = p_location_id
      AND status = 'in_stock';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El serial seleccionado no está disponible en el almacén de origen';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Emitir orden de salida: registra y reserva, sin descontar stock
DROP FUNCTION IF EXISTS public.rpc_issue_dispatch_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);

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
  p_lines JSONB DEFAULT '[]'::jsonb,
  p_actor_id UUID DEFAULT NULL,
  p_assigned_technician_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := COALESCE(p_actor_id, auth.uid());
  v_actor RECORD;
  v_loc RECORD;
  v_tech RECORD;
  v_tech_id UUID := COALESCE(p_assigned_technician_id, p_technician_id);
  v_doc_number TEXT;
  v_delivery_note_num TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar al usuario responsable de la emisión. Verifique su sesión activa.';
  END IF;

  SELECT * INTO v_actor
  FROM public.profiles
  WHERE id = v_actor_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario que emite la orden no tiene un perfil activo';
  END IF;

  IF v_actor.role NOT IN ('superadmin', 'admin_sucursal') THEN
    RAISE EXCEPTION 'Solo el encargado de almacén puede emitir esta orden';
  END IF;

  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un almacén o ubicación de origen válida';
  END IF;

  SELECT * INTO v_loc FROM public.locations WHERE id = p_location_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación no encontrada';
  END IF;

  IF v_actor.role = 'admin_sucursal' AND v_actor.branch_id IS DISTINCT FROM v_loc.branch_id THEN
    RAISE EXCEPTION 'Solo puede emitir órdenes del almacén de su sede';
  END IF;

  IF jsonb_array_length(COALESCE(p_lines, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Debe registrar al menos un producto en la orden de salida';
  END IF;

  IF v_tech_id IS NULL THEN
    RAISE EXCEPTION 'Debe asignar el técnico que recibe el material';
  END IF;

  SELECT * INTO v_tech
  FROM public.technicians
  WHERE id = v_tech_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El técnico seleccionado no existe o está inactivo';
  END IF;

  IF v_tech.branch_id <> v_loc.branch_id THEN
    RAISE EXCEPTION 'El técnico debe pertenecer a la sede del almacén de origen';
  END IF;

  PERFORM public.fn_assert_available_stock(p_location_id, p_lines);

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
    assigned_technician_id,
    receiver_mode,
    delivery_note_number,
    created_by
  ) VALUES (
    'consumption',
    v_doc_number,
    v_loc.branch_id,
    p_location_id,
    'PENDING_APPROVAL',
    COALESCE(p_client_code, p_project_name, 'OT-S/N'),
    COALESCE(p_reason, 'Salida Interna'),
    p_notes,
    p_work_type,
    p_client_name,
    p_client_code,
    p_project_name,
    v_tech.full_name,
    v_tech.id,
    COALESCE(p_receiver_mode, 'warehouse_decides'),
    v_delivery_note_num,
    v_actor_id
  ) RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;

    IF v_line_qty <= 0 THEN
      RAISE EXCEPTION 'La cantidad de salida debe ser mayor a 0';
    END IF;

    PERFORM 1 FROM public.items WHERE id = v_line_item_id;
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
    );

    IF v_line_serial_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET
        status = 'reserved',
        last_document_id = v_doc_id,
        updated_at = now()
      WHERE id = v_line_serial_id
        AND current_location_id = p_location_id
        AND status = 'in_stock';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El serial seleccionado no está disponible en el almacén de origen';
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    actor_id,
    new_data
  ) VALUES (
    'documents',
    v_doc_id,
    'SUBMIT_DISPATCH_ORDER',
    v_actor_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'delivery_note_number', v_delivery_note_num,
      'status', 'PENDING_APPROVAL',
      'technician_name', v_tech.full_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'document_number', v_doc_number,
    'delivery_note_number', v_delivery_note_num,
    'status', 'PENDING_APPROVAL'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Emitir traslado: registra y reserva, sin sacar stock del origen
DROP FUNCTION IF EXISTS public.rpc_issue_transfer(UUID, UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.rpc_issue_transfer(
  p_origin_location_id UUID,
  p_destination_location_id UUID,
  p_lines JSONB,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := COALESCE(p_actor_id, auth.uid());
  v_actor RECORD;
  v_origin_loc RECORD;
  v_dest_loc RECORD;
  v_doc_number TEXT;
  v_doc_id UUID;
  v_line JSONB;
  v_line_item_id UUID;
  v_line_qty NUMERIC(12, 2);
  v_line_serial_id UUID;
  v_line_notes TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar al usuario responsable de la emisión. Verifique su sesión activa.';
  END IF;

  SELECT * INTO v_actor
  FROM public.profiles
  WHERE id = v_actor_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario que emite la orden no tiene un perfil activo';
  END IF;

  IF v_actor.role NOT IN ('superadmin', 'admin_sucursal') THEN
    RAISE EXCEPTION 'Solo el encargado de almacén puede emitir este traslado';
  END IF;

  SELECT * INTO v_origin_loc
  FROM public.locations
  WHERE id = p_origin_location_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación origen no encontrada o inactiva';
  END IF;

  SELECT * INTO v_dest_loc
  FROM public.locations
  WHERE id = p_destination_location_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ubicación destino no encontrada o inactiva';
  END IF;

  IF v_origin_loc.branch_id = v_dest_loc.branch_id THEN
    RAISE EXCEPTION 'La transferencia entre sedes requiere que origen y destino pertenezcan a sucursales diferentes';
  END IF;

  IF v_actor.role = 'admin_sucursal' AND v_actor.branch_id IS DISTINCT FROM v_origin_loc.branch_id THEN
    RAISE EXCEPTION 'Solo puede emitir traslados desde el almacén de su sede';
  END IF;

  IF jsonb_array_length(COALESCE(p_lines, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos un producto al traslado.';
  END IF;

  PERFORM public.fn_assert_available_stock(p_origin_location_id, p_lines);

  v_doc_number := public.fn_generate_document_number(v_origin_loc.branch_id, 'transfer');

  INSERT INTO public.documents (
    document_type,
    document_number,
    branch_id,
    origin_location_id,
    destination_location_id,
    status,
    notes,
    created_by
  ) VALUES (
    'transfer',
    v_doc_number,
    v_origin_loc.branch_id,
    p_origin_location_id,
    p_destination_location_id,
    'PENDING_APPROVAL',
    p_notes,
    v_actor_id
  ) RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_item_id := (v_line->>'item_id')::UUID;
    v_line_qty := (v_line->>'quantity')::NUMERIC;
    v_line_serial_id := NULLIF(v_line->>'serial_unit_id', '')::UUID;
    v_line_notes := v_line->>'notes';

    IF v_line_qty <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a 0 para el ítem %', v_line_item_id;
    END IF;

    INSERT INTO public.document_lines (
      document_id,
      item_id,
      quantity,
      serial_unit_id,
      notes
    ) VALUES (
      v_doc_id,
      v_line_item_id,
      v_line_qty,
      v_line_serial_id,
      v_line_notes
    );

    IF v_line_serial_id IS NOT NULL THEN
      UPDATE public.serial_units
      SET
        status = 'reserved',
        last_document_id = v_doc_id,
        updated_at = now()
      WHERE id = v_line_serial_id
        AND current_location_id = p_origin_location_id
        AND status = 'in_stock';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El serial % no se encuentra disponible en stock en el origen', v_line_serial_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES (
    'documents',
    v_doc_id,
    'SUBMIT_TRANSFER',
    v_actor_id,
    jsonb_build_object('doc_number', v_doc_number, 'status', 'PENDING_APPROVAL')
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'document_number', v_doc_number,
    'status', 'PENDING_APPROVAL'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. El administrador general aprueba (mueve stock) o rechaza (libera reservas)
CREATE OR REPLACE FUNCTION public.rpc_review_document(
  p_document_id UUID,
  p_action TEXT,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := COALESCE(p_actor_id, auth.uid());
  v_actor RECORD;
  v_doc RECORD;
  v_line RECORD;
  v_next_status TEXT;
BEGIN
  IF p_action NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'La acción de revisión no es válida';
  END IF;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar al usuario responsable de la emisión. Verifique su sesión activa.';
  END IF;

  SELECT * INTO v_actor
  FROM public.profiles
  WHERE id = v_actor_id AND is_active = true;

  IF NOT FOUND OR v_actor.role <> 'superadmin' THEN
    RAISE EXCEPTION 'Solo el administrador general puede aprobar o rechazar esta orden';
  END IF;

  SELECT * INTO v_doc
  FROM public.documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  IF v_doc.document_type NOT IN ('consumption', 'transfer') THEN
    RAISE EXCEPTION 'Este documento no requiere esta aprobación';
  END IF;

  IF v_doc.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION 'La orden no está pendiente de aprobación';
  END IF;

  IF v_doc.created_by = v_actor_id THEN
    RAISE EXCEPTION 'Quien emite la orden no puede aprobarla';
  END IF;

  IF p_action = 'REJECT' THEN
    IF p_notes IS NULL OR length(trim(p_notes)) < 3 THEN
      RAISE EXCEPTION 'Indique el motivo del rechazo';
    END IF;

    FOR v_line IN
      SELECT * FROM public.document_lines WHERE document_id = p_document_id
    LOOP
      IF v_line.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET status = 'in_stock', updated_at = now()
        WHERE id = v_line.serial_unit_id
          AND status = 'reserved';
      END IF;
    END LOOP;

    UPDATE public.documents
    SET
      status = 'REJECTED',
      approved_by = v_actor_id,
      approved_at = now(),
      review_notes = trim(p_notes)
    WHERE id = p_document_id;

    INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
    VALUES (
      'documents',
      p_document_id,
      CASE WHEN v_doc.document_type = 'consumption' THEN 'REJECT_DISPATCH_ORDER' ELSE 'REJECT_TRANSFER_APPROVAL' END,
      v_actor_id,
      jsonb_build_object('status', 'REJECTED', 'review_notes', trim(p_notes))
    );

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
  END IF;

  FOR v_line IN
    SELECT * FROM public.document_lines WHERE document_id = p_document_id
  LOOP
    IF v_doc.document_type = 'consumption' THEN
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
        v_doc.id,
        v_line.id,
        v_line.item_id,
        v_doc.origin_location_id,
        v_line.serial_unit_id,
        -v_line.quantity,
        'consumption',
        v_actor_id
      );

      IF v_line.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET
          status = 'consumed',
          last_document_id = v_doc.id,
          updated_at = now()
        WHERE id = v_line.serial_unit_id
          AND status = 'reserved';

        IF NOT FOUND THEN
          RAISE EXCEPTION 'El serial reservado ya no está disponible para despachar';
        END IF;
      END IF;
    ELSE
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
        v_doc.id,
        v_line.id,
        v_line.item_id,
        v_doc.origin_location_id,
        v_line.serial_unit_id,
        -v_line.quantity,
        'transfer_out',
        v_actor_id
      );

      IF v_line.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET
          status = 'in_transit',
          last_document_id = v_doc.id,
          updated_at = now()
        WHERE id = v_line.serial_unit_id
          AND status = 'reserved';

        IF NOT FOUND THEN
          RAISE EXCEPTION 'El serial reservado ya no está disponible para trasladar';
        END IF;
      END IF;
    END IF;
  END LOOP;

  v_next_status := CASE
    WHEN v_doc.document_type = 'consumption' THEN 'APPROVED'
    ELSE 'PENDING'
  END;

  UPDATE public.documents
  SET
    status = v_next_status::public.document_status,
    approved_by = v_actor_id,
    approved_at = now(),
    review_notes = NULLIF(trim(COALESCE(p_notes, '')), '')
  WHERE id = p_document_id;

  INSERT INTO public.audit_log (table_name, record_id, action, actor_id, new_data)
  VALUES (
    'documents',
    p_document_id,
    CASE WHEN v_doc.document_type = 'consumption' THEN 'APPROVE_DISPATCH_ORDER' ELSE 'APPROVE_TRANSFER' END,
    v_actor_id,
    jsonb_build_object('status', v_next_status)
  );

  RETURN jsonb_build_object('success', true, 'status', v_next_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Anular una orden que todavía no movió stock también libera los seriales reservados
CREATE OR REPLACE FUNCTION public.rpc_void_document(
  p_document_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_doc RECORD;
  v_movement RECORD;
  v_line RECORD;
BEGIN
  IF p_cancellation_reason IS NULL OR length(trim(p_cancellation_reason)) = 0 THEN
    RAISE EXCEPTION 'Debe especificar el motivo de la anulación';
  END IF;

  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;

  IF v_doc.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'El documento ya se encuentra anulado';
  END IF;

  IF v_doc.status = 'PENDING_APPROVAL' THEN
    FOR v_line IN
      SELECT * FROM public.document_lines WHERE document_id = p_document_id
    LOOP
      IF v_line.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET status = 'in_stock', updated_at = now()
        WHERE id = v_line.serial_unit_id
          AND status = 'reserved';
      END IF;
    END LOOP;
  ELSE
    FOR v_movement IN SELECT * FROM public.stock_movements WHERE document_id = p_document_id
    LOOP
      INSERT INTO public.stock_movements (
        document_id, document_line_id, item_id, location_id, serial_unit_id,
        quantity, movement_type, created_by
      ) VALUES (
        v_doc.id, v_movement.document_line_id, v_movement.item_id, v_movement.location_id, v_movement.serial_unit_id,
        -v_movement.quantity, 'void', v_caller_id
      );

      IF v_movement.serial_unit_id IS NOT NULL THEN
        UPDATE public.serial_units
        SET status = 'in_stock', current_location_id = v_doc.origin_location_id, updated_at = now()
        WHERE id = v_movement.serial_unit_id;
      END IF;
    END LOOP;
  END IF;

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
