import { useState, useRef, useCallback, useEffect } from 'react'




interface UploadAreaProps {
  onDetection: (file: File, objects: string[], apiKey: string) => Promise<void>
  isProcessing: boolean
}

export default function UploadArea({ onDetection, isProcessing }: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [objects, setObjects] = useState<string>('person')
  const [apiKey, setApiKey] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('moondream_api_key')
    if (savedKey) {
      setApiKey(savedKey)
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
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      setSelectedFile(imageFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleDetect = async () => {
    if (!selectedFile || !apiKey.trim()) return

    const objectList = objects.split(',').map(s => s.trim()).filter(s => s)
    await onDetection(selectedFile, objectList, apiKey)
  }

  const resetSelection = () => {
    setSelectedFile(null)
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
              : selectedFile
              ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="text-green-500 dark:text-green-400 text-4xl">✓</div>
              <div>
                <p className="text-lg font-medium text-green-600 dark:text-green-400">File selected</p>
                <p className="text-gray-800 dark:text-gray-300">{selectedFile.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={resetSelection}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
              >
                Choose different file
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

        {!apiKey && (
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ No API key configured. Please go to <strong>Settings</strong> to add your API key.
            </p>
          </div>
        )}

        <button
          onClick={handleDetect}
          disabled={!selectedFile || !apiKey.trim() || isProcessing}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            selectedFile && apiKey.trim() && !isProcessing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Detect Objects'}
        </button>
      </div>
    </div>
  )
} 