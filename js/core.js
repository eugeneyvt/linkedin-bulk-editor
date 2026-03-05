const Q = s => document.querySelector(s);
const QA = s => document.querySelectorAll(s);

function toggleDropdown(btn, menu) {
  const isOpen = menu.classList.contains('open');
  QA('.dd-menu').forEach(m => m.classList.remove('open'));
  if (isOpen) return;
  menu.classList.add('open');
  const r = btn.getBoundingClientRect();
  const mh = menu.offsetHeight;
  const spaceBelow = window.innerHeight - r.bottom;
  const spaceAbove = r.top;
  if (spaceBelow >= mh || spaceBelow >= spaceAbove) {
    menu.style.top = r.bottom + 4 + 'px';
    menu.style.bottom = 'auto';
  } else {
    menu.style.bottom = (window.innerHeight - r.top + 4) + 'px';
    menu.style.top = 'auto';
  }
  menu.style.left = r.left + 'px';
}

