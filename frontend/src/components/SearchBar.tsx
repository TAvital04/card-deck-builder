import { useEffect, useState } from 'react';
import { cardApi, type SearchCard } from '../services/api';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const searchTerm = query.trim();
    if (!searchTerm) { setCards([]); setLoading(false); setError(''); return; }
    const controller = new AbortController();
    setCards([]); setError(''); setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await cardApi.search(searchTerm, controller.signal);
        if (!controller.signal.aborted) setCards(response.data);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Card search failed.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, retryKey]);

  return (
    <section className="workspace-panel" aria-labelledby="search-heading">
      <div className="section-heading"><div><p className="eyebrow">CARD DATABASE</p><h2 id="search-heading">Search cards</h2><p className="section-description">Server-side partial matching. Search by any part of a card name.</p></div><span className="section-tag">MongoDB search</span></div>
      <div className="search-hero"><label className="search-field search-large"><span className="search-symbol" aria-hidden="true">⌕</span><span className="sr-only">Search card names</span><input type="search" value={query} autoComplete="off" placeholder="Try “Ash”, “Dragon” or a card name..." onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label><p>Searches <code>GET /api/cards/search?query=…</code> as you type, using the backend's substring search API.</p></div>
      <div className="search-results-heading"><h3>Search results</h3><span>{loading ? 'Searching…' : query.trim() ? `${cards.length} ${cards.length === 1 ? 'match' : 'matches'}` : 'Enter a search term'}</span></div>
      {error && <div className="notice-error" role="alert">{error} <button type="button" className="inline-link" onClick={() => setRetryKey((key) => key + 1)}>Retry</button></div>}
      {loading ? <div className="loading-state" role="status">Looking for matching cards…</div> : !query.trim() ? <div className="empty-state search-empty"><span className="empty-glyph" aria-hidden="true">⌕</span><h3>Find the cards you need</h3><p>Start typing above to search card names in your connected database.</p></div> : !error && cards.length === 0 ? <div className="empty-state search-empty"><span className="empty-glyph" aria-hidden="true">∅</span><h3>No matching cards</h3><p>Try a different keyword. If you expect results, ask your database teammate whether the separate Cards collection has been populated.</p></div> : <div className="search-grid">{cards.map((card) => <article className="search-result-card" key={card._id}><div className="result-card-glyph" aria-hidden="true">◇</div><div><h4>{card.name}</h4><p>{[card.game, card.category, card.role].filter(Boolean).join(' · ') || 'Card database entry'}</p>{card.description && <p className="result-description">{card.description}</p>}</div></article>)}</div>}
    </section>
  );
}
