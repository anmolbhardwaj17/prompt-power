/**
 * Content script for chat.openai.com / chatgpt.com
 * Queue-based prompt tracking with text-stabilization for response detection.
 * Handles continuous messages and image generation.
 */
(() => {
  const PLATFORM = "chatgpt";
  let trackedUserCount = 0;
  let trackedAssistantCount = 0;
  let processingTimer = null;
  let pollTimer = null;

  function isContextValid() {
    try { return !!chrome.runtime.id; } catch (e) { return false; }
  }

  console.log("[Prompt Power] ChatGPT script starting...");

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
      promptPreview: promptText.slice(0, 100),
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

  function countGeneratedImages(responseEl) {
    if (!responseEl) return 0;
    const images = responseEl.querySelectorAll('img');
    let count = 0;
    for (const img of images) {
      const src = img.src || "";
      if (src.includes("oaidalleapi") || src.includes("dalle") || src.includes("openai") || src.includes("blob:") ||
          (img.width > 200 && img.height > 200)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Poll-based: check for new completed interactions every 2 seconds.
   * This naturally handles continuous messages — each new user+assistant pair
   * gets captured as counts increase.
   */
  function poll() {
    if (!isContextValid()) {
      if (pollTimer) clearInterval(pollTimer);
      console.log("[Prompt Power] Extension context invalidated, stopping poll.");
      return;
    }

    const userMsgs = document.querySelectorAll('[data-message-author-role="user"]');
    const assistantMsgs = document.querySelectorAll('[data-message-author-role="assistant"]');

    // Both counts increased and no stop button visible = completed interaction
    if (userMsgs.length > trackedUserCount && assistantMsgs.length > trackedAssistantCount) {
      const isStreaming = !!document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop generating"], .result-streaming');

      if (!isStreaming) {
        // Capture all new pairs
        while (trackedUserCount < userMsgs.length && trackedAssistantCount < assistantMsgs.length) {
          const promptEl = userMsgs[trackedUserCount];
          const responseEl = assistantMsgs[trackedAssistantCount];
          const promptText = (promptEl.innerText || promptEl.textContent || "").trim();
          const responseText = (responseEl.innerText || responseEl.textContent || "").trim();
          const imageCount = countGeneratedImages(responseEl);

          if (promptText && (responseText || imageCount > 0)) {
            saveInteraction(promptText, responseText, imageCount);
          }

          trackedUserCount++;
          trackedAssistantCount++;
        }
      }
    }

    // Handle navigation (counts dropped)
    if (userMsgs.length < trackedUserCount) {
      trackedUserCount = userMsgs.length;
      trackedAssistantCount = assistantMsgs.length;
    }
  }

  function init() {
    setTimeout(() => {
      trackedUserCount = document.querySelectorAll('[data-message-author-role="user"]').length;
      trackedAssistantCount = document.querySelectorAll('[data-message-author-role="assistant"]').length;
      console.log("[Prompt Power] ChatGPT ready — user:", trackedUserCount, "assistant:", trackedAssistantCount);

      pollTimer = setInterval(poll, 2000);
    }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
