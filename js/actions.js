/* ===== BOTTOM BAR ===== */
function updateBar() {
  renderWorkspaceHead();
  let total = 0;
  Object.keys(TYPES).forEach(t => { if (S[t].loaded) total += modCount(t); });
  Q('#barN').textContent = total;
  Q('#barTxt').innerHTML = `<strong>${total} change${total !== 1 ? 's' : ''}</strong> across files`;
  Q('#bar').classList.toggle('show', total > 0);

  // Export menu
  const items = Object.keys(TYPES).filter(t => S[t].loaded && modCount(t) > 0).map(t =>
    `<div class="dd-item" data-et="${t}">${SVG.download} ${TYPES[t].label} (${modCount(t)} changes)</div>`
  ).join('');
  Q('#exportMenu').innerHTML = items + `<div class="dd-item" data-et="all" style="font-weight:600">${SVG.download} Export All Modified</div>`;
  Q('#exportMenu').querySelectorAll('.dd-item').forEach(it => it.addEventListener('click', () => {
    Q('#exportMenu').classList.remove('open');
    exportFiles(it.dataset.et);
  }));
}

Q('#barExport').addEventListener('click', () => toggleDropdown(Q('#barExport'), Q('#exportMenu')));
document.addEventListener('click', e => { if (!e.target.closest('.dd')) QA('.dd-menu').forEach(m => m.classList.remove('open')); });

Q('#barRevert').addEventListener('click', () => {
  Object.keys(TYPES).forEach(t => {
    if (!S[t].loaded) return;
    S[t].cur = S[t].orig.map(r => ({ ...r }));
    S[t].rawCur = S[t].rawOrig.map(r => [...r]);
    S[t].sel = new Set();
    runValidation(t);
  });
  toast('All reverted', 'inf');
  render();
});

/* ===== REVIEW ===== */
Q('#barReview').addEventListener('click', showReview);
Q('#reviewFilterAll').addEventListener('click', () => {
  reviewRiskOnly = false;
  Q('#reviewFilterAll').classList.add('on');
  Q('#reviewFilterRisky').classList.remove('on');
  showReview();
});
Q('#reviewFilterRisky').addEventListener('click', () => {
  reviewRiskOnly = true;
  Q('#reviewFilterRisky').classList.add('on');
  Q('#reviewFilterAll').classList.remove('on');
  showReview();
});

function isRiskyDiff(k, oldVal, newVal) {
  if (RISKY_FIELDS.has(k)) return true;
  if (String(oldVal || '').includes('\n') || String(newVal || '').includes('\n')) return true;
  if (k.toLowerCase().includes('budget') || k.toLowerCase().includes('bid')) return true;
  return false;
}

function showReview() {
  let html = '';
  Object.keys(TYPES).forEach(t => {
    if (!S[t].loaded) return;
    const cfg = TYPES[t]; const s = S[t]; let sec = '';
    for (let i = 0; i < s.cur.length; i++) {
      if (!isModified(t, i)) continue;
      let diffs = cfg.cols.filter(c => s.orig[i][c.k] !== s.cur[i][c.k]).map(c => ({
        k: c.k, h: c.h, old: s.orig[i][c.k], nw: s.cur[i][c.k]
      }));
      if (reviewRiskOnly) diffs = diffs.filter(d => isRiskyDiff(d.k, d.old, d.nw));
      if (!diffs.length) continue;
      const name = s.cur[i][cfg.nameField] || s.cur[i][cfg.idField] || `#${i}`;
      sec += `<div class="diff-item"><div class="name">${esc(name)} <span class="c-id">${s.cur[i][cfg.idField]}</span></div>`;
      diffs.forEach(d => {
        const risky = isRiskyDiff(d.k, d.old, d.nw);
        sec += `<div class="diff-row"><span class="diff-field">${d.h}:</span><span class="diff-old">${esc(d.old || '(empty)')}</span><span class="diff-arrow">→</span><span class="diff-new">${esc(d.nw || '(empty)')}</span>${risky ? '<span class="risk-tag">Risky</span>' : ''}</div>`;
      });
      sec += '</div>';
    }
    if (sec) html += `<h3>${cfg.icon} ${cfg.label}</h3>${sec}`;
  });
  Q('#reviewBody').innerHTML = html || '<div class="empty">No changes</div>';
  Q('#reviewModal').classList.add('open');
}
Q('#reviewModal').addEventListener('click', e => { if (e.target.id === 'reviewModal') e.target.classList.remove('open'); });
Q('#reviewExport').addEventListener('click', () => { Q('#reviewModal').classList.remove('open'); exportFiles('all'); });

/* ===== EXPORT ===== */
function exportFiles(which) {
  const types = which === 'all'
    ? Object.keys(TYPES).filter(t => S[t].loaded && modCount(t) > 0)
    : [which];
  if (!types.length) { toast('Nothing to export', 'inf'); return; }
  const blocked = types.filter(t => {
    runValidation(t);
    return (S[t].preflightStatic.errors.length + S[t].validation.errors) > 0;
  });
  if (blocked.length) {
    activeTab = blocked[0];
    render();
    toast(`Fix errors in ${blocked.map(t => TYPES[t].label).join(', ')}`, 'err');
    return;
  }
  types.forEach(exportOne);
}

function exportOne(type) {
  const cfg = TYPES[type]; const s = S[type];
  let lines = [...s.hdrLines, s.hdrRow];

  if (s.rawCur.length) {
    s.rawCur.forEach(row => {
      const vals = row.map(v => `"${(v || '').replace(/"/g, '""')}"`);
      lines.push(vals.join('\t'));
    });
  } else {
    s.cur.forEach(r => {
      const vals = cfg.cols.map(c => {
        const v = (r[c.k] || '').replace(/"/g, '""');
        return `"${v}"`;
      });
      lines.push(vals.join('\t'));
    });
  }

  const content = lines.join('\n');
  // UTF-16LE + BOM
  const bom = new Uint8Array([0xFF, 0xFE]);
  const buf = new Uint8Array(content.length * 2);
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    buf[i * 2] = code & 0xFF;
    buf[i * 2 + 1] = (code >> 8) & 0xFF;
  }
  const blob = new Blob([bom, buf], { type: 'text/csv;charset=utf-16le' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const d = new Date();
  const ds = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
  const fn = type === 'campaigns' ? 'campaign' : type === 'adsets' ? 'ad_set' : 'ad';
  a.download = `${fn}_Edit_${ds}_modified.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${cfg.label} exported (${modCount(type)} changes)`, 'ok');
}

