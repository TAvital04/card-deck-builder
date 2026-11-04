/**
 * Calculates binomial coefficient C(n, k) = n! / (k! * (n - k)!)
 * Uses multiplicative formula to prevent factorial overflow.
 * @param {number} n - Total items
 * @param {number} k - Items chosen
 * @returns {number}
 */
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // Take advantage of symmetry: C(n, k) === C(n, n - k)
  const effectiveK = Math.min(k, n - k);
  let result = 1;
  
  for (let i = 1; i <= effectiveK; i++) {
    result = (result * (n - effectiveK + i)) / i;
  }
  
  return Math.round(result);
}

/**
 * Exact Hypergeometric Probability Mass Function: P(X = k)
 * @param {number} N - Deck size (total population)
 * @param {number} K - Copies of target card in deck (total successes)
 * @param {number} n - Hand size / cards drawn (sample size)
 * @param {number} k - Exact number of target cards wanted in hand
 * @returns {number} Probability in [0, 1]
 */
function hypergeometricPMF(N, K, n, k) {
  const minK = Math.max(0, n - (N - K));
  const maxK = Math.min(n, K);
  
  if (k < minK || k > maxK) return 0;
  
  const totalWays = combinations(N, n);
  if (totalWays === 0) return 0;
  
  const waysSuccess = combinations(K, k);
  const waysFailure = combinations(N - K, n - k);
  
  return (waysSuccess * waysFailure) / totalWays;
}

/**
 * Single-card cumulative and full probability breakdown: P(X >= minDesired)
 * @param {number} N - Deck size
 * @param {number} K - Copies of target card in deck
 * @param {number} n - Hand size / cards drawn
 * @param {number} minDesired - Minimum copies desired in hand (default: 1)
 */
function calculateSingleCardProbability(N, K, n, minDesired = 1) {
  if (N <= 0 || K < 0 || n < 0 || K > N || n > N) {
    throw new Error('Invalid hypergeometric parameters: ensure 0 <= K <= N and 0 <= n <= N.');
  }

  const maxPossible = Math.min(n, K);
  const distribution = [];
  let probAtLeastMin = 0;
  let probLessThanMin = 0;

  for (let i = 0; i <= maxPossible; i++) {
    const p = hypergeometricPMF(N, K, n, i);
    distribution.push({
      copies: i,
      probability: p,
      percentage: Number((p * 100).toFixed(2)),
    });
    if (i >= minDesired) {
      probAtLeastMin += p;
    } else {
      probLessThanMin += p;
    }
  }

  const exactDesired = hypergeometricPMF(N, K, n, minDesired);

  return {
    parameters: { N, K, n, minDesired },
    atLeastDesired: probAtLeastMin,
    atLeastDesiredPct: Number((probAtLeastMin * 100).toFixed(2)),
    exactDesired,
    exactDesiredPct: Number((exactDesired * 100).toFixed(2)),
    zeroCopies: distribution[0]?.probability ?? 0,
    zeroCopiesPct: distribution[0]?.percentage ?? 0,
    lessThanDesired: probLessThanMin,
    lessThanDesiredPct: Number((probLessThanMin * 100).toFixed(2)),
    distribution,
  };
}

/**
 * Multivariate Hypergeometric Probability for a 2-Card Combo:
 * P(A >= minA AND B >= minB) when drawing n cards from an N-card deck
 * where Card A and Card B are distinct card sets.
 *
 * Joint PMF: [C(Ka, a) * C(Kb, b) * C(N - Ka - Kb, n - a - b)] / C(N, n)
 *
 * @param {number} N - Deck size
 * @param {number} Ka - Copies of Card A in deck
 * @param {number} Kb - Copies of Card B in deck
 * @param {number} n - Hand size / cards drawn
 * @param {number} minA - Minimum copies of Card A needed (default: 1)
 * @param {number} minB - Minimum copies of Card B needed (default: 1)
 */
function calculateTwoCardComboProbability(N, Ka, Kb, n, minA = 1, minB = 1) {
  if (N <= 0 || Ka < 0 || Kb < 0 || n < 0 || Ka + Kb > N || n > N) {
    throw new Error('Invalid bivariate parameters: ensure Ka + Kb <= N and n <= N.');
  }

  const totalWays = combinations(N, n);
  if (totalWays === 0) {
    return { probability: 0, percentage: 0 };
  }

  const remainingPool = N - Ka - Kb;
  let jointSuccessProb = 0;

  const maxA = Math.min(Ka, n);
  for (let a = minA; a <= maxA; a++) {
    const waysA = combinations(Ka, a);
    const maxB = Math.min(Kb, n - a);

    for (let b = minB; b <= maxB; b++) {
      const othersDrawn = n - a - b;
      if (othersDrawn >= 0 && othersDrawn <= remainingPool) {
        const waysB = combinations(Kb, b);
        const waysOthers = combinations(remainingPool, othersDrawn);
        jointSuccessProb += (waysA * waysB * waysOthers) / totalWays;
      }
    }
  }

  return {
    parameters: { N, Ka, Kb, n, minA, minB },
    probability: jointSuccessProb,
    percentage: Number((jointSuccessProb * 100).toFixed(2)),
  };
}

module.exports = {
  combinations,
  hypergeometricPMF,
  calculateSingleCardProbability,
  calculateTwoCardComboProbability,
};
