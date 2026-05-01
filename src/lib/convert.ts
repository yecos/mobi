// ===================== UNIT CONVERSION HELPERS =====================
// Shared between client and server code

import type { DimensionValue } from './types';

export function feetInchesToMeters(feet: number, inches: number): string {
  return (feet * 0.3048 + inches * 0.0254).toFixed(2);
}

export function metersToFeetInches(meters: number): { feet: number; inches: number } {
  const totalInches = meters / 0.0254;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  if (inches >= 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

export function formatDimShort(dim: DimensionValue): string {
  if (!dim || (dim.feet === 0 && dim.inches === 0)) return "0'0\"";
  return `${dim.feet}'${dim.inches}"`;
}

export function formatImperial(dim: DimensionValue): string {
  if (!dim || (dim.feet === 0 && dim.inches === 0)) return '—';
  const parts: string[] = [];
  if (dim.feet > 0) parts.push(`${dim.feet}'`);
  if (dim.inches > 0) parts.push(`${dim.inches}"`);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function formatMetric(dim: DimensionValue): string {
  if (!dim || (dim.feet === 0 && dim.inches === 0)) return '—';
  return `${feetInchesToMeters(dim.feet, dim.inches)} m`;
}
