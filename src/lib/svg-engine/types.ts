// ============================================================================
// SVG Engine - Core Type Definitions
// MOBI Furniture Plan Application
// ============================================================================

/** Furniture dimensions in centimeters (internal unit) */
export interface FurnitureDimensions {
  width: number;         // cm
  height: number;        // cm
  depth: number;         // cm
  seatHeight?: number;
  backrestHeight?: number;
  armrestHeight?: number;
  legHeight?: number;
  topThickness?: number;
  mattressThickness?: number;
}

/** Shape profile determines the visual geometry of the furniture */
export interface ShapeProfile {
  bodyShape: string;
  cornerStyle: string;
  hasBackrest: boolean;
  backrestShape: string;
  hasArmrests: boolean;
  armrestShape: string;
  legType: string;
  legCount: number;
  seatShape: string;
  topViewOutline: string;
  sideProfile: string;
}

/** A single dimension annotation (cota) */
export interface DimensionAnnotation {
  start: { x: number; y: number };
  end: { x: number; y: number };
  value: number;
  unit: 'cm' | 'in';
  offset: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

/** Configuration for generating a single SVG view */
export interface SVGViewConfig {
  viewType: 'plant' | 'frontal' | 'lateral';
  width: number;
  height: number;
  padding: number;
  scale: number;
  showDimensions: boolean;
  unit: 'cm' | 'in';
  referenceBar: boolean;
}

/** The output of generating a single SVG view */
export interface GeneratedSVGView {
  svgContent: string;
  viewBox: string;
  width: number;
  height: number;
  viewType: 'plant' | 'frontal' | 'lateral';
  scale: number;
  scaleBarLength: number;
}

/** Complete result with all three orthographic views */
export interface FurnitureDrawingResult {
  plantView: GeneratedSVGView;
  frontalView: GeneratedSVGView;
  lateralView: GeneratedSVGView;
  dimensions: FurnitureDimensions;
  shapeProfile: ShapeProfile;
  furnitureType: string;
  scale: number;
}

/** Internal representation of a point in 2D space (SVG coordinates) */
export interface Point {
  x: number;
  y: number;
}

/** Internal geometry element for building SVG paths */
export interface GeometryElement {
  type: 'rect' | 'line' | 'circle' | 'arc' | 'path' | 'polygon';
  attributes: Record<string, string | number>;
  strokeType: 'outline' | 'internal' | 'hidden' | 'dimension';
  fill?: string;
}

/** Furniture geometry output for a specific view */
export interface ViewGeometry {
  elements: GeometryElement[];
  boundingBox: { x: number; y: number; width: number; height: number };
  centerOffset: { x: number; y: number };
}

/** Helper type for dimension conversion from app's DimensionValue */
export interface DimensionValue {
  feet: number;
  inches: number;
}
