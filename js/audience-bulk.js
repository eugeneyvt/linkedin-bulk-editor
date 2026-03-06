/* ===== AUDIENCE BULK EDITOR (AD SETS) ===== */
let audienceBulkPreview = null;

const AUD_BULK_STATUS_LABELS = {
  changed: 'Changed',
  unchanged: 'No change',
  conflict: 'Conflict',
};

function abIsObj(val) {
  return !!val && typeof val === 'object' && !Array.isArray(val);
}

function abSplitUrn(raw) {
  const m = String(raw || '').match(/^(urn:li:[^:]+:)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], body: m[2] };
}

function abHumanizeFacet(key) {
  return String(key || '')
    .replace(/^urn:li:adTargetingFacet:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function abFacetLabel(key) {
  if (typeof FACET_LABELS !== 'undefined' && FACET_LABELS[key]) return FACET_LABELS[key];
  return abHumanizeFacet(key);
}

function abFacetValueLabel(facetKey, rawValue) {
  const labels = typeof FACET_VALUE_LABELS !== 'undefined' ? FACET_VALUE_LABELS[facetKey] : null;
  if (labels && labels[rawValue]) return labels[rawValue];

  const urn = abSplitUrn(rawValue);
  if (!urn) return String(rawValue || '');
  return urn.body;
}

function abReadIncludeFacetInfo(root, facetKey) {
  const info = {
    orGroups: [],
    mixedOrGroups: [],
    dedicatedOrGroups: [],
    rootOr: null,
    andPlacements: [],
  };

  const include = root.include;
  if (!abIsObj(include)) return info;

  if (Array.isArray(include.and)) {
    include.and.forEach((group, groupIndex) => {
      if (!abIsObj(group)) return;

      if (abIsObj(group.or) && Array.isArray(group.or[facetKey])) {
        const facetKeys = Object.keys(group.or).filter(k => Array.isArray(group.or[k]));
        const placement = {
          groupIndex,
          map: group.or,
          arr: group.or[facetKey],
          isDedicated: facetKeys.length === 1,
          label: `Include • Group ${groupIndex + 1} (OR)`,
        };
        info.orGroups.push(placement);
        if (placement.isDedicated) info.dedicatedOrGroups.push(placement);
        else info.mixedOrGroups.push(placement);
      }

      if (abIsObj(group.and) && Array.isArray(group.and[facetKey])) {
        info.andPlacements.push({
          groupIndex,
          map: group.and,
          arr: group.and[facetKey],
          label: `Include • Group ${groupIndex + 1} (AND)`
        });
      }

      if (Array.isArray(group[facetKey])) {
        info.orGroups.push({
          groupIndex,
          map: group,
          arr: group[facetKey],
          isDedicated: false,
          label: `Include • Group ${groupIndex + 1} (legacy)`
        });
      }
    });
  } else if (abIsObj(include.and) && Array.isArray(include.and[facetKey])) {
    info.andPlacements.push({
      groupIndex: null,
      map: include.and,
      arr: include.and[facetKey],
      label: 'Include (legacy AND map)'
    });
  }

  if (abIsObj(include.or) && Array.isArray(include.or[facetKey])) {
    info.rootOr = {
      map: include.or,
      arr: include.or[facetKey],
      label: 'Include (root OR)'
    };
  }

  return info;
}

function abReadExcludeFacetInfo(root, facetKey) {
  const info = {
    orPlacement: null,
    andPlacements: [],
  };

  const exclude = root.exclude;
  if (!abIsObj(exclude)) return info;

  if (abIsObj(exclude.or) && Array.isArray(exclude.or[facetKey])) {
    info.orPlacement = {
      map: exclude.or,
      arr: exclude.or[facetKey],
      label: 'Exclude (OR)'
    };
  }

  if (abIsObj(exclude.and) && Array.isArray(exclude.and[facetKey])) {
    info.andPlacements.push({
      map: exclude.and,
      arr: exclude.and[facetKey],
      label: 'Exclude (AND)'
    });
  }

  if (Array.isArray(exclude.and)) {
    exclude.and.forEach((group, idx) => {
      if (!abIsObj(group)) return;
      if (abIsObj(group.or) && Array.isArray(group.or[facetKey])) {
        info.andPlacements.push({
          map: group.or,
          arr: group.or[facetKey],
          label: `Exclude • Group ${idx + 1} (AND container)`
        });
      }
      if (abIsObj(group.and) && Array.isArray(group.and[facetKey])) {
        info.andPlacements.push({
          map: group.and,
          arr: group.and[facetKey],
          label: `Exclude • Group ${idx + 1} (AND)`
        });
      }
    });
  }

  return info;
}

function abInferPrefixFromPlacements(placements) {
  for (const placement of placements) {
    if (!placement || !Array.isArray(placement.arr)) continue;
    for (const value of placement.arr) {
      const urn = abSplitUrn(value);
      if (urn && urn.prefix) return urn.prefix;
    }
  }
  return '';
}

function abResolveTokenForFacet(token, facetKey, fallbackPrefix) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  if (/^urn:li:/.test(raw)) return raw;

  const labels = typeof FACET_VALUE_LABELS !== 'undefined' ? FACET_VALUE_LABELS[facetKey] : null;
  if (labels) {
    const low = raw.toLowerCase();
    for (const [urn, label] of Object.entries(labels)) {
      if (String(label).toLowerCase() === low) return urn;
      const split = abSplitUrn(urn);
      if (split && split.body.toLowerCase() === low) return urn;
    }
  }

  return fallbackPrefix ? `${fallbackPrefix}${raw}` : raw;
}

function abParseValuesInput(raw) {
  const values = String(raw || '')
    .split(/[\n,;]+/)
    .map(v => v.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

function abApplyValues(arr, mode, values) {
  const before = Array.isArray(arr) ? [...arr] : [];
  if (!Array.isArray(arr)) return { changed: false, before, after: before, added: [], removed: [] };

  if (mode === 'add') {
    values.forEach(v => {
      if (!arr.includes(v)) arr.push(v);
    });
  } else {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (values.includes(arr[i])) arr.splice(i, 1);
    }
  }

  const after = [...arr];
  const added = after.filter(v => !before.includes(v));
  const removed = before.filter(v => !after.includes(v));
  return { changed: added.length > 0 || removed.length > 0, before, after, added, removed };
}

function abEnsureIncludeAndGroups(root) {
  if (!abIsObj(root.include)) root.include = {};

  if (Array.isArray(root.include.and)) return root.include.and;

  if (abIsObj(root.include.or)) {
    root.include.and = [{ or: root.include.or }];
    delete root.include.or;
    return root.include.and;
  }

  if (abIsObj(root.include.and)) return null;

  root.include.and = [];
  return root.include.and;
}

function abEnsureExcludeOr(root) {
  if (!abIsObj(root.exclude)) root.exclude = {};
  if (!abIsObj(root.exclude.or)) root.exclude.or = {};
  return root.exclude.or;
}

function abCleanupIncludeGroup(root, groupIndex, mapKey, facetKey) {
  const groups = root?.include?.and;
  if (!Array.isArray(groups)) return;
  const group = groups[groupIndex];
  if (!abIsObj(group)) return;
  const map = group[mapKey];
  if (abIsObj(map) && Array.isArray(map[facetKey]) && map[facetKey].length === 0) delete map[facetKey];
  if (abIsObj(map) && Object.keys(map).length === 0) delete group[mapKey];
  if (Object.keys(group).length === 0) groups.splice(groupIndex, 1);
}

function abCleanupExclude(root, facetKey) {
  const excludeOr = root?.exclude?.or;
  if (!abIsObj(excludeOr)) return;
  if (Array.isArray(excludeOr[facetKey]) && excludeOr[facetKey].length === 0) delete excludeOr[facetKey];
}

function abConflict(reason) {
  return { status: 'conflict', reason };
}

function abUnchanged(reason, targetLabel = '') {
  return { status: 'unchanged', reason, targetLabel };
}

function abChanged(targetLabel, valuesResult) {
  return {
    status: 'changed',
    targetLabel,
    beforeValues: valuesResult.before,
    afterValues: valuesResult.after,
    addedValues: valuesResult.added,
    removedValues: valuesResult.removed,
  };
}

function abApplyIncludeOr(root, facetKey, mode, values) {
  const info = abReadIncludeFacetInfo(root, facetKey);
  if (info.andPlacements.length > 0) {
    return abConflict('Facet already uses AND placement in Include. Resolve manually for this row.');
  }
  if (info.rootOr && info.orGroups.length > 0) {
    return abConflict('Facet exists in multiple Include structures (root OR + grouped). Resolve manually.');
  }

  let target = null;
  let cleanup = null;

  if (info.orGroups.length > 1) {
    return abConflict('Facet exists in multiple Include groups. Cannot auto-pick OR group.');
  }

  if (info.orGroups.length === 1) {
    target = info.orGroups[0];
    cleanup = () => abCleanupIncludeGroup(root, target.groupIndex, 'or', facetKey);
  } else if (info.rootOr) {
    target = info.rootOr;
    cleanup = () => {
      if (Array.isArray(info.rootOr.map[facetKey]) && info.rootOr.map[facetKey].length === 0) delete info.rootOr.map[facetKey];
    };
  } else {
    const groups = abEnsureIncludeAndGroups(root);
    if (!Array.isArray(groups)) {
      return abConflict('Include uses unsupported structure. Edit manually for this row.');
    }

    if (groups.length > 1) {
      return abConflict('Multiple Include groups found; OR target group is ambiguous.');
    }

    if (!groups.length) groups.push({ or: {} });
    const group = groups[0];
    if (!abIsObj(group.or)) group.or = {};
    if (!Array.isArray(group.or[facetKey])) group.or[facetKey] = [];

    target = {
      arr: group.or[facetKey],
      label: 'Include • Group 1 (OR)',
      groupIndex: 0,
    };
    cleanup = () => abCleanupIncludeGroup(root, 0, 'or', facetKey);
  }

  const valuesResult = abApplyValues(target.arr, mode, values);
  cleanup();
  if (!valuesResult.changed) return abUnchanged('Already in desired state', target.label);
  return abChanged(target.label, valuesResult);
}

function abApplyIncludeAnd(root, facetKey, mode, values) {
  const info = abReadIncludeFacetInfo(root, facetKey);
  if (info.andPlacements.length > 0) {
    return abConflict('Facet already uses raw AND map in Include. Resolve manually for this row.');
  }
  if (info.rootOr) {
    return abConflict('Facet is in root Include OR structure. Move it manually before AND bulk edit.');
  }

  if (info.mixedOrGroups.length > 0) {
    return abConflict('Facet is inside an OR group with other filters. AND update is ambiguous.');
  }

  if (info.dedicatedOrGroups.length > 1) {
    return abConflict('Facet appears in multiple dedicated Include groups. Resolve manually.');
  }

  let target = null;
  let cleanup = null;

  if (info.dedicatedOrGroups.length === 1) {
    target = info.dedicatedOrGroups[0];
    cleanup = () => abCleanupIncludeGroup(root, target.groupIndex, 'or', facetKey);
  } else {
    if (mode === 'remove') {
      return abUnchanged('No dedicated AND group with this facet in Include');
    }

    const groups = abEnsureIncludeAndGroups(root);
    if (!Array.isArray(groups)) {
      return abConflict('Include uses unsupported structure. Edit manually for this row.');
    }

    const groupIndex = groups.length;
    groups.push({ or: { [facetKey]: [] } });
    target = {
      arr: groups[groupIndex].or[facetKey],
      label: `Include • Group ${groupIndex + 1} (AND)`,
      groupIndex,
    };
    cleanup = () => abCleanupIncludeGroup(root, groupIndex, 'or', facetKey);
  }

  const valuesResult = abApplyValues(target.arr, mode, values);
  cleanup();
  if (!valuesResult.changed) return abUnchanged('Already in desired state', target.label);
  return abChanged(target.label, valuesResult);
}

function abApplyExcludeOr(root, facetKey, mode, values) {
  const info = abReadExcludeFacetInfo(root, facetKey);
  if (info.andPlacements.length > 0) {
    return abConflict('Facet already uses AND placement in Exclude. Resolve manually for this row.');
  }

  let target = info.orPlacement;
  if (!target) {
    if (mode === 'remove') {
      return abUnchanged('Facet not found in Exclude OR');
    }

    const excludeOr = abEnsureExcludeOr(root);
    if (!Array.isArray(excludeOr[facetKey])) excludeOr[facetKey] = [];
    target = {
      arr: excludeOr[facetKey],
      map: excludeOr,
      label: 'Exclude (OR)',
    };
  }

  const valuesResult = abApplyValues(target.arr, mode, values);
  abCleanupExclude(root, facetKey);
  if (!valuesResult.changed) return abUnchanged('Already in desired state', target.label);
  return abChanged(target.label, valuesResult);
}

function abResolveValuesForRow(rawTokens, facetKey, root) {
  const includeInfo = abReadIncludeFacetInfo(root, facetKey);
  const excludeInfo = abReadExcludeFacetInfo(root, facetKey);

  const placements = [];
  includeInfo.orGroups.forEach(x => placements.push(x));
  includeInfo.andPlacements.forEach(x => placements.push(x));
  if (includeInfo.rootOr) placements.push(includeInfo.rootOr);
  if (excludeInfo.orPlacement) placements.push(excludeInfo.orPlacement);
  excludeInfo.andPlacements.forEach(x => placements.push(x));

  const prefix = abInferPrefixFromPlacements(placements);
  const resolved = rawTokens.map(v => abResolveTokenForFacet(v, facetKey, prefix)).filter(Boolean);
  return Array.from(new Set(resolved));
}

function abProcessRow(rowIdx, cfg) {
  const row = S.adsets.cur[rowIdx];
  const rowId = row.adSetId || `#${rowIdx + 1}`;
  const rowName = row.adSetName || rowId;

  const raw = String(row.audienceString || '').trim();
  let parsed;
  if (!raw) parsed = {};
  else {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {
        rowIdx,
        rowId,
        rowName,
        status: 'conflict',
        reason: 'Audience String is invalid JSON',
      };
    }
  }

  if (!abIsObj(parsed)) {
    return {
      rowIdx,
      rowId,
      rowName,
      status: 'conflict',
      reason: 'Audience String root is not an object',
    };
  }

  const root = JSON.parse(JSON.stringify(parsed));
  const resolvedValues = abResolveValuesForRow(cfg.values, cfg.facetKey, root);
  if (!resolvedValues.length) {
    return {
      rowIdx,
      rowId,
      rowName,
      status: 'conflict',
      reason: 'No valid values after normalization',
    };
  }

  let opResult;
  if (cfg.section === 'include') {
    opResult = cfg.logic === 'and'
      ? abApplyIncludeAnd(root, cfg.facetKey, cfg.mode, resolvedValues)
      : abApplyIncludeOr(root, cfg.facetKey, cfg.mode, resolvedValues);
  } else {
    if (cfg.logic === 'and') {
      opResult = abConflict('Exclude + AND is not supported in LinkedIn targeting export format');
    } else {
      opResult = abApplyExcludeOr(root, cfg.facetKey, cfg.mode, resolvedValues);
    }
  }

  const result = {
    rowIdx,
    rowId,
    rowName,
    status: opResult.status,
    reason: opResult.reason || '',
    targetLabel: opResult.targetLabel || '',
    beforeValues: opResult.beforeValues || [],
    afterValues: opResult.afterValues || [],
    addedValues: opResult.addedValues || [],
    removedValues: opResult.removedValues || [],
  };

  if (opResult.status === 'changed') {
    result.nextAudienceString = JSON.stringify(root);
  }

  return result;
}

function abReadFormConfig() {
  const mode = Q('#abOp').value;
  const section = Q('#abSection').value;
  const logic = Q('#abLogic').value;
  const facetChoice = Q('#abFacet').value;
  const facetKey = facetChoice === '__custom__' ? String(Q('#abFacetCustom').value || '').trim() : facetChoice;
  const values = abParseValuesInput(Q('#abValues').value);

  if (!facetKey) {
    toast('Choose a facet first', 'inf');
    return null;
  }
  if (!facetKey.startsWith('urn:li:adTargetingFacet:')) {
    toast('Facet key must start with urn:li:adTargetingFacet:', 'err');
    return null;
  }
  if (!values.length) {
    toast('Add at least one value', 'inf');
    return null;
  }

  return { mode, section, logic, facetKey, values };
}

function abRenderPreview(preview) {
  const summary = Q('#abSummary');
  const list = Q('#abPreviewList');
  const applyBtn = Q('#abApplyBtn');

  if (!preview) {
    summary.innerHTML = '';
    list.innerHTML = '<div class="ab-empty">Run preview to see impacted ad sets</div>';
    applyBtn.disabled = true;
    return;
  }

  summary.innerHTML = `
<span class="ab-chip changed">Changed: ${preview.changedCount}</span>
<span class="ab-chip conflict">Conflicts: ${preview.conflictCount}</span>
<span class="ab-chip same">No change: ${preview.unchangedCount}</span>
<span class="ab-chip">Selected: ${preview.total}</span>
`;

  const html = preview.rows.map(item => {
    const rowClass = item.status === 'changed' ? 'changed' : (item.status === 'conflict' ? 'conflict' : '');
    const statusClass = item.status === 'changed' ? 'changed' : (item.status === 'conflict' ? 'conflict' : '');

    let body = '';
    if (item.status === 'changed') {
      const before = item.beforeValues.length
        ? item.beforeValues.map(v => abFacetValueLabel(preview.cfg.facetKey, v)).join(', ')
        : 'empty';
      const after = item.afterValues.length
        ? item.afterValues.map(v => abFacetValueLabel(preview.cfg.facetKey, v)).join(', ')
        : 'empty';
      const added = item.addedValues.map(v => `<span class="ab-value add">+ ${esc(abFacetValueLabel(preview.cfg.facetKey, v))}</span>`).join('');
      const removed = item.removedValues.map(v => `<span class="ab-value remove">- ${esc(abFacetValueLabel(preview.cfg.facetKey, v))}</span>`).join('');
      body = `
<div class="ab-target">${esc(item.targetLabel)}</div>
<div class="ab-diff"><span class="ab-before">Before: ${esc(before)}</span></div>
<div class="ab-diff"><span class="ab-after">After: ${esc(after)}</span></div>
${added || removed ? `<div class="ab-values">${added}${removed}</div>` : ''}
`;
    } else if (item.status === 'conflict') {
      body = `<div class="ab-reason">${esc(item.reason || 'Manual review required')}</div>`;
    } else {
      body = `<div class="ab-reason">${esc(item.reason || 'Already in desired state')}</div>${item.targetLabel ? `<div class="ab-target">${esc(item.targetLabel)}</div>` : ''}`;
    }

    return `
<div class="ab-row ${rowClass}">
  <div class="ab-head">
    <div class="ab-name">${esc(item.rowName)} <span class="ab-id">${esc(item.rowId)}</span></div>
    <span class="ab-status ${statusClass}">${AUD_BULK_STATUS_LABELS[item.status] || item.status}</span>
  </div>
  ${body}
</div>
`;
  }).join('');

  list.innerHTML = html || '<div class="ab-empty">No selected ad sets found.</div>';
  applyBtn.disabled = preview.changedCount === 0;
}

function abBuildPreview() {
  if (activeTab !== 'adsets') {
    toast('Audience bulk editor is available only in Ad Sets tab', 'inf');
    return;
  }

  const cfg = abReadFormConfig();
  if (!cfg) return;

  const selected = Array.from(S.adsets.sel).sort((a, b) => a - b);
  if (!selected.length) {
    toast('Select at least one ad set row first', 'inf');
    return;
  }

  const rows = selected.map(i => abProcessRow(i, cfg));
  const preview = {
    cfg,
    rows,
    total: rows.length,
    changedCount: rows.filter(r => r.status === 'changed').length,
    conflictCount: rows.filter(r => r.status === 'conflict').length,
    unchangedCount: rows.filter(r => r.status === 'unchanged').length,
  };

  audienceBulkPreview = preview;
  abRenderPreview(preview);
}

function abApplyPreview() {
  if (!audienceBulkPreview) {
    toast('Run preview first', 'inf');
    return;
  }

  const changed = audienceBulkPreview.rows.filter(r => r.status === 'changed' && r.nextAudienceString !== undefined);
  if (!changed.length) {
    toast('No changes to apply', 'inf');
    return;
  }

  changed.forEach(item => {
    setCellValue('adsets', item.rowIdx, 'audienceString', item.nextAudienceString);
  });

  runValidation('adsets');
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
  updateTabBadges();

  toast(`Audience bulk applied: ${changed.length} ad set${changed.length === 1 ? '' : 's'} updated`, 'ok');
  abBuildPreview();
}

function abUpdateFormState() {
  const section = Q('#abSection').value;
  const logic = Q('#abLogic').value;
  const facetChoice = Q('#abFacet').value;
  const custom = Q('#abFacetCustom');
  const note = Q('#abNote');

  custom.style.display = facetChoice === '__custom__' ? '' : 'none';

  let noteText = '';
  let noteClass = '';
  if (section === 'exclude' && logic === 'and') {
    noteText = 'Exclude + AND is not supported by LinkedIn-compatible export. These rows will be shown as conflicts.';
    noteClass = 'warn';
  } else {
    const facetKey = facetChoice === '__custom__' ? String(custom.value || '').trim() : facetChoice;
    const labels = facetKey && typeof FACET_VALUE_LABELS !== 'undefined' ? FACET_VALUE_LABELS[facetKey] : null;
    if (labels) {
      const sample = Object.values(labels).slice(0, 5).join(', ');
      noteText = `Known values for this facet: ${sample}${Object.keys(labels).length > 5 ? ', ...' : ''}`;
    }
  }

  note.textContent = noteText;
  note.classList.toggle('warn', noteClass === 'warn');
}

function closeAudienceBulkModal() {
  const modal = Q('#audBulkModal');
  if (modal) modal.classList.remove('open');
}

function openAudienceBulkModal() {
  if (activeTab !== 'adsets') {
    toast('Switch to Ad Sets tab first', 'inf');
    return;
  }

  if (!S.adsets.sel.size) {
    toast('Select ad set rows first', 'inf');
    return;
  }

  const modal = Q('#audBulkModal');
  modal.classList.add('open');
  abRenderPreview(audienceBulkPreview);
  abUpdateFormState();
  abBuildPreview();
}

function initAudienceBulkModal() {
  const facetSel = Q('#abFacet');
  if (!facetSel) return;

  const facetKeys = (typeof FACET_LABELS !== 'undefined' ? Object.keys(FACET_LABELS) : [])
    .sort((a, b) => abFacetLabel(a).localeCompare(abFacetLabel(b)));

  facetSel.innerHTML = `${facetKeys.map(key => `<option value="${esc(key)}">${esc(abFacetLabel(key))}</option>`).join('')}<option value="__custom__">Custom facet key...</option>`;

  if (facetKeys.includes('urn:li:adTargetingFacet:titles')) {
    facetSel.value = 'urn:li:adTargetingFacet:titles';
  }

  Q('#abSection').addEventListener('change', abUpdateFormState);
  Q('#abLogic').addEventListener('change', abUpdateFormState);
  Q('#abFacet').addEventListener('change', abUpdateFormState);
  Q('#abFacetCustom').addEventListener('input', abUpdateFormState);

  Q('#abPreviewBtn').addEventListener('click', abBuildPreview);
  Q('#abApplyBtn').addEventListener('click', abApplyPreview);
  Q('#abCancel').addEventListener('click', closeAudienceBulkModal);
  Q('#audBulkModal').addEventListener('click', e => {
    if (e.target.id === 'audBulkModal') closeAudienceBulkModal();
  });

  abRenderPreview(null);
  abUpdateFormState();
}

initAudienceBulkModal();
