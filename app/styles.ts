import { StyleSheet, Platform, StatusBar } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 20,
    paddingBottom: Platform.OS === 'android' ? 60 : 20
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7DC4DF',
    textAlign: 'center',
    marginTop: 5
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7DC4DF',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#7DC4DF',
    paddingVertical: 2,
    marginHorizontal: 40,
    marginTop: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#90B8C8',
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
    color: '#90B8C8',
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
    color: '#90B8C8',
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
    backgroundColor: '#E2F3F8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7DC4DF',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: '#A5C8D5'
  },
  bigButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7DC4DF'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0E6F0'
  },
  dividerText: {
    color: '#A5C8D5',
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
    backgroundColor: '#E2F3F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DC4DF',
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
    backgroundColor: '#7DC4DF'
  },
  qrScanBtn: {
    width: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DC4DF',
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
    backgroundColor: '#C0D4DE'
  },
  statusDotOn: {
    backgroundColor: '#7DC4DF'
  },
  statusText: {
    color: '#90B8C8',
    fontSize: 14
  },
  deleteListBtn: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8E6EC',
    borderWidth: 1,
    borderColor: '#88AEC0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  deleteListBtnText: {
    color: '#88AEC0',
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
    backgroundColor: '#E2F3F8',
    borderWidth: 1,
    borderColor: '#7DC4DF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  backBtnText: {
    color: '#7DC4DF',
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
    backgroundColor: '#E2F3F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BCDEEA',
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
    backgroundColor: '#7DC4DF',
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
    backgroundColor: '#7DC4DF',
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
    borderColor: '#E2F3F8',
    borderTopColor: '#7DC4DF'
  },
  loadingText: {
    color: '#90B8C8',
    fontSize: 15
  },
  emptyText: {
    color: '#A5C8D5',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F3F8',
    padding: 14,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BCDEEA'
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
    backgroundColor: '#D8E6EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  deleteBtnText: {
    color: '#88AEC0',
    fontSize: 14,
    fontWeight: 'bold'
  },
  nameForm: {
    backgroundColor: '#E2F3F8',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DC4DF',
    gap: 10
  },
  addForm: {
    backgroundColor: '#E2F3F8',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DC4DF',
    gap: 10
  },
  formInput: {
    height: 44,
    borderColor: '#BCDEEA',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#4A3F44',
    backgroundColor: '#EEF7FA'
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
    color: '#90B8C8',
    fontSize: 15
  },
  addBtn: {
    backgroundColor: '#7DC4DF',
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
    backgroundColor: '#7DC4DF',
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
    backgroundColor: '#7DC4DF',
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
    backgroundColor: '#7DC4DF',
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
