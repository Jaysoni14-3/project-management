import React, { useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

/* Sticky banner that sits above the main content while an admin is
   impersonating another user. Always visible, hard to miss — the
   whole point is to make it impossible to forget you're not on your
   own session. Click "Stop" to restore the admin session.

   Sets `--app-top-offset: 40px` on the document root while mounted so
   sticky/fixed UI (sidebar, header, notifications panel) can reserve
   space below the banner instead of being pushed off-screen. The
   offset returns to its default `0px` automatically when the banner
   unmounts. */
const BANNER_HEIGHT = "40px";

const ImpersonationBanner = () => {
  const { user, impersonatedBy, stopImpersonating } = useAuth();

  useEffect(() => {
    if (!impersonatedBy) return undefined;
    document.documentElement.style.setProperty("--app-top-offset", BANNER_HEIGHT);
    return () => {
      document.documentElement.style.removeProperty("--app-top-offset");
    };
  }, [impersonatedBy]);

  if (!impersonatedBy) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-sticky bg-warning text-warning-900
        border-b border-warning-700/40 shadow-sm"
    >
      <div className="px-xl h-[40px] flex items-center justify-between gap-md">
        <div className="flex items-center gap-sm min-w-0">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <p className="text-bodySm truncate">
            Viewing as{" "}
            <span className="font-semibold capitalize">{user?.name || user?.email}</span>
            <span className="text-warning-900/70">
              {" "}
              · signed in as {impersonatedBy.name}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={stopImpersonating}
          className="inline-flex items-center gap-xs h-controlSm px-md rounded-sm
            bg-warning-900 text-warning-50 text-bodySm font-medium
            hover:bg-warning-800 transition-colors duration-fast shrink-0"
        >
          <X className="h-3.5 w-3.5" />
          Stop impersonating
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
