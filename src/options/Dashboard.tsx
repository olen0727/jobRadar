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

    if (loading) {
        return <div className="p-8 text-center">Loading jobs...</div>;
    }

    const filteredJobs = savedJobs.filter(job => filter === 'all' || job.status === filter);

    const getStatusColor = (status: JobEntry['status']) => {
        switch (status) {
            case 'applied': return 'bg-blue-100 text-blue-800';
            case 'interviewing': return 'bg-purple-100 text-purple-800';
            case 'offer': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>My Jobs</CardTitle>
                            <CardDescription>Manage and track your job applications.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'applied', 'interviewing', 'offer', 'rejected'] as const).map((s) => (
                                <Button
                                    key={s}
                                    variant={filter === s ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilter(s)}
                                    className="capitalize"
                                >
                                    {s}
                                </Button>
                            ))}
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
                                <Card key={job.id} className="overflow-hidden">
                                    <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg truncate">{job.title}</h3>
                                                <Badge className={getStatusColor(job.status)} variant="secondary">
                                                    {job.status}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span className="font-semibold text-foreground">{job.company}</span>
                                                <span>•</span>
                                                <span>{job.location}</span>
                                                <span>•</span>
                                                <span>{job.salaryRange}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm mt-2">
                                                <div className={`font-bold flex items-center gap-1 ${getMatchScoreColor(job.analysis?.matchScore || 0)}`}>
                                                    Match: {job.analysis?.matchScore || '?'}%
                                                </div>
                                                <div className="text-muted-foreground text-xs">
                                                    Added: {new Date(job.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                                                <Button size="icon" variant="outline" title="Open Job Link">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>

                                            <select
                                                className="h-9 w-[130px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                                value={job.status}
                                                onChange={(e) => updateJobStatus(job.id, e.target.value as any)}
                                            >
                                                <option value="new">New</option>
                                                <option value="applied">Applied</option>
                                                <option value="interviewing">Interviewing</option>
                                                <option value="offer">Offer</option>
                                                <option value="rejected">Rejected</option>
                                            </select>

                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => {
                                                    if (confirm('Delete this job?')) deleteJob(job.id);
                                                }}
                                                title="Delete Job"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Analysis Summary Preview */}
                                    {job.analysis && (
                                        <div className="bg-muted/30 px-4 py-3 border-t text-sm">
                                            <p className="line-clamp-2 text-muted-foreground">
                                                <span className="font-semibold text-foreground mr-1">AI Summary:</span>
                                                {job.analysis.summary}
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
