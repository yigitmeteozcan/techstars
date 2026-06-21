#!/usr/bin/env node
const path = require('path');
const { scrapePortfolio } = require('../src/scraper');
const { buildWorkbook } = require('../src/excel');

async function main() {
  // Optional output path: `npm run export -- /path/to/file.xlsx`
  const outArg = process.argv[2];
  const outPath = outArg
    ? path.resolve(outArg)
    : path.resolve(process.cwd(), 'techstars-portfolio.xlsx');

  console.log('Scraping Techstars portfolio (this loads a headless browser, ~1 min)...');
  const data = await scrapePortfolio();
  console.log(`Fetched ${data.count} companies (source: ${data.source}).`);

  console.log('Building Excel workbook...');
  const workbook = buildWorkbook(data.companies);
  await workbook.xlsx.writeFile(outPath);

  console.log(`\n✅ Saved ${data.count} companies to:\n   ${outPath}`);
}

main().catch((err) => {
  console.error('\n❌ Export failed:', err.message);
  process.exit(1);
});
