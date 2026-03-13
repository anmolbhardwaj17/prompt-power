/**
 * Relatable energy comparisons.
 * Maps energy usage to everyday activities people can understand.
 * Uses inline SVG icons (Lucide-style line icons).
 */
const PromptPowerComparisons = (() => {

  const s = 24; // icon viewBox size
  const a = 'none'; // fill
  const c = 'currentColor'; // stroke
  const w = '1.5'; // stroke-width

  // Lucide-style SVG icons
  const ICONS = {
    lightbulb: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
    smartphone: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
    microwave: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="4" rx="2"/><rect width="8" height="7" x="6" y="8" rx="1"/><path d="M18 8v4"/><path d="M18 14h.01"/><path d="M2 19h20"/></svg>`,
    refrigerator: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M5 10h14"/><path d="M9 6v0"/><path d="M9 14v0"/></svg>`,
    wind: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
    tv: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
    car: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    washingmachine: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="20" x="3" y="2" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M8 6h.01"/><path d="M11 6h.01"/><path d="M14 6h.01"/></svg>`,
    house: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    search: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    coffee: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1"/><path d="M6 2v2"/></svg>`,
    zap: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="${a}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`
  };

  const COMPARISONS = [
    {
      name: "LED Bulb",
      icon: ICONS.lightbulb,
      whPerSecond: 0.00278,
      unitName: "sec",
      label: "LED bulb"
    },
    {
      name: "Phone Charging",
      icon: ICONS.smartphone,
      whPerSecond: 0.00139,
      unitName: "sec",
      label: "phone charging"
    },
    {
      name: "Microwave",
      icon: ICONS.microwave,
      whPerSecond: 0.3056,
      unitName: "sec",
      label: "microwave"
    },
    {
      name: "Refrigerator",
      icon: ICONS.refrigerator,
      whPerSecond: 0.0444,
      unitName: "sec",
      label: "refrigerator"
    },
    {
      name: "Hair Dryer",
      icon: ICONS.wind,
      whPerSecond: 0.5,
      unitName: "sec",
      label: "hair dryer"
    },
    {
      name: "TV Watching",
      icon: ICONS.tv,
      whPerSecond: 0.0278,
      unitName: "sec",
      label: "TV watching"
    },
    {
      name: "Electric Car",
      icon: ICONS.car,
      whPerUnit: 300,
      unitName: "miles",
      label: "electric car"
    },
    {
      name: "Washing Machine",
      icon: ICONS.washingmachine,
      whPerUnit: 500,
      unitName: "loads",
      label: "washing machine"
    },
    {
      name: "Household Monthly",
      icon: ICONS.house,
      whPerUnit: 900000,
      unitName: "months",
      label: "household electricity"
    },
    {
      name: "Google Searches",
      icon: ICONS.search,
      whPerUnit: 0.03,
      unitName: "searches",
      label: ""
    },
    {
      name: "Boiling Water",
      icon: ICONS.coffee,
      whPerUnit: 100,
      unitName: "liters",
      label: "boiling water"
    }
  ];

  function getBestComparison(totalWh) {
    if (totalWh <= 0) {
      return { text: "No energy used yet", icon: ICONS.zap };
    }

    let best = null;
    let bestScore = Infinity;

    for (const comp of COMPARISONS) {
      let value;
      if (comp.whPerSecond) {
        value = totalWh / comp.whPerSecond;
      } else {
        value = totalWh / comp.whPerUnit;
      }

      const score = value < 0.5 ? 1000 / value : value > 1000 ? value / 1000 : Math.abs(Math.log10(value) - 1);
      if (score < bestScore) {
        bestScore = score;
        best = { comp, value };
      }
    }

    const formatted = formatValue(best.value, best.comp.unitName);
    return {
      text: `${formatted} ${best.comp.label}`,
      label: best.comp.label,
      icon: best.comp.icon,
      value: best.value,
      comparison: best.comp
    };
  }

  function getMultipleComparisons(totalWh, count = 3) {
    if (totalWh <= 0) return [];

    const results = COMPARISONS.map(comp => {
      let value;
      if (comp.whPerSecond) {
        value = totalWh / comp.whPerSecond;
      } else {
        value = totalWh / comp.whPerUnit;
      }
      return { comp, value };
    });

    const readable = results.filter(r => r.value >= 0.1 && r.value < 100000);
    readable.sort((a, b) => {
      const aScore = Math.abs(Math.log10(a.value) - 1.5);
      const bScore = Math.abs(Math.log10(b.value) - 1.5);
      return aScore - bScore;
    });

    return readable.slice(0, count).map(r => ({
      text: `${formatValue(r.value, r.comp.unitName)} ${r.comp.label}`,
      label: r.comp.label,
      icon: r.comp.icon,
      value: r.value,
      comparison: r.comp
    }));
  }

  function formatValue(value, unitName) {
    // Auto-scale time: show two units (e.g. "2 min 42 sec", "1 hr 15 min")
    if (unitName === "sec") {
      const totalSec = Math.round(value);
      if (totalSec < 60) {
        return `${totalSec} sec`;
      } else if (totalSec < 3600) {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return s > 0 ? `${m} min ${s} sec` : `${m} min`;
      } else if (totalSec < 86400) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
      } else if (totalSec < 2592000) {
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        return h > 0 ? `${d} days ${h} hr` : `${d} days`;
      } else {
        const mo = Math.floor(totalSec / 2592000);
        const d = Math.floor((totalSec % 2592000) / 86400);
        return d > 0 ? `${mo} months ${d} days` : `${mo} months`;
      }
    }

    if (value < 0.01) return `${(value * 1000).toFixed(1)} milli-${unitName}`;
    if (value < 1) return `${value.toFixed(2)} ${unitName}`;
    if (value < 10) return `${value.toFixed(1)} ${unitName}`;
    if (value < 1000) return `${Math.round(value)} ${unitName}`;
    if (value < 10000) return `${(value / 1000).toFixed(1)}k ${unitName}`;
    return `${Math.round(value / 1000)}k ${unitName}`;
  }

  return { getBestComparison, getMultipleComparisons, COMPARISONS, ICONS };
})();

if (typeof window !== 'undefined') {
  window.PromptPowerComparisons = PromptPowerComparisons;
}
