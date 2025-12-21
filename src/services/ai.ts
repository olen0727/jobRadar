import { analyzeJobWithAI as analyzeOpenAI, parseResumeWithAI as parseOpenAI, SYSTEM_PROMPT, RESUME_SYSTEM_PROMPT } from './openai';
import { analyzeJobWithGemini, parseResumeWithGemini } from './gemini';
import type { UserProfile, AnalysisResult } from '../types';
import type { ScrapedJobData } from './scraper';
import { storage } from './storage';

const SUPABASE_TRIAL_URL = 'https://pabrserjlsgvqbzekbob.supabase.co/functions/v1/rapid-responder';

export class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotaExceededError';
    }
}

const callTrialAPI = async (payload: any): Promise<any> => {
    try {
        const response = await fetch(SUPABASE_TRIAL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.message || data.error || `Trial API Error: ${response.status} ${response.statusText}`;
            if (errorMsg.includes('limit') || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
                throw new QuotaExceededError(errorMsg);
            }
            throw new Error(errorMsg);
        }

        // 如果後端回傳的是字串，則再 parse 一次 (備案代碼有時會多包一層)
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error('Failed to parse inner JSON:', e);
            }
        }

        return data;
    } catch (err) {
        console.error('Trial API Request Failed:', err);
        throw err;
    }
};

export const analyzeJob = async (job: ScrapedJobData, profile: UserProfile): Promise<AnalysisResult> => {
    // Check if API key exists
    const hasKey = profile.apiKey || profile.geminiApiKey;

    if (!hasKey) {
        // Use Trial API via Supabase
        const anonymousId = await storage.getAnonymousId();
        const result = await callTrialAPI({
            job,
            profile: { ...profile, anonymousId },
            systemPrompt: SYSTEM_PROMPT // Default to OpenAI style prompt for trial
        });

        const analysisResult = result as AnalysisResult;
        analysisResult.aiModel = 'gpt-5-mini (Trial)'; // Trial default

        return analysisResult;
    }

    // Default to openai if not set
    const provider = profile.apiProvider || 'openai';

    if (provider === 'gemini') {
        return analyzeJobWithGemini(job, profile);
    }

    return analyzeOpenAI(job, profile);
};

export const parseResume = async (text: string, profile: UserProfile): Promise<UserProfile> => {
    const hasKey = profile.apiKey || profile.geminiApiKey;

    if (!hasKey) {
        // Use Trial API via Supabase
        const anonymousId = await storage.getAnonymousId();
        const result = await callTrialAPI({
            resumeText: text,
            profile: { ...profile, anonymousId },
            systemPrompt: RESUME_SYSTEM_PROMPT
        });

        // Hydrate result to UserProfile
        return {
            ...profile,
            name: result.name || '',
            targetRole: result.targetRole || '',
            yearsOfExperience: typeof result.yearsOfExperience === 'number' ? result.yearsOfExperience : 0,
            skills: Array.isArray(result.skills) ? result.skills : [],
            financialGoal: result.financialGoal || '',
            preferredWorkStyle: result.preferredWorkStyle || '',
            homeLocation: result.homeLocation || '',
            experience: result.experience || '',
            bio: result.bio || '',
            apiProvider: 'openai'
        };
    }

    const provider = profile.apiProvider || 'openai';

    if (provider === 'gemini') {
        // Fallback for trial if no key but under limit
        const key = profile.geminiApiKey || '';
        return parseResumeWithGemini(text, profile, key);
    }

    return parseOpenAI(text, profile);
};
