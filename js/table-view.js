function getVisibleColumns(t) {
  const cfg = TYPES[t];
  const s = S[t];
  const visible = cfg.cols.filter(c => !c.hide && s.visibleCols.includes(c.k));
  if (!visible.length) return [cfg.cols.find(c => !c.hide)].filter(Boolean);
  const pins = (Array.isArray(s.pinnedCols) ? s.pinnedCols : []).filter(k => visible.some(col => col.k === k));
  const pinnedCols = pins.map(k => visible.find(col => col.k === k)).filter(Boolean);
  const rest = visible.filter(col => !pins.includes(col.k));
  return [...pinnedCols, ...rest];
}

function isOpenableHttpUrl(v) {
  const raw = String(v || '').trim();
  if (!raw) return false;
  if (typeof isValidHttpUrl === 'function') return isValidHttpUrl(raw);
  return /^https?:\/\//i.test(raw);
}

function renderUrlOpenControl(url, extraClass = '') {
  const raw = String(url || '').trim();
  if (!isOpenableHttpUrl(raw)) {
    return `<button type="button" class="url-open-btn ${extraClass}" title="Invalid URL" aria-label="Open URL" disabled>↗</button>`;
  }
  return `<a class="url-open-btn ${extraClass}" href="${esc(raw)}" target="_blank" rel="noopener noreferrer" title="Open URL in new tab" aria-label="Open URL in new tab">↗</a>`;
}

function renderDateOpenControl(extraClass = '') {
  return `<button type="button" class="date-open-btn ${extraClass}" title="Open calendar" aria-label="Open calendar">${SVG.calendar}</button>`;
}

function getAudienceStringCellSummary(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return { title: 'Audience', meta: 'Empty', raw };
  if (!raw.startsWith('{')) {
    const compact = raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
    return { title: 'Audience', meta: compact, raw };
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = JSON.parse(JSON.stringify(parsed));
    if (typeof ensureAudienceBuilderStructure === 'function') ensureAudienceBuilderStructure(normalized);

    const includeGroups = Array.isArray(normalized?.include?.and) ? normalized.include.and : [];
    let includeFacets = 0;
    let includeValues = 0;
    includeGroups.forEach(group => {
      const map = (group?.or && typeof group.or === 'object')
        ? group.or
        : ((group?.and && typeof group.and === 'object') ? group.and : {});
      Object.values(map).forEach(values => {
        if (!Array.isArray(values)) return;
        includeFacets++;
        includeValues += values.length;
      });
    });

    const excludeMap = (normalized?.exclude?.or && typeof normalized.exclude.or === 'object') ? normalized.exclude.or : {};
    let excludeFacets = 0;
    let excludeValues = 0;
    Object.values(excludeMap).forEach(values => {
      if (!Array.isArray(values)) return;
      excludeFacets++;
      excludeValues += values.length;
    });

    return {
      title: 'Audience JSON',
      meta: `Groups ${includeGroups.length} · Include ${includeFacets}/${includeValues} · Exclude ${excludeFacets}/${excludeValues}`,
      raw
    };
  } catch (_) {
    return { title: 'Audience JSON', meta: 'Invalid JSON', raw };
  }
}

function syncSelectAllState(filtered, s) {
  const selAll = Q('#selAll');
  if (!selAll || !filtered.length) return;
  let selectedCount = 0;
  filtered.forEach(({ i }) => { if (s.sel.has(i)) selectedCount++; });
  selAll.checked = selectedCount === filtered.length;
  selAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
}

function syncBodyColumnWidths(headTable, bodyTable) {
  if (!headTable || !bodyTable) return;
  const headCells = Array.from(headTable.querySelectorAll('thead th'));
  if (!headCells.length) return;
  headCells.forEach((th, idx) => {
    const bodyCells = Array.from(bodyTable.querySelectorAll(`tbody td:nth-child(${idx + 1})`));
    let width = Math.ceil(th.getBoundingClientRect().width || th.offsetWidth || 0);
    bodyCells.forEach(td => {
      const w = Math.ceil(td.getBoundingClientRect().width || td.offsetWidth || 0);
      if (w > width) width = w;
    });
    if (!width) return;
    th.style.width = `${width}px`;
    th.style.minWidth = `${width}px`;
    th.style.maxWidth = `${width}px`;
    bodyCells.forEach(td => {
      td.style.width = `${width}px`;
      td.style.minWidth = `${width}px`;
      td.style.maxWidth = `${width}px`;
    });
  });
}

