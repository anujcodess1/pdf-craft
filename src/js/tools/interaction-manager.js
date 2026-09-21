import { state } from '../editor-state.js';
import { renderAnnotationsOnPage, createAnnotationElement } from '../pdf-engine.js';
import { openSignatureModal } from '../ui/signature-modal.js';
import { showToast } from '../ui/notifications.js';
let activeDrag = null; 
let activeDraw = null; 
let activeCreationDrag = null; 
export function initInteractionManager() {
  const container = document.getElementById('edit-pages-container');
  if (!container) return;
  container.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement?.isContentEditable || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (state.selectedAnnotation) {
        state.deleteAnnotation(state.selectedAnnotation.id);
      }
    } else if (e.key === 'Escape') {
      state.clearSelection();
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      state.undo();
    }
  });
  state.subscribe((type, payload) => {
    if (type === 'ANNOTATION_ADDED' || type === 'ANNOTATION_DELETED' || type === 'HISTORY_RESTORED') {
      for (const page of state.pages) {
        const layer = document.getElementById(`annotation-layer-${page.pageNum}`);
        if (layer) renderAnnotationsOnPage(page.pageNum, layer);
      }
    } else if (type === 'ANNOTATION_UPDATED') {
      const layer = document.getElementById(`annotation-layer-${payload.pageNum}`);
      if (layer) renderAnnotationsOnPage(payload.pageNum, layer);
    } else if (type === 'TOOL_CHANGED') {
      updatePageCursorClasses();
    }
  });
}
function updatePageCursorClasses() {
  document.querySelectorAll('.page-wrap').forEach(wrap => {
    wrap.className = `page-wrap tool-${state.activeTool}`;
  });
}
function handleMouseDown(e) {
  const pageWrap = e.target.closest('.page-wrap');
  if (!pageWrap) {
    if (!e.target.closest('.context-toolbar') && !e.target.closest('.top-tools-bar-wrapper')) {
      state.clearSelection();
    }
    return;
  }
  const pageNum = parseInt(pageWrap.id.replace('page-wrap-', ''));
  const pageRect = pageWrap.getBoundingClientRect();
  const scale = state.scale;
  const clickX = (e.clientX - pageRect.left) / scale;
  const clickY = (e.clientY - pageRect.top) / scale;
  const handleEl = e.target.closest('.resize-handle');
  const annEl = e.target.closest('.annotation-item');
  if (handleEl && annEl) {
    e.preventDefault();
    const annId = annEl.dataset.id;
    const ann = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
    if (ann) {
      activeDrag = {
        type: 'resize',
        ann,
        startX: e.clientX,
        startY: e.clientY,
        origX: ann.x,
        origY: ann.y,
        origW: ann.width || 100,
        origH: ann.height || 30,
        direction: handleEl.dataset.direction,
        pageNum,
      };
      return;
    }
  }
  if (annEl) {
    const annId = annEl.dataset.id;
    const ann = state.getAnnotationsForPage(pageNum).find(a => a.id === annId);
    if (ann) {
      state.selectAnnotation(ann);
      if (ann.type === 'text') {
        annEl.focus();
      }
      if (e.target === annEl || !annEl.isContentEditable || e.target.tagName !== 'INPUT') {
        activeDrag = {
          type: 'move',
          ann,
          startX: e.clientX,
          startY: e.clientY,
          origX: ann.x,
          origY: ann.y,
          origW: ann.width,
          origH: ann.height,
          pageNum,
        };
      }
      return;
    }
  }
  if (e.target.closest('.pdf-text-item')) {
    return;
  }
  handleToolPlacement(pageNum, clickX, clickY, e, pageWrap);
}
function handleToolPlacement(pageNum, x, y, e, pageWrap) {
  const tool = state.activeTool;
  const props = state.toolProps;
  switch (tool) {
    case 'text': {
      const newAnn = {
        type: 'text',
        x,
        y,
        width: 140,
        height: 28,
        text: 'Type your text',
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        color: props.textColor,
        bold: props.bold,
        italic: props.italic,
      };
      const created = state.addAnnotation(pageNum, newAnn);
      setTimeout(() => {
        const dom = document.getElementById(created.id);
        if (dom) {
          dom.focus();
          const range = document.createRange();
          range.selectNodeContents(dom);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 50);
      break;
    }
    case 'whiteout':
    case 'shape':
    case 'annotate':
    case 'link': {
      startCreationDrag(tool, pageNum, x, y, pageWrap);
      break;
    }
    case 'sign': {
      let sigSrc = null;
      if (state.activeSubTool && typeof state.activeSubTool === 'string' && state.activeSubTool.startsWith('data:image')) {
        sigSrc = state.activeSubTool;
      } else if (state.savedSignatures.length > 0) {
        sigSrc = state.savedSignatures[0];
      }
      if (sigSrc) {
        placeImageOrSignature(pageNum, x, y, sigSrc, 'sign');
      } else {
        openSignatureModal();
      }
      break;
    }
    case 'image': {
      const input = document.getElementById('image-file-input');
      if (input) {
        input.onchange = (evt) => {
          const file = evt.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
              placeImageOrSignature(pageNum, x, y, re.target.result, 'image');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
      break;
    }
    case 'form': {
      const fType = state.activeSubTool || 'text';
      state.addAnnotation(pageNum, {
        type: 'form',
        formType: fType,
        x,
        y,
        width: fType === 'checkbox' || fType === 'radio' ? 22 : 140,
        height: fType === 'checkbox' || fType === 'radio' ? 22 : 28,
        name: fType + '_field',
      });
      break;
    }
    case 'draw': {
      startCanvasDraw(pageNum, x, y, pageWrap);
      break;
    }
  }
}
function placeImageOrSignature(pageNum, clickX, clickY, src, type = 'sign') {
  const img = new Image();
  img.onload = () => {
    const nw = img.naturalWidth || 200;
    const nh = img.naturalHeight || 70;
    const aspect = nw / nh;
    let targetW, targetH;
    if (type === 'sign') {
      targetH = 48;
      targetW = Math.round(Math.min(Math.max(targetH * aspect, 60), 340));
      targetH = Math.round(targetW / aspect);
    } else {
      targetW = Math.min(Math.max(nw, 120), 280);
      targetH = Math.round(targetW / aspect);
    }
    const newAnn = {
      type,
      x: Math.max(0, Math.round(clickX - targetW / 2)),
      y: Math.max(0, Math.round(clickY - targetH / 2)),
      width: targetW,
      height: targetH,
      src,
    };
    const created = state.addAnnotation(pageNum, newAnn);
    state.selectAnnotation(created);
  };
  img.src = src;
}
function startCreationDrag(tool, pageNum, x, y, pageWrap) {
  const scale = state.scale;
  const preview = document.createElement('div');
  preview.className = 'annotation-item selected';
  preview.style.position = 'absolute';
  preview.style.left = `${x * scale}px`;
  preview.style.top = `${y * scale}px`;
  preview.style.width = '0px';
  preview.style.height = '0px';
  preview.style.border = '2px dashed #0282e5';
  preview.style.pointerEvents = 'none';
  pageWrap.querySelector('.annotation-layer').appendChild(preview);
  activeCreationDrag = {
    tool,
    pageNum,
    startX: x,
    startY: y,
    previewEl: preview,
  };
}
function startCanvasDraw(pageNum, x, y, pageWrap) {
  const canvas = pageWrap.querySelector('.draw-canvas-layer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scale = state.scale;
  const dpr = window.devicePixelRatio || 1;
  ctx.strokeStyle = state.toolProps.drawColor || '#000000';
  ctx.lineWidth = (state.toolProps.drawWidth || 3) * scale * dpr;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x * scale * dpr, y * scale * dpr);
  activeDraw = {
    pageNum,
    ctx,
    canvas,
    isDrawing: true,
    points: [{ x, y }],
  };
}
function handleMouseMove(e) {
  const scale = state.scale;
  if (activeCreationDrag) {
    const pageWrap = document.getElementById(`page-wrap-${activeCreationDrag.pageNum}`);
    if (pageWrap) {
      const rect = pageWrap.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;
      const x = Math.min(activeCreationDrag.startX, currentX);
      const y = Math.min(activeCreationDrag.startY, currentY);
      const w = Math.abs(currentX - activeCreationDrag.startX);
      const h = Math.abs(currentY - activeCreationDrag.startY);
      activeCreationDrag.previewEl.style.left = `${x * scale}px`;
      activeCreationDrag.previewEl.style.top = `${y * scale}px`;
      activeCreationDrag.previewEl.style.width = `${w * scale}px`;
      activeCreationDrag.previewEl.style.height = `${h * scale}px`;
      activeCreationDrag.currentBox = { x, y, w, h };
    }
    return;
  }
  if (activeDraw && activeDraw.isDrawing) {
    const pageWrap = document.getElementById(`page-wrap-${activeDraw.pageNum}`);
    if (pageWrap) {
      const rect = pageWrap.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;
      const dpr = window.devicePixelRatio || 1;
      activeDraw.ctx.lineTo(currentX * scale * dpr, currentY * scale * dpr);
      activeDraw.ctx.stroke();
      activeDraw.points.push({ x: currentX, y: currentY });
    }
    return;
  }
  if (activeDrag) {
    const dx = (e.clientX - activeDrag.startX) / scale;
    const dy = (e.clientY - activeDrag.startY) / scale;
    const ann = activeDrag.ann;
    if (activeDrag.type === 'move') {
      ann.x = Math.max(activeDrag.origX + dx, 0);
      ann.y = Math.max(activeDrag.origY + dy, 0);
    } else if (activeDrag.type === 'resize') {
      const dir = activeDrag.direction;
      if (dir.includes('e')) ann.width = Math.max(activeDrag.origW + dx, 20);
      if (dir.includes('s')) ann.height = Math.max(activeDrag.origH + dy, 15);
      if (dir.includes('w')) {
        const newW = Math.max(activeDrag.origW - dx, 20);
        ann.x = activeDrag.origX + (activeDrag.origW - newW);
        ann.width = newW;
      }
      if (dir.includes('n')) {
        const newH = Math.max(activeDrag.origH - dy, 15);
        ann.y = activeDrag.origY + (activeDrag.origH - newH);
        ann.height = newH;
      }
    }
    const dom = document.getElementById(ann.id);
    if (dom) {
      dom.style.left = `${ann.x * scale}px`;
      dom.style.top = `${ann.y * scale}px`;
      dom.style.width = `${ann.width * scale}px`;
      dom.style.height = `${ann.height * scale}px`;
    }
  }
}
function handleMouseUp() {
  if (activeCreationDrag) {
    const box = activeCreationDrag.currentBox;
    const pageNum = activeCreationDrag.pageNum;
    const tool = activeCreationDrag.tool;
    const props = state.toolProps;
    activeCreationDrag.previewEl.remove();
    if (box && box.w > 5 && box.h > 5) {
      if (tool === 'whiteout') {
        state.addAnnotation(pageNum, {
          type: 'whiteout',
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
        });
      } else if (tool === 'shape') {
        state.addAnnotation(pageNum, {
          type: 'shape',
          shapeType: state.activeSubTool || 'rectangle',
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          strokeWidth: props.strokeWidth,
          strokeColor: props.strokeColor,
          fillColor: props.fillColor,
        });
      } else if (tool === 'annotate') {
        state.addAnnotation(pageNum, {
          type: 'annotate',
          annotType: state.activeSubTool || 'highlight',
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          color: props.annotateColor,
        });
      } else if (tool === 'link') {
        const url = prompt('Enter destination link URL (e.g. https://example.com):', 'https://');
        if (url) {
          state.addAnnotation(pageNum, {
            type: 'link',
            url,
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h,
          });
        }
      }
    }
    activeCreationDrag = null;
  }
  if (activeDraw) {
    activeDraw = null;
  }
  if (activeDrag) {
    state.notify('ANNOTATION_UPDATED', { pageNum: activeDrag.pageNum, annotation: activeDrag.ann });
    activeDrag = null;
  }
}