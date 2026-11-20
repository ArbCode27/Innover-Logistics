-- Performance indexes and RLS initplan.
-- Forward-only for the Supabase migration runner (it wraps this file in a
-- transaction, so indexes are created without CONCURRENTLY).
--
-- Rollback: run the block at the bottom of this file, under "ROLLBACK".
-- That block is commented out so applying this migration does not drop the
-- new indexes immediately.

create extension if not exists pg_trgm;

create index if not exists idx_stock_movements_created_at
  on public.stock_movements (created_at desc);

create index if not exists idx_stock_movements_location_created
  on public.stock_movements (location_id, created_at desc);

create index if not exists idx_documents_type_created
  on public.documents (document_type, created_at desc);

create index if not exists idx_documents_origin_location
  on public.documents (origin_location_id);

create index if not exists idx_documents_destination_location
  on public.documents (destination_location_id);

create index if not exists idx_document_lines_item
  on public.document_lines (item_id);

create index if not exists idx_stock_balances_item
  on public.stock_balances (item_id);

create index if not exists idx_items_name_trgm
  on public.items using gin (name gin_trgm_ops);

create index if not exists idx_items_sku_trgm
  on public.items using gin (sku gin_trgm_ops);

create index if not exists idx_items_description_trgm
  on public.items using gin (description gin_trgm_ops)
  where description is not null;

create index if not exists idx_serial_units_serial_trgm
  on public.serial_units using gin (serial_number gin_trgm_ops);

create index if not exists idx_serial_units_mac_trgm
  on public.serial_units using gin (mac_address gin_trgm_ops)
  where mac_address is not null;

-- Auth helpers: one lookup per statement, fixed search_path.
create or replace function public.fn_auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.fn_auth_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = (select auth.uid());
$$;

create or replace function public.fn_auth_crew_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select crew_id from public.profiles where id = (select auth.uid());
$$;

alter function public.fn_assert_available_stock(uuid, jsonb) set search_path = public;
alter function public.fn_generate_document_number(uuid, document_type) set search_path = public;
alter function public.fn_prevent_stock_movement_mutation() set search_path = public;
alter function public.fn_set_updated_at() set search_path = public;
alter function public.fn_sync_stock_balance() set search_path = public;
alter function public.rpc_accept_transfer(uuid, text, jsonb, text) set search_path = public;
alter function public.rpc_assign_to_crew(uuid, uuid, jsonb, text) set search_path = public;
alter function public.rpc_consume_stock(uuid, text, text, jsonb, text) set search_path = public;
alter function public.rpc_issue_dispatch_order(uuid, text, text, text, text, text, text, text, uuid, text, jsonb, uuid, uuid) set search_path = public;
alter function public.rpc_issue_transfer(uuid, uuid, jsonb, text, uuid) set search_path = public;
alter function public.rpc_register_local_purchase(uuid, uuid, numeric, text, text, text, text, text, text) set search_path = public;
alter function public.rpc_register_purchase(uuid, uuid, numeric, text, text, text, text, text) set search_path = public;
alter function public.rpc_review_document(uuid, text, uuid, text) set search_path = public;
alter function public.rpc_void_document(uuid, text) set search_path = public;

-- One SELECT policy per table. The old FOR ALL + FOR SELECT pair forced
-- Postgres to evaluate every permissive policy. Write rules stay the same:
-- superadmin, or admin_sucursal on their own branch where that already existed.
-- scan_sessions is unchanged (the phone pairing flow uses the public policy).

drop policy if exists superadmin_all_branches on public.branches;
drop policy if exists branch_users_read_own_branch on public.branches;
drop policy if exists branches_select on public.branches;
drop policy if exists branches_insert on public.branches;
drop policy if exists branches_update on public.branches;
drop policy if exists branches_delete on public.branches;

create policy branches_select on public.branches
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or id = (select public.fn_auth_branch_id())
  );
create policy branches_insert on public.branches
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy branches_update on public.branches
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy branches_delete on public.branches
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_locations on public.locations;
drop policy if exists branch_users_read_locations on public.locations;
drop policy if exists admin_sucursal_manage_locations on public.locations;
drop policy if exists locations_select on public.locations;
drop policy if exists locations_insert on public.locations;
drop policy if exists locations_update on public.locations;
drop policy if exists locations_delete on public.locations;

