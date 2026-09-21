import confetti from 'canvas-confetti';
import * as pdfjsLib from 'pdfjs-dist';
import { state } from './editor-state.js';
import { renderPdfDocument, reRenderSinglePage } from './pdf-engine.js';
import { exportModifiedPdf } from './pdf-exporter.js';
import { createSamplePdf, createBlankPdf } from './sample-doc.js';
import { initSignatureModal, openSignatureModal } from './ui/signature-modal.js';
import { initContextMenu } from './ui/context-menu.js';
import { initThumbnailNav } from './ui/thumbnail-nav.js';
import { initInteractionManager } from './tools/interaction-manager.js';
import { showToast, showLoading, hideLoading } from './ui/notifications.js';
let exportedPdfData = null;
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
function initApp() {
  initSignatureModal();
  initContextMenu();
  initThumbnailNav();
  initInteractionManager();
  showPage('home');
  setupHeaderNavigation();
  setupUploadListeners();
  setupToolbarListeners();
  setupExportListeners();
  state.subscribe((type, payload) => {
    if (type === 'PDF_LOADED') {
      showEditorWorkspace();
    } else if (type === 'INSERT_BLANK_PAGE') {
      handleInsertBlankPage(payload.afterPage);
    } else if (type === 'DOCUMENT_RESET') {
      showPage('home');
    }
  });
}
export function showPage(pageName) {
  const stepUpload = document.getElementById('step-upload');
  const stepEditor = document.getElementById('step-editor');
  const stepSuccess = document.getElementById('step-success');
  const navHome = document.getElementById('nav-home');
  const navEditor = document.getElementById('nav-editor');
  const hasPages = Boolean(state.pdfBytes && state.pages && state.pages.length > 0);
  if (pageName === 'editor' && !hasPages) {
    pageName = 'home';
  }
  if (navEditor) {
    navEditor.style.display = hasPages ? 'inline-flex' : 'none';
  }
  if (pageName === 'home') {
    if (stepUpload) stepUpload.style.display = 'block';
    if (stepEditor) stepEditor.classList.remove('active');
    if (stepSuccess) stepSuccess.classList.remove('active');
    navHome?.classList.add('active');
    navEditor?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (pageName === 'editor') {
    if (stepUpload) stepUpload.style.display = 'none';
    if (stepEditor) stepEditor.classList.add('active');
    if (stepSuccess) stepSuccess.classList.remove('active');
    navHome?.classList.remove('active');
    navEditor?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (pageName === 'preview') {
    if (stepUpload) stepUpload.style.display = 'none';
    if (stepEditor) stepEditor.classList.remove('active');
    if (stepSuccess) stepSuccess.classList.add('active');
    navHome?.classList.remove('active');
    navEditor?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
function setupHeaderNavigation() {
  document.getElementById('nav-brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('home');
  });
  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('home');
  });
  document.getElementById('nav-editor')?.addEventListener('click', (e) => {
    e.preventDefault();
    const hasPages = Boolean(state.pdfBytes && state.pages && state.pages.length > 0);
    if (hasPages) {
      showPage('editor');
    } else {
      showToast('No document loaded yet. Please upload a PDF or choose a template.', 'info');
      showPage('home');
    }
  });
}
function setupUploadListeners() {
  const fileInput = document.getElementById('pdf-file-input');
  const dropZone = document.getElementById('drop-zone-card');
  const btnBlank = document.getElementById('btn-start-blank');
  const btnSample = document.getElementById('btn-start-sample');
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      showLoading('Loading PDF document...');
      try {
        const buffer = await file.arrayBuffer();
        state.setPdf(new Uint8Array(buffer), file.name);
      } catch (err) {
        showToast('Failed to parse PDF file: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    } else if (file) {
      showToast('Please select a valid .pdf document', 'error');
    }
  });
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });
    dropZone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        showLoading('Loading dropped PDF...');
        try {
          const buffer = await file.arrayBuffer();
          state.setPdf(new Uint8Array(buffer), file.name);
        } catch (err) {
          showToast('Failed to load PDF: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      }
    });
  }
  btnBlank?.addEventListener('click', async (e) => {
    e.preventDefault();
    showLoading('Creating blank document...');
    try {
      const bytes = await createBlankPdf();
      state.setPdf(bytes, 'blank_document.pdf');
    } catch (err) {
      showToast('Error creating blank PDF: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
  btnSample?.addEventListener('click', async (e) => {
    e.preventDefault();
    showLoading('Generating sample agreement document...');
    try {
      const bytes = await createSamplePdf();
      state.setPdf(bytes, 'pdfcraft_sample_agreement.pdf');
    } catch (err) {
      showToast('Error loading sample PDF: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}
async function showEditorWorkspace() {
  const container = document.getElementById('edit-pages-container');
  showLoading('Rendering PDF pages...');
  try {
    await renderPdfDocument(container);
    if (!state.pages || state.pages.length === 0) {
      showToast('Document has no pages to edit', 'error');
      showPage('home');
      return;
    }
    showPage('editor');
    showToast(`Loaded ${state.pages.length} page${state.pages.length > 1 ? 's' : ''}`, 'success', 2000);
  } catch (err) {
    console.error(err);
    showToast('Rendering error: ' + err.message, 'error');
    showPage('home');
  } finally {
    hideLoading();
  }
}
function setupToolbarListeners() {
  const toolsMenu = document.getElementById('tools-menu');
  if (!toolsMenu) return;
  const toolBtns = toolsMenu.querySelectorAll('.btn-tool[data-tool]');
  toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tool = btn.dataset.tool;
      const sub = btn.dataset.subtool || null;
      const parentGroup = btn.closest('.tool-group');
      const dropdown = parentGroup?.querySelector('.tool-dropdown-menu');
      if (dropdown && e.target.closest('.btn-tool-caret')) {
        closeAllToolDropdowns(dropdown);
        dropdown.classList.toggle('show');
        return;
      }
      closeAllToolDropdowns();
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (tool === 'sign') {
        openSignatureModal();
      } else {
        state.setActiveTool(tool, sub);
      }
    });
  });
  document.querySelectorAll('.tool-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tool = item.dataset.tool;
      const sub = item.dataset.subtool;
      closeAllToolDropdowns();
      toolBtns.forEach(b => b.classList.remove('active'));
      const parentBtn = item.closest('.tool-group')?.querySelector('.btn-tool');
      if (parentBtn) parentBtn.classList.add('active');
      if (tool === 'sign' && sub === 'new') {
        openSignatureModal();
      } else {
        state.setActiveTool(tool, sub);
        if (tool === 'annotate') {
          state.toolProps.annotateType = sub;
          if (sub === 'draw') {
            state.setActiveTool('draw');
          }
        }
      }
    });
  });
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    state.setZoom(state.scale + 0.15);
    updateZoomDisplay();
    reRenderAllPages();
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    state.setZoom(state.scale - 0.15);
    updateZoomDisplay();
    reRenderAllPages();
  });
  document.getElementById('btn-undo')?.addEventListener('click', () => {
    if (state.undo()) {
      showToast('Undo performed', 'info', 1500);
    } else {
      showToast('Nothing to undo', 'info', 1500);
    }
  });
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.tool-group')) {
      closeAllToolDropdowns();
    }
  });
}
function updateZoomDisplay() {
  const el = document.getElementById('zoom-level-text');
  if (el) {
    el.textContent = `${Math.round((state.scale / 1.25) * 100)}%`;
  }
}
async function reRenderAllPages() {
  const container = document.getElementById('edit-pages-container');
  showLoading('Zooming pages...');
  await renderPdfDocument(container);
  hideLoading();
}
function closeAllToolDropdowns(except = null) {
  document.querySelectorAll('.tool-dropdown-menu').forEach(d => {
    if (d !== except) d.classList.remove('show');
  });
}
function setupExportListeners() {
  const applyBtn = document.getElementById('btn-apply-changes');
  applyBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    showLoading('Applying changes & compiling PDF document...');
    try {
      exportedPdfData = await exportModifiedPdf();
      showPage('preview');
      const fileNameEl = document.getElementById('success-filename');
      const metaEl = document.getElementById('success-meta');
      if (fileNameEl) fileNameEl.textContent = exportedPdfData.fileName;
      if (metaEl) {
        const sizeFormatted = (exportedPdfData.sizeBytes / 1024).toFixed(1);
        metaEl.textContent = `${exportedPdfData.pageCount} page${exportedPdfData.pageCount > 1 ? 's' : ''} • ${sizeFormatted} KB`;
      }
      await renderExportPreview(exportedPdfData.bytes || exportedPdfData.pdfBytes);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      showToast('Changes applied! Review your edited PDF preview below before downloading.', 'success', 4000);
    } catch (err) {
      console.error(err);
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
  const triggerDownload = (e) => {
    if (e) e.preventDefault();
    if (exportedPdfData && exportedPdfData.downloadUrl) {
      const a = document.createElement('a');
      a.href = exportedPdfData.downloadUrl;
      a.download = exportedPdfData.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Downloaded ' + exportedPdfData.fileName, 'success');
    } else {
      showToast('No exported document available to download', 'error');
    }
  };
  document.getElementById('btn-download-pdf')?.addEventListener('click', triggerDownload);
  document.getElementById('btn-download-pdf-bottom')?.addEventListener('click', triggerDownload);
  const handleReturnToEditor = (e) => {
    if (e) e.preventDefault();
    showPage('editor');
  };
  document.getElementById('btn-continue-editing')?.addEventListener('click', handleReturnToEditor);
  document.getElementById('btn-continue-editing-bottom')?.addEventListener('click', handleReturnToEditor);
  document.getElementById('btn-edit-another')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.reset();
    showToast('Ready for a new document', 'info');
  });
}
async function renderExportPreview(pdfBytes) {
  const container = document.getElementById('preview-pages-container');
  if (!container) return;
  container.innerHTML = `
    <div class="preview-loading">
      <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--sejda-green); font-size: 24px;"></i>
      <span>Rendering high-resolution document preview...</span>
    </div>
  `;
  try {
    if (!pdfBytes) {
      throw new Error('No PDF byte data was received from the exporter.');
    }
    let uint8Data;
    if (pdfBytes instanceof Uint8Array) {
      uint8Data = new Uint8Array(pdfBytes);
    } else if (pdfBytes instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(pdfBytes);
    } else if (ArrayBuffer.isView(pdfBytes)) {
      uint8Data = new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);
    } else {
      throw new Error('Invalid PDF data format: expected Uint8Array or ArrayBuffer.');
    }
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/cmaps/',
      cMapPacked: true,
    });
    const pdfDoc = await loadingTask.promise;
    container.innerHTML = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const vp = page.getViewport({ scale: 1.15 });
      const pageCard = document.createElement('div');
      pageCard.className = 'preview-page-card';
      const pageHeader = document.createElement('div');
      pageHeader.className = 'preview-page-header';
      pageHeader.innerHTML = `
        <span><i class="fa-regular fa-file-lines" style="color: var(--sejda-green-dark);"></i> Page ${i} of ${pdfDoc.numPages}</span>
        <span style="font-size: 11px; color: #94a3b8;">${Math.round(vp.width)} × ${Math.round(vp.height)} pt</span>
      `;
      const canvas = document.createElement('canvas');
      canvas.className = 'preview-page-canvas';
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(vp.width * outputScale);
      canvas.height = Math.floor(vp.height * outputScale);
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(outputScale, outputScale);
      pageCard.appendChild(pageHeader);
      pageCard.appendChild(canvas);
      container.appendChild(pageCard);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
  } catch (err) {
    console.error('Failed to render export preview:', err);
    container.innerHTML = `
      <div style="color: var(--sejda-red); padding: 30px; text-align: center; background: #fff; border-radius: 8px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 28px; margin-bottom: 10px; display: block;"></i>
        <strong style="font-size: 16px;">Failed to display live preview</strong>
        <p style="font-size: 13px; color: #666; margin-top: 6px;">${err.message}</p>
        <p style="font-size: 13px; color: #666;">You can still click the "Download PDF" button to download your compiled file.</p>
      </div>
    `;
  }
}
async function handleInsertBlankPage(afterPageNum) {
  showLoading('Inserting blank page...');
  try {
    const newPageNum = afterPageNum + 1;
    for (const page of state.pages) {
      if (page.pageNum >= newPageNum) {
        page.pageNum++;
      }
    }
    const container = document.getElementById('edit-pages-container');
    await renderPdfDocument(container);
    showToast(`Inserted blank page at position ${newPageNum}`, 'success');
  } catch (err) {
    showToast('Failed to insert page: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}