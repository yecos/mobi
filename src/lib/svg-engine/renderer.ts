// ============================================================================
// SVG Engine - Main Renderer / Orchestrator
// MOBI Furniture Plan Application
// ============================================================================

import type {
  FurnitureDimensions,
  ShapeProfile,
  FurnitureDrawingResult,
  GeneratedSVGView,
} from './types';
import { FURNITURE_DEFAULTS } from './styles';
import { calculateScale, calculateViewConfig } from './scale';
import { generatePlantView } from './views/plant-view';
import { generateFrontalView } from './views/frontal-view';
import { generateLateralView } from './views/lateral-view';
import { feetInchesToCm } from './utils/geometry';

/**
 * Convert the app's DimensionValue { feet, inches } to centimeters
 */
function dimToCm(dim: { feet: number; inches: number }): number {
  return feetInchesToCm(dim.feet, dim.inches);
}

/**
 * Full set of default dimension values with all optional fields
 */
const FULL_DEFAULTS: Required<FurnitureDimensions> = {
  width: 60,
  height: 80,
  depth: 60,
  seatHeight: 45,
  backrestHeight: 40,
  armrestHeight: 65,
  legHeight: 45,
  topThickness: 3,
  mattressThickness: 25,
};

/**
 * Type-safe access to type-specific defaults, returning a fully populated object
 */
function getTypeDefaults(furnitureType: string): Required<FurnitureDimensions> {
  const key = furnitureType as keyof typeof FURNITURE_DEFAULTS;
  const td = FURNITURE_DEFAULTS[key];
  if (!td) return { ...FULL_DEFAULTS };

  return {
    width: td.width || FULL_DEFAULTS.width,
    height: td.height || FULL_DEFAULTS.height,
    depth: td.depth || FULL_DEFAULTS.depth,
    seatHeight: 'seatHeight' in td ? td.seatHeight : FULL_DEFAULTS.seatHeight,
    backrestHeight: 'backrestHeight' in td ? td.backrestHeight : FULL_DEFAULTS.backrestHeight,
    armrestHeight: 'armrestHeight' in td ? td.armrestHeight : FULL_DEFAULTS.armrestHeight,
    legHeight: td.legHeight || FULL_DEFAULTS.legHeight,
    topThickness: 'topThickness' in td ? td.topThickness : FULL_DEFAULTS.topThickness,
    mattressThickness: 'mattressThickness' in td ? td.mattressThickness : FULL_DEFAULTS.mattressThickness,
  };
}

/**
 * Normalize furniture dimensions, filling in defaults for missing values
 */
function normalizeDimensions(
  dims: FurnitureDimensions,
  furnitureType: string
): FurnitureDimensions {
  const defaults = getTypeDefaults(furnitureType);

  return {
    width: dims.width || defaults.width,
    height: dims.height || defaults.height,
    depth: dims.depth || defaults.depth,
    seatHeight: dims.seatHeight ?? defaults.seatHeight,
    backrestHeight: dims.backrestHeight ?? defaults.backrestHeight,
    armrestHeight: dims.armrestHeight ?? defaults.armrestHeight,
    legHeight: dims.legHeight ?? defaults.legHeight,
    topThickness: dims.topThickness ?? defaults.topThickness,
    mattressThickness: dims.mattressThickness ?? defaults.mattressThickness,
  };
}

/**
 * Normalize the shape profile, providing sensible defaults
 */
function normalizeShapeProfile(shape: ShapeProfile): ShapeProfile {
  return {
    bodyShape: shape.bodyShape || 'rectangular',
    cornerStyle: shape.cornerStyle || 'sharp',
    hasBackrest: shape.hasBackrest ?? false,
    backrestShape: shape.backrestShape || 'none',
    hasArmrests: shape.hasArmrests ?? false,
    armrestShape: shape.armrestShape || 'none',
    legType: shape.legType || 'straight',
    legCount: shape.legCount || 4,
    seatShape: shape.seatShape || 'flat',
    topViewOutline: shape.topViewOutline || '',
    sideProfile: shape.sideProfile || '',
  };
}

/**
 * Determine furniture type from category string
 */
function determineFurnitureType(category: string): string {
  const normalized = (category || '').toLowerCase().trim();

  if (normalized.includes('chair') || normalized.includes('silla')) return 'chair';
  if (normalized.includes('sofa') || normalized.includes('sofá') || normalized.includes('couch')) return 'sofa';
  if (normalized.includes('table') || normalized.includes('mesa') || normalized.includes('desk')) return 'table';
  if (normalized.includes('bed') || normalized.includes('cama')) return 'bed';

  return 'generic';
}

/**
 * MAIN ENTRY POINT
 * Generate a complete furniture technical drawing with 3 orthographic views
 *
 * @param furnitureType - Category string (chair, sofa, table, bed, etc.)
 * @param dimensions - Furniture dimensions in centimeters
 * @param shapeProfile - Shape profile determining visual geometry
 * @param options - Optional configuration (unit system, show dimensions)
 * @returns Complete drawing result with all 3 views
 */
