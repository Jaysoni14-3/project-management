import React from "react";
import { useLocation } from "react-router-dom";

import FullPageError from "../components/error/FullPageError";
import { ApiError } from "../lib/errors";

/* Generic 404 — used for unmatched routes via AppRoutes. The path
   is included in the description so the user can copy/share it. */
const NotFound = () => {
  const { pathname } = useLocation();
  const error = new ApiError({
    kind: "notFound",
    status: 404,
    message: `No page matches “${pathname}”.`,
  });
  return (
    <FullPageError
      error={error}
      title="Page not found"
      description="The link may be broken, or the page may have moved. Try the dashboard or your projects list."
    />
  );
};

export default NotFound;