function refreshBottomXScrollInternal() {
  const tableContainer = Q('#tableZone .table-container');
  const bodyWrap = Q('#tableZone .table-body-wrap');
  const bodyTable = Q('#tableZone table.table-body');
  const xScroll = Q('#tableZone .table-xscroll');
  const xInner = Q('#tableZone .table-xscroll-inner');
  if (!bodyWrap || !bodyTable || !xScroll || !xInner) return;
  const fullWidth = Math.ceil(bodyTable.scrollWidth || 0);
  const viewportWidth = Math.ceil(bodyWrap.clientWidth || 0);
  const hasOverflowX = fullWidth > viewportWidth + 1;
  xScroll.classList.toggle('off', !hasOverflowX);
  const stickyStart = tableContainer
    ? Math.max(0, Math.round(xScroll.getBoundingClientRect().left - tableContainer.getBoundingClientRect().left))
    : 0;
  xInner.style.width = `${Math.max(1, fullWidth - stickyStart)}px`;
  xScroll.scrollLeft = bodyWrap.scrollLeft;
}

function applyPinnedColumns(t, vis) {
  const s = S[t];
  const headTable = Q('#tableZone table.table-head');
  const bodyTable = Q('#tableZone table.table-body');
  const tableContainer = Q('#tableZone .table-container');
  if (!headTable && !bodyTable) return;
  [headTable, bodyTable].forEach(table => {
    if (!table) return;
    table.querySelectorAll('.pin-col, .pin-col-shadow').forEach(cell => {
      cell.classList.remove('pin-col', 'pin-col-shadow');
      cell.style.left = '';
      cell.style.zIndex = '';
    });
  });

  const visibleKeys = vis.map(col => col.k);
  s.pinnedCols = (Array.isArray(s.pinnedCols) ? s.pinnedCols : []).filter(k => visibleKeys.includes(k));
  const firstSticky = headTable?.querySelector('thead th:first-child') || bodyTable?.querySelector('tbody td:first-child');
  const baseLeft = firstSticky ? firstSticky.getBoundingClientRect().width : 40;
  let left = baseLeft;
  if (s.pinnedCols.length) {
    s.pinnedCols.forEach((key, pinIdx) => {
      const colIdx = vis.findIndex(col => col.k === key);
      if (colIdx === -1) return;
      const nth = colIdx + 2; // +1 checkbox column, nth-child is 1-based
      const headCell = headTable?.querySelector(`thead th:nth-child(${nth})`);
      const bodyCell = bodyTable?.querySelector(`tbody td:nth-child(${nth})`);
      const width = headCell?.getBoundingClientRect().width || headCell?.offsetWidth || bodyCell?.getBoundingClientRect().width || bodyCell?.offsetWidth || 80;
      const cells = [];
      if (headTable) cells.push(...headTable.querySelectorAll(`tr > *:nth-child(${nth})`));
      if (bodyTable) cells.push(...bodyTable.querySelectorAll(`tr > *:nth-child(${nth})`));

      cells.forEach(cell => {
        cell.classList.add('pin-col');
        if (pinIdx === s.pinnedCols.length - 1) cell.classList.add('pin-col-shadow');
        cell.style.left = `${left}px`;
        cell.style.zIndex = cell.tagName === 'TH' ? String(12 + (s.pinnedCols.length - pinIdx)) : String(6 + (s.pinnedCols.length - pinIdx));
      });
      left += width;
    });
  } else {
    const checkboxCells = [];
    if (headTable) checkboxCells.push(...headTable.querySelectorAll('thead th:first-child'));
    if (bodyTable) checkboxCells.push(...bodyTable.querySelectorAll('tbody td:first-child'));
    checkboxCells.forEach(cell => cell.classList.add('pin-col-shadow'));
  }

  if (tableContainer) {
    const containerRect = tableContainer.getBoundingClientRect();
    let stickyRight = 0;
    const stickyHeadCells = headTable
      ? Array.from(headTable.querySelectorAll('thead th:first-child, thead th.pin-col'))
      : [];
    stickyHeadCells.forEach(cell => {
      const right = cell.getBoundingClientRect().right - containerRect.left;
      if (right > stickyRight) stickyRight = right;
    });
    if (!stickyRight) stickyRight = left;
    tableContainer.style.setProperty('--h-scroll-start', `${Math.max(0, Math.round(stickyRight))}px`);
  }
}

