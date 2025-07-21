import { useState, useRef, useCallback, useEffect } from 'react'




interface UploadAreaProps {
  onDetection: (file: File, objects: string[], apiKey: string, stationEndpoint?: string) => Promise<void>
  isProcessing: boolean
}

export default function UploadArea({ onDetection, isProcessing }: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [objects, setObjects] = useState<string>('person')
  const [apiKey, setApiKey] = useState<string>('')
  const [stationEndpoint, setStationEndpoint] = useState<string>('http://localhost:2020/v1')
  const [mode, setMode] = useState<'cloud' | 'local' | 'station'>('cloud')
  const [detecting, setDetecting] = useState<boolean>(false)
  const [progress, setProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load API key, station endpoint, and mode from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('moondream_api_key')
    if (savedKey) setApiKey(savedKey)

    const savedEndpoint = localStorage.getItem('moondream_station_endpoint')
    if (savedEndpoint) setStationEndpoint(savedEndpoint)

    const savedMode = localStorage.getItem('moondream_mode') as 'cloud' | 'local' | 'station' | null
    if (savedMode === 'local' || savedMode === 'cloud' || savedMode === 'station') {
      setMode(savedMode)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      setSelectedFiles(imageFiles)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const selectedFiles = Array.from(files)
      setSelectedFiles(selectedFiles)
    }
  }, [])

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleDetect = async () => {
    if (selectedFiles.length === 0) return

    if (mode === 'cloud' && !apiKey.trim()) return
    if (mode === 'station' && !stationEndpoint.trim()) return

    const objectList = objects.split(',').map(s => s.trim()).filter(s => s)
    setDetecting(true)
    setProgress({ processed: 0, total: selectedFiles.length })

    for (const [idx, file] of selectedFiles.entries()) {
      const keyToSend = mode === 'cloud' ? apiKey : ''
      const endpointToSend = mode === 'station' ? stationEndpoint : undefined
      await onDetection(file, objectList, keyToSend, endpointToSend)
      setProgress({ processed: idx + 1, total: selectedFiles.length })
    }

    setDetecting(false)
  }

  const resetSelection = () => {
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          📤 Upload Images
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Drag and drop images or click to select files</p>
        
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : selectedFiles.length > 0
              ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              <div className="text-green-500 dark:text-green-400 text-4xl">✓</div>
              <div>
                <p className="text-lg font-medium text-green-600 dark:text-green-400">Files selected</p>
                <p className="text-gray-800 dark:text-gray-300">{selectedFiles.map(file => file.name).join(', ')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFiles.reduce((total, file) => total + (file.size / 1024 / 1024), 0).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={resetSelection}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
              >
                Choose different files
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-gray-500 dark:text-gray-400 text-4xl">📤</div>
              <div>
                <p className="text-lg font-medium text-gray-800 dark:text-white">Drag and drop images here</p>
                <p className="text-gray-600 dark:text-gray-400">or click to browse files</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Supports: JPG, PNG, GIF, WebP
                </p>
              </div>
              <button
                onClick={handleBrowseClick}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Browse Files
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
      </div>

      {/* Configuration Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Detection Configuration</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Objects to detect (comma-separated)
          </label>
          <input
            type="text"
            value={objects}
            onChange={(e) => setObjects(e.target.value)}
            placeholder="person, car, dog"
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white"
          />
        </div>

        {mode === 'cloud' && !apiKey && (
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ No API key configured. Please go to <strong>Settings</strong> to add your API key.
            </p>
          </div>
        )}

        {mode === 'station' && !stationEndpoint && (
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ No station endpoint configured. Please go to <strong>Settings</strong> to configure your Moondream Station endpoint.
            </p>
          </div>
        )}

        {mode === 'station' && stationEndpoint && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              🚀 Using Moondream Station at {stationEndpoint}. Make sure your Station is running.
            </p>
          </div>
        )}

        {mode === 'local' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm">
              🖥️ Using local Hugging Face model. Ensure the backend has downloaded it first use.
            </p>
          </div>
        )}

        <button
          onClick={handleDetect}
          disabled={
            selectedFiles.length === 0 ||
            (mode === 'cloud' && !apiKey.trim()) ||
            (mode === 'station' && !stationEndpoint.trim()) ||
            detecting ||
            isProcessing
          }
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            selectedFiles.length > 0 && 
            (mode === 'local' || 
             (mode === 'cloud' && apiKey.trim()) || 
             (mode === 'station' && stationEndpoint.trim())) && 
            !detecting && !isProcessing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {(detecting || isProcessing) && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
          {detecting || isProcessing
            ? `Processing ${progress.processed}/${progress.total}`
            : 'Detect Objects'}
        </button>

        {/* Progress Bar */}
        {detecting && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all"
              style={{ width: `${(progress.processed / progress.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
} 