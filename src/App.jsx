import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AppRoutes from "./app/routes/AppRoutes";
import ErrorBoundary from "./components/error/ErrorBoundary";
import OfflineBanner from "./components/error/OfflineBanner";

/* Top-level error boundary — last line of defence. If a render error
   reaches here, every other boundary above it has either propagated
   the error or doesn't exist, so we show a full-page fallback that
   only depends on Tailwind (no router context).

   The OfflineBanner mounts once at the root so it overlays any page
   without each page having to think about it. */
export default function App() {
  return (
    <ErrorBoundary scope="App">
      <AppRoutes />
      <OfflineBanner />

      {/* Single global toast surface — every page can fire toasts via
          react-toastify and they'll land in this container. */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar
        newestOnTop
        closeOnClick={false}
        pauseOnFocusLoss
        pauseOnHover
        draggable
        theme="light"
        transition={Bounce}
        toastClassName="!rounded-md !border !border-line !shadow-md !text-body !text-fg !bg-surface"
      />
    </ErrorBoundary>
  );
}