function renderTable() {
  const t = activeTab; const cfg = TYPES[t]; const s = S[t];
  const pinIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1.5h6l-1 4 2.2 2.2v1.1H8.8V14h-1.6V8.8H3.8V7.7L6 5.5 5 1.5Z" fill="currentColor"/></svg>';
  const prevBodyWrap = Q('#tableZone .table-body-wrap');
  if (prevBodyWrap && prevBodyWrap.querySelector('table')) {
    s.tableScrollLeft = prevBodyWrap.scrollLeft;
    s.tableScrollTop = prevBodyWrap.scrollTop;
  }
  const prevScrollLeft = Number.isFinite(s.tableScrollLeft) ? s.tableScrollLeft : 0;
  const prevScrollTop = Number.isFinite(s.tableScrollTop) ? s.tableScrollTop : 0;
  const vis = getVisibleColumns(t);
  const pinnedSet = new Set(s.pinnedCols || []);
  const filtered = getFiltered(t);

  if (!filtered.length) {
    Q('#tableZone').innerHTML = `<div class="table-container ${s.density === 'compact' ? 'compact' : ''}"><div class="empty">No items match your filters</div></div>`;
    const emptyContainer = Q('#tableZone .table-container');
    if (emptyContainer) {
      emptyContainer.scrollLeft = prevScrollLeft;
      emptyContainer.scrollTop = prevScrollTop;
    }
    return;
  }

  const allSelected = filtered.length > 0 && filtered.every(({ i }) => s.sel.has(i));
  let h = `<div class="table-container ${s.density === 'compact' ? 'compact' : ''}"><div class="table-head-wrap"><table class="table-head"><thead><tr><th class="ck"><input type="checkbox" id="selAll" ${allSelected ? 'checked' : ''}></th>`;
  vis.forEach((col, ci) => {
    const isSorted = s.sortKey === col.k;
    const arrow = isSorted ? (s.sortDir === 'asc' ? '▲' : '▼') : '⇅';
    const sortCls = isSorted ? (s.sortDir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    const pinCls = pinnedSet.has(col.k) ? ' on' : '';
    const pinTitle = pinnedSet.has(col.k) ? 'Unpin column' : 'Pin column';
    h += `<th class="${sortCls}" data-ci="${ci}" data-sk="${col.k}">${col.h}<span class="sort-arrow">${arrow}</span><button class="pin-col-btn${pinCls}" data-pin-k="${col.k}" title="${pinTitle}" aria-label="${pinTitle}: ${esc(col.h)}">${pinIcon}</button><span class="resize-handle" data-ci="${ci}"></span></th>`;
  });
  h += '</tr></thead></table></div><div class="table-body-wrap"><table class="table-body"><tbody>';

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
      const cellMod = isCellModified(t, i, col.k);
      const tdCls = cellMod ? 'cell-mod' : '';
      const canEdit = col.edit && isCellEditable(t, r, col.k);
      const lockReason = canEdit ? '' : getCellEditLockReason(t, r, col.k);
      const revertBtn = cellMod
        ? `<button class="cell-revert-btn" data-revert-i="${i}" data-revert-k="${col.k}" title="Revert field">↺</button>`
        : '';
      if (col.type === 'id') {
        h += `<td class="${tdCls}"><span class="c-id">${esc(v)}</span></td>`;
      } else if (col.type === 'ro') {
        h += `<td class="${tdCls}"><span class="c-ro" title="${esc(v)}">${esc(v)}</span></td>`;
      } else if (col.edit && !canEdit) {
        const roTitle = lockReason || v;
        const roVal = v || '—';
        const openBtn = col.k === 'destinationUrl' ? renderUrlOpenControl(v) : '';
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><span class="c-ro" title="${esc(roTitle)}">${esc(roVal)}</span>${openBtn}${revertBtn}</div></td>`;
      } else if (col.type === 'status' && canEdit) {
        const dc = v.toLowerCase().replace(/\s/g, '');
        const statusOptions = getChoiceOptions(t, col.k, s.cur, r);
        const opts = statusOptions.length ? statusOptions : s.statusOptions;
        h += `<td class="${tdCls}"><div class="cell-edit-wrap status-cell"><span class="dot dot-${dc}"></span><select class="c-in status-select${issueCls}" data-i="${i}" data-k="${col.k}"${issueTitle}>`;
        opts.forEach(o => { h += `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`; });
        if (!opts.includes(v) && v) h += `<option value="${esc(v)}" selected disabled>${esc(v)}</option>`;
        h += `</select>${revertBtn}</div></td>`;
      } else if (col.type === 'cta' && canEdit) {
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><select class="c-in${issueCls}" data-i="${i}" data-k="${col.k}"${issueTitle}><option value="">—</option>`;
        s.ctaOptions.forEach(o => { h += `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`; });
        if (!s.ctaOptions.includes(v) && v) h += `<option value="${esc(v)}" selected disabled>${esc(v)}</option>`;
        h += `</select>${revertBtn}</div></td>`;
      } else if (col.type === 'choice' && canEdit) {
        const options = getChoiceOptions(t, col.k, s.cur, r);
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><select class="c-in${issueCls}" data-i="${i}" data-k="${col.k}"${issueTitle}><option value="">—</option>`;
        options.forEach(o => { h += `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`; });
        if (!options.includes(v) && v) h += `<option value="${esc(v)}" selected disabled>${esc(v)}</option>`;
        h += `</select>${revertBtn}</div></td>`;
      } else if (col.type === 'long' && canEdit) {
        if (t === 'adsets' && col.k === 'audienceString') {
          const summary = getAudienceStringCellSummary(v);
          h += `<td class="expand-cell aud-cell ${tdCls}"><div class="aud-summary-cell${issueCls}" title="${esc(summary.raw)}"><div class="aud-summary-title">${esc(summary.title)}</div><div class="aud-summary-meta">${esc(summary.meta)}</div></div><div class="expand-actions"><button class="expand-btn" data-i="${i}" data-k="${col.k}" data-h="${esc(col.h)}">↗</button>${revertBtn}</div></td>`;
        } else {
          const compact = v.replace(/\n/g, ' ⏎ ');
          const preview = compact.length > 90 ? compact.substring(0, 90) + '…' : compact;
          h += `<td class="expand-cell ${tdCls}"><span class="c-ro${issueCls}" title="${esc(v)}">${esc(preview)}</span><div class="expand-actions"><button class="expand-btn" data-i="${i}" data-k="${col.k}" data-h="${esc(col.h)}">↗</button>${revertBtn}</div></td>`;
        }
      } else if (col.type === 'url' && canEdit) {
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><input type="text" class="c-in url${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}>${renderUrlOpenControl(v)}${revertBtn}</div></td>`;
      } else if (col.type === 'num' && canEdit) {
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><input type="text" class="c-in num${issueCls}" value="${esc(v)}" placeholder="—" data-i="${i}" data-k="${col.k}"${issueTitle}>${revertBtn}</div></td>`;
      } else if (col.type === 'date' && canEdit) {
        const isoDate = usDateToIsoDateInput(v);
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><input type="date" class="c-in date${issueCls}" value="${esc(isoDate)}" data-date-iso="1" data-no-type-date="1" data-i="${i}" data-k="${col.k}"${issueTitle}>${renderDateOpenControl()}${revertBtn}</div></td>`;
      } else if (col.type === 'wide' && canEdit) {
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><input type="text" class="c-in wide${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}>${revertBtn}</div></td>`;
      } else if (canEdit) {
        h += `<td class="${tdCls}"><div class="cell-edit-wrap"><input type="text" class="c-in${issueCls}" value="${esc(v)}" data-i="${i}" data-k="${col.k}"${issueTitle}>${revertBtn}</div></td>`;
      } else {
        h += `<td class="${tdCls}">${esc(v)}</td>`;
      }
    });
    h += '</tr>';
  });
  h += '</tbody></table></div><div class="table-xscroll off" aria-hidden="true"><div class="table-xscroll-inner"></div></div></div>';
  Q('#tableZone').innerHTML = h;
  const nextHeadWrap = Q('#tableZone .table-head-wrap');
  const nextBodyWrap = Q('#tableZone .table-body-wrap');
  const nextXScroll = Q('#tableZone .table-xscroll');
  const headTable = Q('#tableZone table.table-head');
  const bodyTable = Q('#tableZone table.table-body');
  syncBodyColumnWidths(headTable, bodyTable);

  if (nextBodyWrap) {
    nextBodyWrap.scrollLeft = prevScrollLeft;
    nextBodyWrap.scrollTop = prevScrollTop;
    if (nextHeadWrap) nextHeadWrap.scrollLeft = prevScrollLeft;
    if (nextXScroll) nextXScroll.scrollLeft = prevScrollLeft;
    nextBodyWrap.addEventListener('scroll', () => {
      if (!nextBodyWrap.querySelector('table')) return;
      s.tableScrollLeft = nextBodyWrap.scrollLeft;
      s.tableScrollTop = nextBodyWrap.scrollTop;
      if (nextHeadWrap) nextHeadWrap.scrollLeft = nextBodyWrap.scrollLeft;
      if (nextXScroll && Math.abs(nextXScroll.scrollLeft - nextBodyWrap.scrollLeft) > 1) {
        nextXScroll.scrollLeft = nextBodyWrap.scrollLeft;
      }
    }, { passive: true });

    if (nextXScroll) {
      nextXScroll.addEventListener('scroll', () => {
        if (Math.abs(nextBodyWrap.scrollLeft - nextXScroll.scrollLeft) > 1) {
          nextBodyWrap.scrollLeft = nextXScroll.scrollLeft;
        }
        if (nextHeadWrap && Math.abs(nextHeadWrap.scrollLeft - nextXScroll.scrollLeft) > 1) {
          nextHeadWrap.scrollLeft = nextXScroll.scrollLeft;
        }
        s.tableScrollLeft = nextXScroll.scrollLeft;
      }, { passive: true });

      nextBodyWrap.addEventListener('wheel', e => {
        const horizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const dx = horizontalIntent ? (Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY) : 0;
        if (!dx || nextXScroll.classList.contains('off')) return;
        e.preventDefault();
        nextXScroll.scrollLeft += dx;
      }, { passive: false });
    }
  }

  applyPinnedColumns(t, vis);
  refreshBottomXScrollInternal();
  requestAnimationFrame(refreshBottomXScrollInternal);

  // Bind events
  syncSelectAllState(filtered, s);
  Q('#selAll').addEventListener('change', () => {
    const shouldClear = filtered.length > 0 && filtered.every(({ i }) => s.sel.has(i));
    if (shouldClear) filtered.forEach(({ i }) => s.sel.delete(i));
    else filtered.forEach(({ i }) => s.sel.add(i));
    render();
  });

  QA('[data-si]').forEach(cb => cb.addEventListener('change', e => {
    const i = +e.target.dataset.si;
    e.target.checked ? s.sel.add(i) : s.sel.delete(i);
    syncSelectAllState(filtered, s);
    renderWorkspaceHead();
    renderToolbar();
    renderInspector();
  }));

  QA('.pin-col-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const k = btn.dataset.pinK;
    const curPins = Array.isArray(s.pinnedCols) ? s.pinnedCols : [];
    if (curPins.includes(k)) s.pinnedCols = curPins.filter(x => x !== k);
    else s.pinnedCols = [...curPins, k];
    renderTable();
  }));

  // Sort click on headers
  QA('thead th.sortable').forEach(th => th.addEventListener('click', e => {
    if (e.target.closest('.resize-handle') || e.target.closest('.pin-col-btn')) return; // don't sort when resizing/pinning
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
      const nextValue = el.dataset.dateIso === '1' ? isoDateInputToUs(el.value) : el.value;
      if (s.cur[i][k] === nextValue) return;
      setCellValue(t, i, k, nextValue);
      runValidation(t);
      renderPreflight();
      updateBar();
      updateTabBadges();
      renderTable();
      if (s.focusRow === i) renderInspector();
    };
    el.addEventListener('change', handler);
    if (el.dataset.dateIso !== '1') el.addEventListener('blur', handler);
  });

  QA('input[data-no-type-date="1"]').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      e.preventDefault();
    });
    el.addEventListener('paste', e => e.preventDefault());
    el.addEventListener('drop', e => e.preventDefault());
  });

  QA('.date-open-btn').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const input = btn.parentElement?.querySelector('input[data-date-iso="1"]');
    openDateInputPicker(input);
  }));

  QA('[data-revert-i]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = +btn.dataset.revertI;
    const k = btn.dataset.revertK;
    if (!revertCellValue(t, i, k)) return;
    runValidation(t);
    renderPreflight();
    updateBar();
    updateTabBadges();
    renderTable();
    if (s.focusRow === i) renderInspector();
  }));

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
    renderToolbar();
    renderInspector();
  }));
}

window.refreshPinnedLayout = function refreshPinnedLayout() {
  if (!activeTab || !S[activeTab].loaded) return;
  applyPinnedColumns(activeTab, getVisibleColumns(activeTab));
  refreshBottomXScrollInternal();
};

window.refreshBottomXScroll = refreshBottomXScrollInternal;

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
