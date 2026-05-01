'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

export function useImageUpload() {
  const lang = useAppStore((s) => s.lang);
  const setImageFile = useAppStore((s) => s.setImageFile);
  const setImagePreview = useAppStore((s) => s.setImagePreview);
  const setImageBase64 = useAppStore((s) => s.setImageBase64);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const setDragActive = useAppStore((s) => s.setDragActive);

  const compressImage = useCallback(
    (dataUrl: string, maxDim = 1200, quality = 0.8): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },
    []
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error(t(lang, 'toasts.invalidImage'));
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        const compressed = await compressImage(result);
        setImageBase64(compressed);
      };
      reader.readAsDataURL(file);
    },
    [compressImage, lang, setImageFile, setImagePreview, setImageBase64]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [setDragActive]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile, setDragActive]
  );

  const ultraCompressImage = useCallback(async (): Promise<string | null> => {
    if (!imageBase64) return null;
    try {
      const img = new Image();
      img.src = imageBase64;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      const canvas = document.createElement('canvas');
      const maxDim = 300;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
      }
      return imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    } catch {
      return imageBase64?.replace(/^data:image\/[^;]+;base64,/, '') || null;
    }
  }, [imageBase64]);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
  }, [setImageFile, setImagePreview, setImageBase64]);

  return {
    compressImage,
    handleFile,
    handleDrag,
    handleDrop,
    ultraCompressImage,
    removeImage,
  };
}
