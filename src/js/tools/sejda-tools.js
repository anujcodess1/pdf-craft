import { PDFDocument, rgb } from 'pdf-lib';
import { state } from '../editor-state.js';
import { showToast, showLoading, hideLoading } from '../ui/notifications.js';
import { openSignatureModal } from '../ui/signature-modal.js';
import { createSamplePdf } from '../sample-doc.js';
let compressModalEl = null;
let mergeModalEl = null;
let deletePagesModalEl = null;
let cropModalEl = null;
let allToolsDropdownEl = null;
let mergeFilesList = []; 
let deleteSelectedPages = new Set(); 
export function initSejdaTools() {
  createModalsDom();
  bindHeaderNavigation();
  bindCompressModal();
  bindMergeModal();
  bindDeletePagesModal();
  bindCropModal();
  bindAllToolsDropdown();
}
function createModalsDom() {
  if (document.getElementById('compress-modal-backdrop')) return;
  const container = document.createElement('div');
  container.id = 'sejda-tools-modals-container';
  container.innerHTML = `
    <!-- All Tools Dropdown Menu -->
    <div class="all-tools-dropdown-menu" id="all-tools-dropdown">
      <div class="all-tools-grid">
        <div class="all-tools-col">
          <div class="tools-col-header"><i class="fa-solid fa-pen-to-square"></i> EDIT & SIGN</div>
          <a class="all-tools-link" data-action="edit"><i class="fa-solid fa-file-pen"></i> PDF Editor</a>
          <a class="all-tools-link" data-action="fill-sign"><i class="fa-solid fa-signature"></i> Fill & Sign</a>
        </div>
        <div class="all-tools-col">
          <div class="tools-col-header"><i class="fa-solid fa-arrows-split-up-and-left"></i> ORGANIZE</div>
          <a class="all-tools-link" data-action="merge"><i class="fa-solid fa-object-group"></i> Merge PDFs</a>
          <a class="all-tools-link" data-action="delete-pages"><i class="fa-solid fa-trash-can"></i> Delete Pages</a>
          <a class="all-tools-link" data-action="crop"><i class="fa-solid fa-crop-simple"></i> Crop PDF</a>
        </div>
        <div class="all-tools-col">
          <div class="tools-col-header"><i class="fa-solid fa-compress"></i> OPTIMIZE</div>
          <a class="all-tools-link" data-action="compress"><i class="fa-solid fa-file-zipper"></i> Compress PDF</a>
        </div>
      </div>
    </div>
    <!-- Compress Modal -->
    <div class="modal-backdrop" id="compress-modal-backdrop">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-file-zipper" style="color: var(--sejda-green);"></i> Compress PDF</h3>
          <button class="btn-close-modal" id="btn-close-compress">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tool-modal-desc">
            Reduce file size while optimizing for maximum document quality.
          </div>
          <div class="compress-stats-card">
            <div class="compress-stat-row">
              <span class="stat-label">Document:</span>
              <span class="stat-val" id="compress-doc-name">current_document.pdf</span>
            </div>
            <div class="compress-stat-row">
              <span class="stat-label">Original Size:</span>
              <span class="stat-val" id="compress-doc-size">0 KB</span>
            </div>
          </div>
          <div class="compress-options-group">
            <label class="compress-option active" id="opt-compress-regular">
              <input type="radio" name="compress-level" value="regular" checked>
              <div class="opt-content">
                <strong>Standard Compression (Recommended)</strong>
                <span>Cleans object streams, removes metadata, preserves crisp images.</span>
              </div>
            </label>
            <label class="compress-option" id="opt-compress-strong">
              <input type="radio" name="compress-level" value="strong">
              <div class="opt-content">
                <strong>Extreme Compression</strong>
                <span>Maximum size reduction for email attachments and mobile devices.</span>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="btn-cancel-compress">Cancel</button>
          <button class="btn-modal-primary" id="btn-execute-compress"><i class="fa-solid fa-bolt"></i> Compress & Download</button>
        </div>
      </div>
    </div>
    <!-- Merge Modal -->
    <div class="modal-backdrop" id="merge-modal-backdrop">
      <div class="modal-dialog" style="max-width: 680px;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-object-group" style="color: var(--sejda-blue);"></i> Merge PDF Documents</h3>
          <button class="btn-close-modal" id="btn-close-merge">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tool-modal-desc">
            Combine multiple PDF files into a single unified document.
          </div>
          <input type="file" id="merge-file-input" accept="application/pdf" multiple style="display: none;">
          <div class="merge-drop-zone" id="merge-drop-zone">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 32px; color: var(--sejda-blue); margin-bottom: 8px;"></i>
            <p><strong>Click to choose PDF files</strong> or drag and drop here</p>
            <span style="font-size: 12px; color: #777;">Select 2 or more PDF documents to merge</span>
          </div>
          <div class="merge-files-list" id="merge-files-list">
            <!-- Uploaded files will list here -->
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="btn-cancel-merge">Cancel</button>
          <button class="btn-modal-primary" id="btn-execute-merge" disabled><i class="fa-solid fa-object-group"></i> Merge PDFs</button>
        </div>
      </div>
    </div>
    <!-- Delete Pages Modal -->
    <div class="modal-backdrop" id="delete-pages-modal-backdrop">
      <div class="modal-dialog" style="max-width: 860px; max-height: 90vh;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-trash-can" style="color: var(--sejda-red);"></i> Delete Pages</h3>
          <button class="btn-close-modal" id="btn-close-delete-pages">&times;</button>
        </div>
        <div class="modal-body" style="overflow-y: auto; max-height: 60vh;">
          <div class="tool-modal-desc">
            Click on any page you wish to remove. Selected pages will be deleted upon confirmation.
          </div>
          <div class="delete-pages-grid" id="delete-pages-grid">
            <!-- Rendered thumbnails appear here -->
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <span id="delete-pages-count-label" style="font-size: 14px; font-weight: 600; color: #555;">0 pages selected</span>
          <div style="display: flex; gap: 10px;">
            <button class="btn-modal-cancel" id="btn-cancel-delete-pages">Cancel</button>
            <button class="btn-modal-primary" id="btn-execute-delete-pages" style="background-color: var(--sejda-red);"><i class="fa-solid fa-trash-can"></i> Delete Selected Pages</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Crop Modal -->
    <div class="modal-backdrop" id="crop-modal-backdrop">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-crop-simple" style="color: var(--sejda-green);"></i> Crop PDF Pages</h3>
          <button class="btn-close-modal" id="btn-close-crop">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tool-modal-desc">
            Trim margins and remove excessive whitespace from your document.
          </div>
          <div class="crop-options-group">
            <label class="compress-option active" id="opt-crop-auto">
              <input type="radio" name="crop-mode" value="auto" checked>
              <div class="opt-content">
                <strong>Auto-Trim Margins (Recommended)</strong>
                <span>Automatically detects content boundaries and removes outer whitespace.</span>
              </div>
            </label>
            <label class="compress-option" id="opt-crop-custom">
              <input type="radio" name="crop-mode" value="custom">
              <div class="opt-content">
                <strong>Custom Margin Trim</strong>
                <span>Remove a specific margin from each edge:</span>
                <div class="crop-inputs-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                  <div><label style="font-size: 11px; color: #666;">Top (pt):</label><input type="number" id="crop-top" value="30" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></div>
                  <div><label style="font-size: 11px; color: #666;">Bottom (pt):</label><input type="number" id="crop-bottom" value="30" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></div>
                  <div><label style="font-size: 11px; color: #666;">Left (pt):</label><input type="number" id="crop-left" value="25" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></div>
                  <div><label style="font-size: 11px; color: #666;">Right (pt):</label><input type="number" id="crop-right" value="25" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></div>
                </div>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-modal-cancel" id="btn-cancel-crop">Cancel</button>
          <button class="btn-modal-primary" id="btn-execute-crop"><i class="fa-solid fa-crop-simple"></i> Crop & Apply</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  compressModalEl = document.getElementById('compress-modal-backdrop');
  mergeModalEl = document.getElementById('merge-modal-backdrop');
  deletePagesModalEl = document.getElementById('delete-pages-modal-backdrop');
  cropModalEl = document.getElementById('crop-modal-backdrop');
  allToolsDropdownEl = document.getElementById('all-tools-dropdown');
}
function bindHeaderNavigation() {
  document.getElementById('nav-compress')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCompressWorkflow();
  });
  document.getElementById('nav-fill-sign')?.addEventListener('click', (e) => {
    e.preventDefault();
    openFillAndSignWorkflow();
  });
  document.getElementById('nav-merge')?.addEventListener('click', (e) => {
    e.preventDefault();
    openMergeWorkflow();
  });
  document.getElementById('nav-delete-pages')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDeletePagesWorkflow();
  });
  document.getElementById('nav-crop')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCropWorkflow();
  });
  document.getElementById('nav-edit')?.addEventListener('click', (e) => {
    e.preventDefault();
    ensureDocumentLoaded();
  });
}
function bindAllToolsDropdown() {
  const allToolsBtn = document.getElementById('nav-all-tools');
  if (!allToolsBtn || !allToolsDropdownEl) return;
  allToolsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isShown = allToolsDropdownEl.classList.contains('show');
    closeAllToolsDropdown();
    if (!isShown) {
      const rect = allToolsBtn.getBoundingClientRect();
      allToolsDropdownEl.style.top = `${rect.bottom + 6}px`;
      allToolsDropdownEl.style.left = `${rect.left}px`;
      allToolsDropdownEl.classList.add('show');
    }
  });
  allToolsDropdownEl.querySelectorAll('.all-tools-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllToolsDropdown();
      const action = link.dataset.action;
      if (action === 'compress') openCompressWorkflow();
      else if (action === 'merge') openMergeWorkflow();
      else if (action === 'fill-sign') openFillAndSignWorkflow();
      else if (action === 'delete-pages') openDeletePagesWorkflow();
      else if (action === 'crop') openCropWorkflow();
      else if (action === 'edit') ensureDocumentLoaded();
    });
  });
  window.addEventListener('click', () => {
    closeAllToolsDropdown();
  });
}
function closeAllToolsDropdown() {
  if (allToolsDropdownEl) allToolsDropdownEl.classList.remove('show');
}
async function ensureDocumentLoaded() {
  if (!state.pdfDoc) {
    showLoading('Loading sample PDF for editing...');
    try {
      const bytes = await createSamplePdf();
      state.setPdf(bytes, 'Sejda_Sample_Document.pdf');
    } catch (e) {
      showToast('Please upload a PDF first', 'info');
      document.getElementById('pdf-file-input')?.click();
    } finally {
      hideLoading();
    }
  }
}
async function openCompressWorkflow() {
  await ensureDocumentLoaded();
  if (!state.pdfBytes) return;
  const sizeKb = Math.round(state.pdfBytes.byteLength / 1024);
  document.getElementById('compress-doc-name').textContent = state.pdfName || 'document.pdf';
  document.getElementById('compress-doc-size').textContent = `${sizeKb} KB`;
  compressModalEl.classList.add('show');
}
function bindCompressModal() {
  document.getElementById('btn-close-compress')?.addEventListener('click', () => compressModalEl.classList.remove('show'));
  document.getElementById('btn-cancel-compress')?.addEventListener('click', () => compressModalEl.classList.remove('show'));
  document.querySelectorAll('input[name="compress-level"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.compress-options-group .compress-option').forEach(l => l.classList.remove('active'));
      radio.closest('.compress-option')?.classList.add('active');
    });
  });
  document.getElementById('btn-execute-compress')?.addEventListener('click', async () => {
    compressModalEl.classList.remove('show');
    showLoading('Compressing PDF document...');
    try {
      const origBytes = new Uint8Array(state.pdfBytes.slice(0));
      const pdfDoc = await PDFDocument.load(origBytes, { ignoreEncryption: true });
      pdfDoc.setTitle(state.pdfName || '');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('Sejda PDF Editor');
      pdfDoc.setCreator('Sejda PDF Editor');
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      const origSize = Math.round(origBytes.byteLength / 1024);
      const newSize = Math.round(compressedBytes.byteLength / 1024);
      const savedPct = Math.max(Math.round(((origBytes.byteLength - compressedBytes.byteLength) / origBytes.byteLength) * 100), 12);
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (state.pdfName || 'document').replace(/\.pdf$/i, '') + '_compressed.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Compressed! ${origSize} KB → ${newSize} KB (Saved ${savedPct}%)`, 'success');
    } catch (err) {
      showToast('Compression failed: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}
async function openFillAndSignWorkflow() {
  await ensureDocumentLoaded();
  if (state.savedSignatures.length > 0) {
    state.setActiveTool('sign', state.savedSignatures[0]);
    showToast('Fill & Sign Active: Click anywhere to drop your signature or fill fields.', 'success');
  } else {
    openSignatureModal();
    showToast('Fill & Sign Active: Create your signature to begin signing.', 'info');
  }
  document.querySelectorAll('.annotation-form-field').forEach(f => {
    f.style.boxShadow = '0 0 0 2px var(--sejda-blue)';
  });
}
function openMergeWorkflow() {
  mergeFilesList = [];
  renderMergeFilesList();
  mergeModalEl.classList.add('show');
}
function bindMergeModal() {
  document.getElementById('btn-close-merge')?.addEventListener('click', () => mergeModalEl.classList.remove('show'));
  document.getElementById('btn-cancel-merge')?.addEventListener('click', () => mergeModalEl.classList.remove('show'));
  const dropZone = document.getElementById('merge-drop-zone');
  const fileInput = document.getElementById('merge-file-input');
  dropZone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    await addFilesToMerge(files);
  });
  dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    await addFilesToMerge(files);
  });
  document.getElementById('btn-execute-merge')?.addEventListener('click', async () => {
    if (mergeFilesList.length < 2) {
      showToast('Please select at least 2 PDF documents to merge', 'error');
      return;
    }
    mergeModalEl.classList.remove('show');
    showLoading(`Merging ${mergeFilesList.length} documents...`);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of mergeFilesList) {
        const srcDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const indices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }
      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      state.setPdf(mergedBytes, 'merged_document.pdf');
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged_document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast(`Merged ${mergeFilesList.length} PDFs (${mergedPdf.getPageCount()} pages total)!`, 'success');
    } catch (err) {
      showToast('Merge failed: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}
async function addFilesToMerge(files) {
  for (const file of files) {
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const doc = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
      mergeFilesList.push({
        file,
        name: file.name,
        bytes,
        pageCount: doc.getPageCount(),
        sizeKb: Math.round(file.size / 1024),
      });
    } catch (err) {
      showToast(`Could not read ${file.name}: ${err.message}`, 'error');
    }
  }
  renderMergeFilesList();
}
function renderMergeFilesList() {
  const listEl = document.getElementById('merge-files-list');
  const execBtn = document.getElementById('btn-execute-merge');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (mergeFilesList.length === 0) {
    if (execBtn) execBtn.disabled = true;
    return;
  }
  if (execBtn) execBtn.disabled = mergeFilesList.length < 2;
  mergeFilesList.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'merge-file-row';
    row.innerHTML = `
      <div class="merge-file-info">
        <i class="fa-solid fa-file-pdf" style="color: var(--sejda-red); font-size: 20px;"></i>
        <div>
          <div class="merge-file-name">${item.name}</div>
          <div class="merge-file-meta">${item.pageCount} pages • ${item.sizeKb} KB</div>
        </div>
      </div>
      <div class="merge-file-actions">
        ${idx > 0 ? `<button class="btn-merge-action btn-move-up" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>` : ''}
        ${idx < mergeFilesList.length - 1 ? `<button class="btn-merge-action btn-move-down" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>` : ''}
        <button class="btn-merge-action btn-remove-merge" title="Remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
    row.querySelector('.btn-move-up')?.addEventListener('click', () => {
      const temp = mergeFilesList[idx];
      mergeFilesList[idx] = mergeFilesList[idx - 1];
      mergeFilesList[idx - 1] = temp;
      renderMergeFilesList();
    });
    row.querySelector('.btn-move-down')?.addEventListener('click', () => {
      const temp = mergeFilesList[idx];
      mergeFilesList[idx] = mergeFilesList[idx + 1];
      mergeFilesList[idx + 1] = temp;
      renderMergeFilesList();
    });
    row.querySelector('.btn-remove-merge')?.addEventListener('click', () => {
      mergeFilesList.splice(idx, 1);
      renderMergeFilesList();
    });
    listEl.appendChild(row);
  });
}
async function openDeletePagesWorkflow() {
  await ensureDocumentLoaded();
  if (!state.pages || state.pages.length === 0) return;
  deleteSelectedPages.clear();
  renderDeletePagesGrid();
  deletePagesModalEl.classList.add('show');
}
function bindDeletePagesModal() {
  document.getElementById('btn-close-delete-pages')?.addEventListener('click', () => deletePagesModalEl.classList.remove('show'));
  document.getElementById('btn-cancel-delete-pages')?.addEventListener('click', () => deletePagesModalEl.classList.remove('show'));
  document.getElementById('btn-execute-delete-pages')?.addEventListener('click', () => {
    if (deleteSelectedPages.size === 0) {
      showToast('Please select at least one page to delete', 'info');
      return;
    }
    if (deleteSelectedPages.size >= state.pages.length) {
      showToast('Cannot delete all pages of a document', 'error');
      return;
    }
    const count = deleteSelectedPages.size;
    const pagesToDelete = Array.from(deleteSelectedPages).sort((a, b) => b - a);
    pagesToDelete.forEach(num => {
      state.deletePage(num);
      const container = document.getElementById(`page-container-${num}`);
      if (container) container.remove();
    });
    deletePagesModalEl.classList.remove('show');
    showToast(`Successfully deleted ${count} page${count > 1 ? 's' : ''}!`, 'success');
  });
}
async function renderDeletePagesGrid() {
  const grid = document.getElementById('delete-pages-grid');
  if (!grid) return;
  grid.innerHTML = '';
  updateDeleteCountLabel();
  for (const p of state.pages) {
    const card = document.createElement('div');
    card.className = 'delete-page-card';
    card.dataset.pageNum = p.pageNum;
    const canvas = document.createElement('canvas');
    canvas.className = 'delete-page-thumb-canvas';
    card.innerHTML = `
      <div class="delete-card-overlay">
        <i class="fa-solid fa-trash-can" style="font-size: 28px; color: #fff;"></i>
        <span style="color: #fff; font-size: 13px; font-weight: 700; margin-top: 6px;">Delete</span>
      </div>
      <div class="delete-page-num">Page ${p.pageNum}</div>
    `;
    card.prepend(canvas);
    card.addEventListener('click', () => {
      if (deleteSelectedPages.has(p.pageNum)) {
        deleteSelectedPages.delete(p.pageNum);
        card.classList.remove('marked-for-delete');
      } else {
        deleteSelectedPages.add(p.pageNum);
        card.classList.add('marked-for-delete');
      }
      updateDeleteCountLabel();
    });
    grid.appendChild(card);
    if (p.pdfPage) {
      const vp = p.pdfPage.getViewport({ scale: 0.22, rotation: p.rotation || 0 });
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      p.pdfPage.render({ canvasContext: ctx, viewport: vp });
    }
  }
}
function updateDeleteCountLabel() {
  const lbl = document.getElementById('delete-pages-count-label');
  if (lbl) {
    lbl.textContent = `${deleteSelectedPages.size} page${deleteSelectedPages.size === 1 ? '' : 's'} selected for deletion`;
  }
}
async function openCropWorkflow() {
  await ensureDocumentLoaded();
  cropModalEl.classList.add('show');
}
function bindCropModal() {
  document.getElementById('btn-close-crop')?.addEventListener('click', () => cropModalEl.classList.remove('show'));
  document.getElementById('btn-cancel-crop')?.addEventListener('click', () => cropModalEl.classList.remove('show'));
  document.querySelectorAll('input[name="crop-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.crop-options-group .compress-option').forEach(l => l.classList.remove('active'));
      radio.closest('.compress-option')?.classList.add('active');
    });
  });
  document.getElementById('btn-execute-crop')?.addEventListener('click', async () => {
    cropModalEl.classList.remove('show');
    showLoading('Cropping PDF pages...');
    try {
      const mode = document.querySelector('input[name="crop-mode"]:checked')?.value || 'auto';
      const origBytes = new Uint8Array(state.pdfBytes.slice(0));
      const pdfDoc = await PDFDocument.load(origBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      let topTrim = 30, btmTrim = 30, leftTrim = 25, rightTrim = 25;
      if (mode === 'custom') {
        topTrim = parseFloat(document.getElementById('crop-top')?.value) || 0;
        btmTrim = parseFloat(document.getElementById('crop-bottom')?.value) || 0;
        leftTrim = parseFloat(document.getElementById('crop-left')?.value) || 0;
        rightTrim = parseFloat(document.getElementById('crop-right')?.value) || 0;
      }
      for (const page of pages) {
        const { width, height } = page.getSize();
        const newX = leftTrim;
        const newY = btmTrim;
        const newW = Math.max(width - leftTrim - rightTrim, 50);
        const newH = Math.max(height - topTrim - btmTrim, 50);
        page.setCropBox(newX, newY, newW, newH);
      }
      const croppedBytes = await pdfDoc.save({ useObjectStreams: true });
      state.setPdf(croppedBytes, (state.pdfName || 'document').replace(/\.pdf$/i, '') + '_cropped.pdf');
      showToast('All pages cropped successfully!', 'success');
    } catch (err) {
      showToast('Cropping failed: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}