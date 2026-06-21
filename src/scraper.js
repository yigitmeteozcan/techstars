const { chromium } = require('playwright');

const PORTFOLIO_URL = 'https://www.techstars.com/portfolio';

const LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1920,1080',
  ],
};

const CONTEXT_OPTIONS = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
  extraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  },
};

async function autoScroll(page, { maxRounds = 80, idleLimit = 4 } = {}) {
  let lastHeight = 0;
  let idle = 0;

  for (let round = 0; round < maxRounds; round++) {
    // Scroll to the bottom to trigger lazy-load / infinite scroll.
    const height = await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.body.scrollHeight;
    });

    // Try to click any "load more" / "show more" button if present.
    try {
      const btn = page.locator(
        'button:has-text("Load more"), button:has-text("Show more"), button:has-text("View more"), a:has-text("Load more")'
      );
      if (await btn.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.first().click({ timeout: 2000 }).catch(() => {});
      }
    } catch (_) {}

    await page.waitForTimeout(1000);

    if (height === lastHeight) {
      idle++;
      if (idle >= idleLimit) break; // page height stable -> assume fully loaded
    } else {
      idle = 0;
      lastHeight = height;
    }
  }
}

async function waitForCompanies(page) {
  // Try multiple selectors that Techstars might use
  const selectors = [
    '[class*="portfolio"]',
    '[class*="company"]',
    '[class*="card"]',
    '[data-company]',
    'article',
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 8000 });
      const count = await page.locator(selector).count();
      if (count > 5) return selector;
    } catch (_) {
      // try next
    }
  }
  return null;
}

