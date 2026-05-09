import React, { useEffect } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton";

const sizeMap = {
  sm: "max-w-narrow",
  md: "max-w-prose",
  lg: "max-w-[720px]",
  xl: "max-w-[920px]",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
      className="fixed inset-0 z-modal flex items-center justify-center px-lg"
    >
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        className="absolute inset-0 bg-overlay/50 backdrop-blur-[2px] animate-fade-in"
      />

      {/* Sheet — flex column with capped height so the body scrolls
          internally when content overflows. Header and footer stay pinned. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${sizeMap[size]} max-h-[min(90vh,800px)]
          flex flex-col bg-elevated rounded-xl shadow-modal
          border border-line animate-scale-in overflow-hidden`}
      >
        {(title || onClose) && (
          <div className="shrink-0 flex items-start justify-between gap-lg px-xl pt-lg pb-md border-b border-line-subtle">
            <div className="flex flex-col gap-xs min-w-0">
              {title && (
                <h2 className="text-section text-fg truncate">{title}</h2>
              )}
              {description && (
                <p className="text-bodySm text-fg-muted">{description}</p>
              )}
            </div>
            <IconButton
              icon={X}
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-xs -mt-xs"
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-xl py-lg">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 flex justify-end gap-sm px-xl py-md border-t border-line-subtle bg-canvas/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
