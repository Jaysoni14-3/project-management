import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import IconButton from "../../components/ui/IconButton";

/* Single-line by default, grows to multi-line as you type.
   - Enter sends, Shift+Enter inserts a newline.
   - Disabled while sending so accidental double-fire can't happen. */
const MessageInput = ({ disabled, sending, placeholder, onSend }) => {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    /* Auto-grow up to ~6 lines, then scroll. */
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  /* Reset on disabled flip — avoids stale draft when conversation changes. */
  useEffect(() => {
    if (disabled) setValue("");
  }, [disabled]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t border-line-subtle bg-elevated">
      <div className="flex items-end gap-sm px-lg py-md">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Write a message…"}
          className="flex-1 resize-none rounded-md border border-line bg-surface
            px-3 py-2 text-body text-fg placeholder:text-fg-subtle
            focus:border-accent focus:shadow-focus-ring focus:outline-none
            disabled:bg-subtle disabled:text-fg-disabled disabled:cursor-not-allowed
            transition leading-snug"
          style={{ minHeight: 40, maxHeight: 160 }}
        />
        <IconButton
          icon={Send}
          variant="primary"
          onClick={submit}
          disabled={disabled || sending || !value.trim()}
          aria-label="Send message"
        />
      </div>
    </div>
  );
};

export default MessageInput;
