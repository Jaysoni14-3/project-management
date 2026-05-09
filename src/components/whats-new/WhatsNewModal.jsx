import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";

import IconButton from "../ui/IconButton";
import Button from "../ui/Button";

/* Carousel-style "What's new" modal.
   - Slides between release entries with Prev / Next + dot indicators.
   - Arrow keys navigate, Esc closes (closing also marks as seen).
   - Click outside the sheet closes.
   - Portal-rendered so it sits above any sticky chrome regardless of
     the layout stacking context. */

const WhatsNewModal = ({ entries, isOpen, onClose }) => {
  const [index, setIndex] = useState(0);

  /* Reset to slide 0 every time the modal opens so a returning viewer
     starts at the latest release, not wherever they left off. */
  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, entries.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose, entries.length]);

  if (!isOpen || !entries?.length) return null;

  const total = entries.length;
  const current = entries[index];
  const atFirst = index === 0;
  const atLast = index === total - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
      className="fixed inset-0 z-modal flex items-center justify-center px-lg"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-overlay/50 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] max-h-[min(85vh,720px)]
          flex flex-col bg-elevated rounded-xl shadow-modal border border-line
          animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-lg px-xl pt-lg pb-md border-b border-line-subtle">
          <div className="flex items-start gap-sm min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-md bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-eyebrow uppercase text-fg-subtle tracking-wider">
                What's new
              </p>
              <h2 className="text-section text-fg truncate">{current.title}</h2>
              <p className="text-caption text-fg-subtle mt-[2px] tabular-nums">
                {current.date} · v{current.version}
              </p>
            </div>
          </div>
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
            className="-mr-xs -mt-xs"
          />
        </div>

        {/* Slide body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-xl py-lg">
          {current.summary && (
            <p className="text-bodySm text-fg-muted leading-relaxed mb-lg">
              {current.summary}
            </p>
          )}

          {current.highlights?.length > 0 && (
            <ul className="flex flex-col gap-md">
              {current.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-md p-md rounded-md border border-line-subtle bg-canvas/40"
                >
                  <span
                    aria-hidden
                    className="h-6 w-6 shrink-0 rounded-md bg-accent-soft text-accent
                      text-caption font-semibold flex items-center justify-center mt-[2px]"
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-bodySm text-fg font-medium leading-snug">
                      {h.title}
                    </p>
                    {h.body && (
                      <p className="text-bodySm text-fg-muted leading-relaxed mt-[2px]">
                        {h.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — nav + dots */}
        <div className="shrink-0 flex items-center justify-between gap-md px-xl py-md border-t border-line-subtle bg-canvas/50">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={atFirst}
            className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
              text-bodySm text-fg-muted hover:text-fg hover:bg-subtle
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-fast"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          {/* Dot indicators */}
          {total > 1 && (
            <div className="flex items-center gap-xs">
              {entries.map((e, i) => (
                <button
                  key={e.version}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-fast
                    ${
                      i === index
                        ? "w-6 bg-accent"
                        : "w-1.5 bg-line-strong hover:bg-fg-subtle"
                    }`}
                />
              ))}
            </div>
          )}

          {atLast ? (
            <Button size="sm" onClick={onClose}>
              Got it
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
              className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
                bg-accent text-accent-fg text-bodySm font-medium
                hover:bg-accent-hover transition-colors duration-fast"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WhatsNewModal;
