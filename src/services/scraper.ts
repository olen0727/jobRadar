export interface ScrapedJobData {
    title: string;
    company: string;
    description: string;
    url: string;
    platform: '104' | 'yourator' | 'linkedin' | 'other';
    location?: string;
    salary?: string;
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
        switch (platform) {
            case '104':
                // 104 Job Bank
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
                data.location = getText('.job-address');
                break;

            case 'yourator':
                // Yourator
                data.title = getText('.job-title') || getText('h1');
                data.company = getText('.company-title') || getText('h2');
                data.description = getText('.job-description') || getText('section.content');
                data.salary = getText('.salary');
                data.location = getText('.location');
                break;

            case 'linkedin':
                // LinkedIn (Complex due to SPA nature)
                // Try targeting the "Jobs Details" section
                data.title = getText('.job-details-jobs-unified-top-card__job-title h1');
                data.company = getText('.job-details-jobs-unified-top-card__company-name');
                data.description = getText('#job-details') || getText('.jobs-description');
                // Fallback for public view
                if (!data.title) data.title = getText('.top-card-layout__title');
                if (!data.company) data.company = getText('.topcard__org-name-link');
                break;

            default:
                // Generic Fallback
                data.title = document.title;
                // Naive heuristic: Assume H1 is title, longest P block is description
                data.description = document.body.innerText.substring(0, 25000); // Increased limit
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