export function generateFurnitureDrawing(
  furnitureType: string,
  dimensions: FurnitureDimensions,
  shapeProfile: ShapeProfile,
  options?: { unit?: 'cm' | 'in'; showDimensions?: boolean }
): FurnitureDrawingResult {
  const {
    unit = 'cm',
    showDimensions = true,
  } = options || {};

  // Normalize inputs
  const resolvedType = determineFurnitureType(furnitureType);
  const normalizedDims = normalizeDimensions(dimensions, resolvedType);
  const normalizedShape = normalizeShapeProfile(shapeProfile);

  // Calculate scale (use the same scale for all views for consistency)
  // We pick the scale that works for the largest view
  const plantScale = calculateScale(normalizedDims, 'plant');
  const frontalScale = calculateScale(normalizedDims, 'frontal');
  const lateralScale = calculateScale(normalizedDims, 'lateral');
  const scale = Math.min(plantScale, frontalScale, lateralScale);

  // Generate view configs with consistent scale
  const plantConfig = {
    viewType: 'plant' as const,
    width: 400,
    height: 400,
    padding: 50,
    scale,
    showDimensions,
    unit,
    referenceBar: true,
  };

  const frontalConfig = {
    viewType: 'frontal' as const,
    width: 400,
    height: 400,
    padding: 50,
    scale,
    showDimensions,
    unit,
    referenceBar: true,
  };

  const lateralConfig = {
    viewType: 'lateral' as const,
    width: 400,
    height: 400,
    padding: 50,
    scale,
    showDimensions,
    unit,
    referenceBar: true,
  };

  // Generate all three views
  const plantView = generatePlantView(normalizedDims, normalizedShape, resolvedType, plantConfig);
  const frontalView = generateFrontalView(normalizedDims, normalizedShape, resolvedType, frontalConfig);
  const lateralView = generateLateralView(normalizedDims, normalizedShape, resolvedType, lateralConfig);

  return {
    plantView,
    frontalView,
    lateralView,
    dimensions: normalizedDims,
    shapeProfile: normalizedShape,
    furnitureType: resolvedType,
    scale,
  };
}

/**
 * Convenience function: generate a drawing from the app's FurnitureData format
 * Converts DimensionValue { feet, inches } to centimeters internally
 */
export function generateDrawingFromFurnitureData(
  data: {
    category?: string;
    dimensions?: {
      height?: { feet: number; inches: number };
      width?: { feet: number; inches: number };
      depth?: { feet: number; inches: number };
      seatDepth?: { feet: number; inches: number };
    };
    shapeProfile?: ShapeProfile;
  },
  options?: { unit?: 'cm' | 'in'; showDimensions?: boolean }
): FurnitureDrawingResult {
  const dims: FurnitureDimensions = {
    width: data.dimensions?.width ? dimToCm(data.dimensions.width) : 0,
    height: data.dimensions?.height ? dimToCm(data.dimensions.height) : 0,
    depth: data.dimensions?.depth ? dimToCm(data.dimensions.depth) : 0,
  };

  const shape: ShapeProfile = data.shapeProfile || {
    bodyShape: 'rectangular',
    cornerStyle: 'sharp',
    hasBackrest: false,
    backrestShape: 'none',
    hasArmrests: false,
    armrestShape: 'none',
    legType: 'straight',
    legCount: 4,
    seatShape: 'flat',
    topViewOutline: '',
    sideProfile: '',
  };

  return generateFurnitureDrawing(
    data.category || 'generic',
    dims,
    shape,
    options
  );
}

/**
 * Generate a combined SVG with all three views arranged in a layout
 * Layout: Frontal on top, Plant on bottom-left, Lateral on bottom-right
 */
export function generateCombinedDrawing(
  furnitureType: string,
  dimensions: FurnitureDimensions,
  shapeProfile: ShapeProfile,
  options?: { unit?: 'cm' | 'in'; showDimensions?: boolean }
): string {
  const result = generateFurnitureDrawing(furnitureType, dimensions, shapeProfile, options);

  const totalWidth = 850;
  const totalHeight = 600;
  const margin = 20;
  const gap = 20;

  // Frontal view: top center (full width)
  const frontalW = totalWidth - margin * 2;
  const frontalH = (totalHeight - margin * 2 - gap) * 0.5;

  // Bottom row: Plant (left) and Lateral (right)
  const bottomW = (totalWidth - margin * 2 - gap) / 2;
  const bottomH = (totalHeight - margin * 2 - gap) * 0.5;
  const bottomY = margin + frontalH + gap;

  // Extract inner content from each view SVG
  const extractContent = (svgStr: string): string => {
    const match = svgStr.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    return match ? match[1] : svgStr;
  };

  const plantContent = extractContent(result.plantView.svgContent);
  const frontalContent = extractContent(result.frontalView.svgContent);
  const lateralContent = extractContent(result.lateralView.svgContent);

  // Build combined SVG with embedded groups and transforms
  const combined = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
  
  <!-- Frontal view (top) -->
  <g transform="translate(${margin}, ${margin}) scale(${frontalW / 400}, ${frontalH / 400})">
    ${frontalContent}
  </g>
  
  <!-- Plant view (bottom-left) -->
  <g transform="translate(${margin}, ${bottomY}) scale(${bottomW / 400}, ${bottomH / 400})">
    ${plantContent}
  </g>
  
  <!-- Lateral view (bottom-right) -->
  <g transform="translate(${margin + bottomW + gap}, ${bottomY}) scale(${bottomW / 400}, ${bottomH / 400})">
    ${lateralContent}
  </g>
</svg>`;

  return combined;
}
