import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextValue {
  consent: CookieConsent | null;
  showBanner: boolean;
  settingsOpen: boolean;
  acceptAll: () => void;
  acceptNecessaryOnly: () => void;
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const COOKIE_NAME = "cookie-consent";
const COOKIE_DAYS = 365;

// Matches the cookie table in src/pages/Datenschutz.tsx section 8.1 - that
// page documents a cookie literally named "cookie-consent" with a 1-year
// duration, so the name/lifetime here must stay in sync with that text.
function readConsentCookie(): CookieConsent | null {
  const match = document.cookie.match(/(?:^|;\s*)cookie-consent=([^;]*)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (typeof parsed.analytics === "boolean" && typeof parsed.marketing === "boolean") {
      return { necessary: true, analytics: parsed.analytics, marketing: parsed.marketing };
    }
  } catch {
    // malformed cookie, treat as no consent given yet
  }
  return null;
}

function writeConsentCookie(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify({ analytics: consent.analytics, marketing: consent.marketing }));
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setConsentState(readConsentCookie());
    setHydrated(true);
  }, []);

  const apply = useCallback((analytics: boolean, marketing: boolean) => {
    const next: CookieConsent = { necessary: true, analytics, marketing };
    writeConsentCookie(next);
    setConsentState(next);
    setSettingsOpen(false);
  }, []);

  const acceptAll = useCallback(() => apply(true, true), [apply]);
  const acceptNecessaryOnly = useCallback(() => apply(false, false), [apply]);
  const savePreferences = useCallback(
    (prefs: { analytics: boolean; marketing: boolean }) => apply(prefs.analytics, prefs.marketing),
    [apply]
  );
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        showBanner: hydrated && consent === null,
        settingsOpen,
        acceptAll,
        acceptNecessaryOnly,
        savePreferences,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  return ctx;
}
