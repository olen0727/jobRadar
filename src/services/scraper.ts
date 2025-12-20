export interface ScrapedJobData {
    title: string;
    company: string;
    description: string;
    url: string;
    platform: '104' | 'yourator' | 'linkedin' | 'other';
    location?: string;
    salary?: string;
    pageType?: 'job' | 'resume' | 'unknown';
}

// This function is intended to be serialized and injected into the page
export const scrapePageScript = (): ScrapedJobData => {
    const url = window.location.href;
    let platform: ScrapedJobData['platform'] = 'other';
    if (url.includes('104.com.tw')) platform = '104';
    else if (url.includes('yourator.co')) platform = 'yourator';
    else if (url.includes('linkedin.com')) platform = 'linkedin';

    const getText = (selector: string) => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim().replace(/\s+/g, ' ') || '';
    };

    const getMetaContent = (name: string) => {
        return document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') || '';
    };

    let data: ScrapedJobData = {
        title: document.title,
        company: '',
        description: '',
        url: url,
        platform,
        location: '',
        salary: ''
    };

    try {
        // Page Type Classification Logic
        const bodyText = document.body.innerText;

        // URL patterns (Maintainable arrays)
        const jobUrlPatterns = ['job', 'view', 'postings'];
        const resumeUrlPatterns = ['resume', 'profile', 'cv', 'edit-profile'];

        const isJobUrl = jobUrlPatterns.some(p => url.toLowerCase().includes(p));
        const isResumeUrl = resumeUrlPatterns.some(p => url.toLowerCase().includes(p));

        // Keyword Density patterns
        const jobKeywords = ['工作內容', '任職要求', '徵才福利', '應徵方式', 'Job Description', '我們'];
        const resumeKeywords = ['工作經歷', '教育背景', '個人專長', '自傳', '自我介紹', 'Education', 'Experience', '我是', '我的'];

        const jobScore = jobKeywords.filter(k => bodyText.includes(k)).length;
        const resumeScore = resumeKeywords.filter(k => bodyText.includes(k)).length;

        let detectedType: 'job' | 'resume' | 'unknown' = 'unknown';

        // 1. URL Match Priority
        if (isJobUrl && !isResumeUrl) detectedType = 'job';
        else if (isResumeUrl && !isJobUrl) detectedType = 'resume';
        // 2. Keyword Match Fallback
        else if (jobScore > resumeScore && jobScore > 0) detectedType = 'job';
        else if (resumeScore > jobScore && resumeScore > 0) detectedType = 'resume';

        data.pageType = detectedType;

        switch (platform) {
            case '104':
                // ... (Existing platform logic remains the same)
                data.title = getText('h1') || getMetaContent('og:title');
                data.company = getText('a[href*="/company/"] h2') || getText('.job-header__title a'); // Defensive
                data.description = getText('.job-description__content') || getText('p.r3');

                // If standard JD selectors fail, it might be a Resume page.
                // 104 Resumes don't share the same class names. 
                // We fallback to body text but keep a large limit.
                if (!data.description) {
                    data.description = document.body.innerText.replace(/\s+/g, ' ').substring(0, 25000);
                }

                data.salary = getText('.job-header__salary') || getText('.job-content-table__data');
                data.location = getText('.job-address') || getText('.job-header__info p:last-child') || getText('p[class*="address"]');
                break;

            case 'yourator':
                // Yourator
                data.title = getText('.job-title') || getText('h1');
                data.company = getText('.company-title') || getText('h2');
                data.description = getText('.job-description') || getText('section.content');
                data.salary = getText('.salary');
                data.location = getText('.location') || getText('.company-info__address') || getText('i.fa-map-marker-alt + span');
                break;

            case 'linkedin':
                // LinkedIn (Complex due to SPA nature)
                // Try targeting the "Jobs Details" section
                data.title = getText('.job-details-jobs-unified-top-card__job-title h1');
                data.company = getText('.job-details-jobs-unified-top-card__company-name');
                data.description = getText('#job-details') || getText('.jobs-description');
                data.location = getText('.job-details-jobs-unified-top-card__primary-description span:nth-child(1)');
                // Fallback for public view
                if (!data.title) data.title = getText('.top-card-layout__title');
                if (!data.company) data.company = getText('.topcard__org-name-link');
                if (!data.location) data.location = getText('.topcard__item--bullet');
                break;

            default:
                // Generic Fallback
                data.title = document.title;
                // Naive heuristic: Assume H1 is title, longest P block is description
                data.description = document.body.innerText.substring(0, 25000); // Increased limit

                // Address heuristic: Search for common TW address prefixes
                const addrRegex = /(台北市|新北市|桃園市|台中市|臺中市|台南市|臺南市|高雄市|新竹市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|臺東縣|澎湖縣|金門縣|連江縣)[^ \n\t]{2,50}/;
                const text = document.body.innerText;
                const matchResult = text.match(addrRegex);
                if (matchResult) {
                    data.location = matchResult[0];
                }
                break;
        }

        // Clean up
        if (!data.description) {
            // Last resort: Get main text content
            data.description = document.body.innerText.replace(/\s+/g, ' ').substring(0, 25000);
        }
    } catch (e) {
        console.error('Scraping failed:', e);
    }

    return data;
};
