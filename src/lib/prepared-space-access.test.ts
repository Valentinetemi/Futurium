import assert from 'node:assert/strict';
import test from 'node:test';

import { canPrepareSpace } from '@/lib/prepared-space-access';

test('Free can prepare its first space', () => {
  assert.equal(
    canPrepareSpace({ isPlusActive: false, preparedSpaceCount: 0 }),
    true,
  );
});

test('Free preserves existing spaces but cannot prepare another', () => {
  assert.equal(
    canPrepareSpace({ isPlusActive: false, preparedSpaceCount: 1 }),
    false,
  );
  assert.equal(
    canPrepareSpace({ isPlusActive: false, preparedSpaceCount: 3 }),
    false,
  );
});

test('Plus can prepare unlimited spaces', () => {
  assert.equal(
    canPrepareSpace({ isPlusActive: true, preparedSpaceCount: 12 }),
    true,
  );
});
