import { analyzeJobWithAI as analyzeOpenAI, parseResumeWithAI as parseOpenAI, SYSTEM_PROMPT, RESUME_SYSTEM_PROMPT } from './openai';
import { analyzeJobWithGemini, parseResumeWithGemini } from './gemini';
import type { UserProfile, AnalysisResult } from '../types';
import type { ScrapedJobData } from './scraper';
import { storage } from './storage';

const SUPABASE_TRIAL_URL = 'https://pabrserjlsgvqbzekbob.supabase.co/functions/v1/rapid-responder';

export class QuotaExceededError extends Error {
    quotaInfo?: { used: number; max: number };
    constructor(message: string, quotaInfo?: { used: number; max: number }) {
        super(message);
        this.name = 'QuotaExceededError';
        this.quotaInfo = quotaInfo;
        // 確保原型鏈正確，以便在各處正確使用 instanceof
        Object.setPrototypeOf(this, QuotaExceededError.prototype);
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

            // 增加更強健的判斷：包含 HTTP 429/403 或中英文關鍵字
            const isQuotaError =
                response.status === 429 ||
                response.status === 403 ||
                errorMsg.toLowerCase().includes('limit') ||
                errorMsg.toLowerCase().includes('quota') ||
                errorMsg.toLowerCase().includes('exceeded') ||
                errorMsg.includes('上限') ||
                errorMsg.includes('額度') ||
                errorMsg.includes('次數');

            if (isQuotaError) {
                let used = data.used_count || data.used;
                let max = data.limit_count || data.limit || data.max;

                let quotaInfo = (typeof used === 'number' && typeof max === 'number') ? { used, max } : undefined;

                // 如果 JSON 沒給數值，則嘗試從訊息文字中提取，例如 "(3 次)"
                if (!quotaInfo) {
                    const match = errorMsg.match(/\((\d+)\s*次\)/);
                    if (match) {
                        const maxVal = parseInt(match[1], 10);
                        quotaInfo = { used: maxVal, max: maxVal };
                    }
                }

                // --- 新增：全域預算偵測 ---
                const isGlobalExceeded =
                    errorMsg.toLowerCase().includes('insufficient_quota') ||
                    errorMsg.toLowerCase().includes('billing_limit') ||
                    errorMsg.toLowerCase().includes('hard_limit');

                const finalMsg = isGlobalExceeded
                    ? "目前免費試用伺服器額度已滿，請填寫您的 API Key 以繼續使用。"
                    : errorMsg;

                throw new QuotaExceededError(finalMsg, quotaInfo);
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
