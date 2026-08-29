import test from 'node:test';
import assert from 'node:assert/strict';
import { OPPORTUNITY_STATUSES, isOpportunityStatus } from '../packages/domain/dist/index.js';

test('MVP opportunity statuses stay intentionally small', () => {
  assert.deepEqual(OPPORTUNITY_STATUSES, ['saved', 'applied', 'passed']);
  assert.equal(isOpportunityStatus('applied'), true);
  assert.equal(isOpportunityStatus('interviewing'), false);
});
