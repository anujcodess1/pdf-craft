import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
export async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page1 = pdfDoc.addPage([595.28, 841.89]); 
  const { width: p1Width, height: p1Height } = page1.getSize();
  page1.drawRectangle({
    x: 40,
    y: p1Height - 80,
    width: p1Width - 80,
    height: 4,
    color: rgb(0, 0.73, 0.53),
  });
  page1.drawText('PDFCRAFT - SAMPLE DOCUMENT', {
    x: 40,
    y: p1Height - 65,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page1.drawText('Document ID: PDFCRAFT-SAMPLE-2026-X1  |  Date: September 20, 2026', {
    x: 40,
    y: p1Height - 96,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  page1.drawText('1. Interactive Testing Overview', {
    x: 40,
    y: p1Height - 130,
    size: 13,
    font: helveticaBold,
    color: rgb(0.01, 0.51, 0.9),
  });
  const introText = [
    'Welcome to PDFCraft! This sample document is preloaded with content',
    'so you can immediately test all editing tools without having to search for a local PDF.',
    '',
    'Features you can test right now:',
    '  * Text tool: Click anywhere on the page to add new text or change existing labels.',
    '  * Sign tool: Expand the "Sign" menu to draw, type cursive signatures, or upload.',
    '  * Whiteout tool: Drag over any text or redaction area to cover it with clean whiteout.',
    '  * Shapes: Add rectangles, ellipses, lines, and directional arrows with custom colors.',
    '  * Annotate: Highlight key sentences, strikeout deprecated text, or draw freehand.',
    '  * Forms: Add fillable text boxes, checkboxes, radio buttons, and signature boxes.',
    '  * Page management: Rotate pages, delete pages, or insert a fresh blank page.',
  ];
  let textY = p1Height - 150;
  for (const line of introText) {
    page1.drawText(line, {
      x: 40,
      y: textY,
      size: 10,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    textY -= 15;
  }
  textY -= 15;
  page1.drawText('2. Sample Service Terms Table', {
    x: 40,
    y: textY,
    size: 13,
    font: helveticaBold,
    color: rgb(0.01, 0.51, 0.9),
  });
  textY -= 20;
  page1.drawRectangle({
    x: 40,
    y: textY - 6,
    width: p1Width - 80,
    height: 22,
    color: rgb(0.94, 0.95, 0.96),
  });
  page1.drawText('Service Item', { x: 50, y: textY, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
  page1.drawText('Description', { x: 180, y: textY, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
  page1.drawText('Term', { x: 380, y: textY, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
  page1.drawText('Status', { x: 460, y: textY, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
  const rows = [
    ['PDF Online Editor', 'Full client-side browser editing engine', 'Annual', 'ACTIVE'],
    ['Digital Signatures', 'Draw, type, or upload verifiable signatures', 'Included', 'READY'],
    ['Form Creation', 'Interactive inputs, checkboxes & dropdowns', 'Standard', 'ENABLED'],
    ['Vector Annotation', 'Highlighters, whiteouts, freehand ink & shapes', 'Unlimited', 'READY'],
  ];
  for (const row of rows) {
    textY -= 22;
    page1.drawLine({
      start: { x: 40, y: textY + 16 },
      end: { x: p1Width - 40, y: textY + 16 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    page1.drawText(row[0], { x: 50, y: textY, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(row[1], { x: 180, y: textY, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
    page1.drawText(row[2], { x: 380, y: textY, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
    page1.drawText(row[3], { x: 460, y: textY, size: 9, font: helveticaBold, color: rgb(0, 0.6, 0.4) });
  }
  textY -= 45;
  page1.drawText('3. Authorization & Signatures', {
    x: 40,
    y: textY,
    size: 13,
    font: helveticaBold,
    color: rgb(0.01, 0.51, 0.9),
  });
  textY -= 25;
  page1.drawText('Please sign below using the "Sign" tool located in the top toolbar:', {
    x: 40,
    y: textY,
    size: 10,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  textY -= 65;
  page1.drawRectangle({
    x: 40,
    y: textY,
    width: 230,
    height: 55,
    borderWidth: 1,
    borderColor: rgb(0.7, 0.7, 0.7),
    color: rgb(0.98, 0.99, 1.0),
  });
  page1.drawText('[ Authorized Signature Here ]', {
    x: 75,
    y: textY + 22,
    size: 10,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });
  page1.drawText('Client / Representative', {
    x: 40,
    y: textY - 14,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  page1.drawRectangle({
    x: 310,
    y: textY,
    width: 230,
    height: 55,
    borderWidth: 1,
    borderColor: rgb(0.7, 0.7, 0.7),
    color: rgb(0.98, 0.99, 1.0),
  });
  page1.drawText('[ Verified Service Provider ]', {
    x: 350,
    y: textY + 22,
    size: 10,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });
  page1.drawText('PDFCraft Systems', {
    x: 310,
    y: textY - 14,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2Width, height: p2Height } = page2.getSize();
  page2.drawRectangle({
    x: 40,
    y: p2Height - 80,
    width: p2Width - 80,
    height: 4,
    color: rgb(0.01, 0.51, 0.9),
  });
  page2.drawText('PAGE 2: TOOLS & ANNOTATIONS PLAYGROUND', {
    x: 40,
    y: p2Height - 65,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page2.drawText('Try testing the shapes, highlighters, links, and whiteout on this page.', {
    x: 40,
    y: p2Height - 96,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  page2.drawText('Sample Redaction Target:', {
    x: 40,
    y: p2Height - 140,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  page2.drawText('Confidential Account Key: SEC-9874-CONFIDENTIAL-KEY (Try covering this with Whiteout)', {
    x: 40,
    y: p2Height - 160,
    size: 11,
    font: helvetica,
    color: rgb(0.7, 0.1, 0.1),
  });
  page2.drawText('Sample Highlight Target:', {
    x: 40,
    y: p2Height - 200,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  page2.drawText('This important clause requires special attention: All exported PDFs retain maximum fidelity.', {
    x: 40,
    y: p2Height - 220,
    size: 11,
    font: timesRoman,
    color: rgb(0.15, 0.15, 0.15),
  });
  return await pdfDoc.save();
}
export async function createBlankPdf() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595.28, 841.89]);
  return await pdfDoc.save();
}