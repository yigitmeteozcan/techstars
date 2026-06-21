# Techstars Portfolio Dataset

> The open dataset of every Techstars portfolio company — **5,000+ companies**, updated daily. No scraping, no setup, just data.

[![companies](https://img.shields.io/badge/dynamic/json?url=https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/stats.json&query=$.total&label=companies&color=blue)](data/all.json)
[![updated](https://img.shields.io/badge/dynamic/json?url=https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/stats.json&query=$.generatedAt&label=updated)](STATS.md)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

The complete Techstars portfolio — clean, structured, and free.

## Get the data

Grab it instantly over the jsDelivr CDN (or [browse `data/`](data/)):

```bash
# everything
curl https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.json

# just the unicorns
curl https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/unicorns.json
```

```python
import requests
companies = requests.get(
    "https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.json"
).json()
print(len(companies), "companies")
```

```javascript
const companies = await fetch(
  "https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.json"
).then((r) => r.json());
```

## API endpoints

Every endpoint is a static JSON file served over the jsDelivr CDN. The base URL is:

```
https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/
```

| Endpoint | Description |
|---|---|
| [`all.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.json) | Every company (also [`all.csv`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.csv), [`all.xlsx`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/all.xlsx)) |
| [`unicorns.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/unicorns.json) | Companies valued $1B+ |
| [`exits.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/exits.json) | Companies that have exited |
| [`b-corps.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/b-corps.json) | Certified B Corps |
| [`current.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/current.json) | Current accelerator session |
| [`stats.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/stats.json) | Aggregate stats |
| [`meta.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/meta.json) | **Catalog of every endpoint** (240+ sliced URLs with counts) |

### Sliced collections

Each slice has an `index.json` listing its files, plus one JSON file per group:

| Collection | Index | Example |
|---|---|---|
| By year | [`by-year/index.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-year/index.json) | [`by-year/2012.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-year/2012.json) |
| By program | [`by-program/index.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-program/index.json) | [`by-program/techstars-boulder-accelerator.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-program/techstars-boulder-accelerator.json) |
| By region | [`by-region/index.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-region/index.json) | [`by-region/americas.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-region/americas.json) |
| By industry | [`by-industry/index.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-industry/index.json) | [`by-industry/fintech.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/by-industry/fintech.json) |

Pull [`meta.json`](https://cdn.jsdelivr.net/gh/yigitmeteozcan/techstars@main/data/meta.json) once to discover every available URL programmatically.

## What's in it

Every company looks like this:

```json
{
  "name": "DigitalOcean",
  "description": "Simple, scalable cloud computing solutions built for startups and small-to-midsize businesses.",
  "website": "https://digitalocean.com",
  "location": "New York City, New York, United States",
  "region": "Americas",
  "subregion": "North America",
  "tags": ["Cloudtech and DevOps"],
  "year": 2012,
  "program": "Techstars Boulder Accelerator",
  "isExit": true,
  "isUnicorn": true,
  "isBCorp": false,
  "isCurrentSession": false,
  "social": {
    "linkedin": "https://linkedin.com/company/digitalocean",
    "twitter": "https://twitter.com/digitalocean",
    "facebook": "https://facebook.com/DigitalOceanCloudHosting",
    "crunchbase": "https://crunchbase.com/organization/digitalocean"
  }
}
```

See **[STATS.md](STATS.md)** for charts: companies per year, top cities, unicorns, exits, and more. You can also [browse the raw files](data/) in the repo.

## Run it yourself

```bash
npm install

# Seed data/ locally (uses a headless browser):
npm run install:browsers
npm run build:data

# Run the REST API:
npm start
#   GET /portfolio            all companies (paginated, filterable)
#   GET /portfolio.xlsx       download as Excel
#   GET /portfolio/:name      lookup by name

# One-off Excel export:
npm run export
```

## License

[MIT](LICENSE). Data is sourced from the public Techstars portfolio page; please respect Techstars' terms when using it.
