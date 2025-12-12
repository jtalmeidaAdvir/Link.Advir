import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    // Containers Principais
    mainContainer: { flex: 1 },
    container: { flex: 1 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    // Header Melhorado
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerContent: {
        borderRadius: 20,
        padding: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 5
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500'
    },

    // Filtros Melhorados
    filtersContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    filtersCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },

    // Pesquisa
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    searchBtn: {
        padding: 5,
    },

    // Dropdowns
    dropdownsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    dropdownWrapper: {
        flex: 1,
    },
    dropdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modernPicker: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        overflow: 'hidden',
    },
    pickerStyle: {
        color: '#333',
    },

    // Status Chips
    statusContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
        gap: 6,
    },
    statusChipActive: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    statusChipText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    statusChipTextActive: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // Action Buttons
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    modernButton: {
        flex: 1,
        minWidth: 120,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modernButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        gap: 8,
    },
    modernButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // Lista
    listContainer: {
        padding: 20,
        paddingTop: 10,
    },

    // Cards Melhorados
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 4,
    },
    statusIcon: {
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

    // Card Body
    cardBody: {
        gap: 12,
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIcon: {
        width: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        width: 80,
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        fontWeight: '500',
    },
    valueText: {
        color: '#28a745',
        fontWeight: '700',
    },

    // Actions Row
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#f8f9fa',
        gap: 6,
        flex: 1,
        minWidth: 80,
        justifyContent: 'center',
    },
    actionBtnText: {
        fontWeight: '600',
        fontSize: 13,
    },

    // Loading States
    loadingCard: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        gap: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Error States
    errorCard: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#dc3545',
        marginTop: 15,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    retryButton: {
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Empty States
    emptyStateContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyStateCard: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    emptyStateIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    emptyStateButton: {
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
    },
    emptyStateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 8,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Form Styles
    formContainer: {
        padding: 20,
    },
    formSection: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#f1f3f4',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inputContainer: {
        position: 'relative',
    },
    modernInput: {
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    rowContainer: {
        flexDirection: 'row',
    },

    // Switch Styles
    switchContainer: {
        gap: 15,
    },
    switchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },

    // Save Button
    saveButtonContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 15,
        gap: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Details Modal
    detailsContainer: {
        padding: 20,
    },
    detailCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 20,
    },
    detailHeader: {
        alignItems: 'center',
        marginBottom: 25,
    },
    detailIconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    detailMainTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    detailsGrid: {
        gap: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#1792FE',
    },
    fullWidth: {
        marginTop: 10,
    },
    detailItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    detailItemContent: {
        flex: 1,
    },
    detailItemLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },
    detailItemValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        lineHeight: 22,
    },
    priceText: {
        color: '#28a745',
        fontWeight: '700',
    },
    detailActions: {
        gap: 10,
    },
    detailActionBtn: {
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
    },
    detailActionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        gap: 10,
    },
    detailActionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Resumo/Analytics Modal
    resumoControls: {
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    controlSection: {
        marginBottom: 20,
    },
    controlSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    segmentControl: {
        flexDirection: 'row',
        backgroundColor: '#e9ecef',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    segmentBtnActive: {
        backgroundColor: '#1792FE',
    },
    segmentText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    segmentTextActive: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#e9ecef',
        borderRadius: 20,
        gap: 6,
    },
    chipActive: {
        backgroundColor: '#1792FE',
    },
    chipText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 13,
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    switchSection: {
        marginBottom: 20,
    },
    switchOptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        gap: 12,
    },
    switchOptionLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    dateRangeContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    dateInput: {
        flex: 1,
    },
    dateInputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    advancedFilters: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    filterDropdown: {
        flex: 1,
        minWidth: 150,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },

    // Analytics Content
    resumoContent: {
        padding: 20,
    },
    analyticsCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    analyticsCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    analyticsIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(253, 126, 20, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    analyticsCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    analyticsCardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#17a2b8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 4,
    },
    analyticsCardBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    analyticsCardContent: {
        gap: 12,
    },
    analyticsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
    },
    analyticsItemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    analyticsItemContent: {
        flex: 1,
    },
    analyticsItemLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    analyticsItemValues: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    analyticsValueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    analyticsValueText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    moneyText: {
        color: '#28a745',
        fontWeight: '700',
    },

    // Confirmation Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmationModal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 0,
        width: '100%',
        maxWidth: 400,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    confirmationHeader: {
        alignItems: 'center',
        paddingTop: 30,
        paddingHorizontal: 25,
        paddingBottom: 20,
    },
    confirmationIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
    },
    confirmationContent: {
        paddingHorizontal: 25,
        paddingBottom: 25,
    },
    confirmationMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    confirmationActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
    },
    confirmationCancelBtn: {
        flex: 1,
        paddingVertical: 18,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#f1f3f4',
    },
    confirmationCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    confirmationConfirmBtn: {
        flex: 1,
        overflow: 'hidden',
    },
    confirmationConfirmBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    confirmationConfirmText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // Grade Partes Diárias Styles
    gradeCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    gradeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 2,
        borderBottomColor: '#e9ecef',
    },
    gradeHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 162, 184, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    gradeCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    gradeCardSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    gradeCardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#17a2b8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 4,
    },
    gradeCardBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    gradeTableContainer: {
        padding: 15,
    },
    gradeTableHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        backgroundColor: '#e9ecef',
        borderRadius: 8,
        marginBottom: 8,
    },
    gradeTableHeaderCell: {
        fontSize: 13,
        fontWeight: '700',
        color: '#495057',
        paddingHorizontal: 4,
    },
    gradeTableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
        alignItems: 'center',
    },
    gradeTableCell: {
        fontSize: 14,
        color: '#333',
        paddingHorizontal: 4,
    },
    categoriaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    categoriaBadgeMaoObra: {
        backgroundColor: '#28a745',
    },
    categoriaBadgeEquipamento: {
        backgroundColor: '#fd7e14',
    },
    categoriaBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    gradeNotasContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    gradeNotasText: {
        flex: 1,
        fontSize: 13,
        color: '#4a5568',
        fontStyle: 'italic'
    },

    // Grade Mensal Styles
    gradeMensalHeader: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f7fafc',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#17a2b8'
    },
    gradeMensalTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3748',
        marginBottom: 5
    },
    gradeMensalSubtitulo: {
        fontSize: 14,
        color: '#718096'
    },
    gradeMensalTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#17a2b8',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8
    },
    gradeMensalHeaderCell: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.2)'
    },
    gradeMensalHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center'
    },
    gradeMensalNomeCell: {
        width: 180,
        minWidth: 180,
        maxWidth: 180,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    gradeMensalDiaCell: {
        width: 50,
        minWidth: 50,
        maxWidth: 50
    },
    gradeMensalRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    gradeMensalRowPar: {
        backgroundColor: '#f7fafc'
    },
    gradeMensalCell: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0'
    },
    gradeMensalNomeText: {
        fontSize: 13,
        color: '#2d3748',
        fontWeight: '500'
    },
    gradeMensalCellText: {
        fontSize: 11,
        color: '#a0aec0',
        textAlign: 'center'
    },
    gradeMensalCellComHoras: {
        backgroundColor: '#e6fffa'
    },
    gradeMensalCellTextComHoras: {
        color: '#17a2b8',
        fontWeight: 'bold'
    },
    gradeMensalFimDeSemana: {
        backgroundColor: '#fff5f5'
    },
    gradeMensalTotalCell: {
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        backgroundColor: '#f7fafc',
        borderLeftWidth: 2,
        borderLeftColor: '#17a2b8'
    },
    gradeMensalCellTotal: {
        backgroundColor: '#e6f7ff'
    },
    gradeMensalTotalText: {
        fontSize: 13,
        color: '#17a2b8',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    gradeMensalCellValueText: {
        fontSize: 10,
        color: '#28a745',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2
    },
    gradeMensalTotalValueText: {
        fontSize: 11,
        color: '#28a745',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 3
    },

    // Estilos para Modal de Exportação
    exportDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginTop: 8,
        marginBottom: 10
    },
    infoBox: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        alignItems: 'flex-start',
        gap: 10
    },
    infoBoxText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500'
    },
});