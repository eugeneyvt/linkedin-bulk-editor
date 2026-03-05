/* ===== TEXT EXPAND MODAL ===== */
let tmState = {};
/* ===== JSON PRETTY VIEWER ===== */
const FACET_LABELS = {
  'urn:li:adTargetingFacet:titles': 'Job Titles',
  'urn:li:adTargetingFacet:staffCountRanges': 'Company Size',
  'urn:li:adTargetingFacet:industries': 'Industries',
  'urn:li:adTargetingFacet:locations': 'Locations',
  'urn:li:adTargetingFacet:interfaceLocales': 'Interface Locales',
  'urn:li:adTargetingFacet:audienceMatchingSegments': 'Matched Audiences',
  'urn:li:adTargetingFacet:employers': 'Employers',
  'urn:li:adTargetingFacet:seniorities': 'Seniorities',
  'urn:li:adTargetingFacet:skills': 'Skills',
  'urn:li:adTargetingFacet:degrees': 'Degrees',
  'urn:li:adTargetingFacet:fieldsOfStudy': 'Fields of Study',
  'urn:li:adTargetingFacet:memberGroups': 'Member Groups',
  'urn:li:adTargetingFacet:memberBehaviors': 'Member Behaviors',
  'urn:li:adTargetingFacet:firstNames': 'First Names',
  'urn:li:adTargetingFacet:companyCategory': 'Company Category',
  'urn:li:adTargetingFacet:companyConnections': 'Company Connections',
  'urn:li:adTargetingFacet:companyFollowersOf': 'Company Followers',
  'urn:li:adTargetingFacet:companyGrowthRate': 'Company Growth Rate',
  'urn:li:adTargetingFacet:companyRevenueRanges': 'Company Revenue',
  'urn:li:adTargetingFacet:jobFunctions': 'Job Functions',
  'urn:li:adTargetingFacet:yearsOfExperienceRanges': 'Years of Experience',
  'urn:li:adTargetingFacet:ageRanges': 'Age Ranges',
  'urn:li:adTargetingFacet:genders': 'Genders',
};
function buildJsonTree(val, depth = 0, compact = false, path = []) {
  const jp = btoa(JSON.stringify(path));
  if (val === null) return `<span class="jt-null jt-editable" data-jpath="${jp}" title="Click to edit">null</span>`;
  if (typeof val === 'boolean') return `<span class="jt-bool jt-editable" data-jpath="${jp}" title="Click to edit">${val}</span>`;
  if (typeof val === 'number') return `<span class="jt-num jt-editable" data-jpath="${jp}" title="Click to edit">${val}</span>`;
  if (typeof val === 'string') return `<span class="jt-str jt-editable" data-jpath="${jp}" title="Click to edit">&quot;${esc(val)}&quot;</span>`;
  const collapseDepth = compact ? 2 : 3;
  if (Array.isArray(val)) {
    const addPath = btoa(JSON.stringify(path));
    const addBtn = `<div class="jt-line"><span class="jt-add" data-jadd="${addPath}">+ Add item</span></div>`;
    if (val.length === 0) return `<span class="jt-node"><span class="jt-brace">[</span><div class="jt-children jt-section">${addBtn}</div><span class="jt-brace">]</span></span>`;
    const items = val.map((v, i) => {
      const delPath = btoa(JSON.stringify([...path, i]));
      return `<div class="jt-line"><span class="jt-del" data-jdel="${delPath}" title="Remove">&times;</span>${buildJsonTree(v, depth + 1, compact, [...path, i])},</div>`;
    }).join('');
    const countBadge = `<span class="jt-count">${val.length}</span>`;
    const preview = `<span class="jt-preview">[${val.length} items]</span>`;
    const autoCollapse = depth >= collapseDepth ? ' jt-collapsed' : '';
    return `<span class="jt-node${autoCollapse}"><span class="jt-toggle" onclick="this.parentElement.classList.toggle('jt-collapsed')">▼</span><span class="jt-brace">[</span>${countBadge}${preview}<div class="jt-children jt-section">${items}${addBtn}</div><span class="jt-brace">]</span></span>`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="jt-brace">{}</span>';
    const items = keys.map(k => {
      const facet = FACET_LABELS[k];
      const label = facet ? `<span class="jt-facet-label">${esc(facet)}</span>` : '';
      const child = val[k];
      const countHint = (Array.isArray(child) && child.length > 0) ? `<span class="jt-count">${child.length}</span>` : '';
      return `<div class="jt-line"><span class="jt-key">"${esc(k)}"</span>${label}${countHint}: ${buildJsonTree(child, depth + 1, compact, [...path, k])},</div>`;
    }).join('');
    const preview = `<span class="jt-preview">{${keys.length} keys}</span>`;
    const autoCollapse = depth >= collapseDepth ? ' jt-collapsed' : '';
    return `<span class="jt-node${autoCollapse}"><span class="jt-toggle" onclick="this.parentElement.classList.toggle('jt-collapsed')">▼</span><span class="jt-brace">{</span>${preview}<div class="jt-children jt-section">${items}</div><span class="jt-brace">}</span></span>`;
  }
  return esc(String(val));
}

