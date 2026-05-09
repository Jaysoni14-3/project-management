import { useEffect, useState, useCallback, useRef } from "react";

import { subscribe } from "../services/apiClient";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

/* Shared adapter for the polling subscribe pattern with error
   awareness baked in. Replaces the old "useEffect + subscribe + setX"
   boilerplate every list hook used to copy. Returns:

     - data        : the latest payload (default `[]`)
     - loading     : true on first load, false after first success/error
     - error       : ApiError instance if the latest poll failed, else null
     - refresh()   : kick a manual refetch immediately

   `subscriber(handlers)` is a function that wires up the actual poll
   and returns its unsubscribe — keep call sites tiny and focused on
   wiring the API call. */
const useSubscribedList = (
  subscriber,
  {
    deps = [],
    scope = "useSubscribedList",
    initial,
    enabled = true,
  } = {}
) => {
  const [data, setData] = useState(initial ?? []);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const refresherRef = useRef(null);

  /* Re-create the subscription when `deps` change. We capture the
     latest subscriber via a ref to avoid bouncing the effect when
     callers pass an inline arrow function. */
  const subRef = useRef(subscriber);
  subRef.current = subscriber;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    let stopped = false;

    const handlers = {
      onData: (payload) => {
        if (stopped) return;
        setData(payload ?? initial ?? []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        if (stopped) return;
        const parsed = parseError(err);
        logger.error(scope, parsed);
        setError(parsed);
        setLoading(false);
      },
    };

    /* The subscriber may either be an inline function that calls
       `subscribe(...)` itself, OR a fetcher returned from a service.
       We pass `subscribe` and the handlers in so the caller doesn't
       have to import them. */
    const unsub = subRef.current({ subscribe, handlers });
    refresherRef.current = unsub;
    return () => {
      stopped = true;
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refresh = useCallback(() => {
    /* Cheap reset: tear down + rebuild on the next tick. */
    if (refresherRef.current) refresherRef.current();
    setLoading(true);
    setError(null);
  }, []);

  return { data, loading, error, refresh };
};

export default useSubscribedList;
