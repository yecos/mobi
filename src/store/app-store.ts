import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FurnitureData, Lang } from '@/lib/types';
import { defaultFurnitureData } from '@/lib/types';

type AppState = 'upload' | 'analyzing' | 'editing' | 'generating' | 'complete';

interface AppStore {
  // Core state
  appState: AppState;
  furnitureData: FurnitureData;
  lang: Lang;
  unitMode: 'imperial' | 'metric';

  // Image state
  imagePreview: string | null;
  imageBase64: string | null;
  imageFile: File | null;
  dragActive: boolean;

  // Analysis state
  analysisMessages: string[];

  // PDF state
  metricPdf: string | null;
  imperialPdf: string | null;
  combinedPdf: string | null;
  catalogPdf: string | null;
  technicalDrawingBase64: string | null;

  // Catalog state
  catalogItems: FurnitureData[];
  catalogImages: string[];

  // Metric edit mode temp values
  metricEdits: Partial<Record<string, number>>;

  // Actions
  setState: (state: AppState) => void;
  setFurnitureData: (data: FurnitureData) => void;
  updateField: (field: keyof FurnitureData, value: unknown) => void;
  updateDimension: (dimKey: keyof import('@/lib/types').Dimensions, unit: 'feet' | 'inches', value: number) => void;
  updateDimensionFromMeters: (dimKey: keyof import('@/lib/types').Dimensions, meters: number) => void;
  updateMetricEdit: (dimKey: string, value: string) => void;
  clearMetricEdit: (dimKey: string) => void;
  setLang: (lang: Lang) => void;
  setUnitMode: (mode: 'imperial' | 'metric') => void;
  setImageFile: (file: File | null) => void;
  setImagePreview: (preview: string | null) => void;
  setImageBase64: (base64: string | null) => void;
  setDragActive: (active: boolean) => void;
  addAnalysisMessage: (msg: string) => void;
  clearAnalysisMessages: () => void;
  setMetricPdf: (pdf: string | null) => void;
  setImperialPdf: (pdf: string | null) => void;
  setCombinedPdf: (pdf: string | null) => void;
  setCatalogPdf: (pdf: string | null) => void;
  setTechnicalDrawing: (base64: string | null) => void;
  addCatalogItem: (item: FurnitureData, image: string) => void;
  clearCatalog: () => void;
  resetForNewPiece: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      appState: 'upload',
      furnitureData: { ...defaultFurnitureData },
      lang: 'en',
      unitMode: 'imperial',
      imagePreview: null,
      imageBase64: null,
      imageFile: null,
      dragActive: false,
      analysisMessages: [],
      metricPdf: null,
      imperialPdf: null,
      combinedPdf: null,
      catalogPdf: null,
      technicalDrawingBase64: null,
      catalogItems: [],
      catalogImages: [],
      metricEdits: {},

      setState: (state) => set({ appState: state }),
      setFurnitureData: (data) => set({ furnitureData: data }),
      updateField: (field, value) => set((s) => ({
        furnitureData: { ...s.furnitureData, [field]: value }
      })),
      updateDimension: (dimKey, unit, value) => set((s) => ({
        furnitureData: {
          ...s.furnitureData,
          dimensions: {
            ...s.furnitureData.dimensions,
            [dimKey]: { ...s.furnitureData.dimensions[dimKey], [unit]: value }
          }
        }
      })),
      updateDimensionFromMeters: (dimKey, meters) => {
        const totalInches = meters / 0.0254;
        let feet = Math.floor(totalInches / 12);
        let inches = Math.round(totalInches % 12);
        if (inches >= 12) { feet += 1; inches = 0; }
        set((s) => ({
          furnitureData: {
            ...s.furnitureData,
            dimensions: {
              ...s.furnitureData.dimensions,
              [dimKey]: { feet, inches }
            }
          }
        }));
      },
      updateMetricEdit: (dimKey, value) => set((s) => ({
        metricEdits: { ...s.metricEdits, [dimKey]: parseFloat(value) || 0 }
      })),
      clearMetricEdit: (dimKey) => set((s) => {
        const edits = { ...s.metricEdits };
        delete edits[dimKey];
        return { metricEdits: edits };
      }),
      setLang: (lang) => set({ lang }),
      setUnitMode: (mode) => set({ unitMode: mode }),
      setImageFile: (file) => set({ imageFile: file }),
      setImagePreview: (preview) => set({ imagePreview: preview }),
      setImageBase64: (base64) => set({ imageBase64: base64 }),
      setDragActive: (active) => set({ dragActive: active }),
      addAnalysisMessage: (msg) => set((s) => ({
        analysisMessages: [...s.analysisMessages, msg]
      })),
      clearAnalysisMessages: () => set({ analysisMessages: [] }),
      setMetricPdf: (pdf) => set({ metricPdf: pdf }),
      setImperialPdf: (pdf) => set({ imperialPdf: pdf }),
      setCombinedPdf: (pdf) => set({ combinedPdf: pdf }),
      setCatalogPdf: (pdf) => set({ catalogPdf: pdf }),
      setTechnicalDrawing: (base64) => set({ technicalDrawingBase64: base64 }),
      addCatalogItem: (item, image) => set((s) => ({
        catalogItems: [...s.catalogItems, item],
        catalogImages: [...s.catalogImages, image],
      })),
      clearCatalog: () => set({ catalogItems: [], catalogImages: [] }),
      resetForNewPiece: () => set({
        furnitureData: { ...defaultFurnitureData },
        imagePreview: null,
        imageBase64: null,
        imageFile: null,
        metricPdf: null,
        imperialPdf: null,
        combinedPdf: null,
        catalogPdf: null,
        technicalDrawingBase64: null,
        metricEdits: {},
      }),
      resetAll: () => set({
        appState: 'upload',
        furnitureData: { ...defaultFurnitureData },
        imagePreview: null,
        imageBase64: null,
        imageFile: null,
        dragActive: false,
        analysisMessages: [],
        metricPdf: null,
        imperialPdf: null,
        combinedPdf: null,
        catalogPdf: null,
        technicalDrawingBase64: null,
        metricEdits: {},
      }),
    }),
    {
      name: 'mobi-store',
      partialize: (state) => ({
        lang: state.lang,
        catalogItems: state.catalogItems,
        catalogImages: state.catalogImages,
      }),
    }
  )
);
