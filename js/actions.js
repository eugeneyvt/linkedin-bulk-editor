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

  // Export menu: modified exports + selected exports
  const modItems = Object.keys(TYPES).filter(t => S[t].loaded && modCount(t) > 0).map(t =>
    `<div class="dd-item" data-et="${t}" data-scope="modified">${SVG.download} ${TYPES[t].label} (${modCount(t)} changes)</div>`
  );
  const selItems = Object.keys(TYPES).filter(t => S[t].loaded && S[t].sel.size > 0).map(t =>
    `<div class="dd-item" data-et="${t}" data-scope="selected">${SVG.download} ${TYPES[t].label} (selected ${S[t].sel.size})</div>`
  );

  let menuHtml = '';
  if (modItems.length) {
    menuHtml += modItems.join('');
    menuHtml += `<div class="dd-item" data-et="all" data-scope="modified" style="font-weight:600">${SVG.download} Export All Modified</div>`;
  }
  if (selItems.length) {
    if (menuHtml) menuHtml += '<div class="dd-item" style="height:1px;padding:0;margin:4px 8px;background:var(--border-light);pointer-events:none"></div>';
    menuHtml += selItems.join('');
  }
  if (!menuHtml) menuHtml = '<div class="dd-item" style="opacity:0.6;pointer-events:none">Nothing to export</div>';
  Q('#exportMenu').innerHTML = menuHtml;
  Q('#exportMenu').querySelectorAll('.dd-item[data-et]').forEach(it => it.addEventListener('click', () => {
    Q('#exportMenu').classList.remove('open');
    exportFiles(it.dataset.et, it.dataset.scope || 'modified');
  }));
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
  const changed = selected.filter(i => isModified(activeTab, i));
  if (!changed.length) {
    toast('Selected rows have no changes', 'inf');
    return;
  }
  const reverted = revertRows(activeTab, changed);
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
Q('#reviewExport').addEventListener('click', () => { Q('#reviewModal').classList.remove('open'); exportFiles('all', 'modified'); });

/* ===== EXPORT ===== */
function getSelectedIndices(type) {
  return Array.from(S[type].sel)
    .filter(i => Number.isInteger(i) && i >= 0 && i < S[type].cur.length)
    .sort((a, b) => a - b);
}

function hasValidationIssuesInRows(type, rowIndices) {
  const s = S[type];
  const issues = s.validation.cellIssues;
  for (const idx of rowIndices) {
    for (const col of TYPES[type].cols) {
      if (issues.has(`${idx}:${col.k}`)) return true;
    }
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

function exportFiles(which, scope = 'modified') {
  let types = [];
  if (scope === 'selected') {
    if (which === 'all') {
      types = Object.keys(TYPES).filter(t => S[t].loaded && S[t].sel.size > 0);
    } else if (S[which]?.loaded && S[which].sel.size > 0) {
      types = [which];
    }
  } else {
    types = which === 'all'
      ? Object.keys(TYPES).filter(t => S[t].loaded && modCount(t) > 0)
      : (S[which]?.loaded ? [which] : []);
  }
  if (!types.length) {
    toast(scope === 'selected' ? 'No selected rows to export' : 'Nothing to export', 'inf');
    return;
  }

  const blocked = types.filter(t => {
    runValidation(t);
    if (S[t].preflightStatic.errors.length > 0) return true;
    if (scope === 'selected') return hasValidationIssuesInRows(t, getSelectedIndices(t));
    return S[t].validation.errors > 0;
  });
  if (blocked.length) {
    activeTab = blocked[0];
    render();
    toast(`Fix errors before export in ${blocked.map(t => TYPES[t].label).join(', ')}`, 'err');
    return;
  }
  types.forEach(type => {
    const rowIndices = scope === 'selected' ? getSelectedIndices(type) : null;
    exportOne(type, { rowIndices, scope });
  });
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
    : `modified-${modCount(type)}_rows-${s.cur.length}`;
  a.download = `${fn}_Edit_${stamp}_${scopeSuffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(scope === 'selected'
    ? `${cfg.label} selected export (${exportedRows} rows)`
    : `${cfg.label} exported (${modCount(type)} changes)`, 'ok');
}
