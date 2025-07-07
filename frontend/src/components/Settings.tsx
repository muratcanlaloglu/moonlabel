import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function Settings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Load saved API key and mode from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('moondream_api_key')
    if (savedKey) setApiKey(savedKey)

    const savedMode = localStorage.getItem('moondream_mode') as 'cloud' | 'local' | null
    if (savedMode === 'local' || savedMode === 'cloud') setMode(savedMode)
  }, [])

  const handleSaveApiKey = () => {
    if (mode === 'cloud' && !apiKey.trim()) {
      // Cloud requires key
      return
    }

    if (mode === 'cloud') {
      localStorage.setItem('moondream_api_key', apiKey.trim())
    }

    localStorage.setItem('moondream_mode', mode)

    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleClearApiKey = () => {
    setApiKey('')
    localStorage.removeItem('moondream_api_key')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            ← Back to Home
          </button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Configure your Moondream API settings</p>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* AI Backend Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              🔗 AI Backend Configuration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Select which backend to use for object detection and provide credentials if required.</p>
            
            {/* Mode selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Backend Mode</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="backend-mode"
                    value="cloud"
                    checked={mode === 'cloud'}
                    onChange={() => setMode('cloud')}
                  />
                  <span>Moondream Cloud</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="backend-mode"
                    value="local"
                    checked={mode === 'local'}
                    onChange={() => setMode('local')}
                  />
                  <span>Local (HuggingFace)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {mode === 'cloud' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your AI API key"
                    className="w-full px-3 py-2 pr-12 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSaveApiKey}
                  disabled={mode === 'cloud' && !apiKey.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    (mode === 'cloud' && apiKey.trim()) || mode === 'local'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  💾 Save Settings
                </button>
                
                {mode === 'cloud' && apiKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Clear
                  </button>
                )}

                {isSaved && (
                  <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                    ✅ Settings saved successfully!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supported AI Services */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-2">Supported AI Services</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Compatible AI services for object detection</p>
            
            <div className="space-y-4">
              
              {/* Moondream Cloud */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold mb-2">Moondream Vision API</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">Use Moondream for object detection and annotation</p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Option A: Cloud</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">It's quicker since there's no download:</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                      <li>• Create an API key at the <a href="https://moondream.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline">Moondream Cloud Console</a> (free tier available, no credit card required)</li>
                      <li>• Copy and save your API key</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Option B: Local (Hugging Face)</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Runs the open-source <code>vikhyatk/moondream2</code> model directly on your machine.</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                      <li>• Works offline once the ~1 GB model is downloaded (first run).</li>
                      <li>• Automatically uses GPU (CUDA) or Apple Silicon (MPS) if available.</li>
                      <li>• No API key required.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Coming Soon Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">🚀 Coming Soon</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Planned future enhancements:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• Moondream Station integration (native on-device inference for Mac/Linux)</li>
                  <li>• Additional model choices & advanced settings</li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
} 