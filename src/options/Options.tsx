import React, { useState } from 'react';
import { Settings } from './Settings';
import { JobProvider } from '../contexts/JobContext';
import { Button } from '../components/ui/button';

export const Options: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('settings');

    return (
        <JobProvider>
            <div className="min-h-screen bg-background p-8">
                <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold tracking-tight">JobRadar AI</h1>
                        <nav className="flex space-x-2 bg-muted p-1 rounded-lg">
                            <Button
                                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('dashboard')}
                                disabled // Disabled for now until Dashboard is built
                            >
                                Dashboard
                            </Button>
                            <Button
                                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab('settings')}
                            >
                                Settings
                            </Button>
                        </nav>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto">
                    {activeTab === 'dashboard' ? (
                        <div className="text-center py-20 text-muted-foreground">
                            Dashboard coming soon...
                        </div>
                    ) : (
                        <Settings />
                    )}
                </main>
            </div>
        </JobProvider>
    );
};
