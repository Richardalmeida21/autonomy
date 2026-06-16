create table if not exists saved_posts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists saved_posts_created_at_idx
  on saved_posts (created_at desc);
