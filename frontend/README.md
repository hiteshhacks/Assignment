# CampusMind Frontend

A clean, minimal, chat-first web interface for the **CampusMind Autonomous Academic Engine**, connecting to the FastAPI SSE backend with real-time stream consumption, collapsible agent activity, and session management.

---

## 1. Directory Structure

```
frontend/
├── assets/
│   └── campusmind-logo.png      # High-resolution local brand emblem
├── css/
│   └── style.css                # Base resets, safe markdown typography & thinking animation
├── js/
│   ├── tailwind.config.js       # Restrained dark theme design tokens
│   └── main.js                  # SSE stream reader, collapsible activity & evidence, safe markdown
├── index.html                   # Primary production entrypoint (clean, chat-first)
├── code.html                    # Mirror copy aligned with modular architecture
└── README.md                    # Architecture documentation and refactoring notes
```

---

## 2. Refactored Architecture & Design Improvements

1. **Clean, Centered Chat View**: Completely eliminated the left navigation sidebar and top technical header bar. The conversation is centered in a responsive container (`max-w-3xl`) for comfortable readability on mobile and desktop.
2. **Removed Technical Clutter**: Stripped away model name chips, tokens-per-second counters, gateway telemetry cards, ping badges, and database status widgets.
3. **Collapsible "Agent activity"**: Replaced the large permanent graph cards with a compact, collapsible `<details>` section directly attached to each assistant message. Shows steps as they happen (`Query intent routed`, `Campus knowledge retrieved`, etc.).
4. **Collapsible "Sources and relationships"**: Placed below the assistant answer. Displays an honest empty state (`No evidence details were provided in this response`) while the backend does not emit evidence metadata, and is fully wired to consume future `evidence` events.
5. **Subtle Thinking Indicator**: Clean pulsing indicator while the backend processes the query.
6. **Restrained Dark Theme**: Uses `#0d0f14` background, `#14171f` surface, `#222634` border, and a single `#6366f1` accent color.

---

## 3. Removed / Renamed Elements and Functions

### Removed HTML Elements
- `<aside>` fixed sidebar with telemetry and mock history links.
- `<header>` fixed dashboard header bar with token metrics and status pills.
- Permanent live agent workflow graph panel (`#wfNodeRouter`, `#wfNodeRoute`, `#wfNodeAnswer`, `#wfNodeStatus`).
- Permanent evidence card list (`#evidenceAccordion`, `#evidenceCountBadge`).
- SVG connector lines, telemetry dock bar, and radial ambient lighting divs.

### Removed / Renamed JavaScript Functions
- `simulateWorkflowProgress()`: Removed; was a mock UI-only animation.
- `checkBackendHealth()`: Removed from the header loop; ping cards and gateway telemetry badges were removed from the UI.
- `updateWorkflowNode()`, `resetWorkflowPanel()`, `setNodeUI()`, `updateLatencyBadge()`: Replaced by modular per-message `processBackendEvent()` updating collapsible `Agent activity`.
- `handleFileUpload()`: Removed file upload attachment button clutter.
- `triggerSendMessage()`: Renamed and simplified to `sendMessage()`.
- `startNewSession()`: Renamed and simplified to `startNewChat()`.

---

## 4. Running the Frontend Locally

### Option A: Python Built-in Server (Recommended)
```bash
python -m http.server 3000 --directory frontend
```
Navigate to: **`http://localhost:3000`**.

### Option B: Node.js Serve
```bash
npx serve frontend -p 3000
```

---

## 5. Backend Streaming Contract

- **Endpoint**: `POST http://127.0.0.1:8000/api/v1/chat/stream`
- **Request Format**:
  ```json
  {
    "message": "Who teaches machine learning?",
    "session_id": "session-4a9f82bc-1792338800000"
  }
  ```
- **Events Handled**:
  - `node_update`: logs human-readable progress step into collapsible "Agent activity".
  - `answer`: updates the markdown content and dismisses the thinking indicator.
  - `done`: marks the activity section as completed and enables the sources dropdown.
  - `evidence`: (future payload support) populates real retrieved documents and Neo4j graph relationships.
  - `error`: displays a clean connection/processing error message.
