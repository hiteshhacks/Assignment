# CampusMind Frontend

A modern, high-performance web interface for the **CampusMind Autonomous Academic Engine**, connecting to the FastAPI SSE backend with real-time stream consumption, live workflow graph visualization, and session management.

---

## 1. Directory Structure

```
frontend/
├── assets/
│   └── campusmind-logo.png      # High-resolution local brand emblem
├── css/
│   └── style.css                # Base resets, safe markdown styles & disabled states
├── js/
│   ├── tailwind.config.js       # Complete custom design tokens (colors, fonts, radii)
│   └── main.js                  # SSE stream reader, workflow state engine, safe markdown & events
├── index.html                   # Primary production entrypoint
├── code.html                    # Mirror copy aligned with modular architecture
└── README.md                    # Comprehensive documentation and integration guide
```

---

## 2. Running the Frontend Locally

You can serve the `frontend/` directory using any local static web server:

### Option A: Python Built-in Server (Recommended)
From the project root:
```bash
python -m http.server 3000 --directory frontend
```
Then navigate to: **`http://localhost:3000`** (or open `http://127.0.0.1:3000`).

### Option B: Node.js `serve` / `npx http-server`
```bash
npx serve frontend -p 3000
```

### Option C: Direct File Access
You can also open `index.html` directly in your browser (`file:///path/to/frontend/index.html`). Note that browsers enforce strict CORS origins on `file://` URLs, so running via `http://localhost:3000` is recommended when connecting to `http://127.0.0.1:8000`.

---

## 3. Required Backend CORS Configuration

By default, modern browsers block cross-origin `fetch()` requests unless the backend explicitly allows the origin.

To allow local frontend connections (e.g., from `http://localhost:3000` or `http://127.0.0.1:3000`), update **`backend/app/main.py`**:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.chat import router as chat_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# Enable CORS for local frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "null",  # Allows file:// URLs in certain browsers
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix=settings.API_PREFIX)
```

---

## 4. Backend Streaming Protocol Specification

The frontend connects via `fetch()` and `ReadableStream`:

- **Endpoint**: `POST http://127.0.0.1:8000/api/v1/chat/stream`
- **Request Body**:
  ```json
  {
    "message": "Who teaches machine learning?",
    "session_id": "session-4a9f82bc-1792338800000"
  }
  ```
- **SSE Events Processed**:
  1. `{"session_id": "...", "type": "node_update", "node": "router", "status": "completed"}`
  2. `{"session_id": "...", "type": "node_update", "node": "knowledge" | "llm" | "direct", "status": "completed"}`
  3. `{"session_id": "...", "type": "answer", "node": "...", "content": "..."}`
  4. `{"type": "done"}`
  5. `{"type": "error", "message": "..."}`

---

## 5. Feature Status & Backend Roadmap

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **SSE POST Stream with `fetch()` & `ReadableStream`** | **Working** | Incremental line-by-line parsing with buffer protection against chunk splits. |
| **Immediate Message Dispatch & Loading State** | **Working** | User bubbles append immediately; thinking spinner activates during stream. |
| **Duplicate Submission Protection** | **Working** | Textarea and send button are disabled while a request is in flight. |
| **Session Preservation & Regeneration** | **Working** | Preserved across conversation; "New Session" resets state with fresh session ID. |
| **Live Workflow Visualizer** | **Working** | Accurately maps real backend events: `router`, `knowledge`, `llm`, `direct`, `answer`, `done`, `error`. |
| **XSS-Safe Markdown Formatter** | **Working** | Sanitizes untrusted content before formatting code blocks, bold, lists, and line breaks. |
| **Gateway Health Check & Latency Monitor** | **Working** | Pings `/health` on load and measures real round-trip latency in milliseconds. |
| **Honest Evidence Panel** | **Ready for Backend** | Displays honest placeholder explaining that current stream does not emit evidence metadata; handler is built to render documents and graph edges once emitted. |
| **Backend CORS Middleware** | **Pending Backend** | Requires `CORSMiddleware` in `backend/app/main.py`. |
| **Backend Evidence Metadata Streaming** | **Pending Backend** | When backend streams `{"type": "evidence", "items": [...]}`, frontend dynamically populates score and graph paths. |
