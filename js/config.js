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
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  panelClose: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
};

const TYPES = {
  campaigns: {
    label: 'Campaigns', icon: SVG.campaigns, detect: 'campaign_Edit',
    statusField: 'status', nameField: 'campaignName', idField: 'campaignId',
    statusOpts: ['Active', 'Paused', 'Draft', 'Archived', 'Removed', 'REMOVED'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: false, type: 'id' },
      { k: 'campaignName', h: 'Campaign Name', csv: '*Campaign Name', edit: true, type: 'wide' },
      { k: 'totalBudget', h: 'Campaign Total Budget', csv: 'Campaign Total Budget', edit: true, type: 'num' },
      { k: 'startDate', h: 'Campaign Start Date', csv: '*Campaign Start Date', edit: true, type: 'date' },
      { k: 'endDate', h: 'Campaign End Date', csv: 'Campaign End Date', edit: true, type: 'date' },
      { k: 'status', h: 'Campaign Status', csv: '*Campaign Status', edit: true, type: 'status' },
    ]
  },
  adsets: {
    label: 'Ad Sets', icon: SVG.adsets, detect: 'ad_set_Edit',
    statusField: 'adSetStatus', nameField: 'adSetName', idField: 'adSetId',
    statusOpts: ['Active', 'Paused', 'Draft', 'Archived', 'Completed', 'Canceled'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: false, type: 'id' },
      { k: 'campaignName', h: 'Campaign', csv: 'Campaign Name', edit: false, type: 'ro' },
      { k: 'adSetId', h: 'Ad Set ID', csv: 'Ad Set ID', edit: false, type: 'id' },
      { k: 'adSetName', h: 'Ad Set Name', csv: '*Ad Set Name', edit: true, type: 'wide' },
      { k: 'adSetStatus', h: 'Ad Set Status', csv: '*Ad Set Status', edit: true, type: 'status' },
      { k: 'objective', h: 'Objective', csv: '*Objective', edit: false, type: 'ro' },
      { k: 'adFormat', h: 'Ad Format', csv: '*Ad Format', edit: false, type: 'ro' },
      { k: 'profileLanguage', h: 'Profile Language', csv: '*Profile Language', edit: true },
      { k: 'audienceTemplateId', h: 'Audience Template ID', csv: '**Audience Template ID', edit: true, type: 'wide' },
      { k: 'audienceString', h: 'Audience String', csv: '**Audience String', edit: true, type: 'long' },
      { k: 'audienceExpansion', h: 'Audience Expansion', csv: 'Enable Audience Expansion', edit: true },
      { k: 'linkedinNetwork', h: 'LinkedIn Audience Network', csv: 'Enable LinkedIn Audience Network', edit: true },
      { k: 'dailyBudget', h: 'Daily Budget', csv: 'Ad Set Daily Budget', edit: true, type: 'num' },
      { k: 'lifetimeBudget', h: 'Lifetime Budget', csv: 'Ad Set Lifetime Budget', edit: true, type: 'num' },
      { k: 'startDate', h: 'Start Date', csv: '*Ad Set Start Date', edit: true, type: 'date' },
      { k: 'endDate', h: 'End Date', csv: 'Ad Set End Date', edit: true, type: 'date' },
      { k: 'optimizationGoal', h: 'Optimization Goal', csv: '*Optimization Goal', edit: false, type: 'ro' },
      { k: 'bidAdjustment', h: 'Bid Adjustment (High-Value)', csv: 'Enable bid adjustment for high-value clicks', edit: true },
      { k: 'bidAmount', h: 'Bid Amount', csv: 'Bid Amount', edit: true, type: 'num' },
      { k: 'biddingStrategy', h: 'Bidding Strategy', csv: '*Bidding Strategy', edit: false, type: 'ro' },
      { k: 'politicalIntent', h: 'Political Intent', csv: 'Political Intent', edit: false, type: 'ro' },
    ]
  },
  ads: {
    label: 'Ads', icon: SVG.ads, detect: 'ad_Edit',
    statusField: 'adStatus', nameField: 'adContentName', idField: 'adId',
    statusOpts: ['Active', 'Paused', 'Draft', 'Archived', 'Canceled'],
    cols: [
      { k: 'accountId', h: 'Account ID', csv: '*Account ID', edit: false, hide: true },
      { k: 'accountName', h: 'Account', csv: 'Account Name', edit: false, hide: true },
      { k: 'campaignId', h: 'Campaign ID', csv: 'Campaign ID', edit: false, type: 'id' },
      { k: 'campaignGroupName', h: 'Campaign Group', csv: 'Campaign Group Name', edit: false, type: 'ro' },
      { k: 'adSetId', h: 'Ad Set ID', csv: '*Ad Set ID', edit: false, type: 'id' },
      { k: 'adSetName', h: 'Ad Set', csv: 'Ad Set Name', edit: false, type: 'ro' },
      { k: 'adId', h: 'Ad ID', csv: 'Ad ID', edit: false, type: 'id' },
      { k: 'adStatus', h: 'Ad Status', csv: '*Ad Status', edit: true, type: 'status' },
      { k: 'adFormat', h: 'Ad Format', csv: 'Ad format', edit: false, type: 'ro' },
      { k: 'adContentName', h: 'Ad Content Name', csv: 'Ad content name', edit: true, type: 'wide' },
      { k: 'introductory', h: 'Introductory Text', csv: 'Introductory', edit: true, type: 'long' },
      { k: 'headline', h: 'Headline', csv: 'Headline', edit: true, type: 'wide' },
      { k: 'description', h: 'Description', csv: 'Description', edit: true, type: 'long' },
      { k: 'callToAction', h: 'Call to Action', csv: 'Call to action', edit: true, type: 'cta' },
      { k: 'destinationUrl', h: 'Destination URL', csv: 'Destination URL', edit: true, type: 'url' },
    ]
  }
};

const CTA_BASE = ['Apply', 'Apply Now', 'Attend', 'Download', 'Get Quote', 'Join', 'Learn More', 'Learn more', 'Register', 'Request Demo', 'Sign Up', 'Subscribe', 'View Quote'];
const RISKY_FIELDS = new Set(['status', 'adSetStatus', 'adStatus', 'startDate', 'endDate', 'destinationUrl', 'callToAction', 'totalBudget', 'dailyBudget', 'lifetimeBudget', 'bidAmount', 'audienceString', 'audienceTemplateId']);

