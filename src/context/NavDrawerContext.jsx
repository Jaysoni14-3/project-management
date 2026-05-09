import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

/* Mobile-only drawer state for the left sidebar.

   On lg+ screens the sidebar is always visible and this state is
   ignored. Below lg, `open` controls a slide-in drawer toggled by
   the hamburger in the header.

   Auto-closes on route change so tapping any nav link inside the
   drawer dismisses it without each link needing to wire a callback.
*/

const NavDrawerContext = createContext(null);

export const NavDrawerProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  /* Close on every route change. The first render also fires this,
     which is fine — drawer is closed by default. */
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  /* Lock body scroll while the drawer is open on mobile so the page
     behind it doesn't bounce when swiping. Cleared on close. */
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Close on Esc — matches every other dismissable surface. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, openDrawer, closeDrawer, toggleDrawer }),
    [open, openDrawer, closeDrawer, toggleDrawer]
  );

  return (
    <NavDrawerContext.Provider value={value}>
      {children}
    </NavDrawerContext.Provider>
  );
};

export const useNavDrawer = () => {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) {
    throw new Error("useNavDrawer must be used inside <NavDrawerProvider>");
  }
  return ctx;
};
