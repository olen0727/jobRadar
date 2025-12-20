import React, { useState } from 'react';
import { JobProvider, useJobContext } from '../contexts/JobContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Settings as SettingsIcon, Briefcase, LayoutDashboard, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { JobEntry, JobStatus } from '../types';
import { Settings } from '../options/Settings';
import { UsageStats } from '../options/UsageStats';



const MatrixView: React.FC = () => {
    const { savedJobs, updateJobStatus, deleteJob } = useJobContext();

    // Sort jobs by created date descending (newest first)
    const sortedJobs = [...savedJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        if (newStatus === 'deleted') {
            if (confirm('確定要刪除此職缺？')) await deleteJob(jobId);
        } else {
            await updateJobStatus(jobId, newStatus as JobStatus);
        }
    };

    const getStatusInfo = (status: JobStatus) => {
        switch (status) {
            case 'saved': return { label: '待處理', color: 'bg-slate-100 text-slate-800 border-slate-200' };
            case 'applied': return { label: '投遞', color: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'interviewing': return { label: '面試', color: 'bg-purple-100 text-purple-800 border-purple-200' };
            case 'offer': return { label: '錄取', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
            case 'rejected': return { label: '拒絕', color: 'bg-rose-100 text-rose-800 border-rose-200' };
            default: return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200' };
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-muted/20 relative">
            <div className="flex min-w-max">
                {/* 1. Left Header Column (Sticky) */}
                <div className="sticky left-0 z-20 bg-background border-r shadow-sm w-36 flex-shrink-0 flex flex-col">
                    <div className="h-16 border-b bg-muted/50 p-2 font-bold text-[10px] uppercase tracking-wider flex items-center text-slate-500">Job Basic</div>
                    <div className="h-12 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-50/50">Status</div>

                    <div className="h-14 border-b p-2 text-xs font-bold flex items-center text-slate-700">契合度 / 風險</div>

                    <div className="h-20 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-50/50">薪資與壓力</div>
                    <div className="h-20 border-b p-2 text-xs font-bold flex items-center text-slate-700">核心價值</div>
                    <div className="h-24 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-50/50">主要技能</div>

                    <div className="h-28 border-b p-2 text-xs font-bold flex items-center text-slate-700">分數說明</div>
                    <div className="h-20 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-50/50">風險標記</div>
                    <div className="h-24 border-b p-2 text-xs font-bold flex items-center text-slate-700">通勤細節</div>
                    <div className="h-32 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-900 text-slate-400">AI 策略建議</div>
                </div>

                {/* 2. Job Columns */}
                {sortedJobs.map((job) => (
                    <div key={job.id} className="w-64 border-r flex-shrink-0 flex flex-col bg-background transition-colors hover:bg-muted/5">
                        {/* Job Info */}
                        <div className="h-16 border-b p-3 flex flex-col justify-center bg-muted/5">
                            <a href={job.url} target="_blank" rel="noreferrer" className="font-bold text-xs leading-tight hover:underline line-clamp-2" title={job.title}>
                                {job.title}
                            </a>
                            <div className="text-[10px] text-muted-foreground truncate font-medium mt-1">{job.company}</div>
                        </div>

                        {/* Status Select */}
                        <div className="h-12 border-b p-2 flex items-center bg-slate-50/50">
                            <select
                                className={cn("w-full h-8 rounded-md border px-2 py-1 text-[11px] font-semibold shadow-sm focus:ring-1 transition-colors",
                                    getStatusInfo(job.status).color
                                )}
                                value={job.status}
                                onChange={(e) => handleStatusChange(job.id, e.target.value)}
                            >
                                <option value="saved">待處理</option>
                                <option value="applied">投遞</option>
                                <option value="interviewing">面試</option>
                                <option value="offer">錄取</option>
                                <option value="rejected">拒絕</option>
                                <option disabled>──────────</option>
                                <option value="deleted">🗑️ 刪除職缺</option>
                            </select>
                        </div>

                        {/* Score & Risk Summary */}
                        <div className="h-14 border-b p-2 flex flex-col justify-center gap-1.5">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className={cn(
                                    "px-1 text-[10px]",
                                    job.analysis.matchScore >= 80 ? "text-green-600 border-green-200 bg-green-50" :
                                        job.analysis.matchScore >= 60 ? "text-yellow-600 border-yellow-200 bg-yellow-50" : "text-red-600 border-red-200 bg-red-50"
                                )}>
                                    Match: {job.analysis.matchScore}%
                                </Badge>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase",
                                    job.analysis.riskAnalysis.level === 'low' ? 'text-green-600' :
                                        job.analysis.riskAnalysis.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                )}>{job.analysis.riskAnalysis.level} Risk</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] truncate max-w-full block text-center">
                                {job.analysis.commuteLabel || '地區未知'}
                            </Badge>
                        </div>

                        {/* Salary & Pressure */}
                        <div className="h-20 border-b p-2 text-[11px] flex flex-col justify-center gap-1 bg-slate-50/50">
                            <div>
                                <span className="text-slate-400 text-[10px] block">薪資潛力</span>
                                <p className="font-bold text-slate-700 line-clamp-1">{job.analysis.salaryPotential || '-'}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block">工作壓力</span>
                                <p className="line-clamp-1 text-slate-600 italic">{job.analysis.workPressure || '-'}</p>
                            </div>
                        </div>

                        {/* Core Value */}
                        <div className="h-20 border-b p-2 text-[11px] flex items-center overflow-hidden">
                            <p className="line-clamp-3 text-slate-700" title={job.analysis.coreValue}>{job.analysis.coreValue || '-'}</p>
                        </div>

                        {/* Key Skills */}
                        <div className="h-24 border-b p-2 text-[11px] flex items-center bg-slate-50/50 overflow-hidden">
                            <p className="line-clamp-4 font-mono text-[10px] text-blue-600 leading-tight" title={job.analysis.keySkills}>{job.analysis.keySkills || '-'}</p>
                        </div>

                        {/* Score Explanation */}
                        <div className="h-28 border-b p-2 text-[10px] flex items-center overflow-hidden">
                            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                                {Array.isArray(job.analysis.matchScoreExplanation) && job.analysis.matchScoreExplanation.length > 0 ? (
                                    job.analysis.matchScoreExplanation.slice(0, 4).map((exp, i) => (
                                        <li key={i} className="line-clamp-1 truncate">{exp}</li>
                                    ))
                                ) : (
                                    <li>無特別說明</li>
                                )}
                            </ul>
                        </div>

                        {/* Risk Flags */}
                        <div className="h-20 border-b p-2 text-[10px] flex items-center bg-slate-50/50 overflow-hidden">
                            <ul className="list-disc list-inside space-y-0.5 text-rose-500 font-medium">
                                {Array.isArray(job.analysis.riskAnalysis?.flags) && job.analysis.riskAnalysis.flags.length > 0 ? (
                                    job.analysis.riskAnalysis.flags.slice(0, 3).map((flag, i) => (
                                        <li key={i} className="line-clamp-1 truncate">{flag}</li>
                                    ))
                                ) : (
                                    <li className="text-slate-400 font-normal">無風險標記</li>
                                )}
                            </ul>
                        </div>

                        {/* Commute Description */}
                        <div className="h-24 border-b p-2 text-[10px] flex items-center overflow-hidden">
                            <p className="text-slate-500 leading-normal line-clamp-4" title={job.analysis.commuteDescription}>
                                {job.analysis.commuteDescription || '無詳細資訊'}
                            </p>
                        </div>

                        {/* Strategic AI Advice (Dark IDE Theme) */}
                        <div className="h-32 border-b p-3 bg-slate-900 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] uppercase tracking-widest font-black text-slate-600">Advice</span>
                            </div>
                            <p className="text-slate-200 text-[11px] leading-relaxed italic font-medium line-clamp-4">
                                "{job.analysis.strategicAdvice || '無特定建議'}"
                            </p>
                        </div>
                    </div>
                ))}

                {savedJobs.length === 0 && (
                    <div className="p-10 text-muted-foreground text-sm italic text-center w-full">
                        No jobs saved yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export const SidePanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'jobs' | 'settings' | 'usage'>('jobs');

    return (
        <JobProvider>
            <div className="h-screen flex flex-col bg-background text-foreground">
                {/* Simplified Header with Tabs */}
                <div className="border-b bg-white z-10 sticky top-0 px-2 py-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 font-bold text-sm text-primary">
                            <Briefcase className="w-4 h-4" />
                            JobRadar AI
                        </div>
                    </div>

                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <Button
                            variant={activeTab === 'jobs' ? 'default' : 'ghost'}
                            size="sm"
                            className="flex-1 h-8 text-[11px] gap-1.5"
                            onClick={() => setActiveTab('jobs')}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            My jobs
                        </Button>
                        <Button
                            variant={activeTab === 'settings' ? 'default' : 'ghost'}
                            size="sm"
                            className="flex-1 h-8 text-[11px] gap-1.5"
                            onClick={() => setActiveTab('settings')}
                        >
                            <SettingsIcon className="w-3.5 h-3.5" />
                            Settings
                        </Button>
                        <Button
                            variant={activeTab === 'usage' ? 'default' : 'ghost'}
                            size="sm"
                            className="flex-1 h-8 text-[11px] gap-1.5"
                            onClick={() => setActiveTab('usage')}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Usage
                        </Button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'jobs' && <MatrixView />}
                    {activeTab === 'settings' && (
                        <div className="flex-1 overflow-auto p-4 bg-muted/10">
                            <Settings />
                        </div>
                    )}
                    {activeTab === 'usage' && (
                        <div className="flex-1 overflow-auto p-4 bg-muted/10">
                            <UsageStats />
                        </div>
                    )}
                </div>
            </div>
        </JobProvider>
    );
};
