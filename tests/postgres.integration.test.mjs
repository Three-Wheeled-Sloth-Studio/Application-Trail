import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const databaseUrl = process.env.DATABASE_URL;

test('PostgreSQL capture round-trip preserves source evidence and ownership', { skip: !databaseUrl }, async () => {
  const [{ Pool }, { PgApplicationTrailStore }] = await Promise.all([
    import('pg'),
    import('../apps/api/dist/store.js')
  ]);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const migration = await readFile(new URL('../apps/api/migrations/001_core.sql', import.meta.url), 'utf8');
    await pool.query(migration);

    const store = new PgApplicationTrailStore(pool);
    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    const sourceUrl = 'https://jobs.example.test/roles/product-123';
    const sourceText = 'Synthetic job fixture. Required: product discovery. Preferred: PostgreSQL.';

    const created = await store.captureOpportunity(ownerId, {
      sourceSite: 'jobs.example.test',
      sourceUrl,
      pageTitle: 'Senior Product Manager - Example',
      sourceText,
      publishedTitle: 'Senior Product Manager',
      publishedCompanyName: 'Example Company',
      observedLocationText: 'Remote - United States',
      status: 'applied'
    });

    assert.equal(created.listings.length, 1);
    assert.equal(created.listings[0].observation.sourceUrl, sourceUrl);
    assert.equal(created.listings[0].snapshot.sourceText, sourceText);
    assert.equal(created.application?.currentStatus, 'applied');
    assert.equal(created.events[0]?.eventType, 'application_submitted');

    const fetched = await store.getOpportunity(ownerId, created.opportunity.id);
    assert.equal(fetched?.listings[0].snapshot.sourceText, sourceText);

    const forbidden = await store.getOpportunity(otherUserId, created.opportunity.id);
    assert.equal(forbidden, null);

    const passed = await store.setApplicationStatus(ownerId, created.opportunity.id, 'passed');
    assert.equal(passed.application?.currentStatus, 'passed');
    assert.equal(passed.opportunity.currentStatus, 'passed');
    assert.equal(passed.events.at(-1)?.eventType, 'status_changed');
    assert.deepEqual(passed.events.at(-1)?.payload, {
      previousStatus: 'applied',
      nextStatus: 'passed'
    });
  } finally {
    await pool.end();
  }
});
