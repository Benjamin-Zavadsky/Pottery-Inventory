-- ============================================================
-- Pottery Inventory — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- Main inventory table
create table pottery (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,
  created_at        timestamptz not null default now(),

  -- Required fields
  name              text not null,
  place_of_origin   text not null,
  age               text not null,
  color             text not null,

  -- Details
  use_function      text,
  tribe_culture     text,
  dimensions        text,
  condition         text check (condition in ('Mint','Excellent','Good','Fair','Poor')),
  rarity            text check (rarity in ('Common','Uncommon','Rare','Museum-Grade')),
  originality       text check (originality in ('Authenticated Original','Suspected Original','Reproduction','Unknown')),
  location_in_case  text,
  status            text not null default 'Active' check (status in ('Active','Archived','Deaccessioned')),

  -- Acquisition
  date_acquired     date,
  location_acquired text,
  seller_donator    text,
  provenance        text,
  appraised_value   numeric(10,2),
  acquisition_cost  numeric(10,2),
  appraisal_date    date,
  appraiser_name    text,

  -- Research
  museums_comparable text,
  research_notes     text,

  -- Photos: array of public URLs from Supabase Storage
  photos            text[] not null default '{}'
);

-- Index for fast filtering
create index on pottery (status);
create index on pottery (condition);
create index on pottery (rarity);
create index on pottery (created_at desc);

-- Enable Row Level Security
alter table pottery enable row level security;

-- Public catalog: anyone can read; only staff (authenticated) can write.
-- Sensitive financial/donor fields live in pottery_private (staff-only).
create policy "Public can read pottery"
  on pottery for select
  to public
  using (true);

create policy "Authenticated users can insert pottery"
  on pottery for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update pottery"
  on pottery for update
  to authenticated
  using (true);

-- ============================================================
-- Storage bucket for photos
-- Run this AFTER creating the bucket named "pottery-photos"
-- in Storage → New bucket (set to Public)
-- ============================================================

-- Allow authenticated users to upload
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pottery-photos');

-- Allow public read of photos (for display)
create policy "Public can view photos"
  on storage.objects for select
  to public
  using (bucket_id = 'pottery-photos');

-- Allow authenticated users to delete their photos
create policy "Authenticated users can delete photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'pottery-photos');

-- ============================================================
-- Case & Location Tracking
-- Run AFTER the pottery table exists
-- ============================================================

-- Display cases registry
create table cases (
  id                    text primary key,
  name                  text not null unique,
  description           text,
  capacity              integer,
  last_inventoried_at   timestamptz
);

-- Seed with the six official locations
insert into cases (id, name, description) values
  ('A',     'A — Left Tower',               'Tall case on the far left wall'),
  ('B',     'B — Center Left',              'Long low case, center left (approx. 2ft deep)'),
  ('C',     'C — Center Right',             'Long low case, center right (approx. 2ft deep)'),
  ('D',     'D — Right Tower',              'Tall case on the far right wall'),
  ('B-top', 'B — Center Left, Top Surface', 'Pieces displayed on top of Case B'),
  ('C-top', 'C — Center Right, Top Surface','Pieces displayed on top of Case C');

-- Movement history
create table location_history (
  id          uuid primary key default gen_random_uuid(),
  pottery_id  uuid not null references pottery(id) on delete cascade,
  from_case   text references cases(id),
  to_case     text not null references cases(id),
  moved_at    timestamptz not null default now(),
  moved_by    uuid references auth.users(id),
  notes       text
);

-- Add case_id to pottery (keep location_in_case for migration of existing data)
alter table pottery add column case_id text references cases(id);
create index on pottery (case_id);

-- RLS for cases
alter table cases enable row level security;
create policy "Public can read cases" on cases for select to public using (true);
create policy "Authenticated users can update cases" on cases for update to authenticated using (true);

-- RLS for location_history
alter table location_history enable row level security;
create policy "Public can read location history" on location_history for select to public using (true);
create policy "Authenticated users can insert location history" on location_history for insert to authenticated with check (true);

-- ============================================================
-- Scale readiness (2026-11-05)
-- Run this whole section ONCE in Supabase → SQL Editor, in order.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

begin;

