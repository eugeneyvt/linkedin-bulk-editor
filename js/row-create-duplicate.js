function canCreateBulkEntries(type) {
  return type === 'campaigns' || type === 'adsets';
}

function formatUsDateShort(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function buildEmptyTypedRow(type) {
  const row = {};
  (TYPES[type]?.cols || []).forEach(col => { row[col.k] = ''; });
  return row;
}

function buildRawRowFromTypedRow(type, row) {
  const s = S[type];
  const raw = Array.from({ length: s.headerCells.length }, () => '');
  Object.entries(s.colToHeaderIndex || {}).forEach(([k, idx]) => {
    raw[idx] = row[k] || '';
  });
  return raw;
}

function resolveCampaignNameById(campaignId) {
  const id = String(campaignId || '').trim();
  if (!id || !S.campaigns?.loaded) return '';
  const hit = S.campaigns.cur.find(r => String(r.campaignId || '').trim() === id);
  return hit?.campaignName || '';
}

function defaultCampaignStatus() {
  return 'Draft';
}

function defaultAdSetStatus() {
  const allowed = typeof getAllowedAdSetStatusTransitions === 'function'
    ? getAllowedAdSetStatusTransitions('')
    : ['Draft', 'Active', 'Paused'];
  if (allowed.includes('Draft')) return 'Draft';
  if (allowed.includes('Paused')) return 'Paused';
  if (allowed.includes('Active')) return 'Active';
  return allowed[0] || 'Draft';
}

function buildNewBaseRow(type, seed = null) {
  const s = S[type];
  const base = buildEmptyTypedRow(type);
  const fallback = seed || s.cur[0] || {};
  base.accountId = fallback.accountId || '';
  base.accountName = fallback.accountName || '';

  if (type === 'campaigns') {
    base.campaignId = '';
    base.campaignName = '';
    base.status = defaultCampaignStatus();
    base.startDate = formatUsDateShort();
    return base;
  }

  if (type === 'adsets') {
    base.adSetId = '';
    base.adSetName = '';
    base.adSetStatus = defaultAdSetStatus();
    base.campaignId = fallback.campaignId || '';
    if (!base.campaignId) {
      base.campaignId = s.cur.find(r => String(r.campaignId || '').trim())?.campaignId || '';
    }
    if (!base.campaignId && S.campaigns?.loaded) {
      base.campaignId = S.campaigns.cur.find(r => String(r.campaignId || '').trim())?.campaignId || '';
    }
    base.campaignName = fallback.campaignName || resolveCampaignNameById(base.campaignId);
    base.profileLanguage = fallback.profileLanguage || 'English';
    base.startDate = formatUsDateShort();
    return base;
  }

  return base;
}

function sanitizeDuplicatedRow(type, sourceRow) {
  const row = buildNewBaseRow(type, sourceRow);
  if (!sourceRow) return row;

  if (type === 'campaigns') {
    row.campaignName = sourceRow.campaignName || '';
    row.totalBudget = sourceRow.totalBudget || '';
    row.startDate = formatUsDateShort();
    row.endDate = sourceRow.endDate || '';
    const srcStatus = String(sourceRow.status || '').trim();
    row.status = srcStatus || row.status;
    if (normalizeLabel(row.status) === 'archived') row.status = 'Paused';
    return row;
  }

  if (type === 'adsets') {
    row.adSetName = sourceRow.adSetName || '';
    row.objective = sourceRow.objective || '';
    row.adFormat = sourceRow.adFormat || '';
    row.profileLanguage = sourceRow.profileLanguage || row.profileLanguage;
    row.audienceTemplateId = sourceRow.audienceTemplateId || '';
    row.audienceString = sourceRow.audienceString || '';
    row.audienceExpansion = sourceRow.audienceExpansion || '';
    row.linkedinNetwork = sourceRow.linkedinNetwork || '';
    row.dailyBudget = sourceRow.dailyBudget || '';
    row.lifetimeBudget = sourceRow.lifetimeBudget || '';
    row.startDate = formatUsDateShort();
    row.endDate = sourceRow.endDate || '';
    row.optimizationGoal = sourceRow.optimizationGoal || '';
    row.bidAdjustment = sourceRow.bidAdjustment || '';
    row.bidAmount = sourceRow.bidAmount || '';
    row.biddingStrategy = sourceRow.biddingStrategy || '';
    row.politicalIntent = sourceRow.politicalIntent || '';
    row.adSetStatus = defaultAdSetStatus();
    return row;
  }

  return row;
}

function appendAsNewEntityRow(type, values) {
  return appendAsNewEntityRows(type, [values])[0];
}

function appendAsNewEntityRows(type, valuesList = []) {
  const s = S[type];
  const out = [];
  valuesList.forEach(values => {
    const orig = buildEmptyTypedRow(type);
    const cur = { ...orig, ...values };
    s.orig.push(orig);
    s.cur.push(cur);
    s.rawOrig.push(buildRawRowFromTypedRow(type, orig));
    s.rawCur.push(buildRawRowFromTypedRow(type, cur));
    out.push(s.cur.length - 1);
  });
  if (!out.length) return out;
  s.sel = new Set(out);
  s.focusRow = out[0];
  s.viewMode = 'all';
  s.filter = 'all';
  return out;
}

function getDuplicateSourceIndices(type) {
  const s = S[type];
  if (!s) return [];
  const selected = Array.from(s.sel)
    .filter(i => Number.isInteger(i) && i >= 0 && i < s.cur.length)
    .sort((a, b) => a - b);
  if (selected.length) return selected;
  if (Number.isInteger(s.focusRow) && s.focusRow >= 0 && s.focusRow < s.cur.length) return [s.focusRow];
  return [];
}

function getDuplicateSourceIndex(type) {
  const all = getDuplicateSourceIndices(type);
  return all.length ? all[0] : null;
}

function getRowValidationIssues(type, rowIdx) {
  const s = S[type];
  if (!s || !Number.isInteger(rowIdx)) return [];
  const out = [];
  s.validation.cellIssues.forEach((issue, mapKey) => {
    const sep = mapKey.indexOf(':');
    if (sep === -1) return;
    const i = Number(mapKey.slice(0, sep));
    if (i !== rowIdx) return;
    const key = mapKey.slice(sep + 1);
    if (!key) return;
    out.push({ key, level: issue.level || 'warn', msg: issue.msg || '' });
  });
  out.sort((a, b) => (a.level === 'error' ? -1 : 1) - (b.level === 'error' ? -1 : 1));
  return out;
}

function focusInspectorField(issueKey) {
  if (!issueKey) return;
  setTimeout(() => {
    const candidates = QA('#inspectorZone [data-ins-k]');
    if (!candidates || !candidates.length) return;
    const hit = [...candidates].find(el => el.dataset?.insK === issueKey);
    if (!hit) return;
    hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof hit.focus === 'function') hit.focus({ preventScroll: true });
  }, 0);
}

