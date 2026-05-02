// ============================================================================
// SVG Engine - Geometric Utilities
// MOBI Furniture Plan Application
// ============================================================================

import type { Point } from '../types';

/**
 * Calculate Euclidean distance between two points
 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Calculate the angle from point a to point b in radians
 */
export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Calculate the midpoint between two points
 */
export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/**
 * Offset a point by a given delta
 */
export function offsetPoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

/**
 * Scale a point relative to an origin
 */
export function scalePoint(p: Point, scale: number, origin: Point = { x: 0, y: 0 }): Point {
  return {
    x: origin.x + (p.x - origin.x) * scale,
    y: origin.y + (p.y - origin.y) * scale,
  };
}

/**
 * Rotate a point around an origin by the given angle in radians
 */
export function rotatePoint(p: Point, angleRad: number, origin: Point = { x: 0, y: 0 }): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/**
 * Linear interpolation between two points
 */
export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Calculate the bounding box of a set of points
 */
export function boundingBox(points: Point[]): { min: Point; max: Point; width: number; height: number } {
  if (points.length === 0) {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 }, width: 0, height: 0 };
  }
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert cm to SVG pixels using a scale factor
 */
export function cmToPixels(cm: number, scale: number): number {
  return cm * scale;
}

/**
 * Convert a DimensionValue { feet, inches } to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

/**
 * Convert centimeters to feet+inches display string
 */
export function cmToFeetInchesStr(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

/**
 * Format a dimension value based on the unit system
 */
export function formatDimension(cm: number, unit: 'cm' | 'in'): string {
  if (unit === 'in') {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12 * 10) / 10;
    if (feet > 0) {
      return `${feet}'-${inches}"`;
    }
    return `${inches}"`;
  }
  return `${Math.round(cm * 10) / 10} cm`;
}

/**
 * Calculate evenly spaced positions along a span
 */
export function distributePositions(start: number, end: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

/**
 * Get corner points of a rectangle
 */
export function rectCorners(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/**
 * Calculate the center point of a rectangle
 */
export function rectCenter(x: number, y: number, w: number, h: number): Point {
  return { x: x + w / 2, y: y + h / 2 };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
