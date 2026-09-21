import { state } from '../editor-state.js';
import { showToast } from './notifications.js';
let signatureModalEl = null;
let currentTab = 'type';
let activeFontFamily = 'Caveat';
let drawCanvas, drawCtx;
let isDrawing = false;
let uploadedSignatureDataUrl = null;
const SIGNATURE_FONTS = [
  { name: 'Caveat', font: "'Caveat', cursive" },
  { name: 'Dancing Script', font: "'Dancing Script', cursive" },
  { name: 'Pacifico', font: "'Pacifico', cursive" },
  { name: 'Great Vibes', font: "'Great Vibes', cursive" },
  { name: 'Sacramento', font: "'Sacramento', cursive" },
  { name: 'Marck Script', font: "'Marck Script', cursive" },
];
export function initSignatureModal() {
  signatureModalEl = document.getElementById('signature-modal-backdrop');
  if (!signatureModalEl) return;
  const tabs = signatureModalEl.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.tab;
      switchTab(target);
    });
  });
  const typeInput = document.getElementById('type-sig-input');
  const fontsGrid = document.getElementById('sig-fonts-grid');
  function updateTypeFontPreviews() {
    const text = typeInput.value.trim() || 'Your Name';
    fontsGrid.innerHTML = '';
    SIGNATURE_FONTS.forEach(item => {
      const opt = document.createElement('div');
      opt.className = `sig-font-option ${item.name === activeFontFamily ? 'selected' : ''}`;
      opt.style.fontFamily = item.font;
      opt.textContent = text;
      opt.addEventListener('click', () => {
        activeFontFamily = item.name;
        fontsGrid.querySelectorAll('.sig-font-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
      });
      fontsGrid.appendChild(opt);
    });
  }
  typeInput.addEventListener('input', updateTypeFontPreviews);
  updateTypeFontPreviews();
  drawCanvas = document.getElementById('signature-pad-canvas');
  if (drawCanvas) {
    drawCtx = drawCanvas.getContext('2d');
    initDrawingPad();
  }
  const uploadInput = document.getElementById('upload-sig-input');
  const uploadDrop = document.getElementById('upload-sig-drop');
  const uploadPreview = document.getElementById('upload-sig-preview');
  uploadDrop.addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        uploadedSignatureDataUrl = evt.target.result;
        uploadPreview.src = uploadedSignatureDataUrl;
        uploadPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
  signatureModalEl.querySelector('.btn-close-modal').addEventListener('click', closeSignatureModal);
  signatureModalEl.querySelector('.btn-modal-cancel').addEventListener('click', closeSignatureModal);
  const createBtn = document.getElementById('btn-create-signature');
  createBtn.addEventListener('click', () => {
    let signatureDataUrl = null;
    if (currentTab === 'type') {
      const text = typeInput.value.trim() || 'Signed';
      signatureDataUrl = renderTextToSignatureDataUrl(text, activeFontFamily);
    } else if (currentTab === 'draw') {
      signatureDataUrl = getTrimmedCanvasDataUrl(drawCanvas);
    } else if (currentTab === 'upload') {
      signatureDataUrl = uploadedSignatureDataUrl;
    }
    if (!signatureDataUrl) {
      showToast('Please provide a signature first', 'error');
      return;
    }
    state.addSavedSignature(signatureDataUrl);
    closeSignatureModal();
    showToast('Signature created! Click on any page to place it.', 'success');
    state.setActiveTool('sign', signatureDataUrl);
  });
}
function switchTab(tabName) {
  currentTab = tabName;
  signatureModalEl.querySelectorAll('.tab-btn').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  signatureModalEl.querySelectorAll('.tab-content-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-sig-${tabName}`);
  });
  if (tabName === 'draw') {
    resizeDrawCanvas();
  }
}
function initDrawingPad() {
  drawCanvas.addEventListener('mousedown', startDraw);
  drawCanvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', stopDraw);
  drawCanvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = drawCanvas.getBoundingClientRect();
    startDraw({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });
  drawCanvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    moveDraw({ clientX: touch.clientX, clientY: touch.clientY });
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', stopDraw);
  document.getElementById('btn-clear-sig-pad')?.addEventListener('click', () => {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  });
}
function resizeDrawCanvas() {
  const rect = drawCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  drawCanvas.width = rect.width * dpr;
  drawCanvas.height = 200 * dpr;
  drawCtx.scale(dpr, dpr);
  drawCtx.strokeStyle = '#000000';
  drawCtx.lineWidth = 3;
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
}
function startDraw(e) {
  isDrawing = true;
  const rect = drawCanvas.getBoundingClientRect();
  drawCtx.beginPath();
  drawCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}
function moveDraw(e) {
  if (!isDrawing) return;
  const rect = drawCanvas.getBoundingClientRect();
  drawCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  drawCtx.stroke();
}
function stopDraw() {
  isDrawing = false;
}
function renderTextToSignatureDataUrl(text, fontName) {
  const offCanvas = document.createElement('canvas');
  const ctx = offCanvas.getContext('2d');
  const dpr = 2;
  const fontSize = 54;
  const fontStyle = `${fontSize * dpr}px '${fontName}', cursive`;
  ctx.font = fontStyle;
  const metrics = ctx.measureText(text);
  const textWidth = Math.max(Math.ceil(metrics.width), 120);
  const textHeight = Math.ceil(fontSize * 2.2 * dpr);
  offCanvas.width = textWidth + (100 * dpr);
  offCanvas.height = textHeight;
  ctx.font = fontStyle;
  ctx.fillStyle = '#0a192f';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, offCanvas.width / 2, offCanvas.height / 2);
  return getTrimmedCanvasDataUrl(offCanvas);
}
function getTrimmedCanvasDataUrl(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasPixels = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!hasPixels) return canvas.toDataURL('image/png');
  const pad = 8;
  minX = Math.max(minX - pad, 0);
  minY = Math.max(minY - pad, 0);
  maxX = Math.min(maxX + pad, width);
  maxY = Math.min(maxY + pad, height);
  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = maxX - minX;
  trimmedCanvas.height = maxY - minY;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  trimmedCtx.drawImage(canvas, minX, minY, maxX - minX, maxY - minY, 0, 0, maxX - minX, maxY - minY);
  return trimmedCanvas.toDataURL('image/png');
}
export function openSignatureModal() {
  if (!signatureModalEl) initSignatureModal();
  signatureModalEl.classList.add('show');
  switchTab('type');
}
export function closeSignatureModal() {
  if (signatureModalEl) signatureModalEl.classList.remove('show');
}