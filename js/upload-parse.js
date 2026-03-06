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

function parseChooseFromList(raw) {
  const txt = String(raw || '').replace(/\r/g, '');
  const idx = txt.toLowerCase().indexOf('choose from');
  if (idx === -1) return [];
  const after = txt.slice(idx).replace(/^.*?choose from\s*:?/i, '');
  const out = [];
  const seen = new Set();
  after.split(/[\n,]+/).forEach(part => {
    const v = part.replace(/^"+|"+$/g, '').trim();
    if (!v) return;
    const n = v.toLowerCase();
    if (seen.has(n)) return;
    seen.add(n);
    out.push(v);
  });
  return out;
}

function parseInstructionMax(raw, labelRe) {
  const txt = String(raw || '').replace(/\r/g, '');
  const re = new RegExp(`${labelRe.source}[^\\n]*?(?:character count maximum|use up to)\\s*:?\\s*(\\d+)`, 'i');
  const m = txt.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseAdInstructionMeta(instructionRow, colToHeaderIndex) {
  const meta = { statusOptions: [], ctaOptions: [], supportedAdFormats: [], adFieldLimits: {} };
  const byKey = key => {
    const idx = colToHeaderIndex[key];
    return idx === undefined ? '' : (instructionRow[idx] || '');
  };

  meta.statusOptions = parseChooseFromList(byKey('adStatus'));
  meta.ctaOptions = parseChooseFromList(byKey('callToAction'));

  const adFormatCell = String(byKey('adFormat') || '');
  if (/single image ad/i.test(adFormatCell)) meta.supportedAdFormats.push('Single image ad');
  if (/text ad/i.test(adFormatCell)) meta.supportedAdFormats.push('Text ad');

  const adNameCell = byKey('adContentName');
  const introCell = byKey('introductory');
  const headlineCell = byKey('headline');
  const descriptionCell = byKey('description');

  const singleImage = {};
  const text = {};

  singleImage.adContentName = parseInstructionMax(adNameCell, /single image ads?/i);
  singleImage.introductory = parseInstructionMax(introCell, /single image ads?/i);
  singleImage.headline = parseInstructionMax(headlineCell, /single image ads?/i);
  singleImage.description = parseInstructionMax(descriptionCell, /single image ads?/i);
  text.headline = parseInstructionMax(headlineCell, /text ads?/i);
  text.description = parseInstructionMax(descriptionCell, /text ads?/i);

  meta.adFieldLimits = { singleImage, text };
  return meta;
}

function parseCampaignInstructionMeta(instructionRow, cfg, colToHeaderIndex) {
  const idx = colToHeaderIndex[cfg.statusField];
  const statusCell = idx === undefined ? '' : (instructionRow[idx] || '');
  return {
    statusOptions: parseChooseFromList(statusCell),
    ctaOptions: [],
    supportedAdFormats: [],
    adFieldLimits: {},
  };
}

function parseAdsetInstructionMeta(instructionRow, cfg, colToHeaderIndex) {
  const idx = colToHeaderIndex[cfg.statusField];
  const statusCell = idx === undefined ? '' : (instructionRow[idx] || '');
  return {
    statusOptions: parseChooseFromList(statusCell),
    ctaOptions: [],
    supportedAdFormats: [],
    adFieldLimits: {},
  };
}

function extractTemplateMeta(type, lines, hdrIdx, headerCells, cfg, colToHeaderIndex) {
  const base = { instructionRow: [], statusOptions: [], ctaOptions: [], supportedAdFormats: [], adFieldLimits: {} };
  if (hdrIdx <= 0 || !headerCells?.length) return base;
  const preHeaderText = lines.slice(0, hdrIdx).join('\n');
  const records = parseMultilineTSV(preHeaderText, headerCells.length);
  if (!records.length) return base;
  const instructionRow = records[records.length - 1].map(v => String(v || ''));
  if (!instructionRow.length) return base;
  if (type === 'ads') return { ...base, instructionRow, ...parseAdInstructionMeta(instructionRow, colToHeaderIndex) };
  if (type === 'campaigns') return { ...base, instructionRow, ...parseCampaignInstructionMeta(instructionRow, cfg, colToHeaderIndex) };
  if (type === 'adsets') return { ...base, instructionRow, ...parseAdsetInstructionMeta(instructionRow, cfg, colToHeaderIndex) };
  return { ...base, instructionRow };
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
      return n === 'account id';
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
  const requiredKeys = new Set(cfg.requiredKeys || cfg.cols.map(col => col.k));
  const resolveColIdx = col => {
    const headers = [col.csv, ...(Array.isArray(col.csvAliases) ? col.csvAliases : [])];
    for (const hdr of headers) {
      const idx = headerIndex[normalizeHeader(hdr)];
      if (idx !== undefined) return idx;
    }
    return undefined;
  };
  cfg.cols.forEach(col => {
    const idx = resolveColIdx(col);
    if (idx === undefined) {
      if (requiredKeys.has(col.k)) missingHeaders.push(col.csv);
    } else {
      colToHeaderIndex[col.k] = idx;
    }
  });
  if (missingHeaders.length) {
    toast(`Wrong file type or outdated template: missing ${missingHeaders.length} columns`, 'err');
    return;
  }

  const templateMeta = extractTemplateMeta(type, lines, hdrIdx, headerCells, cfg, colToHeaderIndex);

  s.hdrLines = lines.slice(0, hdrIdx);
  s.hdrRow = lines[hdrIdx];
  s.headerCells = headerCells;
  s.colToHeaderIndex = colToHeaderIndex;
  s.templateMeta = templateMeta;

  const dataText = lines.slice(hdrIdx + 1).join('\n');
  const records = parseMultilineTSV(dataText, headerCells.length);

  s.orig = [];
  s.cur = [];
  s.rawOrig = [];
  s.rawCur = [];
  const statusSet = new Set(templateMeta.statusOptions?.length ? templateMeta.statusOptions : cfg.statusOpts);
  const ctaSet = new Set(templateMeta.ctaOptions?.length ? templateMeta.ctaOptions : CTA_BASE);
  const accountIdx = colToHeaderIndex.accountId;

  for (const fields of records) {
    const raw = Array.from({ length: headerCells.length }, (_, i) => sanitizeImportedCellValue(fields[i] ?? ''));
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
  s.pinnedCols = Array.isArray(s.pinnedCols) && s.pinnedCols.length
    ? s.pinnedCols.filter(k => defaultVisible.includes(k))
    : [];
  if (!s.density) s.density = 'comfortable';
  s.focusRow = null;
  s.issueCursor = 0;
  s.tableScrollLeft = 0;
  s.tableScrollTop = 0;

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
  s.templateMeta = { instructionRow: [], statusOptions: [], ctaOptions: [], supportedAdFormats: [], adFieldLimits: {} };
  s.loaded = false;
  s.sel = new Set();
  s.focusRow = null;
  s.search = '';
  s.filter = 'all';
  s.viewMode = 'all';
  s.validation = { errors: 0, warnings: 0, cellIssues: new Map(), rowsWithIssues: new Set() };
  s.sortKey = null;
  s.sortDir = 'asc';
  s.pinnedCols = [];
  s.tableScrollLeft = 0;
  s.tableScrollTop = 0;

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
    .replace(/^\*+/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function sanitizeImportedCellValue(v) {
  return String(v || '')
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/^\uFFFD+/, '');
}
