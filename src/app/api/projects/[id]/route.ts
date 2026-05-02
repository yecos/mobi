import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { db } = await import('@/lib/db');
    const project = await db.furnitureProject.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

// PUT /api/projects/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { db } = await import('@/lib/db');
    const body = await req.json();
    const project = await db.furnitureProject.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ success: true, project });
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { db } = await import('@/lib/db');
    await db.furnitureProject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
