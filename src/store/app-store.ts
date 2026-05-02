import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FurnitureData, Lang, CopilotFurnitureData, CopilotMessage } from '@/lib/types';
import { defaultFurnitureData, defaultCopilotFurnitureData } from '@/lib/types';

type AppState = 'upload' | 'analyzing' | 'editing' | 'generating' | 'approving' | 'saving' | 'complete';

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

  // SVG / Approval state
  svgViews: { plant: string | null; frontal: string | null; lateral: string | null };
  isApproved: boolean;

  // AI Concept state
  conceptImageBase64: string | null;
  conceptPrompt: string | null;

  // Copilot state
  copilotOpen: boolean;
  copilotMessages: CopilotMessage[];
  copilotLoading: boolean;
  copilotData: CopilotFurnitureData | null;
  copilotViewImages: Record<string, string | null>;
  copilotSheetPdf: string | null;
  copilotSheetSvg: string | null;
  fichaEditMode: boolean;

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
  setSvgViews: (views: { plant: string; frontal: string; lateral: string }) => void;
  setApproved: (approved: boolean) => void;
  setConceptImage: (base64: string | null) => void;
  setConceptPrompt: (prompt: string | null) => void;
  setCopilotOpen: (open: boolean) => void;
  setCopilotLoading: (loading: boolean) => void;
  addCopilotMessage: (msg: CopilotMessage) => void;
  setCopilotData: (data: CopilotFurnitureData | null) => void;
  setCopilotViewImages: (images: Record<string, string | null>) => void;
  setCopilotSheetPdf: (pdf: string | null) => void;
  setCopilotSheetSvg: (svg: string | null) => void;
  setFichaEditMode: (mode: boolean) => void;
  clearCopilotMessages: () => void;
  updateCopilotData: (data: Partial<CopilotFurnitureData>) => void;
  updateCopilotDimension: (key: string, value: number | null) => void;
  updateCopilotMaterial: (data: Partial<CopilotFurnitureData['material']>) => void;
  updateCopilotAnnotation: (index: number, value: string) => void;
  updateCopilotMaterialDetail: (index: number, value: string) => void;
  addCopilotMaterialDetail: () => void;
  removeCopilotMaterialDetail: (index: number) => void;
  updateCopilotColor: (key: string, value: string) => void;
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
      svgViews: { plant: null, frontal: null, lateral: null },
      isApproved: false,
      conceptImageBase64: null,
      conceptPrompt: null,
      copilotOpen: false,
      copilotMessages: [],
      copilotLoading: false,
      copilotData: null,
      copilotViewImages: { front: null, side: null, top: null, perspective: null },
      copilotSheetPdf: null,
      copilotSheetSvg: null,
      fichaEditMode: false,

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
      setSvgViews: (views) => set({ svgViews: views }),
      setApproved: (approved) => set({ isApproved: approved }),
      setConceptImage: (base64) => set({ conceptImageBase64: base64 }),
      setConceptPrompt: (prompt) => set({ conceptPrompt: prompt }),
      setCopilotOpen: (open) => set({ copilotOpen: open }),
      setCopilotLoading: (loading) => set({ copilotLoading: loading }),
      addCopilotMessage: (msg) => set((s) => ({ copilotMessages: [...s.copilotMessages, msg] })),
      setCopilotData: (data) => set({ copilotData: data }),
      setCopilotViewImages: (images) => set({ copilotViewImages: images }),
      setCopilotSheetPdf: (pdf) => set({ copilotSheetPdf: pdf }),
      setCopilotSheetSvg: (svg) => set({ copilotSheetSvg: svg }),
      setFichaEditMode: (mode) => set({ fichaEditMode: mode }),
      clearCopilotMessages: () => set({
        copilotMessages: [],
        copilotData: null,
        copilotViewImages: { front: null, side: null, top: null, perspective: null },
        copilotSheetPdf: null,
        copilotSheetSvg: null,
        fichaEditMode: false,
      }),
      updateCopilotData: (data) => set((s) => ({
        copilotData: s.copilotData ? { ...s.copilotData, ...data } : null,
      })),
      updateCopilotDimension: (key, value) => set((s) => {
        if (!s.copilotData) return {};
        return {
          copilotData: {
            ...s.copilotData,
            dimensions: { ...s.copilotData.dimensions, [key]: value },
          },
        };
      }),
      updateCopilotMaterial: (data) => set((s) => {
        if (!s.copilotData) return {};
        return {
          copilotData: {
            ...s.copilotData,
            material: { ...s.copilotData.material, ...data },
          },
        };
      }),
      updateCopilotAnnotation: (index, value) => set((s) => {
        if (!s.copilotData) return {};
        const newAnnotations = [...s.copilotData.annotations];
        newAnnotations[index] = value;
        return { copilotData: { ...s.copilotData, annotations: newAnnotations } };
      }),
      updateCopilotMaterialDetail: (index, value) => set((s) => {
        if (!s.copilotData) return {};
        const newDetails = [...s.copilotData.material.details];
        newDetails[index] = value;
        return { copilotData: { ...s.copilotData, material: { ...s.copilotData.material, details: newDetails } } };
      }),
      addCopilotMaterialDetail: () => set((s) => {
        if (!s.copilotData) return {};
        return {
          copilotData: {
            ...s.copilotData,
            material: { ...s.copilotData.material, details: [...s.copilotData.material.details, ''] },
          },
        };
      }),
      removeCopilotMaterialDetail: (index) => set((s) => {
        if (!s.copilotData) return {};
        const newDetails = s.copilotData.material.details.filter((_, i) => i !== index);
        return {
          copilotData: {
            ...s.copilotData,
            material: { ...s.copilotData.material, details: newDetails },
          },
        };
      }),
      updateCopilotColor: (key, value) => set((s) => {
        if (!s.copilotData) return {};
        return {
          copilotData: {
            ...s.copilotData,
            colorPalette: { ...s.copilotData.colorPalette, [key]: value },
          },
        };
      }),
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
        svgViews: { plant: null, frontal: null, lateral: null },
        isApproved: false,
        conceptImageBase64: null,
        conceptPrompt: null,
        copilotData: null,
        copilotViewImages: { front: null, side: null, top: null, perspective: null },
        copilotSheetPdf: null,
        copilotSheetSvg: null,
        fichaEditMode: false,
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
        svgViews: { plant: null, frontal: null, lateral: null },
        isApproved: false,
        conceptImageBase64: null,
        conceptPrompt: null,
        copilotData: null,
        copilotViewImages: { front: null, side: null, top: null, perspective: null },
        copilotSheetPdf: null,
        copilotSheetSvg: null,
        fichaEditMode: false,
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
