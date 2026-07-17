alter table public.product_options
  add column if not exists warranty_url text,
  add column if not exists installation_photos text;
