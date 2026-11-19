-- Visit tracker: events table. Visitors may INSERT only; only listed admins may SELECT.
create table public.events (
  id bigint generated always as identity primary key,
  visit_id text not null check (visit_id ~ '^[a-z0-9]{8,32}$'),
  site text not null check (site ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (name ~ '^[a-z0-9][a-z0-9/._:-]{0,119}$'),
  at timestamptz not null default now(),
  country text check (country ~ '^[A-Z]{2}$'),
  referrer text check (char_length(referrer) <= 100),
  device text check (device in ('desktop','phone','tablet'))
);
create index events_at_idx on public.events (at desc);
create index events_visit_idx on public.events (visit_id, at);
create index events_site_name_idx on public.events (site, name);

alter table public.events enable row level security;

-- admins live outside the exposed API schema
create schema if not exists private;
create table private.tracker_admins (user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on schema private from public, anon, authenticated;
revoke all on private.tracker_admins from public, anon, authenticated;

create or replace function private.is_tracker_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$ select exists (select 1 from private.tracker_admins where user_id = (select auth.uid())); $$;
revoke all on function private.is_tracker_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_tracker_admin() to authenticated;

-- anon can insert only these columns; authenticated can read (rows are still filtered by the policy)
revoke all on public.events from anon, authenticated;
grant insert (visit_id, site, name, country, referrer, device) on public.events to anon;
grant select on public.events to authenticated;

create policy "anyone can add events" on public.events
  for insert to anon, authenticated with check (true);
create policy "only admins can read events" on public.events
  for select to authenticated using ((select private.is_tracker_admin()));

-- After creating your own login in Supabase Auth, add it as the admin (replace the id):
--   insert into private.tracker_admins (user_id) values ('<your user id>');
