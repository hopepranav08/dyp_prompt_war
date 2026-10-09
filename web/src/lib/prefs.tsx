import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MESSAGES, type Lang, type MessageKey } from './i18n';

export type Theme = 'light' | 'dark';

interface Prefs {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: MessageKey) => string;
}

const PrefsContext = createContext<Prefs | null>(null);

/** Storage can throw (private mode, blocked cookies); preferences are a convenience, never a blocker. */
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

let currentLang: Lang = 'en';
/** Read by the API client so every AI answer comes back in the UI language. */
export const getLang = () => currentLang;

function initialTheme(): Theme {
  const saved = read('sahayatri.theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialLang(): Lang {
  const saved = read('sahayatri.lang');
  if (saved === 'en' || saved === 'hi' || saved === 'mr') return saved;
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.startsWith('mr') ? 'mr' : nav.startsWith('hi') ? 'hi' : 'en';
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  currentLang = lang;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1012' : '#d5dae2');
    write('sahayatri.theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : lang;
    write('sahayatri.lang', lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleTheme = useCallback(() => setTheme((x) => (x === 'dark' ? 'light' : 'dark')), []);
  const t = useCallback((key: MessageKey) => MESSAGES[lang][key] ?? MESSAGES.en[key], [lang]);

  const value = useMemo(() => ({ lang, setLang, theme, toggleTheme, t }), [lang, setLang, theme, toggleTheme, t]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
