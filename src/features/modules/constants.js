/* Display config for module status. Mirrors the bug/task constants
   pattern so cards/pills can pull their colors and labels from one
   place. */
export const STATUS = {
  not_started: { label: "Not started" },
  in_progress: { label: "In progress" },
  completed: { label: "Completed" },
};

export const STATUS_ORDER = ["not_started", "in_progress", "completed"];

export const STATUS_TONE = {
  not_started: "bg-subtle text-fg-subtle border-line",
  in_progress: "bg-warning-50 text-warning-700 border-warning-200",
  completed: "bg-success-50 text-success-700 border-success-200",
};

export const STATUS_DOT = {
  not_started: "bg-fg-subtle",
  in_progress: "bg-warning-500",
  completed: "bg-success-500",
};
