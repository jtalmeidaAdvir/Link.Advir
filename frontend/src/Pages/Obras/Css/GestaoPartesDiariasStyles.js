export const styles = {
  container: { flex: 1 },
  // Estilos do modal de edição melhorado
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  editModalHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  editModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  editModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  editModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  editModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editModalBody: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  editInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  editInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editDateContainer: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1792FE',
  },
  editDateValue: {
    fontSize: 15,
    color: '#1792FE',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  editCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  editCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editPickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  editPicker: {
    height: 50,
  },
  editCategoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  editCategoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    gap: 8,
  },
  editCategoryOptionSelected: {
    backgroundColor: '#1792FE',
    borderColor: '#1792FE',
  },
  editCategoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1792FE',
  },
  editCategoryOptionTextSelected: {
    color: '#fff',
  },
  editInputContainer: {
    gap: 8,
  },
  editHorasInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  editHorasHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  editHorasHintText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  editHoraExtraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  editHoraExtraLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  editHoraExtraInfo: {
    flex: 1,
  },
  editHoraExtraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  editHoraExtraSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  editCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCheckboxSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  editModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editSaveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editSaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Estilos antigos mantidos para compatibilidade
  pickerContainer: { flexDirection:'row', gap:8, flexWrap:'wrap', marginTop:6 },
  pickerOptionSmall: { paddingVertical:8, paddingHorizontal:12, borderRadius:12, backgroundColor:'#eef2f7' },
  pickerOptionSelected: { backgroundColor:'#1792FE' },
  pickerOptionTextSmall: { color:'#1792FE', fontWeight:'600' },
  pickerOptionTextSelected: { color:'#fff' },
  horasInput: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e0e0', borderRadius:8, paddingHorizontal:12, height:44 },

  header: { paddingHorizontal: 20, paddingVertical: 25, paddingTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: '#e3f2fd', opacity: 0.9 },
  listContent: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#d4e4ff', },
  loadingText: { marginTop: 15, fontSize: 16, color: '#1792FE', fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f8f9fa' },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
  retryButton: { borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, overflow: 'hidden' },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
  statusIcon: { marginRight: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBody: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1, lineHeight: 20 },
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8 },
  viewDetailsText: { color: '#1792FE', fontSize: 14, fontWeight: '600', marginRight: 4 },
  buttonContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  integrarButton: { flex: 1, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  rejeitarButton: { flex: 1, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 22 },
  filtroContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 25, padding: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  filtroBotao: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center' },
  filtroBotaoAtivo: { backgroundColor: '#1792FE', elevation: 2, shadowColor: '#1792FE', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  filtroTexto: { color: '#1792FE', fontWeight: '500', fontSize: 14 },
  filtroTextoAtivo: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { paddingTop: 20, paddingBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  modalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  modalBody: { padding: 20, paddingBottom: 30 },
  
  // Novos estilos para cards de informação
  modalInfoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  modalSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  modalInfoGrid: { gap: 16 },
  modalInfoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  modalInfoIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0f8ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  modalInfoContent: { flex: 1 },
  modalInfoLabel: { fontSize: 14, color: '#666', marginBottom: 2, fontWeight: '500' },
  modalInfoValue: { fontSize: 16, color: '#333', fontWeight: '600', lineHeight: 22 },
  statusBadgeModal: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusTextModal: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  // Card de resumo
  modalSummaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  summaryItem: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: '30%', flex: 1 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#1792FE', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  
  // Seção de itens
  modalItemsSection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  
  // Novos cards de itens modernos
  modernItemCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden' },
  modernItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  itemHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTypeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  itemTypeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modernItemNumber: { fontSize: 14, fontWeight: '600', color: '#666' },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(23, 146, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  editButtonText: { color: '#1792FE', fontSize: 12, fontWeight: '600' },
  
  modernItemContent: { padding: 16, gap: 12 },
  itemDetailRow: { flexDirection: 'row', gap: 16 },
  itemDetailColumn: { flex: 1 },
  itemDetailFull: { width: '100%' },
  itemDetailLabel: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 4 },
  itemDetailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  horasContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  horasValue: { fontSize: 14, color: '#1792FE', fontWeight: '700' },
  
  itemStatusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  itemStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  itemStatusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  
  // Empty state melhorado
  emptyItemsContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyItemsText: { fontSize: 16, color: '#999', textAlign: 'center', fontWeight: '600', marginTop: 12 },
  emptyItemsSubtext: { fontSize: 14, color: '#ccc', textAlign: 'center', marginTop: 4 },
  
  // Estilos antigos mantidos para compatibilidade
  modalSection: { marginBottom: 24 },
  modalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalValue: { fontSize: 15, color: '#555', lineHeight: 22 },
  itemCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, overflow: 'hidden' },
  itemHeader: { backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNumber: { fontSize: 14, fontWeight: '600', color: '#1792FE' },
  itemContent: { padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1, lineHeight: 20 },
  categoriaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginTop: 6 },
  categoriaChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  // Estilos para prévia dos itens no card principal
  itemsPreviewContainer: {
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  itemsPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  itemsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1792FE'
  },
  itemPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  itemPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6
  },
  itemTypeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2
  },
  itemTypeBadgeSmallText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold'
  },
  itemPreviewType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  itemPreviewContent: {
    gap: 4
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  itemPreviewLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    flex: 1
  },
  itemPreviewValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right'
  },
  itemPreviewHorasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 2,
    justifyContent: 'flex-end'
  },
  itemPreviewHorasValue: {
    fontSize: 11,
    color: '#1792FE',
    fontWeight: '700'
  },
  horaExtraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2
  },
  horaExtraText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold'
  },
  moreItemsIndicator: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(23, 146, 254, 0.1)',
    borderRadius: 6,
    marginTop: 4
  },
  moreItemsText: {
    fontSize: 11,
    color: '#1792FE',
    fontWeight: '600',
    fontStyle: 'italic'
  },
};