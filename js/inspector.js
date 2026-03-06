function insAudienceFacetLabel(facetKey) {
  if (typeof facetLabel === 'function') return facetLabel(facetKey);
  if (typeof FACET_LABELS !== 'undefined' && FACET_LABELS[facetKey]) return FACET_LABELS[facetKey];
  return String(facetKey || '').replace(/^urn:li:adTargetingFacet:/, '');
}

function insAudienceValueLabel(facetKey, value) {
  const labels = typeof FACET_VALUE_LABELS !== 'undefined' ? FACET_VALUE_LABELS[facetKey] : null;
  if (labels && labels[value]) return labels[value];
  if (typeof valueHelp === 'function') {
    const hinted = valueHelp(facetKey, value);
    if (hinted) return hinted;
  }
  const raw = String(value || '');
  const m = raw.match(/^urn:li:[^:]+:(.+)$/);
  return m ? m[1] : raw || '(empty)';
}

function insAudienceFacetEntries(map) {
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map).filter(([, values]) => Array.isArray(values));
}

function renderInspectorAudienceSummary(rawValue) {
  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (_) {
    return '';
  }

  const normalized = JSON.parse(JSON.stringify(parsed));
  if (typeof ensureAudienceBuilderStructure === 'function') ensureAudienceBuilderStructure(normalized);

  const includeGroups = Array.isArray(normalized?.include?.and) ? normalized.include.and : [];
  const excludeEntries = insAudienceFacetEntries(normalized?.exclude?.or);

  const renderValues = (facetKey, values) => {
    const display = values.slice(0, 6).map(v => `<span class="ins-aud-value">${esc(insAudienceValueLabel(facetKey, v))}</span>`).join('');
    const extra = values.length > 6 ? `<span class="ins-aud-more">+${values.length - 6} more</span>` : '';
    return `<div class="ins-aud-values">${display}${extra || ''}</div>`;
  };

  const includeHtml = includeGroups.map((group, idx) => {
    const entries = insAudienceFacetEntries(group?.or || group?.and || {});
    if (!entries.length) return `<div class="ins-aud-empty">Group ${idx + 1}: no filters</div>`;
    return `<div class="ins-aud-group"><div class="ins-aud-group-title">Include Group ${idx + 1} (OR)</div>${entries.map(([facetKey, values]) => `<div class="ins-aud-facet"><div class="ins-aud-facet-head"><span class="ins-aud-facet-name" title="${esc(facetKey)}">${esc(insAudienceFacetLabel(facetKey))}</span><span class="ins-aud-count">${values.length}</span></div>${renderValues(facetKey, values)}</div>`).join('')}</div>`;
  }).join('');

  const excludeHtml = excludeEntries.length
    ? excludeEntries.map(([facetKey, values]) => `<div class="ins-aud-facet"><div class="ins-aud-facet-head"><span class="ins-aud-facet-name" title="${esc(facetKey)}">${esc(insAudienceFacetLabel(facetKey))}</span><span class="ins-aud-count">${values.length}</span></div>${renderValues(facetKey, values)}</div>`).join('')
    : '<div class="ins-aud-empty">No exclusion filters</div>';

  return `<div class="ins-aud-summary"><div class="ins-aud-section"><div class="ins-aud-section-title">Include (AND between groups)</div>${includeHtml || '<div class="ins-aud-empty">No include groups</div>'}</div><div class="ins-aud-section"><div class="ins-aud-section-title">Exclude (OR)</div>${excludeHtml}</div></div>`;
}

