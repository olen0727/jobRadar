import React, { useState } from 'react';
import { useJobContext } from '../contexts/JobContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ExternalLink, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { JobEntry } from '../types';

export const Dashboard: React.FC = () => {
    const { savedJobs, deleteJob, updateJobStatus, loading } = useJobContext();
    const [filter, setFilter] = useState<'all' | 'applied' | 'interviewing' | 'rejected' | 'offer'>('all');
    const [showAllDetails, setShowAllDetails] = useState(false);

    if (loading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    const filteredJobs = savedJobs.filter(job => filter === 'all' || job.status === filter);


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>My Jobs</CardTitle>
                            <CardDescription>Manage and track your job applications.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                                {(['all', 'applied', 'interviewing', 'offer', 'rejected'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        variant={filter === s ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setFilter(s)}
                                        className="capitalize h-8 px-3 text-xs"
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
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
                </CardHeader>
                <CardContent>
                    {filteredJobs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {filter === 'all' ? 'No saved jobs found. Start by pinning some jobs!' : `No jobs found with status "${filter}".`}
                        </div>
                    ) : (
                        <div className="grid gap-4">
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
                </CardContent>
            </Card>
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

    const getStatusColor = (status: JobEntry['status']) => {
        switch (status) {
            case 'applied': return 'bg-blue-100 text-blue-800';
            case 'interviewing': return 'bg-purple-100 text-purple-800';
            case 'offer': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600';
            case 'medium': return 'text-yellow-600';
            case 'high': return 'text-orange-600';
            case 'critical': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <Card className="overflow-hidden">
            {/* 上方區塊 */}
            <div className="p-4 border-b bg-muted/10">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-lg">{job.title}</h3>
                        {isExpanded && (
                            <p className="text-sm text-muted-foreground">
                                {job.company} {job.location && `• ${job.location}`}
                            </p>
                        )}
                    </div>
                    <Badge className={getStatusColor(job.status)} variant="secondary">
                        {job.status}
                    </Badge>
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
                        <div className="p-2 rounded bg-muted/30">
                            <div className={`font-bold ${getScoreColor(analysis?.matchScore || 0)}`}>
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">契合度:</label>
                                {analysis?.matchScore || 0}%
                            </div>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                            <div className={`font-bold capitalize ${getRiskColor(analysis?.riskAnalysis?.level || '')}`}>
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">風險:</label>
                                {analysis?.riskAnalysis?.level || '未知'}
                            </div>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                            <div className="font-bold text-blue-600">
                                <label className="mr-2 text-muted-foreground font-normal text-xs uppercase tracking-wider">路程:</label>
                                {analysis?.commuteLabel || '未知'}
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

            {/* Actions 區塊 */}
            <div className="p-4 bg-muted/20 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <select
                        className="h-8 w-[120px] rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:ring-1 focus:ring-ring"
                        value={job.status}
                        onChange={(e) => onUpdateStatus(job.id, e.target.value as any)}
                    >
                        <option value="saved">Saved</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                        <option value="ghosted">Ghosted</option>
                    </select>

                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <ExternalLink className="w-3 h-3" />
                            連結
                        </Button>
                    </a>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[10px] text-muted-foreground">
                        Added: {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                            if (confirm('確定要刪除此職缺？')) onDelete(job.id);
                        }}
                        title="Delete Job"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
