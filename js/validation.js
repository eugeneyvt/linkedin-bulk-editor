function isRequiredCol(col) {
  return col.csv.startsWith('*') && !col.csv.startsWith('**');
}

function parseUsDate(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = +m[1], dd = +m[2], yy = +m[3];
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const AD_FORMAT_FIELD_LIMITS = {
  single_image: {
    adContentName: 255,
    introductory: 3000,
    headline: 200,
    description: 300,
    destinationUrl: 2000,
  },
  video: {
    adContentName: 255,
    introductory: 3000,
    headline: 200,
    destinationUrl: 2000,
  },
  carousel_image: {
    adContentName: 255,
    introductory: 255,
    destinationUrl: 2000,
  },
  document: {
    adContentName: 255,
    introductory: 3000,
    headline: 200,
  },
  event: {
    introductory: 3000,
  },
  single_job: {
    adContentName: 255,
    introductory: 3000,
  },
  article_newsletter: {
    introductory: 3000,
    headline: 200,
    destinationUrl: 2000,
  },
  text: {
    headline: 25,
    description: 75,
    destinationUrl: 500,
  },
  spotlight: {
    adContentName: 255,
    headline: 50,
    description: 70,
    destinationUrl: 500,
  },
  follower: {
    adContentName: 255,
    headline: 50,
    description: 70,
  },
  jobs: {
    adContentName: 255,
    headline: 70,
  },
  message: {
    adContentName: 255,
    destinationUrl: 2000,
  },
  conversation: {
    adContentName: 255,
    destinationUrl: 2000,
  },
};

function getAdFormatKey(v) {
  if (typeof normalizeAdFormatKey === 'function') return normalizeAdFormatKey(v);
  if (isTextAdFormat(v)) return 'text';
  if (isSingleImageAdFormat(v)) return 'single_image';
  return normalizeLabel(v || '');
}

function getTemplateAdFieldLimit(s, formatKey, fieldKey) {
  const templateKey = formatKey === 'single_image' ? 'singleImage' : formatKey;
  const raw = s?.templateMeta?.adFieldLimits?.[templateKey]?.[fieldKey];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getFieldLengthLimit(type, s, row, key) {
  if (type !== 'ads') return FIELD_LENGTH_LIMITS[key] || null;
  const formatKey = getAdFormatKey(row?.adFormat);
  if (formatKey) {
    const templateLimit = getTemplateAdFieldLimit(s, formatKey, key);
    if (templateLimit) return templateLimit;
    const formatRuleLimit = typeof getAdCreativeFieldLimit === 'function'
      ? getAdCreativeFieldLimit(row?.adFormat, key)
      : null;
    if (formatRuleLimit) return formatRuleLimit;
    const defaultLimit = AD_FORMAT_FIELD_LIMITS[formatKey]?.[key];
    if (defaultLimit) return defaultLimit;
  }
  return FIELD_LENGTH_LIMITS[key] || null;
}

function isValidHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function resolveAdSetCampaignName(campaignId) {
  const id = String(campaignId || '').trim();
  if (!id) return '';

  if (S.adsets?.loaded) {
    const hit = S.adsets.cur.find(r => String(r.campaignId || '').trim() === id && String(r.campaignName || '').trim());
    if (hit?.campaignName) return hit.campaignName;
  }
  if (S.campaigns?.loaded) {
    const hit = S.campaigns.cur.find(r => String(r.campaignId || '').trim() === id && String(r.campaignName || '').trim());
    if (hit?.campaignName) return hit.campaignName;
  }
  if (typeof resolveCampaignNameById === 'function') return resolveCampaignNameById(id);
  return '';
}

function sanitizeStateCellValue(value) {
  const raw = String(value ?? '');
  if (typeof sanitizeImportedCellValue === 'function') return sanitizeImportedCellValue(raw);
  return raw
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/^\uFFFD+/, '');
}

function setCellValue(t, i, k, value) {
  const s = S[t];
  const nextValue = sanitizeStateCellValue(value);
  s.cur[i][k] = nextValue;
  const hi = s.colToHeaderIndex[k];
  if (hi !== undefined && s.rawCur[i]) s.rawCur[i][hi] = nextValue;
  if (t === 'adsets' && k === 'campaignId') {
    const campaignName = resolveAdSetCampaignName(nextValue);
    s.cur[i].campaignName = campaignName;
    const nameIdx = s.colToHeaderIndex.campaignName;
    if (nameIdx !== undefined && s.rawCur[i]) s.rawCur[i][nameIdx] = campaignName;
  }
}

function isCellModified(t, i, k) {
  const s = S[t];
  if (!s || !s.orig[i] || !s.cur[i]) return false;
  return (s.orig[i][k] || '') !== (s.cur[i][k] || '');
}

function revertCellValue(t, i, k) {
  const s = S[t];
  if (!s || !s.orig[i] || !s.cur[i]) return false;
  if (!isCellModified(t, i, k)) return false;
  setCellValue(t, i, k, s.orig[i][k] || '');
  return true;
}

function revertRows(t, rowIndices) {
  const s = S[t];
  if (!s || !Array.isArray(rowIndices) || !rowIndices.length) return 0;
  const removable = [];
  let changed = 0;
  rowIndices.forEach(i => {
    if (!s.orig[i] || !s.cur[i]) return;
    if (!isModified(t, i)) return;
    if (typeof isSessionCreatedRow === 'function' && typeof removeRowsFromState === 'function' && isSessionCreatedRow(t, i)) {
      removable.push(i);
      changed++;
      return;
    }
    s.cur[i] = { ...s.orig[i] };
    if (s.rawOrig[i]) s.rawCur[i] = [...s.rawOrig[i]];
    changed++;
  });
  if (removable.length && typeof removeRowsFromState === 'function') removeRowsFromState(t, removable);
  return changed;
}

function runStaticPreflight(type) {
  const s = S[type];
  const cfg = TYPES[type];
  const pf = { errors: [], warnings: [], infos: [] };
  if (!s.cur.length) pf.errors.push('No data rows found in this file');

  const accountIds = Array.from(new Set(s.cur.map(r => (r.accountId || '').trim()).filter(Boolean)));
  if (accountIds.length > 1) pf.errors.push(`Multiple account IDs found (${accountIds.length})`);

  const idField = cfg.idField;
  const seen = new Set();
  let dup = 0;
  s.cur.forEach(r => {
    const id = (r[idField] || '').trim();
    if (!id) return;
    if (seen.has(id)) dup++;
    else seen.add(id);
  });
  if (dup) pf.warnings.push(`Detected duplicate ${cfg.cols.find(c => c.k === idField)?.h || idField} values (${dup})`);

  const known = new Set();
  cfg.cols.forEach(col => {
    [col.csv, ...(Array.isArray(col.csvAliases) ? col.csvAliases : [])].forEach(h => {
      known.add(normalizeHeader(h));
    });
  });
  const extras = s.headerCells.filter(h => !known.has(normalizeHeader(h)));
  if (extras.length) pf.infos.push(`Extra template columns will be preserved on export (${extras.length})`);

  s.preflightStatic = pf;
}

function runValidation(type) {
  const s = S[type];
  const cfg = TYPES[type];
  const cellIssues = new Map();
  const rowsWithIssues = new Set();
  let errors = 0;
  let warnings = 0;

  const addIssue = (rowIdx, key, level, msg) => {
    const mapKey = `${rowIdx}:${key}`;
    const prev = cellIssues.get(mapKey);
    if (prev && prev.level === 'error') return;
    if (prev) {
      if (prev.level === 'warn') warnings--;
    }
    cellIssues.set(mapKey, { level, msg });
    rowsWithIssues.add(rowIdx);
    if (level === 'error') errors++;
    else warnings++;
  };

  const statusOfficial = new Set((STATUS_RULES[type] || []).map(v => String(v).toLowerCase()));
  const statusKnown = new Set(s.statusOptions.map(v => String(v).toLowerCase()));
  const ctaKnown = new Set((s.ctaOptions || []).map(v => String(v).toLowerCase()));
  const today = startOfDay();
  const boolAllowed = new Set(['yes', 'no']);

  for (let i = 0; i < s.cur.length; i++) {
    const row = s.cur[i];
    cfg.cols.forEach(col => {
      const raw = row[col.k] || '';
      const v = String(raw).trim();
      const isChanged = isCellModified(type, i, col.k);
      if (col.edit && isChanged && !isCellEditable(type, row, col.k)) {
        addIssue(i, col.k, 'error', getCellEditLockReason(type, row, col.k) || `${col.h} cannot be edited for this row`);
      }

      if (isRequiredCol(col) && !v) {
        const idVal = String(row[cfg.idField] || '').trim();
        const isNewRow = !idVal;
        if (isNewRow || isChanged) {
          addIssue(i, col.k, 'error', `${col.h}: required value is empty`);
        }
      }
      if (col.type === 'date' && v && !parseUsDate(v)) addIssue(i, col.k, 'error', `${col.h}: use MM/DD/YYYY`);
      if (col.type === 'url' && v && !isValidHttpUrl(v)) addIssue(i, col.k, 'error', `${col.h}: invalid URL`);
      if (col.type === 'num' && v && Number.isNaN(Number(v.replace(/,/g, '')))) addIssue(i, col.k, 'error', `${col.h}: invalid number`);
      if (col.type === 'status' && v) {
        const sv = v.toLowerCase();
        if (!statusKnown.has(sv)) {
          addIssue(i, col.k, isChanged ? 'error' : 'warn', `${col.h}: unknown status value`);
        } else if (!statusOfficial.has(sv) && isChanged) {
          addIssue(i, col.k, 'warn', `${col.h}: value exists in export but may not be settable`);
        }
      }
      if (col.type === 'cta' && v && !ctaKnown.has(v.toLowerCase())) {
        addIssue(i, col.k, isChanged ? 'error' : 'warn', `${col.h}: unsupported CTA for this bulk template`);
      }

      if (YES_NO_FIELDS.has(col.k) && v && !boolAllowed.has(v.toLowerCase())) {
        addIssue(i, col.k, isChanged ? 'error' : 'warn', `${col.h}: use Yes or No`);
      }

      if (col.k === 'profileLanguage' && v && !PROFILE_LANGUAGE_ALLOWED.has(v.toLowerCase())) {
        addIssue(i, col.k, isChanged ? 'error' : 'warn', `${col.h}: unsupported profile language`);
      }

      const limit = getFieldLengthLimit(type, s, row, col.k);
      if (limit && v.length > limit && isChanged) {
        addIssue(i, col.k, 'error', `${col.h}: exceeds ${limit} characters`);
      }

      if ((col.k === 'lifetimeBudget' || col.k === 'dailyBudget') && v && !Number.isNaN(Number(v.replace(/,/g, '')))) {
        const n = Number(v.replace(/,/g, ''));
        if (n > 0 && n < 10 && isChanged) addIssue(i, col.k, 'warn', `${col.h}: values below 10 may be rejected by LinkedIn`);
      }

      if (col.k === 'biddingStrategy' && v) {
        const strategyAllowed = new Set((CHOICE_BASE.biddingStrategy || []).map(x => x.toLowerCase()));
        if (!strategyAllowed.has(v.toLowerCase())) {
          addIssue(i, col.k, 'warn', `${col.h}: uncommon value`);
        }
      }
    });

    const isNewEntityRow = !String(row[cfg.idField] || '').trim();
    const sd = parseUsDate(row.startDate || '');
    const ed = parseUsDate(row.endDate || '');
    if (sd && ed && ed < sd) {
      const dateOrderLevel = (type === 'campaigns' || (type === 'adsets' && isNewEntityRow)) ? 'error' : 'warn';
      addIssue(i, 'endDate', dateOrderLevel, 'End date is earlier than start date');
    }
    const shouldCheckPastStart = isCellModified(type, i, 'startDate') || (type === 'adsets' && isNewEntityRow);
    if (sd && sd < today && shouldCheckPastStart) {
      if (type === 'campaigns') {
        addIssue(i, 'startDate', 'error', 'Campaign start date must be today or later');
      } else if (type === 'adsets' && isNewEntityRow) {
        addIssue(i, 'startDate', 'error', 'New ad set start date must be today or later');
      } else {
        addIssue(i, 'startDate', 'warn', 'Start date is in the past');
      }
    }
    const shouldCheckPastEnd = isCellModified(type, i, 'endDate') || (type === 'adsets' && isNewEntityRow);
    if (ed && ed < today && shouldCheckPastEnd) {
      if (type === 'campaigns') {
        addIssue(i, 'endDate', 'error', 'Campaign end date must be today or later');
      } else if (type === 'adsets' && isNewEntityRow) {
        addIssue(i, 'endDate', 'error', 'New ad set end date must be today or later');
      } else {
        addIssue(i, 'endDate', 'warn', 'End date is in the past');
      }
    }

    if (type === 'campaigns') {
      const isDefaultCampaign = isDefaultCampaignName(row.campaignName || '');
      if (isDefaultCampaign) {
        cfg.cols.forEach(col => {
          if (!col.edit) return;
          if (!isCellModified(type, i, col.k)) return;
          addIssue(i, col.k, 'error', 'Default Campaign cannot be edited');
        });
      }
    }

    if (type === 'adsets') {
      const strategy = row.biddingStrategy || '';
      const bidVal = String(row.bidAmount || '').trim();
      const campaignIdVal = String(row.campaignId || '').trim();
      const audienceTemplateVal = String(row.audienceTemplateId || '').trim();
      const audienceStringVal = String(row.audienceString || '').trim();
      const bidAdjustmentVal = normalizeLabel(row.bidAdjustment || '');
      const isNewRow = !String(row[cfg.idField] || '').trim();
      const wasPersisted = !!String(s.orig[i]?.[cfg.idField] || '').trim();
      const baseStatus = wasPersisted ? (s.orig[i]?.adSetStatus || row.adSetStatus) : '';
      const profileLanguageChanged = isCellModified(type, i, 'profileLanguage');
      const statusChanged = isCellModified(type, i, 'adSetStatus');
      const bidChanged = isCellModified(type, i, 'bidAmount');
      const strategyChanged = isCellModified(type, i, 'biddingStrategy');
      const campaignIdChanged = isCellModified(type, i, 'campaignId');
      const audienceTemplateChanged = isCellModified(type, i, 'audienceTemplateId');
      const audienceStringChanged = isCellModified(type, i, 'audienceString');
      const objectiveChanged = isCellModified(type, i, 'objective');
      const goalChanged = isCellModified(type, i, 'optimizationGoal');
      const bidAdjustmentChanged = isCellModified(type, i, 'bidAdjustment');
      const startDateChanged = isCellModified(type, i, 'startDate');

      if (isNewRow && !campaignIdVal) {
        addIssue(i, 'campaignId', 'error', 'Campaign ID is required for new ad sets');
      }

      if (wasPersisted && campaignIdChanged) {
        addIssue(i, 'campaignId', 'error', 'Campaign ID can be edited only for new ad sets');
      }

      if (!audienceTemplateVal && !audienceStringVal && (isNewRow || audienceTemplateChanged || audienceStringChanged)) {
        addIssue(i, 'audienceTemplateId', 'error', 'Provide Audience Template ID or Audience String');
        addIssue(i, 'audienceString', 'error', 'Provide Audience Template ID or Audience String');
      }

      if (profileLanguageChanged && wasPersisted && !isDraftOrNewAdSetStatus(baseStatus)) {
        addIssue(i, 'profileLanguage', 'error', 'Profile Language can be edited only for ad sets in New/Draft status');
      }

      if (statusChanged) {
        const prevStatus = s.orig[i]?.adSetStatus || '';
        const nextStatus = row.adSetStatus || '';
        if (!isAdSetStatusTransitionAllowed(prevStatus, nextStatus)) {
          const allowed = getAllowedAdSetStatusTransitions(prevStatus);
          const allowedText = allowed.length ? allowed.join(', ') : 'none';
          addIssue(i, 'adSetStatus', 'error', `Ad Set Status transition is not allowed (${prevStatus || '—'} → ${nextStatus || '—'}). Allowed: ${allowedText}`);
        }
      }

      if (wasPersisted && !isDraftOrNewAdSetStatus(baseStatus) && objectiveChanged) {
        addIssue(i, 'objective', 'error', 'Objective can be edited only for ad sets in New/Draft status');
      }

      if (!isOptimizationGoalAllowed(row)) {
        const level = objectiveChanged || goalChanged ? 'error' : 'warn';
        addIssue(i, 'optimizationGoal', level, 'Optimization Goal is not compatible with Objective/Ad Format');
      }

      if (!isBiddingStrategyAllowed(row)) {
        const level = objectiveChanged || goalChanged || strategyChanged ? 'error' : 'warn';
        addIssue(i, 'biddingStrategy', level, 'Bidding Strategy is not compatible with Objective/Optimization Goal/Ad Format');
      }

      if (isAutoBiddingStrategy(strategy) && bidChanged) {
        addIssue(i, 'bidAmount', 'error', 'Bid Amount is not editable with Maximum delivery bidding');
      }
      if (!isAutoBiddingStrategy(strategy) && !bidVal && (isNewRow || bidChanged || strategyChanged)) {
        addIssue(i, 'bidAmount', 'error', 'Bid Amount is required when Bidding Strategy is not Maximum');
      }
      if (!isManualBidding(strategy) && bidAdjustmentChanged) {
        addIssue(i, 'bidAdjustment', 'error', 'Bid adjustment is available only for Manual bidding');
      } else if (isManualBidding(strategy)) {
        const adjustmentRule = getBidAdjustmentConstraint(row);
        const comboChanged = objectiveChanged || goalChanged || strategyChanged || bidAdjustmentChanged;
        if (adjustmentRule === 'required' && bidAdjustmentVal !== 'yes') {
          addIssue(i, 'bidAdjustment', comboChanged ? 'error' : 'warn', 'Enhanced bidding must be enabled for this Objective/Goal/Format');
        }
        if (adjustmentRule === 'forbidden' && bidAdjustmentVal === 'yes') {
          addIssue(i, 'bidAdjustment', comboChanged ? 'error' : 'warn', 'Enhanced bidding must be disabled for this Objective/Goal/Format');
        }
      }

      if (wasPersisted && startDateChanged && !isDraftOrNewAdSetStatus(baseStatus)) {
        addIssue(i, 'startDate', 'warn', 'Start date changes may be restricted after an ad set has launched');
      }
    }

    if (type === 'ads') {
      const supportedFormats = Array.isArray(s.templateMeta?.supportedAdFormats) ? s.templateMeta.supportedAdFormats : [];
      const adFormatValue = String(row.adFormat || '').trim();
      if (adFormatValue && supportedFormats.length) {
        const isSupported = supportedFormats.some(v => normalizeLabel(v) === normalizeLabel(adFormatValue));
        if (!isSupported) addIssue(i, 'adFormat', 'warn', 'Ad Format may not be supported by this bulk template');
      }

      if (isTextAdFormat(row.adFormat)) {
        const introVal = String(row.introductory || '').trim();
        const ctaVal = String(row.callToAction || '').trim();
        if (introVal) {
          addIssue(i, 'introductory', isCellModified(type, i, 'introductory') ? 'error' : 'warn', 'Text ads require Introductory text to be blank');
        }
        if (ctaVal) {
          addIssue(i, 'callToAction', isCellModified(type, i, 'callToAction') ? 'error' : 'warn', 'Text ads do not support Call to Action in this bulk template');
        }
      }

      if (isCanceledStatus(row.adStatus || '')) {
        cfg.cols.forEach(col => {
          if (!col.edit) return;
          if (!isCellModified(type, i, col.k)) return;
          addIssue(i, col.k, 'error', 'Canceled creatives cannot be updated');
        });
      }
    }
  }

  s.validation = { errors, warnings, cellIssues, rowsWithIssues };
  return s.validation;
}
