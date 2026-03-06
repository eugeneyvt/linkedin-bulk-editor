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
