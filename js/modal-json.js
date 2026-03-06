/* ===== TEXT EXPAND MODAL ===== */
let tmState = {};
/* ===== JSON PRETTY VIEWER ===== */
const FACET_LABELS = {
  'urn:li:adTargetingFacet:ageRanges': 'Age Ranges',
  'urn:li:adTargetingFacet:audienceMatchingSegments': 'Matched Audiences',
  'urn:li:adTargetingFacet:companyCategory': 'Company Category',
  'urn:li:adTargetingFacet:companyConnections': 'Company Connections',
  'urn:li:adTargetingFacet:companyFollowersOf': 'Company Followers',
  'urn:li:adTargetingFacet:companyGrowthRate': 'Company Growth Rate',
  'urn:li:adTargetingFacet:companyRevenueRanges': 'Company Revenue',
  'urn:li:adTargetingFacet:degrees': 'Degrees',
  'urn:li:adTargetingFacet:dynamicSegments': 'Dynamic Segments',
  'urn:li:adTargetingFacet:employers': 'Current Employers',
  'urn:li:adTargetingFacet:employersAll': 'Employers (Current + Past)',
  'urn:li:adTargetingFacet:employersPast': 'Past Employers',
  'urn:li:adTargetingFacet:fieldsOfStudy': 'Fields of Study',
  'urn:li:adTargetingFacet:firstDegreeConnections': '1st Degree Connections',
  'urn:li:adTargetingFacet:firstNames': 'First Names',
  'urn:li:adTargetingFacet:followedCompanies': 'Followed Companies',
  'urn:li:adTargetingFacet:genders': 'Genders',
  'urn:li:adTargetingFacet:industries': 'Industries',
  'urn:li:adTargetingFacet:interests': 'Interests',
  'urn:li:adTargetingFacet:interfaceLocales': 'Interface Locales',
  'urn:li:adTargetingFacet:jobFunctions': 'Job Functions',
  'urn:li:adTargetingFacet:locations': 'Locations',
  'urn:li:adTargetingFacet:memberBehaviors': 'Member Behaviors',
  'urn:li:adTargetingFacet:memberGroups': 'Member Groups',
  'urn:li:adTargetingFacet:productInterests': 'Product Interests',
  'urn:li:adTargetingFacet:profileLocations': 'Profile Locations',
  'urn:li:adTargetingFacet:schools': 'Schools',
  'urn:li:adTargetingFacet:seniorities': 'Seniorities',
  'urn:li:adTargetingFacet:skills': 'Skills',
  'urn:li:adTargetingFacet:staffCountRanges': 'Company Size',
  'urn:li:adTargetingFacet:titles': 'Current Job Titles',
  'urn:li:adTargetingFacet:titlesAll': 'Titles (Current + Past)',
  'urn:li:adTargetingFacet:titlesPast': 'Past Job Titles',
  'urn:li:adTargetingFacet:yearsOfExperience': 'Years of Experience',
  'urn:li:adTargetingFacet:yearsOfExperienceRanges': 'Years of Experience',
};

const FACET_VALUE_LABELS = {
  'urn:li:adTargetingFacet:genders': {
    'urn:li:gender:FEMALE': 'Female',
    'urn:li:gender:MALE': 'Male',
  },
  'urn:li:adTargetingFacet:ageRanges': {
    'urn:li:ageRange:(18,24)': '18-24',
    'urn:li:ageRange:(25,34)': '25-34',
    'urn:li:ageRange:(35,54)': '35-54',
    'urn:li:ageRange:(55,100)': '55+',
  },
  'urn:li:adTargetingFacet:staffCountRanges': {
    'urn:li:staffCountRange:(1,10)': '1-10',
    'urn:li:staffCountRange:(11,50)': '11-50',
    'urn:li:staffCountRange:(51,200)': '51-200',
    'urn:li:staffCountRange:(201,500)': '201-500',
    'urn:li:staffCountRange:(501,1000)': '501-1000',
    'urn:li:staffCountRange:(1001,5000)': '1001-5000',
    'urn:li:staffCountRange:(5001,10000)': '5001-10000',
    'urn:li:staffCountRange:(10001,100000)': '10001+',
  },
};

const inspectorJsonTreeState = new Map();
let tmViewMode = 'raw';
let tmJsonMode = false;
let tmParsedJson = null;

