const test = require('node:test');
const assert = require('node:assert/strict');
const {
  combinations,
  hypergeometricPMF,
  calculateSingleCardProbability,
  calculateTwoCardComboProbability,
} = require('../utils/hypergeometric');

test('1. combinations(n, k) computes exact binomial coefficients and handles edge cases', () => {
  assert.equal(combinations(40, 5), 658008);
  assert.equal(combinations(60, 7), 386206920);
  assert.equal(combinations(10, 0), 1);
  assert.equal(combinations(10, 10), 1);
  assert.equal(combinations(5, 8), 0);
});

test('2. hypergeometricPMF(N, K, n, k) computes exact k-copy draw probabilities', () => {
  // 40-card deck, 3 copies of Ash Blossom, 5-card opening hand
  // P(X = 0) = C(3,0)*C(37,5)/C(40,5) = 435897 / 658008 ≈ 0.662449
  const pZero = hypergeometricPMF(40, 3, 5, 0);
  assert.equal(Number((pZero * 100).toFixed(2)), 66.24);

  // P(X = 1) = C(3,1)*C(37,4)/C(40,5) = (3 * 66045) / 658008 ≈ 0.301116
  const pOne = hypergeometricPMF(40, 3, 5, 1);
  assert.equal(Number((pOne * 100).toFixed(2)), 30.11);
});

test('3. calculateSingleCardProbability validates standard 40-card deck (3 copies, 5 drawn -> 33.76%)', () => {
  const result = calculateSingleCardProbability(40, 3, 5, 1);

  assert.equal(result.atLeastDesiredPct, 33.76);
  assert.equal(result.zeroCopiesPct, 66.24);
  assert.equal(result.distribution.length, 4); // k = 0, 1, 2, 3

  // Total probability across all possible outcomes must sum to 1.0
  const totalProb = result.distribution.reduce((sum, item) => sum + item.probability, 0);
  assert.ok(Math.abs(totalProb - 1) < 1e-9);
});

test('4. calculateTwoCardComboProbability accurately calculates bivariate 2-card opening hand combos', () => {
  // 40-card deck, 3 copies of Starter A, 3 copies of Extender B, 5-card hand
  const combo = calculateTwoCardComboProbability(40, 3, 3, 5, 1, 1);

  // By Inclusion-Exclusion: P(A>=1 ^ B>=1) = 1 - P(A=0) - P(B=0) + P(A=0 ^ B=0)
  // P(A=0) = C(37,5)/C(40,5), P(A=0 ^ B=0) = C(34,5)/C(40,5)
  const pA0 = combinations(37, 5) / combinations(40, 5);
  const pB0 = pA0;
  const pBoth0 = combinations(34, 5) / combinations(40, 5);
  const expected = 1 - pA0 - pB0 + pBoth0; // ~0.107795 -> 10.78%

  assert.ok(Math.abs(combo.probability - expected) < 1e-9);
  assert.equal(combo.percentage, 10.78);
});
