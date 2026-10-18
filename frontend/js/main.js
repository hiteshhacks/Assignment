/**
 * CampusMind Frontend - Interactive Logic & Workflow Simulator
 */

function toggleAccordion(id) {
  const el = document.getElementById(id);
  const icon = document.getElementById('accIcon' + id.replace('acc', ''));
  if (!el) return;

  if (el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    el.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

function fillPrompt(btn) {
  const txt = btn.innerText.trim();
  const composer = document.getElementById('mainComposerInput');
  if (composer) {
    composer.value = txt;
    composer.focus();
  }
}

function handleComposerKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    triggerSendMessage();
  }
}

function triggerSendMessage() {
  const composer = document.getElementById('mainComposerInput');
  if (!composer || !composer.value.trim()) return;

  const text = composer.value.trim();
  composer.value = '';

  // Append user message dynamically
  const stream = document.getElementById('chatStream');
  const streamingPlaceholder = document.getElementById('streamingMessage');

  const userBubble = document.createElement('div');
  userBubble.className = 'flex items-start justify-end gap-space-sm w-full pl-6 md:pl-20';
  userBubble.innerHTML = `
    <div class="flex flex-col items-end max-w-xl">
      <div class="rounded-2xl rounded-tr-sm bg-surface-container-high px-space-md py-space-sm shadow-md">
        <p class="text-body-md font-body-md text-on-surface">${escapeHtml(text)}</p>
      </div>
      <div class="flex items-center gap-space-xs mt-1.5 px-1 text-label-sm font-label-sm text-outline">
        <span>Just now</span>
        <span>•</span>
        <span class="text-secondary">Direct Dispatch</span>
      </div>
    </div>
    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary">
      <span class="material-symbols-outlined text-[18px]">person</span>
    </div>
  `;

  if (stream && streamingPlaceholder) {
    stream.insertBefore(userBubble, streamingPlaceholder);

    // Show simulated streaming response
    streamingPlaceholder.classList.remove('hidden');
    streamingPlaceholder.classList.add('flex');
    streamingPlaceholder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Animate workflow node 4 & 5 to demonstrate state transitions
    simulateWorkflowProgress();
  }
}

function simulateWorkflowProgress() {
  const node4 = document.getElementById('wfNode4');
  const node5 = document.getElementById('wfNode5');

  setTimeout(function () {
    if (node4) {
      node4.className = 'relative rounded-xl bg-surface-container-low p-space-sm transition-all duration-300';
      node4.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-secondary/20 flex items-center justify-center text-secondary">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
            </span>
            <span class="font-headline-md text-label-md font-semibold text-on-surface">Node 04: Groq Llama 3 LLM</span>
          </div>
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high text-label-sm font-label-sm text-secondary font-mono">
            68 Tokens Emitted
          </span>
        </div>
        <p class="text-label-sm font-label-sm text-on-surface-variant pl-8">Inference finished (840 tok/s)</p>
      `;
    }

    if (node5) {
      node5.classList.remove('opacity-60');
      node5.className = 'relative rounded-xl bg-surface-container-high p-space-sm shadow-md transition-all duration-300';
      node5.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-secondary/20 flex items-center justify-center text-secondary">
              <span class="material-symbols-outlined text-[16px]">verified</span>
            </span>
            <span class="font-headline-md text-label-md font-semibold text-secondary">Node 05: Citation Verified</span>
          </div>
          <span class="text-label-sm font-label-sm text-secondary font-mono">100% Passed</span>
        </div>
        <p class="text-label-sm font-label-sm text-on-surface pl-8">FERPA &amp; Registrar integrity validated</p>
      `;
    }
  }, 1800);
}

function copySnippet(button) {
  navigator.clipboard.writeText("Dr. Evelyn Chen (Biomedical Cybernetics) - NSF-EIA #84920 ($1.45M) & NIH-BIO-AI #2024 ($880K). Active openings: 2 Capstone, 1 GRA.");
  const original = button.innerHTML;
  button.innerHTML = '<span class="material-symbols-outlined text-[15px] text-secondary">check</span><span>Copied!</span>';
  setTimeout(function () {
    button.innerHTML = original;
  }, 2000);
}

function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    const composer = document.getElementById('mainComposerInput');
    if (composer) {
      composer.value = "Analyzing syllabus file: " + input.files[0].name + " — " + composer.value;
    }
  }
}

function escapeHtml(string) {
  return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Global hotkeys
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const composer = document.getElementById('mainComposerInput');
    if (composer) {
      composer.focus();
    }
  }
});

// Expose functions globally for inline HTML handlers
window.toggleAccordion = toggleAccordion;
window.fillPrompt = fillPrompt;
window.handleComposerKey = handleComposerKey;
window.triggerSendMessage = triggerSendMessage;
window.simulateWorkflowProgress = simulateWorkflowProgress;
window.copySnippet = copySnippet;
window.handleFileUpload = handleFileUpload;
window.escapeHtml = escapeHtml;
