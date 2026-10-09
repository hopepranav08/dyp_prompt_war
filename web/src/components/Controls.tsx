import { LogIn, LogOut, Moon, Sun, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { auth, type Session } from '../lib/auth';
import { LANGS } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';

export function ThemeToggle() {
  const { theme, toggleTheme, t } = usePrefs();
  const dark = theme === 'dark';
  return (
    <button type="button" className="btn btn-icon" onClick={toggleTheme} aria-label={dark ? t('theme.toLight') : t('theme.toDark')} title={dark ? t('theme.toLight') : t('theme.toDark')}>
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.3 }} className="grid">
        {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </motion.span>
    </button>
  );
}

export function LangSwitcher() {
  const { lang, setLang, t } = usePrefs();
  return (
    <div role="radiogroup" aria-label={t('lang.label')} className="flex rounded-full border border-ink/10 bg-surface p-1 shadow-soft">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={lang === l.id}
          aria-label={l.label}
          title={l.label}
          onClick={() => setLang(l.id)}
          className={`min-w-9 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === l.id ? 'bg-primary text-on-primary' : 'text-ink hover:bg-ink/5'}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(auth.session);
  useEffect(() => auth.subscribe(setSession), []);
  return session;
}

export function AuthButton() {
  const { t } = usePrefs();
  const session = useSession();
  const [open, setOpen] = useState(false);

  if (session) {
    return (
      <button type="button" className="btn py-2.5" onClick={() => auth.signOut()} title={`${t('auth.as')} ${session.email ?? t('auth.guestUser')}`}>
        <UserRound className="size-4" aria-hidden />
        <span className="hidden max-w-[12ch] truncate sm:inline">{session.email?.split('@')[0] ?? t('auth.guestUser')}</span>
        <LogOut className="size-4" aria-hidden />
        <span className="sr-only">{t('auth.signOut')}</span>
      </button>
    );
  }
  return (
    <>
      <button type="button" className="btn py-2.5" onClick={() => setOpen(true)}>
        <LogIn className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('auth.signIn')}</span>
        <span className="sr-only sm:hidden">{t('auth.signIn')}</span>
      </button>
      <AnimatePresence>{open && <AuthDialog onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function AuthDialog({ onClose }: { onClose: () => void }) {
  const { t } = usePrefs();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      if (!auth.session) {
        const { mapsKey } = await api.config();
        auth.configure(mapsKey);
      }
      await action();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent, mode: 'in' | 'up') => {
    e.preventDefault();
    void run(() => (mode === 'in' ? auth.signIn(email, password) : auth.signUp(email, password)));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="auth-title" className="text-2xl font-light">
            {t('auth.title')}
          </h2>
          <button type="button" className="btn btn-icon shrink-0" onClick={onClose} aria-label={t('auth.close')}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{t('auth.sub')}</p>
        <form className="mt-5 space-y-3" onSubmit={(e) => submit(e, 'in')}>
          <label className="block text-sm font-medium">
            {t('auth.email')}
            <input ref={first} type="email" autoComplete="email" required className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            {t('auth.password')}
            <input type="password" autoComplete="current-password" required minLength={6} className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-error-bg p-3 text-sm">
              {error}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-primary" disabled={busy}>
              {t('auth.login')}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={(e) => submit(e, 'up')}>
              {t('auth.create')}
            </button>
          </div>
          <button type="button" className="w-full py-2 text-sm text-muted underline underline-offset-4" disabled={busy} onClick={() => void run(() => auth.guest())}>
            {t('auth.guest')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
