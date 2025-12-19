import { analyzeJobWithAI as analyzeOpenAI, parseResumeWithAI as parseOpenAI } from './openai';
import { analyzeJobWithGemini, parseResumeWithGemini } from './gemini';
import type { UserProfile, AnalysisResult } from '../types';
import type { ScrapedJobData } from './scraper';

export const analyzeJob = async (job: ScrapedJobData, profile: UserProfile): Promise<AnalysisResult> => {
    // Default to openai if not set
    const provider = profile.apiProvider || 'openai';

    if (provider === 'gemini') {
        return analyzeJobWithGemini(job, profile);
    }

    return analyzeOpenAI(job, profile);
};

export const parseResume = async (text: string, profile: UserProfile): Promise<UserProfile> => {
    const provider = profile.apiProvider || 'openai';

    if (provider === 'gemini') {
        if (!profile.geminiApiKey) throw new Error("Gemini API Key is missing. Please check Settings.");
        // We pass the key directly as the specialized functions expect string
        return parseResumeWithGemini(text, profile.geminiApiKey);
    }

    if (!profile.apiKey) throw new Error("OpenAI API Key is missing. Please check Settings.");
    return parseOpenAI(text, profile.apiKey);
};
