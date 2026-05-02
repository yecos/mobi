import ZAI from 'z-ai-web-dev-sdk';
import type { FurnitureData } from '@/lib/types';
import { dimensionToCm } from '@/lib/convert';

export interface ConceptResult {
  imageBase64: string;
  prompt: string;
}

export async function generateConceptSketch(data: FurnitureData): Promise<ConceptResult | null> {
  try {
    const zai = await ZAI.create();
    
    const w = dimensionToCm(data.dimensions.width);
    const d = dimensionToCm(data.dimensions.depth);
    const h = dimensionToCm(data.dimensions.height);
    
    const style = data.style || 'Modern';
    const material = data.materials?.[0]?.material || 'Wood';
    const color = data.finish || data.colorFinishes?.[0]?.name || 'Natural';
    const feature = data.specialFeature || data.shapeProfile?.bodyShape || 'Standard';
    const category = data.category || 'furniture';
    
    const prompt = `Create a furniture design concept sketch for a ${category} in ${style} style. Material: ${material} Color: ${color} Feature: ${feature}. Dimensions: ${w}x${d}x${h} cm. Show front view, side view and plan view with brief design notes. Dimensioned for production. Style: architectural technical drawing, black lines on white background, dimension annotations, professional production sheet format.`;
    
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });
    
    const imageBase64 = response.data[0]?.base64;
    if (!imageBase64) return null;
    
    return { imageBase64, prompt };
  } catch (err) {
    console.warn('[concept] AI concept generation failed:', err);
    return null;
  }
}
