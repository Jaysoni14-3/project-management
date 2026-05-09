import { useEffect, useRef, useState } from "react";
import { globalSearch } from "../services/search.api.service";

const EMPTY = { users: [], projects: [], bugs: [], notes: [] };
const DEBOUNCE_MS = 220;

/* Debounced global search. Cancels in-flight requests when the query
   changes so a slow first keystroke doesn't overwrite a faster later
   one. Treats <2-char queries as empty (matches the server). */
const useGlobalSearch = (query) => {
  const [results, setResults] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      abortRef.current?.abort();
      return undefined;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await globalSearch(trimmed, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setResults(data || EMPTY);
          setLoading(false);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("global search failed:", err);
        setResults(EMPTY);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [query]);

  /* Hint to the dropdown so it can hide all-empty groups in one check
     instead of testing each list separately. */
  const isEmpty =
    results.users.length === 0 &&
    results.projects.length === 0 &&
    results.bugs.length === 0 &&
    results.notes.length === 0;

  return { results, loading, isEmpty };
};

export default useGlobalSearch;
