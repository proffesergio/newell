/**
 * App-wide UI preferences: color theme (light/dark) and language (en/bn).
 * - Theme sets `data-theme` on <html>, which index.css uses to override the OS
 *   preference; persisted in localStorage.
 * - Language drives the landing-page copy (see landing/content.ts) and is
 *   persisted so it survives reloads.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Lang = "en" | "bn";

interface PrefsValue {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
  setLang: (l: Lang) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

function initialTheme(): Theme {
  const saved = localStorage.getItem("newell.theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

function initialLang(): Lang {
  return localStorage.getItem("newell.lang") === "bn" ? "bn" : "en";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("newell.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("newell.lang", lang);
  }, [lang]);

  const value: PrefsValue = {
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    lang,
    toggleLang: () => setLangState((l) => (l === "en" ? "bn" : "en")),
    setLang: setLangState,
  };

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
