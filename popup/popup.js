/**
 * Popup dashboard for Prompt Power extension.
 * Supports dark/light theme toggle with rounded UI.
 */

let heroComparisons = [];
let heroIndex = 0;
let heroInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadData();
  setupClearButton();
  setupThemeToggle();
});

/* ─── Theme ─── */

function loadTheme() {
  chrome.storage.local.get(["theme"], (data) => {
    const theme = data.theme || "light";
    applyTheme(theme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const sunIcon = document.getElementById("themeIconDark");
  const moonIcon = document.getElementById("themeIconLight");
  if (theme === "light") {
    sunIcon.style.display = "none";
    moonIcon.style.display = "block";
  } else {
    sunIcon.style.display = "block";
    moonIcon.style.display = "none";
  }
}

function setupThemeToggle() {
  document.getElementById("themeBtn").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    chrome.storage.local.set({ theme: next });
  });
}

/* ─── Data ─── */

function loadData() {
  chrome.storage.local.get(["history", "totals"], (data) => {
    const history = data.history || [];
    const totals = data.totals || {
      totalTokens: 0,
      totalEnergyWh: 0,
      totalPrompts: 0,
      totalImages: 0,
      byPlatform: {}
    };

    renderStats(totals);
    renderHero(totals);
    renderPlatforms(totals);
    renderComparisons(totals);
    renderHistory(history);
  });
}

function renderStats(totals) {
  document.getElementById("totalPrompts").textContent = formatNumber(totals.totalPrompts);
  document.getElementById("totalTokens").textContent = formatNumber(totals.totalTokens);
  document.getElementById("totalWater").textContent = formatWater(totals.totalEnergyWh);
  document.getElementById("totalEnergy").textContent = formatEnergy(totals.totalEnergyWh);
}

function renderHero(totals) {
  const heroIcon = document.getElementById("heroIcon");
  const heroText = document.getElementById("heroText");
  const heroEnergy = document.getElementById("heroEnergy");

  if (totals.totalPrompts === 0) {
    heroIcon.innerHTML = PromptPowerComparisons.ICONS.zap;
    heroText.textContent = "Start chatting with AI to track energy";
    heroEnergy.textContent = "";
    return;
  }

  heroComparisons = PromptPowerComparisons.getMultipleComparisons(totals.totalEnergyWh, 6);
  if (heroComparisons.length === 0) {
    heroComparisons = [PromptPowerComparisons.getBestComparison(totals.totalEnergyWh)];
  }

  heroEnergy.textContent = `${formatEnergy(totals.totalEnergyWh)} total across ${totals.totalPrompts} prompts`;

  heroIndex = 0;
  showHeroComparison(heroComparisons[0]);

  if (heroInterval) clearInterval(heroInterval);
  if (heroComparisons.length > 1) {
    heroInterval = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroComparisons.length;
      rotateHero(heroComparisons[heroIndex]);
    }, 3000);
  }
}

function showHeroComparison(comp) {
  document.getElementById("heroIcon").innerHTML = comp.icon;
  document.getElementById("heroText").innerHTML = formatComparisonBold(comp.text);
}

function rotateHero(comp) {
  const container = document.getElementById("heroComparison");
  container.classList.add("fade-out");
  setTimeout(() => {
    showHeroComparison(comp);
    container.classList.remove("fade-out");
    container.classList.add("fade-in");
    setTimeout(() => container.classList.remove("fade-in"), 300);
  }, 300);
}

function formatComparisonBold(text) {
  // Match time with two parts (e.g. "2 min 42 sec") or single value + unit
  const match = text.match(/^([\d,.]+k?\s*(?:milli-)?(?:sec|min|hr|days|months|searches|miles|loads|liters|uWh|mWh|Wh|kWh)(?:\s+\d+\s*(?:sec|min|hr|days))?)\s*(.*)/);
  if (match) {
    const value = match[1];
    const label = match[2];
    return `<strong>${value}</strong>${label ? `<br><span class="comparison-label">${label}</span>` : ""}`;
  }
  return text;
}

