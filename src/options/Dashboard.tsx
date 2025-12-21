import React, { useState } from 'react';
import { useJobContext } from '../contexts/JobContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
    CheckCircle,
    XCircle,
    Clock,
    LayoutGrid,
    List as ListIcon,
    GripVertical
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JobEntry } from '../types';

export const Dashboard: React.FC = () => {
    const { savedJobs, deleteJob, updateJobStatus, reorderJobs, loading } = useJobContext();
    const [filter, setFilter] = useState<'all' | 'saved' | 'applied' | 'offer' | 'rejected'>('all');
    // Load preference from localStorage, default to true (Detailed/List)
    const [showAllDetails, setShowAllDetails] = useState(() => {
        const saved = localStorage.getItem('dashboard_showAllDetails');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Save preference to localStorage when changed
    React.useEffect(() => {
        localStorage.setItem('dashboard_showAllDetails', JSON.stringify(showAllDetails));
    }, [showAllDetails]);

    if (loading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    const filteredJobs = savedJobs.filter(job => filter === 'all' || job.status === filter);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = savedJobs.findIndex((j) => j.id === active.id);
            const newIndex = savedJobs.findIndex((j) => j.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(savedJobs, oldIndex, newIndex);
                reorderJobs(newOrder);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* 頂部工具列 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">My Jobs</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage and track your job applications.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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

                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <Button
                            variant={!showAllDetails ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 gap-1.5 text-xs px-3 transition-all"
                            onClick={() => setShowAllDetails(false)}
                            title="兩欄卡片 - 簡短摘要"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            簡短
                        </Button>
                        <Button
                            variant={showAllDetails ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 gap-1.5 text-xs px-3 transition-all"
                            onClick={() => setShowAllDetails(true)}
                            title="單欄列表 - 詳細資訊"
                        >
                            <ListIcon className="w-3.5 h-3.5" />
                            詳細
                        </Button>
                    </div>
                </div>
            </div>

            {/* 職缺列表內容 */}
            <div className="pb-8">
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 text-sm italic">
                        {filter === 'all' ? 'No saved jobs found. Start by pinning some jobs!' : `No jobs found with status "${filter}".`}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredJobs.map(j => j.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className={`grid gap-6 ${!showAllDetails ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                {filteredJobs.map((job) => (
                                    <SortableJobCard
                                        key={job.id}
                                        job={job}
                                        isExpanded={showAllDetails}
                                        onUpdateStatus={updateJobStatus}
                                        onDelete={deleteJob}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

const SortableJobCard: React.FC<JobCardProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.job.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <JobCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
    );
};

interface JobCardProps {
    job: JobEntry;
    isExpanded: boolean;
    onUpdateStatus: (id: string, status: JobEntry['status']) => void;
    onDelete: (id: string) => void;
    dragHandleProps?: any;
}

const JobCard: React.FC<JobCardProps> = ({ job, isExpanded, onUpdateStatus, onDelete, dragHandleProps }) => {
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
        <Card className="overflow-hidden bg-white border-slate-200 shadow-md transition-all hover:shadow-lg hover:border-slate-300 relative group">
            {/* 上方區塊 */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <div
                    {...dragHandleProps}
                    className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="group/title truncate pr-2">
                            <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors max-w-full"
                            >
                                <h3 className="font-bold text-lg leading-snug hover:underline truncate">{job.title}</h3>
                                {/* <ExternalLink className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover/title:text-primary transition-colors" /> */}
                            </a>
                            <p className="text-sm text-muted-foreground truncate">
                                {job.company} {isExpanded && job.location && ` · ${job.location}`}
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
                                    {analysis?.commuteDescription || '無詳細資訊'}
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="bg-slate-900 rounded-lg p-3 px-4 shadow-inner border border-slate-800">
                                <p className="text-slate-200 text-sm leading-relaxed font-medium italic">
                                    "{analysis?.strategicAdvice || '無特定建議'}"
                                </p>
                                {analysis?.aiModel && (
                                    <div className="mt-2 flex justify-end">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono border border-slate-700/50">
                                            {analysis.aiModel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
