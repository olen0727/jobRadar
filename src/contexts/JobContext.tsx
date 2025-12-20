import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JobEntry, UserProfile } from '../types';
import { storage } from '../services/storage';

interface JobContextType {
    userProfile: UserProfile | null;
    savedJobs: JobEntry[];
    loading: boolean;
    saveProfile: (profile: UserProfile) => Promise<void>;
    addJob: (job: JobEntry) => Promise<void>;
    updateJobStatus: (id: string, status: JobEntry['status']) => Promise<void>;
    deleteJob: (id: string) => Promise<void>;
    refreshJobs: () => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [savedJobs, setSavedJobs] = useState<JobEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const profile = await storage.getUserProfile();
            const jobs = await storage.getSavedJobs();
            setUserProfile(profile);
            setSavedJobs(jobs);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async (profile: UserProfile) => {
        await storage.set({ user_profile: profile });
        // Reload to ensure state is in sync with storage
        await loadData();
    };

    const addJob = async (job: JobEntry) => {
        const newJobs = [...savedJobs, job];
        await storage.set({ saved_jobs: newJobs });
        setSavedJobs(newJobs);
    };

    const updateJobStatus = async (id: string, status: JobEntry['status']) => {
        const newJobs = savedJobs.map(job =>
            job.id === id ? { ...job, status } : job
        );
        await storage.set({ saved_jobs: newJobs });
        setSavedJobs(newJobs);
    };

    const deleteJob = async (id: string) => {
        const newJobs = savedJobs.filter(job => job.id !== id);
        await storage.set({ saved_jobs: newJobs });
        setSavedJobs(newJobs);
    };

    return (
        <JobContext.Provider value={{
            userProfile,
            savedJobs,
            loading,
            saveProfile,
            addJob,
            updateJobStatus,
            deleteJob,
            refreshJobs: loadData
        }}>
            {children}
        </JobContext.Provider>
    );
};

export const useJobContext = () => {
    const context = useContext(JobContext);
    if (context === undefined) {
        throw new Error('useJobContext must be used within a JobProvider');
    }
    return context;
};