/* --- JSON inline editing helpers --- */
function getByPath(obj, path) {
  let cur = obj;
  for (const seg of path) cur = cur[seg];
  return cur;
}
function setByPath(obj, path, val) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = val;
}

function startInlineEdit(el, parsedRoot, onCommit) {
  if (el.querySelector('.jt-edit-input')) return; // already editing
  const path = JSON.parse(atob(el.dataset.jpath));
  const curVal = getByPath(parsedRoot, path);
  const isString = typeof curVal === 'string';
  const displayVal = isString ? curVal : JSON.stringify(curVal);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'jt-edit-input';
  input.value = displayVal;
  input.style.width = Math.max(80, Math.min(400, displayVal.length * 8 + 20)) + 'px';

  const origHTML = el.innerHTML;
  el.innerHTML = '';
  el.appendChild(input);
  input.focus();
  input.select();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const raw = input.value.trim();
    let newVal;
    if (isString) {
      newVal = raw;
    } else {
      // try to parse as JSON literal (number, boolean, null)
      try { newVal = JSON.parse(raw); } catch (e) { newVal = raw; }
    }
    setByPath(parsedRoot, path, newVal);
    onCommit(parsedRoot);
  }
  function cancel() {
    if (committed) return;
    committed = true;
    el.innerHTML = origHTML;
  }
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => { if (!committed) commit(); });
}

let tmJsonMode = false;
let tmParsedJson = null;

function attachJsonTreeHandlers(container, parsedRoot, onUpdate) {
  // Inline edit on leaf values
  container.querySelectorAll('.jt-editable').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      startInlineEdit(el, parsedRoot, onUpdate);
    });
  });
  // Delete array items
  container.querySelectorAll('.jt-del').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const path = JSON.parse(atob(el.dataset.jdel));
      const arrPath = path.slice(0, -1);
      const idx = path[path.length - 1];
      const arr = getByPath(parsedRoot, arrPath);
      arr.splice(idx, 1);
      onUpdate(parsedRoot);
    });
  });
  // Add array items
  container.querySelectorAll('.jt-add').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const path = JSON.parse(atob(el.dataset.jadd));
      const arr = getByPath(parsedRoot, path);
      // Guess the type from existing items
      const sample = arr.length > 0 ? arr[0] : '';
      const newVal = typeof sample === 'string' ? '' : (typeof sample === 'number' ? 0 : '');
      arr.push(newVal);
      onUpdate(parsedRoot);
    });
  });
}

function renderModalTree() {
  const compact = false;
  Q('#tmJsonView').innerHTML = buildJsonTree(tmParsedJson, 0, compact);
  Q('#tmArea').value = JSON.stringify(tmParsedJson);
  attachJsonTreeHandlers(Q('#tmJsonView'), tmParsedJson, (updated) => {
    tmParsedJson = updated;
    renderModalTree();
  });
}

