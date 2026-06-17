create table if not exists saved_posts (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

alter table saved_posts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists saved_posts_created_at_idx
  on saved_posts (created_at desc);

create index if not exists saved_posts_user_id_created_at_idx
  on saved_posts (user_id, created_at desc);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  document text,
  phone text,
  plan text not null default 'pro',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  credits_limit integer not null default 150,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx
  on profiles (email);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  credits_used integer not null check (credits_used > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_id_created_at_idx
  on usage_events (user_id, created_at desc);

alter table profiles enable row level security;
alter table saved_posts enable row level security;
alter table usage_events enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "saved_posts_select_own" on saved_posts;
create policy "saved_posts_select_own"
on saved_posts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_posts_insert_own" on saved_posts;
create policy "saved_posts_insert_own"
on saved_posts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_posts_update_own" on saved_posts;
create policy "saved_posts_update_own"
on saved_posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_posts_delete_own" on saved_posts;
create policy "saved_posts_delete_own"
on saved_posts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "usage_events_select_own" on usage_events;
create policy "usage_events_select_own"
on usage_events for select
to authenticated
using (auth.uid() = user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;

create trigger profiles_set_updated_at
before update on profiles
for each row
execute function set_updated_at();
