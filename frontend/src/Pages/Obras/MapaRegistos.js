import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  useWindowDimensions,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import {
  FontAwesome,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEnsureValidTokens } from "../../utils/useEnsureValidTokens";
import { styles } from './Css/MapaRegistosStyles';
import { secureStorage } from '../../utils/secureStorage';
const { width, height } = Dimensions.get("window");

const MapaRegistos = ({ navigation }) => {
  // Garantir que os tokens estão válidos
  useEnsureValidTokens();
  
  const { width: winW, height: winH } = useWindowDimensions();
  const isSmall = winW < 520;
  const isMedium = winW >= 520 && winW < 900;

  const modalBoxStyle = useMemo(
    () => ({
      width: isSmall
        ? Math.min(winW * 0.96, 540)
        : isMedium
        ? Math.min(winW * 0.85, 760)
        : Math.min(winW * 0.7, 920),
      maxHeight: isSmall ? winH * 0.9 : winH * 0.85,
      borderRadius: isSmall ? 12 : 16,
      padding: isSmall ? 16 : 20,
    }),
    [winW, winH, isSmall, isMedium],
  );

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
  const [userModules, setUserModules] = useState([]);

  const mapaRef = useRef(null);
  const containerRef = useRef(null);

  // Função para verificar se o utilizador tem determinado submódulo
  const hasSubmodule = (moduleName, submoduleName) => {
    return userModules.some(
      (module) =>
        module.nome === moduleName &&
        module.submodulos.some((sub) => sub.nome === submoduleName)
    );
  };

  // Função para determinar a navegação correta
  const getNavigationTarget = () => {
    if (hasSubmodule("Obras", "Obras")) {
      return "Obras";
    } else if (hasSubmodule("Obras", "Escritório")) {
      return "Escritorio";
    } else {
      return "Home"; // Fallback
    }
  };

  useEffect(() => {
    carregarLeaflet();
    carregarRegistos();
    carregarModulosUtilizador();
  }, []);

  // Função para carregar os módulos do utilizador
  const carregarModulosUtilizador = async () => {
    try {
      const token = secureStorage.getItem("loginToken");
      const userId = secureStorage.getItem("userId");
      const empresaId = await secureStorage.getItem("empresa_id");

      if (userId && token) {
        let url = `https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos`;

        // Se há empresa selecionada, adicionar o parâmetro
        if (empresaId) {
          url += `?empresa_id=${empresaId}`;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setUserModules(data.modulos || []);
      }
    } catch (error) {
      console.error("Erro ao carregar módulos do utilizador:", error);
      setUserModules([]);
    }
  };

  useEffect(() => {
    carregarRegistos();
  }, [filtroData, obraFiltro, userFiltro]);

  useEffect(() => {
    if (obraFiltro !== "") {
      setUserFiltro("");
    }
  }, [obraFiltro]);

  useEffect(() => {
    if (mapaLoaded && registos.length > 0) {
      setTimeout(() => {
        inicializarMapa();
      }, 100);
    }
  }, [mapaLoaded, registos]);

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

    // CSS Leaflet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // CSS custom clusters
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

    // CSS MarkerCluster
    const clusterCSS = document.createElement("link");
    clusterCSS.rel = "stylesheet";
    clusterCSS.href =
      "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css";
    document.head.appendChild(clusterCSS);

    const clusterDefaultCSS = document.createElement("link");
    clusterDefaultCSS.rel = "stylesheet";
    clusterDefaultCSS.href =
      "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css";
    document.head.appendChild(clusterDefaultCSS);

    // JS Leaflet
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      // JS MarkerCluster
      const clusterScript = document.createElement("script");
      clusterScript.src =
        "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js";
      clusterScript.onload = () => setMapaLoaded(true);
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(script);
  };

  const carregarRegistos = async () => {
    try {
      setLoading(true);
      setError("");

      const token = secureStorage.getItem("loginToken");
      const empresaId = await secureStorage.getItem("empresa_id");

      if (!token) {
        setError("Token de autenticação não encontrado");
        return;
      }

      let url = `https://backend.advir.pt/api/mapa-registos/registos?`;

      if (filtroData) {
        url += `data=${filtroData}&`;
      }
      if (empresaId) {
        url += `empresa_id=${empresaId}&`;
      }

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

      // filtros frontend
      let dadosFiltrados = data;

      if (obraFiltro && obraFiltro !== "") {
        dadosFiltrados = dadosFiltrados.filter(
          (registo) =>
            registo.obra &&
            registo.obra.id.toString() === obraFiltro.toString(),
        );
      }

      if (userFiltro && userFiltro !== "") {
        dadosFiltrados = dadosFiltrados.filter(
          (registo) =>
            registo.user &&
            registo.user.id.toString() === userFiltro.toString(),
        );
      }

      setRegistos(dadosFiltrados);

      // obras únicas
      const obrasMap = new Map();
      data.forEach((registo) => {
        if (registo.obra && registo.obra.id) {
          obrasMap.set(registo.obra.id, registo.obra);
        }
      });
      setObras(Array.from(obrasMap.values()));

      // users únicos (condicionados à obra se houver filtro)
      const usersMap = new Map();
      let dadosParaExtracaoUsers = data;

      if (obraFiltro && obraFiltro !== "") {
        dadosParaExtracaoUsers = data.filter(
          (registo) =>
            registo.obra &&
            registo.obra.id.toString() === obraFiltro.toString(),
        );
      }

      dadosParaExtracaoUsers.forEach((registo) => {
        if (registo.user && registo.user.id) {
          usersMap.set(registo.user.id, registo.user);
        }
      });
      setUsers(Array.from(usersMap.values()));
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

    if (mapaRef.current) {
      try {
        mapaRef.current.remove();
      } catch (error) {
        console.log("Erro ao remover mapa anterior:", error.message);
      }
      mapaRef.current = null;
    }

    mapContainer.innerHTML = "";

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

    const lats = registosComCoordenadas.map((r) => parseFloat(r.latitude));
    const lngs = registosComCoordenadas.map((r) => parseFloat(r.longitude));

    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const map = window.L.map("mapa-registos", {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    mapaRef.current = map;

    window.L
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      })
      .addTo(map);

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

    const markerClusterGroup = window.L.markerClusterGroup({
      chunkedLoading: true,
      chunkProgress: function (processed, total) {
        if (processed === total) {
          console.log("Todos os marcadores foram processados");
        }
      },
      iconCreateFunction: function (cluster) {
        const childCount = cluster.getChildCount();
        let className = "marker-cluster-small";

        if (childCount < 10) className = "marker-cluster-small";
        else if (childCount < 100) className = "marker-cluster-medium";
        else className = "marker-cluster-large";

        return new window.L.DivIcon({
          html: `<div><span>${childCount}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: new window.L.Point(40, 40),
        });
      },
      maxClusterRadius: 80,
      disableClusteringAtZoom: 18,
      animate: true,
      animateAddingMarkers: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      spiderfyDistanceMultiplier: 1.5,
    });

    const markers = [];
    registosComCoordenadas.forEach((registo) => {
      const icon = registo.tipo === "entrada" ? entradaIcon : saidaIcon;

      const marker = window.L.marker(
        [parseFloat(registo.latitude), parseFloat(registo.longitude)],
        { icon },
      );

      const dataFormatada = formatarData(registo.timestamp);
      const popupContent = `
        <div style="min-width: 200px;">
          <h6 style="margin: 0 0 8px 0; color: #333; font-weight: bold;">${
            registo.user.nome || "Utilizador"
          }</h6>
          <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;"><strong>Obra:</strong> ${
            registo.obra.nome || "N/A"
          }</p>
          <p style="margin: 0 0 4px 0; color: ${
            registo.tipo === "entrada" ? "#28a745" : "#dc3545"
          }; font-size: 14px; font-weight: bold;">
            <strong>Tipo:</strong> ${
              registo.tipo.charAt(0).toUpperCase() + registo.tipo.slice(1)
            }
          </p>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">${dataFormatada}</p>
          <button onclick="window.abrirDetalhes(${
            registo.id
          })" style="background: #1792FE; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Ver Detalhes
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      markerClusterGroup.addLayer(marker);
      markers.push(marker);
    });

    map.addLayer(markerClusterGroup);

    if (markers.length > 1) {
      map.fitBounds(markerClusterGroup.getBounds().pad(0.1));
    }

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
    setFiltroData(novaData);
  };

  const abrirNoMapa = (lat, lng) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  };

  const renderHeader = () => (
    <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate(getNavigationTarget())}
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
          <MaterialCommunityIcons name="filter" size={24} color="#FFFFFF" />
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
        <View style={[styles.modalContent, modalBoxStyle]}>
          <View style={[styles.modalHeader, isSmall && { marginBottom: 12 }]}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setModalFiltros(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
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
              <View
                style={[
                  styles.obraFiltroScroll,
                  { maxHeight: isSmall ? winH * 0.28 : winH * 0.35 },
                ]}
              >
                <View
                  style={[
                    styles.obraFiltroContainer,
                    isSmall && { justifyContent: "space-between" },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.obraFiltroButton,
                      isSmall && styles.obraFiltroButtonSmall,
                      !obraFiltro && styles.obraFiltroButtonActive,
                    ]}
                    onPress={() => setObraFiltro("")}
                  >
                    <Text
                      style={[
                        styles.obraFiltroText,
                        !obraFiltro && styles.obraFiltroTextActive,
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
                        isSmall && styles.obraFiltroButtonSmall,
                        obraFiltro == obra.id && styles.obraFiltroButtonActive,
                      ]}
                      onPress={() => setObraFiltro(obra.id.toString())}
                    >
                      <Text
                        style={[
                          styles.obraFiltroText,
                          obraFiltro == obra.id && styles.obraFiltroTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {obra.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.filtroContainer}>
              <Text style={styles.filtroLabel}>Utilizador:</Text>
              <View
                style={[
                  styles.obraFiltroScroll,
                  { maxHeight: isSmall ? winH * 0.28 : winH * 0.35 },
                ]}
              >
                <View
                  style={[
                    styles.obraFiltroContainer,
                    isSmall && { justifyContent: "space-between" },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.obraFiltroButton,
                      isSmall && styles.obraFiltroButtonSmall,
                      !userFiltro && styles.obraFiltroButtonActive,
                    ]}
                    onPress={() => setUserFiltro("")}
                  >
                    <Text
                      style={[
                        styles.obraFiltroText,
                        !userFiltro && styles.obraFiltroTextActive,
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
                        isSmall && styles.obraFiltroButtonSmall,
                        userFiltro == user.id && styles.obraFiltroButtonActive,
                      ]}
                      onPress={() => setUserFiltro(user.id.toString())}
                    >
                      <Text
                        style={[
                          styles.obraFiltroText,
                          userFiltro == user.id && styles.obraFiltroTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {user.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.aplicarFiltroButton, { marginTop: 4 }]}>
            <TouchableOpacity onPress={() => setModalFiltros(false)}>
              <LinearGradient
                colors={["#1792FE", "#0B5ED7"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Aplicar Filtros</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
        <View style={[styles.modalContent, modalBoxStyle]}>
          <View style={[styles.modalHeader, isSmall && { marginBottom: 12 }]}>
            <Text style={styles.modalTitle}>Detalhes do Registo</Text>
            <TouchableOpacity onPress={() => setModalDetalhes(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {registoSelecionado && (
              <View style={[styles.detalhesContainer, { maxHeight: undefined }]}>
                <View style={styles.detalheItem}>
                  <FontAwesome name="user" size={16} color="#1792FE" />
                  <Text
                    style={[
                      styles.detalheLabel,
                      isSmall && { minWidth: 64, marginRight: 6 },
                    ]}
                  >
                    Utilizador:
                  </Text>
                  <Text style={styles.detalheValor}>
                    {registoSelecionado.user.nome}
                  </Text>
                </View>

                <View style={styles.detalheItem}>
                  <FontAwesome name="building" size={16} color="#1792FE" />
                  <Text
                    style={[
                      styles.detalheLabel,
                      isSmall && { minWidth: 64, marginRight: 6 },
                    ]}
                  >
                    Obra:
                  </Text>
                  <Text style={styles.detalheValor}>
                    {registoSelecionado.obra.nome}
                  </Text>
                </View>

                <View style={styles.detalheItem}>
                  <MaterialCommunityIcons
                    name={
                      registoSelecionado.tipo === "entrada" ? "login" : "logout"
                    }
                    size={16}
                    color={
                      registoSelecionado.tipo === "entrada"
                        ? "#28a745"
                        : "#dc3545"
                    }
                  />
                  <Text
                    style={[
                      styles.detalheLabel,
                      isSmall && { minWidth: 64, marginRight: 6 },
                    ]}
                  >
                    Tipo:
                  </Text>
                  <Text
                    style={[
                      styles.detalheValor,
                      {
                        color:
                          registoSelecionado.tipo === "entrada"
                            ? "#28a745"
                            : "#dc3545",
                      },
                    ]}
                  >
                    {registoSelecionado.tipo.charAt(0).toUpperCase() +
                      registoSelecionado.tipo.slice(1)}
                  </Text>
                </View>

                <View style={styles.detalheItem}>
                  <FontAwesome name="clock-o" size={16} color="#1792FE" />
                  <Text
                    style={[
                      styles.detalheLabel,
                      isSmall && { minWidth: 64, marginRight: 6 },
                    ]}
                  >
                    Data/Hora:
                  </Text>
                  <Text style={styles.detalheValor}>
                    {formatarData(registoSelecionado.timestamp)}
                  </Text>
                </View>

                <View style={styles.detalheItem}>
                  <FontAwesome name="map-marker" size={16} color="#1792FE" />
                  <Text
                    style={[
                      styles.detalheLabel,
                      isSmall && { minWidth: 64, marginRight: 6 },
                    ]}
                  >
                    Coordenadas:
                  </Text>
                  <Text style={styles.detalheValor}>
                    {parseFloat(registoSelecionado.latitude).toFixed(6)},{" "}
                    {parseFloat(registoSelecionado.longitude).toFixed(6)}
                  </Text>
                </View>

                {registoSelecionado.justificacao && (
                  <View style={styles.detalheItem}>
                    <FontAwesome name="comment" size={16} color="#1792FE" />
                    <Text
                      style={[
                        styles.detalheLabel,
                        isSmall && { minWidth: 64, marginRight: 6 },
                      ]}
                    >
                      Justificação:
                    </Text>
                    <Text style={styles.detalheValor}>
                      {registoSelecionado.justificacao}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {registoSelecionado && (
            <View style={[styles.verNoMapaButton, { marginTop: 4 }]}>
              <TouchableOpacity
                onPress={() =>
                  abrirNoMapa(
                    registoSelecionado.latitude,
                    registoSelecionado.longitude,
                  )
                }
              >
                <LinearGradient
                  colors={["#28a745", "#20c997"]}
                  style={styles.buttonGradient}
                >
                  <FontAwesome name="map" size={16} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Ver no Google Maps</Text>
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
        <View style={[styles.legendaIcon, { backgroundColor: "#28a745" }]}>
          <Text style={styles.legendaIconText}>E</Text>
        </View>
        <Text style={styles.legendaText}>Entrada</Text>
      </View>
      <View style={styles.legendaItem}>
        <View style={[styles.legendaIcon, { backgroundColor: "#dc3545" }]}>
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
        Não foram encontrados registos para a data {filtroData || "selecionada"}
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
      <FontAwesome name="exclamation-triangle" size={64} color="#dc3545" />
      <Text style={styles.errorTitle}>Erro ao carregar</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={carregarRegistos}>
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

      {loading
        ? renderLoadingState()
        : error
        ? renderErrorState()
        : registos.length === 0
        ? renderEmptyState()
        : (
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


export default MapaRegistos;
