create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.room_products (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  product_name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.room_inspiration_images (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index rooms_project_id_idx on public.rooms (project_id);
create index room_products_room_id_idx on public.room_products (room_id);
create index room_inspiration_images_room_id_idx on public.room_inspiration_images (room_id);

alter table public.rooms enable row level security;
alter table public.room_products enable row level security;
alter table public.room_inspiration_images enable row level security;

create policy "Users manage their own rooms" on public.rooms
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users manage their own room products" on public.room_products
  for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));

create policy "Users manage their own room inspiration images" on public.room_inspiration_images
  for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));
