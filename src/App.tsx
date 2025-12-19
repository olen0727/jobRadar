import { useEffect, useState } from 'react';
import { JobProvider, useJobContext } from './contexts/JobContext';
import { scrapePageScript } from './services/scraper';
import type { ScrapedJobData } from './services/scraper';
import { analyzeJob, parseResume } from './services/ai';
import type { AnalysisResult, JobEntry, UserProfile } from './types';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Skeleton } from './components/ui/skeleton';
import { AlertCircle, Briefcase, CheckCircle, ExternalLink, ShieldAlert, Sparkles, XCircle, FileText, Search, ArrowLeft } from 'lucide-react';
import { cn } from './lib/utils';
import { v4 as uuidv4 } from 'uuid';

type ViewMode = 'menu' | 'job' | 'resume';

const PopupContent = () => {
  const { userProfile, saveProfile, loading: contextLoading, addJob } = useJobContext();
  const [mode, setMode] = useState<ViewMode>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job Flow State
  const [jobData, setJobData] = useState<ScrapedJobData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [jobSaved, setJobSaved] = useState(false);

  // Resume Flow State
  const [parsedProfile, setParsedProfile] = useState<UserProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    // If no API Key, stay on menu or redirect
    if (!contextLoading && userProfile && !userProfile.apiKey) {
      // Allow menu access, but warn on actions
    }
  }, [contextLoading, userProfile]);

  const openDashboard = () => chrome.runtime.openOptionsPage();

  const getActiveTabContent = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('No active tab found');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePageScript,
    });
    return result;
  };

  const startJobAnalysis = async () => {
    setMode('job');
    setLoading(true);
    setError(null);
    try {
      if (!userProfile?.apiKey) throw new Error('Please set API Key in Options first.');

      const result = await getActiveTabContent();
      if (!result || !result.description || result.description.length < 50) {
        throw new Error('No valid job description found on this page.');
      }
      setJobData(result);

      const aiResult = await analyzeJob(result, userProfile);
      setAnalysis(aiResult);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const startResumeParsing = async () => {
    setMode('resume');
    setLoading(true);
    setError(null);
    setParsedProfile(null);
    setProfileSaved(false);

    try {
      if (!userProfile?.apiKey) throw new Error('Please set API Key in Options first.');

      const result = await getActiveTabContent();
      if (!result || !result.description || result.description.length < 50) {
        throw new Error('No valid text found on this page to parse.');
      }

      // Use description (full text) for resume parsing
      const newProfile = await parseResume(result.description, userProfile);
      setParsedProfile(newProfile);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async () => {
    if (!jobData || !analysis) return;
    const newJob: JobEntry = {
      id: uuidv4(),
      url: jobData.url,
      title: jobData.title,
      company: jobData.company,
      salaryRange: jobData.salary,
      location: jobData.location,
      platform: jobData.platform,
      status: 'saved',
      analysis: analysis,
      createdAt: new Date().toISOString()
    };
    await addJob(newJob);
    setJobSaved(true);
  };

  const handleUpdateProfile = async () => {
    if (!parsedProfile) return;
    await saveProfile(parsedProfile);
    setProfileSaved(true);
  };

  if (contextLoading) return <div className="p-8 text-center">Loading context...</div>;

  // VIEW: MENU (Landing)
  if (mode === 'menu') {
    return (
      <div className="w-[400px] min-h-[500px] bg-background text-foreground flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Briefcase className="w-5 h-5" /> JobRadar AI
          </div>
          <Button variant="ghost" size="icon" onClick={openDashboard}><ExternalLink className="w-4 h-4" /></Button>
        </header>
        <main className="flex-1 p-6 flex flex-col gap-4 justify-center">
          <Button className="h-24 text-lg flex flex-col gap-2" variant="outline" onClick={startResumeParsing}>
            <FileText className="w-8 h-8" />
            履歷解析 (Resume Parse)
          </Button>
          <Button className="h-24 text-lg flex flex-col gap-2" onClick={startJobAnalysis}>
            <Search className="w-8 h-8" />
            職缺分析 (Job Analyze)
          </Button>
        </main>
      </div>
    );
  }

  // VIEW: JOB ANALYSIS
  if (mode === 'job') {
    return (
      <div className="w-[400px] min-h-[500px] bg-background text-foreground flex flex-col">
        <header className="p-3 border-b flex items-center gap-2 bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => setMode('menu')}><ArrowLeft className="w-4 h-4" /></Button>
          <span className="font-bold">職缺分析 (Job Analysis)</span>
        </header>
        <main className="p-4 space-y-4 flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-4 pt-10 text-center">
              <Skeleton className="h-4 w-3/4 mx-auto mb-4" />
              <Skeleton className="h-32 w-full" />
              <p className="text-muted-foreground animate-pulse">Analyzing Job...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              {error}
            </div>
          ) : analysis && jobData ? (
            <>
              <div>
                <h2 className="font-bold text-lg leading-tight line-clamp-2">{jobData.title}</h2>
                <p className="text-sm text-muted-foreground">{jobData.company}</p>
              </div>

              <div className="flex gap-2">
                <Badge variant={analysis.matchScore > 75 ? "default" : "secondary"}>Match: {analysis.matchScore}%</Badge>
                <Badge variant="outline">Risk: {analysis.riskAnalysis.level}</Badge>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-sm">{analysis.strategicAdvice}</CardContent>
              </Card>

              <Button className="w-full" onClick={handleSaveJob} disabled={jobSaved}>
                {jobSaved ? <><CheckCircle className="mr-2 w-4 h4" /> Saved</> : "Save to Dashboard"}
              </Button>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  // VIEW: RESUME PARSING
  return (
    <div className="w-[400px] min-h-[500px] bg-background text-foreground flex flex-col">
      <header className="p-3 border-b flex items-center gap-2 bg-muted/30">
        <Button variant="ghost" size="icon" onClick={() => setMode('menu')}><ArrowLeft className="w-4 h-4" /></Button>
        <span className="font-bold">履歷解析 (Resume Parse)</span>
      </header>
      <main className="p-4 space-y-4 flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-4 pt-10 text-center">
            <Skeleton className="h-32 w-full rounded-full w-32 h-32 mx-auto" />
            <p className="text-muted-foreground animate-pulse">Extracting Profile...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded text-center">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            {error}
          </div>
        ) : parsedProfile ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center mb-2">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-bold text-xl">{parsedProfile.name}</h2>
              <p className="text-muted-foreground">{parsedProfile.targetRole}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 border rounded">
                <span className="block text-xs text-muted-foreground">Exp</span>
                <span className="font-bold">{parsedProfile.yearsOfExperience} yrs</span>
              </div>
              <div className="p-2 border rounded">
                <span className="block text-xs text-muted-foreground">Location</span>
                <span className="font-bold truncate">{parsedProfile.homeLocation || '-'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">Skills</span>
              <div className="flex flex-wrap gap-1">
                {parsedProfile.skills.slice(0, 5).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground">Work Experience (Summary)</span>
              <p className="text-xs p-2 bg-muted/30 rounded line-clamp-4">{parsedProfile.experience}</p>
            </div>

            <Button className="w-full" onClick={handleUpdateProfile} disabled={profileSaved}>
              {profileSaved ? <><CheckCircle className="mr-2 w-4 h4" /> Profile Updated</> : "Update Settings"}
            </Button>
            {profileSaved && <p className="text-xs text-center text-green-600">Settings updated successfully!</p>}
          </div>
        ) : null}
      </main>
    </div>
  );
};

function App() {
  return (
    <JobProvider>
      <PopupContent />
    </JobProvider>
  );
}

export default App;
