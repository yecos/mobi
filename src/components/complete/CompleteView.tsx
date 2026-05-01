'use client';

import React from 'react';
import { CheckCircle2, FileText, Download, Ruler, Layers, AlertCircle, ExternalLink, RotateCcw, Pencil, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { feetInchesToMeters } from '@/lib/convert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CompleteViewProps {
  metricPdf: string | null;
  imperialPdf: string | null;
  combinedPdf: string | null;
  catalogPdf: string | null;
  furnitureData: FurnitureData;
  catalogCount: number;
  onDownload: (base64: string, filename: string) => void;
  onPreview: (base64: string) => void;
  onEditSpecs: () => void;
  onNewAnalysis: () => void;
  lang: Lang;
}

export function CompleteView({
  metricPdf,
  imperialPdf,
  combinedPdf,
  catalogPdf,
  furnitureData,
  catalogCount,
  onDownload,
  onPreview,
  onEditSpecs,
  onNewAnalysis,
  lang,
}: CompleteViewProps) {
  const hasAnyPdf = metricPdf || imperialPdf || combinedPdf || catalogPdf;

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
          {t(lang, 'complete.pdfsGenerated')}
        </h2>
        <p className="text-stone-500 max-w-md mx-auto">
          {t(lang, 'complete.bothVersions')}{' '}
          <span className="font-semibold text-amber-800">{furnitureData.productName}</span>
        </p>
      </div>

      {/* PDF Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Metric PDF Card */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 to-white overflow-hidden hover:shadow-lg transition-shadow">
          <div
            className="h-56 bg-stone-100 flex items-center justify-center p-4 cursor-pointer hover:bg-stone-50 transition-colors relative group"
            onClick={() => metricPdf && onPreview(metricPdf)}
          >
            {metricPdf ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-10 h-10 text-amber-700/60" />
                </div>
                <p className="text-sm text-stone-500">{t(lang, 'complete.clickPreviewMetric')}</p>
                <div className="mt-2 text-xs text-amber-700 font-medium bg-amber-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {t(lang, 'complete.metricLabel')}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">
                  {lang === 'en' ? 'Metric PDF not available' : 'PDF métrico no disponible'}
                </p>
              </div>
            )}
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">{t(lang, 'complete.metricVersion')}</h3>
                <p className="text-xs text-stone-500">{t(lang, 'complete.dimsInMeters')}</p>
              </div>
            </div>
            <Button
              className="w-full bg-amber-800 hover:bg-amber-900 text-white"
              onClick={() =>
                metricPdf && onDownload(metricPdf, `${furnitureData.productName || 'furniture'}_metric.pdf`)
              }
              disabled={!metricPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              {t(lang, 'complete.downloadMetricPdf')}
            </Button>
          </CardContent>
        </Card>

        {/* Imperial PDF Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/80 to-white overflow-hidden hover:shadow-lg transition-shadow">
          <div
            className="h-56 bg-stone-100 flex items-center justify-center p-4 cursor-pointer hover:bg-stone-50 transition-colors relative group"
            onClick={() => imperialPdf && onPreview(imperialPdf)}
          >
            {imperialPdf ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-10 h-10 text-blue-700/60" />
                </div>
                <p className="text-sm text-stone-500">{t(lang, 'complete.clickPreviewImperial')}</p>
                <div className="mt-2 text-xs text-blue-700 font-medium bg-blue-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {t(lang, 'complete.imperialLabel')}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">
                  {lang === 'en' ? 'Imperial PDF not available' : 'PDF imperial no disponible'}
                </p>
              </div>
            )}
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-blue-800" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">{t(lang, 'complete.imperialVersion')}</h3>
                <p className="text-xs text-stone-500">{t(lang, 'complete.dimsInFeetInches')}</p>
              </div>
            </div>
            <Button
              className="w-full bg-blue-800 hover:bg-blue-900 text-white"
              onClick={() =>
                imperialPdf && onDownload(imperialPdf, `${furnitureData.productName || 'furniture'}_imperial.pdf`)
              }
              disabled={!imperialPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              {t(lang, 'complete.downloadImperialPdf')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Catalog & Combined PDF Cards */}
      {(catalogPdf || combinedPdf) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
          {catalogPdf && (
            <Card className="border-green-200 bg-gradient-to-br from-green-50/80 to-white overflow-hidden hover:shadow-lg transition-shadow">
              <div
                className="h-48 bg-stone-100 flex items-center justify-center p-4 cursor-pointer hover:bg-stone-50 transition-colors relative group"
                onClick={() => onPreview(catalogPdf)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Layers className="w-8 h-8 text-green-700/60" />
                  </div>
                  <p className="text-sm text-stone-500">{t(lang, 'complete.clickPreviewMetric')}</p>
                  <div className="mt-2 text-xs text-green-700 font-medium bg-green-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {catalogCount + 1} {lang === 'en' ? 'pieces' : 'piezas'}
                  </div>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-green-800" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{t(lang, 'complete.catalogVersion')}</h3>
                    <p className="text-xs text-stone-500">
                      {lang === 'en' ? 'Multi-piece catalog with all items' : 'Catálogo multipieza con todos los artículos'}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-green-800 hover:bg-green-900 text-white"
                  onClick={() => catalogPdf && onDownload(catalogPdf, 'furniture_catalog.pdf')}
                  disabled={!catalogPdf}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t(lang, 'complete.downloadCatalogPdf')}
                </Button>
              </CardContent>
            </Card>
          )}

          {combinedPdf && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50/80 to-white overflow-hidden hover:shadow-lg transition-shadow">
              <div
                className="h-48 bg-stone-100 flex items-center justify-center p-4 cursor-pointer hover:bg-stone-50 transition-colors relative group"
                onClick={() => onPreview(combinedPdf)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <FileText className="w-8 h-8 text-purple-700/60" />
                  </div>
                  <p className="text-sm text-stone-500">{t(lang, 'complete.clickPreviewImperial')}</p>
                  <div className="mt-2 text-xs text-purple-700 font-medium bg-purple-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Metric + Imperial
                  </div>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Ruler className="w-5 h-5 text-purple-800" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{t(lang, 'complete.combinedVersion')}</h3>
                    <p className="text-xs text-stone-500">
                      {lang === 'en' ? 'Metric & imperial in one document' : 'Métrico e imperial en un documento'}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-purple-800 hover:bg-purple-900 text-white"
                  onClick={() =>
                    combinedPdf && onDownload(combinedPdf, `${furnitureData.productName || 'furniture'}_combined.pdf`)
                  }
                  disabled={!combinedPdf}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t(lang, 'complete.downloadCombinedPdf')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Spec Summary */}
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-900">{t(lang, 'complete.specSummary')}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onEditSpecs} className="text-stone-600">
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  {t(lang, 'complete.editSpecs')}
                </Button>
                <Button variant="outline" size="sm" onClick={onNewAnalysis} className="text-stone-600">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {t(lang, 'complete.newAnalysis')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'complete.product')}</p>
                <p className="font-semibold text-stone-900">{furnitureData.productName}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'complete.brand')}</p>
                <p className="font-semibold text-stone-900">{furnitureData.brand}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'editing.category')}</p>
                <p className="font-semibold text-stone-900">{furnitureData.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'complete.reference')}</p>
                <p className="font-semibold text-stone-900">{furnitureData.referenceNumber}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'editing.height')}</p>
                <p className="font-semibold text-stone-900">
                  {furnitureData.dimensions.height.feet}&apos; {furnitureData.dimensions.height.inches}&quot; (
                  {feetInchesToMeters(furnitureData.dimensions.height.feet, furnitureData.dimensions.height.inches)} m)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'editing.width')}</p>
                <p className="font-semibold text-stone-900">
                  {furnitureData.dimensions.width.feet}&apos; {furnitureData.dimensions.width.inches}&quot; (
                  {feetInchesToMeters(furnitureData.dimensions.width.feet, furnitureData.dimensions.width.inches)} m)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'editing.depth')}</p>
                <p className="font-semibold text-stone-900">
                  {furnitureData.dimensions.depth.feet}&apos; {furnitureData.dimensions.depth.inches}&quot; (
                  {feetInchesToMeters(furnitureData.dimensions.depth.feet, furnitureData.dimensions.depth.inches)} m)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50">
                <p className="text-stone-500 text-xs mb-1">{t(lang, 'editing.materials')}</p>
                <p className="font-semibold text-stone-900">
                  {furnitureData.materials.join(', ') || t(lang, 'complete.none')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions footer */}
      {!hasAnyPdf && (
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <div className="p-6 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
            <h3 className="font-bold text-stone-900 mb-2">
              {lang === 'en' ? 'No PDFs Generated' : 'No se Generaron PDFs'}
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              {lang === 'en'
                ? 'There was an issue generating your PDFs. Please go back and try again.'
                : 'Hubo un problema al generar los PDFs. Por favor regresa e intenta de nuevo.'}
            </p>
            <Button variant="outline" onClick={onEditSpecs} className="text-amber-800 border-amber-300 hover:bg-amber-100">
              <RotateCcw className="w-4 h-4 mr-2" />
              {t(lang, 'complete.editSpecs')}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
