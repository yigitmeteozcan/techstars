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

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
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

    for (const card of cards) {
      const name =
        card.querySelector('[class*="name"], [class*="title"], h2, h3, h4')
          ?.innerText?.trim() || '';

      const description =
        card
          .querySelector('[class*="description"], [class*="desc"], p')
          ?.innerText?.trim() || '';

      const logoEl = card.querySelector('img');
      const logo = logoEl?.src || logoEl?.getAttribute('data-src') || '';

      const linkEl = card.closest('a') || card.querySelector('a');
      const website = linkEl?.href || '';

      const location =
        card
          .querySelector('[class*="location"], [class*="city"]')
          ?.innerText?.trim() || '';

      const tags = Array.from(
        card.querySelectorAll('[class*="tag"], [class*="badge"], [class*="sector"]')
      ).map((el) => el.innerText.trim()).filter(Boolean);

      const year =
        card
          .querySelector('[class*="year"], [class*="cohort"], time')
          ?.innerText?.trim() || '';

      if (name || logo) {
        results.push({ name, description, logo, website, location, tags, year });
      }
    }

    return results;
  });
}

async function interceptApiResponse(page) {
  const captured = [];

  page.on('response', async (response) => {
    const url = response.url();
    const type = response.headers()['content-type'] || '';

    if (
      type.includes('application/json') &&
      (url.includes('portfolio') || url.includes('compan') || url.includes('startup'))
    ) {
      try {
        const json = await response.json();
        captured.push({ url, data: json });
      } catch (_) {}
    }
  });

  return captured;
}

function normalizeApiData(apiResponses) {
  for (const { data } of apiResponses) {
    // Handle arrays at root level
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (first.name || first.company_name || first.title) {
        return data.map(normalizeCompany);
      }
    }

    // Handle nested: { companies: [...] }, { results: [...] }, { data: [...] }, etc.
    for (const key of ['companies', 'results', 'data', 'items', 'portfolio', 'startups']) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        return data[key].map(normalizeCompany);
      }
    }
  }
  return null;
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

async function scrapePortfolio({ filters = {} } = {}) {
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
    const apiCaptures = await interceptApiResponse(page);

    await page.goto(PORTFOLIO_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Apply filters via URL params if supported
    if (Object.keys(filters).length > 0) {
      const url = new URL(PORTFOLIO_URL);
      for (const [k, v] of Object.entries(filters)) {
        url.searchParams.set(k, v);
      }
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 60000 });
    }

    // Scroll to trigger lazy-load
    await autoScroll(page);
    await page.waitForTimeout(2000);

    // Prefer intercepted API data
    if (apiCaptures.length > 0) {
      const normalized = normalizeApiData(apiCaptures);
      if (normalized && normalized.length > 0) {
        return {
          source: 'api',
          count: normalized.length,
          companies: normalized,
        };
      }
    }

    // Fall back to DOM scraping
    await waitForCompanies(page);
    const companies = await extractCompanies(page);

    return {
      source: 'dom',
      count: companies.length,
      companies,
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapePortfolio };
