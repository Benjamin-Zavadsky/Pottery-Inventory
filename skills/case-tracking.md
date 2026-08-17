# Skill: Case and Location Tracking

Reference document for all work related to the physical display case tracking feature.
Read this file in full before touching any case-related code or schema.

## The Six Official Locations

These are the only valid case locations. They must be used exactly as written —
no abbreviations, no free text, no alternatives.

| ID    | Official Name                 | Description                                    |
| ----- | ----------------------------- | ---------------------------------------------- |
| A     | A — Left Tower                | Tall case on the far left wall                 |
| B     | B — Center Left               | Long low case, center left (approx. 2ft deep)  |
| C     | C — Center Right              | Long low case, center right (approx. 2ft deep) |
| D     | D — Right Tower               | Tall case on the far right wall                |
| B-top | B — Center Left, Top Surface  | Pieces displayed on top of Case B              |
| C-top | C — Center Right, Top Surface | Pieces displayed on top of Case C              |

New locations must be approved by the owner before being added. Do not invent
location names — always reference this list.

## Planned Database Schema

These tables do not exist yet. When building this feature, create them in this order
and add RLS policies before writing any application code.

```sql
-- Display cases registry
create table cases (
  id          text primary key,  -- 'A', 'B', 'C', 'D', 'B-top', 'C-top'
  name        text not null unique,  -- official full name from the table above
  description text,
  capacity    integer,  -- approximate number of pieces it can hold
  last_inventoried_at timestamptz
);

-- Seed with the six official locations immediately after creating the table
insert into cases (id, name, description) values
  ('A',     'A — Left Tower',              'Tall case on the far left wall'),
  ('B',     'B — Center Left',             'Long low case, center left'),
  ('C',     'C — Center Right',            'Long low case, center right'),
  ('D',     'D — Right Tower',             'Tall case on the far right wall'),
  ('B-top', 'B — Center Left, Top Surface','Pieces displayed on top of Case B'),
  ('C-top', 'C — Center Right, Top Surface','Pieces displayed on top of Case C');

-- Movement history — every location change is recorded
create table location_history (
  id          uuid primary key default gen_random_uuid(),
  pottery_id  uuid not null references pottery(id) on delete cascade,
  from_case   text references cases(id),  -- null if this is the first assignment
  to_case     text not null references cases(id),
  moved_at    timestamptz not null default now(),
  moved_by    uuid references auth.users(id),  -- staff member who made the change
  notes       text
);

-- RLS policies (must be added before any app code uses these tables)
alter table cases enable row level security;
alter table location_history enable row level security;

create policy "Public can read cases" on cases for select to public using (true);
create policy "Authenticated users can update cases" on cases for update to authenticated using (true);

create policy "Public can read location history" on location_history for select to public using (true);
create policy "Authenticated users can insert location history" on location_history for insert to authenticated with check (true);
```

## Updating the pottery table

The existing `location_in_case` text column must be migrated to reference the
`cases` table:

```sql
-- Add foreign key reference (run after cases table is created and seeded)
alter table pottery add column case_id text references cases(id);

-- Migrate existing location_in_case data manually before dropping the old column
-- Do not drop location_in_case until all existing data is migrated
```

## Rules

- **Never** store a location as free text anywhere in the app
- **Never** hardcode case names in component files — import from a shared constants file
- **Always** insert a row in `location_history` when a piece's case assignment changes
- **Always** update `last_inventoried_at` on the `cases` table when a case inventory is completed
- The `cases` table is seeded with fixed data — do not allow staff to create or delete cases
  without owner approval

## Case Management Page

When building `app/cases/page.tsx`:

- Show all six cases with current piece count
- Show last inventoried date per case
- Allow clicking into a case to see all pieces currently assigned to it
- Show pieces that have been moved since the last inventory as highlighted
- This page is public (anyone can view the layout) but editing is auth-gated
