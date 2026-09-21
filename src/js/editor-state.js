class EditorState {
  constructor() {
    this.pdfBytes = null;
    this.fileName = 'document.pdf';
    this.pdfDocProxy = null;
    this.pdfPassword = null;
    this.isEncrypted = false;
    this.pages = []; 
    this.scale = 1.25; 
    this.activeTool = 'text'; 
    this.activeSubTool = null; 
    this.toolProps = {
      fontSize: 16,
      fontFamily: 'Helvetica',
      textColor: '#000000',
      bold: false,
      italic: false,
      shapeType: 'rectangle', 
      strokeWidth: 2,
      strokeColor: '#000000',
      fillColor: 'transparent',
      annotateType: 'highlight', 
      annotateColor: '#FFD500', 
      drawColor: '#000000',
      drawWidth: 3,
      formType: 'text', 
    };
    this.annotations = new Map(); 
    this.selectedAnnotation = null;
    this.historyStack = [];
    this.redoStack = [];
    this.savedSignatures = [];
    this.listeners = new Set();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify(changeType, payload) {
    for (const fn of this.listeners) {
      fn(changeType, payload, this);
    }
  }
  setPdf(bytes, name = 'document.pdf') {
    this.pdfBytes = new Uint8Array(bytes.slice(0));
    this.fileName = name;
    this.annotations.clear();
    this.historyStack = [];
    this.redoStack = [];
    this.selectedAnnotation = null;
    this.notify('PDF_LOADED', { fileName: name });
  }
  reset() {
    this.pdfBytes = null;
    this.fileName = 'document.pdf';
    this.pdfDocProxy = null;
    this.pdfPassword = null;
    this.isEncrypted = false;
    this.pages = [];
    this.annotations.clear();
    this.historyStack = [];
    this.redoStack = [];
    this.selectedAnnotation = null;
    this.notify('DOCUMENT_RESET');
  }
  setActiveTool(tool, subTool = null) {
    this.activeTool = tool;
    this.activeSubTool = subTool;
    this.notify('TOOL_CHANGED', { tool, subTool });
  }
  setZoom(newScale) {
    this.scale = Math.min(Math.max(newScale, 0.5), 3.0);
    this.notify('ZOOM_CHANGED', { scale: this.scale });
  }
  getAnnotationsForPage(pageNum) {
    if (!this.annotations.has(pageNum)) {
      this.annotations.set(pageNum, []);
    }
    return this.annotations.get(pageNum);
  }
  addAnnotation(pageNum, annotation) {
    this.saveHistory();
    const list = this.getAnnotationsForPage(pageNum);
    annotation.id = annotation.id || 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    annotation.pageNum = pageNum;
    list.push(annotation);
    this.selectedAnnotation = annotation;
    this.notify('ANNOTATION_ADDED', { pageNum, annotation });
    return annotation;
  }
  updateAnnotation(id, updates) {
    for (const [pageNum, list] of this.annotations.entries()) {
      const target = list.find(a => a.id === id);
      if (target) {
        Object.assign(target, updates);
        this.notify('ANNOTATION_UPDATED', { pageNum, annotation: target });
        return target;
      }
    }
    return null;
  }
  deleteAnnotation(id) {
    this.saveHistory();
    for (const [pageNum, list] of this.annotations.entries()) {
      const idx = list.findIndex(a => a.id === id);
      if (idx !== -1) {
        const deleted = list.splice(idx, 1)[0];
        if (this.selectedAnnotation?.id === id) {
          this.selectedAnnotation = null;
        }
        this.notify('ANNOTATION_DELETED', { pageNum, annotation: deleted });
        return deleted;
      }
    }
    return null;
  }
  selectAnnotation(annotation) {
    this.selectedAnnotation = annotation;
    this.notify('ANNOTATION_SELECTED', { annotation });
  }
  clearSelection() {
    this.selectedAnnotation = null;
    this.notify('SELECTION_CLEARED');
  }
  saveHistory() {
    const snapshot = [];
    for (const [pageNum, list] of this.annotations.entries()) {
      snapshot.push({
        pageNum,
        list: JSON.parse(JSON.stringify(list))
      });
    }
    this.historyStack.push(snapshot);
    if (this.historyStack.length > 30) this.historyStack.shift();
    this.redoStack = [];
  }
  undo() {
    if (this.historyStack.length === 0) return false;
    const current = [];
    for (const [pageNum, list] of this.annotations.entries()) {
      current.push({ pageNum, list: JSON.parse(JSON.stringify(list)) });
    }
    this.redoStack.push(current);
    const prev = this.historyStack.pop();
    this.annotations.clear();
    for (const item of prev) {
      this.annotations.set(item.pageNum, item.list);
    }
    this.selectedAnnotation = null;
    this.notify('HISTORY_RESTORED');
    return true;
  }
  addSavedSignature(dataUrl) {
    if (!this.savedSignatures.includes(dataUrl)) {
      this.savedSignatures.unshift(dataUrl);
      if (this.savedSignatures.length > 10) this.savedSignatures.pop();
      this.notify('SIGNATURE_SAVED', { dataUrl });
    }
  }
  rotatePage(pageNum, degrees = 90) {
    const page = this.pages.find(p => p.pageNum === pageNum);
    if (page) {
      page.rotation = ((page.rotation || 0) + degrees) % 360;
      this.notify('PAGE_ROTATED', { pageNum, rotation: page.rotation });
    }
  }
  deletePage(pageNum) {
    this.saveHistory();
    this.pages = this.pages.filter(p => p.pageNum !== pageNum);
    this.annotations.delete(pageNum);
    this.notify('PAGE_DELETED', { pageNum });
  }
}
export const state = new EditorState();