import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isVercel(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_URL);
}

async function ensureZAIConfig(): Promise<boolean> {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ];

  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const config = JSON.parse(content);
      if (config.baseUrl && config.apiKey) {
        if (isVercel() && config.baseUrl.includes('172.')) {
          continue;
        }
        return true;
      }
    } catch {
      // File doesn't exist or invalid
    }
  }

  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return false;

  if (isVercel() && baseUrl.includes('172.')) {
    return false;
  }

  try {
    const configPath = path.join(process.cwd(), '.z-ai-config');
    fs.writeFileSync(configPath, JSON.stringify({
      baseUrl,
      apiKey,
      chatId: process.env.ZAI_CHAT_ID,
      token: process.env.ZAI_TOKEN,
      userId: process.env.ZAI_USER_ID,
    }, null, 2));
    return true;
  } catch (err) {
    return false;
  }
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
        };
        materials?: string[];
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

    console.log('[generate-drawing] Generating technical drawing for:', furnitureData.productName || 'Unknown');

    const category = furnitureData.category || 'furniture';
    const name = furnitureData.productName || category;
    const dims = furnitureData.dimensions || {};
    const heightM = dims.height ? (dims.height.feet * 0.3048 + dims.height.inches * 0.0254).toFixed(2) : '0.80';
    const widthM = dims.width ? (dims.width.feet * 0.3048 + dims.width.inches * 0.0254).toFixed(2) : '1.80';
    const depthM = dims.depth ? (dims.depth.feet * 0.3048 + dims.depth.inches * 0.0254).toFixed(2) : '0.80';

    const sp = furnitureData.shapeProfile || {};

    const prompt = `Professional architectural technical drawing of a ${name} (${category}).

THREE ORTHOGRAPHIC VIEWS arranged on white background:

TOP HALF - FRONT ELEVATION (viewed from front, showing width ${widthM}m x height ${heightM}m):
Standard front view of a ${category}.

BOTTOM LEFT - PLAN VIEW (viewed from above/top-down, showing width ${widthM}m x depth ${depthM}m):
Standard plan view of a ${category}.

BOTTOM RIGHT - SIDE ELEVATION (viewed from right side, showing depth ${depthM}m x height ${heightM}m):
Standard side view of a ${category}.

CRITICAL STYLE REQUIREMENTS:
- Pure white background, absolutely no gray areas or shading
- ONLY thin precise black lines (0.5pt weight)
- Professional architectural/engineering drafting style
- Accurate proportions matching the real dimensions
- Clear spacing between the three views
- No text, no labels, no dimension arrows, no title block
- Lines must be clean and precise, not sketchy or hand-drawn`;

    // Try Z-AI SDK
    const configReady = await ensureZAIConfig();
    if (configReady) {
      try {
        const zai = await ZAI.create();
        const response = await zai.images.generations.create({
          prompt,
          size: '1152x864',
        });

        const imageBase64 = response.data[0]?.base64;
        if (imageBase64) {
          console.log(`[generate-drawing] Image generated via Z-AI SDK`);
          return NextResponse.json({ success: true, imageBase64 });
        }
      } catch (zaiErr) {
        console.warn('[generate-drawing] Z-AI SDK failed:', zaiErr instanceof Error ? zaiErr.message : String(zaiErr));
      }
    }

    // Fallback: no drawing
    console.log('[generate-drawing] Using parametric blueprint engine as fallback');
    return NextResponse.json({
      success: true,
      imageBase64: null,
      fallback: 'parametric',
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
