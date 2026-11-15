import { useEffect, useId, useState, type FormEvent, type MouseEvent } from 'react';
import { authApi, type AuthResponse } from '../services/api';

export type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  onAuthenticated: (response: AuthResponse) => void;
}

// Keep these in sync with the email validation in backend/src/models/User.js.
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// HTML5 pattern is intentionally applied to the email input as well as the regex check.
const EMAIL_HTML_PATTERN = '[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}';

const screenCopy: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your account to continue.',
    action: 'Sign in',
  },
  register: {
    title: 'Create an account',
    subtitle: 'A simple way to get started.',
    action: 'Create account',
  },
  verify: {
    title: 'Verify your email',
    subtitle: 'Enter your verification code to continue.',
    action: 'Verify email',
  },
  forgot: {
    title: 'Forgot your password?',
    subtitle: 'Enter your email to request a password reset token.',
    action: 'Send reset instructions',
  },
  reset: {
    title: 'Set a new password',
    subtitle: 'Enter the reset token and choose a new password.',
    action: 'Reset password',
  },
};

export default function AuthModal({
  isOpen,
  initialMode,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();
  const titleId = `${formId}-title`;

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError('');
    setNotice('');
    setIsSubmitting(false);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      // Keep keyboard focus inside the dialog while it is open.
      const dialog = document.getElementById(formId);
      if (!dialog) return;
      const candidates = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
      );
      if (candidates.length === 0) return;
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, initialMode, formId, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = document.getElementById(formId);
    dialog?.querySelector<HTMLInputElement>('input')?.focus();
  }, [isOpen, mode, formId]);

  if (!isOpen) return null;

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setNotice('');
    const cleanEmail = email.trim().toLowerCase();

    // Login, Register and Forgot Password require email. The backend's
    // verify-email and reset-password endpoints accept tokens, not email.
    if ((mode === 'login' || mode === 'register' || mode === 'forgot') && !EMAIL_REGEX.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'verify' && !verificationToken.trim()) {
      setError('Enter the verification code.');
      return;
    }
    if (mode === 'reset' && !resetToken.trim()) {
      setError('Enter the password reset token.');
      return;
    }
    if (mode === 'register' && name.trim().length === 0) {
      setError('Enter your name.');
      return;
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if ((mode === 'register' || mode === 'reset') && password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      switch (mode) {
        case 'login': {
          const response = await authApi.login(cleanEmail, password);
          if (response.user?.isVerified === false) {
            setPassword('');
            setMode('verify');
            setNotice('Your account is not verified yet. Enter the verification code to continue.');
          } else {
            onAuthenticated(response);
          }
          break;
        }
        case 'register': {
          const response = await authApi.register(name.trim(), cleanEmail, password);
          setPassword('');
          setConfirmPassword('');
          setMode('verify');
          // The supplied backend returns a verification token in its JSON
          // response but does not send email. Pre-fill ONLY in Vite dev mode.
          if (import.meta.env.DEV && response.verificationToken) {
            setVerificationToken(response.verificationToken);
            setNotice('Local demo: the backend returned a verification token (pre-filled). No email was sent.');
          } else {
            setNotice('Account created. Enter the verification code when provided by your backend email service.');
          }
          break;
        }
        case 'verify': {
          await authApi.verifyEmail(verificationToken.trim());
          setVerificationToken('');
          setMode('login');
          setNotice('Your email is verified. You can now sign in.');
          break;
        }
        case 'forgot': {
          const response = await authApi.forgotPassword(cleanEmail);
          setMode('reset');
          if (import.meta.env.DEV && response.resetToken) {
            setResetToken(response.resetToken);
            setNotice('Local demo: the backend returned a reset token (pre-filled). No email was sent.');
          } else {
            setNotice('Reset requested. Enter the token provided by your backend email service.');
          }
          break;
        }
        case 'reset': {
          await authApi.resetPassword(resetToken.trim(), password);
          setPassword('');
          setConfirmPassword('');
          setResetToken('');
          setMode('login');
          setNotice('Your password was reset. Sign in with your new password.');
          break;
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const copy = screenCopy[mode];
  const isPasswordMode = mode === 'login' || mode === 'register' || mode === 'reset';
  const isConfirmMode = mode === 'register' || mode === 'reset';

  return (
    <div className="modal-backdrop" onMouseDown={handleOverlayClick}>
      <section id={formId} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
        <div className={`modal-heading${mode === 'verify' ? ' modal-heading-verify' : ''}`}>
          {mode === 'verify' ? (
            <div className="verify-icon-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
                <path d="m15.2 17 2 2 4-4" />
              </svg>
            </div>
          ) : (
            <p className="eyebrow eyebrow-centered">CARD DECK BUILDER</p>
          )}
          <h2 id={titleId}>{copy.title}</h2>
          <p className="modal-subtitle">{copy.subtitle}</p>
          {mode === 'verify' && EMAIL_REGEX.test(email.trim()) && (
            <p className="verify-recipient">
              {email.trim().toLowerCase()}
            </p>
          )}
        </div>

        <form key={mode} className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor={`${formId}-name`}>Full name</label>
              <input
                id={`${formId}-name`}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="field">
            <label htmlFor={`${formId}-email`}>Email address</label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              pattern={EMAIL_HTML_PATTERN}
              title="Use a valid email address such as you@example.com"
              required
            />
            </div>
          )}

          {mode === 'verify' && (
            <div className="field">
              <label htmlFor={`${formId}-verify-token`}>Verification code</label>
              <input
                id={`${formId}-verify-token`}
                name="verificationToken"
                type="text"
                autoComplete="one-time-code"
                placeholder="Enter verification code"
                value={verificationToken}
                onChange={(event) => setVerificationToken(event.target.value)}
                required
              />
            </div>
          )}

          {mode === 'reset' && (
            <div className="field">
              <label htmlFor={`${formId}-reset-token`}>Reset token</label>
              <input
                id={`${formId}-reset-token`}
                name="resetToken"
                type="text"
                autoComplete="one-time-code"
                placeholder="Paste your password reset token"
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                required
              />
            </div>
          )}

          {isPasswordMode && (
            <div className="field">
              <div className="label-line">
                <label htmlFor={`${formId}-password`}>
                  {mode === 'reset' ? 'New password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button className="inline-link" type="button" onClick={() => changeMode('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id={`${formId}-password`}
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === 'login' ? undefined : 6}
                required
              />
            </div>
          )}

          {isConfirmMode && (
            <div className="field">
              <label htmlFor={`${formId}-confirm-password`}>Confirm password</label>
              <input
                id={`${formId}-confirm-password`}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {notice && <p className="form-message form-success" role="status">{notice}</p>}

          <button className="button button-primary button-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : copy.action} <span aria-hidden="true">↗</span>
          </button>
        </form>

        {mode === 'verify' && (
          <div className="verify-resend">
            <span>Didn't receive the code?</span>{' '}
            <button
              className="inline-link"
              type="button"
              disabled
              title="The backend has no resend-verification endpoint yet."
            >
              Resend code
            </button>
            <p className="verification-note">Resending codes requires a backend endpoint.</p>
          </div>
        )}

        <div className="modal-footer">
          {mode === 'login' && (
            <><span>New to Card Deck Builder?</span> <button className="inline-link" type="button" onClick={() => changeMode('register')}>Create an account</button></>
          )}
          {mode === 'register' && (
            <><span>Already have an account?</span> <button className="inline-link" type="button" onClick={() => changeMode('login')}>Sign in</button></>
          )}
          {(mode === 'forgot' || mode === 'reset' || mode === 'verify') && (
            <button className="inline-link" type="button" onClick={() => changeMode('login')}>← Back to sign in</button>
          )}
          {mode === 'login' && (
            <div className="secondary-link-row">
              <button className="inline-link subtle-link" type="button" onClick={() => changeMode('verify')}>Already have a verification code?</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