function openTextModal(type, idx, key, header) {
  tmState = { type, idx, key };
  Q('#tmTitle').textContent = `Edit: ${header}`;
  const rawVal = S[type].cur[idx][key] || '';
  Q('#tmArea').value = rawVal;
  tmParsedJson = null;

  // Try to detect JSON for audience string
  let isJson = false;
  if (key === 'audienceString' && rawVal.trim().startsWith('{')) {
    try {
      tmParsedJson = JSON.parse(rawVal);
      isJson = true;
      renderModalTree();
      Q('#tmJsonView').style.display = '';
      Q('#tmArea').style.display = 'none';
      Q('#tmToggle').style.display = '';
      Q('#tmBtnPretty').classList.add('active');
      Q('#tmBtnRaw').classList.remove('active');
      tmJsonMode = true;
    } catch (e) { /* not valid JSON, show raw */ }
  }
  if (!isJson) {
    Q('#tmJsonView').style.display = 'none';
    Q('#tmArea').style.display = '';
    Q('#tmToggle').style.display = 'none';
    tmJsonMode = false;
  }

  Q('#textModal').querySelector('.text-modal').classList.toggle('json-wide', isJson);
  Q('#textModal').classList.add('open');
  if (!isJson) Q('#tmArea').focus();
}
Q('#tmBtnPretty').addEventListener('click', () => {
  // Sync: if user edited raw text, re-parse into tmParsedJson
  if (tmParsedJson) {
    try { tmParsedJson = JSON.parse(Q('#tmArea').value); } catch (e) { /* keep old */ }
    renderModalTree();
  }
  Q('#tmJsonView').style.display = '';
  Q('#tmArea').style.display = 'none';
  Q('#tmBtnPretty').classList.add('active');
  Q('#tmBtnRaw').classList.remove('active');
  tmJsonMode = true;
});
Q('#tmBtnRaw').addEventListener('click', () => {
  // Sync: tmParsedJson → prettified textarea
  if (tmParsedJson) {
    Q('#tmArea').value = JSON.stringify(tmParsedJson, null, 2);
  } else {
    try {
      const parsed = JSON.parse(Q('#tmArea').value);
      Q('#tmArea').value = JSON.stringify(parsed, null, 2);
    } catch (e) { /* keep as-is */ }
  }
  Q('#tmJsonView').style.display = 'none';
  Q('#tmArea').style.display = '';
  Q('#tmBtnPretty').classList.remove('active');
  Q('#tmBtnRaw').classList.add('active');
  tmJsonMode = false;
  Q('#tmArea').focus();
});
Q('#tmCancel').addEventListener('click', () => Q('#textModal').classList.remove('open'));
Q('#tmSave').addEventListener('click', () => {
  const { type, idx, key } = tmState;
  let val;
  if (tmParsedJson && key === 'audienceString') {
    // Use tmParsedJson as source of truth (handles both pretty and raw edits)
    if (!tmJsonMode) {
      // User was in raw mode — re-parse from textarea
      try { tmParsedJson = JSON.parse(Q('#tmArea').value); } catch (e) { /* keep old */ }
    }
    val = JSON.stringify(tmParsedJson);
  } else {
    val = Q('#tmArea').value;
    if (key === 'audienceString') {
      try { val = JSON.stringify(JSON.parse(val)); } catch (e) { /* keep as-is */ }
    }
  }
  setCellValue(type, idx, key, val);
  runValidation(type);
  Q('#textModal').classList.remove('open');
  renderPreflight();
  renderTable();
  renderInspector();
  updateBar();
  updateTabBadges();
  toast('Text updated', 'ok');
});
Q('#textModal').addEventListener('click', e => { if (e.target.id === 'textModal') e.target.classList.remove('open'); });

