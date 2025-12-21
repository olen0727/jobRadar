import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import type { UsageLog } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';

export const UsageStats: React.FC = () => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await storage.getUsageLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('Clear all usage logs?')) return;
        await storage.clearUsageLogs();
        setLogs([]);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const totalInput = logs.reduce((acc, log) => acc + (log.inputTokens || 0), 0);
    const totalOutput = logs.reduce((acc, log) => acc + (log.outputTokens || 0), 0);
    const totalCost = logs.reduce((acc, log) => acc + (log.cost || 0), 0);

    return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Token Usage History</CardTitle>
                    <CardDescription>Recent 100 API calls cost tracking.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={fetchLogs}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
                    <Button size="sm" variant="destructive" onClick={handleClear}><Trash2 className="w-4 h-4 mr-1" /> Clear</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted rounded">
                        <div className="text-2xl font-bold">{logs.length}</div>
                        <div className="text-xs text-muted-foreground">App Calls</div>
                    </div>
                    <div className="p-4 bg-muted rounded">
                        <div className="text-2xl font-bold">{totalInput.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Input Tokens</div>
                    </div>
                    <div className="p-4 bg-muted rounded">
                        <div className="text-2xl font-bold">{totalOutput.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Output Tokens</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded border border-green-200">
                        <div className="text-2xl font-bold text-green-700">${totalCost.toFixed(5)}</div>
                        <div className="text-xs text-muted-foreground">Total Est. Cost (USD)</div>
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-2">Time</th>
                                <th className="p-2">Provider</th>
                                <th className="p-2">Model</th>
                                <th className="p-2">Operation</th>
                                <th className="p-2 text-right">In</th>
                                <th className="p-2 text-right">Out</th>
                                <th className="p-2 text-right">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No logs recorded yet.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-t hover:bg-muted/20">
                                        <td className="p-2 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs ${log.provider === 'openai' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {log.provider}
                                            </span>
                                        </td>
                                        <td className="p-2 font-mono text-xs">{log.model}</td>
                                        <td className="p-2">{log.operation}</td>
                                        <td className="p-2 text-right font-mono text-xs">{log.inputTokens?.toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono text-xs">{log.outputTokens?.toLocaleString()}</td>
                                        <td className="p-2 text-right font-bold text-green-700 font-mono">${log.cost?.toFixed(5) || '0.000'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
