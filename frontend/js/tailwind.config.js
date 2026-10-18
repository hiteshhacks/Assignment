/**
 * CampusMind - Clean, Restrained Tailwind CSS Design System
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0d0f14",
        surface: "#14171f",
        "surface-hover": "#1c202b",
        border: "#222634",
        "border-focus": "#3b4256",
        "text-primary": "#e2e5ec",
        "text-secondary": "#8b94a5",
        "text-muted": "#5a6275",
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        "accent-light": "rgba(99, 102, 241, 0.12)",
        error: "#f87171",
        "error-bg": "rgba(248, 113, 113, 0.1)",
        success: "#34d399",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
};
