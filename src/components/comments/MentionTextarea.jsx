import React, { useRef, useState, useMemo } from "react";

/* Drop-in replacement for a `<textarea>` that surfaces an @-mention
   picker when the user types `@`. On selection, the partial `@xyz`
   token is replaced with the markdown link form
   `@[Display Name](user:<id>)` so downstream renderers can detect
   and style it. Keyboard: Up/Down to navigate, Enter or Tab to
   confirm, Escape to dismiss. */

const PICKER_LIMIT = 6;

const MentionTextarea = ({
  value,
  onChange,
  onKeyDown,
  members = [],
  placeholder,
  rows = 2,
  className = "",
  disabled,
}) => {
  const taRef = useRef(null);
  const [picker, setPicker] = useState(null); // { query, start, end } | null
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo(() => {
    if (!picker) return [];
    const q = picker.query.toLowerCase();
    return members
      .filter((m) =>
        (m.name || m.email || "").toLowerCase().includes(q)
      )
      .slice(0, PICKER_LIMIT);
  }, [picker, members]);

  /* Walk backwards from the caret to find an `@` that's at the start
     of a token (preceded by whitespace or string start). If we hit
     whitespace or a previous `@` first, no picker. */
  const detectMention = (str, caret) => {
    let i = caret;
    while (i > 0) {
      const ch = str[i - 1];
      if (/\s/.test(ch)) break;
      if (ch === "@") {
        const start = i - 1;
        const validStart = start === 0 || /\s/.test(str[start - 1]);
        if (!validStart) break;
        const query = str.slice(start + 1, caret);
        if (query.includes("@")) break;
        setPicker({ query, start, end: caret });
        setActiveIdx(0);
        return;
      }
      i -= 1;
    }
    setPicker(null);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    detectMention(v, e.target.selectionStart);
  };

  const handleKeyUp = (e) => {
    /* Re-evaluate the picker on cursor moves (arrow keys/click) so
       opening it after typing `@` then arrowing away closes it. */
    if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
      detectMention(e.target.value, e.target.selectionStart);
    }
  };

  const insertMention = (member) => {
    if (!picker) return;
    /* Store mentions as plain `@FirstName` in the body — the textarea
       stays readable and the server resolves names to user ids at
       write time. First-word-only so the regex stays simple; this
       team's first names are unique. */
    const firstName = (member.name || member.email || "")
      .split(/\s+/)[0]
      .replace(/[^A-Za-z0-9_-]/g, "");
    const before = value.slice(0, picker.start);
    const after = value.slice(picker.end);
    const display = `@${firstName}`;
    const next = `${before}${display} ${after}`;
    onChange(next);
    setPicker(null);
    requestAnimationFrame(() => {
      const pos = (before + display + " ").length;
      taRef.current?.setSelectionRange(pos, pos);
      taRef.current?.focus();
    });
  };

  const handleKeyDown = (e) => {
    if (picker && filtered.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPicker(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[activeIdx]);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />

      {picker && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention picker"
          className="absolute left-0 bottom-full mb-xs z-dropdown
            min-w-[200px] max-h-[240px] overflow-y-auto
            bg-elevated border border-line rounded-md shadow-lg
            py-xs animate-fade-in"
        >
          {filtered.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                /* `onMouseDown` (not `onClick`) so we insert before the
                   textarea blur fires and tears the picker down. */
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
                className={`w-full text-left px-md py-xs flex items-center gap-sm
                  text-bodySm transition-colors duration-fast
                  ${i === activeIdx ? "bg-subtle text-fg" : "text-fg-muted hover:bg-subtle hover:text-fg"}`}
              >
                <span className="truncate">{m.name || m.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MentionTextarea;
