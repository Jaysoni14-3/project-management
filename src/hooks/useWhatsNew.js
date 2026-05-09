/* Thin re-export — the actual implementation lives in
   `src/context/WhatsNewContext.jsx` so the layout and sidebar share
   one set of state. Kept this file in place so existing imports
   don't have to change. */

export { useWhatsNew as default } from "../context/WhatsNewContext";
