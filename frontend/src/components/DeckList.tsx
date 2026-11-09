import { useMemo, useState, type FormEvent } from 'react';
import type { CardGame, Deck, DeckPayload } from '../services/api';
import { parseDecklist, totalCards } from '../utils/deck';

type Filter = 'All games' | CardGame;

interface DeckListProps {
  decks: Deck[];
  loading: boolean;
  busy: boolean;
  error: string;
  isAuthenticated: boolean;
  onOpen: (deck: Deck) => void;
  onCreate: (deck: DeckPayload) => Promise<void>;
  onDelete: (deck: Deck) => Promise<void>;
  onExport: (deck: Deck) => Promise<void>;
  onRetry: () => void;
  onLogin: () => void;
}

export default function DeckList({
  decks, loading, busy, error, isAuthenticated, onOpen, onCreate, onDelete, onExport, onRetry, onLogin,
}: DeckListProps) {
  const [filter, setFilter] = useState<Filter>('All games');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<'blank' | 'import'>('blank');
  const [name, setName] = useState('');
  const [game, setGame] = useState<CardGame>('Yu-Gi-Oh!');
  const [decklistText, setDecklistText] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => decks.filter((deck) =>
    (filter === 'All games' || deck.game === filter) && deck.name.toLowerCase().includes(search.trim().toLowerCase()),
  ), [decks, filter, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    if (!name.trim()) { setFormError('Enter a deck name.'); return; }
    let cards: DeckPayload['cards'] = [];
    try {
      if (mode === 'import') cards = parseDecklist(decklistText);
      setSubmitting(true);
      await onCreate({ name: name.trim(), game, cards });
      setComposerOpen(false);
      setName('');
      setDecklistText('');
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Failed to create deck.');
    } finally {
      setSubmitting(false);
    }
  }

  function openComposer(nextMode: typeof mode) {
    setMode(nextMode);
    setFormError('');
    setComposerOpen(true);
  }

  return (
    <section aria-labelledby="decks-heading" className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h2 id="decks-heading">My decks <span className="heading-count">{decks.length}</span></h2>
          <p className="section-description">Build, organize and fine-tune your opening hands.</p>
        </div>
        {isAuthenticated && (
          <div className="header-actions">
            <button type="button" className="button button-outline" onClick={() => openComposer('import')}>↑ Import list</button>
            <button type="button" className="button button-primary" onClick={() => openComposer('blank')}>+ New deck</button>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="empty-state"><span className="empty-glyph" aria-hidden="true">◇</span><h3>Your decks are private</h3><p>Sign in to create decks, keep them in MongoDB and edit them across sessions.</p><button className="button button-primary" onClick={onLogin}>Sign in to view decks</button></div>
      ) : (
        <>
          <div className="filter-row">
            <div className="filter-buttons" aria-label="Filter decks by game">
              {(['All games', 'Yu-Gi-Oh!', 'MTG'] as Filter[]).map((value) => (
                <button className={`filter-chip${filter === value ? ' active' : ''}`} type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{value}</button>
              ))}
            </div>
            <label className="search-field compact"><span className="search-symbol" aria-hidden="true">⌕</span><span className="sr-only">Search deck names</span><input type="search" value={search} placeholder="Find a deck..." onChange={(event) => setSearch(event.target.value)} /></label>
          </div>
          {error && <div className="notice-error" role="alert">{error} <button className="inline-link" type="button" onClick={onRetry}>Try again</button></div>}
          {loading ? <div className="loading-state" role="status">Loading your decks…</div> : filtered.length ? (
            <div className="deck-grid">
              {filtered.map((deck) => (
                <article className="deck-card" key={deck._id}>
                  <div className="deck-card-top"><span className={`game-chip ${deck.game === 'MTG' ? 'mtg' : 'ygo'}`}>{deck.game}</span><span className="deck-card-symbol" aria-hidden="true">▧</span></div>
                  <h3>{deck.name}</h3>
                  <p>{totalCards(deck.cards)} cards <span aria-hidden="true">·</span> {deck.cards.length} unique</p>
                  <div className="deck-card-footer">
                    <button className="button button-outline button-small" type="button" onClick={() => onOpen(deck)}>Open editor <span aria-hidden="true">↗</span></button>
                    <div className="card-actions">
                      <button className="icon-button" title="Export decklist" aria-label={`Export ${deck.name}`} type="button" onClick={() => void onExport(deck).catch(() => {})} disabled={busy}>↓</button>
                      <button className="icon-button danger" title="Delete deck" aria-label={`Delete ${deck.name}`} type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) void onDelete(deck); }}>×</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span className="empty-glyph" aria-hidden="true">▤</span><h3>{decks.length ? 'No matching decks' : 'Start with your first deck'}</h3><p>{decks.length ? 'Try another search or game filter.' : 'Create a new deck or import a text decklist to get started.'}</p>{!decks.length && <button className="button button-primary" onClick={() => openComposer('blank')}>+ Create a deck</button>}</div>
          )}
        </>
      )}

      {composerOpen && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setComposerOpen(false); }}>
          <section className="workspace-dialog" role="dialog" aria-modal="true" aria-labelledby="create-deck-heading">
            <div className="dialog-heading"><div><p className="eyebrow">DECK BUILDER</p><h2 id="create-deck-heading">{mode === 'import' ? 'Import a decklist' : 'New deck'}</h2></div><button type="button" className="icon-button" aria-label="Close" disabled={submitting} onClick={() => setComposerOpen(false)}>×</button></div>
            <div className="filter-buttons composer-tabs"><button className={`filter-chip${mode === 'blank' ? ' active' : ''}`} type="button" onClick={() => { setMode('blank'); setFormError(''); }}>Blank deck</button><button className={`filter-chip${mode === 'import' ? ' active' : ''}`} type="button" onClick={() => { setMode('import'); setFormError(''); }}>Import text</button></div>
            <form onSubmit={(event) => void submit(event)} className="workspace-form">
              <label className="field"><span>Deck name</span><input type="text" maxLength={100} placeholder="e.g. Branded Despia" required autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="field"><span>Card game</span><select value={game} onChange={(event) => setGame(event.target.value as CardGame)}><option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option><option value="MTG">Magic: The Gathering (MTG)</option></select></label>
              {mode === 'import' && <label className="field"><span>Decklist (one card per line)</span><textarea rows={8} value={decklistText} onChange={(event) => setDecklistText(event.target.value)} placeholder={'3x Ash Blossom & Joyous Spring\n2x Called by the Grave\n1x Polymerization'} required /><span className="field-hint">Accepts “3x Card”, “3 Card”, “Card x3” or “Card”. Duplicate names are combined.</span></label>}
              {formError && <p className="notice-error" role="alert">{formError}</p>}
              <div className="dialog-actions"><button className="button button-outline" type="button" onClick={() => setComposerOpen(false)} disabled={submitting}>Cancel</button><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : mode === 'import' ? 'Import & create' : 'Create deck'}</button></div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
