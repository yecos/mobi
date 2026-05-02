import { NextRequest, NextResponse } from 'next/server';
import type { CopilotFurnitureData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface SheetRequest {
  furnitureData: CopilotFurnitureData;
  viewImages?: Record<string, string | null>;
  originalImage?: string;
}

/**
 * Generate a professional VIVA MOBILI product sheet PDF.
 * This creates a raw PDF 1.4 document with architectural precision layout.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SheetRequest;
    const { furnitureData, viewImages, originalImage } = body;

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const pdf = buildProductSheetPDF(furnitureData, viewImages, originalImage);
    const pdfBase64 = Buffer.from(pdf).toString('base64');

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
    });
  } catch (error) {
    console.error('[copilot-sheet] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate product sheet',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

function buildProductSheetPDF(
  data: CopilotFurnitureData,
  viewImages?: Record<string, string | null>,
  originalImage?: string,
): Buffer {
  // A4 portrait: 595 x 842 points
  const W = 595;
  const H = 842;
  const M = 40; // margin
  const CS = new ContentStream();

  // ── Colors ──
  const pearlGray = rgbToPdf(0.898, 0.898, 0.898); // #E5E5E5
  const darkGray = rgbToPdf(0.290, 0.290, 0.290);   // #4A4A4A
  const primary = hexToPdf(data.colorPalette.primary);
  const secondary = hexToPdf(data.colorPalette.secondary);
  const white = rgbToPdf(1, 1, 1);
  const black = rgbToPdf(0, 0, 0);
  const lightGray = rgbToPdf(0.95, 0.95, 0.95);
  const accentLine = rgbToPdf(0.545, 0.451, 0.333); // warm amber

  // ── PAGE 1: Product Sheet ──

  // Header bar - VIVA MOBILI branding
  CS.rectFill(0, H - 50, W, 50, primary);
  CS.txt(20, H - 35, 'VIVA MOBILI', 'Helvetica-Bold', 18, white);
  CS.txt(W - M, H - 35, 'PRODUCT TECHNICAL SHEET', 'Helvetica', 9, white, 'right');

  // Product title section
  let y = H - 80;
  CS.txt(M, y, data.productType.toUpperCase(), 'Helvetica-Bold', 22, darkGray);
  y -= 18;
  CS.txt(M, y, `${data.style} style  •  ${data.material.main}  •  ${data.finish}`, 'Helvetica', 10, rgbToPdf(0.4, 0.4, 0.4));
  y -= 5;
  CS.line(M, y, W - M, y, 0.5, accentLine);
  y -= 15;

  // Left column: Specifications
  const specX = M;
  const specW = 220;
  let specY = y;

  // Specification sections
  const specSections = [
    { label: 'MATERIAL', value: data.material.main },
    { label: 'FINISH', value: data.finish },
    { label: 'FEATURE', value: data.feature },
    { label: 'HEIGHT', value: `${data.dimensions.height} cm` },
    { label: 'WIDTH', value: `${data.dimensions.width} cm` },
    { label: 'DEPTH', value: `${data.dimensions.depth} cm` },
    { label: 'WEIGHT', value: `${data.weight} kg` },
  ];

  if (data.dimensions.seatHeight) {
    specSections.push({ label: 'SEAT HEIGHT', value: `${data.dimensions.seatHeight} cm` });
  }

  CS.txt(specX, specY, 'SPECIFICATIONS', 'Helvetica-Bold', 11, darkGray);
  specY -= 16;

  for (const section of specSections) {
    CS.rectFill(specX, specY - 14, specW, 16, lightGray);
    CS.txt(specX + 6, specY - 3, section.label, 'Helvetica', 7, rgbToPdf(0.5, 0.5, 0.5));
    CS.txt(specX + specW - 6, specY - 3, section.value, 'Helvetica-Bold', 9, darkGray, 'right');
    specY -= 18;
  }

  // Material details
  specY -= 8;
  CS.txt(specX, specY, 'MATERIAL DETAILS', 'Helvetica-Bold', 9, darkGray);
  specY -= 14;
  for (const detail of data.material.details) {
    CS.txt(specX + 8, specY, `•  ${detail}`, 'Helvetica', 8, rgbToPdf(0.35, 0.35, 0.35));
    specY -= 12;
  }

  // Right column: Views area (placeholder boxes if no AI images)
  const viewX = specX + specW + 20;
  const viewW = W - viewX - M;
  let viewY = y;

  // 4-view grid: 2x2
  const cellW = viewW / 2 - 4;
  const cellH = 100;
  const viewLabels = ['FRONT VIEW', 'SIDE VIEW', 'TOP VIEW', '3/4 PERSPECTIVE'];
  const viewKeys = ['front', 'side', 'top', 'perspective'];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = viewX + col * (cellW + 8);
    const cy = viewY - row * (cellH + 22);

    // View box
    CS.rectFill(cx, cy - cellH, cellW, cellH, pearlGray);
    CS.rect(cx, cy - cellH, cellW, cellH, 0.5, darkGray);

    // View label
    CS.txt(cx + cellW / 2, cy - cellH - 10, viewLabels[i], 'Helvetica', 7, darkGray, 'center');

    // Dimension annotations inside view boxes
    if (viewKeys[i] === 'front') {
      // Height dimension line (left side)
      const lx = cx + 12;
      CS.line(lx, cy - 8, lx, cy - cellH + 8, 0.3, darkGray);
      CS.txt(lx + 4, cy - cellH / 2, `${data.dimensions.height}`, 'Helvetica', 6, darkGray);
      // Width dimension line (bottom)
      const by = cy - cellH + 12;
      CS.line(cx + 8, by, cx + cellW - 8, by, 0.3, darkGray);
      CS.txt(cx + cellW / 2, by + 4, `${data.dimensions.width}`, 'Helvetica', 6, darkGray, 'center');
    } else if (viewKeys[i] === 'side') {
      const lx = cx + 12;
      CS.line(lx, cy - 8, lx, cy - cellH + 8, 0.3, darkGray);
      CS.txt(lx + 4, cy - cellH / 2, `${data.dimensions.height}`, 'Helvetica', 6, darkGray);
      const by = cy - cellH + 12;
      CS.line(cx + 8, by, cx + cellW - 8, by, 0.3, darkGray);
      CS.txt(cx + cellW / 2, by + 4, `${data.dimensions.depth}`, 'Helvetica', 6, darkGray, 'center');
    } else if (viewKeys[i] === 'top') {
      const by = cy - cellH + 12;
      CS.line(cx + 8, by, cx + cellW - 8, by, 0.3, darkGray);
      CS.txt(cx + cellW / 2, by + 4, `${data.dimensions.width}`, 'Helvetica', 6, darkGray, 'center');
      const lx = cx + 12;
      CS.line(lx, cy - 8, lx, cy - cellH + 18, 0.3, darkGray);
      CS.txt(lx + 4, cy - cellH / 2 - 2, `${data.dimensions.depth}`, 'Helvetica', 6, darkGray);
    }
  }

  // ── Annotations section ──
  let annY = viewY - 2 * (cellH + 22) - 20;
  CS.txt(M, annY, 'DESIGN HIGHLIGHTS', 'Helvetica-Bold', 11, darkGray);
  annY -= 5;
  CS.line(M, annY, W - M, annY, 0.5, accentLine);
  annY -= 18;

  const icons = ['◈', '⬡', '◆']; // Texture, Structure, Functional
  const iconLabels = ['Texture', 'Structure', 'Functional'];
  for (let i = 0; i < data.annotations.length; i++) {
    const ann = data.annotations[i];
    const iconChar = icons[i] || '•';
    const iconLabel = iconLabels[i] || 'Detail';

    CS.txt(M + 4, annY, iconChar, 'Helvetica', 12, primary);
    CS.txt(M + 20, annY + 2, iconLabel.toUpperCase(), 'Helvetica', 7, secondary);
    CS.txt(M + 20, annY - 8, ann, 'Helvetica', 8, darkGray);
    annY -= 28;
  }

  // ── Color Palette Strip ──
  annY -= 10;
  CS.txt(M, annY, 'COLOR PALETTE', 'Helvetica-Bold', 9, darkGray);
  annY -= 16;

  const paletteW = (W - 2 * M) / 4;
  const paletteH = 24;
  const paletteColors = [
    { hex: data.colorPalette.primary, label: 'Material' },
    { hex: data.colorPalette.secondary, label: 'Feature' },
    { hex: data.colorPalette.pearlGray, label: 'Pearl Gray' },
    { hex: data.colorPalette.darkGray, label: 'Dark Gray' },
  ];

  for (let i = 0; i < paletteColors.length; i++) {
    const px = M + i * paletteW;
    const pdfColor = hexToPdf(paletteColors[i].hex);
    CS.rectFill(px, annY - paletteH, paletteW - 4, paletteH, pdfColor);
    CS.txt(px + (paletteW - 4) / 2, annY - paletteH - 10, paletteColors[i].label, 'Helvetica', 7, darkGray, 'center');
    CS.txt(px + (paletteW - 4) / 2, annY - paletteH - 20, paletteColors[i].hex.toUpperCase(), 'Helvetica', 6, rgbToPdf(0.5, 0.5, 0.5), 'center');
  }

  // ── Footer ──
  CS.rectFill(0, 0, W, 30, primary);
  CS.txt(M, 10, 'VIVA MOBILI  •  Professional Furniture Specifications', 'Helvetica', 8, white);
  CS.txt(W - M, 10, new Date().toISOString().split('T')[0], 'Helvetica', 8, white, 'right');

  // ── Build PDF ──
  return buildPDF(W, H, CS.content);
}

// ── PDF Building Utilities ──

class ContentStream {
  content: string[] = [];

  txt(x: number, y: number, text: string, font: string, size: number, color: number[], align: string = 'left') {
    const colorStr = `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
    const fontName = font === 'Helvetica-Bold' ? 'F2' : 'F1';
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    if (align === 'center') {
      this.content.push(
        `q ${colorStr} rg BT /${fontName} ${size} Tf`,
        `${x.toFixed(1)} ${y.toFixed(1)} Td`,
        `(${escaped}) Tj ET Q`
      );
    } else if (align === 'right') {
      this.content.push(
        `q ${colorStr} rg BT /${fontName} ${size} Tf`,
        `${x.toFixed(1)} ${y.toFixed(1)} Td`,
        `(${escaped}) Tj ET Q`
      );
    } else {
      this.content.push(
        `q ${colorStr} rg BT /${fontName} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escaped}) Tj ET Q`
      );
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, width: number, color: number[]) {
    const colorStr = `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
    this.content.push(
      `q ${colorStr} RG ${width.toFixed(1)} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S Q`
    );
  }

  rect(x: number, y: number, w: number, h: number, width: number, color: number[]) {
    const colorStr = `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
    this.content.push(
      `q ${colorStr} RG ${width.toFixed(1)} w ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S Q`
    );
  }

  rectFill(x: number, y: number, w: number, h: number, color: number[]) {
    const colorStr = `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
    this.content.push(
      `q ${colorStr} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f Q`
    );
  }
}

function hexToPdf(hex: string): number[] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function rgbToPdf(r: number, g: number, b: number): number[] {
  return [r, g, b];
}

function buildPDF(width: number, height: number, streamContent: string[]): Buffer {
  const stream = streamContent.join('\n');
  const streamBytes = Buffer.from(stream, 'latin1');

  const objects: Buffer[] = [];
  let objNum = 0;

  function addObj(content: string): number {
    objNum++;
    objects.push(Buffer.from(`${objNum} 0 obj\n${content}\nendobj\n`, 'latin1'));
    return objNum;
  }

  // Object 1: Catalog
  const catalogNum = addObj('<< /Type /Catalog /Pages 2 0 R >>');

  // Object 2: Pages
  const pagesNum = addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');

  // Object 3: Page
  const pageNum = addObj(
    `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${width} ${height}] ` +
    `/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
  );

  // Object 4: Content stream
  const streamNum = addObj(
    `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`
  );

  // Object 5: Helvetica font
  const f1Num = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  // Object 6: Helvetica-Bold font
  const f2Num = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  // Build PDF
  const header = Buffer.from('%PDF-1.4\n', 'latin1');
  let pdf = header;

  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, objects[i]]);
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  pdf = Buffer.concat([pdf, Buffer.from(xref, 'latin1')]);
  return pdf;
}
