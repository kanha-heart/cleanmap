-- CleanMap POC schema for Supabase (v2: assignment + Open / In progress / Closed)
-- Run this once in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run
-- Safe to run again, and safe to run if you used the older version (it upgrades it).

create extension if not exists pgcrypto;

-- 1) Tags (drives the dropdown; users can add new ones from the app)
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);

-- 2) Reports (photo + geo + tag + description + who is cleaning it + status)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  tag         text not null,
  description text check (char_length(description) <= 1000),
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  accuracy    real,
  reporter    text,
  photo_url   text not null,
  assigned_to text check (char_length(assigned_to) <= 60),
  status      text not null default 'open'
);

-- Upgrade path for the older version (adds new columns, renames "resolved" -> "closed")
alter table public.reports add column if not exists assigned_to text;
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.reports drop constraint if exists reports_status_check;
update public.reports set status = 'closed' where status = 'resolved';
alter table public.reports add constraint reports_status_check check (status in ('open','in_progress','closed'));

create index if not exists reports_created_idx  on public.reports (created_at desc);
create index if not exists reports_tag_idx      on public.reports (tag);
create index if not exists reports_status_idx   on public.reports (status);

-- 3) Default tags
insert into public.tags (name) values
  ('🦟 Mosquito breeding site'), ('💧 Stagnant water'), ('🧪 Hazardous material'),
  ('🛢️ Chemical spill'), ('🪟 Broken glass on path'), ('💉 Needles / sharps'),
  ('🗑️ Illegal waste dump'), ('🧹 Cleanup needed')
on conflict (name) do nothing;

-- 4) Row Level Security
-- POC ONLY: anyone with the link can read/insert/update. Tighten before real use (see README).
alter table public.tags    enable row level security;
alter table public.reports enable row level security;

drop policy if exists "poc tags read"      on public.tags;
drop policy if exists "poc tags insert"    on public.tags;
drop policy if exists "poc reports read"   on public.reports;
drop policy if exists "poc reports insert" on public.reports;
drop policy if exists "poc reports update" on public.reports;

create policy "poc tags read"      on public.tags    for select to anon, authenticated using (true);
create policy "poc tags insert"    on public.tags    for insert to anon, authenticated with check (true);
create policy "poc reports read"   on public.reports for select to anon, authenticated using (true);
create policy "poc reports insert" on public.reports for insert to anon, authenticated with check (true);
create policy "poc reports update" on public.reports for update to anon, authenticated using (true) with check (status in ('open','in_progress','closed'));

-- 5) Photo storage bucket (public read so the dashboard can show images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "poc photos read"   on storage.objects;
drop policy if exists "poc photos upload" on storage.objects;
create policy "poc photos read"   on storage.objects for select to anon, authenticated using (bucket_id = 'photos');
create policy "poc photos upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
