/* ===== RENDERING ===== */
function render() {
  const loaded = Object.keys(TYPES).filter(t => S[t].loaded);
  const container = Q('.container');
  if (!loaded.length) {
    Q('#workspace').style.display = 'none';
    container.classList.add('upload-mode');
    return;
  }
  container.classList.remove('upload-mode');
  Q('#workspace').style.display = '';
  const gs = Q('#gettingStarted');
  if (gs) gs.classList.add('hidden');
  if (!activeTab || !S[activeTab].loaded) activeTab = loaded[0];
  if (!uploadsAutoCollapsed && loaded.length > 0) {
    uploadsAutoCollapsed = true;
    uploadsCollapsed = true;
  }
  renderUploadsCtl();
  Q('#uploads').classList.toggle('collapsed', uploadsCollapsed);
  runValidation(activeTab);
  updateMeta();
  renderTabs(loaded);
  renderWorkspaceHead();
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
}

function renderUploadsCtl() {
  const loadedCount = Object.keys(TYPES).filter(t => S[t].loaded).length;
  if (!loadedCount) { Q('#uploadsCtl').innerHTML = ''; return; }
  const allLoaded = loadedCount === Object.keys(TYPES).length;
  const label = uploadsCollapsed ? 'Show upload cards' : 'Hide upload cards';
  Q('#uploadsCtl').innerHTML = `<button class="uploads-toggle" id="uploadsToggle">${label}</button>`;
  Q('#uploadsToggle').addEventListener('click', () => {
    uploadsCollapsed = !uploadsCollapsed;
    if (!uploadsCollapsed) uploadsAutoCollapsed = true;
    Q('#uploads').classList.toggle('collapsed', uploadsCollapsed);
    Q('#uploadsToggle').textContent = uploadsCollapsed ? 'Show upload cards' : 'Hide upload cards';
  });
}

function renderWorkspaceHead() {
  if (!activeTab) return;
  const s = S[activeTab];
  const total = s.cur.length;
  const modified = modCount(activeTab);
  const issues = s.validation.errors + s.validation.warnings;
  const selected = s.sel.size;
  Q('#workspaceHead').innerHTML = `
<div class="workspace-head">
  <div class="wh-card">
    <div class="wh-label">Rows</div>
    <div class="wh-value">${total}</div>
    <div class="wh-sub">Loaded in current tab</div>
  </div>
  <div class="wh-card">
    <div class="wh-label">Modified</div>
    <div class="wh-value">${modified}</div>
    <div class="wh-sub">Rows changed</div>
  </div>
  <div class="wh-card">
    <div class="wh-label">Issues</div>
    <div class="wh-value">${issues}</div>
    <div class="wh-sub">${s.validation.errors} errors, ${s.validation.warnings} warnings</div>
  </div>
  <div class="wh-card">
    <div class="wh-label">Selection</div>
    <div class="wh-value">${selected}</div>
    <div class="wh-sub">Rows selected for bulk actions</div>
  </div>
</div>
  `;
}

function updateMeta() {
  const loaded = Object.keys(TYPES).filter(t => S[t].loaded);
  if (loaded.length && S[loaded[0]].cur.length) {
    const r = S[loaded[0]].cur[0];
    Q('#meta').textContent = `${r.accountName || r[TYPES[loaded[0]].cols[1].k] || ''} • ${r.accountId || r[TYPES[loaded[0]].cols[0].k] || ''}`;
  }
}

function renderTabs(loaded) {
  const el = Q('#tabs');
  el.style.display = loaded.length > 0 ? 'flex' : 'none';
  el.innerHTML = loaded.map(t => {
    const c = TYPES[t]; const n = S[t].cur.length; const m = modCount(t);
    return `<div class="tab ${t === activeTab ? 'active' : ''}" data-t="${t}">${c.icon} ${c.label} <span class="badge">${n}</span>${m ? `<span class="mod-badge">${m}✎</span>` : ''}</div>`;
  }).join('');
  el.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { activeTab = tab.dataset.t; render(); }));
}

