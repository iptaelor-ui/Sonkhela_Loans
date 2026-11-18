-- ============================================================
-- 004: Feature locks
--   * Trial clients get their package's features (not just Core)
--   * Suspended / cancelled clients can log in and VIEW, but not add or change anything
-- Sonkhela itself is always active. Safe to run more than once. One transaction.
-- ============================================================
begin;

-- Features: trial, active and grace all get what their package includes
create or replace function public.tenant_has_feature(t uuid, feature text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select t2.status in ('trial','active','grace')
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

-- Can the logged-in user's business add/change data right now?
create or replace function public.tenant_can_write()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select status in ('trial','active','grace') from public.tenants where id = public.auth_tenant_id()
  ), false)
$$;

-- View-only when suspended: RESTRICTIVE write policies for logged-in users.
-- Reading is unaffected. The public website, crons and API routes use the
-- service role and are not affected either.
do $$
declare tbl text;
begin
  foreach tbl in array array['loans','settled_loans','business','sms_logs','applications'] loop
    execute format('drop policy if exists subscription_insert on public.%I', tbl);
    execute format('drop policy if exists subscription_update on public.%I', tbl);
    execute format('drop policy if exists subscription_delete on public.%I', tbl);
    execute format('create policy subscription_insert on public.%I as restrictive for insert to authenticated with check (public.tenant_can_write())', tbl);
    execute format('create policy subscription_update on public.%I as restrictive for update to authenticated using (public.tenant_can_write()) with check (public.tenant_can_write())', tbl);
    execute format('create policy subscription_delete on public.%I as restrictive for delete to authenticated using (public.tenant_can_write())', tbl);
  end loop;
end $$;

commit;

-- Check: Sonkhela should be true for all three
select tenant_has_feature('00000000-0000-0000-0000-000000000001','sms_reminders')    as reminders,
       tenant_has_feature('00000000-0000-0000-0000-000000000001','custom_messaging') as messaging,
       tenant_has_feature('00000000-0000-0000-0000-000000000001','weekly_quotes')    as quotes;
