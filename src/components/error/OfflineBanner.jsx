import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/* Listens to the browser's online/offline events and shows a
   persistent banner while the connection is down. When connectivity
   restores we keep the banner up for one beat with a "Reconnected"
   message so users see the state actually changed.

   Note: navigator.onLine is famously unreliable — it tells you about
   the network interface, not the API server. A green `online` doesn't
   guarantee fetches succeed. For genuine API health, errors thrown by
   apiClient with `kind: "network"` already surface in the per-page
   ErrorState. This banner just covers the obvious case (browser is
   actually offline). */

const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const onOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };
    const onOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3_000);
      return () => clearTimeout(t);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-md left-1/2 -translate-x-1/2 z-toast
        inline-flex items-center gap-sm px-md py-sm rounded-md shadow-md
        text-bodySm font-medium border
        ${
          online
            ? "bg-success-50 text-success-700 border-success-200"
            : "bg-error-50 text-error-700 border-error-200"
        }`}
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      {online ? "Back online" : "You're offline. Changes will retry when you reconnect."}
    </div>
  );
};

export default OfflineBanner;
