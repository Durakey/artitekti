create type public.project_category as enum (
  'apartment', 'house', 'office', 'beauty_salon', 'pilates_studio', 'restaurant', 'hotel', 'custom'
);

create type public.project_status as enum (
  'planning', 'design', 'ordering', 'construction', 'installation', 'completed'
);


create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  default_currency char(3) not null default 'EUR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_default_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  client_name text not null check (char_length(trim(client_name)) between 2 and 160),
  client_phone text,
  client_email text,
  location text,
  google_maps_url text,
  category public.project_category not null default 'apartment',
  custom_category text,
  status public.project_status not null default 'planning',
  start_date date,
  deadline date,
  completion_percent numeric(5,2) not null default 0 check (completion_percent between 0 and 100),
  budget_amount numeric(14,2) not null default 0 check (budget_amount >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  cover_image_path text,
  description text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint projects_custom_category_required check (category <> 'custom' or nullif(trim(custom_category), '') is not null),
  constraint projects_deadline_after_start check (deadline is null or start_date is null or deadline >= start_date),
  constraint projects_client_email_format check (client_email is null or client_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint projects_google_maps_url_format check (google_maps_url is null or google_maps_url ~* '^https?://')
);

create index projects_owner_status_deadline_idx on public.projects (owner_id, status, deadline);
create index projects_owner_updated_at_idx on public.projects (owner_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

create policy "Users manage their own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users manage their own projects" on public.projects
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
