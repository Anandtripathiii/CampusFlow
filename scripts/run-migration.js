#!/usr/bin/env node
// Runs every pending migration under supabase/migrations/*.sql against
// Postgres in sorted order, then verifies by selecting one column from
// each new object. Idempotent — the SQL itself uses IF NOT EXISTS.
//
// Required env (checked in this order):
//   POSTGRES_URL  — full connection string (preferred; what Supabase sets)
//   DATABASE_URL  — alias many hosts use
//
// Usage: node scripts/run-migration.js
//
// Will log every applied file, print SELECTs for sanity, and exit 1 on
// the first SQL error so the caller can fix and re-run.

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.error(
    "No POSTGRES_URL / DATABASE_URL set.\n" +
    "Get it from Supabase → Project Settings → Database → Connection string (session or direct)\n" +
    "and export it before running: POSTGRES_URL='postgres://...' node scripts/run-migration.js"
  );
  process.exit(1);
}

const needsSsl = /supabase\.(co|com)|amazonaws\.com|neon|render/.test(connectionString);

async function main() {
  const dir = path.join(__dirname, "..", "supabase", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  const client = new Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  console.log("Connected to Postgres.");

  try {
    for (const name of files) {
      const sql = fs.readFileSync(path.join(dir, name), "utf8");
      console.log(`\n>>> Applying ${name} (${sql.length} bytes)…`);
      await client.query(sql);
      console.log(`    ok`);
    }

    console.log("\n>>> Verifying new objects…");
    const checks = [
      "select 1 from information_schema.columns where table_schema='public' and table_name='user_profiles' and column_name='onboarding_completed'",
      "select 1 from information_schema.tables  where table_schema='public' and table_name='classes'",
      "select 1 from information_schema.tables  where table_schema='public' and table_name='assignments'",
      "select 1 from information_schema.tables  where table_schema='public' and table_name='projects'",
      "select 1 from information_schema.tables  where table_schema='public' and table_name='legacy_backup'",
    ];
    for (const q of checks) {
      const r = await client.query(q);
      const label = q.split("'").slice(-2, -1)[0];
      console.log(r.rowCount ? `    ✓ ${label}` : `    ✗ ${label} MISSING`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
