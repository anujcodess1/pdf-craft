import { state } from '../editor-state.js';
import { renderPageThumbnail } from '../pdf-engine.js';
let sidebarEl = null;
export function initThumbnailNav() {
  sidebarEl = document.getElementById('thumbnail-sidebar');
  if (!sidebarEl) return;
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const closeBtn = document.getElementById('btn-close-sidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('open');
      if (sidebarEl.classList.contains('open')) {
        updateThumbnails();
      }
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebarEl.classList.remove('open');
    });
  }
  state.subscribe((type) => {
    if (type === 'PAGES_RENDERED' || type === 'PAGE_ROTATED' || type === 'PAGE_DELETED') {
      if (sidebarEl.classList.contains('open')) {
        updateThumbnails();
      }
    }
  });
}
export async function updateThumbnails() {
  if (!sidebarEl) return;
  const listContainer = sidebarEl.querySelector('.thumbnail-sidebar-content');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  for (const page of state.pages) {
    const card = document.createElement('div');
    card.className = 'thumb-card';
    card.id = `thumb-card-${page.pageNum}`;
    const canvas = document.createElement('canvas');
    canvas.className = 'thumb-canvas';
    const num = document.createElement('div');
    num.className = 'thumb-num';
    num.textContent = `Page ${page.pageNum}`;
    card.appendChild(canvas);
    card.appendChild(num);
    listContainer.appendChild(card);
    card.addEventListener('click', () => {
      const targetPage = document.getElementById(`page-container-${page.pageNum}`);
      if (targetPage) {
        targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      listContainer.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    renderPageThumbnail(page.pageNum, canvas);
  }
}