import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Camera, CameraView } from 'expo-camera'
import { useNote } from '../hooks/NoteContext'
import { styles } from '../styles'

export function MenuScreen() {
  const {
    showCreateForm, setShowCreateForm,
    noteName, setNoteName,
    noteCode, setNoteCode,
    noteHistory,
    scanning, setScanning,
    scanningRef,
    startWorklet, removeFromHistory
  } = useNote()

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🍐 PearNote</Text>
      <Text style={styles.subtitle}>Synced. Private. P2P.</Text>

      <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuContentInner}>
        {showCreateForm ? (
          <View style={styles.nameForm}>
            <TextInput
              style={styles.formInput}
                placeholder='Note name'
                placeholderTextColor='#90B8C8'
              value={noteName}
              onChangeText={setNoteName}
              autoFocus
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateForm(false); setNoteName('') }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, !noteName.trim() && styles.buttonDisabled]}
                onPress={() => {
                  if (!noteName.trim()) return
                  setShowCreateForm(false)
                  startWorklet('create', undefined, noteName.trim())
                  setNoteName('')
                }}
                disabled={!noteName.trim()}
              >
                <Text style={styles.addBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.bigButton} onPress={() => setShowCreateForm(true)}>
            <Text style={styles.bigButtonText}>Create Note</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.joinRow}>
          <View style={styles.joinInputGroup}>
            <TextInput
              style={styles.joinInput}
                placeholder='Paste invite code'
                placeholderTextColor='#90B8C8'
              value={noteCode}
              onChangeText={setNoteCode}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinSubmitBtn, !noteCode && styles.buttonDisabled]}
              onPress={() => {
                if (!noteCode) return
                startWorklet('join')
              }}
              disabled={!noteCode}
            >
              <MaterialCommunityIcons name='arrow-right-bold' size={22} color='#1A1A1A' />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.qrScanBtn} onPress={async () => {
            const { granted } = await Camera.requestCameraPermissionsAsync()
            if (granted) { setScanning(true); scanningRef.current = true }
            else Alert.alert('Camera Permission Needed', 'Grant camera access in Settings to scan QR codes.')
          }}>
            <MaterialCommunityIcons name='qrcode-scan' size={24} color='#7DC4DF' />
          </TouchableOpacity>
        </View>

        {noteHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Your Notes</Text>
            <View style={styles.historyList}>
              {noteHistory.map((entry, index) => {
                const colors = ['#F9B2D7', '#DAF9DE', '#F6FFDC', '#F9DFDF']
                const bgColor = colors[index % colors.length]
                const rotate = `${((index * 7 + 3) % 5) - 2}deg`
                return (
                  <View key={entry.id} style={[styles.historyItem, { backgroundColor: bgColor, transform: [{ rotate }] }]}>
                    <View style={styles.stickyPin} />
                    <TouchableOpacity
                      style={styles.historyItemContent}
                      onPress={() => startWorklet('rejoin', entry.id, entry.name)}
                    >
                      <Text style={styles.historyItemText} numberOfLines={3}>{entry.name}</Text>
                      <Text style={styles.historyItemSub}>{entry.id.slice(0, 8)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => {
                      Alert.alert(
                        'Remove Note',
                        `Remove "${entry.name}" from history?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeFromHistory(entry.id) }
                        ]
                      )
                    }}
                  >
                    <Text style={styles.historyDeleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )})}
            </View>
          </View>
        )}
      </ScrollView>

      {scanning && (
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={({ data }) => {
              if (!data || !scanningRef.current) return
              scanningRef.current = false
              setScanning(false)
              startWorklet('join', data)
            }}
          />
          <View style={styles.scannerOverlay}>
            <TouchableOpacity style={styles.scannerCloseBtn} onPress={() => { scanningRef.current = false; setScanning(false) }}>
              <Text style={styles.scannerCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
