import type { UserProfile, AnalysisResult } from '../types';
import type { ScrapedJobData } from './scraper';
import { storage } from './storage';
import { calculateCost } from '../utils/pricing';

export class GeminiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GeminiError';
    }
}

const GENERATE_CONFIG = {
    temperature: 0.7,
    response_mime_type: "application/json"
};

const SYSTEM_INSTRUCTION_JOB = `
Role: You are an expert Career Strategist and Technical Recruiter. You act as a "Black Box" analyzer for a senior candidate.
Task: Analyze this job opportunity based on the User Profile.
Output Format: JSON only. Do not output markdown.

JSON Structure:
{
  "matchScore": number, // 0-100
  "matchScoreExplanation": ["Point 1", "Point 2"], // 2-3 points explaining why this score was given
  "summary": "One sentence summary of the role",
  "pros": ["Point 1", "Point 2"],
  "cons": ["Point 1", "Point 2"],
  "riskAnalysis": {
    "level": "low" | "medium" | "high" | "critical",
    "flags": ["string"]
  },
  "strategicAdvice": "Direct advice string",
  "coreValue": "Value string",
  "salaryPotential": "Estimated salary string",
  "workPressure": "Pressure estimate string",
  "keySkills": "Top 3 skills string",
  "commuteLabel": "你家旁邊" | "舒適距離" | "標準通勤" | "舟車勞頓" | "極限通勤" | "遠端/外地" | "未知",
  "commuteDescription": "String explaining the commute detail based on home location",
  "extractedLocation": "string", // If the scraper missed the address, find it in the content
  "extractedSalary": "string" // If the scraper missed the salary, find it in the content
}

Constraint:
- Be realistic.
- Reply in Traditional Chinese (繁體中文).
- If company is gambling/grey, risk = high/critical.
- Commute Label Rules (Based on estimated time):
  - < 10 mins: "你家旁邊"
  - 10-20 mins: "舒適距離"
  - 20-40 mins: "標準通勤"
  - 40-60 mins: "舟車勞頓"
  - > 60 mins: "極限通勤"
  - Remote/Overseas: "遠端/外地"
  - Unknown home location: "未知"
`;

const SYSTEM_INSTRUCTION_RESUME = `
Role: You are an expert Resume Parser.
Task: Extract structured data from resume text.
Output Format: JSON only.
Language: Traditional Chinese (繁體中文).

JSON Structure:
{
  "name": "string",
  "targetRole": "string",
  "yearsOfExperience": number,
  "skills": ["string"],
  "financialGoal": "string",
  "preferredWorkStyle": "string",
  "homeLocation": "string",
  "experience": "Comprehensive Detailed work history (no length limit, Traditional Chinese)",
  "bio": "Comprehensive Autobiography (no length limit, Traditional Chinese)"
}
`;

export const analyzeJobWithGemini = async (
    job: ScrapedJobData,
    profile: UserProfile
): Promise<AnalysisResult> => {
    if (!profile.geminiApiKey) {
        throw new GeminiError('Gemini API Key is missing.');
    }

    // Use user selected model or default to 3-flash
    const modelName = profile.geminiModel || 'gemini-3-flash-preview';

    const prompt = `
${SYSTEM_INSTRUCTION_JOB}

USER PROFILE:
Name: ${profile.name}
Role: ${profile.targetRole}
Exp: ${profile.yearsOfExperience} years
Skills: ${profile.skills.join(', ')}
Goals: ${profile.financialGoal}
Pref: ${profile.preferredWorkStyle}
Home: ${profile.homeLocation || 'Not provided'}
Experience: ${profile.experience}
Bio: ${profile.bio}

JOB DESCRIPTION:
Title: ${job.title}
Company: ${job.company}
Platform: ${job.platform}
Location: ${job.location}
Salary: ${job.salary}

Content:
${job.description.substring(0, 25000)}
`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${profile.geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: GENERATE_CONFIG
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new GeminiError(errorData.error?.message || `Gemini API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new GeminiError('No content generated');

        // Log Usage
        const usage = result.usageMetadata;
        if (usage) {
            const cost = calculateCost('gemini', modelName, usage.promptTokenCount, usage.candidatesTokenCount);

            await storage.saveUsageLog({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                provider: 'gemini',
                model: modelName,
                operation: 'job_analysis',
                inputTokens: usage.promptTokenCount,
                outputTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount,
                cost
            });
        }

        return JSON.parse(text) as AnalysisResult;

    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        if (error instanceof GeminiError) throw error;
        throw new Error('Gemini Analysis Failed');
    }
};


export const parseResumeWithGemini = async (
    resumeText: string,
    profile: UserProfile,
    apiKey: string
): Promise<UserProfile> => {
    if (!apiKey) throw new GeminiError('Gemini API Key is missing.');

    try {
        // Use user selected model or default to 3-flash
        const modelName = profile.geminiModel || 'gemini-3-flash-preview';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `RESUME TEXT:\n${resumeText.substring(0, 30000)}` }]
                }],
                system_instruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION_RESUME }]
                },
                generationConfig: {
                    ...GENERATE_CONFIG,
                    temperature: 0.3
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new GeminiError(errorData.error?.message || `Gemini API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new GeminiError('No content generated');

        // Log Usage
        const usage = result.usageMetadata;
        if (usage) {
            const cost = calculateCost('gemini', modelName, usage.promptTokenCount, usage.candidatesTokenCount);

            await storage.saveUsageLog({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                provider: 'gemini',
                model: modelName,
                operation: 'resume_parsing',
                inputTokens: usage.promptTokenCount,
                outputTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount,
                cost
            });
        }

        const parsed = JSON.parse(text);

        return {
            ...profile,
            name: parsed.name || '',
            targetRole: parsed.targetRole || '',
            yearsOfExperience: typeof parsed.yearsOfExperience === 'number' ? parsed.yearsOfExperience : 0,
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            financialGoal: parsed.financialGoal || '',
            preferredWorkStyle: parsed.preferredWorkStyle || '',
            homeLocation: parsed.homeLocation || '',
            experience: parsed.experience || '',
            bio: parsed.bio || '',
            geminiApiKey: apiKey,
            apiProvider: 'gemini'
        };

    } catch (error) {
        if (error instanceof GeminiError) throw error;
        throw new Error('Gemini Parsing Failed');
    }
};
