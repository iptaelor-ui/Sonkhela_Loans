-- 007: Loan types each business offers on its apply page (empty = all types).
-- Eden: collateral-backed loans only. Safe to rerun.
alter table public.business add column if not exists loan_types text[];

update public.business set loan_types = array['collateral']
where tenant_id = (select id from public.tenants where slug = 'eden');

select t.business_name, b.loan_types
from public.business b join public.tenants t on t.id = b.tenant_id
order by t.created_at;
