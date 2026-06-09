import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  StyleSheet,
  TouchableOpacity
} from 'react-native'
import { documentDirectory } from 'expo-file-system'
import Clipboard from '@react-native-clipboard/clipboard'
import { Worklet } from 'react-native-bare-kit'
import bundle from './app.bundle.mjs'
import RPC from 'bare-rpc'
import b4a from 'b4a'
import { RPC_MESSAGE, RPC_CONNECTED, RPC_DISCONNECTED, RPC_ROOM_CODE } from '../rpc-commands.mjs'

type Message = {
  from: 'me' | 'peer'
  text: string
  timestamp: number
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [roomCode, setRoomCode] = useState('') 
  const [generatedRoomCode, setGeneratedRoomCode] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [rpcInstance, setRpcInstance] = useState<any>(null)

  const startWorklet = (workletMode: 'create' | 'join') => {
    const worklet = new Worklet()

    // Pass mode and room code (if joining) to backend
    const args = workletMode === 'create' 
      ? [String(documentDirectory), 'create']
      : [String(documentDirectory), 'join', roomCode]

    worklet.start('/app.bundle', bundle, args)
    const { IPC } = worklet

    // Initialize RPC
    const rpc = new RPC(IPC, (req) => {
      // Handle incoming RPC requests from backend

      if (req.command === RPC_ROOM_CODE) {
        // Received room code from backend (create mode)
        const code = b4a.toString(req.data)
        setGeneratedRoomCode(code)
        Alert.alert('Room Created!', `Share this code: ${code}`, [
          { text: 'Copy Code', onPress: () => Clipboard.setString(code) }
        ])
      }

      if (req.command === RPC_CONNECTED) {
        // Peer connected
        setIsConnected(true)
        Alert.alert('Connected!', 'A peer has joined the room')
      }

      if (req.command === RPC_DISCONNECTED) {
        // Peer disconnected
        setIsConnected(false)
        Alert.alert('Disconnected', 'Peer has left the room')
      }

      if (req.command === RPC_MESSAGE) {
        // Received message from peer
        const data = b4a.toString(req.data)
        const parsedData = JSON.parse(data)
        const newMessage: Message = {
          from: parsedData.from,
          text: parsedData.text,
          timestamp: parsedData.timestamp
        }
        setMessages((prevMessages) => [...prevMessages, newMessage])
      }
    })

    setRpcInstance(rpc)
    setMode(workletMode)
  }

  const sendMessage = () => {
    if (!messageInput.trim()) return

    // Add message to local list
    const newMessage: Message = {
      from: 'me',
      text: messageInput,
      timestamp: Date.now()
    }
    setMessages((prev) => [...prev, newMessage])

    // Send to backend for broadcasting
    if (rpcInstance) {
      const req = rpcInstance.request(RPC_MESSAGE)
      req.send(messageInput)
    }

    setMessageInput('')
  }

  const copyRoomCode = () => {
    if (generatedRoomCode) {
      Clipboard.setString(generatedRoomCode)
      Alert.alert('Copied!', `Room code ${generatedRoomCode} copied to clipboard`)
    }
  }

  // Mode selection screen
  if (mode === 'select') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Phone-to-Phone Messaging 🍐</Text>
        <Text style={styles.subtitle}>Powered by Hyperswarm P2P</Text>
        
        <View style={styles.modeContainer}>
          <TouchableOpacity 
            style={styles.modeButton} 
            onPress={() => startWorklet('create')}
          >
            <Text style={styles.modeButtonText}>Create Room</Text>
            <Text style={styles.modeButtonSubtext}>Start a new conversation</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.joinContainer}>
            <TextInput
              style={styles.input}
              placeholder='Enter Room Code'
              placeholderTextColor='#666'
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize='characters'
              maxLength={12}
            />
            <TouchableOpacity 
              style={[styles.modeButton, !roomCode && styles.modeButtonDisabled]} 
              onPress={() => roomCode && startWorklet('join')}
              disabled={!roomCode}
            >
              <Text style={styles.modeButtonText}>Join Room</Text>
              <Text style={styles.modeButtonSubtext}>Connect to existing conversation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  // Chat screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>P2P Chat 🍐</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Waiting for peer...'}
          </Text>
        </View>
        {generatedRoomCode && (
          <TouchableOpacity onPress={copyRoomCode} style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Room Code:</Text>
            <Text style={styles.codeText}>{generatedRoomCode}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        style={styles.messageList}
        renderItem={({ item }) => (
          <View style={[
            styles.messageItem,
            item.from === 'me' ? styles.messageItemMe : styles.messageItemPeer
          ]}>
            <Text style={styles.messageFrom}>
              {item.from === 'me' ? 'You' : 'Peer'}
            </Text>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder='Type a message...'
          placeholderTextColor='#666'
          value={messageInput}
          onChangeText={setMessageInput}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={!messageInput.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#011501',
    padding: 20
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#b0d943',
    textAlign: 'center',
    marginTop: 40
  },
  subtitle: {
    fontSize: 14,
    color: '#7a9e2d',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 40
  },
  modeContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20
  },
  modeButton: {
    backgroundColor: '#1a3d0a',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#b0d943',
    alignItems: 'center'
  },
  modeButtonDisabled: {
    opacity: 0.5,
    borderColor: '#555'
  },
  modeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b0d943',
    marginBottom: 5
  },
  modeButtonSubtext: {
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
  joinContainer: {
    gap: 15
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
    marginBottom: 20
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
    marginRight: 8
  },
  statusDotConnected: {
    backgroundColor: '#b0d943'
  },
  statusText: {
    color: '#7a9e2d',
    fontSize: 14
  },
  codeContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#1a3d0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b0d943',
    alignItems: 'center'
  },
  codeLabel: {
    color: '#7a9e2d',
    fontSize: 12
  },
  codeText: {
    color: '#b0d943',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  messageList: {
    flex: 1
  },
  messageItem: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: '80%'
  },
  messageItemMe: {
    backgroundColor: '#1a3d0a',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2
  },
  messageItemPeer: {
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2
  },
  messageFrom: {
    fontSize: 12,
    color: '#7a9e2d',
    marginBottom: 4,
    fontWeight: 'bold'
  },
  messageText: {
    fontSize: 16,
    color: '#b0d943'
  },
  messageTime: {
    fontSize: 10,
    color: '#555',
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  messageInput: {
    flex: 1,
    height: 50,
    borderColor: '#b0d943',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#b0d943',
    backgroundColor: '#1a3d0a'
  },
  sendButton: {
    backgroundColor: '#b0d943',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 80
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: '#011501',
    fontWeight: 'bold',
    fontSize: 16
  }
})
