/**
 * Tailwind CSS Configuration for CampusMind
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#dfe2f1",
        "background": "#0f131d",
        "on-primary-fixed-variant": "#2f2ebe",
        "secondary": "#7bd0ff",
        "primary-fixed-dim": "#c0c1ff",
        "surface": "#0f131d",
        "on-secondary-fixed": "#001e2c",
        "tertiary-fixed-dim": "#bdc2ff",
        "secondary-container": "#00a6e0",
        "surface-container-highest": "#313540",
        "surface-variant": "#313540",
        "primary": "#c0c1ff",
        "on-surface-variant": "#c7c4d7",
        "surface-tint": "#c0c1ff",
        "surface-dim": "#0f131d",
        "primary-fixed": "#e1e0ff",
        "on-primary-container": "#0d0096",
        "error": "#ffb4ab",
        "surface-container": "#1c1f2a",
        "on-tertiary": "#131e8c",
        "tertiary-container": "#7c87f3",
        "outline": "#908fa0",
        "on-tertiary-fixed-variant": "#2f3aa3",
        "on-primary-fixed": "#07006c",
        "secondary-fixed-dim": "#7bd0ff",
        "tertiary-fixed": "#e0e0ff",
        "surface-container-low": "#171b26",
        "secondary-fixed": "#c4e7ff",
        "surface-container-lowest": "#0a0e18",
        "surface-bright": "#353944",
        "tertiary": "#bdc2ff",
        "on-secondary": "#00354a",
        "error-container": "#93000a",
        "on-tertiary-fixed": "#000767",
        "on-primary": "#1000a9",
        "on-tertiary-container": "#081486",
        "inverse-primary": "#494bd6",
        "on-secondary-fixed-variant": "#004c69",
        "on-error": "#690005",
        "on-secondary-container": "#00374d",
        "on-surface": "#dfe2f1",
        "on-error-container": "#ffdad6",
        "surface-container-high": "#262a35",
        "outline-variant": "#464554",
        "primary-container": "#8083ff",
        "inverse-on-surface": "#2c303b",
        "inverse-surface": "#dfe2f1"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "margin-mobile": "1rem",
        "space-md": "1rem",
        "space-sm": "0.5rem",
        "space-xs": "0.25rem",
        "space-lg": "1.5rem",
        "gutter-mobile": "0.75rem",
        "margin": "2rem",
        "gutter": "1.5rem",
        "space-xl": "2.5rem"
      },
      fontFamily: {
        "label-md": ["Space Grotesk", "sans-serif"],
        "body-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Space Grotesk", "sans-serif"],
        "display-lg": ["Plus Jakarta Sans", "sans-serif"],
        "display-lg-mobile": ["Plus Jakarta Sans", "sans-serif"]
      },
      fontSize: {
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.06em", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-lg-mobile": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }]
      }
    }
  }
};
