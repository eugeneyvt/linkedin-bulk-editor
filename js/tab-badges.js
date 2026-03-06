function updateTabBadges() {
  QA('.tab').forEach(tab => {
    const t = tab.dataset.t; const m = modCount(t);
    const ex = tab.querySelector('.mod-badge');
    if (m > 0) {
      if (ex) ex.textContent = `${m}✎`;
      else { const sp = document.createElement('span'); sp.className = 'mod-badge'; sp.textContent = `${m}✎`; tab.appendChild(sp); }
    } else if (ex) ex.remove();
  });
}

