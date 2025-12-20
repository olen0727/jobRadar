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

type ViewMode = 'menu' | 'job' | 'resume' | 'detecting' | 'unknown' | 'trial_exceeded';

const PopupContent = () => {
  const { userProfile, saveProfile, loading: contextLoading, addJob } = useJobContext();
  const [mode, setMode] = useState<ViewMode>('detecting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job Flow State
  const [jobData, setJobData] = useState<ScrapedJobData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [jobSaved, setJobSaved] = useState(false);

  // Resume Flow State
  const [parsedProfile, setParsedProfile] = useState<UserProfile | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

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
      if (!userProfile) throw new Error('User profile not contextually loaded.');

      const result = await getActiveTabContent();
      if (!result || !result.description || result.description.length < 50) {
        throw new Error('No valid job description found on this page.');
      }
      setJobData(result);

      const aiResult = await analyzeJob(result, userProfile);
      setAnalysis(aiResult);
    } catch (err) {
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setMode('trial_exceeded');
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
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
      if (!userProfile) throw new Error('User profile not contextually loaded.');

      const result = await getActiveTabContent();
      if (!result || !result.description || result.description.length < 50) {
        throw new Error('No valid text found on this page to parse.');
      }

      const newProfile = await parseResume(result.description, userProfile);
      setParsedProfile(newProfile);
    } catch (err) {
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setMode('trial_exceeded');
      } else {
        setError(err instanceof Error ? err.message : 'Parsing failed');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDetection = async () => {
      if (contextLoading) return;
      setMode('detecting');
      setLoading(true);
      try {
        const result = await getActiveTabContent();
        if (result && result.pageType === 'job') {
          startJobAnalysis();
        } else if (result && result.pageType === 'resume') {
          startResumeParsing();
        } else {
          setMode('unknown');
          setLoading(false);
        }
      } catch (err) {
        setMode('unknown');
        setLoading(false);
      }
    };
    initDetection();
  }, [contextLoading]);

  const handleSaveJob = async () => {
    if (!jobData || !analysis) return;
    const newJob: JobEntry = {
      id: uuidv4(),
      url: jobData.url,
      title: jobData.title,
      company: jobData.company,
      salaryRange: analysis.extractedSalary || jobData.salary,
      location: analysis.extractedLocation || jobData.location,
      platform: jobData.platform,
      status: 'saved',
      analysis: analysis,
      createdAt: new Date().toISOString()
    };
    await addJob(newJob);
    setJobSaved(true);
    setTimeout(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html#dashboard') });
    }, 1000);
  };

  const handleUpdateProfile = async () => {
    if (!parsedProfile) return;
    await saveProfile(parsedProfile);
    setProfileSaved(true);
    setTimeout(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html#settings?remind=location') });
    }, 1000);
  };

  if (contextLoading) return <div className="p-8 text-center">Loading context...</div>;

  // VIEW: DETECTING
  if (mode === 'detecting') {
    return (
      <div className="w-[400px] h-[500px] bg-background flex flex-col items-center justify-center p-6 gap-4">
        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
        <h2 className="text-xl font-bold">偵測頁面中...</h2>
        <p className="text-sm text-muted-foreground text-center">正在判斷此頁面為職缺描述或個人履歷</p>
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  // VIEW: UNKNOWN
  if (mode === 'unknown') {
    return (
      <div className="w-[400px] h-[500px] bg-background flex flex-col p-6 gap-6">
        <header className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Briefcase className="w-5 h-5" /> JobRadar AI
          </div>
          <Button variant="ghost" size="icon" onClick={openDashboard}><ExternalLink className="w-4 h-4" /></Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <Search className="w-12 h-12 text-slate-300" />
          <div>
            <h3 className="font-bold text-lg text-slate-700">無法自動判別頁面</h3>
            <p className="text-sm text-slate-500 mt-1 px-4">
              此頁面看起來不像是典型的職缺或履歷。您可以嘗試手動選擇功能，或前往設定頁面調整。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button className="w-full h-14 text-sm" variant="outline" onClick={startResumeParsing}>
            <FileText className="w-5 h-5 mr-2" />
            手動解析履歷 (Resume Parse)
          </Button>
          <Button className="w-full h-14 text-sm" onClick={startJobAnalysis}>
            <Search className="w-5 h-5 mr-2" />
            手動分析職缺 (Job Analyze)
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-400" onClick={() => setMode('menu')}>返回主選單</Button>
        </div>
      </div>
    );
  }

  // VIEW: MENU
  if (mode === 'menu') {
    return (
      <div className="w-[400px] min-h-[500px] bg-background text-foreground flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Briefcase className="w-5 h-5" /> JobRadar AI
          </div>
          <Button variant="ghost" size="icon" onClick={openDashboard}><ExternalLink className="w-4 h-4" />setting</Button>
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

  // VIEW: TRIAL EXCEEDED
  if (mode === 'trial_exceeded') {
    return (
      <div className="w-[400px] h-[500px] bg-background flex flex-col p-6 items-center justify-center text-center gap-6">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-destructive">試用額度已用完</h2>
          <p className="text-sm text-muted-foreground px-4">
            您的試用額度已用完，請填寫您的 API Key 以繼續使用。
            <br /><br />
            本服務所有資訊皆儲存於您的本地端，不必擔心資料外洩。
          </p>
        </div>
        <Button
          className="w-full h-12"
          onClick={() => {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html#settings?quota=exceeded') });
          }}
        >
          前往設定頁面
        </Button>
        <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setMode('menu')}>返回</Button>
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
                {analysis.commuteLabel && (
                  <Badge variant={
                    analysis.commuteLabel === "你家旁邊" || analysis.commuteLabel === "舒適距離" ? "default" :
                      analysis.commuteLabel === "舟車勞頓" || analysis.commuteLabel === "極限通勤" ? "destructive" : "secondary"
                  }>
                    {analysis.commuteLabel}
                  </Badge>
                )}
              </div>
              {analysis.matchScoreExplanation && analysis.matchScoreExplanation.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2 bg-muted/40 p-2 rounded">
                  <span className="font-semibold block mb-1">Score Reason:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {analysis.matchScoreExplanation.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.commuteDescription && <p className="text-xs text-muted-foreground mt-1">Commute: {analysis.commuteDescription}</p>}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-sm">{analysis.strategicAdvice}</CardContent>
              </Card>

              <Button className="w-full" onClick={handleSaveJob} disabled={jobSaved}>
                {jobSaved ? <><CheckCircle className="mr-2 w-4 h4" /> Saved & Redirecting...</> : "儲存並前往列表"}
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
              {profileSaved ? <><CheckCircle className="mr-2 w-4 h4" /> Profile Updated</> : "更新並前往設定頁"}
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
