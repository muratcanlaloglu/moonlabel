import { saveAs } from 'file-saver';
import { useState, useEffect, useCallback } from 'react';

interface Detection {
  label: string
  x_center: number
  y_center: number
  width: number
  height: number
}

interface ImageResult {
  file: File;
  previewUrl: string;
  detections: Detection[];
}

interface ResultsPanelProps {
  results: ImageResult[];
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<'yolo' | 'voc' | 'coco' | 'caption'>('yolo');
  const [captionLength, setCaptionLength] = useState<'short' | 'medium' | 'long'>('short');
  
  // flatten detections
  const allDetections = results.flatMap(img => img.detections);

  // Build mapping from label to YOLO class index and maintain ordered list of unique labels
  const uniqueLabels = Array.from(new Set(allDetections.map(det => det.label)));
  const labelToIndex: Record<string, number> = Object.fromEntries(uniqueLabels.map((lbl, idx) => [lbl, idx]));

  // Color palette for different classes
  const colors = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#f97316',
    '#14b8a6', '#06b6d4', '#84cc16', '#059669', '#7c3aed', '#d946ef', '#f43f5e', '#f59e0b'
  ];

  const getColorForLabel = (label: string) => {
    const index = labelToIndex[label];
    return colors[index % colors.length];
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    
    switch (e.key) {
      case 'Escape':
        setSelectedImageIndex(null);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setSelectedImageIndex(prev => prev === null ? null : prev > 0 ? prev - 1 : results.length - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSelectedImageIndex(prev => prev === null ? null : prev < results.length - 1 ? prev + 1 : 0);
        break;
    }
  }, [selectedImageIndex, results.length]);

  // Add/remove keyboard event listeners
  useEffect(() => {
    if (selectedImageIndex !== null) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [handleKeyDown, selectedImageIndex]);

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  const goToPrevious = () => {
    setSelectedImageIndex(prev => prev === null ? null : prev > 0 ? prev - 1 : results.length - 1);
  };

  const goToNext = () => {
    setSelectedImageIndex(prev => prev === null ? null : prev < results.length - 1 ? prev + 1 : 0);
  };

  // Copy-to-clipboard removed per request

  const downloadDataset = async () => {
    try {
      const form = new FormData();
      form.append('export_format', exportFormat);

      if (exportFormat === 'caption') {
        form.append('caption_length', captionLength);
        // Pass backend settings if present
        const apiKey = localStorage.getItem('moondream_api_key') || '';
        const stationEndpoint = localStorage.getItem('moondream_station_endpoint') || '';
        if (apiKey) form.append('api_key', apiKey);
        if (stationEndpoint) form.append('station_endpoint', stationEndpoint);
        // annotations/classes ignored for caption, but provide empty to be safe
        form.append('annotations', JSON.stringify({}));
      } else {
        type YoloAnn = { label: string; x_center: number; y_center: number; width: number; height: number };
        const annMap: Record<string, YoloAnn[]> = {};
        for (const img of results) {
          annMap[img.file.name] = img.detections.map(det => ({
            label: det.label,
            x_center: det.x_center,
            y_center: det.y_center,
            width: det.width,
            height: det.height,
          }));
        }
        form.append('annotations', JSON.stringify(annMap));
        form.append('classes', JSON.stringify(uniqueLabels));
      }
      for (const img of results) {
        form.append('images', img.file, img.file.name);
      }
      const res = await fetch('/api/export', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      saveAs(blob, 'dataset.zip');
    } catch (err) {
      // Log to help debugging and satisfy no-unused-vars
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Detection Results ({allDetections.length} objects in {results.length} image{results.length!==1?'s':''})
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'yolo' | 'voc' | 'coco' | 'caption')}
                  className="px-2 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  title="Export format"
                >
                  <option value="yolo">YOLO</option>
                  <option value="voc">VOC</option>
                  <option value="coco">COCO</option>
                  <option value="caption">Caption</option>
                </select>
                {exportFormat === 'caption' && (
                  <select
                    value={captionLength}
                    onChange={(e) => setCaptionLength(e.target.value as 'short' | 'medium' | 'long')}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    title="Caption length"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                )}
              </div>
              <button
                onClick={downloadDataset}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              >
              📦 Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Images</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{allDetections.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Objects Detected</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{new Set(allDetections.map(d=>d.label)).size}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Unique Labels</div>
          </div>
        </div>
      </div>

      {/* Image previews */}
      <div className="flex flex-wrap gap-6 items-start">
        {results.map((img, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]">
            <div
              className="relative cursor-pointer w-full"
              onClick={() => openImageModal(idx)}
            >
              <img
                src={img.previewUrl}
                alt={`preview-${idx}`}
                className="w-full h-auto object-contain z-0"
              />

              {/* Bounding boxes, layered on top */}
              <div className="absolute inset-0 w-full h-full pointer-events-none z-10 bg-transparent">
                {img.detections.map((det, i) => {
                  const left = (det.x_center - det.width / 2) * 100;
                  const top = (det.y_center - det.height / 2) * 100;
                  const width = det.width * 100;
                  const height = det.height * 100;
                  const color = getColorForLabel(det.label);
                  return (
                    <div
                      key={i}
                      className="absolute border-2 pointer-events-none bg-transparent"
                      style={{ 
                        left: `${left}%`, 
                        top: `${top}%`, 
                        width: `${width}%`, 
                        height: `${height}%`,
                        borderColor: color
                      }}
                    >
                      <span 
                        className="absolute top-0 left-0 text-xs font-semibold px-1"
                        style={{ color: color, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {det.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
            >
              ✕
            </button>
            
            {/* Navigation buttons */}
            {results.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 text-3xl z-10"
                >
                  ‹
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 text-3xl z-10"
                >
                  ›
                </button>
              </>
            )}
            
            {/* Image with detections */}
            <div className="relative max-w-full max-h-full">
              <img 
                src={results[selectedImageIndex].previewUrl} 
                alt={`full-${selectedImageIndex}`} 
                className="max-w-full max-h-full object-contain"
              />
              {/* Bounding boxes for modal */}
              {results[selectedImageIndex].detections.map((det, i) => {
                const left = (det.x_center - det.width / 2) * 100;
                const top = (det.y_center - det.height / 2) * 100;
                const width = det.width * 100;
                const height = det.height * 100;
                const color = getColorForLabel(det.label);
                return (
                  <div
                    key={i}
                    className="absolute border-2"
                    style={{ 
                      left: `${left}%`, 
                      top: `${top}%`, 
                      width: `${width}%`, 
                      height: `${height}%`,
                      borderColor: color
                    }}
                  >
                    <span 
                      className="absolute top-0 left-0 text-sm font-semibold px-1"
                      style={{ color: color, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {det.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Image info */}
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-2 rounded">
              <div className="text-sm">
                {results[selectedImageIndex].file.name}
              </div>
              <div className="text-xs opacity-75">
                {selectedImageIndex + 1} of {results.length} • {results[selectedImageIndex].detections.length} detection{results[selectedImageIndex].detections.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeImageModal}
          />
        </div>
      )}
    </div>
  );
} 
