import { NextRequest, NextResponse } from 'next/server';
import type { FurnitureData } from '@/lib/types';
import { parseImageBuffer, generateSinglePDF, generateCombinedPDF, generateCatalogPDF } from '@/lib/pdf/page-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { furnitureData, imageBase64, unitSystem, mode, catalogItems, catalogImages, technicalDrawingBase64 } = body as {
      furnitureData: FurnitureData;
      imageBase64?: string;
      unitSystem?: 'metric' | 'imperial';
      mode?: 'separate' | 'combined' | 'catalog';
      catalogItems?: FurnitureData[];
      catalogImages?: string[];
      technicalDrawingBase64?: string;
    };

    if (!furnitureData && !catalogItems) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const imageBuffer = parseImageBuffer(imageBase64);
    const technicalDrawingBuffer = parseImageBuffer(technicalDrawingBase64);

    // Catalog mode
    if (mode === 'catalog' && catalogItems && catalogItems.length > 0) {
      const catImages: (Buffer | null)[] = (catalogImages || []).map((img: string) => parseImageBuffer(img));
      const buffer = await generateCatalogPDF(catalogItems, unitSystem || 'metric', catImages);
      return NextResponse.json({
        success: true,
        mode: 'catalog',
        pdf: buffer.toString('base64'),
      });
    }

    // Combined mode
    if (mode === 'combined') {
      const buffer = await generateCombinedPDF(furnitureData, imageBuffer, technicalDrawingBuffer);
      return NextResponse.json({
        success: true,
        mode: 'combined',
        pdf: buffer.toString('base64'),
      });
    }

    // Default: separate PDFs
    const systems: ('metric' | 'imperial')[] = unitSystem ? [unitSystem] : ['metric', 'imperial'];
    const results: Record<string, string> = {};
    for (const sys of systems) {
      const buffer = await generateSinglePDF(furnitureData, sys, imageBuffer, technicalDrawingBuffer);
      results[sys] = buffer.toString('base64');
    }

    if (unitSystem) {
      return NextResponse.json({ success: true, unitSystem, pdf: results[unitSystem] });
    }
    return NextResponse.json({ success: true, metric: results.metric, imperial: results.imperial });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDFs: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
