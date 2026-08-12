import { createContext, useContext } from 'react'

export const FieldContext = createContext(null)

export function useFieldContext() {
  const ctx = useContext(FieldContext)
  if (!ctx) {
    throw new Error('useFieldContext must be used within a FieldContext.Provider')
  }
  return ctx
}
