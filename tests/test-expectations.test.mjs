import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExpectations } from '../src/lib/test-expectations.mjs';

test('version expectations replace vendor paths in keys and values', () => {
  const expected = loadExpectations('1.20.0', 'vendor/exb');
  assert.ok(Object.keys(expected.scopedQuery.expectLines).every((key) => key.startsWith('vendor/exb/')));
  assert.ok(expected.jsxAttributeQuery.expectUsage.path.startsWith('vendor/exb/'));
  assert.equal(expected.minApiUsageRatio, 0.25);
});

test('unknown or malformed versions do not inherit another version', () => {
  assert.throws(() => loadExpectations('9.9.9'), /No reviewed test expectations/);
  assert.throws(() => loadExpectations('../1.20.0'), /Invalid ExB version/);
});