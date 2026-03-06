/* ===== FILE TYPE DEFINITIONS ===== */
const SVG = {
  campaigns: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  adsets: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  ads: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  upload: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  checkSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  calendar: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  panelClose: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
};

const STATUS_RULES = {
  campaigns: ['Active', 'Paused', 'Archived', 'Draft'],
  adsets: ['Active', 'Paused', 'Archived', 'Completed', 'Canceled', 'Draft'],
  ads: ['Active', 'Paused', 'Archived', 'Canceled', 'Draft'],
};

const YES_NO_FIELDS = new Set(['audienceExpansion', 'linkedinNetwork', 'bidAdjustment']);

const FIELD_LENGTH_LIMITS = {
  campaignName: 200,
  adSetName: 200,
  adContentName: 255,
  headline: 200,
  description: 300,
  introductory: 3000,
};

const PROFILE_LANGUAGE_OPTIONS = [
  'Arabic',
  'Bengali',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Farsi',
  'Tagalog',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Malaysian',
  'Marathi',
  'Norwegian',
  'Polish',
  'Portuguese',
  'Punjabi',
  'Romanian',
  'Russian',
  'Spanish',
  'Sweedish',
  'Telugu',
  'Thai',
  'Turkish',
  'Ukranian',
  'Vietnamese',
];
const PROFILE_LANGUAGE_ALLOWED = new Set(PROFILE_LANGUAGE_OPTIONS.map(v => v.toLowerCase()));

const CTA_BASE = [
  'Sign Up',
  'Join',
  'Join Now',
  'Apply',
  'Apply Now',
  'Download',
  'Download Now',
  'View Quote',
  'Learn More',
  'Learn more',
  'Subscribe',
  'Register',
  'Attend',
  'Request Demo',
  'Get Quote',
  'See More',
  'Buy Now',
  'Shop Now',
];

const CHOICE_BASE = {
  yesNo: ['Yes', 'No'],
  biddingStrategy: ['Maximum', 'Target cost', 'Manual', 'Cost cap'],
  objective: ['Engagement', 'Lead Generation', 'Website Conversion', 'Website Conversions', 'Brand Awareness', 'Website Visit', 'Website Visits', 'Video View', 'Video Views', 'Talent Lead', 'Talent Leads', 'Job Applicant', 'Job Applicants'],
  optimizationGoal: ['Reach', 'Impressions', 'Landing page clicks', 'Sends', 'Engagement clicks', 'Clicks', 'Video views', 'Leads', 'Qualified leads', 'Talent leads', 'Website conversions', 'Conversion Value', 'Qualified website conversions', 'Job applications', 'Qualified job applications'],
  profileLanguage: PROFILE_LANGUAGE_OPTIONS,
};

const AD_FORMAT_ALIASES = {
  'single image ad': 'single_image',
  'carousel ad': 'carousel_image',
  'carousel image ad': 'carousel_image',
  'video ad': 'video',
  'follower ad': 'follower',
  'document ad': 'document',
  'conversation ad': 'conversation',
  'message ad': 'message',
  'text ad': 'text',
  'spotlight ad': 'spotlight',
  'event ad': 'event',
  'article and newsletter ad': 'article_newsletter',
  'single job ad': 'single_job',
  'jobs ad': 'jobs',
};

const ADS_CREATIVE_EDIT_KEYS = new Set(['adContentName', 'introductory', 'headline', 'description', 'callToAction', 'destinationUrl']);

const AD_CREATIVE_FIELD_LABELS = {
  adContentName: 'Ad Name',
  introductory: 'Introductory Text',
  headline: 'Headline',
  description: 'Description',
  callToAction: 'Call to Action',
  destinationUrl: 'Destination URL',
};

