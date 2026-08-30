import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

const databaseUrl = process.env.DATABASE_URL;

async function migrate(pool) {
  const migrationDirectory = new URL('../apps/api/migrations/', import.meta.url);
  const files = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort();
  for (const file of files) {
    await pool.query(await readFile(new URL(file, migrationDirectory), 'utf8'));
  }
}

test('PostgreSQL capture round-trip preserves source evidence and ownership', { skip: !databaseUrl }, async () => {
  const [{ Pool }, { PgApplicationTrailStore }] = await Promise.all([
    import('pg'),
    import('../apps/api/dist/store.js')
  ]);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(pool);

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

    const summaries = await store.listOpportunities(ownerId);
    assert.ok(summaries.some(summary => summary.id === created.opportunity.id));

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

test('Google subject identity and opaque sessions remain stable', { skip: !databaseUrl }, async () => {
  const [{ Pool }, { PgAuthStore }] = await Promise.all([
    import('pg'),
    import('../apps/api/dist/auth.js')
  ]);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(pool);
    const auth = new PgAuthStore(pool);
    const subject = `google-test-${randomUUID()}`;
    const first = await auth.upsertGoogleIdentity({ sub: subject, email: 'first@example.test', name: 'Synthetic User' });
    const second = await auth.upsertGoogleIdentity({ sub: subject, email: 'updated@example.test', name: 'Synthetic User' });
    assert.equal(first.userId, second.userId);

    const session = await auth.createSession(first.userId, 'web', 60_000);
    const resolved = await auth.resolveSessionToken(session.token);
    assert.equal(resolved?.userId, first.userId);
    assert.equal(resolved?.email, 'updated@example.test');

    await auth.revokeSession(session.sessionId);
    assert.equal(await auth.resolveSessionToken(session.token), null);

    const grant = await auth.createExtensionGrant(60_000);
    assert.equal((await auth.consumeExtensionGrant(grant.grantId, grant.grantSecret)).status, 'pending');
    assert.equal(await auth.authorizeExtensionGrant(grant.grantId, first.userId), true);
    const consumed = await auth.consumeExtensionGrant(grant.grantId, grant.grantSecret);
    assert.equal(consumed.status, 'authorized');
  } finally {
    await pool.end();
  }
});
