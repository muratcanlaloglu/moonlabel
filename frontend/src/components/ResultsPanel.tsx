interface Detection {
  label: string
  x_center: number
  y_center: number
  width: number
  height: number
}

interface DetectionResult {
  detections: Detection[]
}

interface ResultsPanelProps {
  results: DetectionResult
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
  const downloadYolo = () => {
    const yoloContent = results.detections
      .map(det => `0 ${det.x_center} ${det.y_center} ${det.width} ${det.height}`)
      .join('\n')
    
    const blob = new Blob([yoloContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'annotations.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    const yoloContent = results.detections
      .map(det => `0 ${det.x_center} ${det.y_center} ${det.width} ${det.height}`)
      .join('\n')
    
    try {
      await navigator.clipboard.writeText(yoloContent)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Detection Results ({results.detections.length} objects found)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            📋 Copy
          </button>
          <button
            onClick={downloadYolo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            📥 Download YOLO
          </button>
        </div>
      </div>

      {results.detections.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No objects detected in the image.</p>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.detections.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Objects Detected</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {new Set(results.detections.map(d => d.label)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unique Labels</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">YOLO</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Format Ready</div>
            </div>
          </div>

          {/* YOLO Format Preview */}
          <div>
            <h4 className="font-medium mb-2">YOLO Format Annotations:</h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto border border-gray-200 dark:border-gray-700">
              <pre className="text-gray-800 dark:text-gray-300">
                {results.detections.map((det, idx) => (
                  <div key={idx} className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded">
                    <span className="text-yellow-600 dark:text-yellow-400">0</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400">{det.x_center.toFixed(6)}</span>{' '}
                    <span className="text-green-600 dark:text-green-400">{det.y_center.toFixed(6)}</span>{' '}
                    <span className="text-purple-600 dark:text-purple-400">{det.width.toFixed(6)}</span>{' '}
                    <span className="text-red-600 dark:text-red-400">{det.height.toFixed(6)}</span>
                    <span className="text-gray-500 dark:text-gray-500 ml-4">// {det.label}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* Detection Details */}
          <div>
            <h4 className="font-medium mb-2">Detection Details:</h4>
            <div className="space-y-2">
              {results.detections.map((det, idx) => (
                <div key={idx} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex justify-between items-center border border-gray-200 dark:border-gray-600">
                  <div>
                    <span className="font-medium">{det.label}</span>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Center: ({det.x_center.toFixed(3)}, {det.y_center.toFixed(3)}) | 
                      Size: {det.width.toFixed(3)} × {det.height.toFixed(3)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 