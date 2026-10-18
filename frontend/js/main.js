/**
 * ==========================================================================
 * CampusMind - Minimal Chat-First AI Assistant
 * Backend: FastAPI SSE Stream (POST /api/v1/chat/stream)
 * ==========================================================================
 */

const CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000',
  STREAM_ENDPOINT: '/api/v1/chat/stream',
};

// Global state
let currentSessionId = generateSessionId();
let isProcessing = false;
let abortController = null;

/**
 * Generate a cryptographically strong or pseudo-random session ID
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'session-' + crypto.randomUUID();
  }
  return 'session-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
}

/**
 * Start a new chat session: resets messages and state
 */
function startNewChat() {
  if (isProcessing && abortController) {
    abortController.abort();
  }
  setProcessingState(false);

  currentSessionId = generateSessionId();

  // Reset chat container to initial welcome state
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div id="welcomeState" class="py-12 sm:py-20 text-center space-y-4">
        <div class="w-12 h-12 mx-auto rounded-xl bg-surface border border-border flex items-center justify-center text-accent">
          <span class="material-symbols-outlined text-[24px]">school</span>
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-text-primary">CampusMind Assistant</h1>
          <p class="text-sm text-text-secondary max-w-md mx-auto">
            Ask questions about academic courses, research faculty, lab grants, campus facilities, or degree guidelines.
          </p>
        </div>

        <div class="pt-2 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          <button type="button" onclick="fillPrompt(this)" class="text-xs px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary transition-colors text-left">
            Prerequisites for CS 4470 Deep Learning?
          </button>
          <button type="button" onclick="fillPrompt(this)" class="text-xs px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary transition-colors text-left">
            Prof. Chen bio-robotics grant summaries
          </button>
          <button type="button" onclick="fillPrompt(this)" class="text-xs px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary transition-colors text-left">
            Open whiteboard rooms in Student Center
          </button>
        </div>
      </div>
    `;
  }

  // Clear and focus composer
  const input = document.getElementById('messageInput');
  if (input) {
    input.value = '';
    autoResizeTextarea(input);
    input.focus();
  }
}

/**
 * Populate composer with prompt starter
 */
function fillPrompt(btn) {
  const text = btn.innerText.trim();
  const input = document.getElementById('messageInput');
  if (input) {
    input.value = text;
    autoResizeTextarea(input);
    input.focus();
  }
}

/**
 * Handle Enter / Shift+Enter in composer
 */
function handleComposerKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

/**
 * Auto-resize textarea height to fit content
 */
function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 144) + 'px'; // Max ~6 lines
}

/**
 * Send user message and stream backend SSE response
 */
async function sendMessage() {
  if (isProcessing) return;

  const input = document.getElementById('messageInput');
  if (!input) return;

  const messageText = input.value.trim();
  if (!messageText) return;

  // Clear composer & resize
  input.value = '';
  autoResizeTextarea(input);
  setProcessingState(true);

  // Remove welcome empty state if present
  const welcomeState = document.getElementById('welcomeState');
  if (welcomeState) {
    welcomeState.remove();
  }

  // 1. Render User Message
  appendUserMessage(messageText);

  // 2. Render Assistant Message Container
  const assistantBubble = createAssistantMessage();

  // 3. Initiate SSE Streaming Request
  try {
    abortController = new AbortController();

    const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.STREAM_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message: messageText,
        session_id: currentSessionId,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
    }

    if (!response.body) {
      throw new Error('ReadableStream is not supported in this browser.');
    }

    await readSSEStream(response.body, assistantBubble);

  } catch (error) {
    handleStreamError(error, assistantBubble);
  } finally {
    setProcessingState(false);
  }
}

/**
 * Incrementally consume SSE chunks via ReadableStream
 */
async function readSSEStream(streamBody, assistantBubble) {
  const reader = streamBody.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Retain incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr);
          processBackendEvent(event, assistantBubble);
        } catch (parseErr) {
          console.warn('Unable to parse SSE event JSON:', dataStr, parseErr);
        }
      }
    }

    // Process leftover buffer
    if (buffer.trim() && buffer.trim().startsWith('data:')) {
      const dataStr = buffer.trim().slice(5).trim();
      try {
        const event = JSON.parse(dataStr);
        processBackendEvent(event, assistantBubble);
      } catch (e) {
        // Ignored
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Handle structured backend SSE events
 */
function processBackendEvent(event, bubble) {
  const activityDetails = bubble.querySelector('.agent-activity');
  const activityList = bubble.querySelector('.agent-activity-list');
  const activityStatus = bubble.querySelector('.agent-activity-status');
  const thinkingIndicator = bubble.querySelector('.thinking-indicator');
  const contentEl = bubble.querySelector('.markdown-content');
  const evidenceDetails = bubble.querySelector('.evidence-details');
  const evidenceContent = bubble.querySelector('.evidence-content');

  switch (event.type) {
    case 'node_update': {
      const node = event.node;
      const status = event.status;

      // Make activity section visible once we have events
      if (activityDetails) {
        activityDetails.classList.remove('hidden');
      }

      if (activityList) {
        const stepName = formatNodeName(node);
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 text-text-secondary';
        li.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span>${escapeHtml(stepName)}</span>
          <span class="text-text-muted text-[11px] font-mono">(${escapeHtml(status)})</span>
        `;
        activityList.appendChild(li);
      }

      if (activityStatus) {
        activityStatus.textContent = 'Processing...';
      }
      break;
    }

    case 'answer': {
      // Hide thinking indicator
      if (thinkingIndicator) {
        thinkingIndicator.classList.add('hidden');
      }

      // Render answer content safely using Markdown-it + KaTeX
      if (contentEl) {
        contentEl.classList.remove('hidden');
        renderMarkdownInto(event.content || '', contentEl);
      }
      break;
    }

    case 'done': {
      if (thinkingIndicator) {
        thinkingIndicator.classList.add('hidden');
      }
      if (activityStatus) {
        activityStatus.textContent = 'Completed';
      }
      // Show evidence section below answer
      if (evidenceDetails) {
        evidenceDetails.classList.remove('hidden');
      }
      break;
    }

    case 'evidence': {
      // Future backend support: when real evidence is emitted
      if (evidenceDetails) {
        evidenceDetails.classList.remove('hidden');
      }
      if (evidenceContent && Array.isArray(event.items) && event.items.length > 0) {
        evidenceContent.innerHTML = event.items.map(item => `
          <div class="py-1.5 border-b border-border/40 last:border-0">
            <div class="font-medium text-text-primary text-xs">${escapeHtml(item.title || 'Document')}</div>
            ${item.relationship ? `<div class="text-[11px] text-accent mt-0.5 font-mono">${escapeHtml(item.relationship)}</div>` : ''}
            ${item.snippet ? `<p class="text-text-secondary text-xs mt-1">${escapeHtml(item.snippet)}</p>` : ''}
          </div>
        `).join('');
      }
      break;
    }

    case 'error': {
      if (thinkingIndicator) {
        thinkingIndicator.classList.add('hidden');
      }
      if (activityStatus) {
        activityStatus.textContent = 'Error';
      }
      displayErrorMessage(bubble, event.message || 'An error occurred during response synthesis.');
      break;
    }

    default:
      console.log('Unrecognized backend event:', event);
  }
}

