/* ===== UTILS ===== */
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toast(msg, cls = 'inf') {
  const t = Q('#toast'); t.textContent = msg; t.className = `toast ${cls} vis`;
  setTimeout(() => t.classList.remove('vis'), 3000);
}

function usDateToIsoDateInput(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yy = Number(m[3]);
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return '';
  return `${String(yy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function isoDateInputToUs(v) {
  const m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return '';
  return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}/${String(yy).padStart(4, '0')}`;
}

function openDateInputPicker(inputEl) {
  if (!inputEl) return;
  if (typeof inputEl.showPicker === 'function') {
    try {
      inputEl.showPicker();
      return;
    } catch (_) {
      // Fallback to focus/click for browsers that block showPicker.
    }
  }
  inputEl.focus();
  if (typeof inputEl.click === 'function') inputEl.click();
}

const AUDIENCE_FACET_KEY_ALIASES = Object.freeze({
  'urn:li:adTargetingFacet:companyRevenueRanges': 'urn:li:adTargetingFacet:revenue',
});

const AUDIENCE_FACET_PREFIX_HINTS = Object.freeze({
  'urn:li:adTargetingFacet:ageRanges': 'urn:li:ageRange:',
  'urn:li:adTargetingFacet:audienceMatchingSegments': 'urn:li:adSegment:',
  'urn:li:adTargetingFacet:companyConnections': 'urn:li:company:',
  'urn:li:adTargetingFacet:companyRevenueRanges': 'urn:li:revenue:',
  'urn:li:adTargetingFacet:dynamicSegments': 'urn:li:adSegment:',
  'urn:li:adTargetingFacet:employers': 'urn:li:company:',
  'urn:li:adTargetingFacet:employersAll': 'urn:li:company:',
  'urn:li:adTargetingFacet:employersPast': 'urn:li:company:',
  'urn:li:adTargetingFacet:followedCompanies': 'urn:li:company:',
  'urn:li:adTargetingFacet:genders': 'urn:li:gender:',
  'urn:li:adTargetingFacet:industries': 'urn:li:industry:',
  'urn:li:adTargetingFacet:interests': 'urn:li:interest:',
  'urn:li:adTargetingFacet:interfaceLocales': 'urn:li:locale:',
  'urn:li:adTargetingFacet:jobFunctions': 'urn:li:function:',
  'urn:li:adTargetingFacet:locations': 'urn:li:geo:',
  'urn:li:adTargetingFacet:profileLocations': 'urn:li:geo:',
  'urn:li:adTargetingFacet:revenue': 'urn:li:revenue:',
  'urn:li:adTargetingFacet:schools': 'urn:li:school:',
  'urn:li:adTargetingFacet:seniorities': 'urn:li:seniority:',
  'urn:li:adTargetingFacet:skills': 'urn:li:skill:',
  'urn:li:adTargetingFacet:staffCountRanges': 'urn:li:staffCountRange:',
  'urn:li:adTargetingFacet:titles': 'urn:li:title:',
  'urn:li:adTargetingFacet:titlesAll': 'urn:li:title:',
  'urn:li:adTargetingFacet:titlesPast': 'urn:li:title:',
  'urn:li:adTargetingFacet:contextualAdSizes': 'urn:li:adSlotSize:',
});

function isAudienceFacetKey(key) {
  return typeof key === 'string' && key.startsWith('urn:li:adTargetingFacet:');
}

function getCanonicalAudienceFacetKey(facetKey) {
  return AUDIENCE_FACET_KEY_ALIASES[facetKey] || facetKey;
}

function getAudienceFacetDefaultPrefix(facetKey) {
  return AUDIENCE_FACET_PREFIX_HINTS[getCanonicalAudienceFacetKey(facetKey)] || '';
}

function audienceSplitUrn(value) {
  const m = String(value || '').match(/^(urn:li:[^:]+:)(.*)$/i);
  if (!m) return null;
  return { prefix: m[1], body: m[2] };
}

function audienceInferPrefixFromValues(values) {
  for (const value of values || []) {
    const urn = audienceSplitUrn(value);
    if (urn?.prefix) return urn.prefix;
  }
  return '';
}

function audienceResolveLabelToUrn(facetKey, rawValue) {
  if (typeof FACET_VALUE_LABELS === 'undefined') return '';
  const map = FACET_VALUE_LABELS?.[facetKey];
  if (!map || typeof map !== 'object') return '';
  const low = String(rawValue || '').trim().toLowerCase();
  if (!low) return '';
  for (const [urn, label] of Object.entries(map)) {
    if (String(label || '').toLowerCase() === low) return urn;
    const split = audienceSplitUrn(urn);
    if (split?.body?.toLowerCase() === low) return urn;
  }
  return '';
}

function audienceNormalizeFacetValue(facetKey, rawValue, fallbackPrefix = '') {
  const original = String(rawValue ?? '');
  const trimmed = original.trim();
  if (!trimmed) return { value: '', changed: trimmed !== original };
  if (/^urn:li:/i.test(trimmed)) return { value: trimmed, changed: trimmed !== original };

  const fromLabel = audienceResolveLabelToUrn(facetKey, trimmed);
  if (fromLabel) return { value: fromLabel, changed: fromLabel !== original };

  const prefix = fallbackPrefix || getAudienceFacetDefaultPrefix(facetKey);
  if (!prefix) return { value: trimmed, changed: trimmed !== original };

  const normalized = `${prefix}${trimmed}`;
  return { value: normalized, changed: normalized !== original };
}

