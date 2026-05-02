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
