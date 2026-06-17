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
  BackHandler
} from 'react-native'
import { documentDirectory, writeAsStringAsync, readAsStringAsync } from 'expo-file-system/legacy'
import Clipboard from '@react-native-clipboard/clipboard'
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
  RPC_ERROR
} from '../rpc-commands.mjs'

type Item = {
  key: string
  value: [string, string]
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
      <Text style={styles.loadingText}>Loading list...</Text>
    </View>
  )
}

export default function App() {
  const [phase, setPhase] = useState<'menu' | 'list'>('menu')
  const [items, setItems] = useState<Item[]>([])
  const [listCode, setListCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [title, setTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [rpc, setRpc] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [listHistory, setListHistory] = useState<string[]>([])
  const workletRef = useRef<any>(null)
  const savedCodes = useRef<Set<string>>(new Set())
  const historyPath = documentDirectory + '/list-history.json'

  useEffect(() => {
    ;(async () => {
      try {
        const data = await readAsStringAsync(historyPath)
        const codes: string[] = JSON.parse(data)
        codes.forEach(c => savedCodes.current.add(c))
        setListHistory(codes)
      } catch (_) {}
    })()
  }, [])

  async function saveToHistory(code: string) {
    if (savedCodes.current.has(code)) return
    savedCodes.current.add(code)
    const updated = [code, ...listHistory]
    setListHistory(updated)
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  async function removeFromHistory(code: string) {
    savedCodes.current.delete(code)
    const updated = listHistory.filter(c => c !== code)
    setListHistory(updated)
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
    setListCode('')
    setLoading(false)
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

  function startWorklet(mode: 'create' | 'join' | 'rejoin', code?: string) {
    console.log('startWorklet mode=' + mode + ' code=' + (code || '(none)') + ' listCode=' + listCode)
    const listId = code || (mode === 'join' ? listCode : '')
    const worklet = new Worklet()
    workletRef.current = worklet
    
    // Args: [documentDirectory, mode, listId?]
    const args = mode === 'create'
      ? [String(documentDirectory), 'create']
      : [String(documentDirectory), mode, listId]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    setLoading(true)

    const rpcInstance = new RPC(IPC, (req) => {
      if (req.command === RPC_MY_INVITE) {
        // Format: storageId|invite
        const data = b4a.toString(req.data)
        const [storageId, invite] = data.split('|')
        setMyCode(invite)
        // Save storageId to history for rejoin
        saveToHistory(storageId)
        if (mode === 'create') {
          Alert.alert('List Created!', `Share this invite code:\n${invite}`, [
            { text: 'Copy', onPress: () => Clipboard.setString(invite) }
          ])
        }
      }

      if (req.command === RPC_RESET) {
        const data = JSON.parse(b4a.toString(req.data))
        setItems(data)
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

  function handleDeleteList() {
    if (!myCode) return
    Alert.alert(
      'Delete List',
      `Are you sure you want to leave the list ${myCode}?`,
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
      Alert.alert('Copied!', `List code ${myCode} copied to clipboard`)
    }
  }

  if (phase === 'menu') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>P2P Kollections</Text>
        <Text style={styles.subtitle}>P2P List Sharing</Text>

        <ScrollView style={styles.menuContent} contentContainerStyle={styles.menuContentInner}>
          <TouchableOpacity style={styles.bigButton} onPress={() => startWorklet('create')}>
            <Text style={styles.bigButtonText}>Create List</Text>
            <Text style={styles.bigButtonSub}>Generate a new list code</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder='Paste invite code'
            placeholderTextColor='#666'
            value={listCode}
            onChangeText={setListCode}
            autoCapitalize='none'
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.bigButton, !listCode && styles.buttonDisabled]}
            onPress={() => {
              if (!listCode) return
              Alert.alert(
                'Join List',
                `Connect to list with code: ${listCode}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Join', onPress: () => startWorklet('join') }
                ]
              )
            }}
            disabled={!listCode}
          >
            <Text style={styles.bigButtonText}>Join List</Text>
            <Text style={styles.bigButtonSub}>Connect to an existing list</Text>
          </TouchableOpacity>

          {listHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Your Lists</Text>
              <View style={styles.historyList}>
                {listHistory.map(storageId => (
                  <View key={storageId} style={styles.historyItem}>
                    <TouchableOpacity
                      style={styles.historyItemContent}
                      onPress={() => startWorklet('rejoin', storageId)}
                    >
                      <Text style={styles.historyItemText}>List {storageId}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => {
                        Alert.alert(
                          'Remove List',
                          `Remove this list from history?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => removeFromHistory(storageId) }
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
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior='padding'
      keyboardVerticalOffset={Platform.OS === 'android' ? StatusBar.currentHeight : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={[styles.backBtn, loading && styles.buttonDisabled]}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>P2P Kollections</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, connected && styles.statusDotOn]} />
          <Text style={styles.statusText}>{connected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        {myCode ? (
          <TouchableOpacity onPress={copyCode} style={styles.codeBadge}>
            <Text style={styles.codeLabel}>List:</Text>
            <Text style={styles.codeValue}>{myCode}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={handleDeleteList} style={styles.deleteListBtn}>
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
    marginTop: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#7a9e2d',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 40
  },
  menuContent: {
    flex: 1
  },
  menuContentInner: {
    justifyContent: 'center',
    gap: 15
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
    flex: 1,
    color: '#b0d943',
    fontSize: 16,
    fontWeight: 'bold'
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
    padding: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b0d943',
    marginBottom: 5
  },
  bigButtonSub: {
    fontSize: 14,
    color: '#7a9e2d'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10
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
  input: {
    height: 50,
    borderColor: '#b0d943',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#b0d943',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#1a3d0a'
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
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a3d0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b0d943',
    gap: 6
  },
  codeLabel: {
    color: '#7a9e2d',
    fontSize: 12
  },
  codeValue: {
    color: '#b0d943',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2
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
