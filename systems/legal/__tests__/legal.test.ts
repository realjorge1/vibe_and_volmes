import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGES, getCharge } from '../../../data/legal/charges';
import { convictionChance, escapeOdds, lawyerCost, rollVerdict, captureChance, ESCAPE_STEPS } from '../legalEngine';

test('charges are well-formed', () => {
  assert.equal(new Set(CHARGES.map((c) => c.id)).size, CHARGES.length);
  for (const c of CHARGES) {
    assert.ok(c.evidence > 0 && c.evidence < 1, c.id);
    assert.ok(c.sentence[0] <= c.sentence[1], c.id);
    assert.ok(c.headline.includes('{playerName}'), `${c.id} headline names the artist`);
  }
});

test('lawyers: better is pricier and wins more; a plea is certain', () => {
  const assault = getCharge('assault')!;
  assert.equal(lawyerCost('public', assault, 10_000), 0);
  assert.ok(lawyerCost('elite', assault, 10_000) > lawyerCost('solid', assault, 10_000));
  const pub = convictionChance(assault, 'public', 50, 0);
  const elite = convictionChance(assault, 'elite', 50, 0);
  assert.ok(elite < pub);
  assert.equal(convictionChance(assault, 'plea', 50, 0), 1);
  assert.ok(convictionChance(assault, 'solid', 50, 3) > convictionChance(assault, 'solid', 50, 0), 'priors hurt');
});

test('verdicts: acquittal, probation, or time', () => {
  const assault = getCharge('assault')!;
  assert.deepEqual(rollVerdict(assault, 'public', 50, 0, () => 0.99), { convicted: false, weeks: 0 });
  const convicted = rollVerdict(assault, 'public', 50, 0, () => 0.01);
  assert.equal(convicted.convicted, true);
  assert.ok(convicted.weeks >= 2);
  const plea = rollVerdict(getCharge('trespassing')!, 'plea', 50, 0, () => 0.01);
  assert.equal(plea.weeks, 0, 'a short plea is probation');
});

test('the escape leans on stats; the manhunt tightens', () => {
  assert.ok(escapeOdds(0.5, 90) > escapeOdds(0.5, 20));
  assert.ok(escapeOdds(0.1, 0) >= 0.15 && escapeOdds(0.9, 100) <= 0.9);
  assert.ok(captureChance(5) > captureChance(1));
  assert.equal(ESCAPE_STEPS.length, 3);
});
