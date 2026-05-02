// ============================================================================
// PDF Page Generator - Professional Furniture Specification Sheet
// MOBI Furniture Plan Application
//
// Design reference: Domellini-style portrait A4 product sheet
//   - Brand header with logo
//   - Product photo + spec table side by side
//   - Technical drawings (front/side/top) with dimension annotations
//   - Materials table
//   - Observations section
//   - Contact/footer
// ============================================================================

import type { FurnitureData } from '@/lib/types';
import { defaultFurnitureData } from '@/lib/types';
import { dimensionToCm, displayDimension } from '@/lib/convert';
import { generateDrawingFromFurnitureData } from '@/lib/svg-engine';

// ============================================================================
// Layout Constants (A4 Portrait: 595 × 842 points)
// ============================================================================

const PW = 595;   // page width
const PH = 842;   // page height
const MX = 40;    // horizontal margin
const MR = 40;    // right margin
const USABLE_W = PW - MX - MR; // 515

// Color palette (warm beige professional style)
const COL_BEIGE = { r: 0.75, g: 0.69, b: 0.63 };   // #C0B0A0 warm beige for headers
const COL_BEIGE_LIGHT = { r: 0.94, g: 0.91, b: 0.88 }; // #F0E8E0 light beige bg
const COL_DARK = { r: 0.15, g: 0.15, b: 0.15 };     // #262626 near-black text
const COL_GRAY = { r: 0.45, g: 0.45, b: 0.45 };     // #737373 secondary text
const COL_LIGHT_GRAY = { r: 0.82, g: 0.82, b: 0.82 }; // #D1D1D1 dividers
const COL_WHITE = { r: 1, g: 1, b: 1 };
const COL_TABLE_ALT = { r: 0.97, g: 0.96, b: 0.94 };  // #F7F5F0 alternating row

// Header section (top of page)
const H_BRAND_Y = 810;
const H_BRAND_LINE = 798;

// Product section
const P_TITLE_Y = 778;
const P_PHOTO_TOP = 758;
const P_PHOTO_H = 180;
const P_PHOTO_BOT = P_PHOTO_TOP - P_PHOTO_H;  // 578
const P_PHOTO_W = 200;
const P_PHOTO_X = MX;
const P_SPEC_X = MX + P_PHOTO_W + 20;  // spec table starts here
const P_SPEC_W = PW - P_SPEC_X - MR;

// Section divider
const DIV1_Y = P_PHOTO_BOT - 12;  // 566

// Technical Overview section - NEW LAYOUT
// Frontal view: full width, prominent
const T_TITLE_Y = DIV1_Y - 22;  // 544
const T_FRONT_TOP = T_TITLE_Y - 12;  // 532
const T_FRONT_H = 195;
const T_FRONT_W = USABLE_W;  // 515pt full width
const T_FRONT_BOT = T_FRONT_TOP - T_FRONT_H;  // 337

// Plant + Lateral: side by side below frontal
const T_SIDE_TOP = T_FRONT_BOT - 20;  // 317 (20pt gap for label)
const T_SIDE_H = 185;
const T_HALF_W = (USABLE_W - 12) / 2;  // ~251.5pt each with 12pt gap
const T_PLANT_X = MX;
const T_LATERAL_X = MX + T_HALF_W + 12;

const T_SIDE_BOT = T_SIDE_TOP - T_SIDE_H;  // 132

// Section divider 2
const DIV2_Y = T_SIDE_BOT - 12;  // 120

// Materials section
const M_TITLE_Y = DIV2_Y - 22;  // 98
const M_TABLE_TOP = M_TITLE_Y - 16;
const M_ROW_H = 14;
const MAX_TABLE_ROWS = 4;

// Table columns
const TABLE_LEFT = MX + 8;
const TABLE_RIGHT = PW - MR - 8;
const COL_W = [24, 120, 40, 180, 143]; // #, Material, Qty, Description, Observations

// Observations section
const OBS_TITLE_Y_OFFSET = 12;

// Dimensions footer bar
const FOOTER_Y = 28;
const FOOTER_BAR_H = 20;

// ============================================================================
// Helpers
// ============================================================================

export function parseImageBuffer(base64?: string): Buffer | null {
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function esc(text: string): string {
  let r = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c === 0x5c) r += '\\\\';
    else if (c === 0x28) r += '\\(';
    else if (c === 0x29) r += '\\)';
    else if (c >= 32 && c < 127) r += ch;
    else if (c >= 161 && c <= 255) r += '\\' + c.toString(8).padStart(3, '0');
    else if (c === 128) r += '\\200';
    else r += '?';
  }
  return r;
}

function trunc(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max - 1) + '...';
}

function fmtDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (test.length > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ============================================================================
// Background removal helper
// ============================================================================

async function removeBackground(imageBuffer: Buffer): Promise<Buffer | null> {
  try {
    const { removeBackground: bgRemoval } = await import('@imgly/background-removal');
    const blob = await bgRemoval(imageBuffer, {
      output: { format: 'image/png' },
    });
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn('[pdf] Background removal failed, using original:', err);
    return null;
  }
}

// ============================================================================
// SVG → JPEG conversion pipeline
// ============================================================================

interface ImgResult {
  buffer: Buffer;
  width: number;
  height: number;
}

async function svgToJpeg(svgString: string, targetWidth: number): Promise<ImgResult> {
  const { Resvg } = await import('@resvg/resvg-js');
  const sharp = (await import('sharp')).default;

  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: targetWidth } });
  const pngData = resvg.render();
  const pngBuf = Buffer.from(pngData.asPng());

  const jpegBuf = await sharp(pngBuf).jpeg({ quality: 95 }).toBuffer();
  const meta = await sharp(jpegBuf).metadata();

  return {
    buffer: jpegBuf,
    width: meta.width ?? targetWidth,
    height: meta.height ?? Math.round(targetWidth * 0.75),
  };
}

// ============================================================================
// SVG view resolution
// ============================================================================

export interface SvgViews {
  plant?: string;
  frontal?: string;
  lateral?: string;
}

function resolveSvgViews(data: FurnitureData, svgViews?: SvgViews | null): SvgViews {
  if (svgViews && (svgViews.frontal || svgViews.lateral || svgViews.plant)) {
    return svgViews;
  }
  try {
    const result = generateDrawingFromFurnitureData(data, { unit: 'cm', showDimensions: true });
    return {
      frontal: result.frontalView.svgContent,
      lateral: result.lateralView.svgContent,
      plant: result.plantView.svgContent,
    };
  } catch (err) {
    console.warn('[pdf] SVG engine failed:', err);
    return {};
  }
}

interface ProcessedImage {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
}

async function processView(
  svgContent: string | undefined,
  name: string,
  targetWidth: number,
): Promise<ProcessedImage | null> {
  if (!svgContent) return null;
  try {
    const img = await svgToJpeg(svgContent, targetWidth);
    return { name, ...img };
  } catch (err) {
    console.warn(`[pdf] Failed to convert ${name}:`, err);
    return null;
  }
}

// ============================================================================
// PDF Content Stream builder
// ============================================================================

class CS {
  private ops: string[] = [];

  txt(x: number, y: number, text: string, font: 'F1' | 'F2', size: number): this {
    this.ops.push('BT', `/${font} ${size} Tf`, `${x} ${y} Td`, `(${esc(text)}) Tj`, 'ET');
    return this;
  }

  bold(x: number, y: number, text: string, size = 10): this { return this.txt(x, y, text, 'F2', size); }
  norm(x: number, y: number, text: string, size = 10): this { return this.txt(x, y, text, 'F1', size); }

