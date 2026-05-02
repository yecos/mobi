import { NextRequest, NextResponse } from 'next/server';
import type { CopilotFurnitureData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SvgRequest {
  furnitureData: CopilotFurnitureData;
}

/**
 * Generate a professional VIVA MOBILI product sheet as SVG.
 * Mirrors the PDF layout but in vector SVG format for editing/scaling.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SvgRequest;
    const { furnitureData } = body;

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const svg = buildProductSheetSVG(furnitureData);

    return NextResponse.json({
      success: true,
      svg,
    });
  } catch (error) {
    console.error('[copilot-svg] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate SVG product sheet',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

function buildProductSheetSVG(data: CopilotFurnitureData): string {
  const W = 794;  // A4 width at 96dpi
  const H = 1123; // A4 height at 96dpi
  const M = 40;

  const primary = data.colorPalette.primary;
  const secondary = data.colorPalette.secondary;
  const pearlGray = data.colorPalette.pearlGray;
  const darkGray = data.colorPalette.darkGray;

  let y = 0;
  const elements: string[] = [];

  // ── Header Bar ──
  elements.push(`<rect x="0" y="0" width="${W}" height="50" fill="${primary}" />`);
  elements.push(`<text x="20" y="33" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="bold" fill="white">VIVA MOBILI</text>`);
  elements.push(`<text x="${W - M}" y="33" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="white" text-anchor="end">PRODUCT TECHNICAL SHEET</text>`);

  // ── Product Title ──
  y = 70;
  elements.push(`<text x="${M}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="${darkGray}">${escapeXml(data.productType.toUpperCase())}</text>`);
  y += 20;
  elements.push(`<text x="${M}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#666">${escapeXml(data.style)} style  •  ${escapeXml(data.material.main)}  •  ${escapeXml(data.finish)}</text>`);
  y += 8;
  elements.push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="${primary}" stroke-width="0.5" stroke-opacity="0.5" />`);
  y += 20;

  // ── Left Column: Specifications ──
  const specX = M;
  const specW = 280;

  elements.push(`<text x="${specX}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="${darkGray}">SPECIFICATIONS</text>`);
  y += 16;

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

  for (const section of specSections) {
    elements.push(`<rect x="${specX}" y="${y - 14}" width="${specW}" height="16" fill="#f2f2f2" rx="2" />`);
    elements.push(`<text x="${specX + 6}" y="${y - 3}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="#888">${section.label}</text>`);
    elements.push(`<text x="${specX + specW - 6}" y="${y - 3}" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="${darkGray}" text-anchor="end">${escapeXml(section.value)}</text>`);
    y += 18;
  }

  // ── Material Details ──
  y += 8;
  elements.push(`<text x="${specX}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="${darkGray}">MATERIAL DETAILS</text>`);
  y += 14;
  for (const detail of data.material.details) {
    elements.push(`<text x="${specX + 8}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="#555">•  ${escapeXml(detail)}</text>`);
    y += 12;
  }

  // ── Right Column: Views ──
  const viewX = specX + specW + 30;
  const viewW = W - viewX - M;
  let viewY = 90;

  const cellW = (viewW - 8) / 2;
  const cellH = 110;
  const viewLabels = ['FRONT VIEW', 'SIDE VIEW', 'TOP VIEW', '3/4 PERSPECTIVE'];
  const viewKeys = ['front', 'side', 'top', 'perspective'];
  const dimAnnotations: Record<string, { h: string; w: string }> = {
    front: { h: `${data.dimensions.height}`, w: `${data.dimensions.width}` },
    side: { h: `${data.dimensions.height}`, w: `${data.dimensions.depth}` },
    top: { h: `${data.dimensions.depth}`, w: `${data.dimensions.width}` },
    perspective: { h: '', w: '' },
  };

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = viewX + col * (cellW + 8);
    const cy = viewY + row * (cellH + 28);

    // View box background
    elements.push(`<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" fill="${pearlGray}" rx="2" stroke="${darkGray}" stroke-width="0.5" />`);

    // View label
    elements.push(`<text x="${cx + cellW / 2}" y="${cy + cellH + 14}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="${darkGray}" text-anchor="middle">${viewLabels[i]}</text>`);

    // Dimension annotations inside boxes
    const dims = dimAnnotations[viewKeys[i]];
    if (dims.h) {
      // Height line (left side)
      const lx = cx + 14;
      elements.push(`<line x1="${lx}" y1="${cy + 8}" x2="${lx}" y2="${cy + cellH - 8}" stroke="${darkGray}" stroke-width="0.3" />`);
      elements.push(`<text x="${lx + 4}" y="${cy + cellH / 2 + 3}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="${darkGray}">${dims.h}</text>`);
    }
    if (dims.w) {
      // Width line (bottom)
      const by = cy + cellH - 12;
      elements.push(`<line x1="${cx + 8}" y1="${by}" x2="${cx + cellW - 8}" y2="${by}" stroke="${darkGray}" stroke-width="0.3" />`);
      elements.push(`<text x="${cx + cellW / 2}" y="${by + 10}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="${darkGray}" text-anchor="middle">${dims.w}</text>`);
    }
  }

  // ── Design Highlights ──
  let annY = viewY + 2 * (cellH + 28) + 20;
  elements.push(`<text x="${M}" y="${annY}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="${darkGray}">DESIGN HIGHLIGHTS</text>`);
  annY += 5;
  elements.push(`<line x1="${M}" y1="${annY}" x2="${W - M}" y2="${annY}" stroke="${primary}" stroke-width="0.5" stroke-opacity="0.5" />`);
  annY += 18;

  const icons = ['◈', '⬡', '◆'];
  const iconLabels = ['TEXTURE', 'STRUCTURE', 'FUNCTIONAL'];
  for (let i = 0; i < data.annotations.length; i++) {
    const ann = data.annotations[i];
    const iconChar = icons[i] || '•';
    const iconLabel = iconLabels[i] || 'DETAIL';

    elements.push(`<text x="${M + 4}" y="${annY}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${primary}">${iconChar}</text>`);
    elements.push(`<text x="${M + 24}" y="${annY - 6}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="${secondary}">${iconLabel}</text>`);
    elements.push(`<text x="${M + 24}" y="${annY + 6}" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="${darkGray}">${escapeXml(ann)}</text>`);
    annY += 30;
  }

  // ── Color Palette Strip ──
  annY += 10;
  elements.push(`<text x="${M}" y="${annY}" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="${darkGray}">COLOR PALETTE</text>`);
  annY += 18;

  const paletteW = (W - 2 * M - 12) / 4;
  const paletteH = 28;
  const paletteColors = [
    { hex: data.colorPalette.primary, label: 'Material' },
    { hex: data.colorPalette.secondary, label: 'Feature' },
    { hex: data.colorPalette.pearlGray, label: 'Pearl Gray' },
    { hex: data.colorPalette.darkGray, label: 'Dark Gray' },
  ];

  for (let i = 0; i < paletteColors.length; i++) {
    const px = M + i * (paletteW + 4);
    elements.push(`<rect x="${px}" y="${annY - paletteH}" width="${paletteW}" height="${paletteH}" fill="${paletteColors[i].hex}" rx="4" stroke="#ddd" stroke-width="0.5" />`);
    elements.push(`<text x="${px + paletteW / 2}" y="${annY - paletteH - 10}" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="${darkGray}" text-anchor="middle">${paletteColors[i].label}</text>`);
    elements.push(`<text x="${px + paletteW / 2}" y="${annY - paletteH - 22}" font-family="Helvetica, Arial, sans-serif" font-size="6" fill="#888" text-anchor="middle">${paletteColors[i].hex.toUpperCase()}</text>`);
  }

  // ── Footer ──
  elements.push(`<rect x="0" y="${H - 30}" width="${W}" height="30" fill="${primary}" />`);
  elements.push(`<text x="${M}" y="${H - 10}" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="white">VIVA MOBILI  •  Professional Furniture Specifications</text>`);
  elements.push(`<text x="${W - M}" y="${H - 10}" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="white" text-anchor="end">${new Date().toISOString().split('T')[0]}</text>`);

  // ── Assemble SVG ──
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style>
      text { font-family: Helvetica, Arial, sans-serif; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="white" />
  ${elements.join('\n  ')}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