/**
 * Format raw node names into clean labels
 */
function formatNodeName(node) {
  switch (node) {
    case 'router': return 'Query intent routed';
    case 'knowledge': return 'Campus knowledge retrieved';
    case 'llm': return 'General LLM response generated';
    case 'direct': return 'Direct reply prepared';
    default: return node ? `Node [${node}] processed` : 'Step completed';
  }
}

/**
 * Handle stream exceptions & connection failures
 */
function handleStreamError(error, bubble) {
  const isNetworkFail = error.name === 'TypeError' || String(error).includes('Failed to fetch');
  let userMsg = error.message || 'Connection failure';

  if (isNetworkFail) {
    userMsg = `Unable to connect to FastAPI backend at ${CONFIG.API_BASE_URL}.\n\n` +
      `Please ensure:\n` +
      `1. The backend is running: python -m uvicorn backend.app.main:app --reload --port 8000\n` +
      `2. CORS is enabled in backend/app/main.py.`;
  }

  const thinkingIndicator = bubble.querySelector('.thinking-indicator');
  if (thinkingIndicator) {
    thinkingIndicator.classList.add('hidden');
  }

  const activityStatus = bubble.querySelector('.agent-activity-status');
  if (activityStatus) {
    activityStatus.textContent = 'Failed';
  }

  displayErrorMessage(bubble, userMsg);
}

/**
 * Display a clean error box inside the assistant bubble
 */
function displayErrorMessage(bubble, text) {
  const contentEl = bubble.querySelector('.markdown-content');
  if (contentEl) {
    contentEl.classList.remove('hidden');
    contentEl.innerHTML = `
      <div class="rounded-lg bg-error-bg border border-error/30 p-3 text-xs text-error space-y-1">
        <div class="font-semibold flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">error_outline</span>
          <span>Request Failed</span>
        </div>
        <p class="text-text-primary whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>
      </div>
    `;
  }
}

/**
 * Render user message bubble
 */
function appendUserMessage(text) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubble = document.createElement('div');
  bubble.className = 'flex flex-col items-end w-full pl-8 sm:pl-16';
  bubble.innerHTML = `
    <div class="max-w-xl rounded-2xl rounded-tr-sm bg-surface border border-border px-4 py-2.5 shadow-sm">
      <p class="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">${escapeHtml(text)}</p>
    </div>
    <span class="text-[11px] text-text-muted mt-1 px-1 font-mono">${escapeHtml(time)}</span>
  `;

  chatMessages.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Create assistant message container
 */
