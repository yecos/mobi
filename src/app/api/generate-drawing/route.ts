import { NextRequest, NextResponse } from 'next/server';
import { generateFurnitureDrawing } from '@/lib/svg-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function dimToCm(d: { feet: number; inches: number }): number {
  return (d.feet * 12 + d.inches) * 2.54;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { furnitureData } = body as {
      furnitureData: {
        productName?: string;
        category?: string;
        description?: string;
        descriptionEs?: string;
        dimensions?: {
          height?: { feet: number; inches: number };
          width?: { feet: number; inches: number };
          depth?: { feet: number; inches: number };
          seatDepth?: { feet: number; inches: number };
        };
        materials?: unknown[];
        shapeProfile?: {
          bodyShape?: string;
          hasBackrest?: boolean;
          hasArmrests?: boolean;
          backrestShape?: string;
          legType?: string;
          legCount?: number;
          cornerStyle?: string;
          armrestShape?: string;
          seatShape?: string;
          topViewOutline?: string;
          sideProfile?: string;
        };
      };
    };

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    console.log('[generate-drawing] Generating SVG views for:', furnitureData.productName || 'Unknown');

    const category = furnitureData.category || 'furniture';
    const dims = furnitureData.dimensions || {};

    const dimensions = {
      width: dimToCm(dims.width || { feet: 0, inches: 0 }),
      height: dimToCm(dims.height || { feet: 0, inches: 0 }),
      depth: dimToCm(dims.depth || { feet: 0, inches: 0 }),
      seatHeight: dims.seatDepth ? dimToCm(dims.seatDepth) : undefined,
    };

    const shapeProfile = furnitureData.shapeProfile || {};

    const result = generateFurnitureDrawing(category, dimensions, shapeProfile, {
      unit: 'cm',
      showDimensions: true,
    });

    const scale = Math.min(
      800 / dimensions.width,
      600 / dimensions.height
    );

    return NextResponse.json({
      success: true,
      svgViews: {
        plant: result.plantView.svgContent,
        frontal: result.frontalView.svgContent,
        lateral: result.lateralView.svgContent,
      },
      scale: result.scale,
    });
  } catch (error) {
    console.error('[generate-drawing] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate technical drawing: ' + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
