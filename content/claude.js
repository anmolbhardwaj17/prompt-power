/**
 * Content script for claude.ai
 * Queue-based: captures prompts on submit, waits for response text to stabilize.
 * Handles continuous/rapid messages.
 */
(() => {
  const PLATFORM = "claude";
  const promptQueue = [];
  let isProcessing = false;
  let lastSavedId = "";

  function isContextValid() {
    try { return !!chrome.runtime.id; } catch (e) { return false; }
  }

  console.log("[Prompt Power] Claude script starting...");

  function saveInteraction(promptText, responseText) {
    const id = promptText.slice(0, 50) + responseText.length;
    if (id === lastSavedId) return;
    lastSavedId = id;

    const inputTokens = PromptPowerTokenizer.estimateTokens(promptText);
    const outputTokens = PromptPowerTokenizer.estimateTokens(responseText);
    const energyWh = PromptPowerEnergy.calculateEnergy(PLATFORM, inputTokens, outputTokens);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      platform: PLATFORM,
      timestamp: Date.now(),
      promptPreview: promptText.slice(0, 100),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      energyWh
    };

    chrome.storage.local.get(["history", "totals"], (data) => {
      const history = data.history || [];
      history.unshift(entry);
      if (history.length > 50000) history.length = 50000;

      const totals = data.totals || { totalTokens: 0, totalEnergyWh: 0, totalPrompts: 0, byPlatform: {} };
      totals.totalTokens += entry.totalTokens;
      totals.totalEnergyWh += entry.energyWh;
      totals.totalPrompts += 1;

      if (!totals.byPlatform[PLATFORM]) {
        totals.byPlatform[PLATFORM] = { tokens: 0, energyWh: 0, prompts: 0 };
      }
      totals.byPlatform[PLATFORM].tokens += entry.totalTokens;
      totals.byPlatform[PLATFORM].energyWh += entry.energyWh;
      totals.byPlatform[PLATFORM].prompts += 1;

      chrome.storage.local.set({ history, totals });
      console.log("[Prompt Power] SAVED:", entry.inputTokens, "in /", entry.outputTokens, "out");
    });
  }

  function getLastResponseText() {
    const userMsgs = document.querySelectorAll('[data-testid="user-message"]');
    if (userMsgs.length === 0) return "";

    const lastUserMsg = userMsgs[userMsgs.length - 1];

    // Walk DOM order: collect all .font-claude-response-body AFTER the last user message
    const allElements = document.querySelectorAll('[data-testid="user-message"], .font-claude-response-body');
    let foundLastUser = false;
    const responseTexts = [];

    for (const el of allElements) {
      if (el === lastUserMsg) {
        foundLastUser = true;
        responseTexts.length = 0;
      } else if (foundLastUser && el.matches('.font-claude-response-body')) {
        responseTexts.push((el.innerText || el.textContent || "").trim());
      }
    }

    if (responseTexts.length > 0) return responseTexts.join("\n");

    // Fallback: last render-count turn that's not a user turn
    const turns = document.querySelectorAll('div[data-test-render-count]');
    if (turns.length > 0) {
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn.querySelector('[data-testid="user-message"]')) {
        return (lastTurn.innerText || lastTurn.textContent || "").trim();
      }
    }

    return "";
  }

  function processQueue() {
    if (isProcessing || promptQueue.length === 0) return;
    isProcessing = true;

    const promptText = promptQueue.shift();
    console.log("[Prompt Power] Processing:", promptText.slice(0, 60));

    let lastLength = 0;
    let stableCount = 0;

    function isClaudeStreaming() {
      return !!(
        document.querySelector('button[aria-label="Stop Response"]') ||
        document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('.font-claude-response-body .cursor-blink, .animate-pulse')
      );
    }

    const check = setInterval(() => {
      if (!isContextValid()) { clearInterval(check); return; }
      const text = getLastResponseText();
      const len = text.length;

      if (len > 10) {
        // Only count as stable if text hasn't changed AND not actively streaming
        if (len === lastLength && !isClaudeStreaming()) {
          stableCount++;
        } else {
          stableCount = 0;
        }

        // Stable for 6 seconds with content and no streaming indicator
        if (stableCount >= 6) {
          clearInterval(check);
          console.log("[Prompt Power] Response complete, length:", len);
          saveInteraction(promptText, text);
          isProcessing = false;
          // Process next in queue
          setTimeout(processQueue, 500);
        }
      }

      lastLength = len;
    }, 1000);

    setTimeout(() => {
      clearInterval(check);
      const text = getLastResponseText();
      if (text.length > 10) saveInteraction(promptText, text);
      isProcessing = false;
      setTimeout(processQueue, 500);
    }, 300000);
  }

  function enqueuePrompt(text) {
    if (!text || text.length === 0) return;
    // Avoid duplicate consecutive entries
    if (promptQueue.length > 0 && promptQueue[promptQueue.length - 1] === text) return;
    console.log("[Prompt Power] Queued prompt:", text.slice(0, 60));
    promptQueue.push(text);
    processQueue();
  }

  function getInputText() {
    const input = document.querySelector('[data-testid="chat-input"]') ||
                  document.querySelector('div[contenteditable="true"].ProseMirror');
    if (!input) return "";
    return (input.innerText || input.textContent || "").trim();
  }

  function init() {
    setTimeout(() => {
      // Enter key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          const text = getInputText();
          if (text) setTimeout(() => enqueuePrompt(text), 200);
        }
      }, true);

      // Send button click
      document.addEventListener("click", (e) => {
        if (e.target.closest('button[aria-label*="Send"], button[type="submit"]')) {
          const text = getInputText();
          if (text) setTimeout(() => enqueuePrompt(text), 200);
        }
      }, true);

      console.log("[Prompt Power] Claude tracker ready");
    }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
