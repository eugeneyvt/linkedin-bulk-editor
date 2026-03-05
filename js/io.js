/* ===== UPLOAD CARDS ===== */
function initUploads() {
  const el = Q('#uploads');
  el.innerHTML = Object.entries(TYPES).map(([t, cfg]) => `
<div class="upload-card" id="uc-${t}" data-t="${t}">
  <div class="ic">${SVG.upload}</div>
  <h3>${cfg.label}</h3>
  <p>Drop your ${cfg.label} Edit file here<br><span style="font-size:11px;color:var(--text-faint)">or click to browse</span></p>
  <input type="file" accept=".csv,.tsv,.txt" data-t="${t}">
</div>
  `).join('');

  el.querySelectorAll('.upload-card').forEach(card => {
    const t = card.dataset.t;
    const inp = card.querySelector('input');
    card.addEventListener('click', e => { if (e.target.tagName !== 'SPAN') inp.click(); });
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
    card.addEventListener('drop', e => { e.preventDefault(); card.classList.remove('drag-over'); if (e.dataTransfer.files.length) loadFile(t, e.dataTransfer.files[0]); });
    inp.addEventListener('change', e => { if (e.target.files.length) loadFile(t, e.target.files[0]); });
  });
}
initUploads();

/* ===== FILE LOADING ===== */
function loadFile(type, file) {
  const r = new FileReader();
  r.onload = e => {
    let text = e.target.result;
    // If it doesn't look like proper text, try UTF-8
    if (!text.includes('Account') && !text.includes('account')) {
      const r2 = new FileReader();
      r2.onload = e2 => parseFile(type, e2.target.result);
      r2.readAsText(file, 'utf-8');
      return;
    }
    parseFile(type, text);
  };
  r.readAsText(file, 'utf-16le');
}

function parseFile(type, text) {
  const cfg = TYPES[type];
  const s = S[type];
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let hdrIdx = -1;
  let headerCells = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = parseTSVLine(lines[i]);
    if (cells.length < 4) continue;
    const hasAccountHeader = cells.some(c => {
      const n = normalizeHeader(c);
      return n === 'account id' || n === '*account id';
    });
    if (hasAccountHeader) {
      hdrIdx = i;
      headerCells = cells;
      break;
    }
  }
  if (hdrIdx === -1) { toast('Header row not found', 'err'); return; }

  const headerIndex = {};
  headerCells.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n && headerIndex[n] === undefined) headerIndex[n] = i;
  });

  const colToHeaderIndex = {};
  const missingHeaders = [];
  cfg.cols.forEach(col => {
    const idx = headerIndex[normalizeHeader(col.csv)];
    if (idx === undefined) missingHeaders.push(col.csv);
    else colToHeaderIndex[col.k] = idx;
  });
  if (missingHeaders.length) {
    toast(`Wrong file type or outdated template: missing ${missingHeaders.length} columns`, 'err');
    return;
  }

  s.hdrLines = lines.slice(0, hdrIdx);
  s.hdrRow = lines[hdrIdx];
  s.headerCells = headerCells;
  s.colToHeaderIndex = colToHeaderIndex;

  const dataText = lines.slice(hdrIdx + 1).join('\n');
  const records = parseMultilineTSV(dataText, headerCells.length);

  s.orig = [];
  s.cur = [];
  s.rawOrig = [];
  s.rawCur = [];
  const statusSet = new Set(cfg.statusOpts);
  const ctaSet = new Set(CTA_BASE);
  const accountIdx = colToHeaderIndex.accountId;

  for (const fields of records) {
    const raw = Array.from({ length: headerCells.length }, (_, i) => fields[i] ?? '');
    if (!String(raw[accountIdx] || '').trim()) continue;
    const row = {};
    cfg.cols.forEach(col => {
      const idx = colToHeaderIndex[col.k];
      row[col.k] = idx === undefined ? '' : (raw[idx] ?? '');
    });
    s.rawOrig.push([...raw]);
    s.rawCur.push([...raw]);
    s.orig.push({ ...row });
    s.cur.push({ ...row });
    const st = row[cfg.statusField];
    if (st) statusSet.add(st);
    if (type === 'ads' && row.callToAction) ctaSet.add(row.callToAction);
  }

  s.statusOptions = Array.from(statusSet);
  s.ctaOptions = Array.from(ctaSet);
  s.loaded = true;
  s.filter = 'all';
  s.viewMode = 'all';
  s.search = '';
  s.sel = new Set();
  s.sortKey = null;
  s.sortDir = 'asc';
  const defaultVisible = cfg.cols.filter(c => !c.hide).map(c => c.k);
  s.visibleCols = Array.isArray(s.visibleCols) && s.visibleCols.length
    ? s.visibleCols.filter(k => defaultVisible.includes(k))
    : defaultVisible;
  if (!s.visibleCols.length) s.visibleCols = defaultVisible;
  if (!s.density) s.density = 'comfortable';
  s.focusRow = null;
  s.issueCursor = 0;

  runStaticPreflight(type);
  runValidation(type);

  const allLoadedNow = Object.keys(TYPES).every(k => S[k].loaded);
  if (allLoadedNow && !uploadsAutoCollapsed) {
    uploadsCollapsed = true;
    uploadsAutoCollapsed = true;
  }

  const card = Q(`#uc-${type}`);
  card.classList.add('loaded');
  card.querySelector('.ic').innerHTML = SVG.check;
  card.querySelector('p').innerHTML = `${s.cur.length} items loaded<br><span class="reload-link" onclick="event.stopPropagation(); Q('#uc-${type} input').click();">reload</span> · <span class="reload-link" onclick="event.stopPropagation(); clearFile('${type}');">remove</span>`;

  toast(`${cfg.label}: ${s.cur.length} items loaded`, 'ok');
  render();
}

