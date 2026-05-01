'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

export function useCatalog() {
  const furnitureData = useAppStore((s) => s.furnitureData);
  const catalogItems = useAppStore((s) => s.catalogItems);
  const addCatalogItem = useAppStore((s) => s.addCatalogItem);
  const clearCatalog = useAppStore((s) => s.clearCatalog);
  const resetForNewPiece = useAppStore((s) => s.resetForNewPiece);
  const lang = useAppStore((s) => s.lang);

  const handleAddToCatalog = useCallback(
    async (ultraCompressImage: () => Promise<string | null>) => {
      const compressedImage = await ultraCompressImage();
      addCatalogItem(furnitureData, compressedImage || '');
      toast.success(
        t(lang, 'catalog.addedToCatalog').replace('{name}', furnitureData.productName || 'Piece').replace('{count}', String(catalogItems.length + 1))
      );
      resetForNewPiece();
    },
    [furnitureData, catalogItems.length, addCatalogItem, resetForNewPiece, lang]
  );

  const handleClearCatalog = useCallback(() => {
    clearCatalog();
    toast.success(t(lang, 'catalog.catalogCleared'));
  }, [clearCatalog, lang]);

  return {
    handleAddToCatalog,
    handleClearCatalog,
    catalogCount: catalogItems.length,
  };
}
