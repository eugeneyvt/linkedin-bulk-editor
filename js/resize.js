/* ===== COLUMN RESIZE ===== */
(function () {
  let resizing = null;
  document.addEventListener('mousedown', e => {
    if (!e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    const th = e.target.parentElement;
    const startX = e.clientX;
    const startW = th.offsetWidth;
    e.target.classList.add('dragging');
    resizing = { th, startX, startW, handle: e.target };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const diff = e.clientX - resizing.startX;
    const newW = Math.max(40, resizing.startW + diff);
    resizing.th.style.width = newW + 'px';
    resizing.th.style.minWidth = newW + 'px';
    resizing.th.style.maxWidth = newW + 'px';
    // Also set on the td cells in the same column
    const ci = resizing.th.dataset.ci;
    const table = resizing.th.closest('table');
    if (table) {
      table.querySelectorAll(`tbody td:nth-child(${+ci + 2})`).forEach(td => {
        td.style.width = newW + 'px';
        td.style.minWidth = newW + 'px';
        td.style.maxWidth = newW + 'px';
      });
    }
  });
  document.addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing.handle.classList.remove('dragging');
    resizing = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

