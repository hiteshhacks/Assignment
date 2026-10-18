/**
 * ==========================================================================
 * CampusMind Frontend - Real FastAPI SSE Chatbot & Workflow Visualizer
 * ==========================================================================
 */

const CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000',
  STREAM_ENDPOINT: '/api/v1/chat/stream',
  HEALTH_ENDPOINT: '/health',
};

// Global state
let currentSessionId = generateSessionId();
let isProcessing = false;
let abortController = null;
let requestStartTime = 0;

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
 * Update session ID display badge in UI
 */
function updateSessionBadge() {
  const badge = document.getElementById('currentSessionBadge');
  if (badge) {
    const shortId = currentSessionId.length > 20
      ? currentSessionId.substring(0, 18) + '...'
      : currentSessionId;
    badge.textContent = shortId;
    badge.title = 'Active Session: ' + currentSessionId;
  }
}

/**
 * Start a brand-new conversation session
 */
function startNewSession() {
  if (isProcessing) {
    if (abortController) {
      abortController.abort();
    }
    setProcessingState(false);
  }

  currentSessionId = generateSessionId();
  updateSessionBadge();

  // Reset chat messages (preserve prompt starters in hero)
  const chatStream = document.getElementById('chatStream');
  if (chatStream) {
    chatStream.innerHTML = `
      <!-- Dynamic Live Generation Placeholder -->
      <div class="hidden items-start gap-space-sm w-full pr-2 md:pr-16" id="streamingMessage">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-primary flex items-center justify-center flex-shrink-0 text-on-primary animate-pulse">
          <span class="material-symbols-outlined text-[18px]">bolt</span>
        </div>
        <div class="flex-1 rounded-2xl bg-surface-container p-space-md shadow-lg space-y-2">
          <div class="flex items-center gap-2 text-label-sm font-label-sm text-secondary">
            <span class="inline-block w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span>Synthesizing campus knowledge & routing agent...</span>
          </div>
          <div class="h-2 w-3/4 rounded bg-surface-container-highest animate-pulse"></div>
          <div class="h-2 w-1/2 rounded bg-surface-container-highest animate-pulse"></div>
        </div>
      </div>
    `;
  }

  // Reset workflow and evidence panels
  resetWorkflowPanel('idle');
  resetEvidencePanel();

  // Focus input
  const composer = document.getElementById('mainComposerInput');
  if (composer) {
    composer.value = '';
    composer.focus();
  }
}

/**
 * Ping backend health endpoint to verify connectivity
 */
async function checkBackendHealth() {
  const statusBadge = document.getElementById('backendStatusBadge');
  const pingBadge = document.getElementById('backendPingBadge');

  try {
    const t0 = performance.now();
    const res = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.HEALTH_ENDPOINT}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const elapsed = Math.round(performance.now() - t0);

    if (res.ok) {
      if (statusBadge) {
        statusBadge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span class="text-label-sm font-label-sm text-on-surface-variant">FastAPI Gateway</span>
          <span class="text-outline text-label-sm">•</span>
          <span class="text-label-sm font-label-sm text-secondary font-mono">${elapsed}ms</span>
        `;
      }
      if (pingBadge) {
        pingBadge.innerHTML = `
          <span class="material-symbols-outlined text-secondary text-[16px]">speed</span>
          <span class="text-label-sm font-label-sm text-secondary font-mono">${elapsed}ms Ping</span>
        `;
      }
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
        <span class="text-label-sm font-label-sm text-error">Gateway Offline</span>
      `;
    }
    if (pingBadge) {
      pingBadge.innerHTML = `
        <span class="material-symbols-outlined text-error text-[16px]">cloud_off</span>
        <span class="text-label-sm font-label-sm text-error font-mono">Offline</span>
      `;
    }
  }
}

/**
 * Handle keydown on composer textarea (Enter sends, Shift+Enter new line)
 */
function handleComposerKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    triggerSendMessage();
  }
}

/**
 * Fill composer with prompt starter
 */
function fillPrompt(btn) {
  const txt = btn.innerText.trim();
  const composer = document.getElementById('mainComposerInput');
  if (composer) {
    composer.value = txt;
    composer.focus();
  }
}

