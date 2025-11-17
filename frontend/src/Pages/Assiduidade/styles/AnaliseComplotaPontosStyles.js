

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({


    container: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1792FE",
        marginLeft: 12,
    },
    filtersCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filtersTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    filterItem: {
        flex: 1,
        marginHorizontal: 4,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    picker: {
        height: 50,
    },
    legendCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    legendRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
        marginBottom: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        color: "#666",
    },
    gradeCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gradeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
    },
    gradeTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
        textAlign: "center",
        minWidth: 200,
    },
    buttonGroup: {
        flexDirection: "row",
        alignItems: "center",
    },
    refreshButton: {
        borderRadius: 8,
        overflow: "hidden",
        marginRight: 8,
    },
    refreshButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    refreshButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 12,
        marginLeft: 6,
    },
    exportButton: {
        borderRadius: 8,
        overflow: "hidden",
    },
    exportButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    exportButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
        marginLeft: 8,
    },
    gradeContainer: {
        minWidth: 800,
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 2,
        borderBottomColor: "#1792FE",
    },
    headerCell: {
        width: 120,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
    },
    dayHeaderCell: {
        width: 40,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    dayHeaderText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#666",
    },
    totalHeaderCell: {
        width: 80,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    gradeRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    userCell: {
        width: 120,
        padding: 8,
        justifyContent: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    userText: {
        fontSize: 11,
        color: "#333",
        textAlign: "center",
    },
    dayCell: {
        width: 40,
        height: 70,
        padding: 2,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    dayCellText: {
        fontSize: 7,
        textAlign: "center",
        color: "#333",
        lineHeight: 10,
    },
    totalCell: {
        width: 80,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    totalText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#1792FE",
    },
    totalSubText: {
        fontSize: 9,
        color: "#666",
    },
    cellEmpty: {
        backgroundColor: "#f8f9fa",
    },
    cellTrabalhou: {
        backgroundColor: "#d4edda",
    },
    cellFalta: {
        backgroundColor: "#f8d7da",
    },
    cellWeekend: {
        backgroundColor: "#e2e3e5",
    },
    cellFuture: {
        backgroundColor: "#f8f9fa",
        opacity: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
});
