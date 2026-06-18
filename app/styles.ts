import { StyleSheet, Platform, StatusBar } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#011501',
    padding: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 20,
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
  }
})
