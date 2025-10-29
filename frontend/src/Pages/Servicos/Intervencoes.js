import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPrint,
    faTrash,
    faArrowLeft,
    faChevronDown,
    faChevronUp,
    faSearch,
    faPlus,
    faCalendarAlt,
    faUser,
    faFileAlt,
    faClock,
} from "@fortawesome/free-solid-svg-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { secureStorage } from '../../utils/secureStorage';
const Intervencoes = (props) => {
    const navigation = useNavigation();
    const [searchTerm, setSearchTerm] = useState("");
    const [intervencoes, setIntervencoes] = useState([]);
    const [expandedIntervencao, setExpandedIntervencao] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedIntervencao, setSelectedIntervencao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    useFocusEffect(
        React.useCallback(() => {
            const fetchIntervencoes = async () => {
                const token = secureStorage.getItem("painelAdminToken");
                const id = secureStorage.getItem("intervencaoId");
                const urlempresa = secureStorage.getItem("urlempresa");

                if (id && token) {
                    try {
                        setLoading(true);

                        const response = await fetch(
                            `https://webapiprimavera.advir.pt/listarIntervencoes/${id}`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                    urlempresa: urlempresa,
                                },
                            },
                        );

                        if (!response.ok) {
                            throw new Error(
                                `Server error: ${response.status} ${response.statusText}`,
                            );
                        }

                        const data = await response.json();

                        if (data?.DataSet?.Table) {
                            setIntervencoes(data.DataSet.Table);
                        } else {
                            console.warn(
                                "Estrutura de dados inesperada:",
                                data,
                            );
                            setError(
                                "A resposta da API não contém os dados esperados.",
                            );
                        }
                    } catch (error) {
                        console.error("Error fetching intervenções:", error);
                        setError(
                            "Não foi possível carregar as intervenções. Tente novamente.",
                        );
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                }
            };

            fetchIntervencoes();
        }, []),
    );

    const toggleExpand = (intervencaoId) => {
        setExpandedIntervencao(
            expandedIntervencao === intervencaoId ? null : intervencaoId,
        );
    };

    const handleDelete = (intervencao) => {
        setSelectedIntervencao(intervencao);
        setModalVisible(true);
    };

    const confirmDelete = async () => {
        if (selectedIntervencao) {
            try {
                const token = secureStorage.getItem("painelAdminToken");
                const urlempresa = secureStorage.getItem("urlempresa");

                if (!token) throw new Error("Token não encontrado.");

                const response = await fetch(
                    `https://webapiprimavera.advir.pt/routePedidos_STP/EliminarIntervencao/${selectedIntervencao.ID}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            urlempresa: urlempresa,
                        },
                    },
                );

                if (!response.ok)
                    throw new Error("Network response was not ok");

                setIntervencoes((prevIntervencoes) =>
                    prevIntervencoes.filter(
                        (intervencao) =>
                            intervencao.ID !== selectedIntervencao.ID,
                    ),
                );

                Alert.alert("Sucesso", "Intervenção eliminada com sucesso!", [
                    { text: "OK" },
                ]);
            } catch (error) {
                console.error("Erro ao eliminar intervenção:", error);
                Alert.alert(
                    "Erro",
                    "Não foi possível eliminar a intervenção. Tente novamente.",
                    [{ text: "OK" }],
                );
            } finally {
                setModalVisible(false);
                setSelectedIntervencao(null);
            }
        }
    };

    const formatDuration = (minutes) => {
        if (!minutes) return "0 min";

        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins > 0 ? mins + "min" : ""}`;
        }

        return `${minutes} min`;
    };

    const renderIntervencao = ({ item }) => {
        const isExpanded = expandedIntervencao === item.ID;
        const dataInicio = new Date(item.DataHoraInicio);
        const dataFim = new Date(item.DataHoraFim);

        return (
            <View style={styles.cardContainer}>
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(item.ID)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>
                            {t("Intervencoes.Intervencao.Title")} {item.Interv}
                        </Text>

                        <View style={styles.cardBadges}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {item.TipoInterv || "Não especificado"}
                                </Text>
                            </View>

                            <View style={styles.durationBadge}>
                                <FontAwesomeIcon
                                    icon={faClock}
                                    style={styles.badgeIcon}
                                    size="xs"
                                />
                                <Text style={styles.durationText}>
                                    {formatDuration(item.Duracao)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                /* Implementar impressão */
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faPrint}
                                style={styles.actionIcon}
                                size="sm"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButtonDelete}
                            onPress={() => handleDelete(item)}
                        >
                            <FontAwesomeIcon
                                icon={faTrash}
                                style={styles.actionIconDelete}
                                size="sm"
                            />
                        </TouchableOpacity>

                        <FontAwesomeIcon
                            icon={isExpanded ? faChevronUp : faChevronDown}
                            style={styles.expandIcon}
                            size="sm"
                        />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.cardContent}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <View style={styles.detailIconContainer}>
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        style={styles.detailIcon}
                                        size="sm"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.detailLabel}>
                                        {t(
                                            "Intervencoes.Intervencao.TxtInicio",
                                        )}
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {dataInicio.toLocaleDateString()} -{" "}
                                        {dataInicio.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.detailItem}>
                                <View style={styles.detailIconContainer}>
                                    <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        style={styles.detailIcon}
                                        size="sm"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.detailLabel}>
                                        {t("Intervencoes.Intervencao.TxtFim")}
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {dataFim.toLocaleDateString()} -{" "}
                                        {dataFim.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <View style={styles.detailIconContainer}>
                                    <FontAwesomeIcon
                                        icon={faUser}
                                        style={styles.detailIcon}
                                        size="sm"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.detailLabel}>
                                        {t(
                                            "Intervencoes.Intervencao.TxtTecnico",
                                        )}
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {item.Nome || "Não especificado"}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.detailItem}>
                                <View style={styles.detailIconContainer}>
                                    <FontAwesomeIcon
                                        icon={faClock}
                                        style={styles.detailIcon}
                                        size="sm"
                                    />
                                </View>
                                <View>
                                    <Text style={styles.detailLabel}>
                                        {t(
                                            "Intervencoes.Intervencao.TxtDuracao",
                                        )}
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {formatDuration(item.Duracao)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.descriptionContainer}>
                            <View style={styles.detailIconContainer}>
                                <FontAwesomeIcon
                                    icon={faFileAlt}
                                    style={styles.detailIcon}
                                    size="sm"
                                />
                            </View>
                            <View style={styles.descriptionContent}>
                                <Text style={styles.detailLabel}>
                                    {t("Intervencoes.Intervencao.TxtDescricao")}
                                </Text>
                                <Text style={styles.descriptionText}>
                                    {item.DescricaoResp || "Sem descrição"}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() =>
                        props.navigation.navigate("PedidosAssistencia")
                    }
                    style={styles.backButton}
                >
                    <FontAwesomeIcon
                        icon={faArrowLeft}
                        style={styles.backIcon}
                        size="sm"
                    />
                    <Text style={styles.backText}>
                        {t("Intervencoes.BtVoltar")}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.title}>{t("Intervencoes.Title")}</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <FontAwesomeIcon
                        icon={faSearch}
                        style={styles.searchIcon}
                        size="lg"
                    />
                    <TextInput
                        placeholder={t("Intervencoes.Procurar")}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        style={styles.searchInput}
                    />
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate("RegistoIntervencao")}
                >
                    <FontAwesomeIcon
                        icon={faPlus}
                        style={styles.addButtonIcon}
                        size="sm"
                    />
                    <Text style={styles.addButtonText}>
                        {"Intervenção"}
                    </Text>
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.contentContainer}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" />
                        <Text style={styles.loadingText}>
                            Carregando intervenções...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={intervencoes.filter(
                            (item) =>
                                item.DescricaoResp?.toLowerCase().includes(
                                    searchTerm.toLowerCase(),
                                ) ||
                                item.Nome?.toLowerCase().includes(
                                    searchTerm.toLowerCase(),
                                ) ||
                                item.TipoInterv?.toLowerCase().includes(
                                    searchTerm.toLowerCase(),
                                ),
                        )}
                        keyExtractor={(item) => item.ID.toString()}
                        renderItem={renderIntervencao}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {t("Intervencoes.Aviso.1")}
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyButton}
                                    onPress={() =>
                                        navigation.navigate(
                                            "RegistoIntervencao",
                                        )
                                    }
                                >
                                    <Text style={styles.emptyButtonText}>
                                        Criar Primeira Intervenção
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        }
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>

            {/* Modal de Confirmação */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Confirmar Eliminação
                            </Text>
                        </View>

                        <Text style={styles.modalText}>
                            {t("Intervencoes.Aviso.2")}
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                ]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>
                                    {t("Intervencoes.BtCancelar")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.deleteButton,
                                ]}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.deleteButtonText}>
                                    {t("Intervencoes.BtEliminar")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        backgroundColor: "#1792FE",
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 1,
    },
    backIcon: {
        color: "#fff",
        marginRight: 5,
    },
    backText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
    title: {
        fontSize: 22,
        color: "#fff",
        fontWeight: "700",
        textAlign: "center",
        marginTop: 5,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 15,
        marginRight: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        color: "#1792FE",
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1792FE",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: "#1792FE",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    addButtonIcon: {
        color: "#fff",
        marginRight: 6,
    },
    addButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    errorContainer: {
        margin: 20,
        padding: 12,
        backgroundColor: "#ffebee",
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#f44336",
    },
    errorText: {
        color: "#d32f2f",
        fontSize: 14,
    },
    listContent: {
        paddingBottom: 20,
    },
    cardContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 15,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: "#1792FE",
    },
    cardHeader: {
        padding: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 6,
    },
    cardBadges: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    badge: {
        backgroundColor: "#e6f4ff",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "#bae0ff",
    },
    badgeText: {
        color: "#1792FE",
        fontSize: 12,
        fontWeight: "500",
    },
    badgeIcon: {
        color: "#28a745",
        marginRight: 4,
    },
    durationBadge: {
        backgroundColor: "#e6f7e6",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#c8e6c9",
    },
    durationText: {
        color: "#28a745",
        fontSize: 12,
        fontWeight: "500",
    },
    cardActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#f0f7ff",
        marginRight: 6,
    },
    actionButtonDelete: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#ffebee",
        marginRight: 6,
    },
    actionIcon: {
        color: "#1792FE",
    },
    actionIconDelete: {
        color: "#f44336",
    },
    expandIcon: {
        color: "#1792FE",
    },
    cardContent: {
        padding: 15,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 15,
    },
    detailItem: {
        flex: 1,
        flexDirection: "row",
    },
    detailIconContainer: {
        width: 24,
        alignItems: "center",
        marginRight: 8,
    },
    detailIcon: {
        color: "#1792FE",
    },
    detailLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    descriptionContainer: {
        flexDirection: "row",
        marginTop: 5,
    },
    descriptionContent: {
        flex: 1,
    },
    descriptionText: {
        fontSize: 14,
        color: "#444",
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: "#1792FE",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    emptyButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    modalBackground: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalView: {
        width: "85%",
        maxWidth: 400,
        backgroundColor: "white",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    modalHeader: {
        backgroundColor: "#f44336",
        padding: 16,
    },
    modalTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
    },
    modalText: {
        marginVertical: 25,
        paddingHorizontal: 20,
        textAlign: "center",
        fontSize: 15,
        color: "#444",
    },
    modalButtons: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    modalButton: {
        flex: 1,
        padding: 15,
        alignItems: "center",
    },
    cancelButton: {
        borderRightWidth: 1,
        borderRightColor: "#eee",
    },
    deleteButton: {
        backgroundColor: "#f44336",
    },
    cancelButtonText: {
        color: "#666",
        fontWeight: "600",
        fontSize: 15,
    },
    deleteButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15,
    },
});

export default Intervencoes;