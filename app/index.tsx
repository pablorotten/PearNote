import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  BackHandler,
  Modal
} from 'react-native'
import { documentDirectory, writeAsStringAsync, readAsStringAsync } from 'expo-file-system/legacy'
import Clipboard from '@react-native-clipboard/clipboard'
import { Camera, CameraView } from 'expo-camera'
import QRCode from 'react-native-qrcode-svg'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Worklet } from 'react-native-bare-kit'
import bundle from './app.bundle.mjs'
import RPC from 'bare-rpc'
import b4a from 'b4a'
import {
  RPC_ADD,
  RPC_REMOVE,
  RPC_RESET,
  RPC_MY_INVITE,
  RPC_PEER_JOINED,
  RPC_PEER_LEFT,
  RPC_CLEAR,
  RPC_DIAG,
  RPC_ERROR,
  RPC_SET_NAME
} from '../rpc-commands.mjs'

type Item = {
  key: string
  value: [string, string]
}

type KollectionEntry = {
  id: string
  name: string
}

function LoadingSpinner() {
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      })
    )
    loop.start()
    return () => loop.stop()
  }, [])
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })
  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
      <Text style={styles.loadingText}>Loading kollection...</Text>
    </View>
  )
}

export default function App() {
  const [phase, setPhase] = useState<'menu' | 'list'>('menu')
  const [items, setItems] = useState<Item[]>([])
  const [kollectionCode, setKollectionCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [title, setTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [rpc, setRpc] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [kollectionHistory, setKollectionHistory] = useState<KollectionEntry[]>([])
  const [kollectionName, setKollectionName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [currentKollectionName, setCurrentKollectionName] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [scanning, setScanning] = useState(false)
  const scanningRef = useRef(false)
  const workletRef = useRef<any>(null)
  const savedCodes = useRef<Set<string>>(new Set())
  const historyPath = documentDirectory + '/kollection-history.json'

  useEffect(() => {
    ;(async () => {
      try {
        const data = await readAsStringAsync(historyPath)
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          const entries: KollectionEntry[] = parsed.map((id: string) => ({ id, name: 'Unnamed Kollection' }))
          entries.forEach(e => savedCodes.current.add(e.id))
          setKollectionHistory(entries)
        } else {
          const entries: KollectionEntry[] = parsed
          entries.forEach(e => savedCodes.current.add(e.id))
          setKollectionHistory(entries)
        }
      } catch (_) {}
    })()
  }, [])

  async function saveToHistory(id: string, name: string) {
    if (savedCodes.current.has(id)) return
    savedCodes.current.add(id)
    const entry: KollectionEntry = { id, name }
    const updated = [entry, ...kollectionHistory]
    setKollectionHistory(updated)
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  async function removeFromHistory(id: string) {
    savedCodes.current.delete(id)
    const updated = kollectionHistory.filter(e => e.id !== id)
    setKollectionHistory(updated)
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  async function updateHistoryName(syncedName: string) {
    const lastEntry = kollectionHistory[0]
    if (!lastEntry || lastEntry.name === syncedName) return
    const updated = [{ ...lastEntry, name: syncedName }, ...kollectionHistory.slice(1)]
    setKollectionHistory(updated)
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  function handleLeave() {
    try { workletRef.current?.terminate?.() } catch (_) {}
    setPhase('menu')
    setItems([])
    setMyCode('')
    setConnected(false)
    setTitle('')
    setShowAdd(false)
    setRpc(null)
    setKollectionCode('')
    setLoading(false)
    setCurrentKollectionName('')
  }

  useEffect(() => {
    if (phase !== 'list') return
    const onBack = () => {
      handleLeave()
      return true
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
    return () => sub.remove()
  }, [phase])

  function startWorklet(mode: 'create' | 'join' | 'rejoin', code?: string, name?: string) {
    console.log('startWorklet mode=' + mode + ' code=' + (code || '(none)') + ' kollectionCode=' + kollectionCode)
    const kollectionId = code || (mode === 'join' ? kollectionCode : '')
    if (name) setCurrentKollectionName(name)
    const worklet = new Worklet()
    workletRef.current = worklet
    
    // Args: [documentDirectory, mode, kollectionId?]
    const args = mode === 'create'
      ? [String(documentDirectory), 'create']
      : [String(documentDirectory), mode, kollectionId]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    setLoading(true)

    const rpcInstance = new RPC(IPC, (req) => {
      if (req.command === RPC_MY_INVITE) {
        // Format: storageId|invite
        const data = b4a.toString(req.data)
        const [storageId, invite] = data.split('|')
        setMyCode(invite)
        if (mode === 'create' && name) {
          setCurrentKollectionName(name)
          saveToHistory(storageId, name)
          const nameReq = rpcInstance.request(RPC_SET_NAME)
          nameReq.send(name)
        } else if (mode === 'rejoin') {
          const existing = kollectionHistory.find(e => e.id === storageId)
          setCurrentKollectionName(existing ? existing.name : storageId)
          saveToHistory(storageId, existing ? existing.name : storageId)
        } else {
          setCurrentKollectionName(storageId)
          saveToHistory(storageId, storageId)
        }
        if (mode === 'create') {
          Alert.alert('Kollection Created!', `Share this code:\n${invite}`, [
            { text: 'Copy Code', onPress: () => Clipboard.setString(invite) }
          ])
        }
      }

      if (req.command === RPC_RESET) {
        const data = JSON.parse(b4a.toString(req.data))
        const nameEntry = data.find((d: any) => d.key === '_kollection_name')
        if (nameEntry) {
          setCurrentKollectionName(nameEntry.value[1])
          updateHistoryName(nameEntry.value[1])
        }
        setItems(data.filter((d: any) => d.key !== '_kollection_name'))
        setLoading(false)
      }

      if (req.command === RPC_PEER_JOINED) {
        setConnected(true)
      }

      if (req.command === RPC_PEER_LEFT) {
        setConnected(false)
      }

      if (req.command === RPC_DIAG) {
        console.log('BARE_DIAG: ' + b4a.toString(req.data))
      }

      if (req.command === RPC_ERROR) {
        const msg = b4a.toString(req.data)
        console.log('BARE_ERROR: ' + msg)
        setLoading(false)
        Alert.alert('Error', msg)
      }
    })

    setRpc(rpcInstance)
    setPhase('list')
  }

  function handleAddItem() {
    if (!title.trim()) return
    const item: [string, string] = ['item', title.trim()]
    if (rpc) {
      const req = rpc.request(RPC_ADD)
      req.send(JSON.stringify(item))
    }
    setTitle('')
    setShowAdd(false)
  }

  function handleRemoveItem(key: string) {
    if (rpc) {
      const req = rpc.request(RPC_REMOVE)
      req.send(key)
    }
  }

  function handleDeleteKollection() {
    if (!myCode) return
    Alert.alert(
      'Delete Kollection',
      `Are you sure you want to leave the kollection ${myCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (rpc) {
              const req = rpc.request(RPC_CLEAR)
              req.send('')
            }
            handleLeave()
          }
        }
      ]
    )
  }

  function copyCode() {
    if (myCode) {
      Clipboard.setString(myCode)
      Alert.alert('Copied!', `Invite code ${myCode} copied to clipboard`)
    }
  }

  return (
    <>
      {phase === 'menu' ? (
        <View style={styles.container}>
          <Text style={styles.heading}>P2P Kollections</Text>
          <Text style={styles.subtitle}>P2P Kollection Sharing</Text>

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
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior='padding'
          keyboardVerticalOffset={Platform.OS === 'android' ? StatusBar.currentHeight : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLeave} style={[styles.backBtn, loading && styles.buttonDisabled]}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            {editingTitle ? (
              <TextInput
                style={styles.titleInput}
                value={editTitleValue}
                onChangeText={setEditTitleValue}
                onSubmitEditing={() => {
                  const val = editTitleValue.trim()
                  if (val && rpc) {
                    const req = rpc.request(RPC_SET_NAME)
                    req.send(val)
                  }
                  setEditingTitle(false)
                }}
                onBlur={() => setEditingTitle(false)}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <TouchableOpacity onLongPress={() => { setEditTitleValue(currentKollectionName); setEditingTitle(true) }}>
                <Text style={styles.heading}>{currentKollectionName || 'P2P Kollections'}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, connected && styles.statusDotOn]} />
              <Text style={styles.statusText}>{connected ? 'Connected' : 'Disconnected'}</Text>
            </View>
            {myCode ? (
              <View style={styles.shareSection}>
                <TouchableOpacity onPress={() => setKeyExpanded(!keyExpanded)} style={styles.codeRow}>
                  <Text
                    style={styles.codeValue}
                    numberOfLines={keyExpanded ? undefined : 1}
                    ellipsizeMode='tail'
                  >
                    {myCode}
                  </Text>
                </TouchableOpacity>
                <View style={styles.shareActions}>
                  <TouchableOpacity onPress={copyCode} style={styles.copyBtn}>
                    <Text style={styles.copyBtnText}>Copy key</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowQR(true)} style={styles.qrBtn}>
                    <MaterialCommunityIcons name='qrcode' size={20} color='#011501' />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            <TouchableOpacity onPress={handleDeleteKollection} style={styles.deleteListBtn}>
              <Text style={styles.deleteListBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <FlatList
                data={items}
                keyExtractor={(item) => item.key}
                style={styles.list}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No items yet. Tap + to add one.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.value[1]}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemoveItem(item.key)}
                    >
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              {showAdd ? (
                <View style={styles.addForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder='Title'
                    placeholderTextColor='#666'
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addBtn, !title.trim() && styles.buttonDisabled]}
                      onPress={handleAddItem}
                      disabled={!title.trim()}
                    >
                      <Text style={styles.addBtnText}>Add Item</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
                  <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      )}

      {showQR && myCode && (
        <Modal visible={showQR} transparent animationType='fade' onRequestClose={() => setShowQR(false)}>
          <View style={styles.qrOverlay}>
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>Scan to join</Text>
              <QRCode value={myCode} size={220} backgroundColor='#fff' color='#000' />
              <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowQR(false)}>
                <Text style={styles.qrCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

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
    </>
  )
}

function QRCodeModal({ visible, code, onClose }: { visible: boolean, code: string, onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <View style={styles.qrOverlay}>
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Scan to join</Text>
          <QRCode value={code} size={220} backgroundColor='#fff' color='#000' />
          <TouchableOpacity style={styles.qrCloseBtn} onPress={onClose}>
            <Text style={styles.qrCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#011501',
    padding: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 0) + 20,
    paddingBottom: Platform.OS === 'android' ? 60 : 20
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#b0d943',
    textAlign: 'center',
    marginTop: 5
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#b0d943',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#b0d943',
    paddingVertical: 2,
    marginHorizontal: 40,
    marginTop: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#7a9e2d',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 25
  },
  menuContent: {
    flex: 1
  },
  menuContentInner: {
    justifyContent: 'center',
    gap: 12
  },
  historySection: {
    marginTop: 20
  },
  historyTitle: {
    color: '#7a9e2d',
    fontSize: 14,
    marginBottom: 8
  },
  historyList: {
    gap: 6
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3d0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a5a0a'
  },
  historyItemContent: {
    flex: 1,
    paddingLeft: 14,
    paddingVertical: 4
  },
  historyItemText: {
    color: '#b0d943',
    fontSize: 16,
    fontWeight: 'bold'
  },
  historyItemSub: {
    color: '#7a9e2d',
    fontSize: 12,
    marginTop: 2
  },
  historyDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a0a0a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  historyDeleteBtnText: {
    color: '#d94b4b',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16
  },
  bigButton: {
    backgroundColor: '#1a3d0a',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#b0d943',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: '#555'
  },
  bigButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b0d943'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333'
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
    fontSize: 14
  },
  joinRow: {
    flexDirection: 'row',
    gap: 10
  },
  joinInputGroup: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a3d0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b0d943',
    overflow: 'hidden'
  },
  joinInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    color: '#b0d943',
    fontSize: 15
  },
  joinSubmitBtn: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#b0d943'
  },
  qrScanBtn: {
    width: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7a9e2d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 15,
    alignItems: 'center'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#555'
  },
  statusDotOn: {
    backgroundColor: '#b0d943'
  },
  statusText: {
    color: '#7a9e2d',
    fontSize: 14
  },
  deleteListBtn: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a0a0a',
    borderWidth: 1,
    borderColor: '#d94b4b',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  deleteListBtnText: {
    color: '#d94b4b',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a3d0a',
    borderWidth: 1,
    borderColor: '#b0d943',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  backBtnText: {
    color: '#b0d943',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: 'bold'
  },
  shareSection: {
    alignSelf: 'stretch',
    marginTop: 10,
    gap: 8
  },
  codeRow: {
    backgroundColor: '#1a3d0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b0d943',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  codeValue: {
    color: '#b0d943',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined
  },
  shareActions: {
    flexDirection: 'row',
    gap: 10
  },
  copyBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#b0d943',
    borderRadius: 8,
    alignItems: 'center'
  },
  copyBtnText: {
    color: '#011501',
    fontSize: 14,
    fontWeight: 'bold'
  },
  qrBtn: {
    width: 42,
    borderRadius: 8,
    backgroundColor: '#b0d943',
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#1a3d0a',
    borderTopColor: '#b0d943'
  },
  loadingText: {
    color: '#7a9e2d',
    fontSize: 15
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3d0a',
    padding: 14,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a5a0a'
  },
  itemInfo: {
    flex: 1
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#b0d943'
  },

  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  deleteBtnText: {
    color: '#d94b4b',
    fontSize: 14,
    fontWeight: 'bold'
  },
  nameForm: {
    backgroundColor: '#1a3d0a',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b0d943',
    gap: 10
  },
  addForm: {
    backgroundColor: '#1a3d0a',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b0d943',
    gap: 10
  },
  formInput: {
    height: 44,
    borderColor: '#b0d943',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#b0d943',
    backgroundColor: '#0f2a05'
  },

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  cancelBtnText: {
    color: '#7a9e2d',
    fontSize: 15
  },
  addBtn: {
    backgroundColor: '#b0d943',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  addBtnText: {
    color: '#011501',
    fontWeight: 'bold',
    fontSize: 15
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 20
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#011501'
  },
  qrCloseBtn: {
    backgroundColor: '#b0d943',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8
  },
  qrCloseBtnText: {
    color: '#011501',
    fontWeight: 'bold',
    fontSize: 15
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 60
  },
  scannerCloseBtn: {
    backgroundColor: '#d94b4b',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  scannerCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 70 : 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b0d943',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  fabText: {
    color: '#011501',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30
  },
})
