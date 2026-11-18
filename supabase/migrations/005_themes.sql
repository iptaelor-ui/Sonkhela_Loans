-- 005: Colour theme per business (green = Sonkhela default, blue = e.g. Eden). Safe to rerun.
alter table public.business add column if not exists theme text not null default 'green';
do $$ begin
  alter table public.business add constraint business_theme_check check (theme in ('green','blue'));
exception when duplicate_object then null; end $$;
select name, theme from public.business order by id;