function notifyCreatedRowValidation(type, rowIdx, fallbackOkText) {
  const issues = getRowValidationIssues(type, rowIdx);
  if (!issues.length) {
    toast(fallbackOkText, 'ok');
    return;
  }
  const first = issues[0];
  const fieldLabel = TYPES[type]?.cols?.find(c => c.k === first.key)?.h || first.key;
  const level = issues.some(x => x.level === 'error') ? 'err' : 'inf';
  const issueWord = issues.length === 1 ? 'issue' : 'issues';
  toast(`Validation ${level === 'err' ? 'error' : 'warning'}: ${issues.length} ${issueWord}. ${fieldLabel}: ${first.msg}`, level);
  focusInspectorField(first.key);
}

function notifyCreatedRowsValidation(type, rowIndices, okTextSingle, okTextMany) {
  const indices = Array.isArray(rowIndices)
    ? rowIndices.filter(i => Number.isInteger(i) && i >= 0)
    : [];
  if (!indices.length) return;
  if (indices.length === 1) {
    notifyCreatedRowValidation(type, indices[0], okTextSingle);
    return;
  }

  let totalIssues = 0;
  let rowsWithIssues = 0;
  let firstIssue = null;
  let hasError = false;
  indices.forEach(i => {
    const rowIssues = getRowValidationIssues(type, i);
    if (!rowIssues.length) return;
    rowsWithIssues++;
    totalIssues += rowIssues.length;
    if (!firstIssue) firstIssue = { rowIdx: i, issue: rowIssues[0] };
    if (rowIssues.some(x => x.level === 'error')) hasError = true;
  });

  if (!firstIssue) {
    toast(okTextMany, 'ok');
    return;
  }

  const fieldLabel = TYPES[type]?.cols?.find(c => c.k === firstIssue.issue.key)?.h || firstIssue.issue.key;
  const level = hasError ? 'err' : 'inf';
  const rowLabel = `Row #${firstIssue.rowIdx + 1}`;
  toast(`Validation ${hasError ? 'error' : 'warning'}: ${rowsWithIssues} duplicated rows have ${totalIssues} issues. First: ${rowLabel}, ${fieldLabel}: ${firstIssue.issue.msg}`, level);
}

function getSeedRowForNewEntry(type) {
  const s = S[type];
  if (!s) return null;
  const sourceIdx = getDuplicateSourceIndex(type);
  if (Number.isInteger(sourceIdx) && sourceIdx >= 0 && sourceIdx < s.cur.length) return s.cur[sourceIdx];
  return s.cur[0] || null;
}

function isSessionCreatedRow(type, rowIdx) {
  const s = S[type];
  if (!s || !Number.isInteger(rowIdx) || rowIdx < 0 || rowIdx >= s.orig.length) return false;
  const orig = s.orig[rowIdx];
  if (!orig) return false;
  const hasTypedValue = (TYPES[type]?.cols || []).some(col => String(orig[col.k] || '').trim());
  if (hasTypedValue) return false;
  const raw = s.rawOrig[rowIdx];
  if (Array.isArray(raw) && raw.some(v => String(v || '').trim())) return false;
  return true;
}

