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
import { AlertCircle, Briefcase, CheckCircle, Settings, ShieldAlert, Sparkles, XCircle, FileText, Search, ArrowLeft } from 'lucide-react';
import { cn } from './lib/utils';
import { v4 as uuidv4 } from 'uuid';

type ViewMode = 'menu' | 'job' | 'resume' | 'detecting' | 'unknown' | 'trial_exceeded';

const PopupContent = () => {
  const { userProfile, saveProfile, loading: contextLoading, addJob, deleteJob } = useJobContext();
  const [mode, setMode] = useState<ViewMode>('detecting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job Flow State
  const [jobData, setJobData] = useState<ScrapedJobData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
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

      // --- 自動儲存機制 ---
      const jobId = uuidv4();
      const newJob: JobEntry = {
        id: jobId,
        url: result.url,
        title: result.title,
        company: result.company,
        salaryRange: aiResult.extractedSalary || result.salary,
        location: aiResult.extractedLocation || result.location,
        platform: result.platform,
        status: 'saved',
        analysis: aiResult,
        createdAt: new Date().toISOString()
      };
      await addJob(newJob);
      setSavedJobId(jobId);
      setJobSaved(true);
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

  const goToDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#dashboard') });
  };

  const handleDeleteAnalysis = async () => {
    if (!savedJobId) return;
    if (confirm('確定要捨棄本次分析結果並從資料庫刪除嗎？')) {
      await deleteJob(savedJobId);
      setSavedJobId(null);
      setJobSaved(false);
      setAnalysis(null);
      setJobData(null);
      setMode('unknown');
    }
  };

  const handleUpdateProfile = async () => {
    if (!parsedProfile) return;
    await saveProfile(parsedProfile);
    setProfileSaved(true);
    setTimeout(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html#settings?remind=location') });
    }, 1000);
  };

  const getModelLabel = () => {
    if (!userProfile) return '';
    const hasKey = userProfile.apiKey || userProfile.geminiApiKey;
    if (!hasKey) return 'gpt-5-mini (Trial)';

    if (userProfile.apiProvider === 'gemini') {
      return userProfile.geminiModel || 'gemini-3-flash-preview';
    }
    return userProfile.openaiModel || 'gpt-5-mini';
  };

  const AnalysisLoader = ({ type }: { type: 'job' | 'resume' }) => (
    <div className="flex flex-col items-center justify-center py-10 space-y-8 w-full">
      {/* 核心動畫區塊：具備掃描與邊框流光的容器 */}
      <div className="relative w-48 h-48 rounded-xl border-2 border-primary/20 bg-muted/20 overflow-hidden shadow-inner">
        {/* 背景矩陣方塊動畫 */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-1 p-2">
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className="bg-primary/5 rounded-sm animate-matrix-pulse"
              style={{ animationDelay: `${(i % 6) * 0.1 + Math.floor(i / 6) * 0.1}s` }}
            />
          ))}
        </div>

        {/* 掃描線動畫 */}
        <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan z-10" />

        {/* 中心圖示區域 */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="p-4 bg-background/80 backdrop-blur-sm rounded-full border border-primary/20 shadow-xl">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-3">
        <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-background/50 backdrop-blur-sm border-primary/20 px-3 py-1">
          <Sparkles className="w-3 h-3 mr-1.5 text-primary animate-pulse" />
          {getModelLabel()}
        </Badge>
        <div className="space-y-1">
          <p className="text-sm font-bold tracking-widest uppercase text-slate-600">
            {type === 'job' ? 'Analyzing Job Data' : 'Extracting Resume Profile'}
          </p>
          <div className="flex justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );

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
          <Button variant="ghost" size="icon" onClick={openDashboard} title="Settings"><Settings className="w-4 h-4" /></Button>
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
        </div>
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
      </div>
    );
  }

  // VIEW: JOB ANALYSIS
  if (mode === 'job') {
    return (
      <div className="w-[400px] min-h-[500px] bg-background text-foreground flex flex-col">
        <header className="p-3 border-b flex items-center gap-2 bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => setMode('unknown')}><ArrowLeft className="w-4 h-4" /></Button>
          <span className="font-bold">職缺分析 (Job Analysis)</span>
        </header>
        <main className="p-4 space-y-4 flex-1 overflow-auto">
          {loading ? (
            <AnalysisLoader type="job" />
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

              <div className="flex gap-2 w-full">
                <Button className="flex-1" variant="outline" onClick={handleDeleteAnalysis} disabled={!jobSaved}>
                  <XCircle className="mr-2 w-4 h-4" /> 刪除分析
                </Button>
                <Button className="flex-[2]" onClick={goToDashboard}>
                  <Search className="mr-2 w-4 h-4" /> 前往列表
                </Button>
              </div>
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
        <Button variant="ghost" size="icon" onClick={() => setMode('unknown')}><ArrowLeft className="w-4 h-4" /></Button>
        <span className="font-bold">履歷解析 (Resume Parse)</span>
      </header>
      <main className="p-4 space-y-4 flex-1 overflow-auto">
        {loading ? (
          <AnalysisLoader type="resume" />
        ) : error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded text-center">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            {error}
          </div>
        ) : parsedProfile ? (
          <div className="space-y-4">
            <div className="text-center">
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
