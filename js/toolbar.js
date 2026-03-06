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
