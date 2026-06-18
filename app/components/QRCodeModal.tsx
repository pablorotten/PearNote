import React from 'react'
import { Modal, View, Text, TouchableOpacity } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { styles } from '../styles'

export function QRCodeModal({ visible, code, onClose }: { visible: boolean, code: string, onClose: () => void }) {
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
