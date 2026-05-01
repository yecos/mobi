'use client';

import React, { useRef } from 'react';
import { t, type Lang } from '@/lib/i18n';
import { Upload, X, Sparkles, FileImage, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  imagePreview: string | null;
  imageFile: File | null;
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  onRemoveImage: () => void;
  onAnalyze: () => void;
  lang: Lang;
}

export function UploadZone({
  imagePreview,
  imageFile,
  dragActive,
  onDrag,
  onDrop,
  onFileSelect,
  onRemoveImage,
  onAnalyze,
  lang,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
          ${dragActive
            ? 'border-amber-500 bg-amber-50 scale-[1.02] shadow-lg shadow-amber-100'
            : imagePreview
            ? 'border-amber-300 bg-amber-50/30'
            : 'border-stone-300 bg-white hover:border-amber-400 hover:bg-amber-50/20'
          }
        `}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={handleClick}
      >
        {/* Animated background pattern when dragging */}
        {dragActive && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#d97706_1px,transparent_1px)] bg-[length:20px_20px]" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {imagePreview ? (
          <div className="p-4">
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Furniture preview"
                className="w-full max-h-72 object-contain rounded-lg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage();
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-sm text-stone-500 mt-3">
              {t(lang, 'upload.clickToReplace')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className={`w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 transition-transform duration-300 ${dragActive ? 'scale-110' : ''}`}>
              {dragActive ? (
                <FileImage className="w-10 h-10 text-amber-700" />
              ) : (
                <Upload className="w-10 h-10 text-amber-700" />
              )}
            </div>
            <p className="text-lg font-semibold text-stone-700 mb-2">
              {dragActive ? t(lang, 'upload.dropImage') : t(lang, 'upload.dropImage')}
            </p>
            <p className="text-sm text-stone-400 mb-4">
              {t(lang, 'upload.orBrowse')}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-50 px-3 py-1.5 rounded-full">
              <FileImage className="w-3.5 h-3.5" />
              <span>JPG</span>
              <span className="w-px h-3 bg-stone-300" />
              <span>PNG</span>
              <span className="w-px h-3 bg-stone-300" />
              <span>WebP</span>
            </div>
          </div>
        )}
      </div>

      {/* Analyze button */}
      {imagePreview && (
        <div className="animate-fade-in-up">
          <Button
            onClick={onAnalyze}
            className="w-full h-14 text-lg bg-amber-800 hover:bg-amber-900 text-white rounded-xl shadow-lg shadow-amber-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
            {t(lang, 'upload.analyzeFurniture')}
          </Button>
          <p className="text-center text-xs text-stone-400 mt-2">
            {lang === 'en'
              ? 'Analysis typically takes 10-30 seconds'
              : 'El análisis típicamente tarda 10-30 segundos'}
          </p>
        </div>
      )}

      {/* No image hint */}
      {!imagePreview && (
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>
            {lang === 'en'
              ? 'Or try a sample below without uploading'
              : 'O prueba un ejemplo abajo sin subir imagen'}
          </span>
        </div>
      )}
    </div>
  );
}