function renderPreflight() {
  if (!activeTab) return;
  const s = S[activeTab];
  const pf = s.preflightStatic;
  const v = s.validation;
  const crossWarnings = getCrossEntityWarnings(activeTab);
  const errorCount = (pf.errors?.length || 0) + (v.errors || 0);
  const warningCount = (pf.warnings?.length || 0) + (v.warnings || 0) + crossWarnings.length;
  const infoCount = (pf.infos?.length || 0);

  const lines = [];
  pf.errors.forEach(x => lines.push(`<div class="pf-line err">${SVG.error} ${esc(x)}</div>`));
  pf.warnings.forEach(x => lines.push(`<div class="pf-line warn">${SVG.warning} ${esc(x)}</div>`));
  crossWarnings.forEach(x => lines.push(`<div class="pf-line warn">${SVG.warning} ${esc(x)}</div>`));
  pf.infos.forEach(x => lines.push(`<div class="pf-line inf">${SVG.info} ${esc(x)}</div>`));
  if (v.errors) lines.push(`<div class="pf-line err">${SVG.error} Validation errors in editable cells: <strong>${v.errors}</strong></div>`);
  if (v.warnings) lines.push(`<div class="pf-line warn">${SVG.warning} Validation warnings in editable cells: <strong>${v.warnings}</strong></div>`);
  if (!lines.length) {
    Q('#preflight').innerHTML = '';
    return;
  }

  Q('#preflight').innerHTML = `
<div class="preflight">
  <div class="pf-head">
    <div class="pf-title">Preflight Checks</div>
    <div class="pf-chips">
      <span class="pf-chip ${errorCount ? 'err' : 'ok'}">Errors: ${errorCount}</span>
      <span class="pf-chip ${warningCount ? 'warn' : 'ok'}">Warnings: ${warningCount}</span>
      <span class="pf-chip ${infoCount ? 'warn' : 'ok'}">Info: ${infoCount}</span>
    </div>
  </div>
  <div class="pf-list">${lines.join('')}</div>
</div>
  `;
}

function getCrossEntityWarnings(type) {
  const out = [];
  if (type === 'adsets' && S.campaigns.loaded) {
    const knownCampaignIds = new Set(S.campaigns.cur.map(r => (r.campaignId || '').trim()).filter(Boolean));
    const missing = S.adsets.cur.filter(r => {
      const id = (r.campaignId || '').trim();
      return id && !knownCampaignIds.has(id);
    });
    if (missing.length) out.push(`Ad Sets linked to unknown Campaign IDs: ${missing.length}`);
  }

  if (type === 'ads' && S.adsets.loaded) {
    const knownAdSetIds = new Set(S.adsets.cur.map(r => (r.adSetId || '').trim()).filter(Boolean));
    const missing = S.ads.cur.filter(r => {
      const id = (r.adSetId || '').trim();
      return id && !knownAdSetIds.has(id);
    });
    if (missing.length) out.push(`Ads linked to unknown Ad Set IDs: ${missing.length}`);
  }

  if (type === 'ads' && S.campaigns.loaded) {
    const knownCampaignIds = new Set(S.campaigns.cur.map(r => (r.campaignId || '').trim()).filter(Boolean));
    const missing = S.ads.cur.filter(r => {
      const id = (r.campaignId || '').trim();
      return id && !knownCampaignIds.has(id);
    });
    if (missing.length) out.push(`Ads linked to unknown Campaign IDs: ${missing.length}`);
  }
  return out;
}