function getTmFieldLimit(type, idx, key) {
  const row = S[type]?.cur?.[idx];
  if (!type || row === undefined || !key) return null;
  if (typeof getFieldLengthLimit === 'function') {
    const n = Number(getFieldLengthLimit(type, S[type], row, key));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const fallback = Number(FIELD_LENGTH_LIMITS?.[key]);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function refreshTmCounter() {
  const counter = Q('#tmCharCount');
  const area = Q('#tmArea');
  if (!counter || !area) return;
  const limit = Number(tmState.limit || 0);
  const rawVisible = area.style.display !== 'none';
  if (!limit || !rawVisible) {
    counter.style.display = 'none';
    counter.classList.remove('over');
    area.classList.remove('over-limit');
    return;
  }
  const len = String(area.value || '').length;
  counter.style.display = '';
  counter.textContent = `${len}/${limit}`;
  counter.classList.toggle('over', len > limit);
  area.classList.toggle('over-limit', len > limit);
}

function collectCollapsedNodePaths(container) {
  const collapsed = new Set();
  if (!container) return collapsed;
  container.querySelectorAll('.jt-node.jt-collapsed[data-jnode]').forEach(node => {
    collapsed.add(node.dataset.jnode);
  });
  return collapsed;
}

function getInspectorTreeKey(type, rowIdx, fieldKey) {
  return `${type}:${rowIdx}:${fieldKey}`;
}

function getInspectorTreeCollapsedState(key) {
  return inspectorJsonTreeState.get(key) || null;
}

function saveInspectorTreeCollapsedState(key, container) {
  const collapsed = collectCollapsedNodePaths(container);
  if (collapsed.size) inspectorJsonTreeState.set(key, collapsed);
  else inspectorJsonTreeState.delete(key);
}

function buildJsonTree(val, depth = 0, compact = false, path = [], collapsedPaths = null) {
  const jp = btoa(JSON.stringify(path));
  if (val === null) return `<span class="jt-null jt-editable" data-jpath="${jp}" title="Click to edit">null</span>`;
  if (typeof val === 'boolean') return `<span class="jt-bool jt-editable" data-jpath="${jp}" title="Click to edit">${val}</span>`;
  if (typeof val === 'number') return `<span class="jt-num jt-editable" data-jpath="${jp}" title="Click to edit">${val}</span>`;
  if (typeof val === 'string') return `<span class="jt-str jt-editable" data-jpath="${jp}" title="Click to edit">&quot;${esc(val)}&quot;</span>`;

  const collapseDepth = compact ? 2 : 3;
  if (Array.isArray(val)) {
    const addPath = btoa(JSON.stringify(path));
    const addBtn = `<div class="jt-line"><span class="jt-add" data-jadd="${addPath}">+ Add item</span></div>`;
    const shouldCollapse = collapsedPaths ? collapsedPaths.has(jp) : depth >= collapseDepth;
    if (val.length === 0) {
      return `<span class="jt-node${shouldCollapse ? ' jt-collapsed' : ''}" data-jnode="${jp}"><span class="jt-brace">[</span><div class="jt-children jt-section">${addBtn}</div><span class="jt-brace">]</span></span>`;
    }
    const items = val.map((v, i) => {
      const delPath = btoa(JSON.stringify([...path, i]));
      return `<div class="jt-line"><span class="jt-del" data-jdel="${delPath}" title="Remove">&times;</span>${buildJsonTree(v, depth + 1, compact, [...path, i], collapsedPaths)},</div>`;
    }).join('');
    const countBadge = `<span class="jt-count">${val.length}</span>`;
    const preview = `<span class="jt-preview">[${val.length} items]</span>`;
    return `<span class="jt-node${shouldCollapse ? ' jt-collapsed' : ''}" data-jnode="${jp}"><span class="jt-toggle" onclick="this.parentElement.classList.toggle('jt-collapsed')">▼</span><span class="jt-brace">[</span>${countBadge}${preview}<div class="jt-children jt-section">${items}${addBtn}</div><span class="jt-brace">]</span></span>`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="jt-brace">{}</span>';
    const items = keys.map(k => {
      const facet = FACET_LABELS[k];
      const label = facet ? `<span class="jt-facet-label">${esc(facet)}</span>` : '';
      const child = val[k];
      const countHint = (Array.isArray(child) && child.length > 0) ? `<span class="jt-count">${child.length}</span>` : '';
      return `<div class="jt-line"><span class="jt-key">\"${esc(k)}\"</span>${label}${countHint}: ${buildJsonTree(child, depth + 1, compact, [...path, k], collapsedPaths)},</div>`;
    }).join('');
    const preview = `<span class="jt-preview">{${keys.length} keys}</span>`;
    const shouldCollapse = collapsedPaths ? collapsedPaths.has(jp) : depth >= collapseDepth;
    return `<span class="jt-node${shouldCollapse ? ' jt-collapsed' : ''}" data-jnode="${jp}"><span class="jt-toggle" onclick="this.parentElement.classList.toggle('jt-collapsed')">▼</span><span class="jt-brace">{</span>${preview}<div class="jt-children jt-section">${items}</div><span class="jt-brace">}</span></span>`;
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

function removeByPath(obj, path) {
  if (!path.length) return;
  const parent = getByPath(obj, path.slice(0, -1));
  const leaf = path[path.length - 1];
  if (Array.isArray(parent) && typeof leaf === 'number') parent.splice(leaf, 1);
  else if (parent && typeof parent === 'object') delete parent[leaf];
}

function decodePath(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    return null;
  }
}

function isFacetKey(key) {
  return typeof key === 'string' && key.startsWith('urn:li:adTargetingFacet:');
}

function humanizeKey(k) {
  return String(k || '')
    .replace(/^urn:li:adTargetingFacet:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function facetLabel(key) {
  return FACET_LABELS[key] || humanizeKey(key);
}

function isPlainObject(val) {
  return !!val && typeof val === 'object' && !Array.isArray(val);
}

function copyExtraKeys(obj, skip) {
  const extra = {};
  if (!isPlainObject(obj)) return extra;
  Object.entries(obj).forEach(([key, value]) => {
    if (skip.includes(key) || isFacetKey(key)) return;
    extra[key] = value;
  });
  return extra;
}

function normalizeFacetMap(obj) {
  const out = {};
  if (!isPlainObject(obj)) return out;
  Object.entries(obj).forEach(([key, value]) => {
    if (!isFacetKey(key)) return;
    out[key] = Array.isArray(value) ? value.slice() : [];
  });
  return out;
}

function mergeFacetMap(target, source) {
  Object.entries(source || {}).forEach(([key, values]) => {
    if (!Array.isArray(target[key])) target[key] = [];
    (Array.isArray(values) ? values : []).forEach(value => {
      if (!target[key].includes(value)) target[key].push(value);
    });
  });
}

function normalizeGroupObject(rawGroup, fallbackOp = 'or') {
  if (!isPlainObject(rawGroup)) return { [fallbackOp]: {} };

  if (isPlainObject(rawGroup.or)) return { or: normalizeFacetMap(rawGroup.or) };
  if (isPlainObject(rawGroup.and)) return { or: normalizeFacetMap(rawGroup.and) };

  const facets = normalizeFacetMap(rawGroup);
  return { [fallbackOp]: facets };
}

function normalizeIncludeGroups(includeObj) {
  if (!isPlainObject(includeObj)) return [{ or: {} }];

  const groups = [];
  if (Array.isArray(includeObj.and)) {
    includeObj.and.forEach(group => groups.push(normalizeGroupObject(group, 'or')));
  } else if (isPlainObject(includeObj.or)) {
    groups.push({ or: normalizeFacetMap(includeObj.or) });
  } else {
    const facets = normalizeFacetMap(includeObj);
    if (Object.keys(facets).length) groups.push({ or: facets });
  }

  return groups.length ? groups : [{ or: {} }];
}

function normalizeExcludeFacets(excludeObj) {
  if (!isPlainObject(excludeObj)) return {};

  if (isPlainObject(excludeObj.or)) return normalizeFacetMap(excludeObj.or);

  if (Array.isArray(excludeObj.and)) {
    const merged = {};
    excludeObj.and.forEach(group => {
      const normalized = normalizeGroupObject(group, 'or');
      const op = Object.keys(normalized).find(key => key === 'and' || key === 'or') || 'or';
      mergeFacetMap(merged, normalized[op]);
    });
    return merged;
  }

  return normalizeFacetMap(excludeObj);
}

function ensureAudienceBuilderStructure(root) {
  if (!isPlainObject(root)) return;

  const includeExtra = copyExtraKeys(root.include, ['and', 'or']);
  root.include = {
    and: normalizeIncludeGroups(root.include),
    ...includeExtra,
  };

  const excludeExtra = copyExtraKeys(root.exclude, ['and', 'or']);
  root.exclude = {
    or: normalizeExcludeFacets(root.exclude),
    ...excludeExtra,
  };
}

function splitUrnValue(raw) {
  const m = String(raw || '').match(/^(urn:li:[^:]+:)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], body: m[2] };
}

function compactValueForEdit(raw) {
  const urn = splitUrnValue(raw);
  if (!urn) return String(raw || '');
  return urn.body;
}

function normalizeValueForStorage(inputValue, prefix = '') {
  const raw = String(inputValue || '').trim();
  if (!raw) return '';
  if (/^urn:li:/.test(raw)) return raw;
  return prefix ? `${prefix}${raw}` : raw;
}

function inferFacetPrefix(values) {
  for (const value of values || []) {
    const urn = splitUrnValue(value);
    if (urn && urn.prefix) return urn.prefix;
  }
  return '';
}

function formatUrnValue(raw) {
  const urn = splitUrnValue(raw);
  if (!urn) return '';
  const m = urn.prefix.match(/^urn:li:([^:]+):$/);
  const kindRaw = m?.[1] || 'value';
  const kind = kindRaw.replace(/([a-z])([A-Z])/g, '$1 $2');
  const id = urn.body;
  return `${kind}: ${id}`;
}

function valueHelp(facetKey, value) {
  const exact = FACET_VALUE_LABELS[facetKey]?.[value];
  if (exact) return exact;
  return formatUrnValue(value);
}

function getFacetPresetValues(facetKey) {
  const labels = FACET_VALUE_LABELS[facetKey];
  if (!labels) return [];
  return Object.keys(labels);
}

function startInlineEdit(el, parsedRoot, onCommit) {
  if (el.querySelector('.jt-edit-input')) return;
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
    if (isString) newVal = raw;
    else {
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

function attachJsonTreeHandlers(container, parsedRoot, onUpdate) {
  container.querySelectorAll('.jt-editable').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      startInlineEdit(el, parsedRoot, onUpdate);
    });
  });

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

  container.querySelectorAll('.jt-add').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const path = JSON.parse(atob(el.dataset.jadd));
      const arr = getByPath(parsedRoot, path);
      const sample = arr.length > 0 ? arr[0] : '';
      const newVal = typeof sample === 'string' ? '' : (typeof sample === 'number' ? 0 : '');
      arr.push(newVal);
      onUpdate(parsedRoot);
    });
  });
}

