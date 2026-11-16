-- Portfolio CMS: public read, admin-only writes.
-- Never place a Supabase service-role or secret key in the browser.

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.portfolio_admins enable row level security;
alter table public.portfolio_content enable row level security;

revoke all on public.portfolio_admins from anon, authenticated;
grant select on public.portfolio_admins to authenticated;

revoke all on public.portfolio_content from anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;

drop policy if exists "Admins can read their own allowlist row" on public.portfolio_admins;
create policy "Admins can read their own allowlist row"
  on public.portfolio_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Published portfolio content is readable" on public.portfolio_content;
create policy "Published portfolio content is readable"
  on public.portfolio_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Allowlisted admins can create portfolio content" on public.portfolio_content;
create policy "Allowlisted admins can create portfolio content"
  on public.portfolio_content for insert
  to authenticated
  with check (
    exists (
      select 1 from public.portfolio_admins a
      where a.user_id = (select auth.uid())
    )
    and updated_by = (select auth.uid())
  );

drop policy if exists "Allowlisted admins can update portfolio content" on public.portfolio_content;
create policy "Allowlisted admins can update portfolio content"
  on public.portfolio_content for update
  to authenticated
  using (
    exists (
      select 1 from public.portfolio_admins a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.portfolio_admins a
      where a.user_id = (select auth.uid())
    )
    and updated_by = (select auth.uid())
  );

drop policy if exists "Allowlisted admins can delete portfolio content" on public.portfolio_content;
create policy "Allowlisted admins can delete portfolio content"
  on public.portfolio_content for delete
  to authenticated
  using (
    exists (
      select 1 from public.portfolio_admins a
      where a.user_id = (select auth.uid())
    )
  );

comment on table public.portfolio_admins is
  'Private allowlist of user IDs permitted to edit the portfolio CMS. Add rows only through the Supabase SQL editor.';
comment on table public.portfolio_content is
  'Single public portfolio document. Public can read it; only allowlisted authenticated users can write it.';

-- First-admin bootstrap (run only after creating your own Auth user):
-- insert into public.portfolio_admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
