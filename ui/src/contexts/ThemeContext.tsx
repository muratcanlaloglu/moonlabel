import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-core'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Load theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('moonlabel_theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('moonlabel_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Note: useTheme is exported from a separate file to satisfy
// react-refresh/only-export-components.
