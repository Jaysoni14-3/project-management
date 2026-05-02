import {
  CircleDashed,
  CircleDot,
  CircleEllipsis,
  CheckCircle2,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Zap,
} from "lucide-react";

/* =============================================================
   Single source of truth for bug taxonomy. Imported by:
   - BugFormModal (property pills)
   - BugBoard / BugColumn (columns, headers)
   - BugCard (priority icon, severity dot)
============================================================= */

export const STATUS = {
  backlog:     { label: "Backlog",     icon: CircleDashed,   tone: "neutral" },
  in_progress: { label: "In progress", icon: CircleDot,      tone: "info"    },
  in_review:   { label: "In review",   icon: CircleEllipsis, tone: "warning" },
  done:        { label: "Done",        icon: CheckCircle2,   tone: "success" },
};
export const STATUS_ORDER = ["backlog", "in_progress", "in_review", "done"];

export const PRIORITY = {
  low:    { label: "Low",    icon: SignalLow,    tone: "neutral" },
  medium: { label: "Medium", icon: SignalMedium, tone: "info"    },
  high:   { label: "High",   icon: SignalHigh,   tone: "warning" },
  urgent: { label: "Urgent", icon: Zap,          tone: "error"   },
};
export const PRIORITY_ORDER = ["low", "medium", "high", "urgent"];

export const SEVERITY = {
  low:      { label: "Low",      tone: "neutral" },
  medium:   { label: "Medium",   tone: "info"    },
  high:     { label: "High",     tone: "warning" },
  critical: { label: "Critical", tone: "error"   },
};
export const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

/* Tone → tailwind classes. The board uses TONE_BG_SOFT / TONE_TEXT for
   the column header chip; the form pills use the same dot/icon sets. */

export const TONE_DOT = {
  neutral: "bg-fg-subtle",
  info:    "bg-info-500",
  warning: "bg-warning-500",
  success: "bg-success-500",
  error:   "bg-error-500",
};

export const TONE_ICON = {
  neutral: "text-fg-subtle",
  info:    "text-info-700",
  warning: "text-warning-700",
  success: "text-success-700",
  error:   "text-error-700",
};

export const TONE_RING = {
  neutral: "ring-line",
  info:    "ring-info-300",
  warning: "ring-warning-300",
  success: "ring-success-300",
  error:   "ring-error-300",
};
