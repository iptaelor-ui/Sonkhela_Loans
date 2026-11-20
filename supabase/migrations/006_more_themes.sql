-- 006: More colour themes (purple, soft pink, white). Safe to rerun.
alter table public.business drop constraint if exists business_theme_check;
alter table public.business add constraint business_theme_check
  check (theme in ('green','blue','purple','pink','white'));
select name, theme from public.business order by id;
