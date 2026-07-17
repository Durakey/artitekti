create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.room_products(id) on delete cascade,
  store_name text not null,
  website_url text,
  price numeric(14,2) not null default 0 check (price >= 0),
  currency char(3) not null default 'EUR',
  location text,
  invoice_url text,
  notes text,
  cover_image_url text,
  status text,
  is_selected boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_options_product_id_idx on public.product_options (product_id);
create index if not exists product_options_selected_idx on public.product_options (product_id, is_selected);
create unique index if not exists product_options_one_selected_per_product_idx on public.product_options (product_id) where is_selected;

alter table if exists public.product_options enable row level security;

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
    where t.tgname = 'product_options_set_updated_at'
      and t.tgrelid = 'public.product_options'::regclass
  ) then
    execute 'create trigger product_options_set_updated_at
      before update on public.product_options
      for each row execute function public.set_updated_at()';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'product_options'
      and p.polname = 'Users manage their own product options'
  ) then
    execute $policy$
      create policy "Users manage their own product options"
      on public.product_options
      for all to authenticated
      using (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.product_options.product_id
            and proj.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.product_options.product_id
            and proj.owner_id = auth.uid()
        )
      )
    $policy$;
  end if;
end;
$$;
