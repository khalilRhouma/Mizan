import { createContext, useContext } from 'react'

export const ThemeContext = createContext('light')

export function useTheme() {
  return useContext(ThemeContext)
}

export function useIsDark() {
  return useTheme() === 'dark'
}