function insGetFieldLimit(type, row, key) {
  if (!type || !row || !key) return null;
  if (typeof getFieldLengthLimit === 'function' && S[type]) {
    const v = getFieldLengthLimit(type, S[type], row, key);
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const fallback = FIELD_LENGTH_LIMITS?.[key];
  const n = Number(fallback);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function insGetBulkFieldLimit(type, rowIndices, key) {
  if (!Array.isArray(rowIndices) || !rowIndices.length) return null;
  let min = null;
  rowIndices.forEach(i => {
    const row = S[type]?.cur?.[i];
    const limit = insGetFieldLimit(type, row, key);
    if (!limit) return;
    if (min === null || limit < min) min = limit;
  });
  return min;
}

function insCounterMarkup(counterId, value, limit) {
  if (!limit) return '';
  const len = String(value || '').length;
  return `<div class="ins-char-count${len > limit ? ' over' : ''}" data-char-counter="${esc(counterId)}">${len}/${limit}</div>`;
}

function insIsOpenableUrl(v) {
  const raw = String(v || '').trim();
  if (!raw) return false;
  if (typeof isValidHttpUrl === 'function') return isValidHttpUrl(raw);
  return /^https?:\/\//i.test(raw);
}

function insUrlOpenControl(url, disabled = false) {
  const raw = String(url || '').trim();
  if (disabled || !insIsOpenableUrl(raw)) {
    return '<button type="button" class="ins-url-open" title="Invalid URL" aria-label="Open URL" disabled>↗</button>';
  }
  return `<a class="ins-url-open" href="${esc(raw)}" target="_blank" rel="noopener noreferrer" title="Open URL in new tab" aria-label="Open URL in new tab">↗</a>`;
}

function insDateOpenControl(disabled = false) {
  if (disabled) return `<button type="button" class="ins-date-open" title="Open calendar" aria-label="Open calendar" disabled>${SVG.calendar}</button>`;
  return `<button type="button" class="ins-date-open" title="Open calendar" aria-label="Open calendar">${SVG.calendar}</button>`;
}

function bindInspectorCounters(root) {
  root.querySelectorAll('[data-char-input]').forEach(el => {
    const id = el.dataset.charInput;
    const limit = Number(el.dataset.charLimit || 0);
    const counter = root.querySelector(`[data-char-counter="${CSS.escape(id)}"]`);
    if (!limit || !counter) return;
    const update = () => {
      const len = String(el.value || '').length;
      counter.textContent = `${len}/${limit}`;
      counter.classList.toggle('over', len > limit);
      el.classList.toggle('over-limit', len > limit);
    };
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    update();
  });
}

function insIntersectOptions(optionSets = []) {
  if (!Array.isArray(optionSets) || !optionSets.length) return [];
  let current = optionSets[0].map(v => String(v || '').trim()).filter(Boolean);
  let currentNorm = new Set(current.map(v => normalizeLabel(v)));
  for (let i = 1; i < optionSets.length; i++) {
    const next = optionSets[i].map(v => String(v || '').trim()).filter(Boolean);
    const nextNorm = new Set(next.map(v => normalizeLabel(v)));
    current = current.filter(v => nextNorm.has(normalizeLabel(v)));
    currentNorm = new Set(current.map(v => normalizeLabel(v)));
    if (!currentNorm.size) break;
  }
  return current;
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

  // Multi-select bulk mode
  if (s.sel.size >= 2) {
    const selIndices = [...s.sel];
    const orderedEditable = cfg.cols.filter(col => col.edit && !col.hide);
    const editableAll = orderedEditable.filter(col =>
      col.edit && !col.hide && selIndices.every(i => isCellEditable(activeTab, s.cur[i], col.k))
    );

    const fieldHtml = editableAll.map(col => {
      const values = selIndices.map(i => s.cur[i][col.k] || '');
      const allSame = values.every(v => v === values[0]);
      const displayVal = allSame ? values[0] : '';
      const placeholder = allSame ? '' : '< varies >';
      const bulkLimit = insGetBulkFieldLimit(activeTab, selIndices, col.k);
      const counterId = `bulk-${col.k}`;

      if (activeTab === 'adsets' && col.k === 'audienceString') {
        const sameVal = values[0] || '';
        const summary = allSame && String(sameVal).trim().startsWith('{')
          ? renderInspectorAudienceSummary(sameVal)
          : '';
        const info = summary
          ? '<div class="ins-aud-empty">Audience is the same in all selected rows.</div>'
          : '<div class="ins-aud-empty">Audience differs across selected rows. Use Audience Bulk Editor to update safely.</div>';
        const firstSel = selIndices[0];
        const editBtn = summary
          ? `<button class="btn btn-s btn-sm" id="insBulkAudienceEdit" data-i="${firstSel}" data-k="${col.k}" data-h="${esc(col.h)}">Edit First Selected</button>`
          : '';
        return `<div class="ins-row">
          <label>${esc(col.h)}</label>
          <div class="ins-aud-wrap">${summary || info}</div>
          <div class="ins-json-actions">
            ${editBtn}
            <button class="btn btn-s btn-sm ins-open-aud-bulk">Audience Bulk Editor</button>
          </div>
        </div>`;
      }

      if (col.type === 'status') {
        const statusOptionSets = selIndices.map(i => getChoiceOptions(activeTab, col.k, s.cur, s.cur[i]));
        const commonStatusOptions = insIntersectOptions(statusOptionSets);
        const missingCurrent = allSame && displayVal && !commonStatusOptions.includes(displayVal)
          ? `<option value="${esc(displayVal)}" selected disabled>${esc(displayVal)}</option>`
          : '';
        return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field" data-bulk-k="${col.k}"><option value=""${!allSame ? ' selected' : ''}>< varies ></option>${commonStatusOptions.map(o => `<option value="${esc(o)}" ${allSame && displayVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}${missingCurrent}</select></div>`;
      }
      if (col.type === 'cta') {
        return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field" data-bulk-k="${col.k}"><option value=""${!allSame ? ' selected' : ''}>< varies ></option>${s.ctaOptions.map(o => `<option value="${esc(o)}" ${allSame && displayVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      if (col.type === 'choice') {
        const opts = getChoiceOptions(activeTab, col.k, s.cur);
        return `<div class="ins-row"><label>${esc(col.h)}</label><select class="ins-field" data-bulk-k="${col.k}"><option value=""${!allSame ? ' selected' : ''}>< varies ></option>${opts.map(o => `<option value="${esc(o)}" ${allSame && displayVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      }
      if (col.type === 'date') {
        const isoDate = allSame ? usDateToIsoDateInput(displayVal) : '';
        const variesHint = allSame ? '' : '<div class="ins-date-hint">< varies ></div>';
        return `<div class="ins-row"><label>${esc(col.h)}</label><div class="ins-field-row"><input type="date" class="ins-field ins-date-input" data-bulk-k="${col.k}" data-date-iso="1" data-no-type-date="1" value="${esc(isoDate)}">${insDateOpenControl()}</div>${variesHint}</div>`;
      }
      if (col.k === 'destinationUrl') {
        return `<div class="ins-row"><label>${esc(col.h)}</label><div class="ins-field-row"><input type="text" class="ins-field ins-url-input" data-bulk-k="${col.k}" data-char-input="${esc(counterId)}" data-char-limit="${bulkLimit || ''}" value="${allSame ? esc(displayVal) : ''}" placeholder="${esc(placeholder)}">${insUrlOpenControl(displayVal, !allSame)}</div>${insCounterMarkup(counterId, allSame ? displayVal : '', bulkLimit)}</div>`;
      }
      return `<div class="ins-row"><label>${esc(col.h)}</label><textarea class="ins-field ins-auto" data-bulk-k="${col.k}" data-char-input="${esc(counterId)}" data-char-limit="${bulkLimit || ''}" rows="1" placeholder="${esc(placeholder)}">${allSame ? esc(displayVal) : ''}</textarea>${insCounterMarkup(counterId, allSame ? displayVal : '', bulkLimit)}</div>`;
    }).join('');

    zone.innerHTML = `<div class="inspector">
  <div class="ins-sticky">
    <div class="ins-header">
      <div class="ins-header-left">
        <h3>Bulk Edit · ${s.sel.size} rows</h3>
        <div class="meta">Changes apply to all selected rows</div>
      </div>
      <button class="ins-close" id="insCloseBtn" title="Hide panel">${SVG.panelClose}</button>
    </div>
  </div>
  <div class="ins-scroll">
    <div class="ins-grid">${fieldHtml}</div>
    <div class="ins-actions">
      <button class="btn btn-s btn-sm" id="bulkClearSel">Clear selection</button>
    </div>
  </div>
</div>`;

    autoSizeAll();
    bindInspectorCounters(zone);

    zone.querySelectorAll('[data-bulk-k]').forEach(el => {
      const handler = () => {
        const k = el.dataset.bulkK;
        const v = el.dataset.dateIso === '1' ? isoDateInputToUs(el.value) : el.value;
        if (v === '' && el.tagName === 'SELECT') return;
        selIndices.forEach(i => {
          if (!isCellEditable(activeTab, s.cur[i], k)) return;
          setCellValue(activeTab, i, k, v);
        });
        runValidation(activeTab);
        renderPreflight();
        renderTable();
        updateBar();
        updateTabBadges();
        renderInspector();
      };
      el.addEventListener('change', handler);
      if ((el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && el.dataset.dateIso !== '1') el.addEventListener('blur', handler);
    });
    zone.querySelectorAll('input[data-no-type-date="1"]').forEach(el => {
      el.addEventListener('keydown', e => {
        if (e.key === 'Tab') return;
        e.preventDefault();
      });
      el.addEventListener('paste', e => e.preventDefault());
      el.addEventListener('drop', e => e.preventDefault());
    });

    Q('#bulkClearSel').addEventListener('click', () => { s.sel = new Set(); render(); });
    const bulkAudienceEditBtn = Q('#insBulkAudienceEdit');
    if (bulkAudienceEditBtn) {
      bulkAudienceEditBtn.addEventListener('click', () => {
        openTextModal(activeTab, +bulkAudienceEditBtn.dataset.i, bulkAudienceEditBtn.dataset.k, bulkAudienceEditBtn.dataset.h);
      });
    }
    zone.querySelectorAll('.ins-open-aud-bulk').forEach(btn => btn.addEventListener('click', () => {
      if (typeof openAudienceBulkModal === 'function') openAudienceBulkModal();
    }));
    zone.querySelectorAll('.ins-date-open').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault();
      const input = btn.parentElement?.querySelector('input[data-date-iso="1"]');
      openDateInputPicker(input);
    }));
    Q('#insCloseBtn').addEventListener('click', () => { inspectorHidden = true; render(); });
    return;
  }

  // Single row mode
  const idx = Number.isInteger(s.focusRow) ? s.focusRow : null;
  const row = idx !== null ? s.cur[idx] : null;

  if (!row) {
    zone.innerHTML = `<div class="inspector">
  <div class="ins-sticky">
    <div class="ins-header">
      <div class="ins-header-left">
        <h3>Inspector</h3>
        <div class="meta">No row selected</div>
      </div>
      <button class="ins-close" id="insCloseBtn" title="Hide panel">${SVG.panelClose}</button>
    </div>
  </div>
  <div class="ins-scroll">
    <div class="inspector-empty">Select a row to open quick editor and see all fields without horizontal scrolling.</div>
  </div>
</div>`;
    Q('#insCloseBtn').addEventListener('click', () => {
      inspectorHidden = true;
      render();
    });
    return;
  }

  const name = row[cfg.nameField] || row[cfg.idField] || `Row #${idx + 1}`;
  const issueRows = s.validation.rowsWithIssues.has(idx);
  const editable = cfg.cols.filter(col => col.edit && !col.hide && isCellEditable(activeTab, row, col.k));
  const readonly = cfg.cols.filter(col => !col.hide && (!col.edit || !isCellEditable(activeTab, row, col.k)));

  const fieldHtml = editable.map(col => {
    const v = row[col.k] || '';
    const issue = s.validation.cellIssues.get(`${idx}:${col.k}`);
    const issueCls = issue ? ` is-${issue.level}` : '';
    const issueTitle = issue ? ` title="${esc(issue.msg)}"` : '';
    const mod = isCellModified(activeTab, idx, col.k);
    const modBadge = mod ? '<span class="ins-mod-badge">Modified</span>' : '';
    const revertBtn = mod ? `<button class="ins-revert-field" data-ins-revert-k="${col.k}" title="Revert field">↺ Revert</button>` : '';
    const labelHtml = `<label><span>${esc(col.h)}</span>${modBadge}${revertBtn}</label>`;
    const limit = insGetFieldLimit(activeTab, row, col.k);
    const counterId = `single-${idx}-${col.k}`;

    if (col.type === 'status') {
      const statusOptions = getChoiceOptions(activeTab, col.k, s.cur, row);
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<select class="ins-field${issueCls}" data-ins-k="${col.k}"${issueTitle}>${statusOptions.map(o => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}${!statusOptions.includes(v) && v ? `<option value="${esc(v)}" selected disabled>${esc(v)}</option>` : ''}</select></div>`;
    }
    if (col.type === 'cta') {
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<select class="ins-field${issueCls}" data-ins-k="${col.k}"${issueTitle}><option value="">—</option>${s.ctaOptions.map(o => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    if (col.type === 'choice') {
      const opts = getChoiceOptions(activeTab, col.k, s.cur, row);
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<select class="ins-field${issueCls}" data-ins-k="${col.k}"${issueTitle}><option value="">—</option>${opts.map(o => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    if (col.type === 'date') {
      const isoDate = usDateToIsoDateInput(v);
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<div class="ins-field-row"><input type="date" class="ins-field ins-date-input${issueCls}" data-ins-k="${col.k}" data-date-iso="1" data-no-type-date="1" value="${esc(isoDate)}"${issueTitle}>${insDateOpenControl()}</div></div>`;
    }
    if (col.k === 'audienceString' && v.trim().startsWith('{')) {
      try {
        JSON.parse(v);
        const audienceSummary = renderInspectorAudienceSummary(v);
        const audienceBtn = activeTab === 'adsets'
          ? `<button class="ins-open-aud-bulk"${s.sel.size ? '' : ' disabled'}>Audience Bulk Editor${s.sel.size ? ` (${s.sel.size})` : ''}</button>`
          : '';
        return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<div class="ins-json-wrap"><div class="ins-aud-wrap">${audienceSummary || '<div class="ins-aud-empty">Audience structure is empty.</div>'}</div><div class="ins-json-actions"><button class="ins-json-open-modal" data-k="${col.k}" data-h="${esc(col.h)}">✎ Edit in modal</button>${audienceBtn}</div></div></div>`;
      } catch (e) { /* fall through */ }
    }
    if (col.k === 'audienceString') {
      const audienceBtn = activeTab === 'adsets'
        ? `<button class="ins-open-aud-bulk"${s.sel.size ? '' : ' disabled'}>Audience Bulk Editor${s.sel.size ? ` (${s.sel.size})` : ''}</button>`
        : '';
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<textarea class="ins-field ins-auto${issueCls}" data-ins-k="${col.k}" data-char-input="${esc(counterId)}" data-char-limit="${limit || ''}"${issueTitle} rows="1">${esc(v)}</textarea>${insCounterMarkup(counterId, v, limit)}<div class="ins-json-actions"><button class="ins-json-open-modal" data-k="${col.k}" data-h="${esc(col.h)}">✎ Edit in modal</button>${audienceBtn}</div></div>`;
    }
    if (col.k === 'destinationUrl') {
      return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<div class="ins-field-row"><input type="text" class="ins-field ins-url-input${issueCls}" data-ins-k="${col.k}" data-char-input="${esc(counterId)}" data-char-limit="${limit || ''}" value="${esc(v)}"${issueTitle}>${insUrlOpenControl(v)}</div>${insCounterMarkup(counterId, v, limit)}</div>`;
    }
    return `<div class="ins-row ${mod ? 'mod' : ''}">${labelHtml}<textarea class="ins-field ins-auto${issueCls}" data-ins-k="${col.k}" data-char-input="${esc(counterId)}" data-char-limit="${limit || ''}"${issueTitle} rows="1">${esc(v)}</textarea>${insCounterMarkup(counterId, v, limit)}</div>`;
  }).join('');

  const readonlyHtml = readonly.map(col => {
    const v = row[col.k] || '';
    const lockReason = col.edit ? getCellEditLockReason(activeTab, row, col.k) : '';
    const label = lockReason ? `${col.h} (Locked)` : col.h;
    const labelTitle = lockReason ? ` title="${esc(lockReason)}"` : '';
    if (col.k === 'destinationUrl') {
      return `<div class="ins-row"><label${labelTitle}>${esc(label)}</label><div class="ins-field-row"><textarea class="ins-field ins-auto ins-ro-ref" rows="1" readonly tabindex="-1">${esc(v)}</textarea>${insUrlOpenControl(v)}</div></div>`;
    }
    return `<div class="ins-row"><label${labelTitle}>${esc(label)}</label><textarea class="ins-field ins-auto ins-ro-ref" rows="1" readonly tabindex="-1">${esc(v)}</textarea></div>`;
  }).join('');

  zone.innerHTML = `
<div class="inspector">
  <div class="ins-sticky">
    <div class="ins-header">
      <div class="ins-header-left">
        <h3>${esc(name)}</h3>
        <div class="meta">${esc(cfg.idField)}: ${esc(row[cfg.idField] || '—')} · ${issueRows ? 'Has validation issues' : 'No row-level issues'}</div>
      </div>
      <button class="ins-close" id="insCloseBtn" title="Hide panel">${SVG.panelClose}</button>
    </div>
  </div>
  <div class="ins-scroll">
    <div class="ins-grid">${fieldHtml}</div>
    <div class="ins-actions">
      <button class="btn btn-s btn-sm" id="insPrev">← Prev row</button>
      <button class="btn btn-s btn-sm" id="insNext">Next row →</button>
      <button class="btn btn-s btn-sm" id="insIssue">${SVG.warning} Next issue</button>
    </div>
    <div class="ins-label" style="margin-top:12px;">Read-only Reference</div>
    <div class="ins-grid">${readonlyHtml || '<div class="inspector-empty" style="padding:0;">No additional read-only fields</div>'}</div>
  </div>
</div>
  `;

  autoSizeAll();
  bindInspectorCounters(zone);

  zone.querySelectorAll('[data-ins-k]').forEach(el => {
    const save = () => {
      const k = el.dataset.insK;
      const nextValue = el.dataset.dateIso === '1' ? isoDateInputToUs(el.value) : el.value;
      if (s.cur[idx][k] === nextValue) return;
      setCellValue(activeTab, idx, k, nextValue);
      runValidation(activeTab);
      renderPreflight();
      renderTable();
      updateBar();
      updateTabBadges();
      renderInspector();
    };
    el.addEventListener('change', save);
    if ((el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && el.dataset.dateIso !== '1') el.addEventListener('blur', save);
  });

  zone.querySelectorAll('input[data-no-type-date="1"]').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      e.preventDefault();
    });
    el.addEventListener('paste', e => e.preventDefault());
    el.addEventListener('drop', e => e.preventDefault());
  });

  zone.querySelectorAll('[data-ins-revert-k]').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const k = btn.dataset.insRevertK;
    if (!revertCellValue(activeTab, idx, k)) return;
    runValidation(activeTab);
    renderPreflight();
    renderTable();
    updateBar();
    updateTabBadges();
    renderInspector();
  }));

  zone.querySelectorAll('.ins-json-open-modal').forEach(btn => btn.addEventListener('click', () => {
    openTextModal(activeTab, idx, btn.dataset.k, btn.dataset.h);
  }));
  zone.querySelectorAll('.ins-open-aud-bulk').forEach(btn => btn.addEventListener('click', () => {
    if (btn.disabled) return;
    if (typeof openAudienceBulkModal === 'function') openAudienceBulkModal();
  }));
  zone.querySelectorAll('.ins-date-open').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    const input = btn.parentElement?.querySelector('input[data-date-iso="1"]');
    openDateInputPicker(input);
  }));

  const filtered = getFiltered(activeTab).map(x => x.i);
  const pos = filtered.indexOf(idx);
  const prev = pos > 0 ? filtered[pos - 1] : filtered[filtered.length - 1];
  const next = pos >= 0 && pos < filtered.length - 1 ? filtered[pos + 1] : filtered[0];
  Q('#insPrev').addEventListener('click', () => {
    if (prev === undefined) return;
    s.focusRow = prev;
    renderToolbar();
    renderTable();
    renderInspector();
    const tr = Q(`tr[data-i="${prev}"]`);
    if (tr) tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  Q('#insNext').addEventListener('click', () => {
    if (next === undefined) return;
    s.focusRow = next;
    renderToolbar();
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