-- ── Reconcile drift with the live database ──────────────────
alter table pottery add column if not exists description text;

drop policy if exists "Authenticated users can read pottery" on pottery;
drop policy if exists "Public can read pottery" on pottery;
create policy "Public can read pottery" on pottery for select to public using (true);

drop policy if exists "Authenticated users can delete pottery" on pottery;
create policy "Authenticated users can delete pottery" on pottery for delete to authenticated using (true);

-- ── Only name is required: staff can save a piece and let the AI review
-- queue fill in origin/age/color later. ───────────────────────
alter table pottery alter column place_of_origin drop not null;
alter table pottery alter column age drop not null;
alter table pottery alter column color drop not null;

-- ── SKUs from a sequence (count+1 collided after any delete) ─
create sequence if not exists pottery_sku_seq;
select setval(
  'pottery_sku_seq',
  coalesce((select max(substring(sku from 2)::int) from pottery where sku ~ '^P[0-9]+$'), 0) + 1,
  false
);

create or replace function next_pottery_sku() returns text
language sql volatile set search_path = public as $$
  select 'P' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end
  from (select nextval('pottery_sku_seq') as n) s;
$$;

alter table pottery alter column sku set default next_pottery_sku();

-- ── Photo thumbnails (parallel to photos[]) ──────────────────
-- Thumbnail backfill overwrites (upserts) its own output, which needs UPDATE.
drop policy if exists "Authenticated users can update photos" on storage.objects;
create policy "Authenticated users can update photos" on storage.objects
  for update to authenticated using (bucket_id = 'pottery-photos');

alter table pottery add column if not exists thumbs text[] not null default '{}';

-- ── Structured taxonomy ──────────────────────────────────────
create table if not exists cultures (
  id      text primary key,
  name    text not null unique,
  region  text not null check (region in ('North America','Mesoamerica','Caribbean / Amazonia','South America','Europe','Africa','Middle East','South Asia','East Asia','Southeast Asia','Oceania')),
  lat     double precision not null,
  lng     double precision not null
);

alter table cultures enable row level security;
drop policy if exists "Public can read cultures" on cultures;
create policy "Public can read cultures" on cultures for select to public using (true);