const AD_FORMAT_CREATIVE_RULES = {
  single_image: {
    editable: ['adContentName', 'introductory', 'headline', 'description', 'callToAction', 'destinationUrl'],
    limits: { adContentName: 255, introductory: 3000, headline: 200, description: 300, destinationUrl: 2000 },
  },
  video: {
    editable: ['adContentName', 'introductory', 'headline', 'callToAction', 'destinationUrl'],
    limits: { adContentName: 255, introductory: 3000, headline: 200, destinationUrl: 2000 },
  },
  carousel_image: {
    editable: ['adContentName', 'introductory', 'destinationUrl'],
    limits: { adContentName: 255, introductory: 255, destinationUrl: 2000 },
  },
  document: {
    editable: ['adContentName', 'introductory', 'headline'],
    limits: { adContentName: 255, introductory: 3000, headline: 200 },
  },
  event: {
    editable: ['introductory'],
    limits: { introductory: 3000 },
  },
  single_job: {
    editable: ['adContentName', 'introductory'],
    limits: { adContentName: 255, introductory: 3000 },
  },
  article_newsletter: {
    editable: ['introductory', 'headline', 'callToAction', 'destinationUrl'],
    limits: { introductory: 3000, headline: 200, destinationUrl: 2000 },
  },
  text: {
    editable: ['adContentName', 'headline', 'description', 'destinationUrl'],
    limits: { adContentName: 255, headline: 25, description: 75, destinationUrl: 500 },
  },
  spotlight: {
    editable: ['adContentName', 'headline', 'description', 'callToAction', 'destinationUrl'],
    limits: { adContentName: 255, headline: 50, description: 70, destinationUrl: 500 },
  },
  follower: {
    editable: ['adContentName', 'headline', 'description', 'callToAction'],
    limits: { adContentName: 255, headline: 50, description: 70 },
  },
  jobs: {
    editable: ['adContentName', 'headline', 'callToAction'],
    limits: { adContentName: 255, headline: 70 },
  },
  message: {
    editable: ['adContentName', 'callToAction', 'destinationUrl'],
    limits: { adContentName: 255, destinationUrl: 2000 },
  },
  conversation: {
    editable: ['adContentName', 'callToAction', 'destinationUrl'],
    limits: { adContentName: 255, destinationUrl: 2000 },
  },
};

const FORMAT_GROUPS = {
  engagementDefault: new Set(['single_image', 'carousel_image', 'video', 'follower', 'document', 'event', 'article_newsletter']),
  leadGenDefault: new Set(['single_image', 'carousel_image', 'video', 'document', 'article_newsletter']),
  websiteConversionDefault: new Set(['single_image', 'carousel_image', 'video', 'document']),
  brandAwarenessDefault: new Set(['single_image', 'carousel_image', 'video', 'document', 'event', 'article_newsletter']),
  websiteVisitDefault: new Set(['single_image', 'carousel_image', 'video', 'document', 'event']),
  talentLeadsDefault: new Set(['single_image', 'carousel_image', 'video']),
  jobApplicantsDefault: new Set(['single_image', 'single_job', 'spotlight']),
  textSpotlight: new Set(['text', 'spotlight']),
  spotlight: new Set(['spotlight']),
  messageConversation: new Set(['message', 'conversation']),
  conversation: new Set(['conversation']),
  follower: new Set(['follower']),
  jobs: new Set(['jobs']),
  videoOnly: new Set(['video']),
};

