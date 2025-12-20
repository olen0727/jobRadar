import React, { useState } from 'react';
import { useJobContext } from '../contexts/JobContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, LayoutGrid, List as ListIcon } from 'lucide-react';
import type { JobEntry } from '../types';

export const Dashboard: React.FC = () => {
    const { savedJobs, deleteJob, updateJobStatus, loading } = useJobContext();
    const [filter, setFilter] = useState<'all' | 'saved' | 'applied' | 'offer' | 'rejected'>('all');
    const [showAllDetails, setShowAllDetails] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    if (loading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    // 1. 排序：最新增加的在最前面
    const sortedJobs = [...savedJobs].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filteredJobs = sortedJobs.filter(job => filter === 'all' || job.status === filter);

    return (
        <div className="space-y-6">
            {/* 頂部工具列：獨立於卡片之外，增加清晰度 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">My Jobs</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage and track your job applications.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* 視圖切換按鈕 */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mr-2">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('list')}
                            title="列表視圖"
                        >
                            <ListIcon className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('grid')}
                            title="卡片視圖"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {(['all', 'saved', 'applied', 'offer', 'rejected'] as const).map((s) => (
                            <Button
                                key={s}
                                variant={filter === s ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter(s)}
                                className="capitalize h-8 px-3 text-xs"
                            >
                                {s === 'saved' ? '待處理' : s === 'applied' ? '投遞' : s === 'offer' ? '錄取' : s === 'rejected' ? '拒絕' : '全部'}
                            </Button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                    <Button
                        variant={showAllDetails ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 gap-2 text-xs"
                        onClick={() => setShowAllDetails(!showAllDetails)}
                    >
                        <AlertTriangle className={`w-3.5 h-3.5 ${showAllDetails ? 'animate-pulse' : ''}`} />
                        {showAllDetails ? '全頁詳細' : '全頁簡短'}
                    </Button>
                </div>
            </div>

            {/* 職缺列表內容 */}
            <div className="pb-8">
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 text-sm italic">
                        {filter === 'all' ? 'No saved jobs found. Start by pinning some jobs!' : `No jobs found with status "${filter}".`}
                    </div>
                ) : (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {filteredJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                isExpanded={showAllDetails}
                                onUpdateStatus={updateJobStatus}
                                onDelete={deleteJob}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface JobCardProps {
    job: JobEntry;
    isExpanded: boolean;
    onUpdateStatus: (id: string, status: JobEntry['status']) => void;
    onDelete: (id: string) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isExpanded, onUpdateStatus, onDelete }) => {
    const { analysis } = job;

    const getStatusInfo = (status: JobEntry['status']) => {
        switch (status) {
            case 'saved': return { label: '待處理', color: 'bg-slate-100 text-slate-800 border-slate-200' };
            case 'applied': return { label: '投遞', color: 'bg-blue-100 text-blue-800 border-blue-200' };
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
            case 'critical': return 'bg-red-100 text-red-900 border-red-200 font-bold underline';
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
        <Card className="overflow-hidden bg-white border-slate-200 shadow-md transition-all hover:shadow-lg hover:border-slate-300">
            {/* 上方區塊 */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-lg">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {job.company} {isExpanded && job.location && `· ${job.location}`}
                        </p>
                    </div>
                    <select
                        className={`h-8 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm focus:ring-1 focus:ring-ring transition-colors ${getStatusInfo(job.status).color}`}
                        value={job.status}
                        onChange={(e) => {
                            const newStatus = e.target.value as any;
                            if (newStatus === 'deleted') {
                                if (confirm('確定要刪除此職缺？')) onDelete(job.id);
                            } else {
                                onUpdateStatus(job.id, newStatus);
                            }
                        }}
                    >
                        <option value="saved">待處理</option>
                        <option value="applied">投遞</option>
                        <option value="offer">錄取</option>
                        <option value="rejected">拒絕</option>
                        <option disabled>──────────</option>
                        <option value="deleted" className="text-destructive font-bold">🗑️ 刪除職缺</option>
                    </select>
                </div>
            </div>

            {/* 主要內容區塊 */}
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="font-semibold text-foreground block">薪資潛力</span>
                        <p className="text-muted-foreground">{analysis?.salaryPotential || '無'}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-foreground block">工作壓力</span>
                        <p className="text-muted-foreground">{analysis?.workPressure || '無'}</p>
                    </div>
                    {isExpanded && (
                        <>
                            <div>
                                <span className="font-semibold text-foreground block">核心價值</span>
                                <p className="text-muted-foreground">{analysis?.coreValue || '無'}</p>
                            </div>
                            <div>
                                <span className="font-semibold text-foreground block">主要技能</span>
                                <p className="text-muted-foreground">{analysis?.keySkills || '無'}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-2 border-t">
                    {isExpanded && (
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">評分與概況</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-sm">
                        <div className={`p-2 rounded-lg border transition-colors ${getScoreStyles(analysis?.matchScore || 0)}`}>
                            <div className="font-bold flex-col items-center">
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">契合度</label>
                                <span className="text-base">{analysis?.matchScore || 0}%</span>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg border transition-colors ${getRiskStyles(analysis?.riskAnalysis?.level || '')}`}>
                            <div className="font-bold flex-col items-center">
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">風險</label>
                                <span className="text-base capitalize">{analysis?.riskAnalysis?.level || '未知'}</span>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg border transition-colors ${getCommuteStyles(analysis?.commuteLabel || '')}`}>
                            <div className="font-bold flex-col items-center">
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">路程</label>
                                <span className="text-base">{analysis?.commuteLabel || '未知'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 說明區塊 (開闔) */}
                {isExpanded && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t pt-4">
                            <div>
                                <h4 className="font-bold mb-2 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" /> 分數說明
                                </h4>
                                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                                    {Array.isArray(analysis?.matchScoreExplanation) && analysis!.matchScoreExplanation.length > 0 ? (
                                        analysis!.matchScoreExplanation.map((exp, i) => (
                                            <li key={i}>{exp}</li>
                                        ))
                                    ) : (
                                        <li>無特別說明</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-2 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-500" /> 風險標記
                                </h4>
                                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                                    {Array.isArray(analysis?.riskAnalysis?.flags) && analysis!.riskAnalysis.flags.length > 0 ? (
                                        analysis!.riskAnalysis.flags.map((flag, i) => (
                                            <li key={i}>{flag}</li>
                                        ))
                                    ) : (
                                        <li>無風險標記</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-500" /> 通勤細節
                                </h4>
                                <p className="text-muted-foreground text-xs text-pretty">
                                    {analysis?.commute || '無詳細資訊'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-muted/20 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs bg-white">
                            <ExternalLink className="w-3 h-3" />
                            查看職缺
                        </Button>
                    </a>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[10px] text-muted-foreground font-medium">
                        Added: {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </Card>
    );
};
