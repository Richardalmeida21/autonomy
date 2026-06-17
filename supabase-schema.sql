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

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'meta',
  auth_flow text not null default 'instagram_login',
  page_id text,
  page_name text,
  instagram_business_account_id text not null,
  instagram_username text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, instagram_business_account_id)
);

alter table social_accounts
  add column if not exists auth_flow text not null default 'instagram_login';

alter table social_accounts
  alter column page_id drop not null,
  alter column page_name drop not null;

create index if not exists social_accounts_user_id_idx
  on social_accounts (user_id, status);

create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_post_id uuid references saved_posts(id) on delete set null,
  social_account_id uuid not null references social_accounts(id) on delete cascade,
  caption text not null,
  media_urls jsonb not null default '[]'::jsonb,
  original_payload jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  provider_media_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_posts_status_check
    check (status in ('pending', 'publishing', 'published', 'failed', 'canceled'))
);

create index if not exists scheduled_posts_user_id_created_at_idx
  on scheduled_posts (user_id, created_at desc);

create index if not exists scheduled_posts_due_idx
  on scheduled_posts (scheduled_for, status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

alter table profiles enable row level security;
alter table saved_posts enable row level security;
alter table usage_events enable row level security;
alter table social_accounts enable row level security;
alter table scheduled_posts enable row level security;

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

drop policy if exists "social_accounts_select_own" on social_accounts;
create policy "social_accounts_select_own"
on social_accounts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "social_accounts_delete_own" on social_accounts;
create policy "social_accounts_delete_own"
on social_accounts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scheduled_posts_select_own" on scheduled_posts;
create policy "scheduled_posts_select_own"
on scheduled_posts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scheduled_posts_insert_own" on scheduled_posts;
create policy "scheduled_posts_insert_own"
on scheduled_posts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "scheduled_posts_update_own" on scheduled_posts;
create policy "scheduled_posts_update_own"
on scheduled_posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "scheduled_posts_delete_own" on scheduled_posts;
create policy "scheduled_posts_delete_own"
on scheduled_posts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "post_images_read_public" on storage.objects;
create policy "post_images_read_public"
on storage.objects for select
to public
using (bucket_id = 'post-images');

drop policy if exists "post_images_insert_own" on storage.objects;
create policy "post_images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

drop trigger if exists social_accounts_set_updated_at on social_accounts;

create trigger social_accounts_set_updated_at
before update on social_accounts
for each row
execute function set_updated_at();

drop trigger if exists scheduled_posts_set_updated_at on scheduled_posts;

create trigger scheduled_posts_set_updated_at
before update on scheduled_posts
for each row
execute function set_updated_at();