  /** Set text color (RGB 0-1) */
  setColor(r: number, g: number, b: number): this {
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, w = 0.5): this {
    this.ops.push(`${w} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, 'S');
    return this;
  }

  rectFill(x: number, y: number, w: number, h: number, r: number, g: number, b: number): this {
    this.ops.push('q', `${r} ${g} ${b} rg`, `${x} ${y} ${w} ${h} re`, 'f', 'Q');
    return this;
  }

  rectStroke(x: number, y: number, w: number, h: number, lw = 0.5): this {
    this.ops.push(`${lw} w`, `${x} ${y} ${w} ${h} re S`);
    return this;
  }

  img(name: string, x: number, y: number, w: number, h: number): this {
    this.ops.push('q', `${w} 0 0 ${h} ${x} ${y} cm`, `/${name} Do`, 'Q');
    return this;
  }

  /** Draw image preserving aspect ratio within bounding box */
  fitImage(name: string, boxX: number, boxY: number, boxW: number, boxH: number, imgW: number, imgH: number): this {
    const imgAspect = imgW / imgH;
    const boxAspect = boxW / boxH;
    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgAspect > boxAspect) {
      drawW = boxW;
      drawH = boxW / imgAspect;
      drawX = boxX;
      drawY = boxY + (boxH - drawH) / 2;
    } else {
      drawH = boxH;
      drawW = boxH * imgAspect;
      drawX = boxX + (boxW - drawW) / 2;
      drawY = boxY;
    }
    return this.img(name, drawX, drawY, drawW, drawH);
  }

  /** Draw a rounded rectangle (filled) */
  roundRectFill(x: number, y: number, w: number, h: number, radius: number, r: number, g: number, b: number): this {
    this.ops.push('q',
      `${r} ${g} ${b} rg`,
      `${x + radius} ${y} m`,
      `${x + w - radius} ${y} l`,
      `${x + w} ${y} ${x + w} ${y + radius} ${x + w} ${y + radius} c`,
      `${x + w} ${y + h - radius} l`,
      `${x + w} ${y + h} ${x + w - radius} ${y + h} ${x + w - radius} ${y + h} c`,
      `${x + radius} ${y + h} l`,
      `${x} ${y + h} ${x} ${y + h - radius} ${x} ${y + h - radius} c`,
      `${x} ${y + radius} l`,
      `${x} ${y} ${x + radius} ${y} ${x + radius} ${y} c`,
      'f', 'Q');
    return this;
  }

  build(): Buffer {
    return Buffer.from(this.ops.join('\n'), 'latin1');
  }
}

// ============================================================================
// Build content stream for a single page (Domellini-style portrait)
// ============================================================================

interface ImageDimensions {
  frontalImgW: number;
  frontalImgH: number;
  lateralImgW: number;
  lateralImgH: number;
  plantImgW: number;
  plantImgH: number;
}

function buildPageContent(
  data: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  hasPhoto: boolean,
  hasFrontal: boolean,
  hasLateral: boolean,
  hasPlant: boolean,
  imgDims?: ImageDimensions,
): Buffer {
  const c = new CS();
  const units = unitSystem === 'metric' ? 'cm' : 'in';

  // Default image dimensions if not provided
  const frontalImgW = imgDims?.frontalImgW ?? 515;
  const frontalImgH = imgDims?.frontalImgH ?? 400;
  const lateralImgW = imgDims?.lateralImgW ?? 400;
  const lateralImgH = imgDims?.lateralImgH ?? 300;
  const plantImgW = imgDims?.plantImgW ?? 400;
  const plantImgH = imgDims?.plantImgH ?? 300;

  // ── 1. BRAND HEADER ────────────────────────────────────────────────
  // Brand name in warm beige, left-aligned
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  c.bold(MX, H_BRAND_Y, 'MOBI', 14);
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.norm(MX + 52, H_BRAND_Y, 'Furniture Specifications', 9);

  // Date on the right
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.norm(PW - MR - 70, H_BRAND_Y, fmtDate(), 9);

  // Thin separator line
  c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
  c.line(MX, H_BRAND_LINE, PW - MR, H_BRAND_LINE, 0.5);

  // ── 2. PRODUCT SECTION ────────────────────────────────────────────
  // Product title (large, centered)
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  const title = data.productName || 'Untitled Project';
  c.bold((PW) / 2 - title.length * 4.5, P_TITLE_Y, title, 22);

  // Photo placeholder / actual photo
  if (hasPhoto) {
    c.img('Im0', P_PHOTO_X, P_PHOTO_BOT, P_PHOTO_W, P_PHOTO_H);
  } else {
    c.roundRectFill(P_PHOTO_X, P_PHOTO_BOT, P_PHOTO_W, P_PHOTO_H, 4,
      COL_BEIGE_LIGHT.r, COL_BEIGE_LIGHT.g, COL_BEIGE_LIGHT.b);
    c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
    c.norm(P_PHOTO_X + P_PHOTO_W / 2 - 30, P_PHOTO_BOT + P_PHOTO_H / 2 - 4, 'No Image', 10);
  }

  // Specification table (right of photo)
  const specX = P_SPEC_X;
  const specW = P_SPEC_W;
  const specRowH = 18;
  const specTopY = P_PHOTO_TOP;

  // Spec table background
  c.roundRectFill(specX, P_PHOTO_BOT, specW, P_PHOTO_H, 4,
    COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.rectStroke(specX, P_PHOTO_BOT, specW, P_PHOTO_H, 0.3);

  // Spec rows
  const hCm = dimensionToCm(data.dimensions.height);
  const wCm = dimensionToCm(data.dimensions.width);
  const dCm = dimensionToCm(data.dimensions.depth);

  const specRows: [string, string][] = [
    ['Dimensions', `L ${displayDimension(wCm, unitSystem)}  ×  W ${displayDimension(dCm, unitSystem)}  ×  H ${displayDimension(hCm, unitSystem)}`],
    ['Category', data.category || 'N/A'],
    ['Materials', data.materials?.map(m => m.material).join(', ') || 'N/A'],
    ['Brand', data.brand || 'Unknown'],
    ['Reference', data.referenceNumber || 'N/A'],
    ['Units', units],
    ['Quantity', String(data.quantity || 1)],
  ];

  // Style info
  if (data.style) {
    specRows.push(['Style', data.style]);
  }
  if (data.finish) {
    specRows.push(['Finish', data.finish]);
  }
  if (data.specialFeature) {
    specRows.push(['Feature', data.specialFeature]);
  }

  // Color finishes
  if (data.colorFinishes && data.colorFinishes.length > 0) {
    specRows.push(['Colors', data.colorFinishes.map(cf => cf.name).join(', ')]);
  }

  for (let i = 0; i < specRows.length; i++) {
    const ry = specTopY - (i + 1) * specRowH + 4;

    if (i % 2 === 0) {
      c.rectFill(specX + 2, ry - 4, specW - 4, specRowH,
        COL_BEIGE_LIGHT.r, COL_BEIGE_LIGHT.g, COL_BEIGE_LIGHT.b);
    }

    c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
    c.bold(specX + 8, ry, specRows[i][0], 8);
    c.setColor(COL_DARK.r, COL_DARK.g, COL_DARK.b);
    c.norm(specX + 80, ry, trunc(specRows[i][1], 45), 8);
  }

  // ── Section divider ────────────────────────────────────────────────
  c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
  c.line(MX, DIV1_Y, PW - MR, DIV1_Y, 0.5);

  // ── 3. TECHNICAL OVERVIEW SECTION ─────────────────────────────────
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  c.bold(MX, T_TITLE_Y, 'Technical Overview', 14);

  // Front view - full width
  c.roundRectFill(MX, T_FRONT_BOT, T_FRONT_W, T_FRONT_H, 4,
    COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.rectStroke(MX, T_FRONT_BOT, T_FRONT_W, T_FRONT_H, 0.3);

  if (hasFrontal) {
    c.fitImage('Im1', MX, T_FRONT_BOT, T_FRONT_W, T_FRONT_H, frontalImgW, frontalImgH);
  } else {
    c.rectFill(MX, T_FRONT_BOT, T_FRONT_W, T_FRONT_H,
      COL_BEIGE_LIGHT.r, COL_BEIGE_LIGHT.g, COL_BEIGE_LIGHT.b);
  }
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.bold(MX + 4, T_FRONT_TOP + 2, 'Front View', 9);

  // Plant view - left half
  c.roundRectFill(T_PLANT_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, 4,
    COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.rectStroke(T_PLANT_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, 0.3);

  if (hasPlant) {
    c.fitImage('Im3', T_PLANT_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, plantImgW, plantImgH);
  } else {
    c.rectFill(T_PLANT_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H,
      COL_BEIGE_LIGHT.r, COL_BEIGE_LIGHT.g, COL_BEIGE_LIGHT.b);
  }
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.bold(T_PLANT_X + 4, T_SIDE_TOP + 2, 'Top View', 9);

  // Lateral view - right half
  c.roundRectFill(T_LATERAL_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, 4,
    COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.rectStroke(T_LATERAL_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, 0.3);

  if (hasLateral) {
    c.fitImage('Im2', T_LATERAL_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H, lateralImgW, lateralImgH);
  } else {
    c.rectFill(T_LATERAL_X, T_SIDE_BOT, T_HALF_W, T_SIDE_H,
      COL_BEIGE_LIGHT.r, COL_BEIGE_LIGHT.g, COL_BEIGE_LIGHT.b);
  }
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.bold(T_LATERAL_X + 4, T_SIDE_TOP + 2, 'Side View', 9);

  // ── Section divider 2 ─────────────────────────────────────────────
  c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
  c.line(MX, DIV2_Y, PW - MR, DIV2_Y, 0.5);

  // ── 4. MATERIALS TABLE ────────────────────────────────────────────
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  c.bold(MX, M_TITLE_Y, 'Materials', 14);

  const materials = data.materials || [];
  const shown = materials.slice(0, MAX_TABLE_ROWS);
  const tblW = TABLE_RIGHT - TABLE_LEFT;
  const tblTopY = M_TITLE_Y - 16;

  // Table header background
  c.rectFill(TABLE_LEFT, tblTopY - 4, tblW, 16,
    COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);

  // Header text (white on beige)
  c.setColor(COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  let cx = TABLE_LEFT + 4;
  c.bold(cx, tblTopY, '#', 8);                     cx += COL_W[0];
  c.bold(cx, tblTopY, 'Material', 8);               cx += COL_W[1];
  c.bold(cx, tblTopY, 'Qty', 8);                    cx += COL_W[2];
  c.bold(cx, tblTopY, 'Description', 8);            cx += COL_W[3];
  c.bold(cx, tblTopY, 'Observations', 8);

  c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
  c.line(TABLE_LEFT, tblTopY - 6, TABLE_RIGHT, tblTopY - 6, 0.5);

  // Data rows
  for (let i = 0; i < shown.length; i++) {
    const m = shown[i];
    const ry = tblTopY - 16 - i * M_ROW_H;

    if (i % 2 === 1) {
      c.rectFill(TABLE_LEFT, ry - 4, tblW, M_ROW_H,
        COL_TABLE_ALT.r, COL_TABLE_ALT.g, COL_TABLE_ALT.b);
    }

    c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
    c.line(TABLE_LEFT, ry - 5, TABLE_RIGHT, ry - 5, 0.2);

    c.setColor(COL_DARK.r, COL_DARK.g, COL_DARK.b);
    let rx = TABLE_LEFT + 4;
    c.norm(rx, ry, String(i + 1), 8);                               rx += COL_W[0];
    c.norm(rx, ry, trunc(m.material || '', 18), 8);                 rx += COL_W[1];
    c.norm(rx, ry, String(m.quantity ?? ''), 8);                    rx += COL_W[2];
    c.norm(rx, ry, trunc(m.description || '', 28), 8);              rx += COL_W[3];
    c.norm(rx, ry, trunc(m.observations || '', 22), 8);
  }

  let afterTable = tblTopY - 16 - shown.length * M_ROW_H - 8;
  if (materials.length > MAX_TABLE_ROWS) {
    c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
    c.norm(TABLE_LEFT + 4, afterTable, `... and ${materials.length - MAX_TABLE_ROWS} more materials`, 8);
    afterTable -= 14;
  }

  // ── 5. OBSERVATIONS ───────────────────────────────────────────────
  const obsText = data.observations || data.descriptionEs || '';
  if (obsText) {
    const obsY = afterTable - OBS_TITLE_Y_OFFSET;
    c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
    c.bold(MX, obsY, 'Observations', 11);
    c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
    const obsLines = wrapText(obsText, 85);
    for (let i = 0; i < Math.min(obsLines.length, 2); i++) {
      c.norm(MX + 8, obsY - 14 - i * 12, trunc(obsLines[i], 85), 8);
    }
  }

  // ── 6. FOOTER BAR ─────────────────────────────────────────────────
  // Warm beige bar at the bottom
  c.rectFill(0, FOOTER_Y - 4, PW, FOOTER_BAR_H, COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);

  c.setColor(COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.bold(MX + 8, FOOTER_Y + 4, 'MOBI', 9);
  c.norm(MX + 50, FOOTER_Y + 4, 'Furniture Specification Sheet', 7);

  // Dimension summary in footer
  const dimText = `H: ${displayDimension(hCm, unitSystem)}   ×   W: ${displayDimension(wCm, unitSystem)}   ×   D: ${displayDimension(dCm, unitSystem)}`;
  c.norm(PW - MR - dimText.length * 3.8, FOOTER_Y + 4, dimText, 7);

  return c.build();
}

// ============================================================================
// Build concept page content
// ============================================================================

function buildConceptPageContent(
  data: FurnitureData,
  conceptImgW: number,
  conceptImgH: number,
  prompt?: string,
): Buffer {
  const c = new CS();

  // ── 1. BRAND HEADER ────────────────────────────────────────────────
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  c.bold(MX, H_BRAND_Y, 'MOBI', 14);
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.norm(MX + 52, H_BRAND_Y, 'AI Concept Sketch', 9);

  // Date on the right
  c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
  c.norm(PW - MR - 70, H_BRAND_Y, fmtDate(), 9);

  // Thin separator line
  c.setColor(COL_LIGHT_GRAY.r, COL_LIGHT_GRAY.g, COL_LIGHT_GRAY.b);
  c.line(MX, H_BRAND_LINE, PW - MR, H_BRAND_LINE, 0.5);

  // ── 2. PRODUCT TITLE ──────────────────────────────────────────────
  c.setColor(COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  const title = data.productName || 'Untitled Project';
  c.bold((PW) / 2 - title.length * 4.5, P_TITLE_Y, title, 22);

  // ── 3. SECTION TITLE ──────────────────────────────────────────────
  c.setColor(COL_DARK.r, COL_DARK.g, COL_DARK.b);
  c.bold(MX, P_TITLE_Y - 36, 'AI Concept Sketch', 16);

  // ── 4. CONCEPT IMAGE (centered, large) ────────────────────────────
  const conceptBoxW = USABLE_W;
  const conceptBoxH = 480;
  const conceptBoxX = MX;
  const conceptBoxY = PH - 130 - conceptBoxH;  // position from bottom

  // Background
  c.roundRectFill(conceptBoxX, conceptBoxY, conceptBoxW, conceptBoxH, 6,
    COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.rectStroke(conceptBoxX, conceptBoxY, conceptBoxW, conceptBoxH, 0.3);

  // Image with aspect ratio preservation
  c.fitImage('ImC', conceptBoxX, conceptBoxY, conceptBoxW, conceptBoxH, conceptImgW, conceptImgH);

  // ── 5. PROMPT TEXT ────────────────────────────────────────────────
  if (prompt) {
    c.setColor(COL_GRAY.r, COL_GRAY.g, COL_GRAY.b);
    c.bold(MX, conceptBoxY - 18, 'Prompt:', 9);
    const promptLines = wrapText(prompt, 90);
    for (let i = 0; i < Math.min(promptLines.length, 3); i++) {
      c.norm(MX + 4, conceptBoxY - 32 - i * 12, trunc(promptLines[i], 90), 8);
    }
  }

  // ── 6. FOOTER BAR ─────────────────────────────────────────────────
  c.rectFill(0, FOOTER_Y - 4, PW, FOOTER_BAR_H, COL_BEIGE.r, COL_BEIGE.g, COL_BEIGE.b);
  c.setColor(COL_WHITE.r, COL_WHITE.g, COL_WHITE.b);
  c.bold(MX + 8, FOOTER_Y + 4, 'MOBI', 9);
  c.norm(MX + 50, FOOTER_Y + 4, 'AI Concept Sketch', 7);

  return c.build();
}

// ============================================================================
// Raw PDF builder
// ============================================================================

interface PdfObj {
  id: number;
  data: Buffer;
}

function dictObj(s: string): Buffer {
  return Buffer.from(s, 'latin1');
}

function streamObj(dictExtra: string, payload: Buffer): Buffer {
  const header = `<< ${dictExtra} /Length ${payload.length} >>\nstream\n`;
  const footer = '\nendstream';
  return Buffer.concat([Buffer.from(header, 'latin1'), payload, Buffer.from(footer, 'latin1')]);
}

function assemblePDF(objects: PdfObj[]): Buffer {
  const parts: Buffer[] = [];
  const offsets: Record<number, number> = {};
  let pos = 0;

  const wr = (data: string | Buffer) => {
    const b = typeof data === 'string' ? Buffer.from(data, 'latin1') : data;
    parts.push(b);
    pos += b.length;
  };

  wr('%PDF-1.4\n');
  wr('%\xE2\xE3\xCF\xD3\n');

  for (const obj of objects) {
    offsets[obj.id] = pos;
    wr(`${obj.id} 0 obj\n`);
    wr(obj.data);
    wr('\nendobj\n');
  }

  const xrefPos = pos;
  const maxId = Math.max(...objects.map(o => o.id));

  wr('xref\n');
  wr(`0 ${maxId + 1}\n`);
  wr('0000000000 65535 f \n');

  for (let i = 1; i <= maxId; i++) {
    if (offsets[i] !== undefined) {
      wr(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    } else {
      wr('0000000000 00000 f \n');
    }
  }

  wr('trailer\n');
  wr(`<< /Size ${maxId + 1} /Root 1 0 R >>\n`);
  wr('startxref\n');
  wr(`${xrefPos}\n`);
  wr('%%EOF\n');

  return Buffer.concat(parts);
}

// ============================================================================
// Build all PDF objects for one page
// ============================================================================

interface PageObjSet {
  objects: PdfObj[];
  pageId: number;
  xobjectNames: string[];
  _contentId: number;
  _xoDict: string;
}

async function buildPageObjectSet(
  data: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  svgViews: SvgViews | null | undefined,
  productImageBase64: string | null | undefined,
  idGen: () => number,
): Promise<PageObjSet> {
  const objects: PdfObj[] = [];

  // Resolve SVG views
  const views = resolveSvgViews(data, svgViews);

  // Convert SVG views to JPEG images (higher resolution for new layout)
  const frontalImg = await processView(views.frontal, 'Im1', 1050);
  const lateralImg = await processView(views.lateral, 'Im2', 800);
  const plantImg = await processView(views.plant, 'Im3', 800);

  // Process product photo with background removal
  let photoImg: ProcessedImage | null = null;
  if (productImageBase64) {
    try {
      const sharp = (await import('sharp')).default;
      const inputBuf = Buffer.from(productImageBase64, 'base64');

      // Try background removal
      const bgRemovedBuf = await removeBackground(inputBuf);
      const processedBuf = bgRemovedBuf || inputBuf;

      const resizedBuf = await sharp(processedBuf)
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      const meta = await sharp(resizedBuf).metadata();
      photoImg = {
        name: 'Im0',
        buffer: resizedBuf,
        width: meta.width ?? 600,
        height: meta.height ?? 600,
      };
    } catch {
      // Photo processing failed, skip
    }
  }

  const hasPhoto = !!photoImg;
  const hasFrontal = !!frontalImg;
  const hasLateral = !!lateralImg;
  const hasPlant = !!plantImg;

  // Image dimensions for fitImage
  const imgDims: ImageDimensions = {
    frontalImgW: frontalImg?.width ?? 515,
    frontalImgH: frontalImg?.height ?? 400,
    lateralImgW: lateralImg?.width ?? 400,
    lateralImgH: lateralImg?.height ?? 300,
    plantImgW: plantImg?.width ?? 400,
    plantImgH: plantImg?.height ?? 300,
  };

  // Assign IDs
  const pageId = idGen();
  const contentId = idGen();

  const imgIds: { name: string; objId: number }[] = [];
  if (photoImg) imgIds.push({ name: 'Im0', objId: idGen() });
  if (frontalImg) imgIds.push({ name: 'Im1', objId: idGen() });
  if (lateralImg) imgIds.push({ name: 'Im2', objId: idGen() });
  if (plantImg) imgIds.push({ name: 'Im3', objId: idGen() });

  // Build content stream
  const streamData = buildPageContent(data, unitSystem, hasPhoto, hasFrontal, hasLateral, hasPlant, imgDims);

  // XObject dict fragment
  const xoEntries = imgIds.map(i => `/${i.name} ${i.objId} 0 R`).join(' ');
  const xoDict = xoEntries ? ` /XObject << ${xoEntries} >>` : '';

  // Content stream object
  objects.push({ id: contentId, data: streamObj('', streamData) });

  // Image XObjects
  const addImageObj = (img: ProcessedImage) => {
    objects.push({
      id: imgIds.find(i => i.name === img.name)!.objId,
      data: streamObj(
        `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        img.buffer,
      ),
    });
  };

  if (photoImg) addImageObj(photoImg);
  if (frontalImg) addImageObj(frontalImg);
  if (lateralImg) addImageObj(lateralImg);
  if (plantImg) addImageObj(plantImg);

  return {
    objects,
    pageId,
    xobjectNames: imgIds.map(i => i.name),
    _contentId: contentId,
    _xoDict: xoDict,
  };
}

