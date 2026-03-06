/* ===== FIND & REPLACE ===== */
let fnrOpen = false;
let fnrNode = null;

function toggleFnR() {
  fnrOpen = !fnrOpen;
  if (fnrOpen) {
    showFnR();
  } else {
    hideFnR();
  }
}

function showFnR() {
  fnrOpen = true;
  if (!fnrNode) {
    const tpl = Q('#fnrTpl');
    fnrNode = tpl.content.cloneNode(true).firstElementChild;
    fnrNode.querySelector('#fnrFindBtn').addEventListener('click', doFind);
    fnrNode.querySelector('#fnrReplaceAllBtn').addEventListener('click', doReplaceAll);
    fnrNode.querySelector('#fnrClose').addEventListener('click', () => { hideFnR(); });
    fnrNode.querySelector('#fnrFind').addEventListener('input', doFind);
    fnrNode.querySelector('#fnrReplace').addEventListener('input', () => { });
    fnrNode.querySelector('#fnrCase').addEventListener('change', doFind);
    fnrNode.querySelector('#fnrWord').addEventListener('change', doFind);
    fnrNode.querySelector('#fnrRegex').addEventListener('change', doFind);
  }
  updateFnRScope();
  const tableZone = Q('#tableZone');
  tableZone.insertBefore(fnrNode, tableZone.firstChild);
  fnrNode.classList.add('open');
  fnrNode.querySelector('#fnrFind').focus();
}

function hideFnR() {
  fnrOpen = false;
  if (fnrNode) {
    fnrNode.classList.remove('open');
    fnrNode.querySelector('#fnrResults').textContent = '';
  }
}

function updateFnRScope() {
  if (!fnrNode || !activeTab) return;
  const sel = fnrNode.querySelector('#fnrScope');
  const cfg = TYPES[activeTab];
  const editCols = cfg.cols.filter(c => c.edit && !c.hide);
  sel.innerHTML = '<option value="all">All editable fields</option>';
  editCols.forEach(c => {
    sel.innerHTML += `<option value="${c.k}">${c.h}</option>`;
  });
}

function buildRegex() {
  if (!fnrNode) return null;
  const findVal = fnrNode.querySelector('#fnrFind').value;
  if (!findVal) return null;
  const caseSensitive = fnrNode.querySelector('#fnrCase').checked;
  const wholeWord = fnrNode.querySelector('#fnrWord').checked;
  const useRegex = fnrNode.querySelector('#fnrRegex').checked;
  let pattern;
  try {
    if (useRegex) {
      pattern = findVal;
    } else {
      pattern = findVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) pattern = `\\b${pattern}\\b`;
    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  } catch (e) {
    return null;
  }
}

function getTargetCols() {
  if (!fnrNode || !activeTab) return [];
  const scope = fnrNode.querySelector('#fnrScope').value;
  const cfg = TYPES[activeTab];
  if (scope === 'all') return cfg.cols.filter(c => c.edit && !c.hide);
  return cfg.cols.filter(c => c.k === scope);
}

function doFind() {
  const regex = buildRegex();
  const results = fnrNode.querySelector('#fnrResults');
  if (!regex) { results.textContent = ''; return; }
  const cols = getTargetCols();
  const s = S[activeTab];
  let matchCount = 0, rowCount = 0;
  for (let i = 0; i < s.cur.length; i++) {
    let rowHit = false;
    for (const col of cols) {
      if (!isCellEditable(activeTab, s.cur[i], col.k)) continue;
      const v = s.cur[i][col.k] || '';
      const matches = v.match(regex);
      if (matches) { matchCount += matches.length; rowHit = true; }
    }
    if (rowHit) rowCount++;
  }
  results.innerHTML = matchCount > 0
    ? `Found <strong>${matchCount}</strong> match${matchCount !== 1 ? 'es' : ''} in <strong>${rowCount}</strong> row${rowCount !== 1 ? 's' : ''}`
    : 'No matches found';
}

function doReplaceAll() {
  const regex = buildRegex();
  if (!regex) { toast('Enter a search term first', 'err'); return; }
  const replaceVal = fnrNode.querySelector('#fnrReplace').value;
  const cols = getTargetCols();
  const s = S[activeTab];
  let matchCount = 0, rowCount = 0;
  for (let i = 0; i < s.cur.length; i++) {
    let rowHit = false;
    for (const col of cols) {
      if (!isCellEditable(activeTab, s.cur[i], col.k)) continue;
      const v = s.cur[i][col.k] || '';
      // We need a fresh regex each time since 'g' flag is stateful
      const re = new RegExp(regex.source, regex.flags);
      const matches = v.match(re);
      if (matches) {
        matchCount += matches.length;
        rowHit = true;
        setCellValue(activeTab, i, col.k, v.replace(new RegExp(regex.source, regex.flags), replaceVal));
      }
    }
    if (rowHit) rowCount++;
  }
  if (matchCount > 0) {
    runValidation(activeTab);
    renderPreflight();
    toast(`Replaced ${matchCount} match${matchCount !== 1 ? 'es' : ''} in ${rowCount} row${rowCount !== 1 ? 's' : ''}`, 'ok');
    renderTable();
    renderInspector();
    updateBar();
    updateTabBadges();
    doFind(); // refresh count
  } else {
    toast('No matches found', 'inf');
  }
}
