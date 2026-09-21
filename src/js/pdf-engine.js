import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { state } from './editor-state.js';
import { promptPdfPassword } from './ui/password-modal.js';
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
} catch (e) {
  console.warn('Fallback to standard worker path', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';
}
export async function renderPdfDocument(container) {
  if (!state.pdfBytes) return;
  container.innerHTML = '';
  state.pages = [];
  const workerData = new Uint8Array(state.pdfBytes.slice(0));
  const loadingTask = pdfjsLib.getDocument({
    data: workerData,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.3.136/cmaps/',
    cMapPacked: true,
  });
  loadingTask.onPassword = async (updatePassword, reasonCode) => {
    try {
      const password = await promptPdfPassword(reasonCode);
      state.pdfPassword = password;
      state.isEncrypted = true;
      updatePassword(password);
    } catch (err) {
      updatePassword(err);
      state.notify('PASSWORD_CANCELLED');
    }
  };
  state.pdfDocProxy = await loadingTask.promise;
  const numPages = state.pdfDocProxy.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await state.pdfDocProxy.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const pageData = {
      pageNum,
      originalWidth: unscaledViewport.width,
      originalHeight: unscaledViewport.height,
      rotation: 0,
      scale: state.scale,
      pdfPage: page,
    };
    state.pages.push(pageData);
    const pageContainer = createPageElement(pageData, container);
    await renderSinglePage(pageData, pageContainer);
  }
  state.notify('PAGES_RENDERED');
}
function createPageElement(pageData, parentContainer) {
  const container = document.createElement('div');
  container.className = 'page-container';
  container.id = `page-container-${pageData.pageNum}`;
  container.dataset.pageNum = pageData.pageNum;
  const header = document.createElement('div');
  header.className = 'page-above';
  header.innerHTML = `
    <span class="page-number-label">${pageData.pageNum}</span>
    <button class="page-tools-btn btn-rotate-page" title="Rotate page 90 degrees">
      <i class="fa-solid fa-rotate-right"></i> Rotate
    </button>
    <button class="page-tools-btn btn-delete-page" title="Delete this page">
      <i class="fa-regular fa-trash-can"></i> Delete
    </button>
  `;
  const wrap = document.createElement('div');
  wrap.className = `page-wrap tool-${state.activeTool}`;
  wrap.id = `page-wrap-${pageData.pageNum}`;
  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-canvas';
  canvas.id = `pdf-canvas-${pageData.pageNum}`;
  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  textLayer.id = `text-layer-${pageData.pageNum}`;
  const annotationLayer = document.createElement('div');
  annotationLayer.className = 'annotation-layer';
  annotationLayer.id = `annotation-layer-${pageData.pageNum}`;
  annotationLayer.dataset.pageNum = pageData.pageNum;
  const drawCanvas = document.createElement('canvas');
  drawCanvas.className = 'draw-canvas-layer';
  drawCanvas.id = `draw-canvas-${pageData.pageNum}`;
  wrap.appendChild(canvas);
  wrap.appendChild(textLayer);
  wrap.appendChild(annotationLayer);
  wrap.appendChild(drawCanvas);
  const between = document.createElement('div');
  between.className = 'page-between';
  between.innerHTML = `
    <button class="btn-insert-page" data-page-after="${pageData.pageNum}">
      <i class="fa-solid fa-plus"></i> Insert blank page here
    </button>
  `;
  container.appendChild(header);
  container.appendChild(wrap);
  container.appendChild(between);
  parentContainer.appendChild(container);
  header.querySelector('.btn-rotate-page').addEventListener('click', () => {
    state.rotatePage(pageData.pageNum, 90);
    reRenderSinglePage(pageData.pageNum);
  });
  header.querySelector('.btn-delete-page').addEventListener('click', () => {
    if (confirm(`Delete page ${pageData.pageNum}?`)) {
      state.deletePage(pageData.pageNum);
      container.remove();
    }
  });
  between.querySelector('.btn-insert-page').addEventListener('click', (e) => {
    const after = parseInt(e.currentTarget.dataset.pageAfter);
    state.notify('INSERT_BLANK_PAGE', { afterPage: after });
  });
  return container;
}
export async function renderSinglePage(pageData, container) {
  const wrap = container.querySelector('.page-wrap');
  const canvas = container.querySelector('.pdf-canvas');
  const drawCanvas = container.querySelector('.draw-canvas-layer');
  const annotationLayer = container.querySelector('.annotation-layer');
  const viewport = pageData.pdfPage.getViewport({
    scale: state.scale,
    rotation: pageData.rotation || 0,
  });
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  wrap.style.width = `${viewport.width}px`;
  wrap.style.height = `${viewport.height}px`;
  drawCanvas.width = canvas.width;
  drawCanvas.height = canvas.height;
  drawCanvas.style.width = `${viewport.width}px`;
  drawCanvas.style.height = `${viewport.height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const textLayer = container.querySelector('.textLayer');
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };
  await pageData.pdfPage.render(renderContext).promise;
  const textContent = await pageData.pdfPage.getTextContent();
  renderTextLayer(pageData, textLayer, textContent, viewport);
  renderAnnotationsOnPage(pageData.pageNum, annotationLayer);
}
export async function reRenderSinglePage(pageNum) {
  const pageData = state.pages.find(p => p.pageNum === pageNum);
  const container = document.getElementById(`page-container-${pageNum}`);
  if (pageData && container) {
    await renderSinglePage(pageData, container);
  }
}
export async function renderPageThumbnail(pageNum, targetCanvas) {
  const pageData = state.pages.find(p => p.pageNum === pageNum);
  if (!pageData || !pageData.pdfPage) return;
  const thumbViewport = pageData.pdfPage.getViewport({
    scale: 0.25,
    rotation: pageData.rotation || 0,
  });
  targetCanvas.width = thumbViewport.width;
  targetCanvas.height = thumbViewport.height;
  const ctx = targetCanvas.getContext('2d');
  await pageData.pdfPage.render({
    canvasContext: ctx,
    viewport: thumbViewport,
  }).promise;
}
function parseTextItems(items, pageHeight) {
  if (!items || items.length === 0) return [];
  const validItems = items.filter(it => it.str && it.str.trim().length > 0);
  const parsed = validItems.map(it => {
    const tx = it.transform[4];
    const ty = it.transform[5];
    const fontHeight = Math.hypot(it.transform[0], it.transform[1]) || 12;
    const isBold = /bold/i.test(it.fontName || '');
    const isItalic = /italic|oblique/i.test(it.fontName || '');
    let fontFamily = 'Helvetica';
    if (/times|serif|roman/i.test(it.fontName || '')) fontFamily = 'Times New Roman';
    else if (/courier|mono/i.test(it.fontName || '')) fontFamily = 'Courier';
    return {
      str: it.str,
      tx,
      ty,
      fontHeight,
      width: it.width,
      isBold,
      isItalic,
      fontFamily,
      endX: tx + it.width,
    };
  });
  parsed.sort((a, b) => {
    if (Math.abs(a.ty - b.ty) > 4) {
      return b.ty - a.ty; 
    }
    return a.tx - b.tx;
  });
  const result = [];
  let currentGroup = null;
  for (const item of parsed) {
    if (!currentGroup) {
      currentGroup = [item];
      continue;
    }
    const lastItem = currentGroup[currentGroup.length - 1];
    const isSameBaseline = Math.abs(item.ty - lastItem.ty) <= Math.min(item.fontHeight, lastItem.fontHeight) * 0.3;
    const gap = item.tx - lastItem.endX;
    const isKerningSlice = isSameBaseline &&
                           gap >= -2 && gap <= 1.5 &&
                           !lastItem.str.endsWith(' ') && !item.str.startsWith(' ') &&
                           lastItem.fontFamily === item.fontFamily &&
                           Math.abs(lastItem.fontHeight - item.fontHeight) < 1;
    if (isKerningSlice) {
      currentGroup.push(item);
    } else {
      result.push(...buildTextObjects(currentGroup, pageHeight));
      currentGroup = [item];
    }
  }
  if (currentGroup && currentGroup.length > 0) {
    result.push(...buildTextObjects(currentGroup, pageHeight));
  }
  return result;
}
const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const measureCtx = measureCanvas ? measureCanvas.getContext('2d') : null;
function buildTextObjects(group, pageHeight) {
  const first = group[0];
  const last = group[group.length - 1];
  let fullStr = '';
  for (let i = 0; i < group.length; i++) {
    fullStr += group[i].str;
  }
  const fontHeight = first.fontHeight;
  const totalWidth = Math.max(last.endX - first.tx, fontHeight * 0.5);
  const unscaledY = pageHeight - first.ty - (fontHeight * 0.88);
  const unscaledHeight = fontHeight * 1.25;
  if (!fullStr.includes(' ')) {
    return [{
      str: fullStr,
      unscaledX: first.tx,
      unscaledY,
      unscaledWidth: totalWidth,
      unscaledHeight,
      fontHeight,
      origBaselineY: first.ty,
      fontFamily: first.fontFamily,
      bold: first.isBold,
      italic: first.isItalic,
    }];
  }
  if (measureCtx) {
    measureCtx.font = `${first.isBold ? 'bold ' : ''}${first.isItalic ? 'italic ' : ''}${fontHeight}px '${first.fontFamily}', sans-serif`;
  }
  const chunks = fullStr.split(/(\s+)/);
  const rawMeasuredTotal = measureCtx ? measureCtx.measureText(fullStr).width : totalWidth;
  const ratio = rawMeasuredTotal > 0 ? (totalWidth / rawMeasuredTotal) : 1;
  const words = [];
  let curX = first.tx;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;
    const chunkWidth = (measureCtx ? measureCtx.measureText(chunk).width : (fontHeight * 0.55 * chunk.length)) * ratio;
    if (chunk.trim().length > 0) {
      words.push({
        str: chunk,
        unscaledX: curX,
        unscaledY,
        unscaledWidth: Math.max(chunkWidth, fontHeight * 0.35),
        unscaledHeight,
        fontHeight,
        origBaselineY: first.ty,
        fontFamily: first.fontFamily,
        bold: first.isBold,
        italic: first.isItalic,
      });
    }
    curX += chunkWidth;
  }
  return words.length > 0 ? words : [{
    str: fullStr,
    unscaledX: first.tx,
    unscaledY,
    unscaledWidth: totalWidth,
    unscaledHeight,
    fontHeight,
    origBaselineY: first.ty,
    fontFamily: first.fontFamily,
    bold: first.isBold,
    italic: first.isItalic,
  }];
}
export function renderTextLayer(pageData, textLayer, textContent, viewport) {
  textLayer.innerHTML = '';
  const scale = state.scale;
  const pageNum = pageData.pageNum;
  const textItems = parseTextItems(textContent.items, pageData.originalHeight);
  textItems.forEach((item, index) => {
    const annId = `orig_text_${pageNum}_${index}`;
    const el = document.createElement('div');
    el.className = 'pdf-text-item';
    el.id = annId;
    el.dataset.id = annId;
    el.dataset.pageNum = pageNum;
    el.dataset.textIndex = index;
    el.innerText = item.str;
    el.style.left = `${item.unscaledX * scale}px`;
    el.style.top = `${item.unscaledY * scale}px`;
    el.style.width = `${item.unscaledWidth * scale}px`;
    el.style.height = `${item.unscaledHeight * scale}px`;
    el.style.fontSize = `${item.fontHeight * scale}px`;
    el.style.fontFamily = `${item.fontFamily}, sans-serif`;
    if (item.bold) el.style.fontWeight = '700';
    if (item.italic) el.style.fontStyle = 'italic';
    const existingAnn = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
    if (existingAnn) {
      el.classList.add('edited');
      el.innerText = existingAnn.text;
      el.style.fontSize = `${(existingAnn.fontSize || item.fontHeight) * scale}px`;
      el.style.fontFamily = existingAnn.fontFamily || item.fontFamily;
      el.style.color = existingAnn.color || '#000000';
      el.style.fontWeight = existingAnn.bold ? '700' : '400';
      el.style.fontStyle = existingAnn.italic ? 'italic' : 'normal';
      if (existingAnn.width) {
        el.style.width = `${Math.max(existingAnn.width * scale, item.unscaledWidth * scale)}px`;
      }
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      el.contentEditable = 'true';
      el.spellcheck = false;
      el.classList.add('edited');
      el.focus();
      let ann = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
      if (!ann) {
        ann = {
          id: annId,
          type: 'text',
          isExistingText: true,
          origX: item.unscaledX,
          origY: item.unscaledY,
          origWidth: item.unscaledWidth,
          origHeight: item.unscaledHeight,
          origBaselineY: item.origBaselineY,
          x: item.unscaledX,
          y: item.unscaledY,
          width: item.unscaledWidth,
          height: item.unscaledHeight,
          text: el.innerText,
          fontSize: item.fontHeight,
          fontFamily: item.fontFamily,
          color: '#000000',
          bold: item.bold,
          italic: item.italic,
          pageNum,
        };
        state.addAnnotation(pageNum, ann);
      }
      state.selectAnnotation(ann);
    });
    el.addEventListener('input', () => {
      let ann = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
      if (ann) {
        ann.text = el.innerText;
        ann.width = Math.max(el.offsetWidth / scale, item.unscaledWidth);
        ann.height = Math.max(el.offsetHeight / scale, item.unscaledHeight);
        state.updateAnnotation(ann.id, {
          text: el.innerText,
          width: ann.width,
          height: ann.height
        });
      }
    });
    el.addEventListener('blur', () => {
      let ann = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
      if (ann) {
        ann.text = el.innerText;
        state.updateAnnotation(ann.id, { text: el.innerText });
      }
    });
    textLayer.appendChild(el);
  });
}
export function renderAnnotationsOnPage(pageNum, annotationLayer) {
  annotationLayer.innerHTML = '';
  const annotations = state.getAnnotationsForPage(pageNum);
  for (const ann of annotations) {
    if (ann.isExistingText) continue; 
    const el = createAnnotationElement(ann);
    annotationLayer.appendChild(el);
  }
}
export function createAnnotationElement(ann) {
  const el = document.createElement('div');
  el.className = `annotation-item annotation-${ann.type}`;
  el.id = ann.id;
  el.dataset.id = ann.id;
  el.dataset.pageNum = ann.pageNum;
  const scale = state.scale;
  el.style.left = `${ann.x * scale}px`;
  el.style.top = `${ann.y * scale}px`;
  if (ann.width) el.style.width = `${ann.width * scale}px`;
  if (ann.height) el.style.height = `${ann.height * scale}px`;
  switch (ann.type) {
    case 'text':
      el.contentEditable = 'true';
      el.spellcheck = false;
      el.innerText = ann.text || '';
      el.style.fontSize = `${(ann.fontSize || 16) * scale}px`;
      el.style.fontFamily = ann.fontFamily || 'Helvetica';
      el.style.color = ann.color || '#000000';
      el.style.fontWeight = ann.bold ? '700' : '400';
      el.style.fontStyle = ann.italic ? 'italic' : 'normal';
      el.addEventListener('input', () => {
        ann.text = el.innerText;
        ann.width = Math.max(el.offsetWidth / scale, 60);
        ann.height = Math.max(el.offsetHeight / scale, 24);
        state.updateAnnotation(ann.id, {
          text: el.innerText,
          width: ann.width,
          height: ann.height
        });
      });
      el.addEventListener('blur', () => {
        ann.text = el.innerText;
        state.updateAnnotation(ann.id, { text: el.innerText });
      });
      break;
    case 'whiteout':
      el.style.backgroundColor = '#ffffff';
      break;
    case 'shape':
      if (ann.shapeType === 'ellipse') {
        el.className += ' annotation-shape-ellipse';
        el.style.border = `${(ann.strokeWidth || 2) * scale}px solid ${ann.strokeColor || '#000'}`;
        el.style.backgroundColor = ann.fillColor || 'transparent';
      } else if (ann.shapeType === 'rectangle') {
        el.className += ' annotation-shape-rect';
        el.style.border = `${(ann.strokeWidth || 2) * scale}px solid ${ann.strokeColor || '#000'}`;
        el.style.backgroundColor = ann.fillColor || 'transparent';
      } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
        el.innerHTML = createSvgLine(ann, scale);
      }
      break;
    case 'image':
    case 'sign':
      const img = document.createElement('img');
      img.src = ann.src;
      img.draggable = false;
      el.appendChild(img);
      break;
    case 'link':
      el.innerHTML = `<span class="link-badge"><i class="fa-solid fa-link"></i> ${ann.url || 'Page ' + ann.page}</span>`;
      break;
    case 'form':
      el.innerHTML = createFormFieldHtml(ann);
      break;
    case 'annotate':
      if (ann.annotType === 'highlight') {
        el.className += ' annotation-highlight';
        el.style.backgroundColor = ann.color || '#FFD500';
      } else if (ann.annotType === 'strikeout') {
        el.className += ' annotation-strikeout';
      } else if (ann.annotType === 'underline') {
        el.className += ' annotation-underline';
      }
      break;
  }
  const handles = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'];
  for (const pos of handles) {
    const h = document.createElement('div');
    h.className = `resize-handle ${pos}`;
    h.dataset.direction = pos;
    el.appendChild(h);
  }
  if (state.selectedAnnotation?.id === ann.id) {
    el.classList.add('selected');
  }
  return el;
}
function createSvgLine(ann, scale) {
  const w = (ann.width || 100) * scale;
  const h = (ann.height || 20) * scale;
  const isArrow = ann.shapeType === 'arrow';
  const color = ann.strokeColor || '#000';
  const strokeW = (ann.strokeWidth || 2) * scale;
  return `
    <svg class="annotation-shape-svg" viewBox="0 0 ${w} ${h}">
      <defs>
        ${isArrow ? `
          <marker id="arrow-${ann.id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>
          </marker>
        ` : ''}
      </defs>
      <line x1="2" y1="${h / 2}" x2="${w - (isArrow ? 8 : 2)}" y2="${h / 2}"
            stroke="${color}" stroke-width="${strokeW}"
            ${isArrow ? `marker-end="url(#arrow-${ann.id})"` : ''} />
    </svg>
  `;
}
function createFormFieldHtml(ann) {
  switch (ann.formType) {
    case 'textarea':
      return `<textarea placeholder="${ann.name || 'Textarea'}" readonly></textarea>`;
    case 'checkbox':
      return `<input type="checkbox" checked disabled>`;
    case 'radio':
      return `<input type="radio" checked disabled>`;
    case 'dropdown':
      return `<select disabled><option>${ann.name || 'Dropdown'}</option></select>`;
    case 'signature':
      return `<div style="color:#0282e5; font-size:11px; text-align:center;"><i class="fa-solid fa-signature"></i> Signature Field</div>`;
    case 'text':
    default:
      return `<input type="text" placeholder="${ann.name || 'Text Field'}" readonly>`;
  }
}