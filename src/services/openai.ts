import type { UserProfile, AnalysisResult } from '../types';
import type { ScrapedJobData } from './scraper';
import { storage } from './storage';
import { calculateCost } from '../utils/pricing';

export class OpenAIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenAIError';
    }
}

const SYSTEM_PROMPT = `
Role: You are an expert Career Strategist and Technical Recruiter. You act as a "Black Box" analyzer for a senior candidate.

Task: Analyze this job opportunity based on the User Profile.
Output Format: JSON only. Do not output markdown.

JSON Structure:
{
  "matchScore": number, // 0-100 based on skills & goals match
  "matchScoreExplanation": ["Point 1", "Point 2"], // 2-3 points explaining why this score was given
  "summary": "One sentence summary of the role",
  "pros": ["Point 1", "Point 2"],
  "cons": ["Point 1", "Point 2"],
  "riskAnalysis": {
    "level": "low" | "medium" | "high" | "critical",
    "flags": ["List specific red flags like 'Gambling terms', 'Unclear business model', 'High concurrency without product']"
  },
  "strategicAdvice": "Direct advice. E.g., 'Apply immediately', 'Skip - high risk', 'Good for backup'.",
  "coreValue": "Value to the candidate (e.g. 'Skill Growth', 'High Pay', 'Stability')",
  "salaryPotential": "Estimated annual salary (e.g. '1.5M - 1.8M TWD')",
  "workPressure": "Work pressure estimate (e.g. 'High - Oncall required', 'Low - 9 to 5')",
  "keySkills": "Top 3 critical skills required (e.g. 'React, Golang, AWS')",
  "commute": "Estimated commute time/distance from user's home location (if provided). Guess based on city/district. (e.g. '~40 mins from Xinyi', 'Remote')",
  "commuteLabel": "Label string based on strict rules below"
}

Constraint:
- If the company looks like a gambling/betting/grey industry (keywords: 運維, 項目, 高併發 without specific product, customer service for gaming, 菲律賓/柬埔寨 location), set risk level to 'high' or 'critical'.
- Be realistic about salary vs. workload.
- If the JD is in Traditional Chinese, reply in Traditional Chinese.
- For 'commute', use the User's Home Location to estimate roughly. If User Home is unknown, say 'Unknown'. If Job is Remote, say 'Remote'.
- Commute Label Rules (Strictly follow these):
  - < 10 mins: "你家旁邊"
  - 10-20 mins: "舒適距離"
  - 20-40 mins: "標準通勤"
  - 40-60 mins: "舟車勞頓"
  - > 60 mins: "極限通勤"
  - Remote or Overseas: "遠端/外地"
  - Unknown/Cannot Estimate: "未知"
`;

export const analyzeJobWithAI = async (
    job: ScrapedJobData,
    profile: UserProfile
): Promise<AnalysisResult> => {
    if (!profile.apiKey) {
        throw new OpenAIError('API Key is missing. Please set it in Options.');
    }

    const userContent = `
USER PROFILE:
Name: ${profile.name}
Role: ${profile.targetRole}
Exp: ${profile.yearsOfExperience} years
Skills: ${profile.skills.join(', ')}
Goals: ${profile.financialGoal}
Pref: ${profile.preferredWorkStyle}
Home: ${profile.homeLocation || 'Not provided'}
Experience: ${profile.experience || 'Not provided'}
Bio: ${profile.bio || 'Not provided'}

JOB DESCRIPTION:
Title: ${job.title}
Company: ${job.company}
Platform: ${job.platform}
Location: ${job.location}
Salary: ${job.salary}

Content:
${job.description.substring(0, 25000)} 
`;
    // Limit char count to avoid token limits

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${profile.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Default to 4o for best reasoning, fallback handled if user has no access? assume 4o/turbo.
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429 || errorData.error?.code === 'insufficient_quota') {
                throw new OpenAIError('API Quota Exceeded. Please check your OpenAI billing details or try a different API Key.');
            }
            throw new OpenAIError(errorData.error?.message || `API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        // Log Usage
        if (result.usage) {
            const cost = calculateCost('openai', 'gpt-4o', result.usage.prompt_tokens, result.usage.completion_tokens);

            await storage.saveUsageLog({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                provider: 'openai',
                model: 'gpt-4o',
                operation: 'job_analysis',
                inputTokens: result.usage.prompt_tokens,
                outputTokens: result.usage.completion_tokens,
                totalTokens: result.usage.total_tokens,
                cost
            });
        }

        try {
            const parsed = JSON.parse(content);
            return parsed as AnalysisResult;
        } catch (e) {
            throw new OpenAIError('Failed to parse AI response JSON');
        }

    } catch (error) {
        if (error instanceof OpenAIError) throw error;
        throw new Error('Network or unexpected error during analysis');
    }
}

const RESUME_SYSTEM_PROMPT = `
Role: You are an expert Resume Parser.
Task: Extract structured data from the provided resume text.
Output Format: JSON only.
Language: Traditional Chinese (繁體中文) for all text fields.

JSON Structure:
{
  "name": "Candidate Name (or 'Unknown')",
  "targetRole": "Current or Target Job Title",
  "yearsOfExperience": number, // Estimate from work history
  "skills": ["Skill 1", "Skill 2"], // Extract top 10 relevant skills
  "financialGoal": "Infer from intent (e.g. 'Seeking growth', 'Stable') or set empty string if unknown",
  "preferredWorkStyle": "Remote/Hybrid/Office (infer or empty)",
  "homeLocation": "City/Region (infer or empty)",
  "experience": "Comprehensive Detailed work history (bullet points, organize by company/role, no length limit, Traditional Chinese)",
  "bio": "Comprehensive Autobiography / Self Introduction (no length limit, Traditional Chinese)"
}
`;

export const parseResumeWithAI = async (
    resumeText: string,
    apiKey: string
): Promise<UserProfile> => {
    if (!apiKey) throw new OpenAIError('API Key is missing.');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: RESUME_SYSTEM_PROMPT },
                    { role: 'user', content: `RESUME TEXT:\n${resumeText.substring(0, 25000)}` }
                ],
                temperature: 0.3, // Lower temp for extraction
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429 || errorData.error?.code === 'insufficient_quota') {
                throw new OpenAIError('API Quota Exceeded.');
            }
            throw new OpenAIError(errorData.error?.message || 'API Error');
        }


        const result = await response.json();
        const content = result.choices[0].message.content;

        // Log Usage
        if (result.usage) {
            const cost = calculateCost('openai', 'gpt-4o', result.usage.prompt_tokens, result.usage.completion_tokens);

            await storage.saveUsageLog({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                provider: 'openai',
                model: 'gpt-4o',
                operation: 'resume_parsing',
                inputTokens: result.usage.prompt_tokens,
                outputTokens: result.usage.completion_tokens,
                totalTokens: result.usage.total_tokens,
                cost
            });
        }

        const parsed = JSON.parse(content);

        // Hydrate missing fields to ensure UserProfile shape
        return {
            name: parsed.name || '',
            targetRole: parsed.targetRole || '',
            yearsOfExperience: typeof parsed.yearsOfExperience === 'number' ? parsed.yearsOfExperience : 0,
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            financialGoal: parsed.financialGoal || '',
            preferredWorkStyle: parsed.preferredWorkStyle || '',
            homeLocation: parsed.homeLocation || '',
            experience: parsed.experience || '',
            bio: parsed.bio || '',
            apiKey: apiKey, // Keep the key
            apiProvider: 'openai'
        };

    } catch (error) {
        if (error instanceof OpenAIError) throw error;
        throw new Error('Failed to parse resume');
    }
};