-- Generated from CULTURES in lib/constants.ts — keep in sync (a unit test enforces it).
insert into cultures (id, name, region, lat, lng) values
  ('ancestral-puebloans', 'Ancestral Puebloans', 'North America', 36.5, -108.5),
  ('mississippian', 'Mississippian', 'North America', 33.5, -90.2),
  ('hohokam', 'Hohokam', 'North America', 33.2, -111.8),
  ('mogollon-mimbres', 'Mogollon / Mimbres', 'North America', 32.8, -108.0),
  ('woodland', 'Woodland', 'North America', 40.0, -83.0),
  ('caddoan', 'Caddoan', 'North America', 33.5, -94.5),
  ('pacific-northwest', 'Pacific Northwest', 'North America', 47.5, -122.5),
  ('plains-great-basin', 'Plains / Great Basin', 'North America', 43.0, -107.0),
  ('adena', 'Adena', 'North America', 39.0, -83.0),
  ('hopewell', 'Hopewell', 'North America', 39.3, -83.0),
  ('coles-creek', 'Coles Creek', 'North America', 31.5, -91.5),
  ('plaquemine', 'Plaquemine', 'North America', 31.5, -91.4),
  ('oneota', 'Oneota', 'North America', 43.0, -91.0),
  ('fort-ancient', 'Fort Ancient', 'North America', 39.0, -84.2),
  ('deptford', 'Deptford', 'North America', 31.5, -82.0),
  ('swift-creek', 'Swift Creek', 'North America', 31.0, -83.5),
  ('weeden-island', 'Weeden Island', 'North America', 30.0, -84.5),
  ('fremont', 'Fremont', 'North America', 39.5, -111.5),
  ('plains-village-middle-missouri', 'Plains Village / Middle Missouri', 'North America', 44.5, -100.5),
  ('tizon-brown-ware', 'Tizon Brown Ware', 'North America', 33.5, -116.8),
  ('owens-valley-brown-ware', 'Owens Valley Brown Ware', 'North America', 37.0, -118.2),
  ('maya', 'Maya', 'Mesoamerica', 17.0, -89.5),
  ('aztec-mexica', 'Aztec / Mexica', 'Mesoamerica', 19.4, -99.1),
  ('zapotec', 'Zapotec', 'Mesoamerica', 17.0, -96.7),
  ('mixtec', 'Mixtec', 'Mesoamerica', 17.5, -97.3),
  ('olmec', 'Olmec', 'Mesoamerica', 18.0, -94.8),
  ('toltec', 'Toltec', 'Mesoamerica', 19.9, -99.2),
  ('casas-grandes', 'Casas Grandes', 'Mesoamerica', 30.4, -107.9),
  ('teotihuacan', 'Teotihuacan', 'Mesoamerica', 19.7, -98.8),
  ('huastec', 'Huastec', 'Mesoamerica', 21.5, -98.4),
  ('greater-nicoya', 'Greater Nicoya', 'Caribbean / Amazonia', 10.5, -85.0),
  ('taino', 'Taíno', 'Caribbean / Amazonia', 18.5, -70.0),
  ('gran-cocle', 'Gran Coclé', 'Caribbean / Amazonia', 8.4, -80.5),
  ('tairona', 'Tairona', 'South America', 11.0, -73.8),
  ('nazca', 'Nazca', 'South America', -14.8, -75.0),
  ('moche', 'Moche', 'South America', -8.1, -79.0),
  ('chimu', 'Chimú', 'South America', -8.3, -78.9),
  ('tiwanaku', 'Tiwanaku', 'South America', -16.5, -68.7),
  ('inca', 'Inca', 'South America', -13.5, -72.0),
  ('chavin', 'Chavín', 'South America', -9.6, -77.2),
  ('cupisnique', 'Cupisnique', 'South America', -7.7, -79.4),
  ('paracas', 'Paracas', 'South America', -13.8, -76.2),
  ('recuay', 'Recuay', 'South America', -9.7, -77.4),
  ('wari', 'Wari', 'South America', -13.1, -74.2),
  ('chancay', 'Chancay', 'South America', -11.6, -77.3),
  ('lambayeque-sican', 'Lambayeque / Sicán', 'South America', -6.7, -79.8),
  ('neolithic-europe', 'Neolithic Europe', 'Europe', 50.0, 15.0),
  ('minoan', 'Minoan', 'Europe', 35.2, 25.1),
  ('ancient-greece', 'Ancient Greece', 'Europe', 37.9, 23.7),
  ('ancient-rome', 'Ancient Rome', 'Europe', 41.9, 12.5),
  ('celtic-europe', 'Celtic Europe', 'Europe', 47.5, 8.0),
  ('byzantine', 'Byzantine', 'Europe', 41.0, 28.9),
  ('etruscan-bucchero', 'Etruscan Bucchero', 'Europe', 42.5, 11.9),
  ('hispano-moresque-lusterware', 'Hispano-Moresque Lusterware', 'Europe', 39.5, -0.5),
  ('delftware', 'Delftware', 'Europe', 52.0, 4.36),
  ('english-salt-glazed-stoneware', 'English Salt-Glazed Stoneware', 'Europe', 52.98, -2.13),
  ('ancient-egypt', 'Ancient Egypt', 'Africa', 29.9, 31.1),
  ('nubian-kerma', 'Nubian / Kerma', 'Africa', 19.6, 30.4),
  ('nok-culture', 'Nok Culture', 'Africa', 9.9, 8.5),
  ('djenne-jeno', 'Djenné-Jeno', 'Africa', 13.9, -4.6),
  ('ife-yoruba', 'Ife / Yoruba', 'Africa', 7.5, 4.5),
  ('sao-civilization', 'Sao Civilization', 'Africa', 12.0, 15.0),
  ('great-zimbabwe', 'Great Zimbabwe', 'Africa', -20.3, 30.9),
  ('halaf-culture', 'Halaf Culture', 'Middle East', 36.8, 40.0),
  ('ubaid-culture', 'Ubaid Culture', 'Middle East', 30.5, 47.0),
  ('sumerian', 'Sumerian', 'Middle East', 31.4, 45.5),
  ('achaemenid-persian', 'Achaemenid / Persian', 'Middle East', 29.9, 52.9),
  ('islamic-lusterware', 'Islamic Lusterware', 'Middle East', 33.3, 44.4),
  ('iznik-ottoman', 'Iznik / Ottoman', 'Middle East', 40.4, 29.7),
  ('anatolian-neolithic', 'Anatolian Neolithic', 'Middle East', 37.7, 32.8),
  ('indus-valley', 'Indus Valley', 'South Asia', 27.3, 68.1),
  ('painted-grey-ware', 'Painted Grey Ware', 'South Asia', 28.7, 77.1),
  ('n-black-polished-ware', 'N. Black Polished Ware', 'South Asia', 25.5, 82.0),
  ('mauryan', 'Mauryan', 'South Asia', 25.6, 85.1),
  ('south-indian-megalithic', 'South Indian Megalithic', 'South Asia', 13.1, 77.6),
  ('yangshao-culture', 'Yangshao Culture', 'East Asia', 34.7, 108.7),
  ('longshan-culture', 'Longshan Culture', 'East Asia', 36.4, 117.0),
  ('tang-sancai', 'Tang Sancai', 'East Asia', 34.7, 112.5),
  ('jingdezhen-porcelain', 'Jingdezhen Porcelain', 'East Asia', 29.3, 117.2),
  ('jomon-culture', 'Jōmon Culture', 'East Asia', 38.0, 140.0),
  ('goryeo-celadon', 'Goryeo Celadon', 'East Asia', 37.0, 126.5),
  ('ru-ware', 'Ru Ware', 'East Asia', 34.0, 113.0),
  ('cizhou-ware', 'Cizhou Ware', 'East Asia', 36.5, 114.5),
  ('longquan-celadon', 'Longquan Celadon', 'East Asia', 28.1, 119.1),
  ('ban-chiang', 'Ban Chiang', 'Southeast Asia', 17.6, 103.2),
  ('dong-son', 'Dong Son', 'Southeast Asia', 20.5, 105.8),
  ('khmer-angkor', 'Khmer / Angkor', 'Southeast Asia', 13.4, 103.9),
  ('majapahit', 'Majapahit', 'Southeast Asia', -7.6, 111.6),
  ('sawankhalok-sukhothai', 'Sawankhalok / Sukhothai', 'Southeast Asia', 17.4, 99.8),
  ('lapita', 'Lapita', 'Oceania', -18.0, 168.0),
  ('fijian-pottery', 'Fijian Pottery', 'Oceania', -17.7, 178.0)