// Build concept page object set
async function buildConceptPageObjectSet(
  data: FurnitureData,
  conceptImageBase64: string,
  prompt: string | undefined,
  idGen: () => number,
): Promise<PageObjSet> {
  const objects: PdfObj[] = [];

  // Process concept image
  let conceptImg: ProcessedImage | null = null;
  try {
    const sharp = (await import('sharp')).default;
    const inputBuf = Buffer.from(conceptImageBase64, 'base64');
    const resizedBuf = await sharp(inputBuf)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
    const meta = await sharp(resizedBuf).metadata();
    conceptImg = {
      name: 'ImC',
      buffer: resizedBuf,
      width: meta.width ?? 800,
      height: meta.height ?? 800,
    };
  } catch {
    // Concept image processing failed
  }

  const conceptImgW = conceptImg?.width ?? 800;
  const conceptImgH = conceptImg?.height ?? 800;

  // Assign IDs
  const pageId = idGen();
  const contentId = idGen();
  const conceptImgId = idGen();

  const imgIds: { name: string; objId: number }[] = [];
  if (conceptImg) imgIds.push({ name: 'ImC', objId: conceptImgId });

  // Build content stream
  const streamData = buildConceptPageContent(data, conceptImgW, conceptImgH, prompt);

  // XObject dict fragment
  const xoEntries = imgIds.map(i => `/${i.name} ${i.objId} 0 R`).join(' ');
  const xoDict = xoEntries ? ` /XObject << ${xoEntries} >>` : '';

  // Content stream object
  objects.push({ id: contentId, data: streamObj('', streamData) });

  // Image XObject
  if (conceptImg) {
    objects.push({
      id: conceptImgId,
      data: streamObj(
        `/Type /XObject /Subtype /Image /Width ${conceptImg.width} /Height ${conceptImg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        conceptImg.buffer,
      ),
    });
  }

  return {
    objects,
    pageId,
    xobjectNames: imgIds.map(i => i.name),
    _contentId: contentId,
    _xoDict: xoDict,
  };
}

// ============================================================================
// Public API: generateSinglePDF
// ============================================================================

export async function generateSinglePDF(
  furnitureData: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  imageBuffer?: Buffer | null,
  _technicalDrawingBuffer?: Buffer | null,
  svgViews?: SvgViews | null,
  conceptImageBase64?: string | null,
  conceptPrompt?: string | null,
): Promise<Buffer> {
  let nextId = 1;
  const id = () => nextId++;

  const catalogId = id();
  const pagesId = id();

  // Convert product image buffer to base64 if provided
  let productImageBase64: string | null = null;
  if (imageBuffer) {
    productImageBase64 = imageBuffer.toString('base64');
  }

  // Build concept page if concept image is provided
  let conceptPageSet: PageObjSet | null = null;
  if (conceptImageBase64) {
    conceptPageSet = await buildConceptPageObjectSet(furnitureData, conceptImageBase64, conceptPrompt ?? undefined, id);
  }

  // Build spec page
  const specPageSet = await buildPageObjectSet(furnitureData, unitSystem, svgViews, productImageBase64, id);

  const font1Id = id();
  const font2Id = id();

  // Collect all page IDs
  const pageIds: number[] = [];
  if (conceptPageSet) pageIds.push(conceptPageSet.pageId);
  pageIds.push(specPageSet.pageId);

  const allObjects: PdfObj[] = [
    { id: catalogId, data: dictObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`) },
    { id: pagesId, data: dictObj(`<< /Type /Pages /Kids [${pageIds.map(pid => `${pid} 0 R`).join(' ')}] /Count ${pageIds.length} >>`) },
  ];

  // Add concept page if present
  if (conceptPageSet) {
    allObjects.push({
      id: conceptPageSet.pageId,
      data: dictObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] ` +
        `/Contents ${conceptPageSet._contentId} 0 R ` +
        `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >>${conceptPageSet._xoDict} >> >>`,
      ),
    });
    allObjects.push(...conceptPageSet.objects);
  }

  // Add spec page
  allObjects.push({
    id: specPageSet.pageId,
    data: dictObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] ` +
      `/Contents ${specPageSet._contentId} 0 R ` +
      `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >>${specPageSet._xoDict} >> >>`,
    ),
  });
  allObjects.push(...specPageSet.objects);

  allObjects.push(
    { id: font1Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>') },
    { id: font2Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>') },
  );

  return assemblePDF(allObjects);
}

// ============================================================================
// Public API: generateCombinedPDF
// ============================================================================

export async function generateCombinedPDF(
  furnitureData: FurnitureData,
  imageBuffer?: Buffer | null,
  _technicalDrawingBuffer?: Buffer | null,
  svgViews?: SvgViews | null,
  conceptImageBase64?: string | null,
  conceptPrompt?: string | null,
): Promise<Buffer> {
  return generateSinglePDF(furnitureData, 'metric', imageBuffer, _technicalDrawingBuffer, svgViews, conceptImageBase64, conceptPrompt);
}

// ============================================================================
// Public API: generateCatalogPDF
// ============================================================================

export async function generateCatalogPDF(
  catalogItems: FurnitureData[],
  unitSystem: 'metric' | 'imperial' = 'metric',
  catImages?: (Buffer | null)[],
  catalogSvgViews?: SvgViews[] | null,
): Promise<Buffer> {
  if (catalogItems.length === 0) {
    return generateSinglePDF(defaultFurnitureData, unitSystem);
  }

  if (catalogItems.length === 1) {
    const views = catalogSvgViews?.[0] ?? null;
    return generateSinglePDF(catalogItems[0], unitSystem, catImages?.[0] ?? null, null, views);
  }

  // Multi-page catalog
  let nextId = 1;
  const id = () => nextId++;

  const catalogId = id();
  const pagesId = id();
  const font1Id = id();
  const font2Id = id();

  const pageSets: PageObjSet[] = [];

  for (let idx = 0; idx < catalogItems.length; idx++) {
    const views = catalogSvgViews?.[idx] ?? null;
    const imgBuf = catImages?.[idx] ?? null;
    const imgBase64 = imgBuf ? imgBuf.toString('base64') : null;
    const pageSet = await buildPageObjectSet(catalogItems[idx], unitSystem, views, imgBase64, id);
    pageSets.push(pageSet);
  }

  const pageIds = pageSets.map(ps => ps.pageId);

  const allObjects: PdfObj[] = [
    { id: catalogId, data: dictObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`) },
    { id: pagesId, data: dictObj(`<< /Type /Pages /Kids [${pageIds.map(pid => `${pid} 0 R`).join(' ')}] /Count ${pageIds.length} >>`) },
  ];

  for (const ps of pageSets) {
    allObjects.push({
      id: ps.pageId,
      data: dictObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] ` +
        `/Contents ${ps._contentId} 0 R ` +
        `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >>${ps._xoDict} >> >>`,
      ),
    });
    allObjects.push(...ps.objects);
  }

  allObjects.push(
    { id: font1Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>') },
    { id: font2Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>') },
  );

  return assemblePDF(allObjects);
}
