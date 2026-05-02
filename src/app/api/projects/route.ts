import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory project store as fallback when database is unavailable
// On Vercel serverless, this resets per cold start, but it prevents 500 errors
const memoryStore: Array<Record<string, unknown>> = [];
let dbAvailable: boolean | null = null;

async function getDb() {
  try {
    const { db } = await import('@/lib/db');
    // Test connection
    await db.$queryRaw`SELECT 1`;
    dbAvailable = true;
    return db;
  } catch {
    dbAvailable = false;
    return null;
  }
}

// GET /api/projects - List all projects
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  // Try database first
  if (dbAvailable !== false) {
    try {
      const db = await getDb();
      if (db) {
        const skip = (page - 1) * limit;
        const [projects, total] = await Promise.all([
          db.furnitureProject.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          db.furnitureProject.count(),
        ]);
        return NextResponse.json({ projects, total, page, limit, source: 'database' });
      }
    } catch {
      dbAvailable = false;
    }
  }

  // Fallback: return memory store
  return NextResponse.json({
    projects: memoryStore,
    total: memoryStore.length,
    page,
    limit,
    source: 'memory',
  });
}

// POST /api/projects - Save a new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, furnitureType, description, observations, dimensions, shapeProfile, materials, svgViews, unit, scale } = body;

    const projectData = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name || 'Untitled Project',
      furnitureType: furnitureType || 'furniture',
      description: description || '',
      observations: observations || '',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Try database first
    if (dbAvailable !== false) {
      try {
        const db = await getDb();
        if (db) {
          const project = await db.furnitureProject.create({ data: projectData });
          return NextResponse.json({ success: true, project, source: 'database' });
        }
      } catch (dbErr) {
        console.warn('[projects] Database save failed, using memory fallback:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        dbAvailable = false;
      }
    }

    // Fallback: save to memory store
    memoryStore.push(projectData);
    console.log(`[projects] Saved to memory store (total: ${memoryStore.length})`);

    return NextResponse.json({ success: true, project: projectData, source: 'memory' });
  } catch (error) {
    console.error('[projects] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save project' },
      { status: 500 }
    );
  }
}