function remapIndexAfterRemoval(idx, removedAsc) {
  let next = idx;
  for (const removedIdx of removedAsc) {
    if (removedIdx === next) return null;
    if (removedIdx < next) next--;
  }
  return next;
}

function removeRowsFromState(type, rowIndices) {
  const s = S[type];
  if (!s || !Array.isArray(rowIndices) || !rowIndices.length) return 0;
  const validUniqueAsc = [...new Set(rowIndices.filter(i => Number.isInteger(i) && i >= 0 && i < s.cur.length))]
    .sort((a, b) => a - b);
  if (!validUniqueAsc.length) return 0;
  const validUniqueDesc = [...validUniqueAsc].sort((a, b) => b - a);

  validUniqueDesc.forEach(i => {
    s.orig.splice(i, 1);
    s.cur.splice(i, 1);
    s.rawOrig.splice(i, 1);
    s.rawCur.splice(i, 1);
  });

  const nextSel = new Set();
  s.sel.forEach(i => {
    const next = remapIndexAfterRemoval(i, validUniqueAsc);
    if (Number.isInteger(next)) nextSel.add(next);
  });
  s.sel = nextSel;

  if (Number.isInteger(s.focusRow)) {
    s.focusRow = remapIndexAfterRemoval(s.focusRow, validUniqueAsc);
  }
  if (!Number.isInteger(s.focusRow)) {
    if (s.sel.size === 1) s.focusRow = [...s.sel][0];
    else if (s.cur.length) s.focusRow = Math.min(validUniqueAsc[0], s.cur.length - 1);
    else s.focusRow = null;
  }

  return validUniqueAsc.length;
}

function getRemovableNewEntryIndices(type = activeTab) {
  if (!type || !S[type]?.loaded) return [];
  const s = S[type];
  let candidates = Array.from(s.sel).filter(i => Number.isInteger(i) && i >= 0 && i < s.cur.length);
  if (!candidates.length && Number.isInteger(s.focusRow) && s.focusRow >= 0 && s.focusRow < s.cur.length) {
    candidates = [s.focusRow];
  }
  return candidates.filter(i => isSessionCreatedRow(type, i));
}

function scrollToRowIfVisible(idx) {
  setTimeout(() => {
    const tr = Q(`tr[data-i="${idx}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

function addNewEntry(type = activeTab) {
  if (!type || !S[type]?.loaded) return;
  if (!canCreateBulkEntries(type)) {
    toast('LinkedIn bulk templates allow creating only Campaigns and Ad Sets', 'inf');
    return;
  }

  const newRow = buildNewBaseRow(type, getSeedRowForNewEntry(type));
  const idx = appendAsNewEntityRow(type, newRow);

  runValidation(type);
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
  updateTabBadges();
  scrollToRowIfVisible(idx);
  notifyCreatedRowValidation(type, idx, 'New entry row added');
}

function deleteNewEntries(type = activeTab, rowIndices = null) {
  if (!type || !S[type]?.loaded) return;
  const indices = Array.isArray(rowIndices) ? rowIndices : getRemovableNewEntryIndices(type);
  if (!indices.length) {
    toast('Select/focus a newly added row to delete', 'inf');
    return;
  }
  const removed = removeRowsFromState(type, indices.filter(i => isSessionCreatedRow(type, i)));
  if (!removed) {
    toast('Only newly added rows can be deleted', 'inf');
    return;
  }

  runValidation(type);
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
  updateTabBadges();
  toast(`Deleted ${removed} new row${removed === 1 ? '' : 's'}`, 'ok');
}

function duplicateEntry(type = activeTab, sourceIdx = null) {
  if (!type || !S[type]?.loaded) return;
  if (!canCreateBulkEntries(type)) {
    toast('LinkedIn bulk templates allow creating only Campaigns and Ad Sets', 'inf');
    return;
  }

  const sourceIndices = Array.isArray(sourceIdx)
    ? sourceIdx.filter(i => Number.isInteger(i) && i >= 0 && i < S[type].cur.length)
    : (Number.isInteger(sourceIdx) ? [sourceIdx] : getDuplicateSourceIndices(type));

  if (!sourceIndices.length) {
    toast('Select row(s) or focus a row to duplicate', 'inf');
    return;
  }

  const newRows = sourceIndices.map(i => sanitizeDuplicatedRow(type, S[type].cur[i]));
  const newIndices = appendAsNewEntityRows(type, newRows);

  runValidation(type);
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
  updateTabBadges();
  if (newIndices.length) scrollToRowIfVisible(newIndices[0]);
  notifyCreatedRowsValidation(
    type,
    newIndices,
    'Row duplicated as a new entry',
    `${newIndices.length} rows duplicated as new entries`
  );
}
