/**
 * Energy calculation constants and logic.
 * Based on research data from Epoch AI, Google, OpenAI disclosures,
 * and academic papers (TokenPowerBench, EuroMLSys 2025).
 *
 * Image generation data from:
 * - Luccioni et al. "Power Hungry Processing" (2023) - avg 2.9 Wh/image
 * - "The Hidden Cost of an Image" (arxiv 2506.17016, 2025) - 3.58 Wh at 1024x1024
 * - MIT Technology Review: "Making an image with generative AI uses as much energy as charging your phone"
 */
const PromptPowerEnergy = (() => {
  // Energy per token in watt-hours (Wh)
  const ENERGY_PER_TOKEN_WH = {
    claude: {
      input: 0.00028,   // ~1 J per input token
      output: 0.00097   // ~3.5 J per output token
    },
    chatgpt: {
      input: 0.00028,
      output: 0.00083   // ~3 J per output token
    },
    gemini: {
      input: 0.00022,   // Google's efficiency improvements
      output: 0.00067   // ~2.4 J per output token
    },
    perplexity: {
      input: 0.00030,   // Search + LLM inference combined
      output: 0.00090   // Slightly higher due to retrieval augmentation
    }
  };

  // Fallback: average energy per query (Wh)
  const ENERGY_PER_QUERY_WH = {
    claude: 0.5,
    chatgpt: 0.3,
    gemini: 0.24,
    perplexity: 0.35
  };

  // Energy per generated image in Wh
  // Sources:
  // - DALL-E 3: ~3.0 Wh (proxy from SD3 at 1024x1024: 3.58 Wh, Luccioni avg: 2.9 Wh)
  // - Imagen/Gemini: ~2.5 Wh (Google's infrastructure is ~17% more efficient per their disclosure)
  // - Claude: does not generate images natively
  const ENERGY_PER_IMAGE_WH = {
    chatgpt: 3.0,    // DALL-E 3 estimate
    gemini: 2.5,     // Imagen estimate (Google efficiency edge)
    claude: 0,       // Claude doesn't generate images
    perplexity: 0    // Perplexity doesn't generate images
  };

  // For context: image gen uses ~60x more energy than a text query
  // One image ≈ charging a phone to ~24% (Luccioni et al.)

  /**
   * Calculate energy in Wh for a text prompt-response pair.
   */
  function calculateEnergy(platform, inputTokens, outputTokens) {
    const rates = ENERGY_PER_TOKEN_WH[platform] || ENERGY_PER_TOKEN_WH.chatgpt;
    const inputEnergy = inputTokens * rates.input;
    const outputEnergy = outputTokens * rates.output;
    return inputEnergy + outputEnergy;
  }

  /**
   * Calculate energy for image generation.
   * @param {string} platform
   * @param {number} imageCount - number of images generated
   * @param {number} inputTokens - tokens in the prompt text
   */
  function calculateImageEnergy(platform, imageCount, inputTokens) {
    const rates = ENERGY_PER_TOKEN_WH[platform] || ENERGY_PER_TOKEN_WH.chatgpt;
    const promptEnergy = inputTokens * rates.input;
    const imageEnergy = (ENERGY_PER_IMAGE_WH[platform] || 3.0) * imageCount;
    return promptEnergy + imageEnergy;
  }

  /**
   * Calculate energy using query-level estimate (fallback).
   */
  function calculateEnergyPerQuery(platform) {
    return ENERGY_PER_QUERY_WH[platform] || 0.3;
  }

  /**
   * Get energy per image for a platform.
   */
  function getImageEnergy(platform) {
    return ENERGY_PER_IMAGE_WH[platform] || 3.0;
  }

  /**
   * Convert Wh to other units.
   */
  function convertEnergy(wh) {
    return {
      wh: wh,
      joules: wh * 3600,
      kwh: wh / 1000,
      calories: wh * 0.86042
    };
  }

  return {
    calculateEnergy,
    calculateImageEnergy,
    calculateEnergyPerQuery,
    getImageEnergy,
    convertEnergy,
    ENERGY_PER_TOKEN_WH,
    ENERGY_PER_QUERY_WH,
    ENERGY_PER_IMAGE_WH
  };
})();

if (typeof window !== 'undefined') {
  window.PromptPowerEnergy = PromptPowerEnergy;
}
