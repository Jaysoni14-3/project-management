/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* ================================================================
         COLOR SYSTEM
         Two layers:
         1. Primitive scales (gray, accent, status) — never reference in
            components. Use only when no semantic token fits.
         2. Semantic tokens (canvas, surface, fg, border…) — backed by
            CSS variables in src/styles/index.css. Use these in components
            so dark mode + theming work later by flipping variables.
      ================================================================== */
      colors: {
        /* --- Primitive: neutral (Tailwind zinc — slightly warmer than
               gray, closer to Linear/Vercel/Anthropic feel) --- */
        gray: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
          950: "#09090B",
        },

        /* --- Primitive: accent (extends the project's deep navy brand) --- */
        accent: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#061D6F",
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover:   "rgb(var(--color-accent-hover) / <alpha-value>)",
          soft:    "rgb(var(--color-accent-soft) / <alpha-value>)",
          fg:      "rgb(var(--color-accent-fg) / <alpha-value>)",
        },

        /* --- Primitive: status (full scales for every state) --- */
        success: {
          50:  "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0", 300: "#86EFAC",
          400: "#4ADE80", 500: "#22C55E", 600: "#16A34A", 700: "#15803D",
          800: "#166534", 900: "#14532D",
          DEFAULT: "#16A34A",
        },
        warning: {
          50:  "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
          400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
          800: "#92400E", 900: "#78350F",
          DEFAULT: "#D97706",
        },
        error: {
          50:  "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5",
          400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C",
          800: "#991B1B", 900: "#7F1D1D",
          DEFAULT: "#DC2626",
        },
        info: {
          50:  "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 300: "#7DD3FC",
          400: "#38BDF8", 500: "#0EA5E9", 600: "#0284C7", 700: "#0369A1",
          800: "#075985", 900: "#0C4A6E",
          DEFAULT: "#0284C7",
        },

        /* --- Semantic: surfaces (use these in components) --- */
        canvas:   "rgb(var(--color-canvas) / <alpha-value>)",
        surface:  "rgb(var(--color-surface) / <alpha-value>)",
        elevated: "rgb(var(--color-elevated) / <alpha-value>)",
        subtle:   "rgb(var(--color-subtle) / <alpha-value>)",
        overlay:  "rgb(var(--color-overlay) / <alpha-value>)",

        /* Backwards-compat aliases for existing components */
        bg:       "rgb(var(--color-canvas) / <alpha-value>)",
        border:   "rgb(var(--color-border) / <alpha-value>)",

        /* --- Semantic: foreground (text/icons) --- */
        fg: {
          DEFAULT:  "rgb(var(--color-fg) / <alpha-value>)",
          muted:    "rgb(var(--color-fg-muted) / <alpha-value>)",
          subtle:   "rgb(var(--color-fg-subtle) / <alpha-value>)",
          disabled: "rgb(var(--color-fg-disabled) / <alpha-value>)",
          inverse:  "rgb(var(--color-fg-inverse) / <alpha-value>)",
        },
        text: {
          primary:   "rgb(var(--color-fg) / <alpha-value>)",
          secondary: "rgb(var(--color-fg-muted) / <alpha-value>)",
          muted:     "rgb(var(--color-fg-subtle) / <alpha-value>)",
        },

        /* --- Semantic: border --- */
        line: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong:  "rgb(var(--color-border-strong) / <alpha-value>)",
          subtle:  "rgb(var(--color-border-subtle) / <alpha-value>)",
        },
      },

      backgroundImage: {
        "accent-gradient":
          "linear-gradient(135deg, #061D6F 0%, #1D4ED8 100%)",
        "accent-radial":
          "radial-gradient(circle at top right, #1D4ED8 0%, #061D6F 60%)",
        "shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
      },

      /* ================================================================
         TYPOGRAPHY
         Tighter, denser scale — 13px base. Inspired by Linear/Raycast
         where bold + size hierarchy beats sheer scale.
      ================================================================== */
      fontFamily: {
        sans: ["Switzer", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      fontSize: {
        // Display: hero numbers, big stats — use sparingly
        display:  ["1.625rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }], // 26px
        // Page-level H1
        page:     ["1.25rem",  { lineHeight: "1.3",  fontWeight: "600", letterSpacing: "-0.015em" }], // 20px
        // Section / card title
        section:  ["0.9375rem",{ lineHeight: "1.4",  fontWeight: "600", letterSpacing: "-0.005em" }], // 15px
        // Default body
        body:     ["0.875rem", { lineHeight: "1.5" }],   // 14px
        bodySm:   ["0.8125rem",{ lineHeight: "1.5" }],   // 13px
        // Form labels, meta, table headers
        label:    ["0.75rem",  { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.02em" }],   // 12px
        caption:  ["0.75rem",  { lineHeight: "1.4" }],   // 12px
        // Eyebrow / overline (use uppercase utility)
        eyebrow:  ["0.6875rem",{ lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.08em" }],   // 11px
      },

      /* ================================================================
         SPACING — 4px grid (kept from previous scale; it's already correct)
      ================================================================== */
      spacing: {
        xs:   "4px",
        sm:   "8px",
        md:   "12px",
        lg:   "16px",
        xl:   "24px",
        "2xl":"32px",
        "3xl":"48px",
        "4xl":"64px",
      },

      /* ================================================================
         BORDER RADIUS
      ================================================================== */
      borderRadius: {
        xs:   "4px",  // chips, pills, badges
        sm:   "6px",  // small controls, inline tags
        md:   "8px",  // standard buttons, inputs
        lg:   "10px", // cards, panels
        xl:   "14px", // modals
        "2xl":"20px", // hero / feature surfaces
      },

      /* ================================================================
         ELEVATION — layered, subtle. Linear/Vercel-style stacking.
      ================================================================== */
      boxShadow: {
        xs:    "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        sm:    "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        md:    "0 2px 4px -1px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.06)",
        lg:    "0 4px 8px -2px rgba(15, 23, 42, 0.06), 0 12px 24px -4px rgba(15, 23, 42, 0.08)",
        xl:    "0 8px 16px -4px rgba(15, 23, 42, 0.08), 0 24px 48px -8px rgba(15, 23, 42, 0.12)",
        // Aliases for component-level intent
        card:  "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        modal: "0 8px 16px -4px rgba(15, 23, 42, 0.08), 0 24px 48px -8px rgba(15, 23, 42, 0.12)",
        // Inner / inset for pressed states + inputs
        "inner-sm": "inset 0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        // Accent glow for focus, primary CTAs
        "focus-ring":   "0 0 0 3px rgba(59, 130, 246, 0.25)",
        "focus-ring-error": "0 0 0 3px rgba(239, 68, 68, 0.25)",
      },

      /* ================================================================
         CONTROL DIMENSIONS — for inputs/buttons/icon-buttons.
         Use h-control / w-control so square icon buttons size correctly.
      ================================================================== */
      height: {
        control:    "36px",
        controlSm:  "28px",
        controlLg:  "44px",
      },
      minHeight: {
        control:    "36px",
        controlSm:  "28px",
        controlLg:  "44px",
      },
      width: {
        sidebar:           "240px",
        "sidebar-collapsed":"60px",
        control:    "36px",
        controlSm:  "28px",
        controlLg:  "44px",
      },
      minWidth: {
        control:    "36px",
        controlSm:  "28px",
        controlLg:  "44px",
      },
      maxWidth: {
        content:  "1200px",
        prose:    "640px",
        narrow:   "480px",
      },

      /* ================================================================
         MOTION
         Duration tokens + easings. Defaults intentionally fast (<200ms);
         subtle motion is the difference between "premium" and "sluggish".
      ================================================================== */
      transitionDuration: {
        fast:   "120ms",
        DEFAULT:"180ms",
        base:   "180ms",
        slow:   "240ms",
        slower: "320ms",
      },
      transitionTimingFunction: {
        DEFAULT:        "cubic-bezier(0.25, 1, 0.5, 1)",     // ease-out-quart, default for entrances/hovers
        "out-quart":    "cubic-bezier(0.25, 1, 0.5, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",    // page-level transitions
        "in-quart":     "cubic-bezier(0.5, 0, 0.75, 0)",     // exits
        spring:         "cubic-bezier(0.5, 1.65, 0.5, 1)",   // playful pop (use sparingly)
      },

      keyframes: {
        "fade-in":     { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-out":    { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        "scale-in":    { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "slide-up":    { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "slide-down":  { "0%": { opacity: "0", transform: "translateY(-4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer:       { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in":   "fade-in 180ms cubic-bezier(0.25, 1, 0.5, 1)",
        "fade-out":  "fade-out 120ms cubic-bezier(0.5, 0, 0.75, 0)",
        "scale-in":  "scale-in 180ms cubic-bezier(0.25, 1, 0.5, 1)",
        "slide-up":  "slide-up 240ms cubic-bezier(0.25, 1, 0.5, 1)",
        "slide-down":"slide-down 240ms cubic-bezier(0.25, 1, 0.5, 1)",
        shimmer:     "shimmer 2s linear infinite",
      },

      /* ================================================================
         Z-INDEX SCALE — named layers prevent magic numbers
      ================================================================== */
      zIndex: {
        base:     "0",
        sticky:   "100",
        dropdown: "200",
        overlay:  "900",
        modal:    "1000",
        popover:  "1100",
        toast:    "1200",
        tooltip:  "1300",
      },
    },
  },
  plugins: [],
};
