-- ============================================================
-- Sonkhela SaaS: Multi-Tenant Migration, Stage 1 (based on the June draft)
--
-- WHAT THIS DOES
--   * Adds packages / tenants / tenant_users
--   * Makes Sonkhela Soft Loans "Tenant #1" on the Full Suite, active, no expiry
--   * Adds tenant_id to loans, settled_loans, business, sms_logs, applications
--     and stamps every existing row with Sonkhela's tenant id
--   * Links every existing login (auth.users) to Sonkhela as owner
--   * Adds RESTRICTIVE tenant-isolation policies for logged-in users
--
-- WHY IT IS SAFE FOR THE LIVE SYSTEM
--   * Nothing is dropped or renamed. Your existing RLS policies stay as they are.
--   * The new policies are RESTRICTIVE and only apply to logged-in users, so the
--     public website (anon: new applications, tracking, blog) behaves exactly as now.
--   * Crons and API routes use the service-role key, which bypasses RLS.
--   * New rows get tenant_id automatically: the logged-in user's tenant, or
--     Sonkhela when there is no logged-in user (website, crons).
--
-- HOW TO RUN
--   1. Supabase > Database > Backups: confirm a recent backup exists.
--   2. Supabase > SQL Editor: paste this whole file and Run. It runs as one
--      transaction, so if anything fails, nothing is changed.
--   3. Run the checks in 001_verify.sql.
-- ============================================================

begin;

-- ---------- 1. PACKAGES (June draft) ----------
create table if not exists public.packages (
  id smallint primary key,
  name text not null,
  monthly_price numeric not null default 0,
  can_sms_reminders boolean not null default false,
  can_custom_messaging boolean not null default false,
  can_weekly_quotes boolean not null default false
);

insert into public.packages (id, name, monthly_price, can_sms_reminders, can_custom_messaging, can_weekly_quotes)
values
  (1, 'Core',             0, false, false, false),
  (2, 'Core + Reminders', 0, true,  false, false),
  (3, 'Full Suite',       0, true,  true,  true)
on conflict (id) do nothing;
-- Set prices later: update packages set monthly_price = 350 where id = 1; etc.

-- ---------- 2. TENANTS ----------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                         -- subdomain, e.g. 'eden' -> eden.sonkhela.com
  business_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  package_id smallint not null default 1 references public.packages(id),
  status text not null default 'trial'
    check (status in ('trial','active','grace','suspended','cancelled')),
  subscription_start date,
  subscription_end date,                    -- null = never expires
  at_username text,                         -- per-tenant Africa's Talking (Option A)
  at_api_key text,
  at_sender_id text,
  created_at timestamptz not null default now()
);

-- Sonkhela = Tenant #1 (fixed id so code and defaults can refer to it)
insert into public.tenants (id, slug, business_name, package_id, status, subscription_start, at_sender_id)
values ('00000000-0000-0000-0000-000000000001', 'admin', 'Sonkhela Soft Loans', 3, 'active', current_date, 'SONKHELA')
on conflict (id) do nothing;

-- ---------- 3. TENANT USERS ----------
create table if not exists public.tenant_users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

-- Every login that exists today belongs to Sonkhela
insert into public.tenant_users (id, tenant_id, role)
select u.id, '00000000-0000-0000-0000-000000000001', 'owner'
from auth.users u
on conflict (id) do nothing;

-- ---------- 4. HELPER FUNCTIONS ----------
-- Tenant of the logged-in user (null for anon / service role)
create or replace function public.auth_tenant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_users where id = auth.uid()
$$;

-- Used as the column default: logged-in user's tenant, else Sonkhela
create or replace function public.default_tenant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_tenant_id(), '00000000-0000-0000-0000-000000000001'::uuid)
$$;

-- Does a tenant currently have a paid feature? (used by API routes and crons)
-- feature: 'sms_reminders' | 'custom_messaging' | 'weekly_quotes'
create or replace function public.tenant_has_feature(t uuid, feature text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select t2.status in ('active','grace')
       and case feature
             when 'sms_reminders'    then p.can_sms_reminders
             when 'custom_messaging' then p.can_custom_messaging
             when 'weekly_quotes'    then p.can_weekly_quotes
             else false
           end
    from public.tenants t2
    join public.packages p on p.id = t2.package_id
    where t2.id = t
  ), false)
$$;

-- ---------- 5. tenant_id ON DATA TABLES ----------
do $$
declare
  tbl text;
begin
  foreach tbl in array array['loans','settled_loans','business','sms_logs','applications'] loop
    execute format('alter table public.%I add column if not exists tenant_id uuid references public.tenants(id) on delete cascade', tbl);
    execute format('update public.%I set tenant_id = %L where tenant_id is null', tbl, '00000000-0000-0000-0000-000000000001');
    execute format('alter table public.%I alter column tenant_id set default public.default_tenant_id()', tbl);
    execute format('alter table public.%I alter column tenant_id set not null', tbl);
    execute format('create index if not exists %I on public.%I (tenant_id)', tbl || '_tenant_id_idx', tbl);
  end loop;
end $$;

-- ---------- 6. ROW LEVEL SECURITY ----------
-- Data tables: RESTRICTIVE policy for logged-in users only.
-- Restrictive policies are AND-ed with your existing policies, so current
-- access rules stay, and logged-in users are additionally limited to their tenant.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['loans','settled_loans','business','sms_logs','applications'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists tenant_isolation on public.%I', tbl);
    execute format(
      'create policy tenant_isolation on public.%I as restrictive for all to authenticated
         using (tenant_id = public.auth_tenant_id())
         with check (tenant_id = public.auth_tenant_id())', tbl);
  end loop;
end $$;

-- New tables: users read their own tenant/membership; all writes go through
-- the service role (your super-admin panel), so no write policies here.
alter table public.packages     enable row level security;
alter table public.tenants      enable row level security;
alter table public.tenant_users enable row level security;

drop policy if exists read_packages on public.packages;
create policy read_packages on public.packages
  for select to authenticated using (true);

drop policy if exists read_own_tenant on public.tenants;
create policy read_own_tenant on public.tenants
  for select to authenticated using (id = public.auth_tenant_id());

drop policy if exists read_own_membership on public.tenant_users;
create policy read_own_membership on public.tenant_users
  for select to authenticated using (id = auth.uid());

-- Hide Africa's Talking credentials from the browser (service role still sees them)
-- (Postgres ignores a column-level revoke while a table-level grant exists,
--  so revoke the table and grant back only the safe columns.)
revoke all on public.tenants from anon, authenticated;
grant select (id, slug, business_name, contact_name, contact_email, contact_phone,
              package_id, status, subscription_start, subscription_end, at_sender_id, created_at)
  on public.tenants to authenticated;

commit;
