import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Modal,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
    faClose,
    faDoorClosed,
    faLock,
    faExpand,
    faTrash,
    faSearch,
    faPlus,
    faChevronDown,
    faChevronUp,
    faFilter,
    faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import HeaderWithNotifications from "../Components/HeaderWithNotifications";

const { width } = Dimensions.get("window");

const PedidosAssistencia = ({ navigation }) => {
    // State variables
    const [searchTerm, setSearchTerm] = useState("");
    const [pedidos, setPedidos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [pedidoToDelete, setPedidoToDelete] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterPrioridade, setFilterPrioridade] = useState("");
    const [filterSerie, setFilterSerie] = useState("2025");
    const [filterEstado, setFilterEstado] = useState("1");
    const [showFilters, setShowFilters] = useState(false);
    const { t } = useTranslation();
    const [filteredData, setFilteredData] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [modalCloseVisible, setModalCloseVisible] = useState(false);
    const [processoParaFechar, setProcessoParaFechar] = useState(null);
    const [modalAnexosVisible, setModalAnexosVisible] = useState(false);
    const [anexosPedido, setAnexosPedido] = useState([]);
    const [pedidoAnexos, setPedidoAnexos] = useState(null);
    const [modalUploadVisible, setModalUploadVisible] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [pedidoParaUpload, setPedidoParaUpload] = useState(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [userTecnicoID, setUserTecnicoID] = useState("");

    useEffect(() => {
        const groupedData = Object.values(
            applyFilters().reduce((acc, pedido) => {
                const numProcesso = pedido.NumProcesso;
                if (!acc[numProcesso]) {
                    acc[numProcesso] = [];
                }
                acc[numProcesso].push(pedido);
                return acc;
            }, {}),
        );

        // Ordenar por NumProcesso descendente
        const sortedData = groupedData.sort((a, b) => {
            return b[0].NumProcesso - a[0].NumProcesso;
        });

        setFilteredData(sortedData);
    }, [pedidos, searchTerm, filterPrioridade, filterEstado, filterSerie]);

    // Fetch pedidos quando o componente monta ou a tela recebe foco
    useFocusEffect(
        React.useCallback(() => {
            const fetchPedidos = async () => {
                const token = localStorage.getItem("painelAdminToken");
                const urlempresa = localStorage.getItem("urlempresa");
                const storedIsAdmin =
                    localStorage.getItem("isAdmin") === "true";
                const storedTecnicoID =
                    localStorage.getItem("id_tecnico") || "";

                setIsAdmin(storedIsAdmin);
                setUserTecnicoID(storedTecnicoID);

                if (!urlempresa) {
                    setErrorMessage("URL da empresa não encontrada.");
                    setLoading(false);
                    return;
                }

                try {
                    const response = await fetch(
                        "https://webapiprimavera.advir.pt/listarPedidos/listarPedidos",
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                urlempresa: urlempresa,
                                "Content-Type": "application/json",
                            },
                        },
                    );

                    if (!response.ok) {
                        throw new Error(`Error: ${response.statusText}`);
                    }

                    const data = await response.json();
                    setPedidos(data.DataSet.Table);
                } catch (error) {
                    console.error("Error fetching pedidos:", error);
                    setErrorMessage(
                        "Não foi possível carregar os pedidos. Tente novamente.",
                    );
                } finally {
                    setLoading(false);
                }
            };

            fetchPedidos();
        }, []),
    );

    const applyFilters = () => {
        let filteredPedidos = [...pedidos];

        // Filtrar pedidos válidos
        filteredPedidos = filteredPedidos.filter(
            (pedido) => pedido && pedido.Cliente,
        );
        console.log("userTecnicoID:", userTecnicoID);
        console.log("Exemplo de pedido.Tecnico:", pedidos[0]?.Tecnico);
        console.log("Pedido completo:", pedidos[0]);

        // Se não for admin, filtrar apenas os do seu técnico
        if (!isAdmin && userTecnicoID) {
            filteredPedidos = filteredPedidos.filter(
                (pedido) =>
                    pedido.Tecnico?.toString().trim() ===
                    userTecnicoID.toString().trim(),
            );
        }

        // Filtros existentes...
        if (searchTerm && searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredPedidos = filteredPedidos.filter(
                (pedido) =>
                    pedido.Cliente?.toLowerCase().includes(lowerSearchTerm) ||
                    pedido.Nome?.toLowerCase().includes(lowerSearchTerm) ||
                    pedido.NumProcesso?.toString()
                        .toLowerCase()
                        .includes(lowerSearchTerm) ||
                    pedido.DescricaoProb?.toString()
                        .toLowerCase()
                        .includes(lowerSearchTerm),
            );
        }

        if (filterPrioridade && filterPrioridade.trim()) {
            filteredPedidos = filteredPedidos.filter(
                (pedido) =>
                    pedido.Prioridade?.toString().toLowerCase() ===
                    filterPrioridade.toLowerCase(),
            );
        }

        if (filterSerie && filterSerie.trim()) {
            filteredPedidos = filteredPedidos.filter(
                (pedido) =>
                    pedido.serie?.toString().toLowerCase() ===
                    filterSerie.toLowerCase(),
            );
        }

        if (filterEstado) {
            if (filterEstado === "pendentes") {
                const estadosPendentes = ["2", "3", "4"];
                filteredPedidos = filteredPedidos.filter((pedido) =>
                    estadosPendentes.includes(pedido.Estado?.toString()),
                );
            } else {
                filteredPedidos = filteredPedidos.filter(
                    (pedido) => pedido.Estado?.toString() === filterEstado,
                );
            }
        }

        return filteredPedidos;
    };

    // Delete pedido
    const deletePedido = async (id) => {
        try {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                throw new Error("Token ou URL da empresa não encontrados.");
            }

            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/EliminarPedido/${id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            // Remove o pedido eliminado do estado local
            setPedidos((prevPedidos) =>
                prevPedidos.filter((pedido) => pedido.ID !== id),
            );
            setModalVisible(false);
        } catch (error) {
            console.error("Erro ao eliminar pedido:", error);
            setErrorMessage(
                "Não foi possível eliminar o pedido. Tente novamente.",
            );
        }
    };

    // Delete pedido
    const FechaPedido = async (id) => {
        try {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                throw new Error("Token ou URL da empresa não encontrados.");
            }

            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/FechaProcessoID/${processoParaFechar}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            // Remove o pedido eliminado do estado local
            setPedidos((prevPedidos) =>
                prevPedidos.filter((pedido) => pedido.ID !== id),
            );
            setModalVisible(false);
        } catch (error) {
            console.error("Erro ao fechar pedido:", error);
            setErrorMessage(
                "Não foi possível fechar o pedido. Tente novamente.",
            );
        }
    };

    // Handle delete confirmation
    const handleDeleteConfirmation = () => {
        if (pedidoToDelete) {
            deletePedido(pedidoToDelete);
        }
    };

    // Handle search input change
    const handleSearch = (Nome) => {
        setSearchTerm(Nome);
    };

    // Função para carregar anexos de um pedido
    const carregarAnexos = async (pedidoId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/anexo-pedido/pedido/${pedidoId}`);
            if (response.ok) {
                const data = await response.json();
                setAnexosPedido(data.anexos || []);
                setModalAnexosVisible(true);
            } else {
                throw new Error('Erro ao carregar anexos');
            }
        } catch (error) {
            console.error('Erro ao carregar anexos:', error);
            setErrorMessage("Erro ao carregar anexos do pedido.");
        }
    };

    // Função para fazer download de anexo
    const downloadAnexo = async (anexoId, nomeArquivo) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/anexo-pedido/download/${anexoId}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = nomeArquivo;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                throw new Error('Erro ao fazer download');
            }
        } catch (error) {
            console.error('Erro ao fazer download:', error);
            alert("Erro ao fazer download do anexo.");
        }
    };

    // Função para fazer upload de anexo
    const uploadAnexo = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!pedidoParaUpload) {
            alert("Erro: ID do pedido não encontrado.");
            return;
        }

        // Validar tamanho do arquivo (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("Arquivo muito grande. O tamanho máximo é de 10MB.");
            return;
        }

        // Validar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            alert("Tipo de arquivo não permitido. Permitidos: JPEG, PNG, GIF, PDF, DOC, DOCX, TXT");
            return;
        }

        console.log('=== PREPARANDO UPLOAD ===');
        console.log('Arquivo:', file.name, 'Tamanho:', file.size, 'Tipo:', file.type);
        console.log('Pedido ID:', pedidoParaUpload);

        setUploadingFile(true);

        try {
            const formData = new FormData();
            formData.append('arquivo', file, file.name);
            formData.append('pedido_id', String(pedidoParaUpload));

            console.log('FormData criado com sucesso');
            console.log('Enviando para:', 'https://backend.advir.pt/api/anexo-pedido/upload');

            const response = await fetch('https://backend.advir.pt/api/anexo-pedido/upload', {
                method: 'POST',
                body: formData,
                // Não definir headers - deixar o browser gerenciar Content-Type automaticamente
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Anexo "${file.name}" enviado com sucesso!`);

                // Recarregar anexos se o modal estiver aberto
                if (modalAnexosVisible) {
                    await carregarAnexos(pedidoParaUpload);
                }

                setModalUploadVisible(false);
                // Limpar o input
                event.target.value = '';
            } else {
                // Ler a resposta apenas uma vez
                const responseText = await response.text();
                let errorMessage = 'Erro ao enviar anexo';

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    console.error('Resposta do servidor:', responseText);
                    errorMessage = `Erro do servidor: ${response.status}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Erro ao enviar anexo:', error);
            alert(`Erro ao enviar anexo: ${error.message}`);
        } finally {
            setUploadingFile(false);
        }
    };

    // Função para deletar anexo
    const deletarAnexo = async (anexoId) => {
        if (!confirm('Tem certeza que deseja deletar este anexo?')) {
            return;
        }

        try {
            const response = await fetch(`https://backend.advir.pt/api/anexo-pedido/${anexoId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Anexo deletado com sucesso!');
                // Recarregar anexos
                if (pedidoAnexos) {
                    await carregarAnexos(pedidoAnexos.ID);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao deletar anexo');
            }
        } catch (error) {
            console.error('Erro ao deletar anexo:', error);
            alert(`Erro ao deletar anexo: ${error.message}`);
        }
    };

    // Get estado based on the input
    const getEstado = (estado) => {
        switch (estado) {
            case "3":
                return "Reportado para Parceiro";
            case "2":
                return "Em curso Equipa Advir";
            case "4":
                return "Aguarda resposta Cliente";
            case "1":
                return "Aguardar intervenção equipa Advir";
            case "0":
                return "Terminado";
            default:
                return "Desconhecido";
        }
    };

    // Get estado color baseado no input
    const getEstadoColor = (estado) => {
        switch (estado) {
            case "3":
                return "#ff9800"; // Laranja
            case "2":
                return "#2196F3"; // Azul
            case "4":
                return "#9C27B0"; // Roxo
            case "1":
                return "#f44336"; // Vermelho
            case "0":
                return "#4CAF50"; // Verde
            default:
                return "#757575"; // Cinza
        }
    };

    // Get prioridade based on the input
    const getPrioridade = (prioridade) => {
        switch (prioridade) {
            case "AL":
            case "3":
                return "Alta";
            case "MD":
            case "2":
                return "Média";
            case "BX":
            case "1":
                return "Baixa";
            default:
                return "Desconhecida";
        }
    };

    // Get prioridade color
    const getPrioridadeColor = (prioridade) => {
        switch (prioridade) {
            case "AL":
            case "3":
                return "#f44336"; // Vermelho
            case "MD":
            case "2":
                return "#ff9800"; // Laranja
            case "BX":
            case "1":
                return "#4CAF50"; // Verde
            default:
                return "#757575"; // Cinza
        }
    };

    // Get serie based on the input
    const getSerie = (serie) => {
        switch (serie) {
            case "2024":
                return "2024";
            case "2025":
                return "2025";
            default:
                return serie || "Desconhecida";
        }
    };

    // Toggle section expansion
    const toggleSection = (numProcesso) => {
        setExpandedSections((prevState) => ({
            ...prevState,
            [numProcesso]: !prevState[numProcesso],
        }));
    };

    // Render individual pedido item
    const renderPedidoDetails = (pedido) => (
        <View style={styles.pedidoDetailContainer}>
            <View style={styles.pedidoInfoRow}>
                <View style={styles.pedidoInfoColumn}>
                    <View style={styles.infoGroup}>
                        <Text style={styles.pedidoDetailLabel}>Cliente</Text>
                        <Text style={styles.pedidoDetailValue}>
                            {pedido.Cliente} - {pedido.Nome}
                        </Text>
                    </View>

                    <View style={styles.infoGroup}>
                        <Text style={styles.pedidoDetailLabel}>
                            Data de Abertura
                        </Text>
                        <Text style={styles.pedidoDetailValue}>
                            {new Date(
                                pedido.DataHoraAbertura,
                            ).toLocaleDateString()}{" "}
                            {new Date(
                                pedido.DataHoraAbertura,
                            ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </Text>
                    </View>
                </View>

                <View style={styles.pedidoInfoColumn}>
                    <View style={styles.badgeRow}>
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor:
                                        getPrioridadeColor(pedido.Prioridade) +
                                        "20",
                                    borderColor: getPrioridadeColor(
                                        pedido.Prioridade,
                                    ),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    {
                                        color: getPrioridadeColor(
                                            pedido.Prioridade,
                                        ),
                                    },
                                ]}
                            >
                                {getPrioridade(pedido.Prioridade)}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor:
                                        getEstadoColor(pedido.Estado) + "20",
                                    borderColor: getEstadoColor(pedido.Estado),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    { color: getEstadoColor(pedido.Estado) },
                                ]}
                            >
                                {getEstado(pedido.Estado)}
                            </Text>
                        </View>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {getSerie(pedido.Serie)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.descriptionContainer}>
                <Text style={styles.pedidoDetailLabel}>Descrição</Text>
                <Text style={styles.descriptionText}>
                    {pedido.DescricaoProb}
                </Text>
            </View>
        </View>
    );

    const prioridades = [
        { label: "Baixa", value: "1" },
        { label: "Média", value: "2" },
        { label: "Alta", value: "3" },
    ];

    const estados = [
        {
            label: "Em Espera",
            value: "1",
            descricao: "Aguardar intervenção equipa Advir",
        },
        {
            label: "Pendentes",
            value: "pendentes",
            descricao:
                "Inclui: Em curso Equipa Advir, Reportado para Parceiro, Aguarda resposta Cliente",
        },
        { label: "Finalizados", value: "0", descricao: "Terminado" },
    ];

    const series = [
        { label: "2024", value: "2024", descricao: "2024" },
        { label: "2025", value: "2025", descricao: "2025" },
    ];

    const renderFilterMenu = () => (
        <View
            style={[styles.filterMenu, !showFilters && styles.filterMenuClosed]}
        >
            <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filtros</Text>
                <TouchableOpacity
                    style={styles.toggleFiltersButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <FontAwesomeIcon
                        icon={showFilters ? faChevronUp : faChevronDown}
                        style={styles.filterIcon}
                        size={16}
                    />
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filterContent}>
                    <Text style={styles.filterLabel}>Prioridade</Text>
                    <View style={styles.filterGroup}>
                        {prioridades.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterPrioridade === value &&
                                    styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterPrioridade((prev) =>
                                        prev === value ? "" : value,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterPrioridade === value &&
                                        styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Estado</Text>
                    <View style={styles.filterGroup}>
                        {estados.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterEstado === value &&
                                    styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterEstado((prev) =>
                                        prev === value ? "" : value,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterEstado === value &&
                                        styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Série</Text>
                    <View style={styles.filterGroup}>
                        {series.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterSerie === value &&
                                    styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterSerie((prev) =>
                                        prev === value ? "" : value,
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterSerie === value &&
                                        styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );

    // Render section for each NumProcesso
    const renderSection = ({ item }) => {
        if (!item || !item[0]) return null; // Evita erros com grupos inválidos

        const numProcesso = item[0].NumProcesso || "Desconhecido";
        const cliente = item[0].Nome || "Cliente Desconhecido";
        const isExpanded = expandedSections[numProcesso];
        const estado = item[0].Estado || "0";

        return (
            <View
                style={[
                    styles.sectionContainer,
                    { borderLeftColor: getEstadoColor(estado) },
                ]}
            >
                <View style={styles.sectionHeaderContainer}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => toggleSection(numProcesso)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.headerTitleContainer}>
                            <FontAwesomeIcon
                                icon={isExpanded ? faChevronUp : faChevronDown}
                                style={styles.expandIcon}
                                size={14}
                            />
                            <Text style={styles.sectionHeaderText}>
                                {`${numProcesso} - ${cliente}`}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={async () => {
                                try {
                                    await AsyncStorage.setItem(
                                        "intervencaoId",
                                        item[0].ID.toString(),
                                    );
                                    navigation.navigate("Intervencoes", {
                                        reload: true,
                                    });
                                } catch (error) {
                                    console.error(
                                        "Erro ao armazenar o ID:",
                                        error,
                                    );
                                }
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faExpand}
                                style={styles.icon}
                                size={16}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                setPedidoAnexos(item[0]);
                                carregarAnexos(item[0].ID);
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faSearch}
                                style={styles.icon}
                                size={16}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.uploadButton]}
                            onPress={() => {
                                setPedidoParaUpload(item[0].ID);
                                setModalUploadVisible(true);
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faPlus}
                                style={styles.icon}
                                size={16}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                setProcessoParaFechar(item[0].ID);
                                setModalCloseVisible(true);
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faLock}
                                style={styles.icon}
                                size={16}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => {
                                setPedidoToDelete(item[0].ID);
                                setModalVisible(true);
                            }}
                        >
                            <FontAwesomeIcon
                                icon={faTrash}
                                style={styles.iconDelete}
                                size={16}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {isExpanded && (
                    <View style={styles.pedidosContainer}>
                        {item.map((pedido) => (
                            <View
                                key={pedido.ID}
                                style={styles.pedidoContainer}
                            >
                                {renderPedidoDetails(pedido)}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <div style={styles.container}>
            <HeaderWithNotifications
                userId={userTecnicoID}
                title={t("Pedidos de Assistência")}
            />
            <div style={{ padding: "20px" }}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <FontAwesomeIcon
                            icon={faSearch}
                            style={styles.searchIcon}
                            size={18}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Procurar..."
                            value={searchTerm}
                            onChangeText={handleSearch}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate("RegistarPedido")}
                    >
                        <FontAwesomeIcon
                            icon={faPlus}
                            style={styles.addButtonIcon}
                            size={16}
                        />
                        <Text style={styles.addButtonText}>Criar Pedido</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.analyticsButton}
                        onPress={() =>
                            navigation.navigate("DashboardAnalytics")
                        }
                    >
                        <FontAwesomeIcon
                            icon={faChartLine}
                            style={styles.analyticsButtonIcon}
                            size={16}
                        />
                        <Text style={styles.analyticsButtonText}>
                            Analytics
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.filterToggleButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <FontAwesomeIcon
                        icon={faFilter}
                        style={styles.filterToggleIcon}
                        size={14}
                    />
                    <Text style={styles.filterToggleText}>
                        {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
                    </Text>
                </TouchableOpacity>

                {renderFilterMenu()}

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.tableContainer}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color="#1792FE"
                                style={styles.loadingIndicator}
                            />
                            <Text style={styles.loadingText}>
                                Carregando pedidos...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredData}
                            renderItem={renderSection}
                            keyExtractor={(group) =>
                                group[0]?.NumProcesso?.toString() ||
                                Math.random().toString()
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyListContainer}>
                                    <Text style={styles.emptyListText}>
                                        Nenhum pedido de assistência encontrado.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyListButton}
                                        onPress={() =>
                                            navigation.navigate(
                                                "RegistarPedido",
                                            )
                                        }
                                    >
                                        <Text
                                            style={styles.emptyListButtonText}
                                        >
                                            Criar Primeiro Pedido
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            }
                            contentContainerStyle={styles.flatListContent}
                        />
                    )}
                </View>

                {/* Confirmation Modal */}
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
                                Tem certeza que deseja eliminar este pedido?
                                Esta ação não pode ser desfeita.
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
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        styles.deleteConfirmButton,
                                    ]}
                                    onPress={handleDeleteConfirmation}
                                >
                                    <Text
                                        style={styles.deleteConfirmButtonText}
                                    >
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalCloseVisible}
                    onRequestClose={() => setModalCloseVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalView}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Confirmar Fecho de Processo
                                </Text>
                            </View>
                            <Text style={styles.modalText}>
                                Tem a certeza que deseja fechar o processo?
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        styles.cancelButton,
                                    ]}
                                    onPress={() => setModalCloseVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalButton,
                                        styles.deleteConfirmButton,
                                    ]}
                                    onPress={async () => {
                                        await FechaPedido(processoParaFechar);
                                        setModalCloseVisible(false);
                                    }}
                                >
                                    <Text
                                        style={styles.deleteConfirmButtonText}
                                    >
                                        Sim
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Modal para visualizar anexos */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalAnexosVisible}
                    onRequestClose={() => setModalAnexosVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={[styles.modalView, styles.anexosModalView]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Anexos do Pedido {pedidoAnexos?.NumProcesso}
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setModalAnexosVisible(false)}
                                >
                                    <FontAwesomeIcon
                                        icon={faClose}
                                        style={styles.closeIcon}
                                        size={20}
                                    />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.anexosScrollView}>
                                {anexosPedido.length === 0 ? (
                                    <Text style={styles.noAnexosText}>
                                        Nenhum anexo encontrado para este pedido.
                                    </Text>
                                ) : (
                                    anexosPedido.map((anexo) => (
                                        <View key={anexo.id} style={styles.anexoCard}>
                                            <View style={styles.anexoInfo}>
                                                <Text style={styles.anexoNome}>
                                                    {anexo.nome_arquivo}
                                                </Text>
                                                <Text style={styles.anexoDetalhes}>
                                                    Tamanho: {Math.round(anexo.tamanho / 1024)} KB
                                                </Text>
                                                <Text style={styles.anexoDetalhes}>
                                                    Enviado em: {new Date(anexo.data_upload).toLocaleString('pt-PT')}
                                                </Text>
                                            </View>
                                            <View style={styles.anexoButtonsContainer}>
                                                <TouchableOpacity
                                                    style={styles.downloadButton}
                                                    onPress={() => downloadAnexo(anexo.id, anexo.nome_arquivo)}
                                                >
                                                    <Text style={styles.downloadButtonText}>
                                                        Download
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteAnexoButton}
                                                    onPress={() => deletarAnexo(anexo.id)}
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faTrash}
                                                        style={styles.deleteAnexoIcon}
                                                        size={12}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Modal para upload de anexos */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalUploadVisible}
                    onRequestClose={() => setModalUploadVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={[styles.modalView, styles.uploadModalView]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Adicionar Anexo
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setModalUploadVisible(false)}
                                >
                                    <FontAwesomeIcon
                                        icon={faClose}
                                        style={styles.closeIcon}
                                        size={20}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.uploadContent}>
                                <Text style={styles.uploadInstructions}>
                                    Selecione um arquivo para anexar ao pedido:
                                </Text>

                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                                    onChange={uploadAnexo}
                                    disabled={uploadingFile}
                                    style={styles.fileInput}
                                />

                                {uploadingFile && (
                                    <View style={styles.uploadingContainer}>
                                        <ActivityIndicator size="small" color="#1792FE" />
                                        <Text style={styles.uploadingText}>
                                            Enviando anexo...
                                        </Text>
                                    </View>
                                )}

                                <Text style={styles.fileTypesText}>
                                    Tipos permitidos: JPG, PNG, GIF, PDF, DOC, DOCX, TXT
                                </Text>
                                <Text style={styles.fileSizeText}>
                                    Tamanho máximo: 10MB
                                </Text>
                            </View>
                        </View>
                    </View>
                </Modal>
            </div>
        </div>
    );
};

