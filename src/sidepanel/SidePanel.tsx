import React, { useState } from 'react';
import { JobProvider, useJobContext } from '../contexts/JobContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Settings, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import type { JobEntry, JobStatus } from '../types';

const STATUS_OPTIONS: { value: JobStatus; label: string; color: string }[] = [
    { value: 'saved', label: 'Inbox', color: 'bg-slate-100 text-slate-700' },
    { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
    { value: 'interviewing', label: 'Interview', color: 'bg-purple-100 text-purple-700' },
    { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-700' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
    { value: 'ghosted', label: 'Ghosted', color: 'bg-gray-100 text-gray-500' },
];

const ComparisonTable = () => {
    const { savedJobs, updateJobStatus, refreshJobs, deleteJob } = useJobContext();

    // Sort jobs by created date descending (newest first)
    const sortedJobs = [...savedJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
        await updateJobStatus(jobId, newStatus);
    };

    const handleDelete = async (jobId: string) => {
        if (confirm('Delete this job?')) {
            await deleteJob(jobId);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
            {/* Header */}
            <header className="px-4 py-3 border-b flex justify-between items-center bg-white shadow-sm z-10 sticky top-0">
                <h1 className="font-bold text-lg flex items-center gap-2">
                    JobRadar <span className="text-xs font-normal text-muted-foreground">Matrix</span>
                </h1>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => refreshJobs()} title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => chrome.runtime.openOptionsPage()} title="Settings">
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Matrix Container */}
            <div className="flex-1 overflow-auto bg-muted/20 relative">
                <div className="flex min-w-max">
                    {/* 1. Left Header Column (Sticky) */}
                    <div className="sticky left-0 z-20 bg-background border-r shadow-sm w-32 flex-shrink-0 flex flex-col">
                        <div className="h-14 border-b bg-muted/50 p-2 font-bold text-xs flex items-center">Job Info</div>
                        <div className="h-10 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">Status</div>

                        {/* New Dimensions */}
                        <div className="h-16 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">核心價值<br />(Core Value)</div>
                        <div className="h-12 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">薪資潛力<br />(Potential)</div>
                        <div className="h-16 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">工作壓力<br />(Pressure)</div>
                        <div className="h-20 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">主要技能<br />(Key Skills)</div>
                        <div className="h-12 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">路程<br />(Commute)</div>

                        <div className="h-24 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">Risk Analysis</div>
                        <div className="h-10 border-b p-2 text-xs font-semibold flex items-center text-muted-foreground">Actions</div>
                    </div>

                    {/* 2. Job Columns */}
                    {sortedJobs.map((job) => (
                        <div key={job.id} className="w-60 border-r flex-shrink-0 flex flex-col bg-background transition-colors hover:bg-muted/10 group">

                            {/* Row 1: Header / Title */}
                            <div className="h-14 border-b p-2 flex flex-col justify-center relative">
                                <a href={job.url} target="_blank" rel="noreferrer" className="font-bold text-sm leading-tight hover:underline line-clamp-2" title={job.title}>
                                    {job.title}
                                </a>
                                <div className="text-[10px] text-muted-foreground truncate">{job.company}</div>
                            </div>

                            {/* Row 2: Status Select */}
                            <div className="h-10 border-b p-2 flex items-center">
                                <select
                                    className={cn("w-full text-xs border rounded px-1 py-0.5 outline-none cursor-pointer",
                                        STATUS_OPTIONS.find(o => o.value === job.status)?.color
                                    )}
                                    value={job.status}
                                    onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Core Value */}
                            <div className="h-16 border-b p-2 text-xs flex items-center bg-yellow-50/30">
                                <p className="font-medium line-clamp-3" title={job.analysis.coreValue}>{job.analysis.coreValue || '-'}</p>
                            </div>

                            {/* Salary Potential */}
                            <div className="h-12 border-b p-2 text-xs flex items-center">
                                <p className="font-bold text-green-700" title={job.analysis.salaryPotential}>{job.analysis.salaryPotential || job.salaryRange || '-'}</p>
                            </div>

                            {/* Work Pressure */}
                            <div className="h-16 border-b p-2 text-xs flex items-center">
                                <p className="line-clamp-3 text-muted-foreground" title={job.analysis.workPressure}>{job.analysis.workPressure || '-'}</p>
                            </div>

                            {/* Key Skills */}
                            <div className="h-20 border-b p-2 text-xs flex items-center">
                                <p className="line-clamp-4 font-mono text-[10px] text-blue-600" title={job.analysis.keySkills}>{job.analysis.keySkills || '-'}</p>
                            </div>

                            {/* Commute */}
                            <div className="h-12 border-b p-2 text-xs flex items-center">
                                <p className="truncate" title={job.analysis.commute}>{job.analysis.commute || job.location || '-'}</p>
                            </div>

                            {/* Risk */}
                            <div className="h-24 border-b p-2 text-xs">
                                <div className="mb-1 flex items-center gap-1">
                                    <span className="text-muted-foreground">Match:</span>
                                    <Badge variant="outline" className={cn(
                                        "h-5 px-1",
                                        job.analysis.matchScore >= 80 ? "text-green-600 border-green-200" :
                                            job.analysis.matchScore >= 60 ? "text-yellow-600 border-yellow-200" : "text-red-600 border-red-200"
                                    )}>
                                        {job.analysis.matchScore}%
                                    </Badge>
                                </div>
                                <div className="mb-1 flex items-center gap-1">
                                    <span className="text-muted-foreground">Risk:</span>
                                    <span className={cn(
                                        "font-bold uppercase",
                                        job.analysis.riskAnalysis.level === 'low' ? 'text-green-600' :
                                            job.analysis.riskAnalysis.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                    )}>{job.analysis.riskAnalysis.level}</span>
                                </div>
                                {job.analysis.riskAnalysis.flags.length > 0 && (
                                    <ul className="list-disc pl-3 text-[10px] text-muted-foreground leading-tight">
                                        {job.analysis.riskAnalysis.flags.slice(0, 2).map((f, i) => (
                                            <li key={i}>{f}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Row 6: Actions */}
                            <div className="h-10 border-b p-2 flex justify-center items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(job.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                                <a href={job.url} target="_blank" rel="noreferrer">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                        <ExternalLink className="w-3 h-3" />
                                    </Button>
                                </a>
                            </div>

                        </div>
                    ))}

                    {savedJobs.length === 0 && (
                        <div className="p-8 text-muted-foreground text-sm">
                            No jobs saved yet. Go to a job page and use the extension popup to analyze and save jobs.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const SidePanel = () => (
    <JobProvider>
        <ComparisonTable />
    </JobProvider>
);
