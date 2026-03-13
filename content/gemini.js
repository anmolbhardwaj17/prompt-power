/**
 * Content script for gemini.google.com
 * Poll-based tracking with multiple selector strategies.
 * Handles continuous messages and image generation.
 * Gemini uses Web Components (custom HTML elements).
 */
(() => {
  const PLATFORM = "gemini";
  let trackedPairCount = 0;
  let pollTimer = null;

  function isContextValid() {
    try { return !!chrome.runtime.id; } catch (e) { return false; }
  }

  console.log("[Prompt Power] Gemini script starting...");

  function saveInteraction(promptText, responseText, imageCount) {
    const inputTokens = PromptPowerTokenizer.estimateTokens(promptText);
    const outputTokens = PromptPowerTokenizer.estimateTokens(responseText);

    let energyWh;
    if (imageCount > 0) {
      energyWh = PromptPowerEnergy.calculateImageEnergy(PLATFORM, imageCount, inputTokens);
    } else {
      energyWh = PromptPowerEnergy.calculateEnergy(PLATFORM, inputTokens, outputTokens);
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      platform: PLATFORM,
      timestamp: Date.now(),
      promptPreview: (promptText || "").slice(0, 100),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      energyWh,
      imageCount,
      type: imageCount > 0 ? "image" : "text"
    };

    chrome.storage.local.get(["history", "totals"], (data) => {
      const history = data.history || [];
      history.unshift(entry);
      if (history.length > 50000) history.length = 50000;

      const totals = data.totals || { totalTokens: 0, totalEnergyWh: 0, totalPrompts: 0, totalImages: 0, byPlatform: {} };
      totals.totalTokens += entry.totalTokens;
      totals.totalEnergyWh += entry.energyWh;
      totals.totalPrompts += 1;
      totals.totalImages = (totals.totalImages || 0) + imageCount;

      if (!totals.byPlatform[PLATFORM]) {
        totals.byPlatform[PLATFORM] = { tokens: 0, energyWh: 0, prompts: 0, images: 0 };
      }
      totals.byPlatform[PLATFORM].tokens += entry.totalTokens;
      totals.byPlatform[PLATFORM].energyWh += entry.energyWh;
      totals.byPlatform[PLATFORM].prompts += 1;
      totals.byPlatform[PLATFORM].images = (totals.byPlatform[PLATFORM].images || 0) + imageCount;

      chrome.storage.local.set({ history, totals });
      console.log(`[Prompt Power] SAVED: ${entry.inputTokens} in / ${entry.outputTokens} out${imageCount > 0 ? ` + ${imageCount} img` : ""}`);
    });
  }

  function getUserMessages() {
    // Try multiple selectors — Gemini updates frequently
    const strategies = [
      'user-query',
      '.query-text',
      '[data-query-text]',
      'message-content[data-message-role="user"]',
      '.conversation-container .user-message',
      // Fallback: look for user turn containers
      '.user-turn',
    ];
    for (const sel of strategies) {
      const msgs = document.querySelectorAll(sel);
      if (msgs.length > 0) {
        console.log("[Prompt Power] User selector hit:", sel, msgs.length);
        return msgs;
      }
    }
    return [];
  }

  function getAssistantMessages() {
    const strategies = [
      'model-response',
      '.model-response-text',
      '.response-content',
      'message-content[data-message-role="model"]',
      '.markdown-main-panel',
      '.model-turn',
    ];
    for (const sel of strategies) {
      const msgs = document.querySelectorAll(sel);
      if (msgs.length > 0) {
        console.log("[Prompt Power] Assistant selector hit:", sel, msgs.length);
        return msgs;
      }
    }
    return [];
  }

  function countGeneratedImages(responseEl) {
    if (!responseEl) return 0;
    const images = responseEl.querySelectorAll('img');
    let count = 0;
    for (const img of images) {
      const src = img.src || "";
      if (src.includes("googleusercontent") || src.includes("imagen") ||
          src.includes("generated") || src.includes("blob:") ||
          (img.width > 200 && img.height > 200)) {
        count++;
      }
    }
    const containers = responseEl.querySelectorAll('[class*="image-card"], [class*="generated-image"]');
    if (containers.length > 0 && count === 0) count = containers.length;
    return count;
  }

  function isStreaming() {
    // Check multiple streaming indicators
    const responses = document.querySelectorAll('model-response');
    for (const r of responses) {
      if (r.querySelector('.loading, .progress, mat-progress-bar, mat-spinner, .thinking-indicator')) {
        return true;
      }
    }
    return !!(
      document.querySelector('.loading-indicator, .streaming-indicator') ||
      document.querySelector('[data-is-streaming="true"]') ||
      document.querySelector('.response-streaming') ||
      document.querySelector('.generating')
    );
  }

  // Track last seen response lengths for text-stabilization
  let pendingPairCount = 0;
  let lastResponseLengths = {};
  let stableCounts = {};

  /**
   * Poll every 2s. Match user-assistant pairs and track new completed ones.
   * Uses text-stabilization: response must be unchanged for 3 polls (6 seconds)
   * AND no streaming indicators active.
   */
  function poll() {
    if (!isContextValid()) {
      if (pollTimer) clearInterval(pollTimer);
      console.log("[Prompt Power] Extension context invalidated, stopping poll.");
      return;
    }

    const userMsgs = getUserMessages();
    const assistantMsgs = getAssistantMessages();

    const pairCount = Math.min(userMsgs.length, assistantMsgs.length);

    if (pairCount > trackedPairCount) {
      // Check each untracked pair for stability
      for (let i = trackedPairCount; i < pairCount; i++) {
        const responseText = (assistantMsgs[i].innerText || assistantMsgs[i].textContent || "").trim();
        const len = responseText.length;

        if (len === (lastResponseLengths[i] || 0) && !isStreaming()) {
          stableCounts[i] = (stableCounts[i] || 0) + 1;
        } else {
          stableCounts[i] = 0;
        }
        lastResponseLengths[i] = len;

        // Stable for 3 polls (6 seconds) — save it
        if (stableCounts[i] >= 3 && len > 5) {
          const promptText = (userMsgs[i].innerText || userMsgs[i].textContent || "").trim();
          const imageCount = countGeneratedImages(assistantMsgs[i]);

          if (promptText) {
            saveInteraction(promptText, responseText, imageCount);
          }

          // Mark this pair as tracked
          trackedPairCount = i + 1;
          delete lastResponseLengths[i];
          delete stableCounts[i];
        }
      }
    }

    // Handle navigation (counts dropped)
    if (pairCount < trackedPairCount) {
      trackedPairCount = pairCount;
      lastResponseLengths = {};
      stableCounts = {};
    }
  }

  function init() {
    setTimeout(() => {
      const userMsgs = getUserMessages();
      const assistantMsgs = getAssistantMessages();
      trackedPairCount = Math.min(userMsgs.length, assistantMsgs.length);
      console.log("[Prompt Power] Gemini ready — pairs:", trackedPairCount);

      // Poll every 2 seconds
      pollTimer = setInterval(poll, 2000);
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
