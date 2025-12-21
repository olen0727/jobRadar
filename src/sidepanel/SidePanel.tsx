import React, { useState } from 'react';
import { JobProvider, useJobContext } from '../contexts/JobContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Settings as SettingsIcon, Briefcase, LayoutDashboard, BarChart3, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import type { JobEntry, JobStatus } from '../types';
import { Settings } from '../options/Settings';
import { UsageStats } from '../options/UsageStats';



const Tooltip: React.FC<{ title: string; children: React.ReactNode; content: React.ReactNode }> = ({ children, content }) => {
    return (
        <div className="group relative w-full text-center">
            {children}
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-[11px] rounded-lg shadow-xl pointer-events-none border border-slate-700">
                <div className="font-bold border-b border-slate-700 pb-1.5 mb-1.5 flex items-center justify-between">
                    <span>詳細資訊</span>
                    <Clock className="w-3 h-3 text-slate-500" />
                </div>
                <div className="leading-relaxed whitespace-normal">
                    {content}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
            </div>
        </div>
    );
};

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

    const getScoreStyles = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    const getRiskStyles = (level: string) => {
        switch (level) {
            case 'low': return 'bg-green-50 text-green-700 border-green-100';
            case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'high': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'critical': return 'bg-red-100 text-red-900 border-red-200 font-bold underline cursor-help';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getCommuteStyles = (label: string) => {
        switch (label) {
            case '你家旁邊':
            case '舒適距離':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case '標準通勤':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case '舟車勞頓':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case '極限通勤':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case '遠端/外地':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-muted/20 relative font-sans">
            <div className="flex min-w-max">
                {/* 1. Left Header Column (Sticky) */}
                <div className="sticky left-0 z-20 bg-background border-r shadow-sm flex-shrink-0 flex flex-col">

                    <div className="h-12 border-b p-2 text-xs font-bold flex items-center text-slate-700 bg-slate-50/50">職缺名稱</div>
                    <div className="h-12 border-b p-2 text-xs font-bold flex items-center text-slate-700">公司名稱</div>
                    <div className="h-12 border-b p-2 text-xs font-bold flex items-center text-slate-700">公司地址</div>
                    <div className="h-14 border-b p-2 text-xs font-bold flex items-center text-slate-700">狀態Status</div>
                    <div className="h-14 border-b p-2 text-xs font-bold flex items-center text-slate-700">交通指標 ⓘ</div>
                    <div className="h-14 border-b p-2 text-xs font-bold flex items-center text-slate-700">風險 ⓘ</div>
                    <div className="h-14 border-b p-2 text-xs font-bold flex items-center text-slate-700">契合度 ⓘ</div>

                    <div className="flex-1 border-b p-2 text-xs font-bold flex items-center text-slate-500">AI策略建議</div>
                </div>

                {/* 2. Job Columns */}
                {sortedJobs.map((job) => (
                    <div key={job.id} className="w-48 border-r flex-shrink-0 flex flex-col bg-background transition-colors hover:bg-muted/5">

                        <div className="h-12 border-b p-2 flex items-center bg-slate-50/50 overflow-hidden">
                            <a href={job.url} target="_blank" rel="noreferrer" className="font-bold text-[12px] leading-tight hover:underline line-clamp-2 text-primary" title={job.title}>
                                {job.title}
                            </a>
                        </div>

                        <div className="h-12 border-b p-2 flex items-center text-[12px] font-medium text-slate-700 overflow-hidden">
                            <span className="truncate" title={job.company}>{job.company}</span>
                        </div>

                        <div className="h-12 border-b p-2 flex items-center text-[12px] text-slate-500 overflow-hidden">
                            <span className="line-clamp-2" title={job.location || job.analysis?.commuteLabel}>{job.location || '未知地址'}</span>
                        </div>

                        <div className="h-14 border-b p-2 flex items-center">
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


                        {/* 交通指標 & Tooltip (Dashboard Style) */}
                        <div className="h-14 border-b p-2 flex items-center justify-center">
                            <Tooltip title="通勤細節" content={
                                <p className="italic leading-normal text-white">
                                    {job.analysis?.commuteDescription || '無詳細資訊'}
                                </p>
                            }>
                                <div className={cn("p-2 rounded-lg border transition-all cursor-help border-dashed w-full flex flex-col items-center shadow-sm", getCommuteStyles(job.analysis?.commuteLabel || ''))}>

                                    <span className="text-sm font-black line-clamp-1">{job.analysis?.commuteLabel || '未知'}</span>
                                </div>
                            </Tooltip>
                        </div>
                        {/* 風險 & Tooltip (Dashboard Style) */}
                        <div className="h-14 border-b p-2 flex items-center justify-center">
                            <Tooltip title="風險標記" content={
                                <ul className="list-disc list-inside space-y-1 text-rose-300">
                                    {Array.isArray(job.analysis?.riskAnalysis?.flags) && job.analysis.riskAnalysis.flags.length > 0 ? (
                                        job.analysis.riskAnalysis.flags.map((flag, i) => (
                                            <li key={i}>{flag}</li>
                                        ))
                                    ) : (
                                        <li className="text-slate-400 italic">無風險標記</li>
                                    )}
                                </ul>
                            }>
                                <div className={cn("p-2 rounded-lg border transition-all cursor-help border-dashed w-full flex flex-col items-center", getRiskStyles(job.analysis?.riskAnalysis?.level || ''))}>

                                    <span className="text-sm font-black capitalize line-clamp-1">{job.analysis?.riskAnalysis?.level || '未知'}</span>
                                </div>
                            </Tooltip>
                        </div>
                        {/* 契合度 & Tooltip (Dashboard Style) */}
                        <div className="h-14 border-b p-2 flex items-center justify-center">
                            <Tooltip title="分數說明" content={
                                <ul className="list-disc list-inside space-y-1">
                                    {Array.isArray(job.analysis?.matchScoreExplanation) && job.analysis.matchScoreExplanation.length > 0 ? (
                                        job.analysis.matchScoreExplanation.map((exp, i) => (
                                            <li key={i}>{exp}</li>
                                        ))
                                    ) : (
                                        <li>無特別說明</li>
                                    )}
                                </ul>
                            }>
                                <div className={cn("p-2 rounded-lg border transition-all cursor-help border-dashed w-full flex flex-col items-center", getScoreStyles(job.analysis?.matchScore || 0))}>

                                    <span className="text-sm font-black">{job.analysis?.matchScore || 0}%</span>
                                </div>
                            </Tooltip>
                        </div>


                        {/* AI策略建議 */}
                        <div className="flex-1 border-b p-3 flex flex-col justify-center min-h-[120px]">
                            <p className="text-white text-[12px] h-full leading-relaxed font-medium bg-[#333] p-2.5 rounded-lg shadow-md">
                                "{job.analysis?.strategicAdvice || '無特定建議'}"
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
