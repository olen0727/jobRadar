export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';

export interface UserProfile {
    name: string;
    targetRole: string;
    yearsOfExperience: number;
    skills: string[];
    financialGoal: string; // e.g. "High salary for debt repayment"
    preferredWorkStyle: string; // e.g. "Remote", "Hybrid"
    homeLocation: string; // e.g. "Taipei, Xinyi Dist"
    experience: string; // Work Experience Summary
    bio: string; // Autobiography / Self Introduction
    apiKey: string; // OpenAI Key
    geminiApiKey?: string; // Gemini Key
    geminiModel?: GeminiModel; // Selected Gemini Model
    apiProvider: 'openai' | 'gemini'; // Future proofing
}

export type GeminiModel =
    | 'gemini-3-pro-preview'
    | 'gemini-3-flash-preview'
    | 'gemini-2.5-flash'
    | 'gemini-2.5-flash-lite'
    | 'gemini-2.0-flash'
    | 'gemini-2.0-flash-lite';

export interface AnalysisResult {
    matchScore: number; // 0-100
    summary: string;
    pros: string[];
    cons: string[];
    riskAnalysis: {
        level: 'low' | 'medium' | 'high' | 'critical'; // Critical = Black Industry
        flags: string[]; // e.g. ["Gambling keywords", "Capital too low"]
    };
    strategicAdvice: string;
    // New Dimensions
    coreValue: string; // 核心價值
    salaryPotential: string; // 薪資潛力
    workPressure: string; // 工作壓力
    keySkills: string; // 主要技能
    commute: string; // 路程評估
}

export interface JobEntry {
    id: string; // UUID
    url: string; // Source URL
    title: string;
    company: string;
    salaryRange?: string; // e.g. "1.5M - 2M TWD"
    location?: string;
    platform: '104' | 'yourator' | 'linkedin' | 'other';
    status: JobStatus;
    analysis: AnalysisResult;
    appliedDate?: string; // ISO Date
    createdAt: string; // ISO Date
    notes?: string;
}

export interface UsageLog {
    id: string;
    timestamp: string; // ISO Date
    provider: 'openai' | 'gemini';
    model: string;
    operation: 'job_analysis' | 'resume_parsing';
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number; // Estimated cost in USD
}
