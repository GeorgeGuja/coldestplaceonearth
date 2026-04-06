/**
 * Tests for parseBulletinTimestamp
 *
 * The function must handle three distinct problems:
 *   1. Parsing — extract day/hour/minute from a 6-digit field in a header line
 *   2. Month rollback — day-of-month encoded in header; full date reconstructed
 *      from current UTC year+month.  When the result is >1 h in the future the
 *      bulletin belongs to the *previous* calendar month.
 *   3. Year rollback — January bulletin fetched in February: month-1 == 0,
 *      which Date.UTC treats as December of the previous year.
 *
 * Run with:  npx tsx src/test-bulletin-timestamp.ts
 */

import assert from 'assert/strict';
import { parseBulletinTimestamp } from './synop-decoder.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake header string matching the format "WW_ID ORIG DDHHMI" */
function header(day: number, hour: number, minute: number): string {
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `SMRA10 RUHB ${dd}${hh}${mm}`;
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`       ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Parsing — valid and invalid inputs
// ---------------------------------------------------------------------------

console.log('\n── Parsing ──');

test('returns null for empty string', () => {
  assert.equal(parseBulletinTimestamp(''), null);
});

test('returns null when fewer than 3 whitespace-separated parts', () => {
  assert.equal(parseBulletinTimestamp('SMRA10 RUHB'), null);
});

test('returns null when time field is not 6 digits', () => {
  assert.equal(parseBulletinTimestamp('SMRA10 RUHB 0900'), null);    // too short
  assert.equal(parseBulletinTimestamp('SMRA10 RUHB 09000A'), null);  // non-digit
});

test('returns null for day=00', () => {
  assert.equal(parseBulletinTimestamp(header(0, 0, 0)), null);
});

test('returns null for day=32', () => {
  assert.equal(parseBulletinTimestamp(header(32, 0, 0)), null);
});

test('returns null for hour=24', () => {
  assert.equal(parseBulletinTimestamp(header(1, 24, 0)), null);
});

test('returns null for minute=60', () => {
  assert.equal(parseBulletinTimestamp(header(1, 0, 60)), null);
});

test('returns a Date object for a valid header', () => {
  const result = parseBulletinTimestamp(header(5, 6, 0));
  assert.ok(result instanceof Date, 'expected a Date');
  assert.ok(!isNaN(result.getTime()), 'expected a valid Date');
});

test('parses hour and minute correctly', () => {
  // Simulate: today is April 5 → day=5 is same-month, no rollback needed
  const now = new Date();
  const day = now.getUTCDate();
  const result = parseBulletinTimestamp(header(day, 14, 30))!;
  assert.ok(result instanceof Date);
  assert.equal(result.getUTCHours(), 14);
  assert.equal(result.getUTCMinutes(), 30);
});

// ---------------------------------------------------------------------------
// 2. Month rollback — the core logic under test
// ---------------------------------------------------------------------------

console.log('\n── Month rollback ──');

test('same-day bulletin: no rollback (returns current month)', () => {
  // Use today's UTC date — cannot be in the future, so no rollback expected
  const now = new Date();
  const result = parseBulletinTimestamp(header(now.getUTCDate(), 0, 0))!;
  assert.ok(result instanceof Date);
  assert.equal(result.getUTCMonth(), now.getUTCMonth(),
    'same-day bulletin should stay in the current month');
});

test('bulletin from earlier today: no rollback', () => {
  const now = new Date();
  const hourEarlier = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 h ago
  const result = parseBulletinTimestamp(
    header(hourEarlier.getUTCDate(), hourEarlier.getUTCHours(), 0)
  )!;
  assert.ok(result instanceof Date);
  // The result should be ≤ now
  assert.ok(result.getTime() <= now.getTime() + 60_000, // 1-min tolerance
    `bulletin 3 h ago should not be in the future (got ${result.toISOString()})`);
});

test('bulletin just under 1 h in the future: no rollback (scheduling tolerance)', () => {
  // Bulletins can be pre-issued up to ~1 h ahead.  The function allows this.
  const now = new Date();
  const soonUtc = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
  const result = parseBulletinTimestamp(
    header(soonUtc.getUTCDate(), soonUtc.getUTCHours(), soonUtc.getUTCMinutes())
  )!;
  // It is in the future but within the 1-hour tolerance — should NOT roll back
  assert.ok(result instanceof Date);
  assert.equal(result.getUTCMonth(), now.getUTCMonth(),
    'bulletin 30 min ahead should keep current month (within tolerance)');
});

test('MAMA case: day=26 fetched on April 5 rolls back to March 26', () => {
  // Simulate being called on April 5, 2026 at 22:00 UTC.
  // The bulletin header says day=26 → naively April 26, which is 21 days ahead.
  // Expected result: March 26, 06:00 UTC.

  // We can't freeze Date.now() without a test framework, so we test the
  // *observable contract* directly: parse a header with today's day+21
  // and assert the result is in the past, not the future.
  const now = new Date();
  const futureDay = now.getUTCDate() + 21;
  if (futureDay > 28) {
    // Day arithmetic gets complicated near month ends; skip rather than assert wrong
    console.log('       (skipped: too close to month end to test safely)');
    passed--; // cancel the increment that happens on success
    return;
  }
  const result = parseBulletinTimestamp(header(futureDay, 6, 0))!;
  assert.ok(result instanceof Date,
    'should return a Date, not null');
  assert.ok(result.getTime() <= now.getTime() + 60_000,
    `day=${futureDay} from today should have rolled back (got ${result.toISOString()})`);
});

test('day 26 with hour exactly 1 h in future: rolls back', () => {
  // A bulletin timed 61 minutes from now should roll back.
  const now = new Date();
  const future = new Date(now.getTime() + 61 * 60 * 1000);
  if (future.getUTCDate() === now.getUTCDate()) {
    // Same day — this doesn't exercise the rollback path cleanly, skip
    console.log('       (skipped: same-day edge, needs different offset)');
    passed--;
    return;
  }
  const result = parseBulletinTimestamp(
    header(future.getUTCDate(), future.getUTCHours(), future.getUTCMinutes())
  )!;
  assert.ok(result instanceof Date);
  assert.ok(result.getTime() <= now.getTime() + 60_000,
    `bulletin 61 min in future on a different day should roll back (got ${result.toISOString()})`);
});

// ---------------------------------------------------------------------------
// 3. Year rollback — January bulletin fetched in February
// ---------------------------------------------------------------------------

console.log('\n── Year rollback ──');

test('January bulletin fetched in February resolves to previous year December? No — to January', () => {
  // Scenario: "now" is February 5. Bulletin day=26. Naively Feb 26 = 21 days ahead.
  // Rollback: month-1 = January (month index 0). Still same year.
  // We can't set the system clock, so we verify the invariant instead:
  // after rollback the result must be <= now + 1 h regardless of the month boundary.
  const now = new Date();
  const farFutureDay = Math.min(now.getUTCDate() + 15, 28);
  const result = parseBulletinTimestamp(header(farFutureDay, 0, 0))!;
  if (result === null) {
    // May happen legitimately near end of month
    console.log('       (null result, skipped)');
    passed--;
    return;
  }
  assert.ok(result.getTime() <= now.getTime() + 60_000 * 60,
    `rolled-back result must not be more than 1 h in the future (got ${result.toISOString()})`);
});

test('Date.UTC handles month=-1 as December of the previous year (language guarantee)', () => {
  // This validates the JS behaviour our rollback relies on.
  const dec = new Date(Date.UTC(2026, -1, 31, 0, 0)); // month -1 of 2026
  assert.equal(dec.getUTCFullYear(), 2025, 'month -1 should be previous year');
  assert.equal(dec.getUTCMonth(), 11, 'month -1 should be December (index 11)');
  assert.equal(dec.getUTCDate(), 31);
});

test('January bulletin (day > today) fetched in February returns a past date', () => {
  // Simulate: construct a header for day=28 and pretend the current month is
  // such that day 28 is definitely in the future.  The invariant is simply
  // that the returned timestamp < now + 1 h.
  const now = new Date();
  if (now.getUTCDate() >= 28) {
    console.log('       (skipped: today is day 28+ so day=28 is not in the future)');
    passed--;
    return;
  }
  const result = parseBulletinTimestamp(header(28, 12, 0))!;
  assert.ok(result instanceof Date);
  assert.ok(result.getTime() <= now.getTime() + 60_000,
    `should have rolled back to previous month (got ${result.toISOString()})`);
});

// ---------------------------------------------------------------------------
// 4. Staleness — parseSynopBulletin drops old bulletins
// ---------------------------------------------------------------------------

console.log('\n── Staleness filtering (parseSynopBulletin) ──');

import { parseSynopBulletin } from './synop-decoder.js';

test('bulletin with current timestamp is accepted', () => {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const bulletin = [
    `SMRA22 RUNW ${dd}${hh}00`,
    'AAXX 05061',
    '30157 42998 01503 11383 21416 30044 40375 58010=',
  ].join('\n');
  const obs = parseSynopBulletin(bulletin);
  assert.ok(obs.length > 0, 'current-timestamp bulletin should yield observations');
});

test('MAMA case: bulletin timestamped 10 days ago is rejected entirely', () => {
  // day=26 on April 5 → March 26 after rollback → 10 days old → dropped
  const now = new Date();
  const staleDay = now.getUTCDate() + 10; // always in the future naively → rolls back 10 days
  if (staleDay > 31) {
    console.log('       (skipped: stale day > 31)');
    passed--;
    return;
  }
  const dd = String(staleDay).padStart(2, '0');
  const bulletin = [
    `SMRA22 RUNW ${dd}0600`,
    'AAXX 26061',
    '30157 42998 01503 11383 21416 30044 40375 58010=',
  ].join('\n');
  const obs = parseSynopBulletin(bulletin);
  assert.equal(obs.length, 0,
    `10-day-old bulletin should be rejected (got ${obs.length} observations)`);
});

test('bulletin with no parseable timestamp is not rejected (passes through)', () => {
  // If we cannot parse the header we should not silently drop valid data —
  // the observations should still be returned (with timestamp = new Date()).
  const bulletin = [
    'GARBAGE HEADER LINE',
    'AAXX 05061',
    '30157 42998 01503 11383 21416 30044 40375 58010=',
  ].join('\n');
  const obs = parseSynopBulletin(bulletin);
  assert.ok(obs.length > 0, 'unparseable-header bulletin should still yield observations');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'─'.repeat(50)}`);
if (failed === 0) {
  console.log(`✅  All ${passed} tests passed.\n`);
  process.exit(0);
} else {
  console.log(`❌  ${failed} of ${passed + failed} tests failed.\n`);
  process.exit(1);
}
