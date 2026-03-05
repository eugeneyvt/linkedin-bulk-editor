/* ===== STATE ===== */
const S = {};
Object.keys(TYPES).forEach(t => {
  S[t] = {
    orig: [], cur: [], rawOrig: [], rawCur: [],
    hdrLines: [], hdrRow: '', headerCells: [], colToHeaderIndex: {},
    loaded: false, filter: 'all', viewMode: 'all', search: '', sel: new Set(), sortKey: null, sortDir: 'asc',
    visibleCols: [], density: 'comfortable', focusRow: null, issueCursor: 0,
    statusOptions: [...TYPES[t].statusOpts], ctaOptions: [...CTA_BASE],
    preflightStatic: { errors: [], warnings: [], infos: [] },
    validation: { errors: 0, warnings: 0, cellIssues: new Map(), rowsWithIssues: new Set() }
  };
});
let activeTab = null;
let reviewRiskOnly = false;
let uploadsCollapsed = false;
let uploadsAutoCollapsed = false;
let inspectorHidden = false;

