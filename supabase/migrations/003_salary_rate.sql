-- 003: Salary share (%) per business, adjustable in Settings. Defaults to 30%.
-- Safe to run more than once.
alter table public.business
  add column if not exists salary_rate numeric not null default 30;

do $$ begin
  alter table public.business
    add constraint business_salary_rate_range check (salary_rate >= 0 and salary_rate <= 100);
exception when duplicate_object then null; end $$;

select name, salary_rate from public.business order by id;
