import React, { useState } from 'react';
import { Settings } from './Settings';
import { UsageStats } from './UsageStats';
import { Dashboard } from './Dashboard';
import { JobProvider } from '../contexts/JobContext';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Briefcase, LayoutDashboard, Settings as SettingsIcon, BarChart3 } from 'lucide-react';

const OptionsContent: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'settings' | 'usage'>('dashboard');
    const { showConfirm } = useToast();
    const hasShownToast = React.useRef(false);

    const handleNavigate = (newView: 'dashboard' | 'settings' | 'usage') => {
        window.location.hash = newView;
    };

    React.useEffect(() => {
        const syncViewWithHash = () => {
            const hash = window.location.hash.toLowerCase();
            if (hash.includes('settings')) setView('settings');
            else if (hash.includes('usage')) setView('usage');
            else if (hash.includes('dashboard')) setView('dashboard');
        };

        syncViewWithHash(); // Initial sync

        window.addEventListener('hashchange', syncViewWithHash);

        // Modal reminders logic
        const hash = window.location.hash;
        if (!hasShownToast.current) {
            if (hash.includes('remind=location')) {
                hasShownToast.current = true;
                setTimeout(() => {
                    showConfirm(
                        '完善個人資訊',
                        '請填寫您的完整地址，讓路程計算更準確哦！',
                        '立即填寫',
                        () => {
                            window.dispatchEvent(new CustomEvent('focus-home-location'));
                        }
                    );
                }, 800);
            } else if (hash.includes('quota=exceeded')) {
                hasShownToast.current = true;
                setTimeout(() => {
                    showConfirm(
                        '試用額度已用完',
                        '您的試用額度已用完，請填寫您的 API Key 以繼續使用，本服務所有資訊皆儲存於您的本地端，不必擔心資料外洩。',
                        '立即填寫',
                        () => {
                            window.dispatchEvent(new CustomEvent('focus-api-key'));
                        }
                    );
                }, 800);
            }
        }

        return () => window.removeEventListener('hashchange', syncViewWithHash);
    }, [showConfirm]);

    return (
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
                    <Button variant={view === 'dashboard' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => handleNavigate('dashboard')}>
                        <LayoutDashboard className="w-4 h-4 mr-2" /> My Jobs
                    </Button>
                    <Button variant={view === 'settings' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => handleNavigate('settings')}>
                        <SettingsIcon className="w-4 h-4 mr-2" /> Settings
                    </Button>
                    <Button variant={view === 'usage' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => handleNavigate('usage')}>
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
    );
};

export const Options: React.FC = () => {
    return (
        <JobProvider>
            <ToastProvider>
                <OptionsContent />
            </ToastProvider>
        </JobProvider>
    );
};
