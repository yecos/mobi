import { NextRequest, NextResponse } from 'next/server';
import type { FurnitureData } from '@/lib/types';
import { generateConceptSketch } from '@/lib/ai-concept-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { furnitureData } = (await req.json()) as { furnitureData: FurnitureData };
    
    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }
    
    const result = await generateConceptSketch(furnitureData);
    
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Concept generation failed' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      conceptImageBase64: result.imageBase64,
      conceptPrompt: result.prompt,
    });
  } catch (error) {
    console.error('Concept generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate concept: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
