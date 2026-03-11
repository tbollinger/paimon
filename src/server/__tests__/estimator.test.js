import { describe, it, expect } from 'vitest';
import { estimateCost, MODEL_PRICING } from '../estimator.js';

describe('estimateCost', () => {
    it('calculates cost for opus model with token counts', () => {
        const cost = estimateCost({
            model: 'claude-opus-4-6',
            input_tokens: 1_000_000,
            output_tokens: 500_000,
        });

        // 1M input * 15/1M + 500K output * 75/1M = 15 + 37.5 = 52.5
        expect(cost).toBeCloseTo(52.5);
    });

    it('calculates cost for sonnet model with token counts', () => {
        const cost = estimateCost({
            model: 'claude-sonnet-4',
            input_tokens: 1_000_000,
            output_tokens: 500_000,
        });

        // 1M input * 3/1M + 500K output * 15/1M = 3 + 7.5 = 10.5
        expect(cost).toBeCloseTo(10.5);
    });

    it('calculates cost for haiku model with token counts', () => {
        const cost = estimateCost({
            model: 'claude-haiku-3',
            input_tokens: 1_000_000,
            output_tokens: 500_000,
        });

        // 1M input * 0.8/1M + 500K output * 4/1M = 0.8 + 2.0 = 2.8
        expect(cost).toBeCloseTo(2.8);
    });

    it('includes cache read and creation costs', () => {
        const cost = estimateCost({
            model: 'claude-sonnet-4',
            input_tokens: 100_000,
            output_tokens: 50_000,
            cache_read_tokens: 200_000,
            cache_creation_tokens: 100_000,
        });

        // 100K * 3/1M + 50K * 15/1M + 200K * 0.375/1M + 100K * 3.75/1M
        // = 0.3 + 0.75 + 0.075 + 0.375 = 1.5
        expect(cost).toBeCloseTo(1.5);
    });

    it('estimates tokens from message count when no token data', () => {
        const cost = estimateCost({
            model: 'claude-sonnet-4',
            message_count: 10,
        });

        // 10 msgs * 500 avg input = 5000 input tokens
        // 10 msgs * 1500 avg output = 15000 output tokens
        // 5000 * 3/1M + 15000 * 15/1M = 0.015 + 0.225 = 0.24
        expect(cost).toBeCloseTo(0.24);
    });

    it('uses token counts over message count when both provided', () => {
        const costWithTokens = estimateCost({
            model: 'claude-sonnet-4',
            input_tokens: 1000,
            output_tokens: 2000,
            message_count: 10,
        });

        // Should use actual tokens, not estimated from messages
        // 1000 * 3/1M + 2000 * 15/1M = 0.003 + 0.03 = 0.033
        expect(costWithTokens).toBeCloseTo(0.033);
    });

    it('falls back to sonnet pricing for unknown models', () => {
        const cost = estimateCost({
            model: 'some-unknown-model',
            input_tokens: 1_000_000,
            output_tokens: 500_000,
        });

        // Same as sonnet: 1M * 3/1M + 500K * 15/1M = 3 + 7.5 = 10.5
        expect(cost).toBeCloseTo(10.5);
    });

    it('falls back to sonnet pricing when model is empty', () => {
        const cost = estimateCost({
            model: '',
            input_tokens: 1_000_000,
            output_tokens: 500_000,
        });

        expect(cost).toBeCloseTo(10.5);
    });

    it('returns 0 when no tokens and no messages', () => {
        const cost = estimateCost({
            model: 'claude-sonnet-4',
        });

        expect(cost).toBe(0);
    });

    it('returns 0 with all zeroes', () => {
        const cost = estimateCost({
            model: 'claude-opus-4-6',
            input_tokens: 0,
            output_tokens: 0,
            cache_read_tokens: 0,
            cache_creation_tokens: 0,
            message_count: 0,
        });

        expect(cost).toBe(0);
    });

    it('exports MODEL_PRICING with all three tiers', () => {
        expect(MODEL_PRICING).toHaveProperty('opus');
        expect(MODEL_PRICING).toHaveProperty('sonnet');
        expect(MODEL_PRICING).toHaveProperty('haiku');

        // Spot-check a few values
        expect(MODEL_PRICING.opus.input).toBe(15);
        expect(MODEL_PRICING.sonnet.output).toBe(15);
        expect(MODEL_PRICING.haiku.cache_read).toBe(0.08);
    });
});
