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
  RPC_CLEAR_DONE,
  RPC_DIAG,
  RPC_ERROR,
  RPC_SET_NAME
} from '../../rpc-commands.mjs'
import { Item, NoteEntry } from '../types'

export function useNoteLogic() {
  const [phase, setPhase] = useState<'menu' | 'list'>('menu')
  const [items, setItems] = useState<Item[]>([])
  const [noteCode, setNoteCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [title, setTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [rpc, setRpc] = useState<RPC | null>(null)
  const [loading, setLoading] = useState(false)
  const [noteHistory, setNoteHistory] = useState<NoteEntry[]>([])
  const [noteName, setNoteName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [currentNoteName, setCurrentNoteName] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [keyExpanded, setKeyExpanded] = useState(false)
  const [scanning, setScanning] = useState(false)
  const scanningRef = useRef(false)
  const workletRef = useRef<Worklet | null>(null)
  const savedCodes = useRef<Set<string>>(new Set())
  const historyPath = documentDirectory + '/note-history.json'
  const noteHistoryRef = useRef(noteHistory)
  const sessionStorageIdRef = useRef<string | null>(null)

  useEffect(() => {
    noteHistoryRef.current = noteHistory
  }, [noteHistory])

  useEffect(() => {
    ;(async () => {
      try {
        const data = await readAsStringAsync(historyPath)
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          const entries: NoteEntry[] = parsed.map((id: string) => ({ id, name: 'Unnamed Note' }))
          entries.forEach(e => savedCodes.current.add(e.id))
          setNoteHistory(entries)
        } else {
          const entries: NoteEntry[] = parsed
          entries.forEach(e => savedCodes.current.add(e.id))
          setNoteHistory(entries)
        }
      } catch (_) {}
    })()
  }, [])

  async function saveToHistory(id: string, name: string) {
    if (savedCodes.current.has(id)) return
    savedCodes.current.add(id)
    const entry: NoteEntry = { id, name }
    const current = noteHistoryRef.current
    const updated = [entry, ...current]
    setNoteHistory(updated)
    noteHistoryRef.current = updated
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  async function removeFromHistory(id: string) {
    savedCodes.current.delete(id)
    const current = noteHistoryRef.current
    const updated = current.filter(e => e.id !== id)
    setNoteHistory(updated)
    noteHistoryRef.current = updated
    await writeAsStringAsync(historyPath, JSON.stringify(updated))
  }

  async function updateHistoryName(id: string, syncedName: string) {
    const current = noteHistoryRef.current
    const idx = current.findIndex(e => e.id === id)
    if (idx === -1) return
    const entry = current[idx]
    if (entry.name === syncedName) return
    const updated = current.map((e, i) => i === idx ? { ...e, name: syncedName } : e)
    setNoteHistory(updated)
    noteHistoryRef.current = updated
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
    setNoteCode('')
    setLoading(false)
    setCurrentNoteName('')
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
    const noteId = code || (mode === 'join' ? noteCode : '')
    if (name) setCurrentNoteName(name)
    const worklet = new Worklet()
    workletRef.current = worklet

    const args = mode === 'create'
      ? [String(documentDirectory), 'create']
      : [String(documentDirectory), mode, noteId]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    setLoading(true)

    const rpcInstance = new RPC(IPC, (req) => {
      if (req.command === RPC_MY_INVITE) {
        const data = b4a.toString(req.data)
        const [storageId, invite] = data.split('|')
        sessionStorageIdRef.current = storageId
        setMyCode(invite)
        if (mode === 'create' && name) {
          setCurrentNoteName(name)
          saveToHistory(storageId, name)
          const nameReq = rpcInstance.request(RPC_SET_NAME)
          nameReq.send(name)
        } else if (mode === 'rejoin') {
          const existing = noteHistoryRef.current.find(e => e.id === storageId)
          setCurrentNoteName(existing ? existing.name : storageId)
          saveToHistory(storageId, existing ? existing.name : storageId)
        } else {
          setCurrentNoteName(storageId)
          saveToHistory(storageId, storageId)
        }
        if (mode === 'create') {
          Alert.alert('Note Created!', `Share this code:\n${invite}`, [
            { text: 'Copy Code', onPress: () => Clipboard.setString(invite) }
          ])
        }
      }

      if (req.command === RPC_RESET) {
        const data: Item[] = JSON.parse(b4a.toString(req.data))
        const nameEntry = data.find((d) => d.key === '_note_name')
        if (nameEntry && sessionStorageIdRef.current) {
          setCurrentNoteName(nameEntry.value[1])
          updateHistoryName(sessionStorageIdRef.current, nameEntry.value[1])
        }
        setItems(data.filter((d) => d.key !== '_note_name'))
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

      if (req.command === RPC_CLEAR_DONE) {
        handleLeave()
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

  function handleDeleteNote() {
    if (!myCode) return
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete the note ${myCode}?`,
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
            removeFromHistory(myCode)
            handleLeave()
          }
        }
      ]
    )
  }

  function handleRenameNote(name: string) {
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
    noteCode,
    setNoteCode,
    myCode,
    connected,
    title,
    setTitle,
    showAdd,
    setShowAdd,
    loading,
    noteHistory,
    noteName,
    setNoteName,
    showCreateForm,
    setShowCreateForm,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    currentNoteName,
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
    handleDeleteNote,
    handleRenameNote,
    copyCode,
    removeFromHistory
  }
}
