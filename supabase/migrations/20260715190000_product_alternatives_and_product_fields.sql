alter table public.room_products
  add column if not exists selected_option_id uuid,
  add column if not exists supplier text,
  add column if not exists ordered_date date,
  add column if not exists expected_delivery date,
  add column if not exists delivered_date date,
  add column if not exists installed_date date,
  add column if not exists invoice_url text,
  add column if not exists warranty_url text,
  add column if not exists installation_photos text;

create table if not exists public.product_alternatives (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.room_products(id) on delete cascade,
  store_name text not null,
  website_url text,
  instagram_url text,
  price numeric(14,2) not null default 0 check (price >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  location text,
  invoice_url text,
  availability text not null default 'unknown',
  status text,
  notes text,
  cover_image_url text,
  is_selected boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_alternatives_product_id_idx on public.product_alternatives (product_id);
create index if not exists product_alternatives_selected_idx on public.product_alternatives (product_id, is_selected);
create index if not exists product_alternatives_sort_order_idx on public.product_alternatives (sort_order);
create unique index if not exists product_alternatives_one_selected_per_product_idx on public.product_alternatives (product_id) where is_selected;

alter table public.product_alternatives
  add column if not exists location text,
  add column if not exists invoice_url text,
  add column if not exists status text;

alter table if exists public.product_alternatives enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) and not exists (
    select 1
    from pg_trigger t
    where t.tgname = 'product_alternatives_set_updated_at'
      and t.tgrelid = 'public.product_alternatives'::regclass
  ) then
    execute 'create trigger product_alternatives_set_updated_at before update on public.product_alternatives for each row execute function public.set_updated_at()';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'product_alternatives'
  ) and not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'product_alternatives'
      and p.polname = 'Users manage their own product alternatives'
  ) then
    execute '
      create policy "Users manage their own product alternatives" on public.product_alternatives
      for all to authenticated
      using (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.product_alternatives.product_id
            and proj.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.product_alternatives.product_id
            and proj.owner_id = auth.uid()
        )
      )';
  end if;
end;
$$;