function createAssistantMessage() {
  const chatMessages = document.getElementById('chatMessages');
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const container = document.createElement('div');
  container.className = 'flex items-start gap-3 w-full pr-4 sm:pr-12';
  container.innerHTML = `
    <div class="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0 text-accent mt-0.5">
      <span class="material-symbols-outlined text-[16px]">smart_toy</span>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-semibold text-text-primary">CampusMind</span>
        <span class="text-[11px] text-text-muted font-mono">${escapeHtml(time)}</span>
      </div>

      <!-- Collapsible Agent Activity Section -->
      <details class="agent-activity hidden my-2 text-xs border border-border/80 rounded-lg bg-surface/50 overflow-hidden">
        <summary class="cursor-pointer select-none px-3 py-1.5 text-text-secondary hover:text-text-primary flex items-center justify-between transition-colors">
          <span class="flex items-center gap-1.5 font-medium">
            <span class="material-symbols-outlined text-[14px]">account_tree</span>
            <span>Agent activity</span>
            <span class="agent-activity-status text-[11px] text-accent font-mono ml-1">Running...</span>
          </span>
          <span class="material-symbols-outlined text-[14px] text-text-muted">expand_more</span>
        </summary>
        <div class="px-3 py-2 border-t border-border/50 bg-background/30">
          <ul class="agent-activity-list space-y-1.5 text-[11px]"></ul>
        </div>
      </details>

      <!-- Thinking Indicator -->
      <div class="thinking-indicator py-2 flex items-center gap-2 text-xs text-text-muted">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-thinking-dot"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-thinking-dot"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-thinking-dot"></span>
        </div>
        <span>Thinking...</span>
      </div>

      <!-- Answer Content -->
      <div class="markdown-content hidden text-text-primary text-sm leading-relaxed mt-1"></div>

      <!-- Collapsible Sources and Relationships Section -->
      <details class="evidence-details hidden mt-3 text-xs border border-border/80 rounded-lg bg-surface/50 overflow-hidden">
        <summary class="cursor-pointer select-none px-3 py-1.5 text-text-secondary hover:text-text-primary flex items-center justify-between transition-colors">
          <span class="flex items-center gap-1.5 font-medium">
            <span class="material-symbols-outlined text-[14px]">link</span>
            <span>Sources and relationships</span>
          </span>
          <span class="material-symbols-outlined text-[14px] text-text-muted">expand_more</span>
        </summary>
        <div class="evidence-content px-3 py-2 border-t border-border/50 text-[11px] text-text-muted bg-background/30">
          No evidence details were provided in this response.
        </div>
      </details>
    </div>
  `;

  chatMessages.appendChild(container);
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return container;
}

/**
 * Enable or disable UI controls while waiting for response
 */
function setProcessingState(processing) {
  isProcessing = processing;
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('messageInput');

  if (sendBtn) {
    sendBtn.disabled = processing;
    sendBtn.innerHTML = processing
      ? `<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span>`
      : `<span class="material-symbols-outlined text-[16px]">arrow_upward</span>`;
  }

  if (input) {
    if (processing) {
      input.setAttribute('disabled', 'true');
    } else {
      input.removeAttribute('disabled');
      input.focus();
    }
  }
}

/**
 * Sanitize plain string into safe HTML entities
 */
function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Singleton markdown-it parser instance with safe settings & syntax highlighting
 */
let mdParserInstance = null;

