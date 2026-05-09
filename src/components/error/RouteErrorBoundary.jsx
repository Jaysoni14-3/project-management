import React from "react";
import { useLocation } from "react-router-dom";

import ErrorBoundary from "./ErrorBoundary";

/* Wraps `<ErrorBoundary>` and ties its reset behaviour to the
   current pathname — if the user navigates away from a crashed
   route, the boundary clears so the next page renders fresh. */
const RouteErrorBoundary = ({ scope, children, fallback }) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary scope={scope} resetKey={pathname} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;
