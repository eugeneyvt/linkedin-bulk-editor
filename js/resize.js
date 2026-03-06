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
    const ci = resizing.th.dataset.ci;
    const nth = +ci + 2; // +1 checkbox column, nth-child is 1-based
    const zone = Q('#tableZone');
    const headTable = zone?.querySelector('table.table-head');
    const bodyTable = zone?.querySelector('table.table-body');

    if (headTable) {
      const th = headTable.querySelector(`thead th:nth-child(${nth})`);
      if (th) {
        th.style.width = newW + 'px';
        th.style.minWidth = newW + 'px';
        th.style.maxWidth = newW + 'px';
      }
    }
    if (bodyTable) {
      bodyTable.querySelectorAll(`tbody td:nth-child(${nth})`).forEach(td => {
        td.style.width = newW + 'px';
        td.style.minWidth = newW + 'px';
        td.style.maxWidth = newW + 'px';
      });
    }

    // Backward compatibility for legacy single-table layout.
    if (!headTable && !bodyTable) {
      const table = resizing.th.closest('table');
      if (table) {
        table.querySelectorAll(`tbody td:nth-child(${nth})`).forEach(td => {
          td.style.width = newW + 'px';
          td.style.minWidth = newW + 'px';
          td.style.maxWidth = newW + 'px';
        });
      }
    }
    if (typeof window.refreshPinnedLayout === 'function') window.refreshPinnedLayout();
    if (typeof window.refreshBottomXScroll === 'function') window.refreshBottomXScroll();
  });
  document.addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing.handle.classList.remove('dragging');
    resizing = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();
