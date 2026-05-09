import React from "react";

import FullPageError from "../components/error/FullPageError";
import { ApiError } from "../lib/errors";

/* Standalone 403 page — rarely reached via direct navigation; mostly
   a target for redirects when guards reject access. */
const Forbidden = () => {
  const error = new ApiError({
    kind: "forbidden",
    status: 403,
    message: "You don't have permission to view that page.",
  });
  return (
    <FullPageError
      error={error}
      title="Permission denied"
      description="If you think this is a mistake, ask an admin to grant you access."
    />
  );
};

export default Forbidden;
