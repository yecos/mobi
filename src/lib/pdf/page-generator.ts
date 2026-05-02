// ============================================================================
// PDF Page Generator - Professional Specification Sheets
// MOBI Furniture Plan Application
//
// Generates A4-landscape PDF documents with:
//   - Embedded SVG→PNG technical drawings (frontal, lateral, plant views)
//   - Professional header with project metadata
//   - Materials table with alternating row colors
//   - Observations section
//   - Dimension summary
// ============================================================================

import type { FurnitureData } from '@/lib/types';
import { defaultFurnitureData } from '@/lib/types';
import { dimensionToCm, displayDimension } from '@/lib/convert';
import { generateDrawingFromFurnitureData } from '@/lib/svg-engine';

// ============================================================================
// Layout Constants (A4 Landscape: 842 × 595 points)
// ============================================================================

const PW = 842;   // page width
const PH = 595;   // page height
const MX = 30;    // horizontal margin

// Header section
const H_Y1 = 560;    // "PROYECTO" / "FECHA" line
const H_Y2 = 545;    // "TIPO" / "ESCALA" line
const H_Y3 = 530;    // "UNIDADES" / "REF" line
const H_SEP = 518;   // header separator line

// Drawing section
const D_TOP = 512;
const D_ROW1_H = 168;           // frontal / lateral view height
const D_ROW1_BOT = D_TOP - D_ROW1_H; // 344
const D_LABEL1 = D_ROW1_BOT - 13;     // 331  "VISTA FRONTAL" / "VISTA LATERAL"
const D_ROW2_TOP = D_LABEL1 - 10;     // 321
const D_ROW2_H = 112;                  // plant view height
const D_ROW2_BOT = D_ROW2_TOP - D_ROW2_H; // 209
const D_LABEL2 = D_ROW2_BOT - 13;     // 196  "VISTA EN PLANTA"
const D_SEP = D_LABEL2 - 10;          // 186  drawing separator line

// Horizontal layout for views
const D_GAP = 20;
const D_USABLE = PW - 2 * MX;
const D_VIEW_W = (D_USABLE - D_GAP) / 2; // ~386 each
const D_FRONTAL_X = MX;
const D_LATERAL_X = MX + D_VIEW_W + D_GAP;
const D_PLANT_W = 340;
const D_PLANT_X = (PW - D_PLANT_W) / 2;

// Materials section
const M_TITLE = D_SEP - 13;   // 173
const M_HEADER = M_TITLE - 15; // 158
const M_START = M_HEADER - 4;  // 154
const M_ROW_H = 13;
const MAX_TABLE_ROWS = 7;

// Table columns (x positions relative to TABLE_LEFT)
const TABLE_LEFT = MX + 10;
const TABLE_RIGHT = PW - MX - 10;
const COL_W = [30, 160, 55, 270, 217]; // #, Material, Qty, Description, Observations

// Dimensions footer
const DIM_Y = 25;

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

/** Escape a string for use inside PDF string literals (…) */
function esc(text: string): string {
  let r = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c === 0x5c) r += '\\\\';        // backslash → \\
    else if (c === 0x28) r += '\\(';     // ( → \(
    else if (c === 0x29) r += '\\)';     // ) → \)
    else if (c >= 32 && c < 127) r += ch; // printable ASCII
    else if (c >= 161 && c <= 255) {
      // Latin-1 Supplement → WinAnsiEncoding octal escape
      r += '\\' + c.toString(8).padStart(3, '0');
    } else if (c === 128) {
      r += '\\200'; // €
    } else {
      r += '?';     // replace unknown
    }
  }
  return r;
}

function trunc(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max - 1) + '\u2026';
}

function fmtDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
  // Dynamic imports to avoid Turbopack ESM issues with native modules
  const { Resvg } = await import('@resvg/resvg-js');
  const sharp = (await import('sharp')).default;

  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: targetWidth } });
  const pngData = resvg.render();
  const pngBuf = Buffer.from(pngData.asPng());

  const jpegBuf = await sharp(pngBuf).jpeg({ quality: 92 }).toBuffer();
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
  // If client supplied views, use them
  if (svgViews && (svgViews.frontal || svgViews.lateral || svgViews.plant)) {
    return svgViews;
  }
  // Otherwise generate from furniture data
  try {
    const result = generateDrawingFromFurnitureData(data, { unit: 'cm', showDimensions: true });
    return {
      frontal: result.frontalView.svgContent,
      lateral: result.lateralView.svgContent,
      plant: result.plantView.svgContent,
    };
  } catch (err) {
    console.warn('[pdf] SVG engine failed, falling back to text-only:', err);
    return {};
  }
}

// ============================================================================
// Image processing
// ============================================================================

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
// Scale calculation
// ============================================================================

function calcScale(data: FurnitureData): string {
  const w = dimensionToCm(data.dimensions.width);
  const h = dimensionToCm(data.dimensions.height);
  const d = dimensionToCm(data.dimensions.depth);
  const maxDim = Math.max(w, h, d, 1);

  const stdScales = [5, 10, 15, 20, 25, 50, 75, 100];
  const target = maxDim / 12;
  let best = stdScales[0];
  for (const s of stdScales) {
    if (s >= target) { best = s; break; }
    best = s;
  }
  return `1:${best}`;
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

  line(x1: number, y1: number, x2: number, y2: number, w = 0.5): this {
    this.ops.push(`${w} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, 'S');
    return this;
  }

  rectFill(x: number, y: number, w: number, h: number, r: number, g: number, b: number): this {
    this.ops.push('q', `${r} ${g} ${b} rg`, `${x} ${y} ${w} ${h} re`, 'f', 'Q');
    return this;
  }

  rectStroke(x: number, y: number, w: number, h: number): this {
    this.ops.push(`${x} ${y} ${w} ${h} re S`);
    return this;
  }

  img(name: string, x: number, y: number, w: number, h: number): this {
    this.ops.push('q', `${w} 0 0 ${h} ${x} ${y} cm`, `/${name} Do`, 'Q');
    return this;
  }

  whiteBg(x: number, y: number, w: number, h: number): this {
    return this.rectFill(x, y, w, h, 1, 1, 1);
  }

  build(): Buffer {
    return Buffer.from(this.ops.join('\n'), 'latin1');
  }
}

// ============================================================================
// Build content stream for a single page
// ============================================================================

function buildPageContent(
  data: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  hasFrontal: boolean,
  hasLateral: boolean,
  hasPlant: boolean,
): Buffer {
  const c = new CS();
  const units = unitSystem === 'metric' ? 'cm' : 'in';
  const scale = calcScale(data);

  // ── Header ──────────────────────────────────────────────────────────
  c.bold(MX + 10, H_Y1, 'PROYECTO:');
  c.norm(MX + 90, H_Y1, trunc(data.productName || 'Sin nombre', 50));
  c.bold(550, H_Y1, 'FECHA:');
  c.norm(600, H_Y1, fmtDate());

  c.bold(MX + 10, H_Y2, 'TIPO:');
  c.norm(MX + 55, H_Y2, trunc(data.category || 'N/A', 30));
  c.bold(550, H_Y2, 'ESCALA:');
  c.norm(610, H_Y2, scale);

  c.bold(MX + 10, H_Y3, 'UNIDADES:');
  c.norm(MX + 85, H_Y3, units);
  c.bold(300, H_Y3, 'REF:');
  c.norm(335, H_Y3, trunc(data.referenceNumber || 'N/A', 30));

  c.line(MX, H_SEP, PW - MX, H_SEP, 1);

  // ── Drawings: Frontal + Lateral (top row) ───────────────────────────
  // Frontal
  if (hasFrontal) {
    c.whiteBg(D_FRONTAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.rectStroke(D_FRONTAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.img('Im1', D_FRONTAL_X + 2, D_ROW1_BOT + 2, D_VIEW_W - 4, D_ROW1_H - 4);
  } else {
    c.rectFill(D_FRONTAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H, 0.95, 0.95, 0.95);
    c.rectStroke(D_FRONTAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.norm(D_FRONTAL_X + D_VIEW_W / 2 - 50, D_ROW1_BOT + D_ROW1_H / 2 - 4, 'Vista no disponible', 9);
  }
  c.bold(D_FRONTAL_X + D_VIEW_W / 2 - 45, D_LABEL1, 'VISTA FRONTAL', 9);

  // Lateral
  if (hasLateral) {
    c.whiteBg(D_LATERAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.rectStroke(D_LATERAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.img('Im2', D_LATERAL_X + 2, D_ROW1_BOT + 2, D_VIEW_W - 4, D_ROW1_H - 4);
  } else {
    c.rectFill(D_LATERAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H, 0.95, 0.95, 0.95);
    c.rectStroke(D_LATERAL_X, D_ROW1_BOT, D_VIEW_W, D_ROW1_H);
    c.norm(D_LATERAL_X + D_VIEW_W / 2 - 50, D_ROW1_BOT + D_ROW1_H / 2 - 4, 'Vista no disponible', 9);
  }
  c.bold(D_LATERAL_X + D_VIEW_W / 2 - 42, D_LABEL1, 'VISTA LATERAL', 9);

  // ── Drawing: Plant (bottom row, centered) ───────────────────────────
  if (hasPlant) {
    c.whiteBg(D_PLANT_X, D_ROW2_BOT, D_PLANT_W, D_ROW2_H);
    c.rectStroke(D_PLANT_X, D_ROW2_BOT, D_PLANT_W, D_ROW2_H);
    c.img('Im3', D_PLANT_X + 2, D_ROW2_BOT + 2, D_PLANT_W - 4, D_ROW2_H - 4);
  } else {
    c.rectFill(D_PLANT_X, D_ROW2_BOT, D_PLANT_W, D_ROW2_H, 0.95, 0.95, 0.95);
    c.rectStroke(D_PLANT_X, D_ROW2_BOT, D_PLANT_W, D_ROW2_H);
    c.norm(D_PLANT_X + D_PLANT_W / 2 - 50, D_ROW2_BOT + D_ROW2_H / 2 - 4, 'Vista no disponible', 9);
  }
  c.bold(D_PLANT_X + D_PLANT_W / 2 - 50, D_LABEL2, 'VISTA EN PLANTA', 9);

  c.line(MX, D_SEP, PW - MX, D_SEP, 1);

  // ── Materials Table ─────────────────────────────────────────────────
  const materials = data.materials || [];
  const shown = materials.slice(0, MAX_TABLE_ROWS);
  const tblW = TABLE_RIGHT - TABLE_LEFT;

  c.bold(MX + 10, M_TITLE, 'MATERIALES:', 10);

  // header background
  c.rectFill(TABLE_LEFT, M_HEADER - 4, tblW, 14, 0.85, 0.85, 0.85);

  // header text
  let cx = TABLE_LEFT + 4;
  c.bold(cx, M_HEADER, '#', 8);                     cx += COL_W[0];
  c.bold(cx, M_HEADER, 'Material', 8);               cx += COL_W[1];
  c.bold(cx, M_HEADER, 'Cant.', 8);                  cx += COL_W[2];
  c.bold(cx, M_HEADER, 'Descripción', 8);            cx += COL_W[3];
  c.bold(cx, M_HEADER, 'Observaciones', 8);

  c.line(TABLE_LEFT, M_HEADER - 5, TABLE_RIGHT, M_HEADER - 5, 0.5);

  // data rows
  for (let i = 0; i < shown.length; i++) {
    const m = shown[i];
    const ry = M_START - i * M_ROW_H;

    if (i % 2 === 1) c.rectFill(TABLE_LEFT, ry - 9, tblW, M_ROW_H, 0.97, 0.97, 0.97);
    c.line(TABLE_LEFT, ry - 10, TABLE_RIGHT, ry - 10, 0.3);

    let rx = TABLE_LEFT + 4;
    c.norm(rx, ry, String(i + 1), 8);                               rx += COL_W[0];
    c.norm(rx, ry, trunc(m.material || '', 24), 8);                 rx += COL_W[1];
    c.norm(rx, ry, String(m.quantity ?? ''), 8);                    rx += COL_W[2];
    c.norm(rx, ry, trunc(m.description || '', 40), 8);              rx += COL_W[3];
    c.norm(rx, ry, trunc(m.observations || '', 32), 8);
  }

  let afterTable = M_START - shown.length * M_ROW_H - 8;
  if (materials.length > MAX_TABLE_ROWS) {
    c.norm(TABLE_LEFT + 4, afterTable, `... y ${materials.length - MAX_TABLE_ROWS} materiales más`, 8);
    afterTable -= 14;
  }

  // ── Observations ────────────────────────────────────────────────────
  const obsY = afterTable - 4;
  c.bold(MX + 10, obsY, 'OBSERVACIONES:', 9);
  const obsText = data.observations || data.descriptionEs || data.description || '';
  if (obsText) {
    const MAX_L = 110;
    const lines = wrapText(obsText, MAX_L);
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      c.norm(MX + 110, obsY - i * 12, trunc(lines[i], MAX_L), 8);
    }
  }

  // ── Dimensions footer ───────────────────────────────────────────────
  const hCm = dimensionToCm(data.dimensions.height);
  const wCm = dimensionToCm(data.dimensions.width);
  const dCm = dimensionToCm(data.dimensions.depth);
  c.norm(MX + 10, DIM_Y,
    `H: ${displayDimension(hCm, unitSystem)}   W: ${displayDimension(wCm, unitSystem)}   D: ${displayDimension(dCm, unitSystem)}`, 8);

  return c.build();
}

/** Simple word-wrap */
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
  wr('%\xE2\xE3\xCF\xD3\n'); // binary marker

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
  xobjectNames: string[]; // e.g. ['Im1','Im2','Im3']
}

async function buildPageObjectSet(
  data: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  svgViews: SvgViews | null | undefined,
  idGen: () => number,
): Promise<PageObjSet> {
  const objects: PdfObj[] = [];

  // Resolve & convert images
  const views = resolveSvgViews(data, svgViews);
  const frontalImg = await processView(views.frontal, 'Im1', 780);
  const lateralImg = await processView(views.lateral, 'Im2', 780);
  const plantImg = await processView(views.plant, 'Im3', 680);

  const hasFrontal = !!frontalImg;
  const hasLateral = !!lateralImg;
  const hasPlant = !!plantImg;

  // Assign IDs
  const pageId = idGen();
  const contentId = idGen();

  const imgIds: { name: string; objId: number }[] = [];
  if (frontalImg) imgIds.push({ name: 'Im1', objId: idGen() });
  if (lateralImg) imgIds.push({ name: 'Im2', objId: idGen() });
  if (plantImg)   imgIds.push({ name: 'Im3', objId: idGen() });

  // Build content stream
  const streamData = buildPageContent(data, unitSystem, hasFrontal, hasLateral, hasPlant);

  // XObject dict fragment
  const xoEntries = imgIds.map(i => `/${i.name} ${i.objId} 0 R`).join(' ');
  const xoDict = xoEntries ? ` /XObject << ${xoEntries} >>` : '';

  // We don't know font IDs yet; use placeholders
  // We'll patch them after all IDs are allocated
  // → Instead, pass font IDs in (they are allocated externally)

  // For now, store the info needed to finalize
  const result: PageObjSet = {
    objects: [],
    pageId,
    xobjectNames: imgIds.map(i => i.name),
  };

  // Page object (will be finalized with font refs later)
  // Content stream
  objects.push({ id: contentId, data: streamObj('', streamData) });

  // Image XObjects
  if (frontalImg) {
    objects.push({
      id: imgIds.find(i => i.name === 'Im1')!.objId,
      data: streamObj(
        `/Type /XObject /Subtype /Image /Width ${frontalImg.width} /Height ${frontalImg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        frontalImg.buffer,
      ),
    });
  }
  if (lateralImg) {
    objects.push({
      id: imgIds.find(i => i.name === 'Im2')!.objId,
      data: streamObj(
        `/Type /XObject /Subtype /Image /Width ${lateralImg.width} /Height ${lateralImg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        lateralImg.buffer,
      ),
    });
  }
  if (plantImg) {
    objects.push({
      id: imgIds.find(i => i.name === 'Im3')!.objId,
      data: streamObj(
        `/Type /XObject /Subtype /Image /Width ${plantImg.width} /Height ${plantImg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        plantImg.buffer,
      ),
    });
  }

  result.objects = objects;
  // Store extra info needed for page dict
  (result as unknown as Record<string, unknown>)._contentId = contentId;
  (result as unknown as Record<string, unknown>)._xoDict = xoDict;

  return result;
}

