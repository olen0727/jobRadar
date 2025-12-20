export type JobStatus = 'saved' | 'applied' | 'offer' | 'rejected' | 'deleted' | 'interviewing' | 'ghosted';

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
    matchScoreExplanation: string[]; // 2-3 points explaining the score
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
    commuteLabel: CommuteLabel; // 路程標籤
    extractedLocation?: string; // AI found location
    extractedSalary?: string; // AI found salary
}

export type CommuteLabel =
    | "你家旁邊" // < 10 mins
    | "舒適距離" // 10-20 mins
    | "標準通勤" // 20-40 mins
    | "舟車勞頓" // 40-60 mins
    | "極限通勤" // > 60 mins
    | "遠端/外地" // Remote or Overseas
    | "未知";    // Unknown

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
