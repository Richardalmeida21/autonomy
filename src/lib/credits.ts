import type { Pool, PoolClient } from "pg";

type QueryableDatabase = Pick<Pool | PoolClient, "query">;

let creditsSchemaReady = false;

export async function ensureCreditsSchema(database: QueryableDatabase) {
  if (creditsSchemaReady) {
    return;
  }

  await database.query(`
    alter table profiles
      add column if not exists credits_used integer not null default 0,
      add column if not exists credits_reserved integer not null default 0,
      add column if not exists credits_cycle_started_at timestamptz not null default date_trunc('month', now())
  `);

  await database.query(`
    with monthly_usage as (
      select
        user_id,
        coalesce(sum(
          case
            when metadata->>'status' in ('reserved', 'refunded') then 0
            else credits_used
          end
        ), 0)::int as used_credits,
        coalesce(sum(
          case
            when metadata->>'status' = 'reserved'
             and created_at >= now() - interval '30 minutes'
            then credits_used
            else 0
          end
        ), 0)::int as reserved_credits
      from usage_events
      where created_at >= date_trunc('month', now())
      group by user_id
    )
    update profiles p
    set credits_used = greatest(p.credits_used, monthly_usage.used_credits),
        credits_reserved = greatest(p.credits_reserved, monthly_usage.reserved_credits)
    from monthly_usage
    where p.id = monthly_usage.user_id
      and p.credits_used = 0
      and p.credits_reserved = 0
  `);

  creditsSchemaReady = true;
}
