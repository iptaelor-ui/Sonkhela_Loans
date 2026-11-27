-- ============================================================
-- 008: Google Drive storage per business
--   * drive_accounts: each business's connected Google account (server-only)
--   * applications / loans remember their Drive folder
-- Safe to run more than once. One transaction.
-- ============================================================
begin;

create table if not exists public.drive_accounts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  email text,
  refresh_token text not null,
  root_id text,
  loans_id text,
  applications_id text,
  connected_at timestamptz not null default now()
);
-- No policies: only the server (service role) can read the Google token
alter table public.drive_accounts enable row level security;
revoke all on public.drive_accounts from anon, authenticated;

alter table public.applications add column if not exists drive_folder_id text;
alter table public.applications add column if not exists files_moved_at timestamptz;
alter table public.loans add column if not exists drive_folder_id text;
alter table public.loans add column if not exists drive_files jsonb;
alter table public.settled_loans add column if not exists drive_folder_id text;

commit;

select 'drive storage ready' as status;
