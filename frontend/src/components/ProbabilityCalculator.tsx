import { useRef, useState, type FormEvent } from 'react';
import { calcApi, type ComboProbabilityResult, type SingleProbabilityResult } from '../services/api';

type CalculatorMode = 'single' | 'combo';

function wholeNumber(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }

export default function ProbabilityCalculator() {
  const [mode, setMode] = useState<CalculatorMode>('single');
  const [deckSize, setDeckSize] = useState(40);
  const [drawSize, setDrawSize] = useState(5);
  const [targetCopies, setTargetCopies] = useState(3);
  const [minDesired, setMinDesired] = useState(1);
  const [copiesA, setCopiesA] = useState(3);
  const [copiesB, setCopiesB] = useState(3);
  const [minA, setMinA] = useState(1);
  const [minB, setMinB] = useState(1);
  const [singleResult, setSingleResult] = useState<SingleProbabilityResult | null>(null);
  const [comboResult, setComboResult] = useState<ComboProbabilityResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestSequence = useRef(0);

  function invalidate() {
    requestSequence.current += 1;
    setSingleResult(null); setComboResult(null); setError(''); setLoading(false);
  }

  function numberField(label: string, value: number, onChange: (n: number) => void, min = 0) {
    return <label className="field calc-field"><span>{label}</span><input type="number" min={min} step="1" value={Number.isNaN(value) ? '' : value} required onChange={(event) => { invalidate(); onChange(event.target.value === '' ? NaN : Number(event.target.value)); }} /></label>;
  }

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = [deckSize, drawSize, mode === 'single' ? targetCopies : copiesA, mode === 'single' ? minDesired : minA, ...(mode === 'combo' ? [copiesB, minB] : [])];
    if (values.some((n) => !wholeNumber(n)) || deckSize < 1 || drawSize < 1 || drawSize > deckSize) { setError('Use whole numbers. Deck size and hand size must be positive; hand size cannot exceed deck size.'); return; }
    if (mode === 'single' && (targetCopies > deckSize || minDesired < 1 || minDesired > targetCopies)) { setError('Target copies must fit within the deck; minimum desired must be 1 to target copies.'); return; }
    if (mode === 'combo' && (copiesA + copiesB > deckSize || minA < 1 || minB < 1 || minA > copiesA || minB > copiesB)) { setError('A + B copies must not exceed deck size, and minimums must be between 1 and their respective copy counts.'); return; }

    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      if (mode === 'single') {
        const response = await calcApi.single({ deckSize, targetCopies, drawSize, minDesired });
        if (requestSequence.current === sequence) setSingleResult(response.data);
      } else {
        const response = await calcApi.combo({ deckSize, copiesA, copiesB, drawSize, minA, minB });
        if (requestSequence.current === sequence) setComboResult(response.data);
      }
    } catch (caught) {
      if (requestSequence.current === sequence) setError(caught instanceof Error ? caught.message : 'Calculation failed.');
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }

  const distribution = singleResult?.distribution || [];
  const chartMaximum = Math.max(1, ...distribution.map((item) => item.percentage));
  const comboSuccess = Math.max(0, Math.min(100, comboResult?.percentage ?? 0));

  return (
    <section className="workspace-panel" aria-labelledby="calc-heading">
      <div className="section-heading"><div><p className="eyebrow">PROBABILITY LAB</p><h2 id="calc-heading">Probability calculator</h2><p className="section-description">Exact hypergeometric odds, powered by your backend API.</p></div><span className="section-tag">Without replacement</span></div>
      <div className="calc-layout">
        <div className="calc-controls surface-panel"><h3>Configure your draw</h3><p className="muted-copy">Choose a calculation type, enter your deck details and calculate the odds.</p>
          <div className="mode-switch" role="group" aria-label="Calculation type"><button type="button" className={mode === 'single' ? 'selected' : ''} aria-pressed={mode === 'single'} onClick={() => { invalidate(); setMode('single'); }}>Single card</button><button type="button" className={mode === 'combo' ? 'selected' : ''} aria-pressed={mode === 'combo'} onClick={() => { invalidate(); setMode('combo'); }}>Two-card combo</button></div>
          <form onSubmit={(event) => void calculate(event)} className="calc-form">
            <div className="calc-form-grid">{numberField('Total deck size', deckSize, setDeckSize, 1)}{numberField('Cards drawn (hand)', drawSize, setDrawSize, 1)}</div>
            {mode === 'single' ? <div className="calc-form-grid">{numberField('Target copies in deck', targetCopies, setTargetCopies)}{numberField('Minimum copies wanted', minDesired, setMinDesired, 1)}</div> : <><div className="calc-form-grid">{numberField('Card A copies', copiesA, setCopiesA)}{numberField('Minimum A in hand', minA, setMinA, 1)}</div><div className="calc-form-grid">{numberField('Card B copies', copiesB, setCopiesB)}{numberField('Minimum B in hand', minB, setMinB, 1)}</div></>}
            {error && <div role="alert" className="notice-error">{error}</div>}
            <button type="submit" className="button button-primary calc-submit" disabled={loading}>{loading ? 'Calculating…' : 'Calculate probability'} <span aria-hidden="true">↗</span></button>
          </form>
          <p className="calc-help">Results come from <code>{mode === 'single' ? 'POST /api/calc/single' : 'POST /api/calc/combo'}</code>. Run the Express server to calculate.</p>
        </div>
        <div className="calc-results surface-panel" aria-live="polite">
          <div className="results-title"><h3>Results</h3><span className="section-tag">Exact odds</span></div>
          {mode === 'single' && singleResult ? <>
            <div className="result-spotlight"><p>Chance of drawing at least {minDesired}</p><strong>{singleResult.atLeastDesiredPct.toFixed(2)}<span>%</span></strong><span>In a {drawSize}-card opening hand</span></div>
            <div className="result-secondary"><div><span>Exactly {minDesired} {minDesired === 1 ? 'copy' : 'copies'}</span><strong>{singleResult.exactDesiredPct.toFixed(2)}%</strong></div><div><span>Zero copies</span><strong>{singleResult.zeroCopiesPct.toFixed(2)}%</strong></div></div>
            <div className="chart-heading"><h4>Draw distribution</h4><span>Probability of exactly X copies</span></div>
            <div className="distribution-chart" role="img" aria-label="Probability distribution by number of copies drawn">{distribution.map((item) => <div className="distribution-row" key={item.copies}><span className="dist-label">{item.copies} {item.copies === 1 ? 'copy' : 'copies'}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(item.percentage / chartMaximum) * 100}%` }} /></div><strong>{item.percentage.toFixed(2)}%</strong></div>)}</div>
          </> : mode === 'combo' && comboResult ? <>
            <div className="result-spotlight"><p>Chance of drawing both card types</p><strong>{comboSuccess.toFixed(2)}<span>%</span></strong><span>At least {minA} of A and {minB} of B</span></div>
            <div className="chart-heading"><h4>Outcome distribution</h4><span>Combined success vs. other hands</span></div>
            <div className="distribution-chart" role="img" aria-label="Chance of success or failure for two-card combo"><div className="distribution-row"><span className="dist-label">Combo hit</span><div className="bar-track"><div className="bar-fill" style={{ width: `${comboSuccess}%` }} /></div><strong>{comboSuccess.toFixed(2)}%</strong></div><div className="distribution-row"><span className="dist-label">Other hands</span><div className="bar-track"><div className="bar-fill muted-bar" style={{ width: `${100 - comboSuccess}%` }} /></div><strong>{(100 - comboSuccess).toFixed(2)}%</strong></div></div>
          </> : <div className="calc-placeholder"><span aria-hidden="true">◫</span><h3>Ready when you are</h3><p>Enter your parameters and click Calculate to see exact probabilities and a distribution graph.</p></div>}
        </div>
      </div>
    </section>
  );
}
