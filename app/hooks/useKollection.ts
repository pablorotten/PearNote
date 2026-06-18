import { useState, useRef, useEffect } from 'react'
import { Alert, BackHandler } from 'react-native'
import { documentDirectory, writeAsStringAsync, readAsStringAsync } from 'expo-file-system/legacy'
import Clipboard from '@react-native-clipboard/clipboard'
import { Worklet } from 'react-native-bare-kit'
import bundle from '../app.bundle.mjs'
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
} from '../../rpc-commands.mjs'
import { Item, KollectionEntry } from '../types'

export function useKollectionLogic() {
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
    const kollectionId = code || (mode === 'join' ? kollectionCode : '')
    if (name) setCurrentKollectionName(name)
    const worklet = new Worklet()
    workletRef.current = worklet

    const args = mode === 'create'
      ? [String(documentDirectory), 'create']
      : [String(documentDirectory), mode, kollectionId]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    setLoading(true)

    const rpcInstance = new RPC(IPC, (req) => {
      if (req.command === RPC_MY_INVITE) {
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

  function handleRenameKollection(name: string) {
    if (rpc) {
      const req = rpc.request(RPC_SET_NAME)
      req.send(name)
    }
  }

  function copyCode() {
    if (myCode) {
      Clipboard.setString(myCode)
      Alert.alert('Copied!', `Invite code ${myCode} copied to clipboard`)
    }
  }

  return {
    phase,
    items,
    kollectionCode,
    setKollectionCode,
    myCode,
    connected,
    title,
    setTitle,
    showAdd,
    setShowAdd,
    loading,
    kollectionHistory,
    kollectionName,
    setKollectionName,
    showCreateForm,
    setShowCreateForm,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    currentKollectionName,
    showQR,
    setShowQR,
    keyExpanded,
    setKeyExpanded,
    scanning,
    setScanning,
    scanningRef,
    startWorklet,
    handleAddItem,
    handleRemoveItem,
    handleLeave,
    handleDeleteKollection,
    handleRenameKollection,
    copyCode,
    removeFromHistory
  }
}