on conflict (id) do update set name = excluded.name, region = excluded.region, lat = excluded.lat, lng = excluded.lng;

alter table pottery add column if not exists culture_id text references cultures(id);
alter table pottery add column if not exists region text check (region in ('North America','Mesoamerica','Caribbean / Amazonia','South America','Europe','Africa','Middle East','South Asia','East Asia','Southeast Asia','Oceania'));
-- Negative years are BCE (e.g. -800 = 800 BCE).
alter table pottery add column if not exists period_start_year integer;
alter table pottery add column if not exists period_end_year integer;
alter table pottery drop constraint if exists pottery_period_order;
alter table pottery add constraint pottery_period_order
  check (period_start_year is null or period_end_year is null or period_start_year <= period_end_year);

create index if not exists pottery_culture_id_idx on pottery (culture_id);
create index if not exists pottery_region_idx on pottery (region);
create index if not exists pottery_period_start_idx on pottery (period_start_year);

-- ── Record integrity: updated_at, AI-provenance, audit trail ─
alter table pottery add column if not exists updated_at timestamptz not null default now();
-- Field names whose current value came from AI and has not been verified by staff.
alter table pottery add column if not exists ai_fields text[] not null default '{}';

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pottery_set_updated_at on pottery;
create trigger pottery_set_updated_at before update on pottery
  for each row execute function set_updated_at();

create table if not exists record_revisions (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid not null,
  operation   text not null check (operation in ('INSERT','UPDATE','DELETE')),
  changed_at  timestamptz not null default now(),
  changed_by  uuid,
  old_row     jsonb,
  new_row     jsonb
);
create index if not exists record_revisions_record_idx on record_revisions (record_id, changed_at desc);