// ============================================================================
// Public API: generateSinglePDF
// ============================================================================

export async function generateSinglePDF(
  furnitureData: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  _imageBuffer?: Buffer | null,
  _technicalDrawingBuffer?: Buffer | null,
  svgViews?: SvgViews | null,
): Promise<Buffer> {
  let nextId = 1;
  const id = () => nextId++;

  const catalogId = id(); // 1
  const pagesId = id();   // 2

  const pageSet = await buildPageObjectSet(furnitureData, unitSystem, svgViews, id);

  const font1Id = id();
  const font2Id = id();

  const contentId = (pageSet as unknown as Record<string, unknown>)._contentId as number;
  const xoDict = (pageSet as unknown as Record<string, unknown>)._xoDict as string;

  const allObjects: PdfObj[] = [
    { id: catalogId, data: dictObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`) },
    { id: pagesId, data: dictObj(`<< /Type /Pages /Kids [${pageSet.pageId} 0 R] /Count 1 >>`) },
    {
      id: pageSet.pageId,
      data: dictObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >>${xoDict} >> >>`,
      ),
    },
    ...pageSet.objects,
    { id: font1Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>') },
    { id: font2Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>') },
  ];

  return assemblePDF(allObjects);
}

// ============================================================================
// Public API: generateCombinedPDF  (metric)
// ============================================================================

export async function generateCombinedPDF(
  furnitureData: FurnitureData,
  _imageBuffer?: Buffer | null,
  _technicalDrawingBuffer?: Buffer | null,
  svgViews?: SvgViews | null,
): Promise<Buffer> {
  return generateSinglePDF(furnitureData, 'metric', _imageBuffer, _technicalDrawingBuffer, svgViews);
}

// ============================================================================
// Public API: generateCatalogPDF  (one page per item)
// ============================================================================

export async function generateCatalogPDF(
  catalogItems: FurnitureData[],
  unitSystem: 'metric' | 'imperial' = 'metric',
  _catImages?: (Buffer | null)[],
  catalogSvgViews?: SvgViews[] | null,
): Promise<Buffer> {
  if (catalogItems.length === 0) {
    return generateSinglePDF(defaultFurnitureData, unitSystem);
  }

  if (catalogItems.length === 1) {
    const views = catalogSvgViews?.[0] ?? null;
    return generateSinglePDF(catalogItems[0], unitSystem, null, null, views);
  }

  // Multi-page: one page per catalog item
  let nextId = 1;
  const id = () => nextId++;

  const catalogId = id(); // 1
  const pagesId = id();   // 2
  const font1Id = id();
  const font2Id = id();

  const pageSets: PageObjSet[] = [];

  for (let idx = 0; idx < catalogItems.length; idx++) {
    const views = catalogSvgViews?.[idx] ?? null;
    const pageSet = await buildPageObjectSet(catalogItems[idx], unitSystem, views, id);
    pageSets.push(pageSet);
  }

  const pageIds = pageSets.map(ps => ps.pageId);

  const allObjects: PdfObj[] = [
    { id: catalogId, data: dictObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`) },
    { id: pagesId, data: dictObj(`<< /Type /Pages /Kids [${pageIds.map(pid => `${pid} 0 R`).join(' ')}] /Count ${pageIds.length} >>`) },
  ];

  // Add page objects (with resource references) and their sub-objects
  for (const ps of pageSets) {
    const contentId = (ps as unknown as Record<string, unknown>)._contentId as number;
    const xoDict = (ps as unknown as Record<string, unknown>)._xoDict as string;

    allObjects.push({
      id: ps.pageId,
      data: dictObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >>${xoDict} >> >>`,
      ),
    });
    allObjects.push(...ps.objects);
  }

  // Shared fonts
  allObjects.push(
    { id: font1Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>') },
    { id: font2Id, data: dictObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>') },
  );

  return assemblePDF(allObjects);
}
