import React, { createContext, useContext } from 'react'
import { useKollectionLogic } from './useKollection'

const KollectionContext = createContext<ReturnType<typeof useKollectionLogic> | null>(null)

export function KollectionProvider({ children }: { children: React.ReactNode }) {
  const value = useKollectionLogic()
  return (
    <KollectionContext.Provider value={value}>
      {children}
    </KollectionContext.Provider>
  )
}

export function useKollection() {
  const ctx = useContext(KollectionContext)
  if (!ctx) throw new Error('useKollection must be used within KollectionProvider')
  return ctx
}
