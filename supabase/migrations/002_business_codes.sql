-- ============================================================
-- 002: Each business gets its own short code for numbering
--   Sonkhela Soft Loans -> SSL   (unchanged)
--   RT Credit           -> RTC   applications RTC-APP-2026-000001, loans RTC-2026-XXXXXXXX
-- Safe to run more than once. Runs as one transaction.
-- ============================================================
begin;

-- 1. Code per business
alter table public.tenants add column if not exists code text;

update public.tenants set code = 'SSL'
where id = '00000000-0000-0000-0000-000000000001' and code is null;

-- Initials of the name; short all-capital words are kept whole (RT Credit -> RTC).
-- A one-word name uses its first 3 letters (Mwanakatwe -> MWA).
update public.tenants t
set code = (
  select case
    when count(*) = 1 then upper(left(min(w), 3))
    else upper(left(string_agg(case when w ~ '^[A-Z]{2,3}$' then w else left(w, 1) end, '' order by n), 4))
  end
  from regexp_split_to_table(regexp_replace(t.business_name, '[^A-Za-z ]', '', 'g'), '\s+') with ordinality as x(w, n)
  where w <> ''
)
where code is null;

-- If two businesses ended up with the same code, add a number to the later ones (RTC, RTC2...)
with d as (
  select id, code, row_number() over (partition by code order by created_at) as rn
  from public.tenants
)
update public.tenants t set code = d.code || d.rn
from d where d.id = t.id and d.rn > 1;

alter table public.tenants alter column code set not null;
create unique index if not exists tenants_code_key on public.tenants (code);

-- Logged-in users may read their own business's code (other columns already granted)
grant select (code) on public.tenants to authenticated;

-- 2. Application reference for client-portal applications (RTC-APP-2026-000001)
alter table public.applications add column if not exists app_ref text;
create unique index if not exists applications_tenant_app_ref_key
  on public.applications (tenant_id, app_ref) where app_ref is not null;

commit;

-- Check: every business and its code
select business_name, slug, code from public.tenants order by created_at;
