import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
    Animated,
    ScrollView,
    Dimensions,
} from "react-native";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";
import { styles } from './Css/ObrasStyles';
import { secureStorage } from '../../utils/secureStorage';
const { width, height } = Dimensions.get("window");

const ListarObras = ({ navigation }) => {
    const [obras, setObras] = useState([]);
    const [filteredObras, setFilteredObras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("Inicializando...");
    const [errorMessage, setErrorMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [obrasImportadas, setObrasImportadas] = useState([]);
    const [animatedValue] = useState(new Animated.Value(0));
    const [searchAnimated] = useState(new Animated.Value(0));
    const [expandedCards, setExpandedCards] = useState({});
    const [filterType, setFilterType] = useState("with_qr"); // 'all', 'with_qr', 'without_qr'
    const [responsaveis, setResponsaveis] = useState({}); // Store responsaveis by obra codigo

    // Animação principal para efeitos visuais
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    }, []);

    // Animação da barra de pesquisa
    useEffect(() => {
        Animated.timing(searchAnimated, {
            toValue: searchTerm ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [searchTerm]);

    const pulseAnimation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
    });

    const searchBarColor = searchAnimated.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(255,255,255,0.9)", "rgba(23,146,254,0.1)"],
    });

    useEffect(() => {
        fetchObras();
    }, []);

    const fetchObras = async () => {
        try {
            setLoading(true);
            setLoadingProgress(10);
            setLoadingMessage("Verificando autenticação...");

            const token = await secureStorage.getItem("painelAdminToken");
            const urlempresa = await secureStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                setErrorMessage("Token ou URL da empresa não encontrados.");
                setLoading(false);
                return;
            }

            setLoadingProgress(25);
            setLoadingMessage("A carregar Obras...");

            const response = await fetch(
                `https://webapiprimavera.advir.pt/listarObras/listarObras`,
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
                throw new Error(`Erro: ${response.statusText}`);
            }

            setLoadingProgress(50);
            setLoadingMessage("Processando dados das obras...");

            const data = await response.json();

            if (data.DataSet && data.DataSet.Table) {
                setLoadingProgress(70);
                setLoadingMessage("Carregando obras importadas...");

                setObras(data.DataSet.Table);
                setFilteredObras(data.DataSet.Table);

                // Carregar obras importadas em paralelo
                await fetchObrasImportadas();

                setLoadingProgress(85);
                setLoadingMessage("Carregando responsáveis das obras...");

                setLoadingProgress(100);
                setLoadingMessage("Finalizando...");
            } else {
                setErrorMessage("Estrutura da resposta inválida.");
            }
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            // Pequeno delay para mostrar 100% antes de esconder
            setTimeout(() => {
                setLoading(false);
            }, 500);
        }
    };

    const importarObra = async (obra) => {
        try {
            const token = secureStorage.getItem("loginToken");
            const empresaId = await secureStorage.getItem("empresa_id");

            const response = await fetch("https://backend.advir.pt/api/obra", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    codigo: obra.Codigo,
                    nome: obra.Titulo,
                    estado: "Ativo",
                    localizacao: obra.Localizacao || "Desconhecida",
                    empresa_id: empresaId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Obra importada com sucesso!");
                fetchObrasImportadas();
            } else {
                alert(`Erro ao importar obra: ${data.message}`);
            }
        } catch (error) {
            console.error("Erro ao importar obra:", error);
            alert("Erro ao importar obra");
        }
    };

    const fetchObrasImportadas = async () => {
        try {
            setLoadingProgress(80);
            setLoadingMessage("Sincronizando dados locais...");

            const token = secureStorage.getItem("loginToken");

            if (!token) {
                console.warn("Token local não encontrado");
                setObrasImportadas([]);
                return;
            }

            const response = await fetch("https://backend.advir.pt/api/obra", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (response.ok) {
                setObrasImportadas(data);
                setLoadingProgress(95);
                setLoadingMessage("Aplicando filtros...");
            } else {
                console.warn("Erro ao carregar obras importadas");
                setObrasImportadas([]);
            }
        } catch (error) {
            console.error("Erro ao buscar obras importadas:", error);
            setObrasImportadas([]);
        }
    };

    const fetchResponsavelObra = async (codigoObra) => {
        try {
            const token = await secureStorage.getItem("painelAdminToken");
            const urlempresa = await secureStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                return null;
            }

            // Encode the codigo properly to handle special characters and spaces
            const encodedCodigo = encodeURIComponent(codigoObra);

            const response = await fetch(
                `https://webapiprimavera.advir.pt/listarObras/GetResponsavel/${encodedCodigo}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.DataSet && data.DataSet.Table && data.DataSet.Table.length > 0) {
                    return data.DataSet.Table[0].CDU_AcessoUtilizador1 || data.DataSet.Table[0].Nome || data.DataSet.Table[0].name || "N/A";
                }
            }
        } catch (error) {
            console.error(`Erro ao buscar responsável da obra ${codigoObra}:`, error);
        }
        return null;
    };

    const fetchAllResponsaveis = async (obras) => {
        const responsaveisTemp = {};
        
        // Only fetch responsaveis for imported obras to optimize performance
        for (const obra of obras) {
            const obraImportada = obrasImportadas.find(
                (importada) => importada.codigo === obra.Codigo
            );
            
            if (obraImportada) {
                const responsavel = await fetchResponsavelObra(obra.Codigo);
                if (responsavel) {
                    responsaveisTemp[obra.Codigo] = responsavel;
                }
            }
        }
        
        setResponsaveis(responsaveisTemp);
    };

    const applyFilters = (searchText = searchTerm, filter = filterType) => {
        let filtered = [...obras];

        // Aplicar filtro de pesquisa
        if (searchText.trim() !== "") {
            filtered = filtered.filter(
                (obra) =>
                    obra.Codigo.toLowerCase().includes(
                        searchText.toLowerCase(),
                    ) ||
                    obra.Titulo.toLowerCase().includes(
                        searchText.toLowerCase(),
                    ),
            );
        }

        // Aplicar filtro de QR Code
        if (filter === "with_qr") {
            filtered = filtered.filter((obra) =>
                obrasImportadas.some(
                    (importada) => importada.codigo === obra.Codigo,
                ),
            );
        } else if (filter === "without_qr") {
            filtered = filtered.filter(
                (obra) =>
                    !obrasImportadas.some(
                        (importada) => importada.codigo === obra.Codigo,
                    ),
            );
        }

        setFilteredObras(filtered);
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        applyFilters(text, filterType);
    };

    const handleFilterChange = (newFilter) => {
        setFilterType(newFilter);
        applyFilters(searchTerm, newFilter);
    };

    // Atualizar filtros quando obras importadas mudarem
    useEffect(() => {
        if (obras.length > 0 && obrasImportadas.length >= 0) {
            applyFilters(searchTerm, filterType);
        }
    }, [obrasImportadas, obras]);

    // Fetch responsaveis when obras importadas are loaded
    useEffect(() => {
        if (obras.length > 0 && obrasImportadas.length > 0) {
            fetchAllResponsaveis(obras);
        }
    }, [obrasImportadas]);

    const toggleCardExpansion = (itemId) => {
        setExpandedCards((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={["#1792FE", "#0B5ED7"]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Animated.View
                    style={[
                        styles.headerContent,
                        { transform: [{ scale: pulseAnimation }] },
                    ]}
                >
                    <FontAwesome
                        name="building"
                        size={32}
                        color="#FFFFFF"
                        style={styles.headerIcon}
                    />
                    <Text style={styles.headerTitle}>Gestão de Obras</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredObras.length} obra
                        {filteredObras.length !== 1 ? "s" : ""} encontrada
                        {filteredObras.length !== 1 ? "s" : ""}
                    </Text>
                    <TouchableOpacity
                        style={styles.headerMapaButton}
                        onPress={() => navigation.navigate("MapaRegistos")}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.3)"]}
                            style={styles.headerMapaButtonGradient}
                        >
                            <FontAwesome
                                name="map-marker"
                                size={18}
                                color="#FFFFFF"
                            />
                            <Text style={styles.headerMapaButtonText}>
                                Ver Mapa de Registos
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </LinearGradient>
        </View>
    );

    const renderSearchBar = () => (
        <Animated.View
            style={[
                styles.searchContainer,
                { backgroundColor: searchBarColor },
            ]}
        >
            <View style={styles.searchInputContainer}>
                <Ionicons
                    name="search"
                    size={20}
                    color="#1792FE"
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Procurar por código ou título da obra..."
                    placeholderTextColor="#666"
                    value={searchTerm}
                    onChangeText={handleSearch}
                />
                {searchTerm ? (
                    <TouchableOpacity
                        onPress={() => handleSearch("")}
                        style={styles.clearButton}
                    >
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                ) : null}
            </View>
        </Animated.View>
    );

    const renderFilters = () => {
        const getFilterStats = () => {
            const withQR = obras.filter((obra) =>
                obrasImportadas.some(
                    (importada) => importada.codigo === obra.Codigo,
                ),
            ).length;
            const withoutQR = obras.length - withQR;

            return { total: obras.length, withQR, withoutQR };
        };

        const stats = getFilterStats();

        return (
            <View style={styles.filtersContainer}>
                <Text style={styles.filtersTitle}>
                    <FontAwesome name="filter" size={16} color="#1792FE" />{" "}
                    Filtros
                </Text>
                <View style={styles.filterButtons}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filterType === "all" && styles.filterButtonActive,
                        ]}
                        onPress={() => handleFilterChange("all")}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={
                                filterType === "all"
                                    ? ["#1792FE", "#0B5ED7"]
                                    : [
                                        "rgba(255,255,255,0.8)",
                                        "rgba(255,255,255,0.6)",
                                    ]
                            }
                            style={styles.filterButtonGradient}
                        >
                            <FontAwesome
                                name="list"
                                size={14}
                                color={
                                    filterType === "all" ? "#FFFFFF" : "#1792FE"
                                }
                            />
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    filterType === "all" &&
                                    styles.filterButtonTextActive,
                                ]}
                            >
                                Todas ({stats.total})
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filterType === "with_qr" &&
                            styles.filterButtonActive,
                        ]}
                        onPress={() => handleFilterChange("with_qr")}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={
                                filterType === "with_qr"
                                    ? ["#28a745", "#20c997"]
                                    : [
                                        "rgba(255,255,255,0.8)",
                                        "rgba(255,255,255,0.6)",
                                    ]
                            }
                            style={styles.filterButtonGradient}
                        >
                            <FontAwesome
                                name="qrcode"
                                size={14}
                                color={
                                    filterType === "with_qr"
                                        ? "#FFFFFF"
                                        : "#28a745"
                                }
                            />
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    filterType === "with_qr" &&
                                    styles.filterButtonTextActive,
                                ]}
                            >
                                Com QR ({stats.withQR})
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filterType === "without_qr" &&
                            styles.filterButtonActive,
                        ]}
                        onPress={() => handleFilterChange("without_qr")}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={
                                filterType === "without_qr"
                                    ? ["#ffc107", "#ff9800"]
                                    : [
                                        "rgba(255,255,255,0.8)",
                                        "rgba(255,255,255,0.6)",
                                    ]
                            }
                            style={styles.filterButtonGradient}
                        >
                            <FontAwesome
                                name="exclamation-triangle"
                                size={14}
                                color={
                                    filterType === "without_qr"
                                        ? "#FFFFFF"
                                        : "#ffc107"
                                }
                            />
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    filterType === "without_qr" &&
                                    styles.filterButtonTextActive,
                                ]}
                            >
                                Sem QR ({stats.withoutQR})
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderObra = ({ item, index }) => {
        const obraExistente = obrasImportadas.find(
            (o) => o.codigo === item.Codigo,
        );
        const isExpanded = expandedCards[item.ID];

        return (
            <View style={styles.obraCard}>
                <LinearGradient
                    colors={[
                        "rgba(255,255,255,0.95)",
                        "rgba(255,255,255,0.85)",
                    ]}
                    style={styles.cardGradient}
                >
                    <TouchableOpacity
                        onPress={() => toggleCardExpansion(item.ID)}
                        style={styles.cardHeader}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardHeaderLeft}>
                            <View style={styles.iconContainer}>
                                <FontAwesome
                                    name="building-o"
                                    size={24}
                                    color="#1792FE"
                                />
                            </View>
                            <View style={styles.cardHeaderText}>
                                <Text
                                    style={styles.obraTitle}
                                    numberOfLines={1}
                                >
                                    {item.Titulo}
                                </Text>
                                <Text style={styles.obraCodigo}>
                                    Código: {item.Codigo}
                                </Text>
                                <Text style={styles.obraCodigo}>
                                    Estado: {item.Estado}
                                </Text>
                                {responsaveis[item.Codigo] && (
                                    <Text style={styles.obraCodigo}>
                                        Responsável: {responsaveis[item.Codigo]}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Animated.View
                            style={{
                                transform: [
                                    { rotate: isExpanded ? "180deg" : "0deg" },
                                ],
                            }}
                        >
                            <Ionicons
                                name="chevron-down"
                                size={20}
                                color="#1792FE"
                            />
                        </Animated.View>
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={styles.cardContent}>
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons
                                    name="information"
                                    size={18}
                                    color="#1792FE"
                                />
                                <Text style={styles.detailLabel}>
                                    Situação:
                                </Text>
                                <Text style={styles.detailValue}>
                                    {item.Situacao}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <FontAwesome
                                    name="calendar"
                                    size={18}
                                    color="#1792FE"
                                />
                                <Text style={styles.detailLabel}>Data:</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(
                                        item.DataAdjudicacao,
                                    ).toLocaleDateString("pt-PT")}
                                </Text>
                            </View>

                            {responsaveis[item.Codigo] && (
                                <View style={styles.detailRow}>
                                    <FontAwesome
                                        name="user"
                                        size={18}
                                        color="#1792FE"
                                    />
                                    <Text style={styles.detailLabel}>Responsável:</Text>
                                    <Text style={styles.detailValue}>
                                        {responsaveis[item.Codigo]}
                                    </Text>
                                </View>
                            )}

                            {obraExistente ? (
                                <View style={styles.qrContainer}>
                                    <Text style={styles.qrTitle}>
                                        QR Code da Obra
                                    </Text>
                                    <View style={styles.qrCodeWrapper}>
                                        <Image
                                            source={{
                                                uri: obraExistente.qrCode,
                                            }}
                                            style={styles.qrCodeImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={styles.detailsButton}
                                        onPress={() => {
                                            const qrCodeSrc =
                                                obraExistente?.qrCode?.startsWith(
                                                    "data:image",
                                                )
                                                    ? obraExistente.qrCode
                                                    : `data:image/png;base64,${obraExistente.qrCode}`;

                                            if (!qrCodeSrc) {
                                                alert(
                                                    "QR Code não disponível.",
                                                );
                                                return;
                                            }

                                            const printWindow = window.open(
                                                "",
                                                "_blank",
                                            );
                                            if (printWindow) {
                                                printWindow.document.write(`
    <html>
        <head>
            <title>Imprimir QR Code - ${item.Titulo}</title>
           <style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 0;
        }
        body {
            margin: 0;
        }
    }

    html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-family: Arial, sans-serif;
    }

    .print-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        page-break-inside: avoid;
    }

    h1 {
        font-size: 20px;
        margin-bottom: 20px;
        text-align: center;
        color: #333;
    }

    img {
        width: 250px;
        height: 250px;
        object-fit: contain;
    }
