# Contributing

Contributions are welcome — bug reports, data corrections, feature suggestions, and code improvements.

## Reporting a data issue

If a company is missing, has wrong info, or appears twice, [open an issue](https://github.com/yigitmeteozcan/techstars/issues/new?template=data-issue.md). The data is sourced from the public Techstars portfolio; if a company is missing from there, it won't appear here until Techstars adds it.

## Suggesting a feature

Open a [feature request](https://github.com/yigitmeteozcan/techstars/issues/new?template=feature-request.md). Describe what you're trying to do and why the current data doesn't support it.

## Code changes

1. Fork the repo and create a branch from `main`.
2. Make your changes. For changes to the data pipeline, test with `npm run build:data` (requires a browser) or `npm run fetch:data` (requires `TYPESENSE_API_KEY`).
3. Open a pull request. Keep PRs focused — one thing per PR.

### Project structure

```
src/
  scraper.js      Browser-based scraper (Playwright) — captures Typesense key
  typesense.js    Direct Typesense client — used in CI (no browser)
  normalize.js    Shared company normalization logic
  dataset.js      Writes all output files + regenerates README
  readme.js       README template (auto-generated from meta.json)
  excel.js        Excel (XLSX) workbook builder
  index.js        Express REST API
  cache.js        In-memory TTL cache

scripts/
  build-dataset.js   npm run build:data  — full local rebuild (browser)
  fetch-direct.js    npm run fetch:data  — CI rebuild (Typesense direct)
  build-readme.js    npm run build:readme — regenerate README from data/
  get-key.js         npm run get-key     — extract Typesense key locally
  export.js          npm run export      — one-off Excel export

docs/
  index.html      Live explorer (GitHub Pages)

data/
  all.json / all.csv / all.xlsx
  unicorns.json / exits.json / b-corps.json / current.json
  stats.json / meta.json
  by-year/ by-program/ by-region/ by-industry/
```

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
