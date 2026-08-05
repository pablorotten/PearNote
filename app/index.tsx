import React from 'react'
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p'
import { NoteProvider, useNote } from './hooks/NoteContext'
import { MenuScreen } from './screens/MenuScreen'
import { ListScreen } from './screens/ListScreen'

function AppContent() {
  const { phase } = useNote()
  return phase === 'menu' ? <MenuScreen /> : <ListScreen />
}

export default function App() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular })
  if (!fontsLoaded) return null
  return (
    <NoteProvider>
      <AppContent />
    </NoteProvider>
  )
}
