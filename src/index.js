const express = require('express');
const { scrapePortfolio } = require('./scraper');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3000;

// Track in-progress scrape to avoid concurrent duplicate requests
let scrapeInProgress = false;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * GET /portfolio
 *
 * Returns all Techstars portfolio companies.
 *
 * Query params:
 *   - refresh=true   Force re-scrape, bypassing cache
 *   - search=<term>  Filter results by name/description/tag (client-side)
 *   - tag=<tag>      Filter results by tag (client-side)
 *   - location=<loc> Filter results by location (client-side)
 *   - year=<year>    Filter results by cohort/founded year (client-side)
 *   - page=<n>       Page number (default: 1)
 *   - limit=<n>      Results per page (default: 50, max: 500)
 */
app.get('/portfolio', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const CACHE_KEY = 'portfolio';

    if (scrapeInProgress) {
      return res.status(202).json({
        status: 'in_progress',
        message: 'Scrape already running. Please retry in a moment.',
      });
    }

    let data = forceRefresh ? null : cache.get(CACHE_KEY);

    const debug = req.query.debug === 'true';

    if (!data) {
      scrapeInProgress = true;
      try {
        data = await scrapePortfolio({ debug });
        cache.set(CACHE_KEY, data);
      } finally {
        scrapeInProgress = false;
      }
    }

    let companies = data.companies;

    // Filter
    const { search, tag, location, year } = req.query;
    if (search) {
      const term = search.toLowerCase();
      companies = companies.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.tags.some((t) => t.toLowerCase().includes(term))
      );
    }
    if (tag) {
      const t = tag.toLowerCase();
      companies = companies.filter((c) =>
        c.tags.some((x) => x.toLowerCase().includes(t))
      );
    }
    if (location) {
      const loc = location.toLowerCase();
      companies = companies.filter((c) => c.location.toLowerCase().includes(loc));
    }
    if (year) {
      companies = companies.filter((c) => String(c.year).includes(year));
    }

    // Paginate
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const total = companies.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = companies.slice((page - 1) * limit, page * limit);

    const cacheInfo = cache.info(CACHE_KEY);

    return res.json({
      status: 'ok',
      source: data.source,
      cached: !forceRefresh && !!cache.get(CACHE_KEY),
      cacheExpiresAt: cacheInfo?.expiresAt || null,
      pagination: { page, limit, total, totalPages },
      ...(data.debug ? { debug: data.debug } : {}),
      companies: paginated,
    });
  } catch (err) {
    scrapeInProgress = false;
    console.error('[/portfolio] Error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * GET /portfolio/:name
 *
 * Lookup a single company by exact or partial name match.
 */
app.get('/portfolio/:name', async (req, res) => {
  try {
    const CACHE_KEY = 'portfolio';
    let data = cache.get(CACHE_KEY);

    if (!data) {
      if (scrapeInProgress) {
        return res.status(202).json({
          status: 'in_progress',
          message: 'Scrape running. Retry shortly.',
        });
      }
      scrapeInProgress = true;
      try {
        data = await scrapePortfolio();
        cache.set(CACHE_KEY, data);
      } finally {
        scrapeInProgress = false;
      }
    }

    const term = req.params.name.toLowerCase();
    const company = data.companies.find((c) => c.name.toLowerCase().includes(term));

    if (!company) {
      return res.status(404).json({ status: 'not_found', name: req.params.name });
    }

    return res.json({ status: 'ok', company });
  } catch (err) {
    scrapeInProgress = false;
    console.error('[/portfolio/:name] Error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * DELETE /cache
 *
 * Manually invalidate the portfolio cache.
 */
app.delete('/cache', (req, res) => {
  cache.clear();
  return res.json({ status: 'ok', message: 'Cache cleared.' });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  const cacheInfo = cache.info('portfolio');
  return res.json({
    status: 'ok',
    scrapeInProgress,
    cache: cacheInfo
      ? { populated: true, ...cacheInfo }
      : { populated: false },
  });
});

app.listen(PORT, () => {
  console.log(`Techstars Portfolio API running on http://localhost:${PORT}`);
  console.log(`  GET /portfolio           — all companies (paginated)`);
  console.log(`  GET /portfolio?refresh=true — force re-scrape`);
  console.log(`  GET /portfolio/:name     — lookup by name`);
  console.log(`  DELETE /cache            — invalidate cache`);
  console.log(`  GET /health              — health check`);
});
