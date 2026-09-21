import { state } from '../editor-state.js';
let contextToolbarEl = null;
const COLOR_SWATCHES = [
  '#000000', '#424242', '#757575', '#BDBDBD', '#E0E0E0', '#FFFFFF', 'transparent',
  '#B71C1C', '#D32F2F', '#F44336', '#EF5350', '#E57373', '#FFCDD2',
  '#01579B', '#0288D1', '#03A9F4', '#4FC3F7', '#81D4FA', '#E1F5FE',
  '#1B5E20', '#388E3C', '#4CAF50', '#81C784', '#A5D6A7', '#E8F5E9',
  '#F57F17', '#FBC02D', '#FFEB3B', '#FFF59D', '#FFF9C4', '#FFFDE7',
  '#4A148C', '#7B1FA2', '#9C27B0', '#BA68C8', '#CE93D8', '#F3E5F5',
];
export function initContextMenu() {
  contextToolbarEl = document.getElementById('context-toolbar');
  if (!contextToolbarEl) return;
  state.subscribe((type, payload) => {
    if (type === 'ANNOTATION_SELECTED') {
      showContextMenuFor(payload.annotation);
    } else if (type === 'SELECTION_CLEARED' || type === 'ANNOTATION_DELETED') {
      hideContextMenu();
    }
  });
  buildColorSwatches();
  bindToolbarButtons();
}
function showContextMenuFor(ann) {
  if (!contextToolbarEl || !ann) return;
  const targetDom = document.getElementById(ann.id);
  if (!targetDom) {
    hideContextMenu();
    return;
  }
  const textControls = contextToolbarEl.querySelector('.context-text-controls');
  const shapeControls = contextToolbarEl.querySelector('.context-shape-controls');
  const colorBtn = contextToolbarEl.querySelector('#context-btn-color');
  const colorWrapper = colorBtn ? colorBtn.parentElement : null;
  if (ann.type === 'text') {
    textControls.style.display = 'flex';
    shapeControls.style.display = 'none';
    if (colorWrapper) colorWrapper.style.display = 'block';
    const sizeInput = contextToolbarEl.querySelector('#context-font-size');
    const fontSelect = contextToolbarEl.querySelector('#context-font-family');
    const boldBtn = contextToolbarEl.querySelector('#context-btn-bold');
    const italicBtn = contextToolbarEl.querySelector('#context-btn-italic');
    if (sizeInput) sizeInput.value = ann.fontSize || 16;
    if (fontSelect) fontSelect.value = ann.fontFamily || 'Helvetica';
    if (boldBtn) boldBtn.classList.toggle('active', !!ann.bold);
    if (italicBtn) italicBtn.classList.toggle('active', !!ann.italic);
  } else if (ann.type === 'shape') {
    textControls.style.display = 'none';
    shapeControls.style.display = 'flex';
    if (colorWrapper) colorWrapper.style.display = 'block';
  } else {
    textControls.style.display = 'none';
    shapeControls.style.display = 'none';
    if (colorWrapper) colorWrapper.style.display = 'none';
  }
  contextToolbarEl.classList.add('visible');
  const rect = targetDom.getBoundingClientRect();
  const toolbarWidth = contextToolbarEl.offsetWidth || 120;
  const topPos = window.scrollY + rect.top - 46;
  const leftPos = window.scrollX + rect.left + (rect.width / 2) - (toolbarWidth / 2);
  contextToolbarEl.style.top = `${Math.max(topPos, 70)}px`;
  contextToolbarEl.style.left = `${Math.max(leftPos, 20)}px`;
}
export function hideContextMenu() {
  if (contextToolbarEl) {
    contextToolbarEl.classList.remove('visible');
    closeAllContextDropdowns();
  }
}
function bindToolbarButtons() {
  const sizeInput = document.getElementById('context-font-size');
  if (sizeInput) {
    sizeInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value) || 16;
      if (state.selectedAnnotation) {
        state.updateAnnotation(state.selectedAnnotation.id, { fontSize: val });
        const dom = document.getElementById(state.selectedAnnotation.id);
        if (dom) dom.style.fontSize = `${val * state.scale}px`;
      }
    });
  }
  const fontSelect = document.getElementById('context-font-family');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (state.selectedAnnotation) {
        state.updateAnnotation(state.selectedAnnotation.id, { fontFamily: val });
        const dom = document.getElementById(state.selectedAnnotation.id);
        if (dom) dom.style.fontFamily = val;
      }
    });
  }
  const boldBtn = document.getElementById('context-btn-bold');
  if (boldBtn) {
    boldBtn.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        const isBold = !state.selectedAnnotation.bold;
        state.updateAnnotation(state.selectedAnnotation.id, { bold: isBold });
        boldBtn.classList.toggle('active', isBold);
        const dom = document.getElementById(state.selectedAnnotation.id);
        if (dom) dom.style.fontWeight = isBold ? '700' : '400';
      }
    });
  }
  const italicBtn = document.getElementById('context-btn-italic');
  if (italicBtn) {
    italicBtn.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        const isItalic = !state.selectedAnnotation.italic;
        state.updateAnnotation(state.selectedAnnotation.id, { italic: isItalic });
        italicBtn.classList.toggle('active', isItalic);
        const dom = document.getElementById(state.selectedAnnotation.id);
        if (dom) dom.style.fontStyle = isItalic ? 'italic' : 'normal';
      }
    });
  }
  const colorBtn = document.getElementById('context-btn-color');
  const colorDropdown = document.getElementById('context-color-dropdown');
  if (colorBtn && colorDropdown) {
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorDropdown.classList.toggle('show');
    });
  }
  const cloneBtn = document.getElementById('context-btn-clone');
  if (cloneBtn) {
    cloneBtn.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        const clone = JSON.parse(JSON.stringify(state.selectedAnnotation));
        clone.id = null;
        clone.x += 15;
        clone.y += 15;
        state.addAnnotation(state.selectedAnnotation.pageNum, clone);
      }
    });
  }
  const deleteBtn = document.getElementById('context-btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        state.deleteAnnotation(state.selectedAnnotation.id);
      }
    });
  }
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.context-toolbar')) {
      closeAllContextDropdowns();
    }
  });
}
function buildColorSwatches() {
  const grid = document.getElementById('context-color-swatches');
  if (!grid) return;
  grid.innerHTML = '';
  COLOR_SWATCHES.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    if (color === 'transparent') {
      swatch.style.background = 'linear-gradient(45deg, #fff 40%, red 45%, red 55%, #fff 60%)';
    }
    swatch.addEventListener('click', () => {
      if (state.selectedAnnotation) {
        if (state.selectedAnnotation.type === 'text') {
          state.updateAnnotation(state.selectedAnnotation.id, { color });
          const dom = document.getElementById(state.selectedAnnotation.id);
          if (dom) dom.style.color = color;
        } else if (state.selectedAnnotation.type === 'shape') {
          state.updateAnnotation(state.selectedAnnotation.id, { fillColor: color });
          const dom = document.getElementById(state.selectedAnnotation.id);
          if (dom) dom.style.backgroundColor = color;
        }
      }
      closeAllContextDropdowns();
    });
    grid.appendChild(swatch);
  });
}
function closeAllContextDropdowns() {
  document.querySelectorAll('.color-picker-dropdown').forEach(d => d.classList.remove('show'));
}