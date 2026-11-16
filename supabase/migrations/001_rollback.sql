-- Undo 001_multitenant_stage1.sql completely. Your loan data is untouched;
-- only the tenant columns, policies and new tables are removed.
begin;

do $$
declare tbl text;
begin
  foreach tbl in array array['loans','settled_loans','business','sms_logs','applications'] loop
    execute format('drop policy if exists tenant_isolation on public.%I', tbl);
    execute format('alter table public.%I drop column if exists tenant_id', tbl);
  end loop;
end $$;

drop function if exists public.tenant_has_feature(uuid, text);
drop function if exists public.default_tenant_id();
drop function if exists public.auth_tenant_id();
drop table if exists public.tenant_users;
drop table if exists public.tenants;
drop table if exists public.packages;

commit;
