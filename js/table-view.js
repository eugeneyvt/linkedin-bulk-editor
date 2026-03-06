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
