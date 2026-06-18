import { StyleSheet, Platform, StatusBar } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF7EE',
    padding: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 20,
    paddingBottom: Platform.OS === 'android' ? 60 : 20
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
    textAlign: 'center',
    marginTop: 5
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B9D',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B9D',
    paddingVertical: 2,
    marginHorizontal: 40,
    marginTop: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#B8A0B0',
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
    color: '#B8A0B0',
    fontSize: 14,
    marginBottom: 8
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  historyItem: {
    width: '47%',
    minHeight: 130,
    padding: 14,
    paddingTop: 22,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  historyItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  historyItemText: {
    color: '#4A3F44',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4
  },
  historyItemSub: {
    color: '#B8A0B0',
    fontSize: 11,
    textAlign: 'center'
  },
  historyDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  historyDeleteBtnText: {
    color: '#4A3F44',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 13
  },
  stickyPin: {
    position: 'absolute',
    top: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  bigButton: {
    backgroundColor: '#FFE8EC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: '#C4B0B8'
  },
  bigButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B9D'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFD9E2'
  },
  dividerText: {
    color: '#C4B0B8',
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
    backgroundColor: '#FFE8EC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    overflow: 'hidden'
  },
  joinInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    color: '#4A3F44',
    fontSize: 15
  },
  joinSubmitBtn: {
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B9D'
  },
  qrScanBtn: {
    width: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B9D',
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
    backgroundColor: '#D0C0C8'
  },
  statusDotOn: {
    backgroundColor: '#FF6B9D'
  },
  statusText: {
    color: '#B8A0B0',
    fontSize: 14
  },
  deleteListBtn: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A2020',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  deleteListBtnText: {
    color: '#FF6B6B',
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
    backgroundColor: '#FFE8EC',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  backBtnText: {
    color: '#FF6B9D',
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
    backgroundColor: '#FFE8EC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB3C3',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  codeValue: {
    color: '#4A3F44',
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
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
    alignItems: 'center'
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  qrBtn: {
    width: 42,
    borderRadius: 8,
    backgroundColor: '#FF6B9D',
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
    borderColor: '#FFE8EC',
    borderTopColor: '#FF6B9D'
  },
  loadingText: {
    color: '#B8A0B0',
    fontSize: 15
  },
  emptyText: {
    color: '#C4B0B8',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8EC',
    padding: 14,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB3C3'
  },
  itemInfo: {
    flex: 1
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#4A3F44'
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A2020',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  deleteBtnText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold'
  },
  nameForm: {
    backgroundColor: '#FFE8EC',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    gap: 10
  },
  addForm: {
    backgroundColor: '#FFE8EC',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    gap: 10
  },
  formInput: {
    height: 44,
    borderColor: '#FFB3C3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#4A3F44',
    backgroundColor: '#FFF0F2'
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
    color: '#B8A0B0',
    fontSize: 15
  },
  addBtn: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 20
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A3F44'
  },
  qrCloseBtn: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8
  },
  qrCloseBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FF6B6B',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  scannerCloseBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30
  }
})
