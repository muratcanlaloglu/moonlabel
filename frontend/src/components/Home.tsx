import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
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

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ImageResult[]>([])
  const [error, setError] = useState<string | null>(null)

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
          <UploadArea 
            onDetection={handleDetection}
            isProcessing={isProcessing}
          />
          
          {error && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
          )}

          {results.length > 0 && (
            <ResultsPanel results={results} />
          )}
        </div>
      </main>
    </div>
  )
} 