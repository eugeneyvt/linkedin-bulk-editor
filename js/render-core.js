/* ===== RENDERING ===== */
function render() {
  const loaded = Object.keys(TYPES).filter(t => S[t].loaded);
  const container = Q('.container');
  if (!loaded.length) {
    Q('#uploadsCtl').innerHTML = '';
    Q('#tabs').innerHTML = '';
    Q('#tabs').style.display = 'none';
    Q('#workspace').style.display = 'none';
    container.classList.add('upload-mode');
    Q('#bar').classList.remove('show');
    document.body.classList.remove('bar-open');
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
  Q('#uploads').classList.toggle('collapsed', uploadsCollapsed);
  runValidation(activeTab);
  updateMeta();
  renderWorkspaceHead();
  renderUploadsCtl(loaded);
  renderPreflight();
  renderToolbar();
  renderTable();
  renderInspector();
  updateBar();
}

function renderUploadsCtl(loaded = Object.keys(TYPES).filter(t => S[t].loaded)) {
  const loadedCount = loaded.length;
  if (!loadedCount) { Q('#uploadsCtl').innerHTML = ''; return; }
  const label = uploadsCollapsed ? 'Show upload cards' : 'Hide upload cards';
  Q('#uploadsCtl').innerHTML = `
<div class="top-rail">
  <div class="top-rail-tabs" id="uploadsTabs"></div>
  <div class="top-rail-actions">
    <button class="uploads-toggle" id="uploadsToggle">${label}</button>
  </div>
</div>`;
  renderTabs(loaded);
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
  const inlineTabsHost = Q('#uploadsTabs');
  const el = inlineTabsHost || Q('#tabs');
  if (!el) return;
  const legacyTabs = Q('#tabs');
  if (legacyTabs && inlineTabsHost) {
    legacyTabs.style.display = 'none';
    legacyTabs.innerHTML = '';
  } else if (legacyTabs) {
    legacyTabs.style.display = loaded.length > 0 ? 'flex' : 'none';
  }
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
  const syncToolbarPreflightState = hasLines => {
    const toolbar = Q('#toolbar .toolbar');
    if (!toolbar) return;
    toolbar.classList.toggle('toolbar-linked', hasLines);
    toolbar.classList.toggle('toolbar-standalone', !hasLines);
  };
  if (v.errors) lines.push(`<div class="pf-line err">${SVG.error} Validation errors in editable cells: <strong>${v.errors}</strong></div>`);
  if (v.warnings) lines.push(`<div class="pf-line warn">${SVG.warning} Validation warnings in editable cells: <strong>${v.warnings}</strong></div>`);
  if (!lines.length) {
    Q('#preflight').innerHTML = '';
    syncToolbarPreflightState(false);
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
  syncToolbarPreflightState(true);
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
