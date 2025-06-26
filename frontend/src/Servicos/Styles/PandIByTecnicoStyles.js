import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1792FE',
    },
    modalInfo: {
        fontSize: 14,
        marginBottom: 6,
        color: '#444',
    },
    modalDesc: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
        marginVertical: 10,
    },
    modalButton: {
        backgroundColor: '#1792FE',
        paddingVertical: 10,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    contentContainer: {
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 20,
        textAlign: "center",
    },
    // Dashboard styles
    dashboardContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dashboardTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 15,
        textAlign: "center",
    },
    dashboardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
        flexWrap: "wrap",
    },
    dashboardCard: {
        backgroundColor: "#f5f9ff",
        borderRadius: 10,
        padding: 15,
        flex: 1,
        minWidth: 120,
        margin: 5,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#d0e1f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
        color: "#555",
        marginBottom: 8,
        textAlign: "center",
    },
    cardValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0056b3",
    },
    chartsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 10,
    },
    chartBox: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        width: "48%",
        minWidth: 300,
        flex: 1,
        borderWidth: 1,
        borderColor: "#d0e1f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0056b3",
        marginBottom: 10,
        textAlign: "center",
    },
    controlsContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    controlRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    controlBox: {
        flex: 1,
        marginHorizontal: 5,
    },
    controlLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 5,
    },
    picker: {
        backgroundColor: "#f5f9ff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#d0e1f9",
        paddingVertical: 8,
        paddingHorizontal: 10,
        width: "100%",
    },
    button: {
        backgroundColor: "#1792FE",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: "#93c5f0",
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    loadingInfo: {
        color: "#0056b3",
        textAlign: "center",
        marginTop: 8,
        fontStyle: "italic",
    },

    // Novos estilos para o layout em grelha
    gridContainer: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },

    // Estilos do cabeçalho da tabela
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#1792FE",
        padding: 15,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    tableHeaderLabel: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
        textAlign: "center",
        flex: 1,
    },

    // Seção de data
    dataSection: {
        backgroundColor: "#e6f0ff",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#d0e1f9",
    },
    dataSectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0056b3",
        textTransform: "capitalize",
    },

    // Estilos das linhas da tabela
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e6f0ff",
        padding: 10,
    },
    tableRowEven: {
        backgroundColor: "#f5f9ff",
    },
    tableRowOdd: {
        backgroundColor: "#fff",
    },
    tableRowPendente: {
        borderLeftWidth: 4,
        borderLeftColor: "#ffc107",
    },

    // Estilos das células da tabela
    tableCell: {
        flex: 1,
        padding: 8,
        justifyContent: "center",
    },
    tableCellInterv: {
        flex: 2,
        padding: 8,
    },
    tableCellText: {
        fontSize: 14,
        color: "#333",
    },
    tableCellTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0056b3",
        marginBottom: 4,
    },
    tableCellSubtext: {
        fontSize: 12,
        color: "#666",
    },
    tableCellDesc: {
        fontSize: 12,
        color: "#555",
        fontStyle: "italic",
        flexWrap: "wrap",
        wordBreak: "break-word", // para web
    },
    

    // Estado dos processos
    estadoPendente: {
        backgroundColor: "#fff3cd",
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ffc107",
    },
    estadoPendenteText: {
        color: "#856404",
        fontSize: 12,
        fontWeight: "bold",
    },
    estadoConcluido: {
        backgroundColor: "#d4edda",
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#28a745",
    },
    estadoConcluidoText: {
        color: "#155724",
        fontSize: 12,
        fontWeight: "bold",
    },

    // Cartões de intervenções
    intervCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#1792FE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    intervHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    intervType: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#0056b3",
    },
    intervDuration: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#28a745",
        backgroundColor: "#e6f7e6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    intervTime: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 4,
    },
    intervDesc: {
        fontSize: 12,
        color: "#333",
    },
    intervPendente: {
        fontSize: 14,
        fontStyle: "italic",
        color: "#999",
        textAlign: "center",
        padding: 10,
    },

    // Container para sem dados
    noDataContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 20,
    },
    noDataText: {
        fontSize: 16,
        color: "#777",
        textAlign: "center",
    },
    processCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginVertical: 10,
        marginHorizontal: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        borderLeftWidth: 5,
        borderLeftColor: "#1792FE",
    },
    
    cardDate: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1792FE",
        marginBottom: 12,
        textTransform: "capitalize",
    },
    
    cardLine: {
        fontSize: 14,
        color: "#333",
        marginBottom: 6,
    },
    
    cardLabel: {
        fontWeight: "bold",
        color: "#444",
    },
    
    cardDesc: {
        fontSize: 13,
        fontStyle: "italic",
        color: "#666",
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    
      
});