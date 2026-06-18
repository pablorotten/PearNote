import React from 'react'
import { KollectionProvider, useKollection } from './hooks/KollectionContext'
import { MenuScreen } from './screens/MenuScreen'
import { ListScreen } from './screens/ListScreen'

function AppContent() {
  const { phase } = useKollection()
  return phase === 'menu' ? <MenuScreen /> : <ListScreen />
}

export default function App() {
  return (
    <KollectionProvider>
      <AppContent />
    </KollectionProvider>
  )
}
