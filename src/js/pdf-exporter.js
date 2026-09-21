import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { state } from './editor-state.js';
export async function exportModifiedPdf() {
  if (!state.pdfBytes || state.pdfBytes.byteLength === 0) {
    throw new Error('PDF data is empty or detached');
  }
  let pdfDoc;
  const isEncrypted = !!state.isEncrypted;
  if (isEncrypted) {
    pdfDoc = await PDFDocument.create();
    for (const pageState of state.pages) {
      const page = pdfDoc.addPage([pageState.originalWidth, pageState.originalHeight]);
      if (pageState.rotation) {
        page.setRotation(degrees(pageState.rotation));
      }
      if (pageState.pdfPage) {
        const renderScale = 2.5; 
        const vp = pageState.pdfPage.getViewport({ scale: renderScale, rotation: pageState.rotation || 0 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await pageState.pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
        const imgDataUrl = canvas.toDataURL('image/png');
        const bgImg = await pdfDoc.embedPng(imgDataUrl);
        page.drawImage(bgImg, {
          x: 0,
          y: 0,
          width: pageState.originalWidth,
          height: pageState.originalHeight,
        });
      }
    }
  } else {
    const bytesCopy = new Uint8Array(state.pdfBytes.slice(0));
    pdfDoc = await PDFDocument.load(bytesCopy, { ignoreEncryption: true });
  }
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fontMap = {
    'Helvetica': { normal: helvetica, bold: helveticaBold, italic: helveticaOblique, boldItalic: helveticaBoldOblique },
    'Arial': { normal: helvetica, bold: helveticaBold, italic: helveticaOblique, boldItalic: helveticaBoldOblique },
    'Times New Roman': { normal: timesRoman, bold: timesRomanBold, italic: timesRoman, boldItalic: timesRomanBold },
    'Courier': { normal: courier, bold: courierBold, italic: courier, boldItalic: courierBold },
  };
  const pages = pdfDoc.getPages();
  for (const pageState of state.pages) {
    const pageIndex = pageState.pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const pdfPage = pages[pageIndex];
    const { width: pWidth, height: pHeight } = pdfPage.getSize();
    if (!isEncrypted && pageState.rotation) {
      pdfPage.setRotation(degrees(pageState.rotation));
    }
    const annotations = state.getAnnotationsForPage(pageState.pageNum);
    for (const ann of annotations) {
      const annX = ann.x;
      const annW = ann.width || 100;
      const annH = ann.height || 30;
      const annY = pHeight - (ann.y + annH); 
      switch (ann.type) {
        case 'text': {
          const fontSize = ann.fontSize || 16;
          const family = fontMap[ann.fontFamily] || fontMap['Helvetica'];
          let chosenFont = family.normal;
          if (ann.bold && ann.italic) chosenFont = family.boldItalic;
          else if (ann.bold) chosenFont = family.bold;
          else if (ann.italic) chosenFont = family.italic;
          const textColor = parseHexColor(ann.color || '#000000');
          const textBaselineY = ann.origBaselineY !== undefined ? ann.origBaselineY : (pHeight - ann.y - (fontSize * 0.85));
          if (ann.isExistingText) {
            const maskWidth = Math.max(ann.width || 100, ann.origWidth || 100) + 6;
            const maskHeight = (ann.origHeight || fontSize * 1.25) + 4;
            pdfPage.drawRectangle({
              x: (ann.origX || ann.x) - 2,
              y: textBaselineY - (fontSize * 0.28),
              width: maskWidth,
              height: maskHeight,
              color: rgb(1, 1, 1),
            });
          }
          const lines = (ann.text || '').split('\n');
          let currentY = textBaselineY;
          for (const line of lines) {
            if (line.trim().length > 0) {
              if (canEncodeWinAnsi(line)) {
                try {
                  pdfPage.drawText(line, {
                    x: annX,
                    y: currentY,
                    size: fontSize,
                    font: chosenFont,
                    color: textColor,
                  });
                } catch (e) {
                  await drawUnicodeLine(pdfDoc, pdfPage, line, annX, currentY, fontSize, ann);
                }
              } else {
                await drawUnicodeLine(pdfDoc, pdfPage, line, annX, currentY, fontSize, ann);
              }
            }
            currentY -= fontSize * 1.2;
          }
          break;
        }
        case 'whiteout': {
          pdfPage.drawRectangle({
            x: annX,
            y: annY,
            width: annW,
            height: annH,
            color: rgb(1, 1, 1),
          });
          break;
        }
        case 'shape': {
          const strokeColor = parseHexColor(ann.strokeColor || '#000000');
          const strokeWidth = ann.strokeWidth || 2;
          const hasFill = ann.fillColor && ann.fillColor !== 'transparent';
          const fillColor = hasFill ? parseHexColor(ann.fillColor) : undefined;
          if (ann.shapeType === 'rectangle') {
            pdfPage.drawRectangle({
              x: annX,
              y: annY,
              width: annW,
              height: annH,
              borderColor: strokeColor,
              borderWidth: strokeWidth,
              color: fillColor,
            });
          } else if (ann.shapeType === 'ellipse') {
            pdfPage.drawEllipse({
              x: annX + annW / 2,
              y: annY + annH / 2,
              xScale: annW / 2,
              yScale: annH / 2,
              borderColor: strokeColor,
              borderWidth: strokeWidth,
              color: fillColor,
            });
          } else if (ann.shapeType === 'line' || ann.shapeType === 'arrow') {
            pdfPage.drawLine({
              start: { x: annX, y: annY + annH / 2 },
              end: { x: annX + annW, y: annY + annH / 2 },
              thickness: strokeWidth,
              color: strokeColor,
            });
            if (ann.shapeType === 'arrow') {
              const tipX = annX + annW;
              const tipY = annY + annH / 2;
              pdfPage.drawLine({
                start: { x: tipX, y: tipY },
                end: { x: tipX - 10, y: tipY + 6 },
                thickness: strokeWidth,
                color: strokeColor,
              });
              pdfPage.drawLine({
                start: { x: tipX, y: tipY },
                end: { x: tipX - 10, y: tipY - 6 },
                thickness: strokeWidth,
                color: strokeColor,
              });
            }
          }
          break;
        }
        case 'image':
        case 'sign': {
          if (ann.src) {
            try {
              let embeddedImg;
              if (ann.src.startsWith('data:image/png')) {
                embeddedImg = await pdfDoc.embedPng(ann.src);
              } else if (ann.src.startsWith('data:image/jpeg') || ann.src.startsWith('data:image/jpg')) {
                embeddedImg = await pdfDoc.embedJpg(ann.src);
              } else {
                embeddedImg = await pdfDoc.embedPng(ann.src);
              }
              pdfPage.drawImage(embeddedImg, {
                x: annX,
                y: annY,
                width: annW,
                height: annH,
              });
            } catch (err) {
              console.warn('Could not embed image into PDF:', err);
            }
          }
          break;
        }
        case 'annotate': {
          const color = parseHexColor(ann.color || '#FFD500');
          if (ann.annotType === 'highlight') {
            pdfPage.drawRectangle({
              x: annX,
              y: annY,
              width: annW,
              height: annH,
              color: color,
              opacity: 0.45,
            });
          } else if (ann.annotType === 'strikeout') {
            pdfPage.drawLine({
              start: { x: annX, y: annY + annH / 2 },
              end: { x: annX + annW, y: annY + annH / 2 },
              thickness: 1.5,
              color: rgb(0.9, 0.1, 0.1),
            });
          } else if (ann.annotType === 'underline') {
            pdfPage.drawLine({
              start: { x: annX, y: annY + 2 },
              end: { x: annX + annW, y: annY + 2 },
              thickness: 1.5,
              color: rgb(0.9, 0.1, 0.1),
            });
          }
          break;
        }
        case 'form': {
          try {
            const form = pdfDoc.getForm();
            const uniqueName = (ann.name || 'field') + '_' + ann.id.substring(0, 6);
            if (ann.formType === 'text') {
              const textField = form.createTextField(uniqueName);
              textField.addToPage(pdfPage, { x: annX, y: annY, width: annW, height: annH });
            } else if (ann.formType === 'checkbox') {
              const checkField = form.createCheckBox(uniqueName);
              checkField.addToPage(pdfPage, { x: annX, y: annY, width: Math.min(annW, annH), height: Math.min(annW, annH) });
            } else if (ann.formType === 'dropdown') {
              const dropField = form.createDropdown(uniqueName);
              dropField.addOptions(['Option 1', 'Option 2', 'Option 3']);
              dropField.addToPage(pdfPage, { x: annX, y: annY, width: annW, height: annH });
            }
          } catch (e) {
            console.warn('Form field error:', e);
          }
          break;
        }
      }
    }
  }
  const outputBytes = await pdfDoc.save();
  const blob = new Blob([outputBytes], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  return {
    bytes: outputBytes,
    blob,
    downloadUrl,
    fileName: state.fileName.replace('.pdf', '') + '_edited.pdf',
    sizeBytes: outputBytes.length,
    pageCount: state.pages.length,
  };
}
function parseHexColor(hex) {
  if (!hex || hex === 'transparent') return rgb(0, 0, 0);
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}
function canEncodeWinAnsi(text) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) return false;
    if (code === 129 || code === 141 || code === 143 || code === 144 || code === 157) return false;
  }
  return true;
}
async function drawUnicodeLine(pdfDoc, pdfPage, line, x, y, fontSize, ann) {
  const rendered = renderUnicodeTextToPng(
    line,
    fontSize,
    ann.fontFamily,
    ann.color || '#000000',
    ann.bold,
    ann.italic
  );
  const pngImg = await pdfDoc.embedPng(rendered.dataUrl);
  pdfPage.drawImage(pngImg, {
    x: x,
    y: y - rendered.offsetY,
    width: rendered.width,
    height: rendered.height,
  });
}
function renderUnicodeTextToPng(text, fontSize, fontFamily, color, bold, italic) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = 3; 
  const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize * dpr}px ${fontFamily || 'Helvetica'}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.font = fontStyle;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const ascent = metrics.actualBoundingBoxAscent || (fontSize * dpr * 0.8);
  const descent = metrics.actualBoundingBoxDescent || (fontSize * dpr * 0.25);
  const canvasWidth = Math.max(textWidth + 8, 10);
  const canvasHeight = Math.max(Math.ceil(ascent + descent + 6), 10);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.font = fontStyle;
  ctx.fillStyle = color || '#000000';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 2, ascent + 2);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvasWidth / dpr,
    height: canvasHeight / dpr,
    offsetY: (descent + 2) / dpr,
  };
}