const OBJECTIVE_COMPATIBILITY = {
  engagement: {
    goals: {
      'Engagement clicks': [{ strategies: ['Maximum', 'Cost cap', 'Manual'], formatGroups: ['engagementDefault'], manualBidAdjustment: 'optional' }],
      Impressions: [{ strategies: ['Manual'], formatGroups: ['engagementDefault'], manualBidAdjustment: 'forbidden' }],
      Sends: [{ strategies: ['Maximum', 'Manual'], formatGroups: ['conversation'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'lead generation': {
    goals: {
      Leads: [{ strategies: ['Maximum', 'Cost cap', 'Manual'], formatGroups: ['leadGenDefault'], manualBidAdjustment: 'required' }],
      'Qualified leads': [{ strategies: ['Maximum'], formatGroups: ['leadGenDefault'] }],
      Clicks: [{ strategies: ['Manual'], formatGroups: ['leadGenDefault'], manualBidAdjustment: 'forbidden' }],
      Impressions: [{ strategies: ['Manual'], formatGroups: ['leadGenDefault'], manualBidAdjustment: 'forbidden' }],
      Sends: [{ strategies: ['Maximum', 'Manual'], formatGroups: ['messageConversation'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'website conversion': {
    goals: {
      'Website conversions': [{ strategies: ['Maximum', 'Manual'], formatGroups: ['websiteConversionDefault'], manualBidAdjustment: 'required' }],
      'Qualified leads': [{ strategies: ['Maximum'], formatGroups: ['websiteConversionDefault'] }],
      'Conversion Value': [{ strategies: ['Maximum'], formatGroups: ['websiteConversionDefault'] }],
      'Landing page clicks': [
        { strategies: ['Manual'], formatGroups: ['websiteConversionDefault'], manualBidAdjustment: 'forbidden' },
        { strategies: ['Maximum', 'Manual'], formatGroups: ['textSpotlight'], manualBidAdjustment: 'forbidden' },
      ],
      Impressions: [
        { strategies: ['Manual'], formatGroups: ['websiteConversionDefault'], manualBidAdjustment: 'forbidden' },
        { strategies: ['Maximum', 'Manual'], formatGroups: ['textSpotlight'], manualBidAdjustment: 'forbidden' },
      ],
      Sends: [{ strategies: ['Maximum', 'Manual'], formatGroups: ['messageConversation'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'brand awareness': {
    goals: {
      Reach: [{ strategies: ['Maximum'], formatGroups: ['brandAwarenessDefault'] }],
      Impressions: [
        { strategies: ['Maximum', 'Cost cap', 'Manual'], formatGroups: ['brandAwarenessDefault'], manualBidAdjustment: 'forbidden' },
        { strategies: ['Manual'], formatGroups: ['textSpotlight', 'follower'], manualBidAdjustment: 'forbidden' },
      ],
      Sends: [{ strategies: ['Maximum', 'Manual'], formatGroups: ['conversation'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'website visit': {
    goals: {
      'Landing page clicks': [
        { strategies: ['Maximum', 'Cost cap', 'Manual'], formatGroups: ['websiteVisitDefault'], manualBidAdjustment: 'optional' },
        { strategies: ['Manual'], formatGroups: ['textSpotlight'], manualBidAdjustment: 'forbidden' },
      ],
      Impressions: [{ strategies: ['Manual'], formatGroups: ['websiteVisitDefault', 'textSpotlight'], manualBidAdjustment: 'forbidden' }],
      Sends: [{ strategies: ['Maximum', 'Manual'], formatGroups: ['messageConversation'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'video view': {
    goals: {
      'Video views': [{ strategies: ['Maximum', 'Cost cap', 'Manual'], formatGroups: ['videoOnly'], manualBidAdjustment: 'forbidden' }],
      Impressions: [{ strategies: ['Manual'], formatGroups: ['videoOnly'], manualBidAdjustment: 'forbidden' }],
    },
  },
  'talent lead': {
    goals: {
      'Talent leads': [{ strategies: ['Maximum', 'Manual'], formatGroups: ['talentLeadsDefault'], manualBidAdjustment: 'required' }],
      'Landing page clicks': [{ strategies: ['Manual'], formatGroups: ['talentLeadsDefault'], manualBidAdjustment: 'forbidden' }],
      Impressions: [
        { strategies: ['Manual'], formatGroups: ['talentLeadsDefault'], manualBidAdjustment: 'forbidden' },
        { strategies: ['Manual'], formatGroups: ['spotlight'], manualBidAdjustment: 'forbidden' },
      ],
    },
  },
  'job applicant': {
    goals: {
      'Landing page clicks': [{ strategies: ['Maximum', 'Manual'], formatGroups: ['jobApplicantsDefault'], manualBidAdjustment: 'forbidden' }],
      Impressions: [
        { strategies: ['Manual'], formatGroups: ['jobApplicantsDefault'], manualBidAdjustment: 'forbidden' },
        { strategies: ['Manual'], formatGroups: ['jobs'], manualBidAdjustment: 'forbidden' },
      ],
    },
  },
};

const OBJECTIVE_ALIASES = {
  engagement: 'engagement',
  'creative engagement': 'engagement',
  'lead generation': 'lead generation',
  'brand awareness': 'brand awareness',
  'website conversion': 'website conversion',
  'website conversions': 'website conversion',
  'website visit': 'website visit',
  'website visits': 'website visit',
  'website traffic': 'website visit',
  'video view': 'video view',
  'video views': 'video view',
  'talent lead': 'talent lead',
  'talent leads': 'talent lead',
  'job applicant': 'job applicant',
  'job applicants': 'job applicant',
};

function normalizeLabel(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseUsDateStrict(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = +m[1];
  const dd = +m[2];
  const yy = +m[3];
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

function hasDatePassed(v) {
  const d = parseUsDateStrict(v);
  if (!d) return false;
  const today = new Date();
  const sod = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d < sod;
}

function normalizeBiddingStrategy(v) {
  const n = normalizeLabel(v);
  if (n === 'maximum delivery' || n === 'auto') return 'maximum';
  if (n === 'costcap') return 'cost cap';
  return n;
}

function isAutoBiddingStrategy(v) {
  const s = normalizeBiddingStrategy(v);
  return s === 'maximum';
}

function isManualOrCostCapBidding(v) {
  const s = normalizeBiddingStrategy(v);
  return s === 'manual' || s === 'cost cap';
}

function isManualBidding(v) {
  return normalizeBiddingStrategy(v) === 'manual';
}

function isDraftOrNewAdSetStatus(v) {
  const s = normalizeLabel(v);
  return s === 'draft' || s === 'new';
}

function isPersistedAdSet(row) {
  return !!String(row?.adSetId || '').trim();
}

function normalizeAdSetStatus(v) {
  const s = normalizeLabel(v);
  if (s === 'cancelled') return 'canceled';
  return s;
}

function getAllowedAdSetStatusTransitions(fromStatus) {
  const s = normalizeAdSetStatus(fromStatus);
  if (s === 'active') return ['Paused'];
  if (s === 'paused') return ['Active', 'Archived'];
  if (s === 'draft' || s === 'new' || !s) return ['Draft', 'Active', 'Paused'];
  // Completed/Canceled/Archived are terminal in UI and not manually settable.
  return [];
}

function isAdSetStatusTransitionAllowed(fromStatus, toStatus) {
  const next = normalizeAdSetStatus(toStatus);
  if (!next) return false;
  const allowed = getAllowedAdSetStatusTransitions(fromStatus);
  return allowed.some(v => normalizeAdSetStatus(v) === next);
}

function isTextAdFormat(v) {
  return normalizeLabel(v) === 'text ad';
}

function isSingleImageAdFormat(v) {
  return normalizeLabel(v) === 'single image ad';
}

function isCanceledStatus(v) {
  const s = normalizeLabel(v);
  return s === 'canceled' || s === 'cancelled';
}

function isDefaultCampaignName(v) {
  return normalizeLabel(v) === 'default campaign';
}

function normalizeObjectiveKey(v) {
  const n = normalizeLabel(v);
  return OBJECTIVE_ALIASES[n] || n;
}

function normalizeAdFormatKey(v) {
  const n = normalizeLabel(v);
  return AD_FORMAT_ALIASES[n] || n;
}

function getAdFormatCreativeRule(adFormat) {
  const key = normalizeAdFormatKey(adFormat);
  return AD_FORMAT_CREATIVE_RULES[key] || null;
}

function isAdCreativeFieldEditable(adFormat, key) {
  if (!ADS_CREATIVE_EDIT_KEYS.has(key)) return true;
  const rule = getAdFormatCreativeRule(adFormat);
  if (!rule || !Array.isArray(rule.editable)) return true;
  return rule.editable.includes(key);
}

function getAdCreativeFieldLimit(adFormat, key) {
  const rule = getAdFormatCreativeRule(adFormat);
  const raw = rule?.limits?.[key];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeGoalKey(v) {
  return normalizeLabel(v);
}

function getObjectiveRule(objective) {
  return OBJECTIVE_COMPATIBILITY[normalizeObjectiveKey(objective)] || null;
}

function getGoalRuleVariants(goalRule) {
  if (!goalRule) return [];
  return Array.isArray(goalRule) ? goalRule : [goalRule];
}

function isAdFormatAllowedByRule(adFormat, goalRule) {
  if (!goalRule) return true;
  const af = normalizeAdFormatKey(adFormat);
  if (Array.isArray(goalRule.adFormats) && goalRule.adFormats.length) {
    return goalRule.adFormats.some(v => normalizeAdFormatKey(v) === af);
  }
  if (Array.isArray(goalRule.formatGroups) && goalRule.formatGroups.length) {
    return goalRule.formatGroups.some(group => FORMAT_GROUPS[group]?.has(af));
  }
  return true;
}

function getMatchingGoalVariants(row, goalRule) {
  return getGoalRuleVariants(goalRule).filter(variant => isAdFormatAllowedByRule(row?.adFormat, variant));
}

function getAllowedOptimizationGoals(row) {
  const rule = getObjectiveRule(row?.objective);
  if (!rule || !rule.goals) return [];
  return Object.keys(rule.goals)
    .filter(goal => getMatchingGoalVariants(row, rule.goals[goal]).length > 0);
}

function isOptimizationGoalAllowed(row) {
  const goal = normalizeGoalKey(row?.optimizationGoal || '');
  if (!goal) return true;
  const rule = getObjectiveRule(row?.objective);
  if (!rule || !rule.goals) return true;
  const goalEntry = Object.entries(rule.goals).find(([ruleGoal]) => normalizeGoalKey(ruleGoal) === goal);
  if (!goalEntry) return false;
  return getMatchingGoalVariants(row, goalEntry[1]).length > 0;
}

function getAllowedBiddingStrategies(row) {
  const rule = getObjectiveRule(row?.objective);
  if (!rule || !rule.goals) return [];

  const goal = normalizeGoalKey(row?.optimizationGoal || '');
  const goalEntry = goal
    ? Object.entries(rule.goals).find(([ruleGoal]) => normalizeGoalKey(ruleGoal) === goal)
    : null;

  if (goalEntry) {
    const variants = getMatchingGoalVariants(row, goalEntry[1]);
    const out = [];
    const seen = new Set();
    variants.forEach(variant => {
      (variant.strategies || []).forEach(strategy => {
        const k = normalizeLabel(strategy);
        if (seen.has(k)) return;
        seen.add(k);
        out.push(strategy);
      });
    });
    return out;
  }

  const out = [];
  const seen = new Set();
  Object.values(rule.goals).forEach(goalRule => {
    const variants = getMatchingGoalVariants(row, goalRule);
    variants.forEach(variant => {
      (variant.strategies || []).forEach(strategy => {
        const k = normalizeLabel(strategy);
        if (seen.has(k)) return;
        seen.add(k);
        out.push(strategy);
      });
    });
  });
  return out;
}

function isBiddingStrategyAllowed(row) {
  const strategy = String(row?.biddingStrategy || '').trim();
  if (!strategy) return true;
  const allowed = getAllowedBiddingStrategies(row);
  if (!allowed.length) return true;
  return allowed.some(v => normalizeBiddingStrategy(v) === normalizeBiddingStrategy(strategy));
}

function getBidAdjustmentConstraint(row) {
  if (!isManualBidding(row?.biddingStrategy)) return null;
  const rule = getObjectiveRule(row?.objective);
  if (!rule || !rule.goals) return null;
  const goal = normalizeGoalKey(row?.optimizationGoal || '');
  if (!goal) return null;
  const goalEntry = Object.entries(rule.goals).find(([ruleGoal]) => normalizeGoalKey(ruleGoal) === goal);
  if (!goalEntry) return null;
  const matches = getMatchingGoalVariants(row, goalEntry[1]);
  if (!matches.length) return null;
  const tags = new Set(matches.map(v => v.manualBidAdjustment || 'optional'));
  if (tags.has('required') && tags.size === 1) return 'required';
  if (tags.has('forbidden') && tags.size === 1) return 'forbidden';
  return 'optional';
}

function getAllowedBidAdjustmentValues(row) {
  if (!isManualBidding(row?.biddingStrategy)) return [];
  const rule = getBidAdjustmentConstraint(row);
  if (rule === 'required') return ['Yes'];
  if (rule === 'forbidden') return ['No'];
  return ['Yes', 'No'];
}

function isCellEditable(type, row, key) {
  if (!row) return true;
  if (type === 'campaigns' && isDefaultCampaignName(row.campaignName)) return false;
  if (type === 'campaigns' && key === 'startDate' && hasDatePassed(row.startDate)) return false;
  if (type === 'adsets' && key === 'campaignId' && isPersistedAdSet(row)) return false;
  if (type === 'adsets' && key === 'startDate' && isPersistedAdSet(row) && hasDatePassed(row.startDate) && !isDraftOrNewAdSetStatus(row.adSetStatus)) return false;
  if (type === 'adsets' && key === 'objective' && isPersistedAdSet(row) && !isDraftOrNewAdSetStatus(row.adSetStatus)) return false;
  if (type === 'adsets' && key === 'profileLanguage' && isPersistedAdSet(row) && !isDraftOrNewAdSetStatus(row.adSetStatus)) return false;
  if (type === 'adsets' && key === 'adSetStatus' && isPersistedAdSet(row) && !getAllowedAdSetStatusTransitions(row.adSetStatus).length) return false;
  if (type === 'adsets' && key === 'bidAmount' && isAutoBiddingStrategy(row.biddingStrategy)) return false;
  if (type === 'adsets' && key === 'bidAdjustment' && !isManualBidding(row.biddingStrategy)) return false;
  if (type === 'ads' && isCanceledStatus(row.adStatus)) return false;
  if (type === 'ads' && ADS_CREATIVE_EDIT_KEYS.has(key) && !isAdCreativeFieldEditable(row.adFormat, key)) return false;
  return true;
}

function getCellEditLockReason(type, row, key) {
  if (type === 'campaigns' && isDefaultCampaignName(row?.campaignName)) {
    return 'Default Campaign cannot be edited';
  }
  if (type === 'campaigns' && key === 'startDate' && hasDatePassed(row?.startDate)) {
    return 'Campaign start date cannot be changed after it has passed';
  }
  if (type === 'adsets' && key === 'campaignId' && isPersistedAdSet(row)) {
    return 'Campaign ID can be edited only for new ad sets';
  }
  if (type === 'adsets' && key === 'startDate' && isPersistedAdSet(row) && hasDatePassed(row?.startDate) && !isDraftOrNewAdSetStatus(row?.adSetStatus)) {
    return 'Ad set start date usually cannot be changed after launch';
  }
  if (type === 'adsets' && key === 'objective' && isPersistedAdSet(row) && !isDraftOrNewAdSetStatus(row?.adSetStatus)) {
    return 'Objective can be edited only before an ad set is created (New/Draft)';
  }
  if (type === 'adsets' && key === 'profileLanguage' && isPersistedAdSet(row) && !isDraftOrNewAdSetStatus(row?.adSetStatus)) {
    return 'Profile Language can be edited only before an ad set is created (New/Draft)';
  }
  if (type === 'adsets' && key === 'adSetStatus' && isPersistedAdSet(row) && !getAllowedAdSetStatusTransitions(row?.adSetStatus).length) {
    return 'This ad set status is terminal and cannot be changed manually';
  }
  if (type === 'adsets' && key === 'bidAmount' && isAutoBiddingStrategy(row?.biddingStrategy)) {
    return 'Bid Amount is locked for Maximum delivery bidding strategy';
  }
  if (type === 'adsets' && key === 'bidAdjustment' && !isManualBidding(row?.biddingStrategy)) {
    return 'Bid adjustment is available only for Manual bidding strategy';
  }
  if (type === 'ads' && isCanceledStatus(row?.adStatus)) {
    return 'Canceled creatives cannot be edited';
  }
  if (type === 'ads' && ADS_CREATIVE_EDIT_KEYS.has(key) && !isAdCreativeFieldEditable(row?.adFormat, key)) {
    if (isTextAdFormat(row?.adFormat) && key === 'introductory') return 'Text ads do not use Introductory text in this bulk template';
    const field = AD_CREATIVE_FIELD_LABELS[key] || key;
    const fmt = String(row?.adFormat || 'this ad format').trim();
    return `${field} is not editable for ${fmt}`;
  }
  if (type === 'ads' && isTextAdFormat(row?.adFormat) && key === 'introductory') {
    return 'Text ads do not use Introductory text in this bulk template';
  }
  return '';
}

function getChoiceOptions(type, key, rows = [], row = null) {
  const pushUniq = (out, seen, raw) => {
    const v = String(raw || '').trim();
    if (!v) return;
    const n = v.toLowerCase();
    if (seen.has(n)) return;
    seen.add(n);
    out.push(v);
  };

  const addFromRows = (out, seen, predicate) => {
    rows.forEach(r => {
      if (predicate && !predicate(r)) return;
      pushUniq(out, seen, r?.[key]);
    });
  };

  const out = [];
  const seen = new Set();
  const col = TYPES[type]?.cols?.find(c => c.k === key);
  const choiceKey = col?.choiceKey;
  const statusField = TYPES[type]?.statusField;
  if (key === statusField) (STATUS_RULES[type] || []).forEach(v => pushUniq(out, seen, v));
  const base = choiceKey ? (CHOICE_BASE[choiceKey] || []) : [];
  const isContextualAdsetChoice = type === 'adsets' && row && (key === 'optimizationGoal' || key === 'biddingStrategy' || key === 'bidAdjustment' || key === 'adSetStatus');
  if (!isContextualAdsetChoice) base.forEach(v => pushUniq(out, seen, v));

  if (type === 'adsets' && row && key === 'adSetStatus') {
    const rowIdx = rows.indexOf(row);
    const baseStatus = rowIdx >= 0 && S[type]?.orig?.[rowIdx]
      ? (S[type].orig[rowIdx].adSetStatus || row.adSetStatus)
      : row.adSetStatus;
    const allowedStatuses = getAllowedAdSetStatusTransitions(baseStatus);
    return allowedStatuses;
  } else if (type === 'adsets' && row && key === 'optimizationGoal') {
    getAllowedOptimizationGoals(row).forEach(v => pushUniq(out, seen, v));
  } else if (type === 'adsets' && row && key === 'biddingStrategy') {
    getAllowedBiddingStrategies(row).forEach(v => pushUniq(out, seen, v));
  } else if (type === 'adsets' && row && key === 'bidAdjustment') {
    getAllowedBidAdjustmentValues(row).forEach(v => pushUniq(out, seen, v));
  }

  // Objective-related fields often have restricted combinations by row context.
  if (type === 'adsets' && row && key === 'optimizationGoal') {
    const objective = normalizeObjectiveKey(row.objective || '');
    if (objective) {
      addFromRows(out, seen, r => {
        if (normalizeObjectiveKey(r?.objective || '') !== objective) return false;
        return isOptimizationGoalAllowed({ ...row, optimizationGoal: r?.optimizationGoal || '' });
      });
    } else {
      addFromRows(out, seen);
    }
  } else if (type === 'adsets' && row && key === 'biddingStrategy') {
    const objective = normalizeObjectiveKey(row.objective || '');
    const goal = normalizeGoalKey(row.optimizationGoal || '');
    if (objective && goal) {
      addFromRows(out, seen, r => {
        if (normalizeObjectiveKey(r?.objective || '') !== objective) return false;
        if (normalizeGoalKey(r?.optimizationGoal || '') !== goal) return false;
        return isBiddingStrategyAllowed({ ...row, biddingStrategy: r?.biddingStrategy || '' });
      });
    } else if (objective) {
      addFromRows(out, seen, r => normalizeObjectiveKey(r?.objective || '') === objective);
    } else {
      addFromRows(out, seen);
    }
  } else if (type === 'adsets' && row && key === 'bidAdjustment') {
    const objective = normalizeObjectiveKey(row.objective || '');
    const goal = normalizeGoalKey(row.optimizationGoal || '');
    const strategy = normalizeBiddingStrategy(row.biddingStrategy || '');
    if (objective && goal && strategy === 'manual') {
      addFromRows(out, seen, r => {
        if (normalizeObjectiveKey(r?.objective || '') !== objective) return false;
        if (normalizeGoalKey(r?.optimizationGoal || '') !== goal) return false;
        if (!isManualBidding(r?.biddingStrategy || '')) return false;
        const candidate = { ...row, bidAdjustment: r?.bidAdjustment || '' };
        const allowed = getAllowedBidAdjustmentValues(candidate);
        if (!allowed.length) return false;
        const value = String(r?.bidAdjustment || '').trim();
        return allowed.some(v => normalizeLabel(v) === normalizeLabel(value));
      });
    } else {
      addFromRows(out, seen);
    }
  } else if (type === 'adsets' && row && key === 'profileLanguage') {
    // Keep profile language constrained to account-provided canonical list.
  } else {
    addFromRows(out, seen);
  }

  return out;
}

const TYPES = {
  campaigns: {
    label: 'Campaigns', icon: SVG.campaigns, detect: 'campaign_Edit',
    statusField: 'status', nameField: 'campaignName', idField: 'campaignId',
    statusOpts: [...STATUS_RULES.campaigns],
    requiredKeys: ['accountId', 'campaignId', 'campaignName', 'status'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', csvAliases: ['Account ID'], edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: false, type: 'id' },
      { k: 'campaignName', h: 'Campaign Name', csv: '*Campaign Name', csvAliases: ['Campaign Name'], edit: true, type: 'wide' },
      { k: 'totalBudget', h: 'Campaign Shared Total Budget', csv: 'Campaign Shared Total Budget', csvAliases: ['Campaign Total Budget'], edit: true, type: 'num' },
      { k: 'startDate', h: 'Campaign Start Date', csv: '*Campaign Start Date', csvAliases: ['Campaign Start Date'], edit: true, type: 'date' },
      { k: 'endDate', h: 'Campaign End Date', csv: 'Campaign End Date', edit: true, type: 'date' },
      { k: 'status', h: 'Campaign Status', csv: '*Campaign Status', csvAliases: ['Campaign Status'], edit: true, type: 'status' },
    ]
  },
  adsets: {
    label: 'Ad Sets', icon: SVG.adsets, detect: 'ad_set_Edit',
    statusField: 'adSetStatus', nameField: 'adSetName', idField: 'adSetId',
    statusOpts: [...STATUS_RULES.adsets],
    requiredKeys: ['accountId', 'campaignId', 'adSetId', 'adSetName', 'adSetStatus'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', csvAliases: ['Account ID'], edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: true, type: 'id' },
      { k: 'campaignName', h: 'Campaign', csv: 'Campaign Name', edit: false, type: 'ro' },
      { k: 'adSetId', h: 'Ad Set ID', csv: 'Ad Set ID', edit: false, type: 'id' },
      { k: 'adSetName', h: 'Ad Set Name', csv: '*Ad Set Name', csvAliases: ['Ad Set Name'], edit: true, type: 'wide' },
      { k: 'adSetStatus', h: 'Ad Set Status', csv: '*Ad Set Status', csvAliases: ['Ad Set Status'], edit: true, type: 'status' },
      { k: 'objective', h: 'Objective', csv: '*Objective', csvAliases: ['Objective'], edit: true, type: 'choice', choiceKey: 'objective' },
      { k: 'adFormat', h: 'Ad Format', csv: '*Ad Format', edit: false, type: 'ro' },
      { k: 'profileLanguage', h: 'Profile Language', csv: '*Profile Language', edit: true, type: 'choice', choiceKey: 'profileLanguage' },
      { k: 'audienceTemplateId', h: 'Audience Template ID', csv: '**Audience Template ID', edit: true, type: 'wide' },
      { k: 'audienceString', h: 'Audience String', csv: '**Audience String', edit: true, type: 'long' },
      { k: 'audienceExpansion', h: 'Audience Expansion', csv: 'Enable Audience Expansion', edit: true, type: 'choice', choiceKey: 'yesNo' },
      { k: 'linkedinNetwork', h: 'LinkedIn Audience Network', csv: 'Enable LinkedIn Audience Network', edit: true, type: 'choice', choiceKey: 'yesNo' },
      { k: 'dailyBudget', h: 'Daily/Total Budget', csv: 'Ad Set Daily Budget', csvAliases: ['Ad Set Total Budget'], edit: true, type: 'num' },
      { k: 'lifetimeBudget', h: 'Lifetime Budget', csv: 'Ad Set Lifetime Budget', edit: true, type: 'num' },
      { k: 'startDate', h: 'Start Date', csv: '*Ad Set Start Date', csvAliases: ['Ad Set Start Date'], edit: true, type: 'date' },
      { k: 'endDate', h: 'End Date', csv: 'Ad Set End Date', edit: true, type: 'date' },
      { k: 'optimizationGoal', h: 'Optimization Goal', csv: '*Optimization Goal', csvAliases: ['Optimization Goal'], edit: true, type: 'choice', choiceKey: 'optimizationGoal' },
      { k: 'bidAdjustment', h: 'Bid Adjustment (High-Value)', csv: 'Enable bid adjustment for high-value clicks', edit: true, type: 'choice', choiceKey: 'yesNo' },
      { k: 'bidAmount', h: 'Bid Amount', csv: 'Bid Amount', edit: true, type: 'num' },
      { k: 'biddingStrategy', h: 'Bidding Strategy', csv: '*Bidding Strategy', csvAliases: ['Bidding Strategy'], edit: true, type: 'choice', choiceKey: 'biddingStrategy' },
      { k: 'politicalIntent', h: 'Political Intent', csv: 'Political Intent', edit: false, type: 'ro' },
    ]
  },
  ads: {
    label: 'Ads', icon: SVG.ads, detect: 'ad_Edit',
    statusField: 'adStatus', nameField: 'adContentName', idField: 'adId',
    statusOpts: [...STATUS_RULES.ads],
    requiredKeys: ['accountId', 'campaignId', 'adSetId', 'adId', 'adStatus'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', csvAliases: ['Account ID'], edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: false, type: 'id' },
      { k: 'campaignGroupName', h: 'Campaign', csv: 'Campaign Group Name', csvAliases: ['Campaign Name'], edit: false, type: 'ro' },
      { k: 'adSetId', h: 'Ad Set ID', csv: '*Ad Set ID', csvAliases: ['Ad Set ID'], edit: false, type: 'id' },
      { k: 'adSetName', h: 'Ad Set', csv: 'Ad Set Name', edit: false, type: 'ro' },
      { k: 'adId', h: 'Ad ID', csv: 'Ad ID', edit: false, type: 'id' },
      { k: 'adStatus', h: 'Creative Status', csv: '*Creative Status', csvAliases: ['Creative Status', '*Ad Status', 'Ad Status'], edit: true, type: 'status' },
      { k: 'adFormat', h: 'Ad Format', csv: 'Ad format', csvAliases: ['Ad Format'], edit: false, type: 'ro' },
      { k: 'adContentName', h: 'Ad Name', csv: '*Ad Name', csvAliases: ['Ad Name', 'Ad content name', 'Ad Content Name'], edit: true, type: 'wide' },
      { k: 'introductory', h: 'Introductory Text', csv: 'Introductory', edit: true, type: 'long' },
      { k: 'headline', h: 'Headline', csv: 'Headline', edit: true, type: 'wide' },
      { k: 'description', h: 'Description', csv: 'Description', edit: true, type: 'long' },
      { k: 'callToAction', h: 'Call to Action', csv: 'Call to action', edit: true, type: 'cta' },
      { k: 'destinationUrl', h: 'Destination URL', csv: 'Destination URL', edit: true, type: 'url' },
    ]
  }
};

const RISKY_FIELDS = new Set(['status', 'adSetStatus', 'adStatus', 'startDate', 'endDate', 'destinationUrl', 'callToAction', 'totalBudget', 'dailyBudget', 'lifetimeBudget', 'bidAmount', 'audienceString', 'audienceTemplateId']);