function renderToolbar() {
  const t = activeTab; const s = S[t]; const c = TYPES[t];
  const allVisibleCols = c.cols.filter(col => !col.hide);
  if (!s.visibleCols || !s.visibleCols.length) s.visibleCols = allVisibleCols.map(col => col.k);
  const visibleSet = new Set(s.visibleCols);
  const vmCounts = {
    all: s.cur.length,
    modified: modCount(t),
    issues: s.validation.rowsWithIssues.size
  };
  const statuses = ['all', ...new Set(s.cur.map(r => r[c.statusField]).filter(Boolean))];
  const filtered = getFiltered(t);
  const filteredCount = filtered.length;
  Q('#toolbar').innerHTML = `<div class="toolbar">
<input class="search" placeholder="Search ${c.label.toLowerCase()}..." value="${esc(s.search)}" id="searchInp" aria-label="Search ${c.label.toLowerCase()}">
<div class="toolbar-sep"></div>
<div class="toolbar-group">
  ${['all', 'modified', 'issues'].map(vm => `<span class="pill ${vm === s.viewMode ? 'on' : ''}" data-vm="${vm}">${vm[0].toUpperCase() + vm.slice(1)} (${vmCounts[vm]})</span>`).join('')}
</div>
<div class="toolbar-sep"></div>
<div class="toolbar-group">
  ${statuses.map(st => `<span class="pill ${st === s.filter ? 'on' : ''}" data-f="${st}">${st === 'all' ? 'All' : st}</span>`).join('')}
</div>
<div class="toolbar-sep"></div>
<div class="toolbar-group">
  <button class="btn btn-s btn-sm" id="densityBtn">${s.density === 'compact' ? 'Density: Compact' : 'Density: Comfortable'}</button>
  <div class="dd">
    <button class="btn btn-s btn-sm" id="colsBtn">Columns ▾</button>
    <div class="dd-menu" id="colsMenu">
      ${allVisibleCols.map(col => `<div class="dd-item" data-col="${col.k}">${visibleSet.has(col.k) ? '☑' : '☐'} ${esc(col.h)}</div>`).join('')}
    </div>
  </div>
  <button class="btn btn-s btn-sm" id="nextIssue">${SVG.warning} Next issue</button>
  <button class="btn btn-s btn-sm" id="fnrToggle">${SVG.search} Find & Replace</button>
</div>
<div class="toolbar-sep"></div>
<div class="toolbar-group">
  <button class="btn btn-s btn-sm" id="selFiltered">✓ Select filtered (${filteredCount})</button>
  <button class="btn btn-s btn-sm" id="clearSel">✕ Clear selection</button>

</div>
  </div>`;

  Q('#searchInp').addEventListener('input', e => {
    s.search = e.target.value;
    renderTable();
    renderInspector();
  });
  Q('#toolbar').querySelectorAll('[data-f]').forEach(p => p.addEventListener('click', () => { s.filter = p.dataset.f; render(); }));
  Q('#toolbar').querySelectorAll('[data-vm]').forEach(p => p.addEventListener('click', () => { s.viewMode = p.dataset.vm; render(); }));
  Q('#fnrToggle').addEventListener('click', () => toggleFnR());
  Q('#selFiltered').addEventListener('click', () => { filtered.forEach(({ i }) => s.sel.add(i)); render(); });
  Q('#clearSel').addEventListener('click', () => { s.sel = new Set(); render(); });
  Q('#densityBtn').addEventListener('click', () => {
    s.density = s.density === 'compact' ? 'comfortable' : 'compact';
    renderToolbar();
    renderTable();
    renderInspector();
  });
  Q('#nextIssue').addEventListener('click', () => jumpToNextIssue(t));

  const colsBtn = Q('#colsBtn');
  const colsMenu = Q('#colsMenu');
  colsBtn.addEventListener('click', () => toggleDropdown(colsBtn, colsMenu));
  colsMenu.querySelectorAll('.dd-item').forEach(it => it.addEventListener('click', () => {
    const k = it.dataset.col;
    if (visibleSet.has(k)) {
      if (s.visibleCols.length === 1) {
        toast('At least one column must remain visible', 'inf');
        return;
      }
      s.visibleCols = s.visibleCols.filter(x => x !== k);
    } else {
      s.visibleCols = [...s.visibleCols, k];
    }
    renderToolbar();
    renderTable();
    renderInspector();
  }));


}

