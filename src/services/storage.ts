import type { UserProfile, JobEntry, UsageLog } from '../types';


interface StorageSchema {
    user_profile: UserProfile;
    saved_jobs: JobEntry[];
    usage_logs: UsageLog[];
    anonymous_id: string;
}

export const INITIAL_PROFILE: UserProfile = {
    name: '新使用者',
    targetRole: '尚未設定',
    yearsOfExperience: 0,
    skills: [],
    financialGoal: '',
    preferredWorkStyle: '',
    homeLocation: '',
    experience: '',
    bio: '',
    apiKey: '',
    apiProvider: 'openai',
    openaiModel: 'gpt-5-mini'
};

export const storage = {
    get: <K extends keyof StorageSchema>(keys: K | K[]): Promise<Pick<StorageSchema, K>> => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result as Pick<StorageSchema, K>);
                }
            });
        });
    },

    set: (items: Partial<StorageSchema>): Promise<void> => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(items, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    // Helper to get profile directly
    getUserProfile: async (): Promise<UserProfile> => {
        const result = await storage.get('user_profile');
        return result.user_profile || INITIAL_PROFILE;
    },

    // Helper to get jobs directly
    getSavedJobs: async (): Promise<JobEntry[]> => {
        const result = await storage.get('saved_jobs');
        return result.saved_jobs || [];
    },

    getAnonymousId: async (): Promise<string> => {
        const result = await storage.get('anonymous_id');
        let id = result.anonymous_id;
        if (!id) {
            id = crypto.randomUUID();
            await storage.set({ anonymous_id: id });
        }
        return id;
    },

    // Usage Logs Helpers
    getUsageLogs: async (): Promise<UsageLog[]> => {
        const result = await storage.get('usage_logs');
        return result.usage_logs || [];
    },

    saveUsageLog: async (log: UsageLog): Promise<void> => {
        const logs = await storage.getUsageLogs();
        // Prepend new log, keep only last 100
        const updatedLogs = [log, ...logs].slice(0, 100);
        await storage.set({ usage_logs: updatedLogs });
    },

    clearUsageLogs: async (): Promise<void> => {
        await storage.set({ usage_logs: [] });
    }
};
