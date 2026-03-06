/* ===== BOTTOM BAR ===== */
function updateBar() {
  renderWorkspaceHead();
  let total = 0;
  let selectedTotal = 0;
  let loadedCount = 0;
  Object.keys(TYPES).forEach(t => {
    if (!S[t].loaded) return;
    loadedCount++;
    total += modCount(t);
    selectedTotal += S[t].sel.size;
  });
  Q('#barN').textContent = total;
  Q('#barTxt').innerHTML = `<strong>${total} change${total !== 1 ? 's' : ''}</strong> across files${selectedTotal ? ` · <strong>${selectedTotal}</strong> selected` : ''}`;
  const barShown = loadedCount > 0;
  Q('#bar').classList.toggle('show', barShown);
  document.body.classList.toggle('bar-open', barShown);

  const selectedInActive = activeTab && S[activeTab]?.loaded ? S[activeTab].sel.size : 0;
  const revSelBtn = Q('#barRevertSelected');
  if (revSelBtn) {
    revSelBtn.textContent = selectedInActive > 0 ? `Revert Selected (${selectedInActive})` : 'Revert Selected';
    revSelBtn.disabled = selectedInActive === 0;
  }

  const exportMenu = Q('#exportMenu');
  if (exportMenu) {
    const exportType = activeTab && S[activeTab]?.loaded ? activeTab : null;
    let menuHtml = '';
    if (!exportType) {
      menuHtml = '<div class="dd-item" style="opacity:0.6;pointer-events:none">No active file to export</div>';
    } else {
      const cfg = TYPES[exportType];
      const rowTotal = S[exportType].cur.length;
      const selectedCount = getSelectedIndices(exportType).length;
      const modifiedCount = getModifiedIndices(exportType).length;
      menuHtml = [
        `<div class="dd-item" data-et="${exportType}" data-scope="all">${SVG.download} Export ${cfg.label} file (${rowTotal} rows)</div>`,
        selectedCount
          ? `<div class="dd-item" data-et="${exportType}" data-scope="selected">${SVG.download} Export Selected Rows (${selectedCount})</div>`
          : '<div class="dd-item" style="opacity:0.6;pointer-events:none">Export Selected Rows (0)</div>',
        modifiedCount
          ? `<div class="dd-item" data-et="${exportType}" data-scope="modified">${SVG.download} Export Modified Rows (${modifiedCount})</div>`
          : '<div class="dd-item" style="opacity:0.6;pointer-events:none">Export Modified Rows (0)</div>'
      ].join('');
    }

    exportMenu.innerHTML = menuHtml;
    exportMenu.querySelectorAll('.dd-item[data-et]').forEach(it => it.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      exportFiles(it.dataset.et, it.dataset.scope || 'all');
    }));
  }
}

Q('#barExport').addEventListener('click', () => toggleDropdown(Q('#barExport'), Q('#exportMenu')));
document.addEventListener('click', e => { if (!e.target.closest('.dd')) QA('.dd-menu').forEach(m => m.classList.remove('open')); });

Q('#barRevert').addEventListener('click', () => {
  Object.keys(TYPES).forEach(t => {
    if (!S[t].loaded) return;
    revertRows(t, S[t].cur.map((_, i) => i));
    S[t].sel = new Set();
    runValidation(t);
  });
  toast('All reverted', 'inf');
  render();
});

Q('#barRevertSelected').addEventListener('click', () => {
  if (!activeTab || !S[activeTab].loaded) return;
  const s = S[activeTab];
  const selected = Array.from(s.sel).filter(i => Number.isInteger(i) && i >= 0 && i < s.cur.length).sort((a, b) => a - b);
  if (!selected.length) {
    toast('No selected rows', 'inf');
    return;
  }
  const reverted = revertRows(activeTab, selected);
  if (!reverted) {
    toast('Selected rows have no changes', 'inf');
    return;
  }
  runValidation(activeTab);
  renderPreflight();
  renderTable();
  renderInspector();
  renderToolbar();
  updateBar();
  updateTabBadges();
  toast(`Reverted ${reverted} selected row${reverted === 1 ? '' : 's'}`, 'ok');
});

/* ===== REVIEW ===== */
Q('#barReview').addEventListener('click', showReview);
Q('#reviewFilterAll').addEventListener('click', () => {
  reviewRiskOnly = false;
  Q('#reviewFilterAll').classList.add('on');
  Q('#reviewFilterRisky').classList.remove('on');
  showReview();
});
Q('#reviewFilterRisky').addEventListener('click', () => {
  reviewRiskOnly = true;
  Q('#reviewFilterRisky').classList.add('on');
  Q('#reviewFilterAll').classList.remove('on');
  showReview();
});

function isRiskyDiff(k, oldVal, newVal) {
  if (RISKY_FIELDS.has(k)) return true;
  if (String(oldVal || '').includes('\n') || String(newVal || '').includes('\n')) return true;
  if (k.toLowerCase().includes('budget') || k.toLowerCase().includes('bid')) return true;
  return false;
}

