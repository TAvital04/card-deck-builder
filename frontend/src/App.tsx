import { useCallback, useEffect, useState } from 'react';
import AuthModal, { type AuthMode } from './components/AuthModal';
import Navbar from './components/Navbar';
import DeckList from './components/DeckList';
import DeckEditor from './components/DeckEditor';
import ProbabilityCalculator from './components/ProbabilityCalculator';
import SearchBar from './components/SearchBar';
import { authApi, deckApi, tokenStorage, type AuthResponse, type Deck, type DeckPayload } from './services/api';

type Tab = 'decks' | 'calculator' | 'search';
const TAB_KEY = 'card-deck-builder:active-tab';
const EDITOR_KEY = 'card-deck-builder:active-deck';

function readTab(): Tab {
  try {
    const tab = sessionStorage.getItem(TAB_KEY);
    return tab === 'calculator' || tab === 'search' ? tab : 'decks';
  } catch { return 'decks'; }
}
function readEditorId(): string | null {
  try { return sessionStorage.getItem(EDITOR_KEY); } catch { return null; }
}
function persist(key: string, value: string | null) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(tokenStorage.get()));
  const [authOpen, setAuthOpen] = useState(() => !tokenStorage.get());
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authRequestId, setAuthRequestId] = useState(0);
  const [tab, setTab] = useState<Tab>(readTab);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [deckError, setDeckError] = useState('');
  const [deckBusy, setDeckBusy] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);

  const loadDecks = useCallback(async () => {
    if (!tokenStorage.get()) return;
    setLoadingDecks(true); setDeckError('');
    try {
      const response = await deckApi.list();
      setDecks(response.data);
      const savedId = readEditorId();
      if (savedId) {
        const restored = response.data.find((deck) => deck._id === savedId);
        if (restored) setSelectedDeck(restored);
        else { setSelectedDeck(null); persist(EDITOR_KEY, null); }
      }
    } catch (caught) { setDeckError(caught instanceof Error ? caught.message : 'Failed to load decks.'); }
    finally { setLoadingDecks(false); }
  }, []);

  // Keep Turn 4's auth validation: a localStorage token isn't necessarily valid.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    let active = true;
    authApi.me()
      .then((response) => {
        if (!active) return;
        if (!response.user?.isVerified) { tokenStorage.clear(); setAuthOpen(true); return; }
        setUserName(response.user.name);
        setIsAuthenticated(true);
        setAuthOpen(false);
      })
      .catch(() => {
        if (!active) return;
        tokenStorage.clear(); setIsAuthenticated(false); setAuthOpen(true);
      })
      .finally(() => { if (active) setIsCheckingSession(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (isAuthenticated) void loadDecks(); }, [isAuthenticated, loadDecks]);

  // Prevent accidental loss of edits when reloading or leaving the page.
  useEffect(() => {
    if (!editorDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editorDirty]);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthRequestId((value) => value + 1);
    setAuthOpen(true);
  }

  function handleAuthenticated(response: AuthResponse) {
    if (!response.token || !response.user?.isVerified) throw new Error('Sign-in did not return a verified user and a JWT.');
    tokenStorage.set(response.token);
    setIsAuthenticated(true);
    setUserName(response.user.name);
    setAuthOpen(false);
  }

  function handleSignOut() {
    tokenStorage.clear(); persist(EDITOR_KEY, null);
    setIsAuthenticated(false); setUserName(null); setDecks([]); setSelectedDeck(null); setEditorDirty(false); setDeckError('');
    openAuth('login');
  }

  function chooseTab(next: Tab) {
    if (next === tab) return;
    if (selectedDeck && editorDirty && !window.confirm('Discard unsaved changes before switching tabs?')) return;
    setTab(next); persist(TAB_KEY, next);
    setSelectedDeck(null); setEditorDirty(false); persist(EDITOR_KEY, null);
  }

  function openDeck(deck: Deck) { setEditorDirty(false); setSelectedDeck(deck); persist(EDITOR_KEY, deck._id); }
  function closeDeck() { setSelectedDeck(null); setEditorDirty(false); persist(EDITOR_KEY, null); }

  async function createDeck(payload: DeckPayload) {
    const response = await deckApi.create(payload);
    setDecks((current) => [response.data, ...current]);
    openDeck(response.data);
  }

  async function deleteDeck(deck: Deck) {
    setDeckBusy(true); setDeckError('');
    try { await deckApi.remove(deck._id); setDecks((current) => current.filter((item) => item._id !== deck._id)); }
    catch (caught) { setDeckError(caught instanceof Error ? caught.message : 'Unable to delete deck.'); }
    finally { setDeckBusy(false); }
  }

  async function saveDeck(payload: DeckPayload) {
    if (!selectedDeck) return;
    const response = await deckApi.update(selectedDeck._id, payload);
    setSelectedDeck(response.data);
    setDecks((current) => current.map((deck) => deck._id === response.data._id ? response.data : deck));
  }

  async function exportDeck(deck: Deck) {
    setDeckError('');
    try {
      const response = await deckApi.exportText(deck._id);
      const file = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
      const href = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = href; link.download = `${deck.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'deck'}.txt`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to export deck.';
      setDeckError(message);
      throw new Error(message);
    }
  }

  return (
    <div className="app-shell">
      <Navbar isAuthenticated={isAuthenticated} userName={userName} onOpenAuth={openAuth} onSignOut={handleSignOut} />
      <main className="auth-stage app-main" aria-label="Card Deck Builder">
        <div className="container">
          <div className="app-intro"><div><p className="eyebrow">THE DECK WORKSPACE</p><h1>Build smarter. <span>Draw better.</span></h1><p>Organize your decks, calculate your odds and find the cards you need.</p></div><div className="workspace-decoration" aria-hidden="true"><span>◇</span><span>◇</span><span>◇</span></div></div>
          <nav className="workspace-tabs" aria-label="Workspace sections">
            <button className={tab === 'decks' ? 'active' : ''} aria-current={tab === 'decks' ? 'page' : undefined} type="button" onClick={() => chooseTab('decks')}><span aria-hidden="true">▦</span> My decks</button>
            <button className={tab === 'calculator' ? 'active' : ''} aria-current={tab === 'calculator' ? 'page' : undefined} type="button" onClick={() => chooseTab('calculator')}><span aria-hidden="true">%</span> Calculator</button>
            <button className={tab === 'search' ? 'active' : ''} aria-current={tab === 'search' ? 'page' : undefined} type="button" onClick={() => chooseTab('search')}><span aria-hidden="true">⌕</span> Card search</button>
          </nav>
          {isCheckingSession && <p className="session-status" role="status">Checking session…</p>}
          {!isCheckingSession && tab === 'decks' && (selectedDeck && isAuthenticated ? (
            <DeckEditor key={selectedDeck._id} deck={selectedDeck} onBack={closeDeck} onSave={saveDeck} onExport={() => exportDeck(selectedDeck)} onDirtyChange={setEditorDirty} />
          ) : <DeckList decks={decks} loading={loadingDecks} busy={deckBusy} error={deckError} isAuthenticated={isAuthenticated} onOpen={openDeck} onCreate={createDeck} onDelete={deleteDeck} onExport={exportDeck} onRetry={() => void loadDecks()} onLogin={() => openAuth('login')} />)}
          {!isCheckingSession && tab === 'calculator' && <ProbabilityCalculator />}
          {!isCheckingSession && tab === 'search' && <SearchBar />}
          <footer className="workspace-footer"><span>Card Deck Builder</span><span>Made for thoughtful deckbuilding · Probability from exact math</span></footer>
        </div>
      </main>
      {!isCheckingSession && <AuthModal key={authRequestId} isOpen={authOpen} initialMode={authMode} onClose={closeAuth} onAuthenticated={handleAuthenticated} />}
    </div>
  );
}
