// src/server/estimator.js

// Pricing per million tokens (USD)
export const MODEL_PRICING = {
    opus: {
        input: 15,
        output: 75,
        cache_read: 1.875,
        cache_creation: 18.75,
    },
    sonnet: {
        input: 3,
        output: 15,
        cache_read: 0.375,
        cache_creation: 3.75,
    },
    haiku: {
        input: 0.8,
        output: 4,
        cache_read: 0.08,
        cache_creation: 1,
    },
};

// Average tokens per message (rough heuristic for estimation)
const AVG_INPUT_TOKENS_PER_MSG = 500;
const AVG_OUTPUT_TOKENS_PER_MSG = 1500;

function getPricingTier(model) {
    if (!model) return MODEL_PRICING.sonnet;
    const lower = model.toLowerCase();
    if (lower.includes('opus')) return MODEL_PRICING.opus;
    if (lower.includes('haiku')) return MODEL_PRICING.haiku;
    return MODEL_PRICING.sonnet;
}

export function estimateCost({
    model = '',
    input_tokens = 0,
    output_tokens = 0,
    cache_read_tokens = 0,
    cache_creation_tokens = 0,
    message_count = 0,
}) {
    const pricing = getPricingTier(model);

    let inTok = input_tokens;
    let outTok = output_tokens;

    // If no token counts but we have message count, estimate
    if (inTok === 0 && outTok === 0 && message_count > 0) {
        inTok = message_count * AVG_INPUT_TOKENS_PER_MSG;
        outTok = message_count * AVG_OUTPUT_TOKENS_PER_MSG;
    }

    const cost =
        (inTok * pricing.input +
            outTok * pricing.output +
            cache_read_tokens * pricing.cache_read +
            cache_creation_tokens * pricing.cache_creation) /
        1_000_000;

    return cost;
}
