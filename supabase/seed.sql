-- Seed Data for Star Conectados (Tv Star Satellite, C.A. / Innover)

-- 1. Insert Branches
INSERT INTO public.branches (id, code, name, address, phone, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'CCS', 'Sede Central Caracas', 'Av. Francisco de Miranda, Torre Star, Chacao, Caracas', '+58 212 900 1100', true),
  ('b0000000-0000-0000-0000-000000000002', 'MAR', 'Sucursal Maracaibo', 'Av. 5 de Julio con Av. 15 Las Delicias, Maracaibo, Zulia', '+58 261 700 2200', true),
  ('b0000000-0000-0000-0000-000000000003', 'VAL', 'Sucursal Valencia', 'Urb. El Viñedo, Av. Monseñor Adams, Valencia, Carabobo', '+58 241 800 3300', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Locations
INSERT INTO public.locations (id, branch_id, code, name, type, is_active)
VALUES
  -- Warehouses (Almacenes principales)
  ('l0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ALM-CCS', 'Almacén Central Caracas', 'branch', true),
  ('l0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'ALM-MAR', 'Almacén Principal Maracaibo', 'branch', true),
  ('l0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'ALM-VAL', 'Almacén Principal Valencia', 'branch', true),
  -- Technical Crews (Cuadrillas)
  ('l0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'CD-MAR-01', 'Cuadrilla 01 FTTH Maracaibo Norte', 'crew', true),
  ('l0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'CD-MAR-02', 'Cuadrilla 02 Averías Maracaibo Sur', 'crew', true),
  ('l0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000003', 'CD-VAL-01', 'Cuadrilla 01 Valencia Centro', 'crew', true),
  ('l0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000001', 'CD-CCS-01', 'Cuadrilla 01 Caracas Este', 'crew', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Items (Catálogo de telecomunicaciones)
INSERT INTO public.items (id, sku, name, description, category, unit, is_serialized, min_stock, is_active)
VALUES
  ('i0000000-0000-0000-0000-000000000001', 'FIB-DRP-001', 'Cable Fibra Óptica Drop 1 Hilo G.657A2', 'Fibra óptica drop autosoportada exterior con mensajero de acero', 'Fibra Óptica', 'metros', false, 1500, true),
  ('i0000000-0000-0000-0000-000000000002', 'BOB-DRP-1KM', 'Bobina Drop 1 Hilo 1000m', 'Bobina cerrada de cable drop monomodo para acometidas', 'Fibra Óptica', 'bobinas', false, 5, true),
  ('i0000000-0000-0000-0000-000000000003', 'BOB-ADSS-4KM', 'Bobina Fibra ADSS 12 Hilos 4km', 'Cable autosoportado dieléctrico para tendidos troncales', 'Fibra Óptica', 'bobinas', false, 2, true),
  ('i0000000-0000-0000-0000-000000000004', 'ONU-HUA-8310', 'ONU GPON Huawei EchoLife HG8310M', 'Terminal de red óptica 1GE Bridge para abonados residenciales', 'Equipos Activos', 'unidades', true, 20, true),
  ('i0000000-0000-0000-0000-000000000005', 'RTR-ZTE-F670L', 'Router Wi-Fi 6 ZTE ZXHN F670L', 'Gateway Dual Band Gigabit Wi-Fi 6 4 GE + 1 POTS', 'Equipos Activos', 'unidades', true, 15, true),
  ('i0000000-0000-0000-0000-000000000006', 'ONU-VSOL-2801', 'ONU XPON V-SOL V2801SG', 'Módem óptico compatible EPON/GPON 1GE Gigabit', 'Equipos Activos', 'unidades', true, 25, true),
  ('i0000000-0000-0000-0000-000000000007', 'HER-TEN-DRP', 'Tensor Tipo Gancho Abrazadera Drop', 'Herraje de sujeción para postes y acometidas de fibra drop', 'Ferretería y Pasivos', 'unidades', false, 300, true),
  ('i0000000-0000-0000-0000-000000000008', 'CON-RAP-SCAPC', 'Conector Rápido SC/APC Monomodo', 'Conector mecánico pre-pulido para armado rápido en campo', 'Ferretería y Pasivos', 'unidades', false, 200, true),
  ('i0000000-0000-0000-0000-000000000009', 'CIE-EMP-FOSC', 'Cierre de Empalme FOSC 24 Fibras', 'Caja de empalme domo estanca para distribución aérea/subterránea', 'Ferretería y Pasivos', 'unidades', false, 8, true),
  ('i0000000-0000-0000-0000-000000000010', 'SPL-PLC-1X8', 'Splitter Óptico PLC 1x8 SC/APC', 'Divisor óptico simétrico balanceado con conectores SC/APC', 'Ferretería y Pasivos', 'unidades', false, 30, true),
  ('i0000000-0000-0000-0000-000000000011', 'FLE-ACERO-34', 'Fleje de Acero Inoxidable 3/4', 'Cinta fleje metálica para fijación en postes de alumbrado', 'Ferretería y Pasivos', 'kilogramos', false, 40, true),
  ('i0000000-0000-0000-0000-000000000012', 'HEB-ACERO-34', 'Hebillas de Acero 3/4', 'Pares de hebillas de traba para fleje de acero', 'Ferretería y Pasivos', 'pares', false, 80, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Demo Profiles (Con vinculación a sedes y cuadrillas)
-- (Nota: En un entorno Supabase real, estos UUIDs corresponden a auth.users)
INSERT INTO public.profiles (id, email, full_name, phone, role, branch_id, crew_id, is_active)
VALUES
  ('u0000000-0000-0000-0000-000000000001', 'superadmin@tvstar.com', 'Carlos Mendoza', '+58 412 111 2233', 'superadmin', 'b0000000-0000-0000-0000-000000000001', null, true),
  ('u0000000-0000-0000-0000-000000000002', 'admin.maracaibo@tvstar.com', 'Mariana Rivas', '+58 414 222 3344', 'admin_sucursal', 'b0000000-0000-0000-0000-000000000002', null, true),
  ('u0000000-0000-0000-0000-000000000003', 'reportador.maracaibo@tvstar.com', 'Luis González', '+58 424 333 4455', 'reportador', 'b0000000-0000-0000-0000-000000000002', null, true),
  ('u0000000-0000-0000-0000-000000000004', 'tecnico.maracaibo@tvstar.com', 'José Pirela', '+58 416 444 5566', 'tecnico', 'b0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000010', true),
  ('u0000000-0000-0000-0000-000000000005', 'admin.valencia@tvstar.com', 'Andrés Pérez', '+58 412 555 6677', 'admin_sucursal', 'b0000000-0000-0000-0000-000000000003', null, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Sample Serial Units (ONUs y Routers en Maracaibo)
INSERT INTO public.serial_units (id, item_id, serial_number, mac_address, status, current_location_id)
VALUES
  -- Huawei HG8310M en Almacén Maracaibo
  ('s0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000004', '48575443A1B2C3D4', '00:1A:2B:3C:4D:01', 'in_stock', 'l0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000002', 'i0000000-0000-0000-0000-000000000004', '48575443A1B2C3D5', '00:1A:2B:3C:4D:02', 'in_stock', 'l0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000003', 'i0000000-0000-0000-0000-000000000004', '48575443A1B2C3D6', '00:1A:2B:3C:4D:03', 'in_stock', 'l0000000-0000-0000-0000-000000000002'),
  -- Huawei HG8310M en Cuadrilla 01 Maracaibo
  ('s0000000-0000-0000-0000-000000000004', 'i0000000-0000-0000-0000-000000000004', '48575443A1B2C3D7', '00:1A:2B:3C:4D:04', 'assigned_crew', 'l0000000-0000-0000-0000-000000000010'),
  ('s0000000-0000-0000-0000-000000000005', 'i0000000-0000-0000-0000-000000000004', '48575443A1B2C3D8', '00:1A:2B:3C:4D:05', 'assigned_crew', 'l0000000-0000-0000-0000-000000000010'),
  -- ZTE Router Wi-Fi 6 en Almacén Maracaibo
  ('s0000000-0000-0000-0000-000000000006', 'i0000000-0000-0000-0000-000000000005', 'ZTEGC98811223344', 'E8:65:D4:11:22:33', 'in_stock', 'l0000000-0000-0000-0000-000000000002'),
  ('s0000000-0000-0000-0000-000000000007', 'i0000000-0000-0000-0000-000000000005', 'ZTEGC98811223345', 'E8:65:D4:11:22:34', 'in_stock', 'l0000000-0000-0000-0000-000000000002'),
  -- ZTE Router Wi-Fi 6 en Almacén Central Caracas
  ('s0000000-0000-0000-0000-000000000008', 'i0000000-0000-0000-0000-000000000005', 'ZTEGC98811223346', 'E8:65:D4:11:22:35', 'in_stock', 'l0000000-0000-0000-0000-000000000001'),
  ('s0000000-0000-0000-0000-000000000009', 'i0000000-0000-0000-0000-000000000005', 'ZTEGC98811223347', 'E8:65:D4:11:22:36', 'in_stock', 'l0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Purchase Document & Stock Movements (Seed Initial Balances)
-- Documento de compra inicial en Almacén Maracaibo
INSERT INTO public.documents (
  id, document_type, document_number, branch_id, destination_location_id,
  status, notes, created_by, approved_by, approved_at
) VALUES (
  'd0000000-0000-0000-0000-000000000001', 'purchase', 'COM-MAR-000001',
  'b0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000002',
  'APPROVED', 'Carga inicial de inventario para apertura operativa',
  'u0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', now()
) ON CONFLICT (id) DO NOTHING;

-- Líneas de compra inicial
INSERT INTO public.document_lines (id, document_id, item_id, quantity, received_quantity)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000001', 3500.00, 3500.00), -- 3500m Drop
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000002', 8.00, 8.00),       -- 8 Bobinas
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000004', 50.00, 50.00),     -- 50 ONUs Huawei
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000005', 30.00, 30.00),     -- 30 Routers ZTE
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000007', 450.00, 450.00),   -- 450 Tensores
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000008', 500.00, 500.00)    -- 500 Conectores
ON CONFLICT (id) DO NOTHING;

-- Movimientos de ledger (El trigger creará o actualizará automáticamente stock_balances)
INSERT INTO public.stock_movements (
  document_id, document_line_id, item_id, location_id, quantity, movement_type, created_by
) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'i0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000002', 3500.00, 'purchase', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'i0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000002', 8.00, 'purchase', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'i0000000-0000-0000-0000-000000000004', 'l0000000-0000-0000-0000-000000000002', 50.00, 'purchase', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'i0000000-0000-0000-0000-000000000005', 'l0000000-0000-0000-0000-000000000002', 30.00, 'purchase', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'i0000000-0000-0000-0000-000000000007', 'l0000000-0000-0000-0000-000000000002', 450.00, 'purchase', 'u0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'i0000000-0000-0000-0000-000000000008', 'l0000000-0000-0000-0000-000000000002', 500.00, 'purchase', 'u0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;
