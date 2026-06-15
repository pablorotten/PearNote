import React, { useState } from 'react'
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
  StatusBar
} from 'react-native'
import { documentDirectory } from 'expo-file-system/legacy'
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
  RPC_PEER_LEFT
} from '../rpc-commands.mjs'

type Movie = {
  key: string
  value: [string, string]
}

export default function App() {
  const [phase, setPhase] = useState<'menu' | 'list'>('menu')
  const [movies, setMovies] = useState<Movie[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [myCode, setMyCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [title, setTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [rpc, setRpc] = useState<any>(null)
  function startWorklet(mode: 'create' | 'join') {
    const worklet = new Worklet()
    const args = mode === 'create'
      ? [String(documentDirectory)]
      : [String(documentDirectory), roomCode]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    const rpcInstance = new RPC(IPC, (req) => {
      if (req.command === RPC_MY_INVITE) {
        const code = b4a.toString(req.data)
        setMyCode(code)
        Alert.alert('Room Created!', `Share this code: ${code}`, [
          { text: 'Copy', onPress: () => Clipboard.setString(code) }
        ])
      }

      if (req.command === RPC_RESET) {
        const data = JSON.parse(b4a.toString(req.data))
        setMovies(data)
      }

      if (req.command === RPC_PEER_JOINED) {
        setConnected(true)
      }

      if (req.command === RPC_PEER_LEFT) {
        setConnected(false)
      }
    })

    setRpc(rpcInstance)
    setPhase('list')
  }

  function handleAddMovie() {
    if (!title.trim()) return
    const movie: [string, string] = ['movie', title.trim()]
    if (rpc) {
      const req = rpc.request(RPC_ADD)
      req.send(JSON.stringify(movie))
    }
    setTitle('')
    setShowAdd(false)
  }

  function handleRemoveMovie(key: string) {
    if (rpc) {
      const req = rpc.request(RPC_REMOVE)
      req.send(key)
    }
  }

  function copyCode() {
    if (myCode) {
      Clipboard.setString(myCode)
      Alert.alert('Copied!', `Room code ${myCode} copied to clipboard`)
    }
  }

  if (phase === 'menu') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>MovieKollections</Text>
        <Text style={styles.subtitle}>P2P Movie List Sharing</Text>

        <View style={styles.menuContent}>
          <TouchableOpacity style={styles.bigButton} onPress={() => startWorklet('create')}>
            <Text style={styles.bigButtonText}>Create Room</Text>
            <Text style={styles.bigButtonSub}>Generate a new room code</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder='Enter room code'
            placeholderTextColor='#666'
            value={roomCode}
            onChangeText={setRoomCode}
            keyboardType='number-pad'
          />
          <TouchableOpacity
            style={[styles.bigButton, !roomCode && styles.buttonDisabled]}
            onPress={() => roomCode && startWorklet('join')}
            disabled={!roomCode}
          >
            <Text style={styles.bigButtonText}>Join Room</Text>
            <Text style={styles.bigButtonSub}>Connect to an existing room</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>MovieKollections</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, connected && styles.statusDotOn]} />
          <Text style={styles.statusText}>{connected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        {myCode ? (
          <TouchableOpacity onPress={copyCode} style={styles.codeBadge}>
            <Text style={styles.codeLabel}>Room:</Text>
            <Text style={styles.codeValue}>{myCode}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={movies}
        keyExtractor={(item) => item.key}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No movies yet. Tap + to add one.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.movieItem}>
            <View style={styles.movieInfo}>
              <Text style={styles.movieTitle}>{item.value[1]}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleRemoveMovie(item.key)}
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
            placeholder='Movie title'
            placeholderTextColor='#666'
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.buttonDisabled]}
              onPress={handleAddMovie}
              disabled={!title.trim()}
            >
              <Text style={styles.addBtnText}>Add Movie</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
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
    flex: 1,
    justifyContent: 'center',
    gap: 15
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
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16
  },
  movieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3d0a',
    padding: 14,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a5a0a'
  },
  movieInfo: {
    flex: 1
  },
  movieTitle: {
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
