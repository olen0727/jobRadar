
export const PRICING_RATES = {
    'gemini-3-pro-preview': { input: 2.00, output: 12.00 },
    'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
    'gpt-5.2': { input: 1.75, output: 14.00 },
    'gpt-5.1': { input: 1.25, output: 10.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-4.1': { input: 2.00, output: 8.00 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4o': { input: 2.50, output: 10.00 }
} as const;

export type PricingModel = keyof typeof PRICING_RATES;

export const calculateCost = (
    provider: 'openai' | 'gemini',
    model: string,
    inputTokens: number,
    outputTokens: number
): number => {
    // Normalize model name or find closest match if needed (currently exact match)
    const rate = PRICING_RATES[model as PricingModel];

    if (!rate) {
        console.warn(`No pricing rate found for model: ${model}`);
        return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * rate.input;
    const outputCost = (outputTokens / 1_000_000) * rate.output;

    return inputCost + outputCost;
};
