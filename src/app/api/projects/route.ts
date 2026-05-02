import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects (paginated)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    db.furnitureProject.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.furnitureProject.count(),
  ]);

  return NextResponse.json({ projects, total, page, limit });
}

// POST /api/projects - Save a new approved project
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, furnitureType, description, observations, dimensions, shapeProfile, materials, svgViews, unit, scale } = body;

  const project = await db.furnitureProject.create({
    data: {
      name: name || 'Untitled Project',
      furnitureType: furnitureType || 'furniture',
      description,
      observations,
      width: dimensions?.width || 0,
      height: dimensions?.height || 0,
      depth: dimensions?.depth || 0,
      seatHeight: dimensions?.seatHeight || null,
      backrestHeight: dimensions?.backrestHeight || null,
      armrestHeight: dimensions?.armrestHeight || null,
      legHeight: dimensions?.legHeight || null,
      topThickness: dimensions?.topThickness || null,
      mattressThickness: dimensions?.mattressThickness || null,
      bodyShape: shapeProfile?.bodyShape || 'rectangular',
      hasBackrest: shapeProfile?.hasBackrest || false,
      hasArmrests: shapeProfile?.hasArmrests || false,
      legType: shapeProfile?.legType || 'none',
      seatShape: shapeProfile?.seatShape || null,
      backrestShape: shapeProfile?.backrestShape || null,
      materials: materials ? JSON.stringify(materials) : null,
      plantSvg: svgViews?.plant || null,
      frontalSvg: svgViews?.frontal || null,
      lateralSvg: svgViews?.lateral || null,
      approved: true,
      unit: unit || 'cm',
      scale: scale || null,
    },
  });

  return NextResponse.json({ success: true, project });
}