function getFiltered(t) {
  const s = S[t]; const c = TYPES[t]; const q = s.search.toLowerCase();
  let result = s.cur.map((r, i) => ({ r, i })).filter(({ r, i }) => {
    if (s.filter !== 'all' && r[c.statusField] !== s.filter) return false;
    if (s.viewMode === 'modified' && !isModified(t, i)) return false;
    if (s.viewMode === 'issues' && !s.validation.rowsWithIssues.has(i)) return false;
    if (q) return c.cols.some(col => (r[col.k] || '').toLowerCase().includes(q));
    return true;
  });
  // Apply sorting
  if (s.sortKey) {
    const dir = s.sortDir === 'asc' ? 1 : -1;
    const col = c.cols.find(col => col.k === s.sortKey);
    const isNum = col && (col.type === 'num');
    result.sort((a, b) => {
      let va = a.r[s.sortKey] || '';
      let vb = b.r[s.sortKey] || '';
      if (isNum) {
        const na = parseFloat(va) || 0;
        const nb = parseFloat(vb) || 0;
        return (na - nb) * dir;
      }
      return va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }
  return result;
}

function isModified(t, i) {
  const c = TYPES[t];
  return c.cols.some(col => S[t].orig[i][col.k] !== S[t].cur[i][col.k]);
}
function modCount(t) { let n = 0; for (let i = 0; i < S[t].cur.length; i++) if (isModified(t, i)) n++; return n; }

function renderTable() {
  const t = activeTab; const cfg = TYPES[t]; const s = S[t];
  let vis = cfg.cols.filter(c => !c.hide && s.visibleCols.includes(c.k));
  if (!vis.length) vis = [cfg.cols.find(c => !c.hide)].filter(Boolean);
  const filtered = getFiltered(t);

  if (!filtered.length) {
    Q('#tableZone').innerHTML = `<div class="table-container ${s.density === 'compact' ? 'compact' : ''}"><div class="empty">No items match your filters</div></div>`;
    return;
  }

  const allSelected = filtered.length > 0 && filtered.every(({ i }) => s.sel.has(i));
  let h = `<div class="table-container ${s.density === 'compact' ? 'compact' : ''}"><table><thead><tr><th class="ck"><input type="checkbox" id="selAll" ${allSelected ? 'checked' : ''}></th>`;
  vis.forEach((col, ci) => {
    const isSorted = s.sortKey === col.k;
    const arrow = isSorted ? (s.sortDir === 'asc' ? '▲' : '▼') : '⇅';
    const sortCls = isSorted ? (s.sortDir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    h += `<th class="${sortCls}" data-ci="${ci}" data-sk="${col.k}">${col.h}<span class="sort-arrow">${arrow}</span><span class="resize-handle" data-ci="${ci}"></span></th>`;
  });
  h += '</tr></thead><tbody>';

  filtered.forEach(({ r, i }) => {
    const mod = isModified(t, i);
    const rowIssue = s.validation.rowsWithIssues.has(i);
    const rowFocus = s.focusRow === i;
    h += `<tr class="${mod ? 'mod' : ''}${rowIssue ? ' issue' : ''}${rowFocus ? ' focus' : ''}" data-i="${i}"><td class="ck"><input type="checkbox" ${s.sel.has(i) ? 'checked' : ''} data-si="${i}"></td>`;
    vis.forEach(col => {
      const v = r[col.k] || '';
      const issue = s.validation.cellIssues.get(`${i}:${col.k}`);
      const issueCls = issue ? ` is-${issue.level}` : '';
      const issueTitle = issue ? ` title="${esc(issue.msg)}"` : '';
      if (col.type === 'id') {
        h += `<td><span class="c-id">${esc(v)}</span></td>`;
      } else if (col.type === 'ro') {
        h += `<td><span class="c-ro" title="${esc(v)}">${esc(v)}</span></td>`;
      } else if (col.type === 'status' && col.edit) {
        const dc = v.toLowerCase().replace(/\s/g, '');
        h += `<td><div class="status-cell"><span class="dot dot-${dc}"></span><select class="c-in status-select${issueCls}" data-i="${i}" data-k="${col.k}"${issueTitle}>`;
        s.statusOptions.forEach(o => { h += `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`; });
        if (!s.statusOptions.includes(v) && v) h += `<option value="${esc(v)}" selected disabled>${esc(v)}</option>`;
        h += '</select></div></td>';
      } else if (col.type === 'cta' && col.edit) {
        h += `<td><select class="c-in${issueCls}" data-i="${i}" data-k="${col.k}"${issueTitle}><option value="">—</option>`;
        s.ctaOptions.forEach(o => { h += `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`; });
        if (!s.ctaOptions.includes(v) && v) h += `<option value="${esc(v)}" selected disabled>${esc(v)}</option>`;
        h += '</select></td>';
      } else if (col.type === 'long' && col.edit) {
        const compact = v.replace(/\n/g, ' ⏎ ');
        const preview = compact.length > 90 ? compact.substring(0, 90) + '…' : compact;
        h += `<td class="expand-cell"><span class="c-ro${issueCls}" title="${esc(v)}">${esc(preview)}</span><button class="expand-btn" data-i="${i}" data-k="${col.k}" data-h="${esc(col.h)}">↗</button></td>`;
      } else if (col.type === 'url' && col.edit) {
        h += `<td><input type="text" class="c-in url${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}></td>`;
      } else if (col.type === 'num' && col.edit) {
        h += `<td><input type="text" class="c-in num${issueCls}" value="${esc(v)}" placeholder="—" data-i="${i}" data-k="${col.k}"${issueTitle}></td>`;
      } else if (col.type === 'date' && col.edit) {
        h += `<td><input type="text" class="c-in date${issueCls}" value="${esc(v)}" placeholder="MM/DD/YYYY" data-i="${i}" data-k="${col.k}"${issueTitle}></td>`;
      } else if (col.type === 'wide' && col.edit) {
        h += `<td><input type="text" class="c-in wide${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}></td>`;
      } else if (col.edit) {
        h += `<td><input type="text" class="c-in${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}></td>`;
      } else {
        h += `<td>${esc(v)}</td>`;
      }
    });
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  Q('#tableZone').innerHTML = h;

  // Bind events
  Q('#selAll').addEventListener('change', e => {
    if (e.target.checked) filtered.forEach(({ i }) => s.sel.add(i)); else s.sel = new Set();
    render();
  });
  QA('[data-si]').forEach(cb => cb.addEventListener('change', e => {
    const i = +e.target.dataset.si;
    e.target.checked ? s.sel.add(i) : s.sel.delete(i);
    renderWorkspaceHead();
    renderToolbar();
  }));

  // Sort click on headers
  QA('thead th.sortable').forEach(th => th.addEventListener('click', e => {
    if (e.target.classList.contains('resize-handle')) return; // don't sort when resizing
    const sk = th.dataset.sk;
    if (s.sortKey === sk) {
      s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      s.sortKey = sk;
      s.sortDir = 'asc';
    }
    renderTable();
  }));

  // Cell edits
  QA('.c-in').forEach(el => {
    const handler = () => {
      const i = +el.dataset.i; const k = el.dataset.k;
      if (s.cur[i][k] === el.value) return;
      setCellValue(t, i, k, el.value);
      runValidation(t);
      renderPreflight();
      el.classList.remove('is-error', 'is-warn');
      const issue = s.validation.cellIssues.get(`${i}:${k}`);
      if (issue) {
        el.classList.add(`is-${issue.level}`);
        el.setAttribute('title', issue.msg);
      } else {
        el.removeAttribute('title');
      }
      el.closest('tr').classList.toggle('mod', isModified(t, i));
      el.closest('tr').classList.toggle('issue', s.validation.rowsWithIssues.has(i));
      updateBar();
      updateTabBadges();
      if (s.focusRow === i) renderInspector();
    };
    el.addEventListener('change', handler);
    el.addEventListener('blur', handler);
  });

  // Expand buttons
  QA('.expand-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    openTextModal(t, +btn.dataset.i, btn.dataset.k, btn.dataset.h);
  }));

  QA('tbody tr').forEach(tr => tr.addEventListener('click', e => {
    if (e.target.closest('input,select,button,textarea,a,label')) return;
    s.focusRow = +tr.dataset.i;
    QA('tbody tr.focus').forEach(r => r.classList.remove('focus'));
    tr.classList.add('focus');
    renderInspector();
  }));
}

function jumpToNextIssue(t) {
  const s = S[t];
  const rows = Array.from(s.validation.rowsWithIssues).sort((a, b) => a - b);
  if (!rows.length) {
    toast('No validation issues in current tab', 'ok');
    return;
  }
  const cur = Number.isInteger(s.focusRow) ? s.focusRow : -1;
  let next = rows.find(i => i > cur);
  if (next === undefined) next = rows[0];
  s.focusRow = next;
  if (s.viewMode !== 'issues') s.viewMode = 'issues';
  render();
  setTimeout(() => {
    const tr = Q(`tr[data-i="${next}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

function renderInspector() {
  const wrap = Q('#workspace');
  const zone = Q('#inspectorZone');
  if (!activeTab || !zone) return;
  const s = S[activeTab];
  const cfg = TYPES[activeTab];

  function autoSizeAll() {
    zone.querySelectorAll('.ins-auto').forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = Math.max(ta.scrollHeight, 26) + 'px';
      ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
    });
  }

  if (inspectorHidden) {
    wrap.classList.add('no-inspector');
    zone.innerHTML = `<div class="ins-tab-handle" id="insTabOpen" title="Open Inspector">${SVG.ads}<span>Inspector</span></div>`;
    zone.style.display = '';
    Q('#insTabOpen').addEventListener('click', () => { inspectorHidden = false; render(); });
    return;
  }

  wrap.classList.remove('no-inspector');
  zone.style.display = '';

  // ─── MULTI-SELECT BULK MODE ───
  if (s.sel.size >= 2) {
    const selIndices = [...s.sel];
    const editable = cfg.cols.filter(col => col.edit && !col.hide);

    const fieldHtml = editable.map(col => {
      const values = selIndices.map(i => s.cur[i][col.k] || '');
      const allSame = values.every(v => v === values[0]);
      const displayVal = allSame ? values[0] : '';
      const placeholder = allSame ? '' : '< varies >';

      if (col.type === 'status') {
        return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field" data-bulk-k="${col.k}"><option value=""${!allSame ? ' selected' : ''}>< varies ></option>${s.statusOptions.map(o => `<option value="${esc(o)}" ${allSame && displayVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      if (col.type === 'cta') {
        return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field" data-bulk-k="${col.k}"><option value=""${!allSame ? ' selected' : ''}>< varies ></option>${s.ctaOptions.map(o => `<option value="${esc(o)}" ${allSame && displayVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      return `<div class="ins-row"><label>${esc(col.h)}</label><textarea class="ins-field ins-auto" data-bulk-k="${col.k}" rows="1" placeholder="${esc(placeholder)}">${allSame ? esc(displayVal) : ''}</textarea></div>`;
    }).join('');

    zone.innerHTML = `<div class="inspector">
  <div class="ins-header">
    <div class="ins-header-left">
      <h3>Bulk Edit · ${s.sel.size} rows</h3>
      <div class="meta">Changes apply to all selected rows</div>
    </div>
    <button class="ins-close" id="insCloseBtn" title="Hide panel">${SVG.panelClose}</button>
  </div>
  <div class="ins-label">Editable Fields</div>
  <div class="ins-grid">${fieldHtml}</div>
  <div class="ins-actions">
    <button class="btn btn-s btn-sm" id="bulkClearSel">Clear selection</button>
  </div>
</div>`;

    autoSizeAll();

    zone.querySelectorAll('[data-bulk-k]').forEach(el => {
      const handler = () => {
        const k = el.dataset.bulkK;
        const v = el.value;
        if (v === '' && el.tagName === 'SELECT') return;
        selIndices.forEach(i => { setCellValue(activeTab, i, k, v); });
        runValidation(activeTab);
        renderPreflight();
        renderTable();
        updateBar();
        renderInspector();
      };
      el.addEventListener('change', handler);
      if (el.tagName === 'TEXTAREA') el.addEventListener('blur', handler);
    });

    Q('#bulkClearSel').addEventListener('click', () => { s.sel = new Set(); render(); });
    Q('#insCloseBtn').addEventListener('click', () => { inspectorHidden = true; render(); });
    return;
  }

  // ─── SINGLE ROW MODE ───
  const idx = Number.isInteger(s.focusRow) ? s.focusRow : null;
  const row = idx !== null ? s.cur[idx] : null;

  if (!row) {
    zone.innerHTML = `<div class="inspector-empty">Select a row to open quick editor and see all fields without horizontal scrolling.</div>`;
    return;
  }

  wrap.classList.remove('no-inspector');
  const name = row[cfg.nameField] || row[cfg.idField] || `Row #${idx + 1}`;
  const issueRows = s.validation.rowsWithIssues.has(idx);
  const editable = cfg.cols.filter(col => col.edit && !col.hide);
  const readonly = cfg.cols.filter(col => !col.edit && !col.hide);

  const fieldHtml = editable.map(col => {
    const v = row[col.k] || '';
    const issue = s.validation.cellIssues.get(`${idx}:${col.k}`);
    const issueCls = issue ? ` is-${issue.level}` : '';
    const issueTitle = issue ? ` title="${esc(issue.msg)}"` : '';
    if (col.type === 'status') {
      return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field${issueCls}" data-ins-k="${col.k}"${issueTitle}>${s.statusOptions.map(o => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    if (col.type === 'cta') {
      return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field${issueCls}" data-ins-k="${col.k}"${issueTitle}><option value="">—</option>${s.ctaOptions.map(o => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    // Pretty JSON view for audienceString in inspector
    if (col.k === 'audienceString' && v.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(v);
        const treeHtml = buildJsonTree(parsed, 0, true);
        return `<div class="ins-row"><label>${esc(col.h)}</label><div class="ins-json-wrap"><div class="json-tree ins-json-tree" data-ins-json-k="${col.k}">${treeHtml}</div><div class="ins-json-actions"><button class="ins-json-expand-all" title="Expand all nodes">Expand All</button><button class="ins-json-collapse-all" title="Collapse all nodes">Collapse All</button><button class="ins-json-open-modal" data-k="${col.k}" data-h="${esc(col.h)}">✎ Edit in modal</button></div></div></div>`;
      } catch (e) { /* fall through to plain textarea */ }
    }
    return `<div class="ins-row"><label>${esc(col.h)}</label><textarea class="ins-field ins-auto${issueCls}" data-ins-k="${col.k}"${issueTitle} rows="1">${esc(v)}</textarea></div>`;
  }).join('');

  const readonlyHtml = readonly.map(col => {
    const v = row[col.k] || '';
    return `<div class="ins-row"><label>${esc(col.h)}</label><textarea class="ins-field ins-auto" rows="1" readonly>${esc(v)}</textarea></div>`;
  }).join('');

  zone.innerHTML = `
<div class="inspector">
  <div class="ins-header">
    <div class="ins-header-left">
      <h3>${esc(name)}</h3>
      <div class="meta">${esc(cfg.idField)}: ${esc(row[cfg.idField] || '—')} · ${issueRows ? 'Has validation issues' : 'No row-level issues'}</div>
    </div>
    <button class="ins-close" id="insCloseBtn" title="Hide panel">${SVG.panelClose}</button>
  </div>
  <div class="ins-label">Editable Fields</div>
  <div class="ins-grid">${fieldHtml}</div>
  <div class="ins-actions">
    <button class="btn btn-s btn-sm" id="insPrev">← Prev row</button>
    <button class="btn btn-s btn-sm" id="insNext">Next row →</button>
    <button class="btn btn-s btn-sm" id="insIssue">${SVG.warning} Next issue</button>
  </div>
  <div class="ins-label" style="margin-top:12px;">Read-only Reference</div>
  <div class="ins-grid">${readonlyHtml || '<div class="inspector-empty" style="padding:0;">No additional read-only fields</div>'}</div>
</div>
  `;

  autoSizeAll();

  zone.querySelectorAll('[data-ins-k]').forEach(el => {
    el.addEventListener('change', () => {
      const k = el.dataset.insK;
      setCellValue(activeTab, idx, k, el.value);
      runValidation(activeTab);
      renderPreflight();
      renderTable();
      updateBar();
      renderInspector();
    });
    if (el.tagName === 'TEXTAREA') {
      el.addEventListener('blur', () => {
        const k = el.dataset.insK;
        setCellValue(activeTab, idx, k, el.value);
        runValidation(activeTab);
        renderPreflight();
        renderTable();
        updateBar();
        renderInspector();
      });
    }
  });

  // Inspector JSON tree: expand/collapse all, open modal, and inline editing
  zone.querySelectorAll('.ins-json-expand-all').forEach(btn => btn.addEventListener('click', () => {
    btn.closest('.ins-json-wrap').querySelectorAll('.jt-node').forEach(n => n.classList.remove('jt-collapsed'));
  }));
  zone.querySelectorAll('.ins-json-collapse-all').forEach(btn => btn.addEventListener('click', () => {
    btn.closest('.ins-json-wrap').querySelectorAll('.jt-node').forEach(n => n.classList.add('jt-collapsed'));
  }));
  zone.querySelectorAll('.ins-json-open-modal').forEach(btn => btn.addEventListener('click', () => {
    openTextModal(activeTab, idx, btn.dataset.k, btn.dataset.h);
  }));
  // Inline editing for inspector JSON tree
  zone.querySelectorAll('[data-ins-json-k]').forEach(treeEl => {
    const k = treeEl.dataset.insJsonK;
    const rawVal = row[k] || '';
    let insParsed;
    try { insParsed = JSON.parse(rawVal); } catch (e) { return; }
    attachJsonTreeHandlers(treeEl, insParsed, (updated) => {
      const minified = JSON.stringify(updated);
      setCellValue(activeTab, idx, k, minified);
      runValidation(activeTab);
      renderPreflight();
      renderTable();
      updateBar();
      renderInspector();
    });
  });

  const filtered = getFiltered(activeTab).map(x => x.i);
  const pos = filtered.indexOf(idx);
  const prev = pos > 0 ? filtered[pos - 1] : filtered[filtered.length - 1];
  const next = pos >= 0 && pos < filtered.length - 1 ? filtered[pos + 1] : filtered[0];
  Q('#insPrev').addEventListener('click', () => {
    if (prev === undefined) return;
    s.focusRow = prev;
    renderTable();
    renderInspector();
    const tr = Q(`tr[data-i="${prev}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  Q('#insNext').addEventListener('click', () => {
    if (next === undefined) return;
    s.focusRow = next;
    renderTable();
    renderInspector();
    const tr = Q(`tr[data-i="${next}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  Q('#insIssue').addEventListener('click', () => jumpToNextIssue(activeTab));
  Q('#insCloseBtn').addEventListener('click', () => {
    inspectorHidden = true;
    render();
  });
}

function updateTabBadges() {
  QA('.tab').forEach(tab => {
    const t = tab.dataset.t; const m = modCount(t);
    const ex = tab.querySelector('.mod-badge');
    if (m > 0) {
      if (ex) ex.textContent = `${m}✎`;
      else { const sp = document.createElement('span'); sp.className = 'mod-badge'; sp.textContent = `${m}✎`; tab.appendChild(sp); }
    } else if (ex) ex.remove();
  });
}

