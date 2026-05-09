import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CHANGELOG, LATEST_VERSION } from "../lib/changelog";
import { useAuth } from "./AuthContext";

/* Single source of truth for the What's new modal so the sidebar
   trigger and the modal mount share `open` state. Previously each
   consumer called the hook independently and opening from the
   sidebar updated that instance's state while the layout's modal
   kept watching its own — clicking did nothing. */

const WhatsNewContext = createContext(null);

const storageKey = (userId) =>
  userId ? `lastSeenChangelog:${userId}` : null;

export const WhatsNewProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || null;

  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  /* Tracks whether the user has dismissed the modal in this browser
     session. Once true, the auto-open effect won't re-fire even if
     localStorage is wiped or the user lands on a different page. */
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  /* Which userId we've already loaded the localStorage marker for.
     Without this gate the auto-open effect runs once with the
     initial `lastSeen = null` state — *before* the loader effect
     reads from localStorage — and the modal pops every refresh
     even when the user has already dismissed the latest release. */
  const [loadedFor, setLoadedFor] = useState(null);

  /* Load the marker once auth resolves. Done in an effect so SSR /
     hydration paths stay clean. */
  useEffect(() => {
    if (authLoading || !userId) return;
    try {
      setLastSeen(localStorage.getItem(storageKey(userId)) || null);
    } catch {
      setLastSeen(null);
    }
    setDismissedThisSession(false);
    setLoadedFor(userId);
  }, [authLoading, userId]);

  const hasUnseen = useMemo(() => {
    if (!LATEST_VERSION) return false;
    return lastSeen !== LATEST_VERSION;
  }, [lastSeen]);

  /* Auto-open exactly once per session when there's something new.
     Skipped until the loader has actually read localStorage for the
     current user — otherwise the initial null `lastSeen` would make
     `hasUnseen` look true and the modal would pop on every refresh. */
  useEffect(() => {
    if (authLoading || !userId) return;
    if (loadedFor !== userId) return;
    if (!hasUnseen) return;
    if (dismissedThisSession) return;
    setOpen(true);
  }, [authLoading, userId, loadedFor, hasUnseen, dismissedThisSession]);

  const markSeen = useCallback(() => {
    if (!userId || !LATEST_VERSION) return;
    try {
      localStorage.setItem(storageKey(userId), LATEST_VERSION);
    } catch {
      // ignore — best-effort
    }
    setLastSeen(LATEST_VERSION);
  }, [userId]);

  const close = useCallback(() => {
    setOpen(false);
    setDismissedThisSession(true);
    markSeen();
  }, [markSeen]);

  const openManually = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      entries: CHANGELOG,
      open,
      hasUnseen,
      openManually,
      close,
    }),
    [open, hasUnseen, openManually, close]
  );

  return (
    <WhatsNewContext.Provider value={value}>
      {children}
    </WhatsNewContext.Provider>
  );
};

export const useWhatsNew = () => {
  const ctx = useContext(WhatsNewContext);
  if (!ctx) {
    throw new Error("useWhatsNew must be used inside <WhatsNewProvider>");
  }
  return ctx;
};
