import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await pool.query(`
    create table if not exists saved_posts (
      id uuid primary key,
      created_at timestamptz not null default now(),
      payload jsonb not null
    );

    create index if not exists saved_posts_created_at_idx
      on saved_posts (created_at desc);
  `);

  console.log("Banco inicializado com sucesso.");
} finally {
  await pool.end();
}
