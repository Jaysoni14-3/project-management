import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AppRoutes from "./app/routes/AppRoutes";

export default function App() {
  return (
    <>
      <AppRoutes />

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
    </>
  );
}
