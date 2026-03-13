/**
 * Content script for perplexity.ai
 * Poll-based tracking with text-stabilization.
 * Perplexity is search-focused — each query gets a response with citations.
 */
(() => {
  const PLATFORM = "perplexity";
  let trackedPairCount = 0;
  let pollTimer = null;
  let lastResponseLengths = {};
  let stableCounts = {};

  function isContextValid() {
    try { return !!chrome.runtime.id; } catch (e) { return false; }
  }

  console.log("[Prompt Power] Perplexity script starting...");

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
    const strategies = [
      // Perplexity query containers
      '[data-testid="user-message"]',
      '.whitespace-pre-line',
      '.break-words.text-base',
      // Thread query text
      'h2.font-display',
      '.prose-query',
      // Fallback
      '[class*="UserMessage"]',
      '[class*="query"]',
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
      // Perplexity answer containers
      '[data-testid="ai-message"]',
      '.prose.dark\\:prose-invert',
      '.prose',
      // Answer blocks
      '[class*="AnswerBlock"]',
      '[class*="Response"]',
      '.markdown-content',
      // Fallback
      '[class*="answer"]',
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

  function isStreaming() {
    return !!(
      document.querySelector('[data-testid="stop-button"]') ||
      document.querySelector('button[aria-label="Stop"]') ||
      document.querySelector('.animate-spin') ||
      document.querySelector('[class*="Streaming"]') ||
      document.querySelector('[class*="loading"]')
    );
  }

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
      for (let i = trackedPairCount; i < pairCount; i++) {
        const responseText = (assistantMsgs[i].innerText || assistantMsgs[i].textContent || "").trim();
        const len = responseText.length;

        if (len === (lastResponseLengths[i] || 0) && !isStreaming()) {
          stableCounts[i] = (stableCounts[i] || 0) + 1;
        } else {
          stableCounts[i] = 0;
        }
        lastResponseLengths[i] = len;

        // Stable for 3 polls (6 seconds)
        if (stableCounts[i] >= 3 && len > 5) {
          const promptText = (userMsgs[i].innerText || userMsgs[i].textContent || "").trim();

          if (promptText) {
            saveInteraction(promptText, responseText, 0);
          }

          trackedPairCount = i + 1;
          delete lastResponseLengths[i];
          delete stableCounts[i];
        }
      }
    }

    // Handle navigation
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
      console.log("[Prompt Power] Perplexity ready — pairs:", trackedPairCount);

      pollTimer = setInterval(poll, 2000);
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
