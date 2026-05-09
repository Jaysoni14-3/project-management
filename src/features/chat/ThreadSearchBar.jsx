import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

/* In-thread search. Matches are computed locally from the already-loaded
   messages — fine for the typical chat depth (~50 most recent on load,
   plus live appends). If we ever paginate older messages and need to
   search beyond the loaded window, fall back to the server-side search
   endpoint scoped to this conversationId. */
const ThreadSearchBar = ({
  messages,
  conversationId,
  onClose,
  onActiveChange,
}) => {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  /* Reset whenever the user switches conversation — searching in one
     thread shouldn't leak state into another. */
  useEffect(() => {
    setQuery("");
    setIndex(0);
  }, [conversationId]);

  /* Auto-focus the input on mount so the user can just start typing
     after clicking the search icon. */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();

  const matches = useMemo(() => {
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    return messages
      .filter((m) => (m.body || "").toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, trimmed]);

  /* Default to the LAST match (most recent) when matches first appear
     — that's what users expect in chat search. Clamp index when the
     match set shrinks. */
  useEffect(() => {
    if (matches.length === 0) {
      setIndex(0);
      return;
    }
    setIndex(matches.length - 1);
  }, [matches.length]);

  /* Tell the parent which match is active so MessageThread can scroll
     it into view + highlight it. */
  useEffect(() => {
    onActiveChange?.({
      query: trimmed,
      activeMatchId: matches[index] ?? null,
    });
  }, [matches, index, trimmed, onActiveChange]);

  /* On unmount, clear the highlight. */
  useEffect(() => {
    return () => onActiveChange?.({ query: "", activeMatchId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPrev = () => {
    if (!matches.length) return;
    setIndex((i) => (i - 1 + matches.length) % matches.length);
  };
  const goNext = () => {
    if (!matches.length) return;
    setIndex((i) => (i + 1) % matches.length);
  };

  return (
    <div className="shrink-0 flex items-center gap-sm border-b border-line-subtle bg-elevated px-md py-sm">
      <Search className="h-4 w-4 text-fg-subtle shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose?.();
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) goPrev();
            else goNext();
          }
        }}
        placeholder="Search in this chat…"
        className="flex-1 min-w-0 h-controlSm bg-transparent text-bodySm text-fg
          placeholder:text-fg-subtle focus:outline-none"
      />
      {trimmed && (
        <span className="text-caption text-fg-subtle tabular-nums shrink-0">
          {matches.length === 0 ? "0 of 0" : `${index + 1} of ${matches.length}`}
        </span>
      )}
      <button
        type="button"
        onClick={goPrev}
        disabled={matches.length < 2}
        className="h-6 w-6 inline-flex items-center justify-center rounded
          text-fg-muted hover:text-fg hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-fast"
        aria-label="Previous match"
        title="Previous (Shift+Enter)"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={matches.length < 2}
        className="h-6 w-6 inline-flex items-center justify-center rounded
          text-fg-muted hover:text-fg hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-fast"
        aria-label="Next match"
        title="Next (Enter)"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="h-6 w-6 inline-flex items-center justify-center rounded
          text-fg-muted hover:text-fg hover:bg-subtle transition-colors duration-fast"
        aria-label="Close search"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ThreadSearchBar;
