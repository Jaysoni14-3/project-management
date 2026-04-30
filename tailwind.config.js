/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      /* ================================
         COLORS
      ================================= */
      colors: {
        bg: "#F9FAFB",          // App background
        surface: "#FFFFFF",     // Cards, modals
        border: "#E5E7EB",

        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },

        accent: {
          DEFAULT: "#061D6F",
          hover: "#1D4ED8",
          soft: "#EFF6FF",
        },
        success: "#16A34A",
        warning: "#D97706",
        error: "#DC2626",
        info: "#0284C7",
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #061D6F, #1D4ED8)',
      },

      /* ================================
         TYPOGRAPHY
      ================================= */
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      fontSize: {
        page: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],      // 24px
        section: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }], // 18px

        body: ["0.875rem", { lineHeight: "1.6" }],    // 14px
        bodySm: ["0.8125rem", { lineHeight: "1.6" }], // 13px

        label: ["0.75rem", { lineHeight: "1.4" }],    // 12px
        caption: ["0.6875rem", { lineHeight: "1.4" }],// 11px
      },

      /* ================================
         SPACING
      ================================= */
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },

      /* ================================
         BORDER RADIUS
      ================================= */
      borderRadius: {
        sm: "6px",
        md: "8px",   // buttons, inputs
        lg: "10px",  // cards
        xl: "14px",  // modals
      },

      /* ================================
         BOX SHADOWS
      ================================= */
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        modal: "0 10px 30px rgba(0,0,0,0.12)",
      },

      /* ================================
          SIDEBAR WIDTHS
      ================================= */
      width: {
        sidebar: "256px",
        "sidebar-collapsed": "60px",
      },

      /* ================================
         LAYOUT
      ================================= */
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
