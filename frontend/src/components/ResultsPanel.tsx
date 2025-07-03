import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
  // flatten detections
  const allDetections = results.flatMap(img => img.detections);

  const copyToClipboard = async () => {
    const yoloContent = allDetections
      .map(det => `0 ${det.x_center} ${det.y_center} ${det.width} ${det.height}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(yoloContent);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadDataset = async () => {
    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const labelsFolder = zip.folder('labels');
    for (const img of results) {
      const base = img.file.name.replace(/\.[^.]+$/, '');
      imagesFolder?.file(img.file.name, img.file);
      const yoloLines = img.detections
        .map(det => `0 ${det.x_center} ${det.y_center} ${det.width} ${det.height}`)
        .join('\n');
      labelsFolder?.file(`${base}.txt`, yoloLines);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'dataset.zip');
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
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >📋 Copy</button>
            <button
              onClick={downloadDataset}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
            >
              📦 Download Dataset
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {results.map((img, idx) => (
          <div key={idx} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <img src={img.previewUrl} alt={`preview-${idx}`} className="w-full object-cover" />
            {/* Bounding boxes */}
            {img.detections.map((det, i) => {
              const left = (det.x_center - det.width / 2) * 100;
              const top = (det.y_center - det.height / 2) * 100;
              const width = det.width * 100;
              const height = det.height * 100;
              return (
                <div
                  key={i}
                  className="absolute border-2 border-red-500"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                >
                  <span className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1">
                    {det.label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 