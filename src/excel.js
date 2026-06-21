const ExcelJS = require('exceljs');

// Flatten a normalized company into a single spreadsheet row.
function toRow(c) {
  const d = c.extra || {};
  return {
    name: c.name || '',
    description: c.description || '',
    website: c.website || '',
    city: d.city || '',
    state: d.state_province || '',
    country: d.country || '',
    region: c.region || '',
    subregion: c.subregion || '',
    tags: (c.tags || []).join(', '),
    year: c.year || '',
    program: c.program || '',
    isExit: c.isExit ? 'Yes' : 'No',
    isUnicorn: c.isUnicorn ? 'Yes' : 'No',
    isBCorp: c.isBCorp ? 'Yes' : 'No',
    isCurrentSession: c.isCurrentSession ? 'Yes' : 'No',
    linkedin: c.social?.linkedin || '',
    twitter: c.social?.twitter || '',
    facebook: c.social?.facebook || '',
    crunchbase: c.social?.crunchbase || '',
    logo: c.logo || '',
  };
}

const COLUMNS = [
  { header: 'Company', key: 'name', width: 30 },
  { header: 'Description', key: 'description', width: 60 },
  { header: 'Website', key: 'website', width: 30 },
  { header: 'City', key: 'city', width: 20 },
  { header: 'State/Province', key: 'state', width: 18 },
  { header: 'Country', key: 'country', width: 20 },
  { header: 'Region', key: 'region', width: 14 },
  { header: 'Subregion', key: 'subregion', width: 16 },
  { header: 'Industry/Tags', key: 'tags', width: 35 },
  { header: 'Year', key: 'year', width: 8 },
  { header: 'Program', key: 'program', width: 35 },
  { header: 'Exit?', key: 'isExit', width: 8 },
  { header: 'Unicorn ($1B)?', key: 'isUnicorn', width: 14 },
  { header: 'B Corp?', key: 'isBCorp', width: 10 },
  { header: 'Current Session?', key: 'isCurrentSession', width: 16 },
  { header: 'LinkedIn', key: 'linkedin', width: 35 },
  { header: 'Twitter', key: 'twitter', width: 30 },
  { header: 'Facebook', key: 'facebook', width: 35 },
  { header: 'Crunchbase', key: 'crunchbase', width: 40 },
  { header: 'Logo URL', key: 'logo', width: 50 },
];

// Build an ExcelJS workbook from a list of normalized companies.
function buildWorkbook(companies) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'techstars-portfolio-api';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Portfolio', {
    views: [{ state: 'frozen', ySplit: 1 }], // freeze header row
  });
  sheet.columns = COLUMNS;

  // Style the header row.
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1A2E' },
  };
  header.alignment = { vertical: 'middle' };

  for (const c of companies) sheet.addRow(toRow(c));

  // Enable autofilter across all columns + the data range.
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  return workbook;
}

module.exports = { buildWorkbook };
