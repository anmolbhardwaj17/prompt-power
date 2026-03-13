/**
 * Background service worker for Prompt Power extension.
 * Handles storage management and badge updates.
 */

// Update badge with prompt count
function updateBadge() {
  chrome.storage.local.get(["totals"], (data) => {
    const totals = data.totals || { totalPrompts: 0 };
    const count = totals.totalPrompts;
    const text = count > 999 ? `${Math.floor(count / 1000)}k` : count > 0 ? count.toString() : "";
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
  });
}

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.totals) {
    updateBadge();
  }
});

// Initialize badge on install/startup
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
