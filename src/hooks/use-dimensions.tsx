'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { feetInchesToMeters, formatDimShort } from '@/lib/convert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Dimensions } from '@/lib/types';

export function useDimensions() {
  const furnitureData = useAppStore((s) => s.furnitureData);
  const unitMode = useAppStore((s) => s.unitMode);
  const metricEdits = useAppStore((s) => s.metricEdits);
  const updateDimension = useAppStore((s) => s.updateDimension);
  const updateDimensionFromMeters = useAppStore((s) => s.updateDimensionFromMeters);
  const updateMetricEdit = useAppStore((s) => s.updateMetricEdit);
  const clearMetricEdit = useAppStore((s) => s.clearMetricEdit);

  const renderDimensionInput = (
    label: string,
    dimKey: keyof Dimensions,
    required = false
  ) => {
    const dim = furnitureData.dimensions[dimKey];
    const metersCalc = dim ? feetInchesToMeters(dim.feet, dim.inches) : '0.00';

    const metricDisplayValue =
      metricEdits[dimKey] !== undefined ? metricEdits[dimKey] : parseFloat(metersCalc);

    return (
      <div className="space-y-2" key={dimKey}>
        <Label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
          {label}
          {required && <span className="text-red-400">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          {unitMode === 'imperial' ? (
            <>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={dim?.feet || 0}
                  onChange={(e) =>
                    updateDimension(dimKey, 'feet', parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-9 text-center"
                />
                <span className="text-xs text-stone-500 font-medium">ft</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={11}
                  value={dim?.inches || 0}
                  onChange={(e) =>
                    updateDimension(dimKey, 'inches', parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-9 text-center"
                />
                <span className="text-xs text-stone-500 font-medium">in</span>
              </div>
              <span className="text-xs text-stone-400 ml-1">({metersCalc} m)</span>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={metricDisplayValue}
                onChange={(e) => {
                  updateMetricEdit(dimKey, e.target.value);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    updateDimensionFromMeters(dimKey, val);
                  }
                  clearMetricEdit(dimKey);
                }}
                className="w-24 h-9 text-center"
              />
              <span className="text-xs text-stone-500 font-medium">m</span>
              <span className="text-xs text-stone-400 ml-1">({formatDimShort(dim)})</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return { renderDimensionInput };
}
