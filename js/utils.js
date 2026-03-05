/* ===== UTILS ===== */
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toast(msg, cls = 'inf') {
  const t = Q('#toast'); t.textContent = msg; t.className = `toast ${cls} vis`;
  setTimeout(() => t.classList.remove('vis'), 3000);
}

