import React from 'react'
import { useKollection } from './hooks/useKollection'
import { MenuScreen } from './screens/MenuScreen'
import { ListScreen } from './screens/ListScreen'

export default function App() {
  const {
    phase,
    items,
    kollectionCode, setKollectionCode,
    myCode,
    connected,
    title, setTitle,
    showAdd, setShowAdd,
    loading,
    kollectionHistory,
    kollectionName, setKollectionName,
    showCreateForm, setShowCreateForm,
    editingTitle, setEditingTitle,
    editTitleValue, setEditTitleValue,
    currentKollectionName,
    showQR, setShowQR,
    keyExpanded, setKeyExpanded,
    scanning, setScanning,
    scanningRef,
    startWorklet,
    handleAddItem,
    handleRemoveItem,
    handleLeave,
    handleDeleteKollection,
    handleRenameKollection,
    copyCode,
    removeFromHistory
  } = useKollection()

  if (phase === 'menu') {
    return (
      <MenuScreen
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        kollectionName={kollectionName}
        setKollectionName={setKollectionName}
        kollectionCode={kollectionCode}
        setKollectionCode={setKollectionCode}
        kollectionHistory={kollectionHistory}
        scanning={scanning}
        setScanning={setScanning}
        scanningRef={scanningRef}
        startWorklet={startWorklet}
        removeFromHistory={removeFromHistory}
      />
    )
  }

  return (
    <ListScreen
      items={items}
      myCode={myCode}
      connected={connected}
      loading={loading}
      title={title}
      setTitle={setTitle}
      showAdd={showAdd}
      setShowAdd={setShowAdd}
      currentKollectionName={currentKollectionName}
      editingTitle={editingTitle}
      setEditingTitle={setEditingTitle}
      editTitleValue={editTitleValue}
      setEditTitleValue={setEditTitleValue}
      showQR={showQR}
      setShowQR={setShowQR}
      keyExpanded={keyExpanded}
      setKeyExpanded={setKeyExpanded}
      handleAddItem={handleAddItem}
      handleRemoveItem={handleRemoveItem}
      handleLeave={handleLeave}
      handleDeleteKollection={handleDeleteKollection}
      handleRenameKollection={handleRenameKollection}
      copyCode={copyCode}
    />
  )
}