function getMarkdownParser() {
  if (mdParserInstance) return mdParserInstance;

  if (typeof window.markdownit !== 'undefined') {
    mdParserInstance = window.markdownit({
      html: false, // Disables raw HTML in source markdown for maximum security
      xhtmlOut: false,
      breaks: true, // Converts '\n' in paragraphs into <br>
      langPrefix: 'language-',
      linkify: true, // Autoconvert URL-like text to links
      typographer: true,
      highlight: function (str, lang) {
        let highlighted = '';
        const cleanLang = (lang || '').trim().toLowerCase();

        if (cleanLang && typeof hljs !== 'undefined' && hljs.getLanguage(cleanLang)) {
          try {
            highlighted = hljs.highlight(str, { language: cleanLang, ignoreIllegals: true }).value;
          } catch (__) {
            highlighted = escapeHtml(str);
          }
        } else if (typeof hljs !== 'undefined') {
          try {
            const auto = hljs.highlightAuto(str);
            highlighted = auto.value;
          } catch (__) {
            highlighted = escapeHtml(str);
          }
        } else {
          highlighted = escapeHtml(str);
        }

        const displayLang = cleanLang || 'code';
        return `<div class="code-block-wrapper">` +
          `<div class="code-block-header">` +
            `<span class="code-block-lang">${escapeHtml(displayLang)}</span>` +
            `<button type="button" class="copy-code-btn" onclick="copyCodeBlock(this)" title="Copy code">` +
              `<span class="material-symbols-outlined text-[14px]">content_copy</span>` +
              `<span>Copy</span>` +
            `</button>` +
          `</div>` +
          `<pre><code class="hljs language-${escapeHtml(displayLang)}">${highlighted}</code></pre>` +
        `</div>`;
      }
    });

    // Custom renderer rules: wrap tables in horizontal scroll containers
    const defaultTableOpen = mdParserInstance.renderer.rules.table_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
    const defaultTableClose = mdParserInstance.renderer.rules.table_close || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    mdParserInstance.renderer.rules.table_open = function (tokens, idx, options, env, self) {
      return `<div class="markdown-table-wrapper">` + defaultTableOpen(tokens, idx, options, env, self);
    };

    mdParserInstance.renderer.rules.table_close = function (tokens, idx, options, env, self) {
      return defaultTableClose(tokens, idx, options, env, self) + `</div>`;
    };

    // Link security: target="_blank", rel="noopener noreferrer", and neutralize javascript:/data: URLs
    const defaultLinkOpen = mdParserInstance.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    mdParserInstance.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      const hrefIndex = tokens[idx].attrIndex('href');
      if (hrefIndex >= 0) {
        const href = tokens[idx].attrs[hrefIndex][1] || '';
        if (/^(?:javascript|vbscript|data):/i.test(href.trim())) {
          tokens[idx].attrs[hrefIndex][1] = '#';
        }
      }
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
      return defaultLinkOpen(tokens, idx, options, env, self);
    };
  }

  return mdParserInstance;
}

/**
 * Safely parse Markdown text and sanitize through DOMPurify
 */
function renderSafeMarkdown(markdown) {
  if (!markdown) return '';

  const parser = getMarkdownParser();
  let rawHtml = '';

  if (parser) {
    try {
      rawHtml = parser.render(markdown);
    } catch (parseErr) {
      console.warn('Markdown parsing error, fallback to escaped text:', parseErr);
      rawHtml = escapeHtml(markdown).replace(/\n/g, '<br/>');
    }
  } else {
    rawHtml = escapeHtml(markdown).replace(/\n/g, '<br/>');
  }

  // Sanitize with DOMPurify
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'strong', 'b', 'em', 'i', 's', 'del', 'a',
        'div', 'span', 'button',
        // KaTeX math tags
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'annotation', 'annotation-xml'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel', 'class', 'id', 'onclick', 'type',
        'aria-hidden', 'encoding', 'style'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\/:-]|$))/i,
    });
  }

  return rawHtml;
}

/**
 * Render sanitized Markdown into a container and execute KaTeX auto-render
 */
function renderMarkdownInto(markdown, targetEl) {
  if (!targetEl) return;
  const safeHtml = renderSafeMarkdown(markdown);
  targetEl.innerHTML = safeHtml;

  // Render mathematical notation if KaTeX auto-render is available
  if (typeof renderMathInElement !== 'undefined') {
    try {
      renderMathInElement(targetEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      });
    } catch (mathErr) {
      console.warn('KaTeX math render error:', mathErr);
    }
  }
}

/**
 * Copy code block content to clipboard with visual feedback
 */
function copyCodeBlock(button) {
  const wrapper = button.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (!codeEl) return;
  const text = codeEl.innerText;

  const originalHtml = button.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    button.innerHTML = '<span class="material-symbols-outlined text-[14px] text-success">check</span><span class="text-success font-medium">Copied!</span>';
    setTimeout(() => {
      button.innerHTML = originalHtml;
    }, 2000);
  }).catch(() => {
    // Fallback if navigator.clipboard is unavailable
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      button.innerHTML = '<span class="material-symbols-outlined text-[14px] text-success">check</span><span class="text-success font-medium">Copied!</span>';
    } catch (e) {
      console.warn('Clipboard copy fallback error:', e);
    }
    document.body.removeChild(textarea);
    setTimeout(() => {
      button.innerHTML = originalHtml;
    }, 2000);
  });
}

// Global hotkey: Ctrl+K or Cmd+K to focus input
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    if (input) input.focus();
  }
});

// Window exposure for inline HTML event handlers
window.sendMessage = sendMessage;
window.handleComposerKey = handleComposerKey;
window.fillPrompt = fillPrompt;
window.startNewChat = startNewChat;
window.autoResizeTextarea = autoResizeTextarea;
window.copyCodeBlock = copyCodeBlock;
window.renderSafeMarkdown = renderSafeMarkdown;
window.renderMarkdownInto = renderMarkdownInto;
