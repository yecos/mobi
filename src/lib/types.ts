export type Lang = 'en' | 'es';

export interface DimensionValue {
  feet: number;
  inches: number;
}

export interface Dimensions {
  height: DimensionValue;
  width: DimensionValue;
  depth: DimensionValue;
  widthExtended: DimensionValue;
  seatDepth: DimensionValue;
  depthExtended: DimensionValue;
}

export interface ColorFinish {
  name: string;
  color: string;
}

export interface LoungeConfiguration {
  name: string;
  units: number;
}

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

export interface MaterialItem {
  material: string;
  quantity: number;
  description: string;
  observations: string;
}

export interface FurnitureData {
  productName: string;
  brand: string;
  referenceNumber: string;
  description: string;
  descriptionEs: string;
  dimensions: Dimensions;
  materials: MaterialItem[];
  quantity: number;
  colorFinishes: ColorFinish[];
  loungeConfigurations: LoungeConfiguration[];
  category: string;
  tags: string[];
  observations: string;
  shapeProfile: ShapeProfile;
  style?: string;  // e.g. Moderno, Clásico, Minimalista, Industrial, Escandinavo, Rústico
  finish?: string;  // Color/finish description
  specialFeature?: string;  // Special feature description
}

// ─── Copilot Furniture Data (VIVA MOBILI product sheet format) ───
export interface CopilotFurnitureData {
  productType: string;
  style: string;
  material: {
    main: string;
    details: string[];
  };
  finish: string;
  feature: string;
  dimensions: {
    height: number;
    width: number;
    depth: number;
    seatHeight: number | null;
  };
  weight: number;
  annotations: string[];
  colorPalette: {
    primary: string;
    secondary: string;
    pearlGray: string;
    darkGray: string;
  };
  brand: string;
  renderViews: string[];
}

export const defaultCopilotFurnitureData: CopilotFurnitureData = {
  productType: '',
  style: '',
  material: {
    main: '',
    details: [],
  },
  finish: '',
  feature: '',
  dimensions: {
    height: 0,
    width: 0,
    depth: 0,
    seatHeight: null,
  },
  weight: 0,
  annotations: [],
  colorPalette: {
    primary: '#8B7355',
    secondary: '#D4A574',
    pearlGray: '#E5E5E5',
    darkGray: '#4A4A4A',
  },
  brand: 'VIVA MOBILI',
  renderViews: ['front', 'side', 'top', 'perspective'],
};

// ─── Copilot Chat Message ───
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageData?: string;
  furnitureData?: CopilotFurnitureData;
}

export const defaultFurnitureData: FurnitureData = {
  productName: '',
  brand: 'Unknown',
  referenceNumber: 'N/A',
  description: '',
  descriptionEs: '',
  dimensions: {
    height: { feet: 0, inches: 0 },
    width: { feet: 0, inches: 0 },
    depth: { feet: 0, inches: 0 },
    widthExtended: { feet: 0, inches: 0 },
    seatDepth: { feet: 0, inches: 0 },
    depthExtended: { feet: 0, inches: 0 },
  },
  materials: [],
  quantity: 1,
  colorFinishes: [],
  loungeConfigurations: [],
  category: 'sofa',
  tags: [],
  observations: '',
  style: '',
  finish: '',
  specialFeature: '',
  shapeProfile: {
    bodyShape: 'rectangular',
    cornerStyle: 'sharp',
    hasBackrest: false,
    backrestShape: 'none',
    hasArmrests: false,
    armrestShape: 'none',
    legType: 'none',
    legCount: 4,
    seatShape: 'flat',
    topViewOutline: '',
    sideProfile: '',
  },
};
