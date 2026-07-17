create table if not exists public.room_product_payments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.room_products(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists room_product_payments_product_id_idx on public.room_product_payments (product_id);
create index if not exists room_product_payments_due_date_idx on public.room_product_payments (due_date);

alter table if exists public.room_product_payments enable row level security;

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
    where t.tgname = 'room_product_payments_set_updated_at'
      and t.tgrelid = 'public.room_product_payments'::regclass
  ) then
    execute 'create trigger room_product_payments_set_updated_at before update on public.room_product_payments for each row execute function public.set_updated_at()';
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
      and c.relname = 'room_product_payments'
  ) and not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'room_product_payments'
      and p.polname = 'Users manage their own room product payments'
  ) then
    execute '
      create policy "Users manage their own room product payments" on public.room_product_payments
      for all to authenticated
      using (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.room_product_payments.product_id
            and proj.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.room_products rp
          join public.rooms r on r.id = rp.room_id
          join public.projects proj on proj.id = r.project_id
          where rp.id = public.room_product_payments.product_id
            and proj.owner_id = auth.uid()
        )
      )';
  end if;
end;
$$;
