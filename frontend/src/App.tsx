import { useCallback, useEffect, useState } from 'react';
import AuthModal, { type AuthMode } from './components/AuthModal';
import Navbar from './components/Navbar';
import { authApi, tokenStorage, type AuthResponse } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(tokenStorage.get()));
  const [authOpen, setAuthOpen] = useState(() => !tokenStorage.get());
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authRequestId, setAuthRequestId] = useState(0);

  // Validate the saved JWT with the actual protected backend route. A token in
  // localStorage alone does not prove the session is still valid.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    let active = true;
    authApi.me()
      .then((response) => {
        if (!active) return;
        if (!response.user?.isVerified) {
          tokenStorage.clear();
          setAuthOpen(true);
          return;
        }
        setUserName(response.user.name);
        setIsAuthenticated(true);
        setAuthOpen(false);
      })
      .catch(() => {
        if (!active) return;
        tokenStorage.clear();
        setIsAuthenticated(false);
        setAuthOpen(true);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthRequestId((value) => value + 1);
    setAuthOpen(true);
  }

  function handleAuthenticated(response: AuthResponse) {
    if (!response.token || !response.user?.isVerified) {
      throw new Error('Sign-in did not return a verified user and a JWT.');
    }
    tokenStorage.set(response.token);
    setIsAuthenticated(true);
    setUserName(response.user.name);
    setAuthOpen(false);
  }

  function handleSignOut() {
    tokenStorage.clear();
    setIsAuthenticated(false);
    setUserName(null);
    openAuth('login');
  }

  return (
    <div className="app-shell">
      <Navbar
        isAuthenticated={isAuthenticated}
        userName={userName}
        onOpenAuth={openAuth}
        onSignOut={handleSignOut}
      />
      {/* Round 1: no landing page, deck editor or other teammates' features. */}
      <main className="auth-stage" aria-label="Card Deck Builder">
        {isCheckingSession && <p className="session-status" role="status">Checking session…</p>}
      </main>
      {!isCheckingSession && (
        <AuthModal
          key={authRequestId}
          isOpen={authOpen}
          initialMode={authMode}
          onClose={closeAuth}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  );
}