create policy locations_select on public.locations
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or branch_id = (select public.fn_auth_branch_id())
  );
create policy locations_insert on public.locations
  for insert with check (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy locations_update on public.locations
  for update
  using (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  )
  with check (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy locations_delete on public.locations
  for delete using (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );

drop policy if exists superadmin_all_profiles on public.profiles;
drop policy if exists users_read_profiles on public.profiles;
drop policy if exists users_update_own_profile on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_select on public.profiles
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or branch_id = (select public.fn_auth_branch_id())
    or id = (select auth.uid())
  );
create policy profiles_insert on public.profiles
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy profiles_update on public.profiles
  for update
  using (
    (select public.fn_auth_role()) = 'superadmin'
    or id = (select auth.uid())
  )
  with check (
    (select public.fn_auth_role()) = 'superadmin'
    or id = (select auth.uid())
  );
create policy profiles_delete on public.profiles
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists all_users_read_items on public.items;
drop policy if exists admins_manage_items on public.items;
drop policy if exists superadmin_manage_items on public.items;
drop policy if exists items_select on public.items;
drop policy if exists items_insert on public.items;
drop policy if exists items_update on public.items;
drop policy if exists items_delete on public.items;

create policy items_select on public.items
  for select using (true);
create policy items_insert on public.items
  for insert with check (
    (select public.fn_auth_role()) in ('superadmin', 'admin_sucursal')
  );
create policy items_update on public.items
  for update
  using ((select public.fn_auth_role()) in ('superadmin', 'admin_sucursal'))
  with check ((select public.fn_auth_role()) in ('superadmin', 'admin_sucursal'));
create policy items_delete on public.items
  for delete using (
    (select public.fn_auth_role()) in ('superadmin', 'admin_sucursal')
  );

drop policy if exists superadmin_all_serials on public.serial_units;
drop policy if exists branch_read_serials on public.serial_units;
drop policy if exists serial_units_select on public.serial_units;
drop policy if exists serial_units_insert on public.serial_units;
drop policy if exists serial_units_update on public.serial_units;
drop policy if exists serial_units_delete on public.serial_units;

create policy serial_units_select on public.serial_units
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or exists (
      select 1 from public.locations l
      where l.id = serial_units.current_location_id
        and l.branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy serial_units_insert on public.serial_units
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy serial_units_update on public.serial_units
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy serial_units_delete on public.serial_units
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_documents on public.documents;
drop policy if exists branch_read_documents on public.documents;
drop policy if exists documents_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_select on public.documents
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or branch_id = (select public.fn_auth_branch_id())
    or destination_location_id in (
      select id from public.locations
      where branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy documents_insert on public.documents
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy documents_update on public.documents
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy documents_delete on public.documents
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_lines on public.document_lines;
drop policy if exists branch_read_lines on public.document_lines;
drop policy if exists document_lines_select on public.document_lines;
drop policy if exists document_lines_insert on public.document_lines;
drop policy if exists document_lines_update on public.document_lines;
drop policy if exists document_lines_delete on public.document_lines;

create policy document_lines_select on public.document_lines
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or exists (
      select 1 from public.documents d
      where d.id = document_lines.document_id
        and (
          d.branch_id = (select public.fn_auth_branch_id())
          or d.destination_location_id in (
            select id from public.locations
            where branch_id = (select public.fn_auth_branch_id())
          )
        )
    )
  );
create policy document_lines_insert on public.document_lines
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy document_lines_update on public.document_lines
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy document_lines_delete on public.document_lines
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_movements on public.stock_movements;
drop policy if exists branch_read_movements on public.stock_movements;
drop policy if exists stock_movements_select on public.stock_movements;
drop policy if exists stock_movements_insert on public.stock_movements;
drop policy if exists stock_movements_update on public.stock_movements;
drop policy if exists stock_movements_delete on public.stock_movements;

create policy stock_movements_select on public.stock_movements
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or location_id in (
      select id from public.locations
      where branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy stock_movements_insert on public.stock_movements
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy stock_movements_update on public.stock_movements
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy stock_movements_delete on public.stock_movements
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_balances on public.stock_balances;
drop policy if exists branch_read_balances on public.stock_balances;
drop policy if exists stock_balances_select on public.stock_balances;
drop policy if exists stock_balances_insert on public.stock_balances;
drop policy if exists stock_balances_update on public.stock_balances;
drop policy if exists stock_balances_delete on public.stock_balances;

create policy stock_balances_select on public.stock_balances
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or location_id in (
      select id from public.locations
      where branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy stock_balances_insert on public.stock_balances
  for insert with check ((select public.fn_auth_role()) = 'superadmin');
create policy stock_balances_update on public.stock_balances
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy stock_balances_delete on public.stock_balances
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_all_requests on public.material_requests;
drop policy if exists branch_read_requests on public.material_requests;
drop policy if exists technician_insert_requests on public.material_requests;
drop policy if exists material_requests_select on public.material_requests;
drop policy if exists material_requests_insert on public.material_requests;
drop policy if exists material_requests_update on public.material_requests;
drop policy if exists material_requests_delete on public.material_requests;

create policy material_requests_select on public.material_requests
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or branch_id = (select public.fn_auth_branch_id())
  );
create policy material_requests_insert on public.material_requests
  for insert with check (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      requester_id = (select auth.uid())
      and branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy material_requests_update on public.material_requests
  for update
  using ((select public.fn_auth_role()) = 'superadmin')
  with check ((select public.fn_auth_role()) = 'superadmin');
create policy material_requests_delete on public.material_requests
  for delete using ((select public.fn_auth_role()) = 'superadmin');

drop policy if exists superadmin_read_audit on public.audit_log;
drop policy if exists admin_branch_read_audit on public.audit_log;
drop policy if exists audit_log_select on public.audit_log;

create policy audit_log_select on public.audit_log
  for select using (
    (select public.fn_auth_role()) in ('superadmin', 'admin_sucursal')
  );

drop policy if exists superadmin_all_technicians on public.technicians;
drop policy if exists branch_read_technicians on public.technicians;
drop policy if exists admin_sucursal_manage_technicians on public.technicians;
drop policy if exists technicians_select on public.technicians;
drop policy if exists technicians_insert on public.technicians;
drop policy if exists technicians_update on public.technicians;
drop policy if exists technicians_delete on public.technicians;

create policy technicians_select on public.technicians
  for select using (
    (select public.fn_auth_role()) = 'superadmin'
    or branch_id = (select public.fn_auth_branch_id())
  );
create policy technicians_insert on public.technicians
  for insert with check (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy technicians_update on public.technicians
  for update
  using (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  )
  with check (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );
create policy technicians_delete on public.technicians
  for delete using (
    (select public.fn_auth_role()) = 'superadmin'
    or (
      (select public.fn_auth_role()) = 'admin_sucursal'
      and branch_id = (select public.fn_auth_branch_id())
    )
  );

-- ROLLBACK
-- drop index if exists public.idx_stock_movements_created_at;
-- drop index if exists public.idx_stock_movements_location_created;
-- drop index if exists public.idx_documents_type_created;
-- drop index if exists public.idx_documents_origin_location;
-- drop index if exists public.idx_documents_destination_location;
-- drop index if exists public.idx_document_lines_item;
-- drop index if exists public.idx_stock_balances_item;
-- drop index if exists public.idx_items_name_trgm;
-- drop index if exists public.idx_items_sku_trgm;
-- drop index if exists public.idx_items_description_trgm;
-- drop index if exists public.idx_serial_units_serial_trgm;
-- drop index if exists public.idx_serial_units_mac_trgm;
-- Then re-apply the policies from
-- supabase/migrations/20261107000001_initial_schema.sql (section 7),
-- 20261110000001_remote_scan_and_purchases.sql (admins_manage_items)
-- and 20261119000002_approval_flow_and_technicians.sql (technicians).
-- Do not drop pg_trgm if another feature starts using it.
