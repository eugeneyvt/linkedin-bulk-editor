const Q = s => document.querySelector(s);
const QA = s => document.querySelectorAll(s);

function toggleDropdown(btn, menu) {
  const isOpen = menu.classList.contains('open');
  QA('.dd-menu').forEach(m => m.classList.remove('open'));
  if (isOpen) return;

  // Menus opened from the transformed bottom bar must live under <body>,
  // otherwise fixed positioning is calculated against the transformed parent.
  if (btn.closest('.bar') && menu.parentElement !== document.body) {
    document.body.appendChild(menu);
  }

  menu.classList.add('open');
  const r = btn.getBoundingClientRect();
  const mh = menu.offsetHeight;
  const mw = menu.offsetWidth;
  const gap = 8;
  const spaceBelow = window.innerHeight - r.bottom;
  const spaceAbove = r.top;
  if (spaceBelow >= mh || spaceBelow >= spaceAbove) {
    menu.style.top = r.bottom + 4 + 'px';
    menu.style.bottom = 'auto';
  } else {
    menu.style.bottom = (window.innerHeight - r.top + 4) + 'px';
    menu.style.top = 'auto';
  }

  // Keep dropdown fully inside viewport horizontally
  let left = r.left;
  if (left + mw > window.innerWidth - gap) left = r.right - mw;
  if (left < gap) left = gap;
  menu.style.left = `${left}px`;
}
