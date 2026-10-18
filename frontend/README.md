# CampusMind Frontend

Modern, high-performance UI shell for the CampusMind Autonomous Academic Engine.

## Directory Structure

```
frontend/
├── assets/
│   └── campusmind-logo.png     # Local optimized brand logo and static assets
├── css/
│   └── style.css               # Core CSS resets, base layer, and scrollbar styling
├── js/
│   ├── tailwind.config.js      # Tailwind CSS custom design tokens, colors & typography
│   └── main.js                 # UI interactions, chat dispatch, accordion & workflow animation
├── index.html                  # Standard entry point for the frontend web application
├── code.html                   # Modularized copy matching index.html
└── README.md                   # Documentation for the frontend architecture
```

## Features & Organization

- **Separation of Concerns**: Extracted inline CSS and JavaScript into modular files under `css/` and `js/`.
- **Offline Assets**: The CampusMind emblem is downloaded locally to `assets/` for fast loading.
- **Design Tokens**: Complete custom color palette, typography (Plus Jakarta Sans & Space Grotesk), and spacing configuration maintained in `js/tailwind.config.js`.
- **Keyboard Shortcuts**: Built-in shortcut support (`Enter` to submit, `Shift + Enter` for newlines, `Ctrl + K` to focus composer).
