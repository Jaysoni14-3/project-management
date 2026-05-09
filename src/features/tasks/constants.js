import {
  Circle,
  CircleDot,
  CheckCircle2,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Zap,
} from "lucide-react";

/* Task taxonomy — leaner than bugs (no severity). 3 status columns
   keep the board scannable and match how generic to-dos are tracked. */

export const STATUS = {
  todo:        { label: "To do",       icon: Circle,        tone: "neutral" },
  in_progress: { label: "In progress", icon: CircleDot,     tone: "info"    },
  done:        { label: "Done",        icon: CheckCircle2,  tone: "success" },
};
export const STATUS_ORDER = ["todo", "in_progress", "done"];

export const PRIORITY = {
  low:    { label: "Low",    icon: SignalLow,    tone: "neutral" },
  medium: { label: "Medium", icon: SignalMedium, tone: "info"    },
  high:   { label: "High",   icon: SignalHigh,   tone: "warning" },
  urgent: { label: "Urgent", icon: Zap,          tone: "error"   },
};
export const PRIORITY_ORDER = ["low", "medium", "high", "urgent"];

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