</style>

        </head>
        <body onload="window.print(); window.onafterprint = () => window.close();">
    <div class="print-wrapper">
        <h1>${item.Codigo}</h1>
        <h1>${item.Titulo}</h1>
        <img src="${qrCodeSrc}" alt="QR Code da Obra" />
    </div>
</body>

    </html>
`);

                                                printWindow.document.close();
                                            } else {
                                                alert(
                                                    "Pop-up bloqueado. Permita pop-ups neste site.",
                                                );
                                            }
                                        }}
                                    >
                                        <LinearGradient
                                            colors={["#28a745", "#20c997"]}
                                            style={styles.buttonGradient}
                                        >
                                            <FontAwesome
                                                name="print"
                                                size={16}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.buttonText}>
                                                Imprimir QR Code
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.importButton}
                                        onPress={() => {
                                            if (!obraExistente) {
                                                alert(
                                                    "Esta obra ainda não foi importada.",
                                                );
                                                return;
                                            }

                                            navigation.navigate("PessoalObra", {
                                                obraId: obraExistente.id, // ✅ ID real da tabela `obra`
                                                nomeObra: obraExistente.nome,
                                            });
                                        }}
                                    >
                                        <LinearGradient
                                            colors={["#0B5ED7", "#1792FE"]}
                                            style={styles.buttonGradient}
                                        >
                                            <FontAwesome
                                                name="users"
                                                size={16}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.buttonText}>
                                                Ver Pessoal em Obra
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>


                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.importButton}
                                    onPress={() => importarObra(item)}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={["#1792FE", "#0B5ED7"]}
                                        style={styles.buttonGradient}
                                    >
                                        <FontAwesome
                                            name="download"
                                            size={16}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.buttonText}>
                                            Importar Obra
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </LinearGradient>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <FontAwesome name="search" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhuma obra encontrada</Text>
            <Text style={styles.emptySubtitle}>
                {searchTerm
                    ? `Não foram encontradas obras para "${searchTerm}"`
                    : "Ainda não existem obras registadas"}
            </Text>
        </View>
    );

    const renderLoadingState = () => (
        <View style={styles.loadingContainer}>
            <Animated.View
                style={[
                    styles.loadingContent,
                    { transform: [{ scale: pulseAnimation }] },
                ]}
            >
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: `${loadingProgress}%` },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round(loadingProgress)}%
                    </Text>
                </View>
            </Animated.View>
        </View>
    );

    const renderErrorState = () => (
        <View style={styles.errorContainer}>
            <FontAwesome
                name="exclamation-triangle"
                size={64}
                color="#dc3545"
            />
            <Text style={styles.errorTitle}>Erro ao carregar</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchObras}>
                <LinearGradient
                    colors={["#dc3545", "#c82333"]}
                    style={styles.buttonGradient}
                >
                    <FontAwesome name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Tentar Novamente</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    return (
        <LinearGradient
            colors={["#e3f2fd", "#bbdefb", "#90caf9"]}
            style={styles.container}
        >
            {renderHeader()}

            {!loading && !errorMessage && renderSearchBar()}
            {!loading && !errorMessage && renderFilters()}

            {loading ? (
                renderLoadingState()
            ) : errorMessage ? (
                renderErrorState()
            ) : (
                <FlatList
                    data={filteredObras}
                    renderItem={renderObra}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                />
            )}
        </LinearGradient>
    );
};

export default ListarObras;
