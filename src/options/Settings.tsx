import React, { useState, useEffect } from 'react';
import { useJobContext } from '../contexts/JobContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import type { UserProfile } from '../types';

export const Settings: React.FC = () => {
    const { userProfile, saveProfile, loading } = useJobContext();
    const [formData, setFormData] = useState<UserProfile>({
        name: '',
        targetRole: '',
        yearsOfExperience: 0,
        skills: [],
        financialGoal: '',
        preferredWorkStyle: '',
        homeLocation: '',
        experience: '',
        bio: '',
        apiKey: '',
        geminiApiKey: '',
        apiProvider: 'openai'
    });
    const [skillsInput, setSkillsInput] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (userProfile) {
            setFormData(userProfile);
            setSkillsInput(userProfile.skills.join(', '));
        }
    }, [userProfile]);

    useEffect(() => {
        const handleFocusRequest = () => {
            const addressInput = document.getElementById('homeLocation');
            if (addressInput) {
                addressInput.focus();
                addressInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        window.addEventListener('focus-home-location', handleFocusRequest);

        const handleFocusApiKey = () => {
            const id = formData.apiProvider === 'openai' ? 'apiKey' : 'geminiApiKey';
            const input = document.getElementById(id);
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        window.addEventListener('focus-api-key', handleFocusApiKey);

        return () => {
            window.removeEventListener('focus-home-location', handleFocusRequest);
            window.removeEventListener('focus-api-key', handleFocusApiKey);
        };
    }, [formData.apiProvider]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'yearsOfExperience' ? Number(value) : value
        }));
    };

    const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSkillsInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updatedProfile: UserProfile = {
                ...formData,
                skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean)
            };
            await saveProfile(updatedProfile);
            setMessage('Profile saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to save profile.');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardHeader>
                <CardTitle>User Profile & Settings</CardTitle>
                <CardDescription>
                    Configure your professional background and AI settings. This context is used to analyze job descriptions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Olen" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="targetRole">Target Role</Label>
                            <Input id="targetRole" name="targetRole" value={formData.targetRole} onChange={handleChange} placeholder="e.g. Senior Frontend Engineer" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                            <Input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" value={formData.yearsOfExperience} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="preferredWorkStyle">Work Style</Label>
                            <Input id="preferredWorkStyle" name="preferredWorkStyle" value={formData.preferredWorkStyle} onChange={handleChange} placeholder="Remote, Hybrid..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="skills">Core Skills (Comma separated)</Label>
                        <Input id="skills" value={skillsInput} onChange={handleSkillsChange} placeholder="React, TypeScript, Node.js, AWS..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="financialGoal">Career/Financial Goal</Label>
                        <Textarea
                            id="financialGoal"
                            name="financialGoal"
                            value={formData.financialGoal}
                            onChange={handleChange}
                            placeholder="e.g. Seeking high growth startup or stable corp with > 2M TWD/year."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="homeLocation">Home Location (for Commute Calc)</Label>
                        <Input
                            id="homeLocation"
                            name="homeLocation"
                            placeholder="e.g. Taipei City, Xinyi District (or full address)"
                            value={formData.homeLocation || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="experience">Work Experience (經歷)</Label>
                        <Textarea
                            id="experience"
                            name="experience"
                            placeholder="Paste your work experience here or use Resume Parser..."
                            value={formData.experience || ''}
                            onChange={handleChange}
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Biography (自傳)</Label>
                        <Textarea
                            id="bio"
                            name="bio"
                            placeholder="Paste your bio/autobiography here..."
                            value={formData.bio || ''}
                            onChange={handleChange}
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label>AI Provider</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={formData.apiProvider === 'openai' ? 'default' : 'outline'}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setFormData(prev => ({ ...prev, apiProvider: 'openai' }));
                                    }}
                                    className="w-1/2"
                                >
                                    OpenAI
                                </Button>
                                <Button
                                    type="button"
                                    variant={formData.apiProvider === 'gemini' ? 'default' : 'outline'}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setFormData(prev => ({ ...prev, apiProvider: 'gemini' }));
                                    }}
                                    className="w-1/2"
                                >
                                    Google Gemini
                                </Button>
                            </div>
                        </div>

                        {formData.apiProvider === 'openai' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey" className="text-destructive font-bold">OpenAI API Key</Label>
                                    <Input
                                        id="apiKey"
                                        name="apiKey"
                                        type="password"
                                        value={formData.apiKey}
                                        onChange={handleChange}
                                        placeholder="sk-..."
                                        required={formData.apiProvider === 'openai'}
                                    />
                                    <p className="text-xs text-muted-foreground">Stored locally. Used for analysis.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="openaiModel">OpenAI Model</Label>
                                    <select
                                        id="openaiModel"
                                        name="openaiModel"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.openaiModel || 'gpt-4o'}
                                        onChange={(e) => setFormData(prev => ({ ...prev, openaiModel: e.target.value as any }))}
                                    >
                                        <option value="gpt-5.2">GPT-5.2 (Ultra)</option>
                                        <option value="gpt-5.1">GPT-5.1 (High)</option>
                                        <option value="gpt-5">GPT-5 (Standard)</option>
                                        <option value="gpt-5-mini">GPT-5-mini (Flash)</option>
                                        <option value="gpt-4.1">GPT-4.1 (Pro)</option>
                                        <option value="gpt-4.1-mini">GPT-4.1-mini (Flash)</option>
                                        <option value="gpt-4o">GPT-4o (Classic)</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">Select the OpenAI model variant to use.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="geminiApiKey" className="text-blue-600 font-bold">Gemini API Key</Label>
                                    <Input
                                        id="geminiApiKey"
                                        name="geminiApiKey"
                                        type="password"
                                        value={formData.geminiApiKey || ''}
                                        onChange={handleChange}
                                        placeholder="AIza..."
                                        required={formData.apiProvider === 'gemini'}
                                    />
                                    <p className="text-xs text-muted-foreground">Stored locally.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="geminiModel">Gemini Model</Label>
                                    <select
                                        id="geminiModel"
                                        name="geminiModel"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.geminiModel || 'gemini-3-flash-preview'}
                                        onChange={(e) => setFormData(prev => ({ ...prev, geminiModel: e.target.value as any }))}
                                    >
                                        <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">Select the model variant to use.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full">Save Settings</Button>
                    {message && <p className="text-center text-sm font-medium text-green-600 animate-pulse">{message}</p>}
                </form>
            </CardContent>
        </Card >
    );
};
