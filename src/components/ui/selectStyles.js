/* =============================================================
   Shared react-select style overrides — driven by the same CSS
   variables as the rest of the design system, so multi/single
   selects inherit light + dark themes automatically.

   Usage:
     import selectStyles from "../../components/ui/selectStyles";
     <Select styles={selectStyles} ... />
============================================================= */

const fg          = "rgb(var(--color-fg))";
const fgMuted     = "rgb(var(--color-fg-muted))";
const fgSubtle    = "rgb(var(--color-fg-subtle))";
const surface     = "rgb(var(--color-surface))";
const elevated    = "rgb(var(--color-elevated))";
const subtle      = "rgb(var(--color-subtle))";
const border      = "rgb(var(--color-border))";
const borderStr   = "rgb(var(--color-border-strong))";
const accent      = "rgb(var(--color-accent))";
const accentSoft  = "rgb(var(--color-accent-soft))";

const focusRing   = "0 0 0 3px rgb(var(--color-accent) / 0.25)";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    backgroundColor: surface,
    borderColor: state.isFocused ? accent : border,
    boxShadow: state.isFocused ? focusRing : "none",
    borderRadius: "8px",
    fontSize: "14px",
    color: fg,
    transition: "border-color 180ms, box-shadow 180ms",
    "&:hover": {
      borderColor: state.isFocused ? accent : borderStr,
    },
  }),

  valueContainer: (base) => ({
    ...base,
    color: fg,
  }),

  singleValue: (base) => ({
    ...base,
    color: fg,
  }),

  input: (base) => ({
    ...base,
    color: fg,
  }),

  placeholder: (base) => ({
    ...base,
    fontSize: "14px",
    color: fgSubtle,
  }),

  menu: (base) => ({
    ...base,
    backgroundColor: elevated,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    boxShadow:
      "0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.10)",
    overflow: "hidden",
    zIndex: 1100,
  }),

  menuList: (base) => ({
    ...base,
    paddingTop: 4,
    paddingBottom: 4,
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? accentSoft
      : state.isFocused
      ? subtle
      : "transparent",
    color: state.isSelected ? accent : fg,
    cursor: "pointer",
    "&:active": {
      backgroundColor: subtle,
    },
  }),

  multiValue: (base) => ({
    ...base,
    backgroundColor: accentSoft,
    borderRadius: "4px",
  }),

  multiValueLabel: (base) => ({
    ...base,
    color: accent,
    fontSize: "12px",
    fontWeight: 500,
  }),

  multiValueRemove: (base) => ({
    ...base,
    color: accent,
    ":hover": {
      backgroundColor: accentSoft,
      color: accent,
      filter: "brightness(0.92)",
    },
  }),

  indicatorSeparator: () => ({ display: "none" }),

  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? accent : fgMuted,
    "&:hover": { color: accent },
  }),

  clearIndicator: (base) => ({
    ...base,
    color: fgMuted,
    "&:hover": { color: fg },
  }),

  noOptionsMessage: (base) => ({
    ...base,
    color: fgSubtle,
    fontSize: "13px",
  }),
};

export default selectStyles;
