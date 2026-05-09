import React from "react";

import FullPageError from "../components/error/FullPageError";
import { ApiError } from "../lib/errors";

/* Catastrophic-server route. Most server errors surface inline on
   their host page; this one is the dedicated landing for the
   uncommon case where a route bounces here intentionally. */
const ServerError = () => {
  const error = new ApiError({
    kind: "server",
    status: 500,
    message:
      "Our server hit a problem. The team has been notified — try again in a moment.",
  });
  return (
    <FullPageError
      error={error}
      title="Server error"
      description="If this keeps happening, refresh the page or contact support."
      onRetry={() => window.location.reload()}
      retryLabel="Reload page"
    />
  );
};

export default ServerError;