alter table record_revisions enable row level security;
drop policy if exists "Authenticated users can read revisions" on record_revisions;
create policy "Authenticated users can read revisions" on record_revisions for select to authenticated using (true);

-- security definer: the trigger writes history even though no client may insert into it directly.
create or replace function log_record_revision() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  key_col text := coalesce(tg_argv[0], 'id');
  old_json jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'search_tsv' end;
  new_json jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'search_tsv' end;
begin
  insert into record_revisions (table_name, record_id, operation, changed_by, old_row, new_row)
  values (tg_table_name, (coalesce(new_json, old_json) ->> key_col)::uuid, tg_op, auth.uid(), old_json, new_json);
  return coalesce(new, old);
end $$;

drop trigger if exists pottery_log_revision on pottery;
create trigger pottery_log_revision after insert or update or delete on pottery
  for each row execute function log_record_revision('id');

create table if not exists ai_analyses (
  id          uuid primary key default gen_random_uuid(),
  pottery_id  uuid references pottery(id) on delete cascade,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  model       text not null,
  photo_urls  text[] not null default '{}',
  user_context text,
  result      jsonb not null,
  status      text not null default 'pending' check (status in ('pending','applied','dismissed'))
);
create index if not exists ai_analyses_pottery_idx on ai_analyses (pottery_id, created_at desc);
create index if not exists ai_analyses_status_idx on ai_analyses (status);

alter table ai_analyses enable row level security;
drop policy if exists "Authenticated users can read ai analyses" on ai_analyses;
drop policy if exists "Authenticated users can insert ai analyses" on ai_analyses;
drop policy if exists "Authenticated users can update ai analyses" on ai_analyses;
create policy "Authenticated users can read ai analyses" on ai_analyses for select to authenticated using (true);
create policy "Authenticated users can insert ai analyses" on ai_analyses for insert to authenticated with check (true);
create policy "Authenticated users can update ai analyses" on ai_analyses for update to authenticated using (true);

-- ── Staff-only financial & donor fields ──────────────────────
create table if not exists pottery_private (
  pottery_id        uuid primary key references pottery(id) on delete cascade,
  acquisition_cost  numeric(10,2),
  appraised_value   numeric(10,2),
  appraisal_date    date,
  appraiser_name    text,
  seller_donator    text
);

alter table pottery_private enable row level security;
drop policy if exists "Authenticated users can manage private fields" on pottery_private;
create policy "Authenticated users can manage private fields" on pottery_private
  for all to authenticated using (true) with check (true);

drop trigger if exists pottery_private_log_revision on pottery_private;
create trigger pottery_private_log_revision after insert or update or delete on pottery_private
  for each row execute function log_record_revision('pottery_id');

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'pottery' and column_name = 'acquisition_cost') then
    insert into pottery_private (pottery_id, acquisition_cost, appraised_value, appraisal_date, appraiser_name, seller_donator)
    select id, acquisition_cost, appraised_value, appraisal_date, appraiser_name, seller_donator
    from pottery
    where acquisition_cost is not null or appraised_value is not null or appraisal_date is not null
       or appraiser_name is not null or seller_donator is not null
    on conflict (pottery_id) do nothing;

    alter table pottery
      drop column acquisition_cost,
      drop column appraised_value,
      drop column appraisal_date,
      drop column appraiser_name,
      drop column seller_donator;
  end if;
end $$;

-- ── Full-text search ─────────────────────────────────────────
alter table pottery add column if not exists search_tsv tsvector generated always as (
  to_tsvector('simple'::regconfig,
    coalesce(sku, '') || ' ' || coalesce(name, '') || ' ' || coalesce(place_of_origin, '') || ' ' ||
    coalesce(tribe_culture, '') || ' ' || coalesce(replace(culture_id, '-', ' '), '') || ' ' ||
    coalesce(region, '') || ' ' || coalesce(age, '') || ' ' || coalesce(color, '') || ' ' ||
    coalesce(use_function, '') || ' ' || coalesce(description, '') || ' ' ||
    coalesce(research_notes, '') || ' ' || coalesce(provenance, ''))
) stored;
create index if not exists pottery_search_idx on pottery using gin (search_tsv);

commit;
