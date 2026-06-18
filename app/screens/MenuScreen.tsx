import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Camera, CameraView } from 'expo-camera'
import { styles } from '../styles'
import { KollectionEntry } from '../types'

type MenuScreenProps = {
  showCreateForm: boolean
  setShowCreateForm: (v: boolean) => void
  kollectionName: string
  setKollectionName: (v: string) => void
  kollectionCode: string
  setKollectionCode: (v: string) => void
  kollectionHistory: KollectionEntry[]
  scanning: boolean
  setScanning: (v: boolean) => void
  scanningRef: React.MutableRefObject<boolean>
  startWorklet: (mode: 'create' | 'join' | 'rejoin', code?: string, name?: string) => void
  removeFromHistory: (id: string) => void
}

export function MenuScreen({
  showCreateForm, setShowCreateForm,
  kollectionName, setKollectionName,
  kollectionCode, setKollectionCode,
  kollectionHistory,
  scanning, setScanning,
  scanningRef,
  startWorklet, removeFromHistory
}: MenuScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>P2P Kollections</Text>
      <Text style={styles.subtitle}>Synced. Private. P2P.</Text>

      <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuContentInner}>
        {showCreateForm ? (
          <View style={styles.nameForm}>
            <TextInput
              style={styles.formInput}
              placeholder='Kollection name'
              placeholderTextColor='#666'
              value={kollectionName}
              onChangeText={setKollectionName}
              autoFocus
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateForm(false); setKollectionName('') }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, !kollectionName.trim() && styles.buttonDisabled]}
                onPress={() => {
                  if (!kollectionName.trim()) return
                  setShowCreateForm(false)
                  startWorklet('create', undefined, kollectionName.trim())
                  setKollectionName('')
                }}
                disabled={!kollectionName.trim()}
              >
                <Text style={styles.addBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.bigButton} onPress={() => setShowCreateForm(true)}>
            <Text style={styles.bigButtonText}>Create Kollection</Text>
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
              placeholderTextColor='#666'
              value={kollectionCode}
              onChangeText={setKollectionCode}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.joinSubmitBtn, !kollectionCode && styles.buttonDisabled]}
              onPress={() => {
                if (!kollectionCode) return
                startWorklet('join')
              }}
              disabled={!kollectionCode}
            >
              <MaterialCommunityIcons name='arrow-right-bold' size={22} color='#011501' />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.qrScanBtn} onPress={async () => {
            const { granted } = await Camera.requestCameraPermissionsAsync()
            if (granted) { setScanning(true); scanningRef.current = true }
            else Alert.alert('Camera Permission Needed', 'Grant camera access in Settings to scan QR codes.')
          }}>
            <MaterialCommunityIcons name='qrcode-scan' size={24} color='#7a9e2d' />
          </TouchableOpacity>
        </View>

        {kollectionHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Your Kollections</Text>
            <View style={styles.historyList}>
              {kollectionHistory.map(entry => (
                <View key={entry.id} style={styles.historyItem}>
                  <TouchableOpacity
                    style={styles.historyItemContent}
                    onPress={() => startWorklet('rejoin', entry.id, entry.name)}
                  >
                    <Text style={styles.historyItemText} numberOfLines={1}>{entry.name}</Text>
                    <Text style={styles.historyItemSub}>{entry.id.slice(0, 8)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyDeleteBtn}
                    onPress={() => {
                      Alert.alert(
                        'Remove Kollection',
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
              ))}
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