function clearFile(type) {
  const s = S[type];
  const cfg = TYPES[type];
  s.orig = [];
  s.cur = [];
  s.rawOrig = [];
  s.rawCur = [];
  s.loaded = false;
  s.sel = new Set();
  s.focusRow = null;
  s.search = '';
  s.filter = 'all';
  s.viewMode = 'all';
  s.validation = { errors: 0, warnings: 0, cellIssues: new Map(), rowsWithIssues: new Set() };
  s.sortKey = null;
  s.sortDir = 'asc';

  const card = Q(`#uc-${type}`);
  card.classList.remove('loaded');
  card.querySelector('.ic').innerHTML = SVG.upload;
  card.querySelector('p').innerHTML = `Drop your ${cfg.label} Edit file here<br><span style="font-size:11px;color:var(--text-faint)">or click to browse</span>`;
  card.querySelector('input').value = '';

  if (activeTab === type) {
    const loaded = Object.keys(TYPES).filter(t => S[t].loaded);
    activeTab = loaded.length ? loaded[0] : null;
  }

  toast(`${cfg.label} removed`, 'inf');
  render();
}

function parseMultilineTSV(text, expectedCols) {
  const records = [];
  let fields = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && i + 1 < text.length && text[i + 1] === '"') {
        cur += '"'; i++; // escaped ""
      } else {
        inQ = !inQ;
      }
    } else if (ch === '\t' && !inQ) {
      fields.push(cur); cur = '';
    } else if (ch === '\n' && !inQ) {
      fields.push(cur); cur = '';
      if (fields.length >= expectedCols && fields[0].replace(/"/g, '').trim()) {
        records.push(fields.slice(0, expectedCols));
      }
      fields = [];
    } else if (ch === '\r' && !inQ) {
      // skip
    } else {
      cur += ch;
    }
  }
  // last record
  fields.push(cur);
  if (fields.length >= expectedCols && fields[0].replace(/"/g, '').trim()) {
    records.push(fields.slice(0, expectedCols));
  }
  return records;
}

function parseTSVLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && i + 1 < line.length && line[i + 1] === '"') {
        cur += '"'; i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === '\t' && !inQ) {
      fields.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      continue;
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function normalizeHeader(s) {
  return String(s || '')
    .replace(/^\uFEFF/, '')
    .replace(/^"+|"+$/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

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