function renderModalTree(collapsedPaths = null) {
  const tree = Q('#tmJsonView');
  const preservedCollapsed = collapsedPaths || collectCollapsedNodePaths(tree);
  tree.innerHTML = buildJsonTree(tmParsedJson, 0, false, [], preservedCollapsed.size ? preservedCollapsed : null);
  Q('#tmArea').value = JSON.stringify(tmParsedJson);
  attachJsonTreeHandlers(tree, tmParsedJson, (updated) => {
    const collapsedBeforeRender = collectCollapsedNodePaths(tree);
    tmParsedJson = updated;
    renderModalTree(collapsedBeforeRender);
  });
}

function syncRawFromParsed(pretty = false) {
  if (!tmParsedJson) return;
  Q('#tmArea').value = pretty ? JSON.stringify(tmParsedJson, null, 2) : JSON.stringify(tmParsedJson);
}

function parseRawToParsed() {
  try {
    tmParsedJson = JSON.parse(Q('#tmArea').value || '{}');
    return true;
  } catch (e) {
    toast('Raw JSON is invalid. Fix syntax first.', 'err');
    return false;
  }
}

function renderAudienceBuilder() {
  const wrap = Q('#tmBuilderView');
  if (!wrap || !tmParsedJson || typeof tmParsedJson !== 'object') return;

  ensureAudienceBuilderStructure(tmParsedJson);

  const facetOptions = Object.keys(FACET_LABELS).sort((a, b) => facetLabel(a).localeCompare(facetLabel(b)));
  const facetOptionsHtml = facetOptions.map(key => `<option value="${esc(key)}">${esc(facetLabel(key))}</option>`).join('');
  const includeGroups = Array.isArray(tmParsedJson.include?.and) ? tmParsedJson.include.and : [];
  const excludeGroup = isPlainObject(tmParsedJson.exclude?.or) ? tmParsedJson.exclude.or : {};

  const renderFacetCards = (facetObj, basePath) => {
    const entries = Object.entries(facetObj || {})
      .filter(([key, value]) => isFacetKey(key) && Array.isArray(value));

    if (!entries.length) return '<div class="aud-empty">No filters yet in this group.</div>';

    return entries.map(([facetKey, values]) => {
      const pathEnc = btoa(JSON.stringify([...basePath, facetKey]));
      const presetValues = getFacetPresetValues(facetKey);
      const hasPresets = presetValues.length > 0;
      const fallbackPrefix = inferFacetPrefix(values);

      const valueRows = values.map((value, idx) => {
        const help = valueHelp(facetKey, value);
        const inputAttrs = `data-aud-value-path="${pathEnc}" data-aud-value-index="${idx}"`;

        let control = '';
        if (hasPresets) {
          const options = presetValues.map(preset => {
            const label = valueHelp(facetKey, preset) || compactValueForEdit(preset) || preset;
            return `<option value="${esc(preset)}"${preset === value ? ' selected' : ''}>${esc(label)}</option>`;
          }).join('');
          const custom = presetValues.includes(value)
            ? ''
            : `<option value="${esc(value)}" selected>${esc(`Custom: ${valueHelp(facetKey, value) || compactValueForEdit(value) || value || '(empty)'}`)}</option>`;
          control = `<select class="aud-select" ${inputAttrs}>${options}${custom}</select>`;
        } else {
          const prefix = splitUrnValue(value)?.prefix || fallbackPrefix;
          control = `<input class="aud-input" ${inputAttrs} data-aud-prefix="${esc(prefix || '')}" value="${esc(compactValueForEdit(value))}" placeholder="${prefix ? 'Value id or full URN' : 'Value'}">`;
        }

        return `<div class="aud-row"><div class="aud-row-main">${control}<div class="aud-value-help">${esc(help || '')}</div></div><button class="aud-btn aud-btn-danger" data-aud-remove-value="${pathEnc}" data-aud-remove-index="${idx}">Remove</button></div>`;
      }).join('');

      return `<div class="aud-card"><div class="aud-card-head"><div class="aud-head-main"><div class="aud-facet-label" title="${esc(facetKey)}">${esc(facetLabel(facetKey))}</div><div class="aud-value-help">${values.length} value${values.length === 1 ? '' : 's'}</div></div><button class="aud-btn aud-btn-danger" data-aud-remove-facet="${pathEnc}">Remove filter</button></div><div class="aud-values">${valueRows || '<div class="aud-empty">No values yet.</div>'}</div><div class="aud-actions"><button class="aud-btn" data-aud-add-value="${pathEnc}">+ Add value</button></div></div>`;
    }).join('');
  };

  const renderGroup = (section, groupIndex, groupObj) => {
    const isInclude = section === 'include';
    const op = 'or';
    const basePath = isInclude ? ['include', 'and', groupIndex, op] : ['exclude', 'or'];
    const facetContainer = getByPath(tmParsedJson, basePath) || {};
    const facetParentEnc = btoa(JSON.stringify(basePath));

    const title = isInclude ? `Group ${groupIndex + 1}` : 'Exclusion Rules';
    const subtitle = isInclude
      ? 'Any filter in this group may match (OR)'
      : 'Any matching filter will exclude a member (OR)';

    const opControl = '<div class="aud-logic-pill">OR</div>';

    const removeGroupBtn = isInclude
      ? `<button class="aud-btn aud-btn-danger" data-aud-remove-group="${groupIndex}">Delete group</button>`
      : '';

    return `
<article class="aud-group">
  <div class="aud-group-head">
    <div class="aud-head-main">
      <div class="aud-group-title">${title}</div>
      <div class="aud-group-subtitle">${subtitle}</div>
    </div>
    <div class="aud-group-controls">${opControl}${removeGroupBtn}</div>
  </div>
  <div class="aud-facets">${renderFacetCards(facetContainer, basePath)}</div>
  <div class="aud-group-add" data-aud-facet-parent="${facetParentEnc}">
    <select class="aud-select aud-group-add-select">${facetOptionsHtml}<option value="__custom__">Custom facet key…</option></select>
    <input class="aud-input aud-group-add-custom" placeholder="urn:li:adTargetingFacet:..." style="display:none;">
    <button class="aud-btn aud-group-add-btn">Add filter</button>
  </div>
</article>
`;
  };

  const includeGroupsHtml = includeGroups
    .map((group, i) => {
      const connector = i > 0 ? '<div class="aud-join">AND</div>' : '';
      return `${connector}${renderGroup('include', i, group)}`;
    })
    .join('');

  wrap.innerHTML = `
<div class="aud-top">
  <div class="aud-top-title">Audience Logic Builder</div>
  <div class="aud-top-copy">Build audience with explicit groups: <strong>Include</strong> groups combine with <strong>AND</strong>; filters inside each group are <strong>OR</strong>. <strong>Exclude</strong> filters are also <strong>OR</strong>.</div>
</div>
<section class="aud-section">
  <div class="aud-section-head">
    <div>
      <div class="aud-section-title">Include</div>
      <div class="aud-section-copy">Person must match all include groups.</div>
    </div>
    <button class="aud-btn" id="audAddIncludeGroup">+ Add group</button>
  </div>
  <div class="aud-groups">${includeGroupsHtml}</div>
</section>
<section class="aud-section aud-section-exclude">
  <div class="aud-section-head">
    <div>
      <div class="aud-section-title">Exclude</div>
      <div class="aud-section-copy">Any matching exclude filter removes a person from the audience.</div>
    </div>
  </div>
  <div class="aud-groups">${renderGroup('exclude', 0, { or: excludeGroup })}</div>
</section>
`;

  const addIncludeGroupBtn = wrap.querySelector('#audAddIncludeGroup');
  if (addIncludeGroupBtn) {
    addIncludeGroupBtn.addEventListener('click', () => {
      const groups = tmParsedJson.include.and;
      if (!Array.isArray(groups)) return;
      groups.push({ or: {} });
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  }

  wrap.querySelectorAll('[data-aud-remove-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.audRemoveGroup);
      if (Number.isNaN(idx)) return;
      const groups = tmParsedJson.include.and;
      if (!Array.isArray(groups)) return;
      if (groups.length <= 1) {
        toast('At least one include group is required', 'inf');
        return;
      }
      groups.splice(idx, 1);
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  });

  wrap.querySelectorAll('.aud-group-add').forEach(row => {
    const parentPath = decodePath(row.dataset.audFacetParent);
    const select = row.querySelector('.aud-group-add-select');
    const customInput = row.querySelector('.aud-group-add-custom');
    const addBtn = row.querySelector('.aud-group-add-btn');
    if (!parentPath || !select || !customInput || !addBtn) return;

    const toggleCustom = () => {
      customInput.style.display = select.value === '__custom__' ? '' : 'none';
      if (select.value === '__custom__') customInput.focus();
    };
    select.addEventListener('change', toggleCustom);

    addBtn.addEventListener('click', () => {
      let facetKey = select.value;
      if (facetKey === '__custom__') facetKey = String(customInput.value || '').trim();
      if (!facetKey) {
        toast('Provide a facet key first', 'inf');
        return;
      }
      if (!isFacetKey(facetKey)) {
        toast('Facet key must start with urn:li:adTargetingFacet:', 'err');
        return;
      }

      const target = getByPath(tmParsedJson, parentPath);
      if (!isPlainObject(target)) return;

      if (!Array.isArray(target[facetKey])) target[facetKey] = [];
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  });

  wrap.querySelectorAll('[data-aud-remove-facet]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = decodePath(btn.dataset.audRemoveFacet);
      if (!path) return;
      removeByPath(tmParsedJson, path);
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  });

  wrap.querySelectorAll('[data-aud-add-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = decodePath(btn.dataset.audAddValue);
      if (!path) return;
      const arr = getByPath(tmParsedJson, path);
      if (!Array.isArray(arr)) return;
      const facetKey = path[path.length - 1];
      const presetValues = getFacetPresetValues(facetKey);
      arr.push(presetValues.length ? presetValues[0] : '');
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  });

  wrap.querySelectorAll('[data-aud-remove-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = decodePath(btn.dataset.audRemoveValue);
      const idx = Number(btn.dataset.audRemoveIndex);
      if (!path || Number.isNaN(idx)) return;
      const arr = getByPath(tmParsedJson, path);
      if (!Array.isArray(arr)) return;
      arr.splice(idx, 1);
      syncRawFromParsed();
      renderAudienceBuilder();
    });
  });

  wrap.querySelectorAll('[data-aud-value-path]').forEach(input => {
    const update = () => {
      const path = decodePath(input.dataset.audValuePath);
      const idx = Number(input.dataset.audValueIndex);
      if (!path || Number.isNaN(idx)) return;
      const arr = getByPath(tmParsedJson, path);
      if (!Array.isArray(arr)) return;

      const facetKey = path[path.length - 1];
      const presetValues = getFacetPresetValues(facetKey);
      if (presetValues.length || input.tagName === 'SELECT') {
        arr[idx] = input.value;
      } else {
        const currentPrefix = splitUrnValue(arr[idx])?.prefix;
        const fallbackPrefix = input.dataset.audPrefix || currentPrefix || inferFacetPrefix(arr);
        arr[idx] = normalizeValueForStorage(input.value, fallbackPrefix);
        const nextPrefix = splitUrnValue(arr[idx])?.prefix || fallbackPrefix || '';
        input.dataset.audPrefix = nextPrefix;
        input.value = compactValueForEdit(arr[idx]);
      }
      const hint = input.parentElement.querySelector('.aud-value-help');
      if (hint) hint.textContent = valueHelp(facetKey, arr[idx]);
      syncRawFromParsed();
    };
    input.addEventListener('change', update);
    input.addEventListener('blur', update);
  });
}