function showReview() {
  let html = '';
  Object.keys(TYPES).forEach(t => {
    if (!S[t].loaded) return;
    const cfg = TYPES[t]; const s = S[t]; let sec = '';
    for (let i = 0; i < s.cur.length; i++) {
      if (!isModified(t, i)) continue;
      let diffs = cfg.cols.filter(c => s.orig[i][c.k] !== s.cur[i][c.k]).map(c => ({
        k: c.k, h: c.h, old: s.orig[i][c.k], nw: s.cur[i][c.k]
      }));
      if (reviewRiskOnly) diffs = diffs.filter(d => isRiskyDiff(d.k, d.old, d.nw));
      if (!diffs.length) continue;
      const name = s.cur[i][cfg.nameField] || s.cur[i][cfg.idField] || `#${i}`;
      sec += `<div class="diff-item"><div class="name">${esc(name)} <span class="c-id">${s.cur[i][cfg.idField]}</span></div>`;
      diffs.forEach(d => {
        const risky = isRiskyDiff(d.k, d.old, d.nw);
        sec += `<div class="diff-row"><span class="diff-field">${d.h}:</span><span class="diff-old">${esc(d.old || '(empty)')}</span><span class="diff-arrow">→</span><span class="diff-new">${esc(d.nw || '(empty)')}</span>${risky ? '<span class="risk-tag">Risky</span>' : ''}</div>`;
      });
      sec += '</div>';
    }
    if (sec) html += `<h3>${cfg.icon} ${cfg.label}</h3>${sec}`;
  });
  Q('#reviewBody').innerHTML = html || '<div class="empty">No changes</div>';
  Q('#reviewModal').classList.add('open');
}
Q('#reviewModal').addEventListener('click', e => { if (e.target.id === 'reviewModal') e.target.classList.remove('open'); });
Q('#reviewExport').addEventListener('click', () => { Q('#reviewModal').classList.remove('open'); exportFiles(activeTab, 'modified'); });

/* ===== EXPORT ===== */
function getSelectedIndices(type) {
  return Array.from(S[type].sel)
    .filter(i => Number.isInteger(i) && i >= 0 && i < S[type].cur.length)
    .sort((a, b) => a - b);
}

function getModifiedIndices(type) {
  const s = S[type];
  const out = [];
  for (let i = 0; i < s.cur.length; i++) {
    if (isModified(type, i)) out.push(i);
  }
  return out;
}

function hasValidationErrorsInRows(type, rowIndices) {
  const s = S[type];
  if (!Array.isArray(rowIndices) || !rowIndices.length) return false;
  if (!s.validation?.cellIssues?.size) return false;
  const rowSet = new Set(rowIndices);
  const issues = s.validation.cellIssues;
  for (const [mapKey, issue] of issues.entries()) {
    if (!issue || issue.level !== 'error') continue;
    const sep = mapKey.indexOf(':');
    if (sep === -1) continue;
    const rowIdx = Number(mapKey.slice(0, sep));
    if (Number.isInteger(rowIdx) && rowSet.has(rowIdx)) return true;
  }
  return false;
}

function formatExportStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
}

function exportFiles(which = activeTab, scope = 'all') {
  const type = (which && S[which]?.loaded) ? which : (activeTab && S[activeTab]?.loaded ? activeTab : null);
  if (!type) {
    toast('No active file to export', 'inf');
    return;
  }

  let rowIndices = null;
  if (scope === 'selected') rowIndices = getSelectedIndices(type);
  if (scope === 'modified') rowIndices = getModifiedIndices(type);

  if (scope !== 'all' && (!Array.isArray(rowIndices) || !rowIndices.length)) {
    toast(scope === 'selected' ? 'No selected rows to export' : 'No modified rows to export', 'inf');
    return;
  }

  runValidation(type);
  if (S[type].preflightStatic.errors.length > 0) {
    activeTab = type;
    render();
    toast(`Fix errors before export in ${TYPES[type].label}`, 'err');
    return;
  }

  const hasErrors = rowIndices
    ? hasValidationErrorsInRows(type, rowIndices)
    : S[type].validation.errors > 0;
  if (hasErrors) {
    activeTab = type;
    render();
    toast(`Fix validation errors before export in ${TYPES[type].label}`, 'err');
    return;
  }

  exportOne(type, { rowIndices, scope });
}

function exportOne(type, { rowIndices = null, scope = 'modified' } = {}) {
  const cfg = TYPES[type]; const s = S[type];
  let lines = [...s.hdrLines, s.hdrRow];
  let exportedRows = 0;

  if (s.rawCur.length) {
    const rows = Array.isArray(rowIndices) ? rowIndices.map(i => s.rawCur[i]).filter(Boolean) : s.rawCur;
    exportedRows = rows.length;
    rows.forEach(row => {
      const vals = row.map(v => `"${(v || '').replace(/"/g, '""')}"`);
      lines.push(vals.join('\t'));
    });
  } else {
    const rows = Array.isArray(rowIndices) ? rowIndices.map(i => s.cur[i]).filter(Boolean) : s.cur;
    exportedRows = rows.length;
    rows.forEach(r => {
      const vals = cfg.cols.map(c => {
        const v = (r[c.k] || '').replace(/"/g, '""');
        return `"${v}"`;
      });
      lines.push(vals.join('\t'));
    });
  }
  if (!exportedRows) return;

  const content = lines.join('\n');
  // UTF-16LE + BOM
  const bom = new Uint8Array([0xFF, 0xFE]);
  const buf = new Uint8Array(content.length * 2);
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    buf[i * 2] = code & 0xFF;
    buf[i * 2 + 1] = (code >> 8) & 0xFF;
  }
  const blob = new Blob([bom, buf], { type: 'text/csv;charset=utf-16le' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = formatExportStamp();
  const fn = type === 'campaigns' ? 'campaign' : type === 'adsets' ? 'ad_set' : 'ad';
  const scopeSuffix = scope === 'selected'
    ? `selected-${exportedRows}`
    : scope === 'modified'
      ? `modified-${exportedRows}`
      : `all-${exportedRows}`;
  a.download = `${fn}_Edit_${stamp}_${scopeSuffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  const msg = scope === 'selected'
    ? `${cfg.label} selected export (${exportedRows} rows)`
    : scope === 'modified'
      ? `${cfg.label} modified export (${exportedRows} rows)`
      : `${cfg.label} full export (${exportedRows} rows)`;
  toast(msg, 'ok');
}