/**
 * Trigger sending the current message
 */
async function triggerSendMessage() {
  if (isProcessing) return;

  const composer = document.getElementById('mainComposerInput');
  if (!composer) return;

  const messageText = composer.value.trim();
  if (!messageText) return;

  // Clear composer & disable controls
  composer.value = '';
  setProcessingState(true);
  requestStartTime = performance.now();

  // Reset workflow visualizer for this question
  resetWorkflowPanel('running');
  resetEvidencePanel();

  // Append user message bubble
  appendUserMessage(messageText);

  // Append placeholder assistant message bubble
  const assistantBubble = createAssistantMessageBubble();

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
      throw new Error(`Backend responded with HTTP ${response.status} (${response.statusText})`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by browser or empty response body');
    }

    // Read SSE stream incrementally using ReadableStream
    await readSSEStream(response.body, assistantBubble);

  } catch (error) {
    handleStreamError(error, assistantBubble);
  } finally {
    setProcessingState(false);
    updateLatencyBadge(Math.round(performance.now() - requestStartTime));
  }
}

/**
 * Read the SSE stream chunk by chunk
 */
async function readSSEStream(streamBody, assistantBubble) {
  const reader = streamBody.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullAnswerContent = '';
  let activeNode = 'router';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep last incomplete chunk in buffer
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr);
          processBackendEvent(event, assistantBubble, (newChunk) => {
            fullAnswerContent += newChunk;
          }, (node) => {
            activeNode = node;
          });
        } catch (parseErr) {
          console.warn('Failed to parse SSE line JSON:', dataStr, parseErr);
        }
      }
    }

    // Process any remainder in buffer
    if (buffer.trim() && buffer.trim().startsWith('data:')) {
      const dataStr = buffer.trim().slice(5).trim();
      try {
        const event = JSON.parse(dataStr);
        processBackendEvent(event, assistantBubble, (newChunk) => {
          fullAnswerContent += newChunk;
        });
      } catch (e) {
        // Ignored
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process a single structured backend event
 */
function processBackendEvent(event, assistantBubble, onAnswerChunk, onNodeUpdate) {
  const type = event.type;
  const contentContainer = assistantBubble.querySelector('.assistant-content-container');
  const loaderContainer = assistantBubble.querySelector('.assistant-loader');
  const nodeTag = assistantBubble.querySelector('.assistant-node-tag');

  switch (type) {
    case 'node_update': {
      const node = event.node;
      const status = event.status;
      if (onNodeUpdate) onNodeUpdate(node);

      // Update assistant bubble metadata
      if (nodeTag) {
        nodeTag.textContent = getNodeDisplayName(node);
      }

      // Update workflow graph nodes
      updateWorkflowNode(node, status);
      break;
    }

    case 'answer': {
      const content = event.content || '';
      const node = event.node;
      if (onAnswerChunk) onAnswerChunk(content);

      // Hide loader
      if (loaderContainer) {
        loaderContainer.classList.add('hidden');
      }

      // Render content safely
      if (contentContainer) {
        contentContainer.classList.remove('hidden');
        contentContainer.innerHTML = renderSafeMarkdown(content);
      }

      // Mark answer node in workflow
      markWorkflowAnswerComplete(node);
      break;
    }

    case 'done': {
      // Mark workflow as done
      finishWorkflow(true);

      // Remove loading animations in assistant bubble
      if (loaderContainer) {
        loaderContainer.classList.add('hidden');
      }
      break;
    }

    case 'error': {
      const errMsg = event.message || 'An error occurred on the backend.';
      displayBubbleError(assistantBubble, errMsg);
      finishWorkflow(false, errMsg);
      break;
    }

    default:
      console.log('Unhandled backend event type:', event);
  }
}

/**
 * Handle network or stream-level exceptions
 */
function handleStreamError(error, assistantBubble) {
  let message = error.message || 'Unknown network error';
  const isFailedFetch = error.name === 'TypeError' || message.includes('Failed to fetch') || message.includes('NetworkError');

  if (isFailedFetch) {
    message = `Unable to connect to FastAPI backend at ${CONFIG.API_BASE_URL}.\n\n` +
      `Troubleshooting steps:\n` +
      `1. Make sure your FastAPI backend is running: \`uvicorn app.main:app --reload\`\n` +
      `2. Verify CORS is enabled on the FastAPI server for this origin.\n` +
      `3. Verify that ${CONFIG.API_BASE_URL}/health is reachable.`;
  }

  displayBubbleError(assistantBubble, message);
  finishWorkflow(false, message);
}

/**
 * Safely display error inside assistant bubble
 */
function displayBubbleError(assistantBubble, message) {
  const loaderContainer = assistantBubble.querySelector('.assistant-loader');
  if (loaderContainer) {
    loaderContainer.classList.add('hidden');
  }

  const contentContainer = assistantBubble.querySelector('.assistant-content-container');
  if (contentContainer) {
    contentContainer.classList.remove('hidden');
    contentContainer.innerHTML = `
      <div class="rounded-lg bg-error-container/30 border border-error/40 p-3 text-on-surface space-y-1">
        <div class="flex items-center gap-2 text-error font-semibold text-label-md">
          <span class="material-symbols-outlined text-[18px]">error</span>
          <span>Connection / Pipeline Error</span>
        </div>
        <div class="text-body-md text-on-surface whitespace-pre-wrap">${escapeHtml(message)}</div>
      </div>
    `;
  }
}

/**
 * Enable or disable UI during processing
 */
function setProcessingState(processing) {
  isProcessing = processing;
  const sendBtn = document.getElementById('sendButton');
  const composer = document.getElementById('mainComposerInput');

  if (sendBtn) {
    sendBtn.disabled = processing;
    sendBtn.innerHTML = processing
      ? `<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span>`
      : `<span class="material-symbols-outlined text-[20px]">arrow_upward</span>`;
  }

  if (composer) {
    if (processing) {
      composer.setAttribute('disabled', 'true');
    } else {
      composer.removeAttribute('disabled');
      composer.focus();
    }
  }
}

/**
 * Append user message bubble to chat stream
 */
function appendUserMessage(text) {
  const stream = document.getElementById('chatStream');
  if (!stream) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubble = document.createElement('div');
  bubble.className = 'flex items-start justify-end gap-space-sm w-full pl-6 md:pl-20';
  bubble.innerHTML = `
    <div class="flex flex-col items-end max-w-xl">
      <div class="rounded-2xl rounded-tr-sm bg-surface-container-high px-space-md py-space-sm shadow-md">
        <p class="text-body-md font-body-md text-on-surface whitespace-pre-wrap">${escapeHtml(text)}</p>
      </div>
      <div class="flex items-center gap-space-xs mt-1.5 px-1 text-label-sm font-label-sm text-outline">
        <span>${escapeHtml(timeStr)}</span>
        <span>•</span>
        <span class="text-secondary">Direct Dispatch</span>
      </div>
    </div>
    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary">
      <span class="material-symbols-outlined text-[18px]">person</span>
    </div>
  `;

  const streamingPlaceholder = document.getElementById('streamingMessage');
  if (streamingPlaceholder) {
    stream.insertBefore(bubble, streamingPlaceholder);
  } else {
    stream.appendChild(bubble);
  }

  bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Create assistant message container for streaming
 */
function createAssistantMessageBubble() {
  const stream = document.getElementById('chatStream');
  const bubble = document.createElement('div');
  bubble.className = 'flex items-start gap-space-sm w-full pr-2 md:pr-16';

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bubble.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center flex-shrink-0 text-on-primary shadow-lg shadow-primary/20">
      <span class="material-symbols-outlined text-[18px]">chat_spark</span>
    </div>
    <div class="flex flex-col flex-1 min-w-0">
      <div class="relative rounded-2xl rounded-tl-sm bg-surface-container p-space-md shadow-xl">
        <!-- Assistant Response Header -->
        <div class="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs mb-space-sm bg-surface-container-low px-space-sm py-1 rounded-lg">
          <div class="flex items-center gap-space-xs">
            <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span class="text-label-sm font-label-sm text-on-surface assistant-node-tag">Routing Intent...</span>
            <span class="text-outline text-label-sm">•</span>
            <span class="text-label-sm font-label-sm text-secondary font-mono assistant-session-label">${escapeHtml(currentSessionId.substring(0, 16))}</span>
          </div>
          <div class="flex items-center gap-space-xs">
            <span class="px-2 py-0.5 rounded bg-surface-container-highest text-label-sm font-label-sm text-secondary font-mono">Live Stream</span>
          </div>
        </div>

        <!-- Assistant Loader State -->
        <div class="assistant-loader flex items-center gap-2 text-label-md font-label-md text-on-surface-variant py-2">
          <span class="inline-block w-2 h-2 rounded-full bg-secondary animate-ping"></span>
          <span>Traversing agent graph and synthesizing response...</span>
        </div>

        <!-- Assistant Content Body -->
        <div class="assistant-content-container markdown-content hidden text-body-md font-body-md text-on-surface leading-relaxed"></div>
      </div>
      <div class="flex items-center gap-space-sm mt-1.5 px-2 text-label-sm font-label-sm text-outline">
        <span>${escapeHtml(timeStr)}</span>
        <span>•</span>
        <span>CampusMind SSE Response</span>
      </div>
    </div>
  `;

  const streamingPlaceholder = document.getElementById('streamingMessage');
  if (streamingPlaceholder) {
    stream.insertBefore(bubble, streamingPlaceholder);
  } else {
    stream.appendChild(bubble);
  }

  bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return bubble;
}

/**
 * Human-readable node display titles
 */
function getNodeDisplayName(node) {
  switch (node) {
    case 'router': return 'Query Router';
    case 'knowledge': return 'Campus Knowledge RAG';
    case 'llm': return 'General LLM';
    case 'direct': return 'Direct Response';
    default: return node ? node.toUpperCase() : 'Agent Node';
  }
}

/**
 * ==========================================================================
 * LIVE WORKFLOW VISUALIZATION LOGIC
 * ==========================================================================
 */

/**
 * Reset workflow panel to initial or running state
 */
function resetWorkflowPanel(state) {
  const latencyBadge = document.getElementById('workflowLatencyBadge');
  const nodeRouter = document.getElementById('wfNodeRouter');
  const nodeRoute = document.getElementById('wfNodeRoute');
  const nodeAnswer = document.getElementById('wfNodeAnswer');
  const nodeStatus = document.getElementById('wfNodeStatus');

  if (state === 'idle') {
    if (latencyBadge) latencyBadge.textContent = 'Idle (Standby)';

    if (nodeRouter) {
      setNodeUI(nodeRouter, {
        title: 'Node 01: Query Router',
        desc: 'Waiting for user prompt',
        statusText: 'Waiting',
        state: 'waiting',
        icon: 'alt_route'
      });
    }

    if (nodeRoute) {
      setNodeUI(nodeRoute, {
        title: 'Node 02: Route Execution',
        desc: 'Campus Knowledge, LLM, or Direct',
        statusText: 'Waiting',
        state: 'waiting',
        icon: 'sync_alt'
      });
    }

    if (nodeAnswer) {
      setNodeUI(nodeAnswer, {
        title: 'Node 03: Answer Synthesizer',
        desc: 'Waiting for selected route output',
        statusText: 'Waiting',
        state: 'waiting',
        icon: 'chat_spark'
      });
    }

    if (nodeStatus) {
      setNodeUI(nodeStatus, {
        title: 'Node 04: Pipeline Guardrail',
        desc: 'System integrity & validation',
        statusText: 'Standby',
        state: 'waiting',
        icon: 'verified_user'
      });
    }
  } else if (state === 'running') {
    if (latencyBadge) latencyBadge.textContent = 'Processing...';

    if (nodeRouter) {
      setNodeUI(nodeRouter, {
        title: 'Node 01: Query Router',
        desc: 'Evaluating query route...',
        statusText: 'Running',
        state: 'running',
        icon: 'alt_route'
      });
    }

    if (nodeRoute) {
      setNodeUI(nodeRoute, {
        title: 'Node 02: Route Execution',
        desc: 'Awaiting router decision',
        statusText: 'Queued',
        state: 'waiting',
        icon: 'sync_alt'
      });
    }

    if (nodeAnswer) {
      setNodeUI(nodeAnswer, {
        title: 'Node 03: Answer Synthesizer',
        desc: 'Waiting for stream response',
        statusText: 'Queued',
        state: 'waiting',
        icon: 'chat_spark'
      });
    }

    if (nodeStatus) {
      setNodeUI(nodeStatus, {
        title: 'Node 04: Pipeline Guardrail',
        desc: 'Stream in progress',
        statusText: 'Active',
        state: 'running',
        icon: 'verified_user'
      });
    }
  }
}

/**
 * Update workflow node when node_update event arrives
 */
function updateWorkflowNode(node, status) {
  const nodeRouter = document.getElementById('wfNodeRouter');
  const nodeRoute = document.getElementById('wfNodeRoute');

  if (node === 'router') {
    if (nodeRouter) {
      setNodeUI(nodeRouter, {
        title: 'Node 01: Query Router',
        desc: 'Route classification complete',
        statusText: 'Completed',
        state: 'completed',
        icon: 'check_circle'
      });
    }
    // Highlight route node as now executing
    if (nodeRoute) {
      setNodeUI(nodeRoute, {
        title: 'Node 02: Route Execution',
        desc: 'Executing destination route...',
        statusText: 'Running',
        state: 'running',
        icon: 'sync_alt'
      });
    }
  } else if (node === 'knowledge' || node === 'llm' || node === 'direct') {
    if (nodeRoute) {
      const displayName = getNodeDisplayName(node);
      const descText = node === 'knowledge'
        ? 'Campus Knowledge GraphRAG retrieval complete'
        : node === 'llm'
          ? 'General LLM conversational model complete'
          : 'Direct immediate response complete';

      setNodeUI(nodeRoute, {
        title: `Node 02: ${displayName}`,
        desc: descText,
        statusText: 'Completed',
        state: 'completed',
        icon: 'check_circle'
      });
    }

    // Set answer node to streaming
    const nodeAnswer = document.getElementById('wfNodeAnswer');
    if (nodeAnswer) {
      setNodeUI(nodeAnswer, {
        title: 'Node 03: Answer Synthesizer',
        desc: 'Streaming answer payload to UI',
        statusText: 'Streaming',
        state: 'running',
        icon: 'chat_spark'
      });
    }
  }
}

/**
 * Mark answer node complete
 */
function markWorkflowAnswerComplete(node) {
  const nodeAnswer = document.getElementById('wfNodeAnswer');
  if (nodeAnswer) {
    setNodeUI(nodeAnswer, {
      title: 'Node 03: Answer Synthesizer',
      desc: `Answer delivered via ${getNodeDisplayName(node)}`,
      statusText: 'Completed',
      state: 'completed',
      icon: 'check_circle'
    });
  }
}

/**
 * Mark workflow as finished (done or error)
 */
function finishWorkflow(success, errorMsg) {
  const nodeStatus = document.getElementById('wfNodeStatus');
  const latencyBadge = document.getElementById('workflowLatencyBadge');

  if (success) {
    if (nodeStatus) {
      setNodeUI(nodeStatus, {
        title: 'Node 04: Pipeline Guardrail',
        desc: 'Response delivered successfully (200 OK)',
        statusText: 'Passed',
        state: 'completed',
        icon: 'verified'
      });
    }
  } else {
    if (nodeStatus) {
      setNodeUI(nodeStatus, {
        title: 'Node 04: Pipeline Guardrail',
        desc: errorMsg || 'Stream execution failed',
        statusText: 'Failed',
        state: 'error',
        icon: 'cancel'
      });
    }
  }
}

/**
 * Update latency badge
 */
function updateLatencyBadge(latencyMs) {
  const latencyBadge = document.getElementById('workflowLatencyBadge');
  if (latencyBadge) {
    latencyBadge.textContent = `${latencyMs}ms Latency`;
  }
}

/**
 * Apply visual styles to a workflow node element based on state
 */
function setNodeUI(nodeEl, { title, desc, statusText, state, icon }) {
  if (!nodeEl) return;

  const titleEl = nodeEl.querySelector('.wf-title');
  const descEl = nodeEl.querySelector('.wf-desc');
  const badgeEl = nodeEl.querySelector('.wf-badge');
  const iconEl = nodeEl.querySelector('.wf-icon');

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (badgeEl) badgeEl.textContent = statusText;
  if (iconEl) iconEl.textContent = icon;

  // Clear previous state classes
  nodeEl.classList.remove('border-secondary', 'border-primary', 'border-error', 'opacity-60', 'bg-surface-container-high', 'bg-surface-container-low');

  if (state === 'waiting') {
    nodeEl.classList.add('bg-surface-container-low', 'opacity-60');
    if (badgeEl) badgeEl.className = 'wf-badge text-label-sm font-label-sm text-outline font-mono';
    if (iconEl) iconEl.className = 'material-symbols-outlined text-[16px] text-outline wf-icon';
  } else if (state === 'running') {
    nodeEl.classList.add('bg-surface-container-high', 'border', 'border-secondary/40');
    if (badgeEl) badgeEl.className = 'wf-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/20 text-secondary text-label-sm font-label-sm font-mono animate-pulse';
    if (iconEl) iconEl.className = 'material-symbols-outlined text-[16px] text-secondary animate-spin wf-icon';
  } else if (state === 'completed') {
    nodeEl.classList.add('bg-surface-container-low', 'border', 'border-primary/20');
    if (badgeEl) badgeEl.className = 'wf-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high text-label-sm font-label-sm text-secondary font-mono';
    if (iconEl) iconEl.className = 'material-symbols-outlined text-[16px] text-secondary wf-icon';
  } else if (state === 'error') {
    nodeEl.classList.add('bg-surface-container-low', 'border', 'border-error/40');
    if (badgeEl) badgeEl.className = 'wf-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error-container text-error text-label-sm font-label-sm font-mono';
    if (iconEl) iconEl.className = 'material-symbols-outlined text-[16px] text-error wf-icon';
  }
}

/**
 * ==========================================================================
 * EVIDENCE PANEL (HONEST PLACEHOLDER & FUTURE EXTENSIBILITY)
 * ==========================================================================
 */

/**
 * Reset evidence panel to honest placeholder
 */
function resetEvidencePanel(evidenceList) {
  const container = document.getElementById('evidenceAccordion');
  const countBadge = document.getElementById('evidenceCountBadge');

  if (!container) return;

  if (evidenceList && Array.isArray(evidenceList) && evidenceList.length > 0) {
    if (countBadge) countBadge.textContent = `${evidenceList.length} Items`;
    container.innerHTML = evidenceList.map((item, idx) => `
      <div class="rounded-xl bg-surface-container-low overflow-hidden transition-all">
        <button class="w-full flex items-center justify-between p-3 text-left hover:bg-surface-container-high transition-colors" onclick="toggleAccordion('evidenceItem_${idx}')" type="button">
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
            <span class="text-label-md font-label-md font-semibold text-on-surface truncate">${escapeHtml(item.title || 'Source Evidence')}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${item.score ? `<span class="text-label-sm font-label-sm text-secondary font-mono">Score ${escapeHtml(String(item.score))}</span>` : ''}
            <span class="material-symbols-outlined text-[16px] text-outline transition-transform" id="accIcon_evidenceItem_${idx}">expand_more</span>
          </div>
        </button>
        <div class="hidden p-3 pt-0 text-label-sm font-label-sm space-y-1.5 bg-surface-container-lowest/50" id="evidenceItem_${idx}">
          ${item.relationship ? `<div class="text-outline">Relationship: <code class="text-secondary bg-surface-container px-1 py-0.5 rounded">${escapeHtml(item.relationship)}</code></div>` : ''}
          ${item.uri ? `<div class="text-outline truncate">URI: <span class="text-on-surface-variant">${escapeHtml(item.uri)}</span></div>` : ''}
          ${item.snippet ? `<p class="text-on-surface-variant mt-1">${escapeHtml(item.snippet)}</p>` : ''}
        </div>
      </div>
    `).join('');
  } else {
    if (countBadge) countBadge.textContent = 'Not Provided';
    container.innerHTML = `
      <div class="rounded-xl bg-surface-container-low p-4 text-center space-y-2 border border-outline-variant/30">
        <div class="w-8 h-8 rounded-full bg-surface-container-high text-outline mx-auto flex items-center justify-center">
          <span class="material-symbols-outlined text-[18px]">info</span>
        </div>
        <div class="text-label-md font-semibold text-on-surface">Evidence details not available in this response</div>
        <p class="text-label-sm text-outline max-w-xs mx-auto leading-relaxed">
          The current backend stream returns node transitions and answers. Retrieved documents and Neo4j graph relationships will appear here when emitted by the API.
        </p>
      </div>
    `;
  }
}

/**
 * Toggle accordion view
 */
function toggleAccordion(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById('accIcon_' + id);
  if (!el) return;

  if (el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    el.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

/**
 * ==========================================================================
 * SECURITY & SAFE RENDERING HELPERS
 * ==========================================================================
 */

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
 * Safely parse and render basic Markdown without dangerous raw HTML
 */
function renderSafeMarkdown(markdown) {
  if (!markdown) return '';

  // 1. First escape all raw HTML characters to prevent XSS
  let safe = escapeHtml(markdown);

  // 2. Parse fenced code blocks: ```lang ... ```
  safe = safe.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (_, lang, code) {
    return `<pre class="bg-surface-container-lowest p-3 rounded-lg overflow-x-auto my-2 border border-outline-variant/30"><code class="language-${lang} text-sm font-mono text-secondary">${code}</code></pre>`;
  });

  // 3. Inline code: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="bg-surface-container-highest px-1.5 py-0.5 rounded font-mono text-sm text-secondary">$1</code>');

  // 4. Bold text: **bold** or __bold__
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-on-surface font-semibold">$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong class="text-on-surface font-semibold">$1</strong>');

  // 5. Italic text: *italic* or _italic_
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  safe = safe.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 6. Bullet lists: lines starting with * or -
  safe = safe.replace(/^[\*\-]\s+(.+)$/gm, '<li class="ml-4 list-disc text-on-surface-variant">$1</li>');

  // 7. Numbered lists: lines starting with 1. 2. etc
  safe = safe.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-on-surface-variant">$1</li>');

  // 8. Paragraphs and newlines
  const paragraphs = safe.split(/\n\n+/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<pre') || p.startsWith('<li')) {
      return p;
    }
    return `<p class="mb-2 leading-relaxed">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
}

/**
 * Copy snippet to clipboard
 */
function copySnippet(button) {
  const container = button.closest('.rounded-2xl');
  let text = '';
  if (container) {
    const content = container.querySelector('.assistant-content-container');
    if (content) text = content.innerText;
  }

  if (!text) {
    text = "CampusMind Autonomous Academic Engine response.";
  }

  navigator.clipboard.writeText(text);
  const original = button.innerHTML;
  button.innerHTML = '<span class="material-symbols-outlined text-[15px] text-secondary">check</span><span>Copied!</span>';
  setTimeout(() => {
    button.innerHTML = original;
  }, 2000);
}

/**
 * Handle file upload indicator
 */
function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    const composer = document.getElementById('mainComposerInput');
    if (composer) {
      composer.value = `[Uploaded: ${input.files[0].name}] ` + composer.value;
      composer.focus();
    }
  }
}

/**
 * Global Keyboard shortcuts
 */
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const composer = document.getElementById('mainComposerInput');
    if (composer) composer.focus();
  }
});

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
  updateSessionBadge();
  checkBackendHealth();
  resetWorkflowPanel('idle');
  resetEvidencePanel();
});

// Expose public functions to window for HTML event handlers
window.triggerSendMessage = triggerSendMessage;
window.handleComposerKey = handleComposerKey;
window.fillPrompt = fillPrompt;
window.startNewSession = startNewSession;
window.toggleAccordion = toggleAccordion;
window.copySnippet = copySnippet;
window.handleFileUpload = handleFileUpload;
