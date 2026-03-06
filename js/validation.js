function isRequiredCol(col) {
  return col.csv.startsWith('*') && !col.csv.startsWith('**');
}

function parseUsDate(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = +m[1], dd = +m[2], yy = +m[3];
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

function isValidHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function setCellValue(t, i, k, value) {
  const s = S[t];
  s.cur[i][k] = value;
  const hi = s.colToHeaderIndex[k];
  if (hi !== undefined && s.rawCur[i]) s.rawCur[i][hi] = value;
}

function runStaticPreflight(type) {
  const s = S[type];
  const cfg = TYPES[type];
  const pf = { errors: [], warnings: [], infos: [] };
  if (!s.cur.length) pf.errors.push('No data rows found in this file');

  const accountIds = Array.from(new Set(s.cur.map(r => (r.accountId || '').trim()).filter(Boolean)));
  if (accountIds.length > 1) pf.errors.push(`Multiple account IDs found (${accountIds.length})`);

  const idField = cfg.idField;
  const seen = new Set();
  let dup = 0;
  s.cur.forEach(r => {
    const id = (r[idField] || '').trim();
    if (!id) return;
    if (seen.has(id)) dup++;
    else seen.add(id);
  });
  if (dup) pf.warnings.push(`Detected duplicate ${cfg.cols.find(c => c.k === idField)?.h || idField} values (${dup})`);

  const known = new Set(cfg.cols.map(c => normalizeHeader(c.csv)));
  const extras = s.headerCells.filter(h => !known.has(normalizeHeader(h)));
  if (extras.length) pf.infos.push(`Extra template columns will be preserved on export (${extras.length})`);

  s.preflightStatic = pf;
}

function runValidation(type) {
  const s = S[type];
  const cfg = TYPES[type];
  const cellIssues = new Map();
  const rowsWithIssues = new Set();
  let errors = 0;
  let warnings = 0;

  const addIssue = (rowIdx, key, level, msg) => {
    const mapKey = `${rowIdx}:${key}`;
    const prev = cellIssues.get(mapKey);
    if (prev && prev.level === 'error') return;
    if (prev) {
      if (prev.level === 'warn') warnings--;
    }
    cellIssues.set(mapKey, { level, msg });
    rowsWithIssues.add(rowIdx);
    if (level === 'error') errors++;
    else warnings++;
  };

  const statusAllowed = new Set(s.statusOptions.map(v => String(v).toLowerCase()));
  const ctaAllowed = new Set(s.ctaOptions.map(v => String(v).toLowerCase()));

  for (let i = 0; i < s.cur.length; i++) {
    const row = s.cur[i];
    cfg.cols.forEach(col => {
      const raw = row[col.k] || '';
      const v = String(raw).trim();

      if (isRequiredCol(col) && !v) addIssue(i, col.k, 'error', `${col.h}: required value is empty`);
      if (col.type === 'date' && v && !parseUsDate(v)) addIssue(i, col.k, 'error', `${col.h}: use MM/DD/YYYY`);
      if (col.type === 'url' && v && !isValidHttpUrl(v)) addIssue(i, col.k, 'error', `${col.h}: invalid URL`);
      if (col.type === 'num' && v && Number.isNaN(Number(v.replace(/,/g, '')))) addIssue(i, col.k, 'error', `${col.h}: invalid number`);
      if (col.type === 'status' && v && !statusAllowed.has(v.toLowerCase())) addIssue(i, col.k, 'warn', `${col.h}: unknown status value`);
      if (col.type === 'cta' && v && !ctaAllowed.has(v.toLowerCase())) addIssue(i, col.k, 'warn', `${col.h}: uncommon CTA value`);
    });

    const sd = parseUsDate(row.startDate || '');
    const ed = parseUsDate(row.endDate || '');
    if (sd && ed && ed < sd) addIssue(i, 'endDate', 'warn', 'End date is earlier than start date');
  }

  s.validation = { errors, warnings, cellIssues, rowsWithIssues };
  return s.validation;
}

