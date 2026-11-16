-- Run after 001_multitenant_stage1.sql. Every row should look as described.

-- 1. Sonkhela is tenant #1 on Full Suite, active
select id, slug, business_name, package_id, status from tenants;

-- 2. Your login(s) are linked to Sonkhela as owner
select tu.role, u.email, t.business_name
from tenant_users tu join auth.users u on u.id = tu.id join tenants t on t.id = tu.tenant_id;

-- 3. No unstamped rows anywhere (all counts should be 0)
select 'loans' t, count(*) from loans where tenant_id is null
union all select 'settled_loans', count(*) from settled_loans where tenant_id is null
union all select 'business', count(*) from business where tenant_id is null
union all select 'sms_logs', count(*) from sms_logs where tenant_id is null
union all select 'applications', count(*) from applications where tenant_id is null;

-- 4. Feature check works (all three should be true for Sonkhela)
select tenant_has_feature('00000000-0000-0000-0000-000000000001', 'sms_reminders')    as reminders,
       tenant_has_feature('00000000-0000-0000-0000-000000000001', 'custom_messaging') as messaging,
       tenant_has_feature('00000000-0000-0000-0000-000000000001', 'weekly_quotes')    as quotes;

-- 5. Isolation policies exist (5 rows, permissive = RESTRICTIVE)
select tablename, policyname, permissive from pg_policies where policyname = 'tenant_isolation';

-- After this, log in to admin.sonkhela.com and confirm loans, clients and
-- applications all show as before. Submit a test application on sonkhela.com
-- and confirm it appears in the admin dashboard.