function collectAudienceFacetPrefixes(node, out = new Map()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach(child => collectAudienceFacetPrefixes(child, out));
    return out;
  }

  Object.entries(node).forEach(([key, value]) => {
    if (isAudienceFacetKey(key) && Array.isArray(value)) {
      const facetKey = getCanonicalAudienceFacetKey(key);
      const prefix = audienceInferPrefixFromValues(value) || getAudienceFacetDefaultPrefix(facetKey);
      if (prefix && !out.has(facetKey)) out.set(facetKey, prefix);
      value.forEach(v => {
        const urn = audienceSplitUrn(v);
        if (urn?.prefix && !out.has(facetKey)) out.set(facetKey, urn.prefix);
      });
    }
    collectAudienceFacetPrefixes(value, out);
  });

  return out;
}

function normalizeAudienceFacetArray(facetKey, arr, prefixMap, issues, path) {
  if (!Array.isArray(arr)) return arr;
  let fallbackPrefix = prefixMap.get(facetKey) || audienceInferPrefixFromValues(arr) || getAudienceFacetDefaultPrefix(facetKey);
  if (fallbackPrefix && !prefixMap.has(facetKey)) prefixMap.set(facetKey, fallbackPrefix);

  const normalized = [];
  const seen = new Set();
  arr.forEach((item, idx) => {
    const result = audienceNormalizeFacetValue(facetKey, item, fallbackPrefix);
    const value = result.value;
    if (!value) return;

    const urn = audienceSplitUrn(value);
    if (urn?.prefix) {
      fallbackPrefix = urn.prefix;
      if (!prefixMap.has(facetKey)) prefixMap.set(facetKey, urn.prefix);
    } else {
      issues.unresolved.push({
        facet: facetKey,
        path: `${path.join('.')}[${idx}]`,
        value,
      });
    }

    const expectedPrefix = getAudienceFacetDefaultPrefix(facetKey);
    if (expectedPrefix && /^urn:li:/i.test(value) && !value.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
      issues.prefixMismatch.push({
        facet: facetKey,
        path: `${path.join('.')}[${idx}]`,
        value,
        expectedPrefix,
      });
    }

    if (!seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  });

  return normalized;
}

function normalizeAudienceObjectInPlace(node, prefixMap, issues, path = []) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child, idx) => normalizeAudienceObjectInPlace(child, prefixMap, issues, path.concat(idx)));
    return;
  }

  Object.entries(node).forEach(([key, value]) => {
    if (isAudienceFacetKey(key) && Array.isArray(value)) {
      const facetKey = getCanonicalAudienceFacetKey(key);
      const normalizedPath = path.concat(facetKey);
      const merged = facetKey !== key && Array.isArray(node[facetKey])
        ? node[facetKey].concat(value)
        : value;
      if (facetKey !== key) delete node[key];
      node[facetKey] = normalizeAudienceFacetArray(facetKey, merged, prefixMap, issues, normalizedPath);
      return;
    }
    const nextPath = path.concat(key);
    normalizeAudienceObjectInPlace(value, prefixMap, issues, nextPath);
  });
}

function normalizeAudienceString(rawValue, { strict = false } = {}) {
  const original = String(rawValue ?? '');
  const trimmed = original.trim();
  if (!trimmed) {
    return { ok: true, value: '', changed: trimmed !== original, errors: [], warnings: [], issues: { unresolved: [], prefixMismatch: [] } };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (_) {
    return {
      ok: false,
      value: trimmed,
      changed: trimmed !== original,
      errors: ['Audience String must be valid JSON'],
      warnings: [],
      issues: { unresolved: [], prefixMismatch: [] },
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      value: trimmed,
      changed: trimmed !== original,
      errors: ['Audience String root must be a JSON object'],
      warnings: [],
      issues: { unresolved: [], prefixMismatch: [] },
    };
  }

  const root = JSON.parse(JSON.stringify(parsed));
  const prefixMap = collectAudienceFacetPrefixes(root);
  const issues = { unresolved: [], prefixMismatch: [] };
  normalizeAudienceObjectInPlace(root, prefixMap, issues);

  const normalized = JSON.stringify(root);
  const changed = normalized !== trimmed || trimmed !== original;
  const errors = [];
  const warnings = [];

  if (issues.unresolved.length) {
    const sample = issues.unresolved
      .slice(0, 2)
      .map(x => `${x.facet}: ${x.value}`)
      .join('; ');
    const message = `Audience contains values without URN prefix (${sample})`;
    if (strict) errors.push(message);
    else warnings.push(message);
  }

  if (issues.prefixMismatch.length) {
    const sample = issues.prefixMismatch
      .slice(0, 2)
      .map(x => `${x.facet}: ${x.value}`)
      .join('; ');
    const message = `Audience contains unexpected URN type (${sample})`;
    if (strict) errors.push(message);
    else warnings.push(message);
  }

  return { ok: true, value: normalized, changed, errors, warnings, issues };
}
