import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    FontAwesome,
    MaterialCommunityIcons,
    Ionicons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const MapaRegistos = ({ navigation }) => {
    const [registos, setRegistos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filtroData, setFiltroData] = useState(
        new Date().toISOString().split("T")[0],
    );
    const [obraFiltro, setObraFiltro] = useState("");
    const [userFiltro, setUserFiltro] = useState("");
    const [modalFiltros, setModalFiltros] = useState(false);
    const [modalDetalhes, setModalDetalhes] = useState(false);
    const [registoSelecionado, setRegistoSelecionado] = useState(null);
    const [obras, setObras] = useState([]);
    const [users, setUsers] = useState([]);
    const [mapaLoaded, setMapaLoaded] = useState(false);

    const mapaRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        carregarLeaflet();
        carregarRegistos();
    }, []);

    // Carregar registos quando os filtros mudarem
    useEffect(() => {
        carregarRegistos();
    }, [filtroData, obraFiltro, userFiltro]);

    // Reset user filter when obra filter changes
    useEffect(() => {
        if (obraFiltro !== "") {
            setUserFiltro("");
        }
    }, [obraFiltro]);

    // Inicializar mapa quando os dados estiverem prontos
    useEffect(() => {
        if (mapaLoaded && registos.length > 0) {
            setTimeout(() => {
                inicializarMapa();
            }, 100);
        }
    }, [mapaLoaded, registos]);

    // Cleanup do mapa
    useEffect(() => {
        return () => {
            if (mapaRef.current) {
                try {
                    mapaRef.current.remove();
                } catch (error) {
                    console.log("Erro no cleanup do mapa:", error.message);
                }
                mapaRef.current = null;
            }
        };
    }, []);

    const carregarLeaflet = () => {
        if (window.L && window.L.markerClusterGroup) {
            setMapaLoaded(true);
            return;
        }

        // Carregar CSS do Leaflet
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        // Adicionar estilos personalizados para clusters
        const customStyles = document.createElement("style");
        customStyles.textContent = `
            .marker-cluster-small {
                background-color: rgba(181, 226, 140, 0.6);
                border: 2px solid rgba(110, 204, 57, 0.8);
            }
            .marker-cluster-small div {
                background-color: rgba(110, 204, 57, 0.8);
            }
            .marker-cluster-medium {
                background-color: rgba(241, 211, 87, 0.6);
                border: 2px solid rgba(240, 194, 12, 0.8);
            }
            .marker-cluster-medium div {
                background-color: rgba(240, 194, 12, 0.8);
            }
            .marker-cluster-large {
                background-color: rgba(253, 156, 115, 0.6);
                border: 2px solid rgba(241, 128, 23, 0.8);
            }
            .marker-cluster-large div {
                background-color: rgba(241, 128, 23, 0.8);
            }
            .marker-cluster {
                border-radius: 50%;
                text-align: center;
                color: white;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            .marker-cluster div {
                width: 30px;
                height: 30px;
                margin-left: 5px;
                margin-top: 5px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .marker-cluster span {
                line-height: 1;
                font-size: 12px;
            }
        `;
        document.head.appendChild(customStyles);

        // Carregar CSS do MarkerCluster
        const clusterCSS = document.createElement("link");
        clusterCSS.rel = "stylesheet";
        clusterCSS.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css";
        document.head.appendChild(clusterCSS);

        const clusterDefaultCSS = document.createElement("link");
        clusterDefaultCSS.rel = "stylesheet";
        clusterDefaultCSS.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css";
        document.head.appendChild(clusterDefaultCSS);

        // Carregar JS do Leaflet
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => {
            // Carregar JS do MarkerCluster após o Leaflet
            const clusterScript = document.createElement("script");
            clusterScript.src = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js";
            clusterScript.onload = () => setMapaLoaded(true);
            document.head.appendChild(clusterScript);
        };
        document.head.appendChild(script);
    };

    const carregarRegistos = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("loginToken");
            const empresaId = await AsyncStorage.getItem("empresa_id");

            if (!token) {
                setError("Token de autenticação não encontrado");
                return;
            }

            console.log("Carregando registos com filtros:", {
                data: filtroData,
                obra_id: obraFiltro,
                user_id: userFiltro,
                empresa_id: empresaId,
            });

            let url = `https://backend.advir.pt/api/mapa-registos/registos?`;

            if (filtroData) {
                url += `data=${filtroData}&`;
            }
            if (empresaId) {
                url += `empresa_id=${empresaId}&`;
            }

            console.log("URL da API:", url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }

            let data = await response.json();
            console.log("Dados recebidos da API (antes do filtro):", data);

            // Aplicar filtros no frontend
            let dadosFiltrados = data;

            if (obraFiltro && obraFiltro !== "") {
                dadosFiltrados = dadosFiltrados.filter(registo =>
                    registo.obra && registo.obra.id.toString() === obraFiltro.toString()
                );
                console.log(`Filtro por obra ${obraFiltro} aplicado:`, dadosFiltrados.length, "registos");
            }

            if (userFiltro && userFiltro !== "") {
                dadosFiltrados = dadosFiltrados.filter(registo =>
                    registo.user && registo.user.id.toString() === userFiltro.toString()
                );
                console.log(`Filtro por utilizador ${userFiltro} aplicado:`, dadosFiltrados.length, "registos");
            }

            console.log("Dados finais filtrados:", dadosFiltrados);
            setRegistos(dadosFiltrados);

            // Extrair obras únicas dos dados originais (não filtrados) para manter todas as opções nos filtros
            const obrasMap = new Map();
            data.forEach((registo) => {
                if (registo.obra && registo.obra.id) {
                    obrasMap.set(registo.obra.id, registo.obra);
                }
            });
            const obrasUnicas = Array.from(obrasMap.values());
            setObras(obrasUnicas);

            // Extrair utilizadores únicos baseado na obra filtrada
            const usersMap = new Map();
            let dadosParaExtracaoUsers = data;

            // Se há filtro de obra, usar apenas registos dessa obra para extrair utilizadores
            if (obraFiltro && obraFiltro !== "") {
                dadosParaExtracaoUsers = data.filter(registo =>
                    registo.obra && registo.obra.id.toString() === obraFiltro.toString()
                );
                console.log(`Extraindo utilizadores apenas da obra ${obraFiltro}:`, dadosParaExtracaoUsers.length, "registos");
            }

            dadosParaExtracaoUsers.forEach((registo) => {
                if (registo.user && registo.user.id) {
                    usersMap.set(registo.user.id, registo.user);
                }
            });
            const usersUnicos = Array.from(usersMap.values());
            console.log("Utilizadores únicos encontrados:", usersUnicos.length);
            setUsers(usersUnicos);
        } catch (error) {
            console.error("Erro ao carregar registos:", error);
            setError(error.message || "Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    const inicializarMapa = () => {
        if (!window.L || !registos.length) return;

        const mapContainer = document.getElementById("mapa-registos");
        if (!mapContainer) return;

        // Remover mapa existente
        if (mapaRef.current) {
            try {
                mapaRef.current.remove();
            } catch (error) {
                console.log("Erro ao remover mapa anterior:", error.message);
            }
            mapaRef.current = null;
        }

        // Limpar container
        mapContainer.innerHTML = "";

        // Verificar se há coordenadas válidas
        const registosComCoordenadas = registos.filter(
            (r) =>
                r.latitude &&
                r.longitude &&
                r.latitude !== 0 &&
                r.longitude !== 0,
        );

        if (registosComCoordenadas.length === 0) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border-radius: 15px;">
                    <div style="text-align: center; color: #666;">
                        <i class="fa fa-map-marker" style="font-size: 48px; margin-bottom: 10px;"></i>
                        <div>Nenhum registo com coordenadas válidas</div>
                    </div>
                </div>
            `;
            return;
        }

        // Calcular centro do mapa
        const lats = registosComCoordenadas.map((r) => parseFloat(r.latitude));
        const lngs = registosComCoordenadas.map((r) => parseFloat(r.longitude));

        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        // Criar mapa
        const map = window.L.map("mapa-registos", {
            center: [centerLat, centerLng],
            zoom: 12,
            zoomControl: true,
            attributionControl: true,
        });

        mapaRef.current = map;

        // Adicionar camada do OpenStreetMap
        window.L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "© OpenStreetMap contributors",
            },
        ).addTo(map);

        // Criar ícones personalizados
        const entradaIcon = window.L.divIcon({
            html: '<div style="background-color: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">E</div>',
            className: "custom-marker",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        const saidaIcon = window.L.divIcon({
            html: '<div style="background-color: #dc3545; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">S</div>',
            className: "custom-marker",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        // Criar grupo de clustering
        const markerClusterGroup = window.L.markerClusterGroup({
            // Configurações do cluster
            chunkedLoading: true,
            chunkProgress: function (processed, total, elapsed, layersArray) {
                if (processed === total) {
                    console.log('Todos os marcadores foram processados');
                }
            },
            // Personalizar aparência dos clusters
            iconCreateFunction: function (cluster) {
                const childCount = cluster.getChildCount();
                let className = 'marker-cluster-small';

                if (childCount < 10) {
                    className = 'marker-cluster-small';
                } else if (childCount < 100) {
                    className = 'marker-cluster-medium';
                } else {
                    className = 'marker-cluster-large';
                }

                return new window.L.DivIcon({
                    html: `<div><span>${childCount}</span></div>`,
                    className: `marker-cluster ${className}`,
                    iconSize: new window.L.Point(40, 40)
                });
            },
            // Distância máxima para agrupar marcadores (em pixels)
            maxClusterRadius: 80,
            // Zoom máximo no qual os clusters irão aparecer
            disableClusteringAtZoom: 18,
            // Animação suave
            animate: true,
            animateAddingMarkers: true,
            // Mostrar área de cobertura ao passar o mouse
            showCoverageOnHover: true,
            // Zoom no cluster ao clicar
            zoomToBoundsOnClick: true,
            // Margem ao fazer zoom no cluster
            spiderfyDistanceMultiplier: 1.5
        });

        // Adicionar marcadores ao grupo de clustering
        const markers = [];
        registosComCoordenadas.forEach((registo) => {
            const icon = registo.tipo === "entrada" ? entradaIcon : saidaIcon;

            const marker = window.L.marker(
                [parseFloat(registo.latitude), parseFloat(registo.longitude)],
                { icon },
            );

            // Popup com informações
            const dataFormatada = formatarData(registo.timestamp);
            const popupContent = `
                <div style="min-width: 200px;">
                    <h6 style="margin: 0 0 8px 0; color: #333; font-weight: bold;">${registo.user.nome || "Utilizador"}</h6>
                    <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;"><strong>Obra:</strong> ${registo.obra.nome || "N/A"}</p>
                    <p style="margin: 0 0 4px 0; color: ${registo.tipo === "entrada" ? "#28a745" : "#dc3545"}; font-size: 14px; font-weight: bold;">
                        <strong>Tipo:</strong> ${registo.tipo.charAt(0).toUpperCase() + registo.tipo.slice(1)}
                    </p>
                    <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${dataFormatada}</p>
                    <button onclick="window.abrirDetalhes(${registo.id})" style="background: #1792FE; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        Ver Detalhes
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent);

            // Adicionar marcador ao grupo de clustering
            markerClusterGroup.addLayer(marker);
            markers.push(marker);
        });

        // Adicionar grupo de clustering ao mapa
        map.addLayer(markerClusterGroup);

        // Ajustar zoom para mostrar todos os marcadores
        if (markers.length > 1) {
            map.fitBounds(markerClusterGroup.getBounds().pad(0.1));
        }

        // Função global para abrir detalhes
        window.abrirDetalhes = (registoId) => {
            const registo = registos.find((r) => r.id === registoId);
            if (registo) {
                setRegistoSelecionado(registo);
                setModalDetalhes(true);
            }
        };
    };

    const formatarData = (timestamp) => {
        try {
            return new Date(timestamp).toLocaleString("pt-PT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch (error) {
            return "Data inválida";
        }
    };

    const handleDataChange = (novaData) => {
        console.log("Data alterada para:", novaData);
        setFiltroData(novaData);
    };

    const renderHeader = () => (
        <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.header}>
            <View style={styles.headerContent}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate("Obras")}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Mapa de Registos</Text>
                    <Text style={styles.headerSubtitle}>
                        {registos.length} registo
                        {registos.length !== 1 ? "s" : ""}
                        {filtroData ? ` para ${filtroData}` : ""}
                        {obraFiltro || userFiltro ? " (filtrado)" : ""}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setModalFiltros(true)}
                >
                    <MaterialCommunityIcons
                        name="filter"
                        size={24}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    const renderFiltros = () => (
        <Modal
            visible={modalFiltros}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalFiltros(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filtros</Text>
                        <TouchableOpacity
                            onPress={() => setModalFiltros(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filtroContainer}>
                        <Text style={styles.filtroLabel}>Data:</Text>
                        <input
                            type="date"
                            style={{
                                ...styles.filtroInput,
                                cursor: "pointer",
                                backgroundColor: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "10px",
                                padding: "12px",
                                fontSize: "16px",
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                            value={filtroData}
                            onChange={(e) => handleDataChange(e.target.value)}
                        />
                    </View>

                    <View style={styles.filtroContainer}>
                        <Text style={styles.filtroLabel}>Obra:</Text>
                        <View style={styles.obraFiltroContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.obraFiltroButton,
                                    !obraFiltro &&
                                    styles.obraFiltroButtonActive,
                                ]}
                                onPress={() => setObraFiltro("")}
                            >
                                <Text
                                    style={[
                                        styles.obraFiltroText,
                                        !obraFiltro &&
                                        styles.obraFiltroTextActive,
                                    ]}
                                >
                                    Todas
                                </Text>
                            </TouchableOpacity>
                            {obras.map((obra) => (
                                <TouchableOpacity
                                    key={obra.id}
                                    style={[
                                        styles.obraFiltroButton,
                                        obraFiltro == obra.id &&
                                        styles.obraFiltroButtonActive,
                                    ]}
                                    onPress={() =>
                                        setObraFiltro(obra.id.toString())
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.obraFiltroText,
                                            obraFiltro == obra.id &&
                                            styles.obraFiltroTextActive,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {obra.nome}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.filtroContainer}>
                        <Text style={styles.filtroLabel}>Utilizador:</Text>
                        <View style={styles.obraFiltroContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.obraFiltroButton,
                                    !userFiltro &&
                                    styles.obraFiltroButtonActive,
                                ]}
                                onPress={() => setUserFiltro("")}
                            >
                                <Text
                                    style={[
                                        styles.obraFiltroText,
                                        !userFiltro &&
                                        styles.obraFiltroTextActive,
                                    ]}
                                >
                                    Todos
                                </Text>
                            </TouchableOpacity>
                            {users.map((user) => (
                                <TouchableOpacity
                                    key={user.id}
                                    style={[
                                        styles.obraFiltroButton,
                                        userFiltro == user.id &&
                                        styles.obraFiltroButtonActive,
                                    ]}
                                    onPress={() =>
                                        setUserFiltro(user.id.toString())
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.obraFiltroText,
                                            userFiltro == user.id &&
                                            styles.obraFiltroTextActive,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {user.nome}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.aplicarFiltroButton}
                        onPress={() => setModalFiltros(false)}
                    >
                        <LinearGradient
                            colors={["#1792FE", "#0B5ED7"]}
                            style={styles.buttonGradient}
                        >
                            <Text style={styles.buttonText}>
                                Aplicar Filtros
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderDetalhes = () => (
        <Modal
            visible={modalDetalhes}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalDetalhes(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Detalhes do Registo
                        </Text>
                        <TouchableOpacity
                            onPress={() => setModalDetalhes(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {registoSelecionado && (
                        <View style={styles.detalhesContainer}>
                            <View style={styles.detalheItem}>
                                <FontAwesome
                                    name="user"
                                    size={16}
                                    color="#1792FE"
                                />
                                <Text style={styles.detalheLabel}>
                                    Utilizador:
                                </Text>
                                <Text style={styles.detalheValor}>
                                    {registoSelecionado.user.nome}
                                </Text>
                            </View>

                            <View style={styles.detalheItem}>
                                <FontAwesome
                                    name="building"
                                    size={16}
                                    color="#1792FE"
                                />
                                <Text style={styles.detalheLabel}>Obra:</Text>
                                <Text style={styles.detalheValor}>
                                    {registoSelecionado.obra.nome}
                                </Text>
                            </View>

                            <View style={styles.detalheItem}>
                                <MaterialCommunityIcons
                                    name={
                                        registoSelecionado.tipo === "entrada"
                                            ? "login"
                                            : "logout"
                                    }
                                    size={16}
                                    color={
                                        registoSelecionado.tipo === "entrada"
                                            ? "#28a745"
                                            : "#dc3545"
                                    }
                                />
                                <Text style={styles.detalheLabel}>Tipo:</Text>
                                <Text
                                    style={[
                                        styles.detalheValor,
                                        {
                                            color:
                                                registoSelecionado.tipo ===
                                                    "entrada"
                                                    ? "#28a745"
                                                    : "#dc3545",
                                        },
                                    ]}
                                >
                                    {registoSelecionado.tipo
                                        .charAt(0)
                                        .toUpperCase() +
                                        registoSelecionado.tipo.slice(1)}
                                </Text>
                            </View>

                            <View style={styles.detalheItem}>
                                <FontAwesome
                                    name="clock-o"
                                    size={16}
                                    color="#1792FE"
                                />
                                <Text style={styles.detalheLabel}>
                                    Data/Hora:
                                </Text>
                                <Text style={styles.detalheValor}>
                                    {formatarData(registoSelecionado.timestamp)}
                                </Text>
                            </View>

                            <View style={styles.detalheItem}>
                                <FontAwesome
                                    name="map-marker"
                                    size={16}
                                    color="#1792FE"
                                />
                                <Text style={styles.detalheLabel}>
                                    Coordenadas:
                                </Text>
                                <Text style={styles.detalheValor}>
                                    {parseFloat(
                                        registoSelecionado.latitude,
                                    ).toFixed(6)}
                                    ,{" "}
                                    {parseFloat(
                                        registoSelecionado.longitude,
                                    ).toFixed(6)}
                                </Text>
                            </View>

                            {registoSelecionado.justificacao && (
                                <View style={styles.detalheItem}>
                                    <FontAwesome
                                        name="comment"
                                        size={16}
                                        color="#1792FE"
                                    />
                                    <Text style={styles.detalheLabel}>
                                        Justificação:
                                    </Text>
                                    <Text style={styles.detalheValor}>
                                        {registoSelecionado.justificacao}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.verNoMapaButton}
                                onPress={() => {
                                    const url = `https://www.google.com/maps?q=${registoSelecionado.latitude},${registoSelecionado.longitude}`;
                                    window.open(url, "_blank");
                                }}
                            >
                                <LinearGradient
                                    colors={["#28a745", "#20c997"]}
                                    style={styles.buttonGradient}
                                >
                                    <FontAwesome
                                        name="map"
                                        size={16}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.buttonText}>
                                        Ver no Google Maps
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    const renderLegenda = () => (
        <View style={styles.legendaContainer}>
            <Text style={styles.legendaTitle}>Legenda:</Text>
            <View style={styles.legendaItem}>
                <View
                    style={[styles.legendaIcon, { backgroundColor: "#28a745" }]}
                >
                    <Text style={styles.legendaIconText}>E</Text>
                </View>
                <Text style={styles.legendaText}>Entrada</Text>
            </View>
            <View style={styles.legendaItem}>
                <View
                    style={[styles.legendaIcon, { backgroundColor: "#dc3545" }]}
                >
                    <Text style={styles.legendaIconText}>S</Text>
                </View>
                <Text style={styles.legendaText}>Saída</Text>
            </View>
        </View>
    );

    const renderMapa = () => (
        <View style={styles.mapaContainer}>
            <div
                id="mapa-registos"
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 15,
                    overflow: "hidden",
                }}
            />
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <FontAwesome name="map-o" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum registo encontrado</Text>
            <Text style={styles.emptySubtitle}>
                Não foram encontrados registos para a data{" "}
                {filtroData || "selecionada"}
            </Text>
        </View>
    );

    const renderLoadingState = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1792FE" />
            <Text style={styles.loadingText}>A carregar registos...</Text>
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
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={carregarRegistos}
            >
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

            {loading ? (
                renderLoadingState()
            ) : error ? (
                renderErrorState()
            ) : registos.length === 0 ? (
                renderEmptyState()
            ) : (
                <View style={styles.content}>
                    {renderLegenda()}
                    {renderMapa()}
                </View>
            )}

            {renderFiltros()}
            {renderDetalhes()}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTextContainer: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        textAlign: "center",
        marginTop: 2,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    legendaContainer: {
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    legendaTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    legendaItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    legendaIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        borderWidth: 2,
        borderColor: "white",
    },
    legendaIconText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
    },
    legendaText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "600",
    },
    mapaContainer: {
        flex: 1,
        borderRadius: 15,
        overflow: "hidden",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        backgroundColor: "#fff",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 20,
        width: width * 0.9,
        maxHeight: height * 0.8,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    filtroContainer: {
        marginBottom: 15,
    },
    filtroLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    filtroInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f8f9fa",
    },
    obraFiltroContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    obraFiltroButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#f8f9fa",
    },
    obraFiltroButtonActive: {
        backgroundColor: "#1792FE",
        borderColor: "#1792FE",
    },
    obraFiltroText: {
        fontSize: 12,
        color: "#666",
    },
    obraFiltroTextActive: {
        color: "#fff",
    },
    aplicarFiltroButton: {
        marginTop: 10,
        borderRadius: 10,
        overflow: "hidden",
    },
    detalhesContainer: {
        maxHeight: height * 0.6,
    },
    detalheItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    detalheLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        marginLeft: 10,
        marginRight: 10,
        minWidth: 80,
    },
    detalheValor: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    verNoMapaButton: {
        marginTop: 20,
        borderRadius: 10,
        overflow: "hidden",
    },
    buttonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        marginTop: 50,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#666",
        marginTop: 20,
        marginBottom: 10,
        textAlign: "center",
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#1792FE",
        marginTop: 15,
        fontWeight: "600",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#dc3545",
        marginTop: 20,
        marginBottom: 10,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
        lineHeight: 20,
    },
    retryButton: {
        borderRadius: 10,
        overflow: "hidden",
    },
});

export default MapaRegistos;
