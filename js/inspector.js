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
        const stateKey = getInspectorTreeKey(activeTab, idx, col.k);
        const collapsedState = getInspectorTreeCollapsedState(stateKey);
        const treeHtml = buildJsonTree(parsed, 0, true, [], collapsedState);
        return `<div class="ins-row"><label>${esc(col.h)}</label><div class="ins-json-wrap"><div class="json-tree ins-json-tree" data-ins-json-k="${col.k}" data-ins-json-state="${stateKey}">${treeHtml}</div><div class="ins-json-actions"><button class="ins-json-expand-all" title="Expand all nodes">Expand All</button><button class="ins-json-collapse-all" title="Collapse all nodes">Collapse All</button><button class="ins-json-open-modal" data-k="${col.k}" data-h="${esc(col.h)}">✎ Edit in modal</button></div></div></div>`;
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
    const wrapEl = btn.closest('.ins-json-wrap');
    wrapEl.querySelectorAll('.jt-node').forEach(n => n.classList.remove('jt-collapsed'));
    const treeEl = wrapEl.querySelector('.ins-json-tree');
    if (treeEl?.dataset.insJsonState) saveInspectorTreeCollapsedState(treeEl.dataset.insJsonState, treeEl);
  }));
  zone.querySelectorAll('.ins-json-collapse-all').forEach(btn => btn.addEventListener('click', () => {
    const wrapEl = btn.closest('.ins-json-wrap');
    wrapEl.querySelectorAll('.jt-node').forEach(n => n.classList.add('jt-collapsed'));
    const treeEl = wrapEl.querySelector('.ins-json-tree');
    if (treeEl?.dataset.insJsonState) saveInspectorTreeCollapsedState(treeEl.dataset.insJsonState, treeEl);
  }));
  zone.querySelectorAll('.ins-json-open-modal').forEach(btn => btn.addEventListener('click', () => {
    openTextModal(activeTab, idx, btn.dataset.k, btn.dataset.h);
  }));
  // Inline editing for inspector JSON tree
  zone.querySelectorAll('[data-ins-json-k]').forEach(treeEl => {
    const k = treeEl.dataset.insJsonK;
    const stateKey = treeEl.dataset.insJsonState;
    const rawVal = row[k] || '';
    let insParsed;
    try { insParsed = JSON.parse(rawVal); } catch (e) { return; }
    attachJsonTreeHandlers(treeEl, insParsed, (updated) => {
      if (stateKey) saveInspectorTreeCollapsedState(stateKey, treeEl);
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
