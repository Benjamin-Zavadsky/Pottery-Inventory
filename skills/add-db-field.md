# Skill: Add a New Field to the Pottery Table

Follow this sequence exactly. Do not skip steps or reorder them.

## 1. Explore first

- Read `supabase-schema.sql` to understand the current schema
- Read `lib/types.ts` to understand the current PotteryItem type
- Read `app/add/page.tsx` to understand the current add form
- Read `app/item/[id]/page.tsx` to understand the current edit form and detail view

## 2. Plan

Write out the following before touching any file:

- The column name (must be `snake_case`)
- The SQL type (text, numeric, date, boolean, etc.)
- Whether it has a CHECK constraint (if so, list the allowed values)
- Which UI sections it belongs in (Required / Details / Acquisition / Research)
- Whether it is optional or required

Wait for approval before proceeding.

## 3. Update `supabase-schema.sql`

Add the new column definition to the `pottery` table. If it has a CHECK constraint,
define it inline. Example:

```sql
new_field text check (new_field in ('Option A', 'Option B', 'Option C')),
```

This file is the source of truth. It must be updated before any code change.

## 4. Run the migration in Supabase

Go to Supabase Dashboard → SQL Editor and run:

```sql
alter table pottery add column new_field text check (new_field in ('Option A', 'Option B', 'Option C'));
```

Never alter the database without updating `supabase-schema.sql` first.

## 5. Update `lib/types.ts`

Add the new field to the `PotteryItem` type. Optional fields use `?`:

```ts
new_field?: string;
```

## 6. Update `app/add/page.tsx`

- Add the field to the `form` state initial value
- Add an input or select element in the appropriate section
- If it has CHECK constraints, add a constants array at the top of the file and
  validate before inserting:
  ```ts
  new_field: NEW_FIELD_OPTIONS.includes(form.new_field) ? form.new_field : null,
  ```
- Add it to the `AISuggestions` type and `SUGGESTION_LABELS` if the AI should suggest it

## 7. Update `app/item/[id]/page.tsx`

- Add the field to the `EditForm` component
- Add it to the `ViewInfo` component for display
- Add it to the `handleSave` update call if not already included via spread

## 8. Verify

- Every key in the `.insert()` and `.update()` calls exists as a column in `supabase-schema.sql`
- Constrained fields are validated against their allowed list before saving
- The field displays correctly in both view and edit mode

## 9. Commit

```
feat: add [field_name] field to pottery table and UI
```
