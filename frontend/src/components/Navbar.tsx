import type { AuthMode } from './AuthModal';

interface NavbarProps {
  isAuthenticated: boolean;
  userName: string | null;
  onOpenAuth: (mode: AuthMode) => void;
  onSignOut: () => void;
}

export default function Navbar({
  isAuthenticated,
  userName,
  onOpenAuth,
  onSignOut,
}: NavbarProps) {
  return (
    <header className="site-header">
      <nav className="navbar container" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Card Deck Builder home">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span>Card Deck Builder</span>
        </a>
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <span className="nav-greeting">{userName ? `Hi, ${userName}` : 'Signed in'}</span>
              <button className="button button-outline button-small" onClick={onSignOut} type="button">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="button button-text button-small" onClick={() => onOpenAuth('login')} type="button">
                Log in
              </button>
              <button className="button button-primary button-small" onClick={() => onOpenAuth('register')} type="button">
                Sign up <span aria-hidden="true">↗</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
