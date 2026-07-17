create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rooms_project_id_idx on public.rooms (project_id);
create index if not exists rooms_sort_order_idx on public.rooms (sort_order);

alter table if exists public.rooms enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'rooms'
  ) and not exists (
    select 1
    from pg_trigger t
    where t.tgname = 'rooms_set_updated_at'
      and t.tgrelid = 'public.rooms'::regclass
  ) then
    execute 'create trigger rooms_set_updated_at before update on public.rooms for each row execute function public.set_updated_at()';
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
      and c.relname = 'rooms'
  ) and not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'rooms'
      and p.polname = 'Users manage their own rooms'
  ) then
    execute '
      create policy "Users manage their own rooms" on public.rooms
      for all to authenticated
      using (
        exists (
          select 1
          from public.projects proj
          where proj.id = public.rooms.project_id
            and proj.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects proj
          where proj.id = public.rooms.project_id
            and proj.owner_id = auth.uid()
        )
      )';
  end if;
end;
$$;
