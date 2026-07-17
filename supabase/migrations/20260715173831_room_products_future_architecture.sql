create table if not exists public.room_products (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  category text,
  notes text,
  quantity integer not null default 1,
  status text not null default 'suggested',
  cover_image_url text,
  selected_option_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists room_products_room_id_idx on public.room_products (room_id);
create index if not exists room_products_status_idx on public.room_products (status);
create index if not exists room_products_sort_order_idx on public.room_products (sort_order);

alter table if exists public.room_products enable row level security;

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
    where t.tgname = 'room_products_set_updated_at'
      and t.tgrelid = 'public.room_products'::regclass
  ) then
    execute 'create trigger room_products_set_updated_at before update on public.room_products for each row execute function public.set_updated_at()';
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
      and c.relname = 'room_products'
  ) and not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'room_products'
      and p.polname = 'Users manage their own room products'
  ) then
    execute '
      create policy "Users manage their own room products" on public.room_products
      for all to authenticated
      using (
        exists (
          select 1
          from public.rooms r
          join public.projects proj on proj.id = r.project_id
          where r.id = public.room_products.room_id
            and proj.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.rooms r
          join public.projects proj on proj.id = r.project_id
          where r.id = public.room_products.room_id
            and proj.owner_id = auth.uid()
        )
      )';
  end if;
end;
$$;