// Define styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#d4e4ff",
        overflow: "auto",
        maxHeight: "100vh",
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
    },
    title: {
        fontSize: 22,
        color: "#fff",
        fontWeight: "700",
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
    filterToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 8,
    },
    filterToggleIcon: {
        color: "#1792FE",
        marginRight: 6,
    },
    filterToggleText: {
        color: "#1792FE",
        fontWeight: "500",
        fontSize: 14,
    },
    filterMenu: {
        marginHorizontal: 20,
        marginBottom: 15,
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        overflow: "hidden",
    },
    filterMenuClosed: {
        marginBottom: 10,
    },
    filterHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: (showFilters) =>
            showFilters ? "#eee" : "transparent",
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#444",
    },
    toggleFiltersButton: {
        padding: 5,
    },
    filterIcon: {
        color: "#666",
    },
    filterContent: {
        padding: 15,
        paddingTop: 5,
    },
    filterLabel: {
        fontWeight: "600",
        marginVertical: 8,
        color: "#555",
        fontSize: 14,
    },
    filterGroup: {
        flexDirection: "row",
        marginBottom: 15,
    },
    filterButton: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8f9fa",
    },
    filterButtonSelected: {
        backgroundColor: "#1792FE",
        borderColor: "#1792FE",
    },
    filterButtonText: {
        color: "#555",
        fontWeight: "500",
        fontSize: 13,
    },
    filterButtonTextSelected: {
        color: "#fff",
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
    tableContainer: {
        flex: 1,
        paddingHorizontal: 20,
        maxHeight: "calc(100vh - 300px)",
        overflow: "auto",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingIndicator: {
        marginBottom: 15,
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
    },
    flatListContent: {
        paddingBottom: 20,
    },
    sectionContainer: {
        marginBottom: 15,
        backgroundColor: "#fff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 4,
    },
    sectionHeaderContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
    },
    sectionHeader: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    expandIcon: {
        color: "#666",
        marginRight: 8,
    },
    sectionHeaderText: {
        fontWeight: "600",
        fontSize: 15,
        color: "#333",
    },
    actionButtonsContainer: {
        flexDirection: "row",
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        marginLeft: 5,
        backgroundColor: "#f0f7ff",
    },
    deleteButton: {
        backgroundColor: "#ffebee",
    },
    uploadButton: {
        backgroundColor: "#e8f5e8",
    },
    icon: {
        color: "#1792FE",
    },
    iconDelete: {
        color: "#f44336",
    },
    pedidosContainer: {
        padding: 15,
        paddingTop: 0,
    },
    pedidoContainer: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 15,
    },
    pedidoDetailContainer: {
        marginVertical: 5,
    },
    pedidoInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    pedidoInfoColumn: {
        flex: 1,
    },
    infoGroup: {
        marginBottom: 8,
    },
    pedidoDetailLabel: {
        fontWeight: "600",
        fontSize: 13,
        color: "#666",
        marginBottom: 3,
    },
    pedidoDetailValue: {
        fontSize: 14,
        color: "#333",
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-end",
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: "#f0f0f0",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        marginLeft: 6,
        marginBottom: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#555",
    },
    descriptionContainer: {
        backgroundColor: "#f9f9f9",
        padding: 12,
        borderRadius: 8,
        marginTop: 5,
    },
    descriptionText: {
        fontSize: 14,
        color: "#444",
        lineHeight: 20,
    },
    emptyListContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    emptyListText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    emptyListButton: {
        backgroundColor: "#1792FE",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    emptyListButtonText: {
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
        textAlign: "center",
        fontSize: 15,
        paddingHorizontal: 20,
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
    deleteConfirmButton: {
        backgroundColor: "#f44336",
    },
    cancelButtonText: {
        color: "#666",
        fontWeight: "600",
        fontSize: 15,
    },
    deleteConfirmButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15,
    },
    analyticsButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#28a745",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: "#28a745",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
        marginLeft: 10,
    },
    analyticsButtonIcon: {
        color: "#fff",
        marginRight: 6,
    },
    analyticsButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    anexosModalView: {
        width: "90%",
        maxWidth: 600,
        maxHeight: "80%",
    },
    closeButton: {
        padding: 5,
    },
    closeIcon: {
        color: "white",
    },
    anexosScrollView: {
        maxHeight: 400,
        padding: 10,
    },
    noAnexosText: {
        textAlign: "center",
        color: "#666",
        fontSize: 16,
        padding: 20,
    },
    anexoCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    anexoInfo: {
        flex: 1,
    },
    anexoNome: {
        fontWeight: "600",
        fontSize: 14,
        color: "#333",
        marginBottom: 4,
    },
    anexoDetalhes: {
        fontSize: 12,
        color: "#666",
        marginBottom: 2,
    },
    downloadButton: {
        backgroundColor: "#1792FE",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    downloadButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "600",
    },
    uploadModalView: {
        width: "85%",
        maxWidth: 500,
    },
    uploadContent: {
        padding: 20,
    },
    uploadInstructions: {
        fontSize: 14,
        color: "#333",
        marginBottom: 15,
        textAlign: "center",
    },
    fileInput: {
        width: "100%",
        padding: 10,
        border: "2px dashed #1792FE",
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: "#f8f9ff",
    },
    uploadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
    },
    uploadingText: {
        marginLeft: 10,
        color: "#1792FE",
        fontSize: 14,
    },
    fileTypesText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        marginBottom: 5,
    },
    fileSizeText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    anexoButtonsContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    deleteAnexoButton: {
        backgroundColor: "#f44336",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    deleteAnexoIcon: {
        color: "white",
    },
});

export default PedidosAssistencia;