function setTmView(mode) {
  tmViewMode = mode;
  tmJsonMode = mode !== 'raw';

  const isPretty = mode === 'pretty';
  const isBuilder = mode === 'builder';
  const isRaw = mode === 'raw';

  Q('#tmJsonView').style.display = isPretty ? '' : 'none';
  Q('#tmBuilderView').style.display = isBuilder ? '' : 'none';
  Q('#tmArea').style.display = isRaw ? '' : 'none';

  Q('#tmTreeToolbar').style.display = isPretty ? '' : 'none';

  Q('#tmBtnPretty').classList.toggle('active', isPretty);
  Q('#tmBtnBuilder').classList.toggle('active', isBuilder);
  Q('#tmBtnRaw').classList.toggle('active', isRaw);

  if (isPretty && tmParsedJson) renderModalTree();
  if (isBuilder && tmParsedJson) renderAudienceBuilder();
  if (isRaw && tmParsedJson) syncRawFromParsed(true);
  refreshTmCounter();
}

function openTextModal(type, idx, key, header) {
  const limit = getTmFieldLimit(type, idx, key);
  tmState = { type, idx, key, limit };
  Q('#tmTitle').textContent = `Edit: ${header}`;
  const rawVal = S[type].cur[idx][key] || '';
  Q('#tmArea').value = rawVal;
  tmParsedJson = null;

  const isAudienceField = key === 'audienceString';
  Q('#tmBtnBuilder').style.display = isAudienceField ? '' : 'none';

  let isJson = false;
  if (isAudienceField && rawVal.trim().startsWith('{')) {
    try {
      tmParsedJson = JSON.parse(rawVal);
      isJson = true;
      Q('#tmToggle').style.display = '';
      setTmView('builder');
    } catch (e) {
      // invalid JSON fallback to raw editor
    }
  }

  if (!isJson) {
    Q('#tmToggle').style.display = 'none';
    setTmView('raw');
  }

  Q('#textModal').querySelector('.text-modal').classList.toggle('json-wide', isJson);
  Q('#textModal').classList.add('open');
  refreshTmCounter();
  if (!isJson) Q('#tmArea').focus();
}

Q('#tmBtnPretty').addEventListener('click', () => {
  if (tmViewMode === 'raw' && !parseRawToParsed()) return;
  if (tmParsedJson) setTmView('pretty');
});

Q('#tmBtnBuilder').addEventListener('click', () => {
  if (tmViewMode === 'raw' && !parseRawToParsed()) return;
  if (tmParsedJson) setTmView('builder');
});

Q('#tmBtnRaw').addEventListener('click', () => {
  if (tmParsedJson) syncRawFromParsed(true);
  setTmView('raw');
  Q('#tmArea').focus();
});

Q('#tmArea').addEventListener('input', refreshTmCounter);
Q('#tmArea').addEventListener('change', refreshTmCounter);

Q('#tmCancel').addEventListener('click', () => Q('#textModal').classList.remove('open'));

Q('#tmSave').addEventListener('click', () => {
  const { type, idx, key } = tmState;
  let val;

  if (tmParsedJson && key === 'audienceString') {
    if (tmViewMode === 'raw') {
      if (!parseRawToParsed()) return;
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

Q('#textModal').addEventListener('click', e => {
  if (e.target.id === 'textModal') e.target.classList.remove('open');
});
