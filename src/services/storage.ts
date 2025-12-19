import type { UserProfile, JobEntry } from '../types';

interface StorageSchema {
    user_profile: UserProfile;
    saved_jobs: JobEntry[];
}

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
    getUserProfile: async (): Promise<UserProfile | null> => {
        const result = await storage.get('user_profile');
        return result.user_profile || null;
    },

    // Helper to get jobs directly
    getSavedJobs: async (): Promise<JobEntry[]> => {
        const result = await storage.get('saved_jobs');
        return result.saved_jobs || [];
    }
};