function renderPlatforms(totals) {
  const container = document.getElementById("platformBars");
  const section = document.getElementById("platformsSection");
  const platforms = totals.byPlatform || {};

  if (Object.keys(platforms).length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const maxEnergy = Math.max(...Object.values(platforms).map(p => p.energyWh), 0.001);
  container.innerHTML = "";

  const sorted = Object.entries(platforms).sort((a, b) => b[1].energyWh - a[1].energyWh);
  for (const [key, data] of sorted) {
    const pct = (data.energyWh / maxEnergy) * 100;
    const bar = document.createElement("div");
    bar.className = "platform-bar";
    bar.innerHTML = `
      <span class="platform-name">${getPlatformLogo(key)}</span>
      <div class="platform-bar-track">
        <div class="platform-bar-fill ${key}" style="width: ${pct}%"></div>
      </div>
      <span class="platform-value">${formatEnergy(data.energyWh)}</span>
    `;
    container.appendChild(bar);
  }
}

function renderComparisons(totals) {
  const container = document.getElementById("comparisonList");
  const section = document.getElementById("comparisonsSection");

  if (totals.totalEnergyWh <= 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const comparisons = PromptPowerComparisons.getMultipleComparisons(totals.totalEnergyWh, 4);

  container.innerHTML = "";
  for (const comp of comparisons) {
    const item = document.createElement("div");
    item.className = "comparison-item";
    item.innerHTML = `
      <div class="comparison-icon">${comp.icon}</div>
      <div class="comparison-text">${formatComparisonBold(comp.text)}</div>
    `;
    container.appendChild(item);
  }

}

function renderHistory(history) {
  const container = document.getElementById("historyList");

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state">No prompts tracked yet.<br>Visit Claude, ChatGPT, or Gemini to start.</div>';
    return;
  }

  container.innerHTML = "";
  const shown = history.slice(0, 50);

  for (const entry of shown) {
    const item = document.createElement("div");
    item.className = "history-item";
    const typeBadge = entry.type === "image"
      ? `<span class="history-type-badge image">${entry.imageCount || 1} img</span>`
      : "";
    item.innerHTML = `
      <span class="history-platform ${entry.platform}">${getPlatformLogo(entry.platform, 14)}</span>
      <div class="history-details">
        <div class="history-preview">${escapeHtml(entry.promptPreview)}</div>
        <div class="history-meta">
          <span>${formatNumber(entry.inputTokens || 0)} in / ${formatNumber(entry.outputTokens || 0)} out</span>
          ${typeBadge}
          <span>${formatEnergy(entry.energyWh)}</span>
          <span>${formatTime(entry.timestamp)}</span>
        </div>
      </div>
    `;
    container.appendChild(item);
  }
}

function setupClearButton() {
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (confirm("Clear all tracking data?")) {
      chrome.storage.local.get(["theme"], (data) => {
        const theme = data.theme;
        chrome.storage.local.clear(() => {
          if (theme) chrome.storage.local.set({ theme });
          if (heroInterval) clearInterval(heroInterval);
          loadData();
        });
      });
    }
  });
}

/* ─── Platform Logos ─── */

function getPlatformLogo(platform, size = 18) {
  const logos = {
    claude: `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="#D97757">
      <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z"/>
    </svg>`,
    chatgpt: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>`,
    gemini: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="geminiGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#4285F4"/>
          <stop offset="25%" stop-color="#9B72CB"/>
          <stop offset="50%" stop-color="#D96570"/>
          <stop offset="75%" stop-color="#D96570"/>
          <stop offset="100%" stop-color="#9B72CB"/>
        </linearGradient>
      </defs>
      <path d="M12 24C12 20.2 11.1 17.5 9.3 15.7 7.5 13.9 4.8 13 1 13v-2c3.8 0 6.5-.9 8.3-2.7C11.1 6.5 12 3.8 12 0c0 3.8.9 6.5 2.7 8.3C16.5 10.1 19.2 11 23 11v2c-3.8 0-6.5.9-8.3 2.7C12.9 17.5 12 20.2 12 24z" fill="url(#geminiGrad)"/>
    </svg>`,
    perplexity: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.73494 2L11.4299 7.247V2.012H12.5389V7.271L18.2589 2V7.983H20.6079V16.612H18.2659V21.939L12.5389 16.907V21.997H11.4289V16.99L5.74194 22V16.612H3.39294V7.982H5.73494V2ZM10.5949 9.078H4.49994V15.517H5.73994V13.486L10.5949 9.078ZM6.84994 13.972V19.557L11.4299 15.523V9.81L6.84994 13.972ZM12.5699 15.469L17.1579 19.499V16.612H17.1519V13.966L12.5699 9.806V15.469ZM18.2659 15.517H19.4999V9.077H13.4529L18.2669 13.44L18.2659 15.517ZM17.1509 7.983V4.519L13.3909 7.983H17.1509ZM10.6029 7.983L6.84294 4.519V7.983H10.6029Z"/>
    </svg>`
  };
  return logos[platform] || platform;
}

/* ─── Utilities ─── */

function formatNumber(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatWater(wh) {
  // ~1 ml water per Wh for data center cooling (based on Shaolei Ren, UC Riverside research)
  const ml = (wh || 0) * 1;
  if (ml === 0) return "0 ml";
  if (ml < 1) return `${ml.toFixed(2)} ml`;
  if (ml < 1000) return `${ml.toFixed(1)} ml`;
  return `${(ml / 1000).toFixed(2)} L`;
}

function formatEnergy(wh) {
  if (!wh || wh === 0) return "0 Wh";
  if (wh >= 1000) return `${(wh / 1000).toFixed(2)} kWh`;
  if (wh >= 1) return `${wh.toFixed(1)} Wh`;
  if (wh >= 0.001) return `${(wh * 1000).toFixed(1)} mWh`;
  return `${(wh * 1000000).toFixed(0)} uWh`;
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
