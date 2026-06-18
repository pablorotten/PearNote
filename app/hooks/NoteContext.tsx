import React, { createContext, useContext } from 'react'
import { useNoteLogic } from './useNote'

const NoteContext = createContext<ReturnType<typeof useNoteLogic> | null>(null)

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const value = useNoteLogic()
  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  )
}

export function useNote() {
  const ctx = useContext(NoteContext)
  if (!ctx) throw new Error('useNote must be used within NoteProvider')
  return ctx
}
