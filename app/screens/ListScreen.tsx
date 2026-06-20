import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useNote } from '../hooks/NoteContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { QRCodeModal } from '../components/QRCodeModal'
import { styles } from '../styles'

export function ListScreen() {
  const {
    items, myCode, connected, loading,
    title, setTitle, showAdd, setShowAdd,
    currentNoteName,
    editingTitle, setEditingTitle,
    editTitleValue, setEditTitleValue,
    showQR, setShowQR,
    keyExpanded, setKeyExpanded,
    handleAddItem, handleRemoveItem,
    handleLeave, handleDeleteNote, handleRenameNote, copyCode
  } = useNote()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior='padding'
      keyboardVerticalOffset={Platform.OS === 'android' ? StatusBar.currentHeight : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} disabled={loading} style={[styles.backBtn, loading && styles.buttonDisabled]}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        {editingTitle ? (
          <TextInput
            style={styles.titleInput}
            value={editTitleValue}
            onChangeText={setEditTitleValue}
            onSubmitEditing={() => {
              const val = editTitleValue.trim()
              if (val) handleRenameNote(val)
              setEditingTitle(false)
            }}
            onBlur={() => setEditingTitle(false)}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onLongPress={() => { setEditTitleValue(currentNoteName); setEditingTitle(true) }}>
            <Text style={styles.heading}>{currentNoteName || <Text><Text style={{ color: '#B0D944' }}>Pear</Text>Note</Text>}</Text>
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
                <MaterialCommunityIcons name='qrcode' size={20} color='#1A1A1A' />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <TouchableOpacity onPress={handleDeleteNote} style={styles.deleteListBtn}>
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
                placeholderTextColor='#90B8C8'
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

      <QRCodeModal
        visible={showQR && !!myCode}
        code={myCode}
        onClose={() => setShowQR(false)}
      />
    </KeyboardAvoidingView>
  )
}
