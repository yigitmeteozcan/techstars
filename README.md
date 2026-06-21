# Techstars Portfolio API

An Express API that scrapes [techstars.com/portfolio](https://www.techstars.com/portfolio) using a headless Playwright browser and returns structured company data.

## Setup

```bash
npm install
npm run install:browsers   # installs Chromium for Playwright
npm start
```

Server runs on `http://localhost:3000` (override with `PORT` env var).

## Endpoints

### `GET /portfolio`

Returns all portfolio companies. Results are cached for 1 hour.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `refresh` | `true` | Bypass cache and re-scrape |
| `search` | string | Filter by name, description, or tag |
| `tag` | string | Filter by industry tag |
| `location` | string | Filter by location/city |
| `year` | string | Filter by cohort/founded year |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 50, max: 500) |

**Example response**
```json
{
  "status": "ok",
  "source": "api",
  "cached": false,
  "cacheExpiresAt": "2025-01-01T13:00:00.000Z",
  "pagination": { "page": 1, "limit": 50, "total": 4200, "totalPages": 84 },
  "companies": [
    {
      "name": "Example Co",
      "description": "Building the future of ...",
      "logo": "https://...",
      "website": "https://example.com",
      "location": "New York, NY",
      "tags": ["FinTech", "B2B"],
      "year": "2022",
      "program": "Techstars NYC"
    }
  ]
}
```

### `GET /portfolio/:name`

Look up a single company by partial name match.

```
GET /portfolio/airbnb
```

### `DELETE /cache`

Invalidate the portfolio cache so the next request re-scrapes.

### `GET /health`

Returns server status and cache info.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `CACHE_TTL_MS` | `3600000` | Cache TTL in milliseconds (default 1 hour) |

## How it works

1. Playwright launches a headless Chromium with a realistic user-agent and viewport.
2. It intercepts JSON network responses — if the site makes an internal API call to load portfolio data, that raw JSON is captured and returned directly (`source: "api"`).
3. If no API response is found, it falls back to DOM scraping after auto-scrolling to trigger lazy loading (`source: "dom"`).
4. Results are cached in-memory for 1 hour to avoid hammering the site.
