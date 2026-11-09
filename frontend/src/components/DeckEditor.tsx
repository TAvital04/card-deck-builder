import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Deck, DeckCard, DeckPayload } from '../services/api';
import { chanceOfDrawing, drawHand, totalCards } from '../utils/deck';

interface DeckEditorProps {
  deck: Deck;
  onBack: () => void;
  onSave: (payload: DeckPayload) => Promise<void>;
  onExport: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

export default function DeckEditor({ deck, onBack, onSave, onExport, onDirtyChange }: DeckEditorProps) {
  const [name, setName] = useState(deck.name);
  const [cards, setCards] = useState<DeckCard[]>(() => deck.cards.map((card) => ({ ...card })));
  const [addName, setAddName] = useState('');
  const [addCount, setAddCount] = useState(1);
  const [handSize, setHandSize] = useState(5);
  const [handOpen, setHandOpen] = useState(false);
  const [hand, setHand] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const count = useMemo(() => totalCards(cards), [cards]);
  const effectiveHand = Math.min(handSize, count);
  const dirty = name !== deck.name || JSON.stringify(cards.map(stripId)) !== JSON.stringify(deck.cards.map(stripId));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  function stripId(card: DeckCard) {
    return { name: card.name, count: card.count, category: card.category || '', role: card.role || '', notes: card.notes || '' };
  }

  function updateCard(index: number, fields: Partial<DeckCard>) {
    setCards((current) => current.map((card, i) => i === index ? { ...card, ...fields } : card));
    setHand([]);
    setFeedback('');
  }

  function changeCount(index: number, delta: number) {
    setCards((current) => current.map((card, i) => i === index ? { ...card, count: Math.max(1, Math.min(99, card.count + delta)) } : card));
    setHand([]);
    setFeedback('');
  }

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed || addCount < 1 || addCount > 99 || !Number.isInteger(addCount)) return;
    const existingIndex = cards.findIndex((card) => card.name.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex >= 0) {
      const existing = cards[existingIndex];
      if (existing.count + addCount > 99) { setError('A card can have at most 99 copies.'); return; }
      updateCard(existingIndex, { count: existing.count + addCount });
    } else {
      setCards((current) => [...current, { name: trimmed, count: addCount }]);
    }
    setAddName('');
    setAddCount(1);
    setError('');
    setHand([]);
  }

  async function save() {
    if (saving) return;
    setError(''); setFeedback('');
    if (!name.trim()) { setError('Give this deck a name.'); return; }
    if (cards.some((card) => !card.name.trim() || card.count < 1 || card.count > 99)) { setError('Every card needs a name and a valid copy count.'); return; }
    if (new Set(cards.map((card) => card.name.trim().toLowerCase())).size !== cards.length) { setError('Duplicate card names detected. Combine these rows before saving.'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), game: deck.game, cards: cards.map((card) => ({ ...card, name: card.name.trim() })) });
      setFeedback('Deck saved to your account.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save deck.');
    } finally { setSaving(false); }
  }

  async function exportList() {
    setError('');
    try { await onExport(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not export deck.'); }
  }

  function goBack() {
    if (!dirty || window.confirm('Discard unsaved changes and return to your decks?')) onBack();
  }

  const handGroups = hand.reduce<Record<string, number>>((all, card) => {
    all[card] = (all[card] || 0) + 1;
    return all;
  }, {});

  return (
    <section className="workspace-panel" aria-labelledby="editor-heading">
      <div className="editor-crumb"><button className="inline-link" type="button" onClick={goBack}>← My decks</button><span aria-hidden="true">/</span><span>{deck.name}</span></div>
      <div className="section-heading editor-heading"><div><p className="eyebrow">DECK EDITOR</p><h2 id="editor-heading">Edit your deck</h2><p className="section-description">Changes update draw chances instantly. Save to sync with the backend.</p></div><div className="header-actions"><button className="button button-outline" type="button" onClick={() => void exportList()}>↓ Export list</button><button className="button button-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button></div></div>
      <div className="editor-summary">
        <label className="field editor-name"><span>Deck name</span><input type="text" maxLength={100} value={name} onChange={(event) => { setName(event.target.value); setFeedback(''); }} /></label>
        <div className="editor-metric"><span className="eyebrow">GAME</span><strong>{deck.game}</strong></div>
        <div className="editor-metric"><span className="eyebrow">TOTAL CARDS</span><strong>{count}</strong></div>
        <div className="editor-metric"><span className="eyebrow">UNIQUE CARDS</span><strong>{cards.length}</strong></div>
      </div>
      <div className="editor-toolbar"><div><h3>Card list</h3><p>Probability of drawing at least one copy in your opening hand.</p></div><label className="hand-size-label">Opening hand <select value={handSize} onChange={(event) => { setHandSize(Number(event.target.value)); setHand([]); }}>{[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} cards</option>)}</select></label></div>
      <div className="table-scroll"><table className="card-table"><thead><tr><th scope="col">Card</th><th scope="col">Category / role</th><th scope="col">Copies</th><th scope="col">Draw chance <span className="table-help" title="Chance to draw at least one copy without replacement">ⓘ</span></th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead><tbody>
        {cards.length ? cards.map((card, index) => <tr key={card._id ?? `new-${index}`}>
          <td><input aria-label={`Card ${index + 1} name`} className="table-name-input" value={card.name} maxLength={120} onChange={(event) => updateCard(index, { name: event.target.value })} /><input aria-label={`Notes for ${card.name}`} title="Notes" className="table-note-input" value={card.notes || ''} maxLength={200} placeholder="Add notes (optional)" onChange={(event) => updateCard(index, { notes: event.target.value })} /></td>
          <td><input aria-label={`Category for ${card.name}`} className="table-detail-input" value={card.category || ''} placeholder="Category" onChange={(event) => updateCard(index, { category: event.target.value })} /><input aria-label={`Role for ${card.name}`} className="table-detail-input" value={card.role || ''} placeholder="Role" onChange={(event) => updateCard(index, { role: event.target.value })} /></td>
          <td><div className="stepper"><button type="button" aria-label={`Remove one ${card.name}`} disabled={card.count <= 1} onClick={() => changeCount(index, -1)}>−</button><output aria-label={`Copies of ${card.name}`}>{card.count}</output><button type="button" aria-label={`Add one ${card.name}`} disabled={card.count >= 99} onClick={() => changeCount(index, 1)}>+</button></div></td>
          <td><span className="probability-pill">{count > 0 ? chanceOfDrawing(count, card.count, effectiveHand).toFixed(1) : '0.0'}%</span></td>
          <td><button className="icon-button danger" aria-label={`Remove ${card.name} from deck`} title="Remove row" type="button" onClick={() => { setCards((current) => current.filter((_, i) => i !== index)); setHand([]); setFeedback(''); }}>×</button></td>
        </tr>) : <tr><td className="empty-table" colSpan={5}>No cards yet. Add your first card below.</td></tr>}
      </tbody></table></div>
      <form className="add-card-row" onSubmit={addCard}><label className="sr-only" htmlFor="new-card-name">Card name</label><input id="new-card-name" type="text" value={addName} onChange={(event) => setAddName(event.target.value)} placeholder="Card name..." required maxLength={120} /><label className="sr-only" htmlFor="new-card-count">Number of copies</label><input id="new-card-count" type="number" min={1} max={99} value={addCount} onChange={(event) => setAddCount(Number(event.target.value))} /><button className="button button-outline" type="submit">+ Add card</button></form>
      {error && <p className="notice-error" role="alert">{error}</p>}{feedback && <p className="notice-success" role="status">{feedback}</p>}
      <div className="simulator-panel"><div><p className="eyebrow">PRACTICE MODE</p><h3>Opening hand simulator</h3><p>Draw a random hand from your current deck, without replacement.</p></div><button className="button button-primary" type="button" disabled={count === 0} onClick={() => { setHand(drawHand(cards, effectiveHand)); setHandOpen(true); }}>{handOpen ? '↻ Draw again' : 'Draw opening hand'} <span aria-hidden="true">↗</span></button></div>
      {handOpen && <div className="hand-drawer" aria-live="polite"><div className="hand-drawer-header"><div><h3>Sample hand <span>{hand.length} cards</span></h3><p>Randomized for this draw. Results may vary each time.</p></div><button className="icon-button" type="button" aria-label="Close hand drawer" onClick={() => setHandOpen(false)}>×</button></div>{hand.length ? <div className="hand-grid">{Object.entries(handGroups).map(([cardName, quantity]) => <div className="hand-card" key={cardName}><span aria-hidden="true">◇</span><strong>{cardName}</strong>{quantity > 1 && <small>×{quantity}</small>}</div>)}</div> : <p>No cards available. Add cards and draw again.</p>}</div>}
      <p className="subtle-footnote">Opening probabilities use exact hypergeometric sampling without replacement. Hand simulations are random; save the deck to persist changes.</p>
    </section>
  );
}
