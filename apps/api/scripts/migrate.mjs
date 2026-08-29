import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const migrationsDirectory = new URL('../migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter(name => name.endsWith('.sql'))
  .sort();

const pool = new Pool({ connectionString });
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const name of migrationFiles) {
    const alreadyApplied = await client.query(
      'SELECT 1 FROM schema_migration WHERE name = $1',
      [name]
    );
    if (alreadyApplied.rowCount) continue;

    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migration (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
