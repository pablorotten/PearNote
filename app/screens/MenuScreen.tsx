import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Camera, CameraView } from 'expo-camera'
import { useKollection } from '../hooks/KollectionContext'
import { styles } from '../styles'

export function MenuScreen() {
  const {
    showCreateForm, setShowCreateForm,
    kollectionName, setKollectionName,
    kollectionCode, setKollectionCode,
    kollectionHistory,
    scanning, setScanning,
    scanningRef,
    startWorklet, removeFromHistory
  } = useKollection()

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
                placeholderTextColor='#C4B0B8'
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
                placeholderTextColor='#C4B0B8'
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
              <MaterialCommunityIcons name='arrow-right-bold' size={22} color='#FFFFFF' />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.qrScanBtn} onPress={async () => {
            const { granted } = await Camera.requestCameraPermissionsAsync()
            if (granted) { setScanning(true); scanningRef.current = true }
            else Alert.alert('Camera Permission Needed', 'Grant camera access in Settings to scan QR codes.')
          }}>
            <MaterialCommunityIcons name='qrcode-scan' size={24} color='#FF6B9D' />
          </TouchableOpacity>
        </View>

        {kollectionHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Your Kollections</Text>
            <View style={styles.historyList}>
              {kollectionHistory.map(entry => {
                const colors = ['#F9B2D7', '#CFECF3', '#DAF9DE', '#F6FFDC']
                let h = 0
                for (let i = 0; i < entry.id.length; i++) h = entry.id.charCodeAt(i) + ((h << 5) - h)
                const bgColor = colors[Math.abs(h) % colors.length]
                let h2 = 0
                for (let i = 0; i < entry.id.length; i++) h2 = entry.id.charCodeAt(i) + ((h2 << 7) - h2)
                const rotate = `${(Math.abs(h2) % 5) - 2}deg`
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
