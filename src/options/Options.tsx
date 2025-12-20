import React, { useState } from 'react';
import { Settings } from './Settings';
import { UsageStats } from './UsageStats';
import { Dashboard } from './Dashboard';
import { useJobContext, JobProvider } from '../contexts/JobContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Briefcase, LayoutDashboard, Settings as SettingsIcon, Trash2, ExternalLink, BarChart3, CheckCircle, XCircle } from 'lucide-react';

export const Options: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'settings' | 'usage'>('dashboard');

    return (
        <JobProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl text-primary">
                            <Briefcase className="w-6 h-6" />
                            JobRadar AI <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-normal">Dashboard</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-[200px_1fr] gap-6">
                    <aside className="space-y-2">
                        <Button variant={view === 'dashboard' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setView('dashboard')}>
                            <LayoutDashboard className="w-4 h-4 mr-2" /> My Jobs
                        </Button>
                        <Button variant={view === 'settings' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setView('settings')}>
                            <SettingsIcon className="w-4 h-4 mr-2" /> Settings
                        </Button>
                        <Button variant={view === 'usage' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setView('usage')}>
                            <BarChart3 className="w-4 h-4 mr-2" /> Usage & Cost
                        </Button>
                    </aside>

                    <main>
                        {view === 'dashboard' && <Dashboard />}
                        {view === 'settings' && <Settings />}
                        {view === 'usage' && <UsageStats />}
                    </main>
                </div>
            </div>
        </JobProvider>
    );
};
