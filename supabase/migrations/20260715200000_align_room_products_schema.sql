-- Align room_products to the schema the app expects.
-- The original migration used CREATE TABLE IF NOT EXISTS so the old table
-- (with product_name / unit_price) was never replaced. This migration adds the
-- missing columns and copies existing data so no rows are lost.

-- 1. Add columns that the app queries but did not exist in the original table.
alter table public.room_products
  add column if not exists name text,
  add column if not exists cover_image_url text,
  add column if not exists selected_option_id uuid;

-- 2. Back-fill name from product_name for any pre-existing rows.
update public.room_products
  set name = product_name
  where name is null and product_name is not null;

-- 3. Give name a sensible default so it can be made non-nullable.
update public.room_products
  set name = 'Unnamed product'
  where name is null;

-- 4. Enforce NOT NULL now that every row has a value.
alter table public.room_products
  alter column name set not null;
