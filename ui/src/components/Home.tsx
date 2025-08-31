import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/useTheme'
import UploadArea from './UploadArea'
import ResultsPanel from './ResultsPanel'
import logo from '../assets/moonlabellogo.svg'

interface Detection {
  label: string
  x_center: number
  y_center: number
  width: number
  height: number
}

interface ImageResult {
  file: File; previewUrl: string; detections: Detection[];
}

interface CaptionItem {
  file: File;
  previewUrl: string;
  caption: string;
}

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [datasetType, setDatasetType] = useState<'detect' | 'caption'>('detect')
  const [captionItems, setCaptionItems] = useState<CaptionItem[]>([])
  const [captionLength, setCaptionLength] = useState<'short' | 'normal' | 'long'>('short')

  const handleDetection = async (file: File, objects: string[], apiKey: string, stationEndpoint?: string) => {
    setIsProcessing(true)
    setError(null)
    try {
      const detectionsAccum: Detection[] = []
      for (const label of objects) {
        const formData = new FormData()
        formData.append('image', file)
        formData.append('objects', label)
        formData.append('api_key', apiKey)
        
        // Add station endpoint if provided
        if (stationEndpoint) {
          formData.append('station_endpoint', stationEndpoint)
        }

        const response = await fetch('/api/detect', { method: 'POST', body: formData })
        if (!response.ok) throw new Error(`Detection failed: ${response.statusText}`)
        const data = await response.json()
        detectionsAccum.push(...data.detections)
      }
      const previewUrl = URL.createObjectURL(file)
      setResults(prev => [...prev, { file, previewUrl, detections: detectionsAccum }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCaption = async (file: File, apiKey: string, stationEndpoint?: string) => {
    setIsProcessing(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('caption_length', captionLength)
      if (apiKey) form.append('api_key', apiKey)
      if (stationEndpoint) form.append('station_endpoint', stationEndpoint)
      const res = await fetch('/api/caption', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Caption failed: ${res.statusText}`)
      const data = await res.json()
      const previewUrl = URL.createObjectURL(file)
      setCaptionItems(prev => [...prev, { file, previewUrl, caption: data.caption || '' }])
    } catch (err) {
      setCaptionItems(prev => [...prev, { file, previewUrl: URL.createObjectURL(file), caption: '' }])
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCaptionZip = async () => {
    try {
      const form = new FormData()
      form.append('export_format', 'caption')
      form.append('caption_length', captionLength)
      const apiKey = localStorage.getItem('moondream_api_key') || ''
      const stationEndpoint = localStorage.getItem('moondream_station_endpoint') || ''
      if (apiKey) form.append('api_key', apiKey)
      if (stationEndpoint) form.append('station_endpoint', stationEndpoint)
      form.append('annotations', JSON.stringify({}))
      for (const it of captionItems) {
        form.append('images', it.file, it.file.name)
      }
      const res = await fetch('/api/export', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'dataset.zip'
      a.click()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      alert('Export failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <img src={logo} alt="MoonLabel" className="w-15 h-15" />
            MoonLabel
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
            <button
              onClick={() => setDatasetType('detect')}
              className={`px-3 py-2 text-sm ${datasetType==='detect' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
            >
              Detection
            </button>
            <button
              onClick={() => setDatasetType('caption')}
              className={`px-3 py-2 text-sm ${datasetType==='caption' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
            >
              Caption
            </button>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {datasetType === 'detect' ? (
            <UploadArea 
              variant="detect"
              onDetection={handleDetection}
              isProcessing={isProcessing}
            />
          ) : (
            <UploadArea
              variant="caption"
              onCaption={handleCaption}
              isProcessing={isProcessing}
              actionLabel="Generate Captions"
              extraControls={
                <div className="flex items-center gap-2">
                  <label className="text-sm">Length:</label>
                  <select
                    value={captionLength}
                    onChange={(e) => setCaptionLength(e.target.value as 'short' | 'normal' | 'long')}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    title="Caption length"
                  >
                    <option value="short">Short</option>
                    <option value="normal">normal</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              }
            />
          )}
          
          {error && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
          )}

          {datasetType === 'detect' ? (
            results.length > 0 ? <ResultsPanel results={results} /> : null
          ) : (
            <div className="mt-6 space-y-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {captionItems.map((it, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-start gap-4 p-4">
                      <img src={it.previewUrl} alt={`cap-${idx}`} className="w-full md:w-56 h-40 object-cover rounded" />
                      <div className="flex-1 w-full">
                        <div className="w-full min-h-24 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-md p-3 text-sm whitespace-pre-wrap">
                          {it.caption || '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {captionItems.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={downloadCaptionZip}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    📦 Download CAPTION
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
