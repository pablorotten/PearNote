import React from 'react'
import { NoteProvider, useNote } from './hooks/NoteContext'
import { MenuScreen } from './screens/MenuScreen'
import { ListScreen } from './screens/ListScreen'

function AppContent() {
  const { phase } = useNote()
  return phase === 'menu' ? <MenuScreen /> : <ListScreen />
}

export default function App() {
  return (
    <NoteProvider>
      <AppContent />
    </NoteProvider>
  )
}
