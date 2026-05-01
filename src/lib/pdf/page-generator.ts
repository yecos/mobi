import type { FurnitureData } from '@/lib/types';
import { defaultFurnitureData } from '@/lib/types';

export function parseImageBuffer(base64?: string): Buffer | null {
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

export async function generateSinglePDF(
  furnitureData: FurnitureData,
  unitSystem: 'metric' | 'imperial',
  _imageBuffer?: Buffer | null,
  _technicalDrawingBuffer?: Buffer | null,
): Promise<Buffer> {
  const lines: string[] = [];
  lines.push('%PDF-1.4');
  lines.push('1 0 obj');
  lines.push('<< /Type /Catalog /Pages 2 0 R >>');
  lines.push('endobj');
  lines.push('2 0 obj');
  lines.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  lines.push('endobj');
  lines.push('3 0 obj');
  lines.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  lines.push('endobj');

  const content = buildContentString(furnitureData, unitSystem);
  
  lines.push('4 0 obj');
  lines.push(`<< /Length ${content.length} >>`);
  lines.push('stream');
  lines.push(content);
  lines.push('endstream');
  lines.push('endobj');
  
  lines.push('5 0 obj');
  lines.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  lines.push('endobj');

  const xrefOffset = lines.join('\n').length + 1;
  lines.push('xref');
  lines.push('0 6');
  lines.push('0000000000 65535 f ');
  for (let i = 1; i <= 5; i++) {
    lines.push('0000000000 00000 n ');
  }
  lines.push('trailer');
  lines.push('<< /Size 6 /Root 1 0 R >>');
  lines.push('startxref');
  lines.push(String(xrefOffset));
  lines.push('%%EOF');

  return Buffer.from(lines.join('\n'));
}

function feetInchesToMeters(feet: number, inches: number): string {
  return (feet * 0.3048 + inches * 0.0254).toFixed(2);
}

function buildContentString(data: FurnitureData, unitSystem: 'metric' | 'imperial'): string {
  const dimStr = (d: { feet: number; inches: number }) => {
    if (unitSystem === 'metric') return `${feetInchesToMeters(d.feet, d.inches)} m`;
    return `${d.feet}'${d.inches}"`;
  };

  const escape = (s: string) => s.replace(/[()\\]/g, '\\$&');

  const parts = [
    'BT',
    '/F1 24 Tf',
    '50 750 Td',
    `(${escape('TEMPLO - Furniture Specification Sheet')}) Tj`,
    '/F1 14 Tf',
    '50 700 Td',
    `(${escape(data.productName || 'Unnamed Product')}) Tj`,
    '50 680 Td',
    `(${escape('Brand: ' + (data.brand || 'Unknown'))}) Tj`,
    '50 660 Td',
    `(${escape('Reference: ' + (data.referenceNumber || 'N/A'))}) Tj`,
    '50 640 Td',
    `(${escape('Category: ' + (data.category || 'N/A'))}) Tj`,
    '50 610 Td',
    '/F1 16 Tf',
    `(${escape('Dimensions')}) Tj`,
    '/F1 12 Tf',
    '50 590 Td',
    `(${escape('Height: ' + dimStr(data.dimensions.height))}) Tj`,
    '50 575 Td',
    `(${escape('Width: ' + dimStr(data.dimensions.width))}) Tj`,
    '50 560 Td',
    `(${escape('Depth: ' + dimStr(data.dimensions.depth))}) Tj`,
    '50 530 Td',
    '/F1 16 Tf',
    `(${escape('Materials')}) Tj`,
    '/F1 12 Tf',
    '50 510 Td',
    `(${escape((data.materials || []).join(', ') || 'Not specified')}) Tj`,
    '50 480 Td',
    '/F1 16 Tf',
    `(${escape('Description')}) Tj`,
    '/F1 12 Tf',
    '50 460 Td',
    `(${escape((data.description || '').substring(0, 100))}) Tj`,
    'ET',
  ];
  
  return parts.join('\n');
}

export async function generateCombinedPDF(
  furnitureData: FurnitureData,
  imageBuffer?: Buffer | null,
  technicalDrawingBuffer?: Buffer | null,
): Promise<Buffer> {
  return generateSinglePDF(furnitureData, 'metric', imageBuffer, technicalDrawingBuffer);
}

export async function generateCatalogPDF(
  catalogItems: FurnitureData[],
  unitSystem: 'metric' | 'imperial' = 'metric',
  _catImages?: (Buffer | null)[],
): Promise<Buffer> {
  if (catalogItems.length === 0) {
    return generateSinglePDF(defaultFurnitureData, unitSystem);
  }
  return generateSinglePDF(catalogItems[0], unitSystem);
}