async function extractCompanies(page) {
  return page.evaluate(() => {
    const results = [];

    // Techstars portfolio grid — try several known patterns
    const candidateSelectors = [
      '[class*="PortfolioCard"]',
      '[class*="portfolio-card"]',
      '[class*="CompanyCard"]',
      '[class*="company-card"]',
      '[class*="portfolio_card"]',
      '[class*="company_card"]',
      '[class*="card"]',
      'article',
      'li[class*="company"]',
      'li[class*="portfolio"]',
    ];

    let cards = [];
    for (const sel of candidateSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 5) {
        cards = found;
        break;
      }
    }

    if (cards.length === 0) {
      // Last resort: find all anchor-wrapped images with nearby text
      cards = Array.from(document.querySelectorAll('a[href]')).filter((a) => {
        return a.querySelector('img') && a.innerText.trim().length > 3;
      });
    }

    const seen = new Set();

    for (const card of cards) {
      const logoEl = card.querySelector('img');
      const logo = logoEl?.src || logoEl?.getAttribute('data-src') || '';

      const linkEl = card.closest('a') || card.querySelector('a');
      const website = linkEl?.href || '';

      // The Techstars cards render text as "CompanyName(Techstars 2012)".
      // Prefer an explicit name/title element; otherwise parse the card text.
      let name =
        card.querySelector('[class*="name"], [class*="title"], h2, h3, h4')
          ?.innerText?.trim() || '';

      // Logo alt text is often the cleanest source of the company name.
      if (!name && logoEl?.alt) name = logoEl.alt.trim();

      let year = '';
      let program = '';

      const fullText = (card.innerText || '').replace(/\s+/g, ' ').trim();

      // Parse "(Techstars 2012)" / "(Powered by Techstars 2019)" style suffix.
      const cohortMatch = fullText.match(/\(([^()]*?Techstars[^()]*?)\)/i);
      if (cohortMatch) {
        program = cohortMatch[1].trim();
        const y = program.match(/(19|20)\d{2}/);
        if (y) year = y[0];
      }

      // If we still don't have a clean name, derive it from the full text by
      // stripping the cohort suffix.
      if (!name && fullText) {
        name = fullText.replace(/\([^()]*?Techstars[^()]*?\)/i, '').trim();
      }

      const description =
        card
          .querySelector('[class*="description"], [class*="desc"], p')
          ?.innerText?.trim() || '';

      const location =
        card
          .querySelector('[class*="location"], [class*="city"]')
          ?.innerText?.trim() || '';

      const tags = Array.from(
        card.querySelectorAll('[class*="tag"], [class*="badge"], [class*="sector"]')
      )
        .map((el) => el.innerText.trim())
        .filter(Boolean);

      if (!name && !logo) continue;

      // De-dupe on name+website (cards can appear more than once in the DOM).
      const key = `${name}|${website}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        name,
        description: description && description !== fullText ? description : '',
        logo,
        website,
        location,
        tags,
        year,
        program,
      });
    }

    return results;
  });
}

async function interceptApiResponse(page) {
  const captured = [];
  const endpoints = [];

  page.on('response', async (response) => {
    const url = response.url();
    const type = response.headers()['content-type'] || '';
    if (!type.includes('application/json')) return;

    try {
      const json = await response.json();
      endpoints.push(url);
      captured.push({ url, data: json });
    } catch (_) {}
  });

  return { captured, endpoints };
}

function looksLikeCompany(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  const hasName = keys.some((k) => ['name', 'company_name', 'companyname', 'title'].includes(k));
  const hasMeta = keys.some((k) =>
    ['website', 'url', 'homepage', 'logo', 'logo_url', 'description', 'tagline', 'location'].includes(k)
  );
  return hasName && hasMeta;
}

// Recursively walk any JSON value and collect the largest array whose items
// look like company records. This makes us resilient to the exact API shape.
function findCompanyArray(value, depth = 0) {
  let best = null;
  if (depth > 8 || value == null) return best;

  if (Array.isArray(value)) {
    const matches = value.filter(looksLikeCompany);
    if (matches.length >= 3 && matches.length >= value.length / 2) {
      best = value;
    }
    for (const item of value) {
      const nested = findCompanyArray(item, depth + 1);
      if (nested && (!best || nested.length > best.length)) best = nested;
    }
    return best;
  }

  if (typeof value === 'object') {
    for (const v of Object.values(value)) {
      const nested = findCompanyArray(v, depth + 1);
      if (nested && (!best || nested.length > best.length)) best = nested;
    }
  }
  return best;
}

function normalizeApiData(apiResponses) {
  let best = null;
  for (const { data } of apiResponses) {
    const arr = findCompanyArray(data);
    if (arr && (!best || arr.length > best.length)) best = arr;
  }
  return best ? best.map(normalizeCompany) : null;
}

function normalizeCompany(raw) {
  return {
    name: raw.name || raw.company_name || raw.title || '',
    description: raw.description || raw.short_description || raw.tagline || raw.bio || '',
    logo: raw.logo || raw.logo_url || raw.image || raw.thumbnail || '',
    website: raw.website || raw.url || raw.homepage || raw.website_url || '',
    location: raw.location || raw.city || raw.headquarters || '',
    tags: raw.tags || raw.categories || raw.sectors || raw.industries || [],
    year: raw.year || raw.founded_year || raw.cohort_year || raw.graduation_year || '',
    program: raw.program || raw.cohort || raw.accelerator || '',
    extra: raw,
  };
}

async function scrapePortfolio({ filters = {}, debug = false } = {}) {
  let browser;
  try {
    browser = await chromium.launch(LAUNCH_OPTIONS);
    const context = await browser.newContext(CONTEXT_OPTIONS);

    // Hide webdriver flag
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();
    const { captured, endpoints } = await interceptApiResponse(page);

    // Apply filters via URL params if supported.
    const target = new URL(PORTFOLIO_URL);
    for (const [k, v] of Object.entries(filters)) target.searchParams.set(k, v);

    await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForCompanies(page);

    // Scroll to trigger lazy-load / infinite scroll, then let late XHRs settle.
    await autoScroll(page);
    await page.waitForTimeout(2000);

    // Prefer intercepted API data (richest + most complete).
    const normalized = normalizeApiData(captured);
    const apiCount = normalized ? normalized.length : 0;

    // Always also run the DOM extraction so we can pick whichever is better.
    const domCompanies = await extractCompanies(page);

    const useApi = apiCount >= domCompanies.length && apiCount > 0;
    const result = useApi
      ? { source: 'api', count: normalized.length, companies: normalized }
      : { source: 'dom', count: domCompanies.length, companies: domCompanies };

    if (debug) {
      result.debug = {
        jsonEndpoints: [...new Set(endpoints)],
        apiCount,
        domCount: domCompanies.length,
      };
    }

    return result;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapePortfolio };
