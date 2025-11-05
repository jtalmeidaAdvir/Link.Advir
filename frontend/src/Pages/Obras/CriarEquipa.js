import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Alert,
    Animated,
    Dimensions,
    Modal,
} from "react-native";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { styles } from "./Css/CriarEquipaStyles";
import { secureStorage } from "../../utils/secureStorage";

const { width, height } = Dimensions.get("window");

const CriarEquipa = () => {
    const [nomeEquipa, setNomeEquipa] = useState("");
    const [utilizadores, setUtilizadores] = useState([]);
    const [membrosSelecionados, setMembrosSelecionados] = useState([]);
    const [trabalhadoresExternos, setTrabalhadoresExternos] = useState([]);
    const [externosSelecionados, setExternosSelecionados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [equipasCriadas, setEquipasCriadas] = useState([]);
    const [modalEditar, setModalEditar] = useState(false);
    const [novoNomeEquipa, setNovoNomeEquipa] = useState("");
    const [equipaSelecionadaEditar, setEquipaSelecionadaEditar] =
        useState(null);
    const [animatedValue] = useState(new Animated.Value(0));
    const [formAnimated] = useState(new Animated.Value(0));
    const [expandedTeams, setExpandedTeams] = useState({});
    const [modalConfirmDelete, setModalConfirmDelete] = useState(false);
    const [equipaParaRemover, setEquipaParaRemover] = useState(null);
    const [membersExpanded, setMembersExpanded] = useState(false);
    const [searchMembros, setSearchMembros] = useState("");

    // Animação principal
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

        // Animação do formulário
        Animated.timing(formAnimated, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const pulseAnimation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
    });

    const formOpacity = formAnimated.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const formTranslateY = formAnimated.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
    });

    useEffect(() => {
        fetchUtilizadores();
        fetchTrabalhadoresExternos();
        fetchEquipasCriadas();
    }, []);

    const fetchTrabalhadoresExternos = async () => {
        try {
            const loginToken = await secureStorage.getItem("loginToken");
            const empresaId = await secureStorage.getItem("empresa_id");

            const response = await fetch(
                `https://backend.advir.pt/api/trabalhadores-externos?ativo=true&anulado=false&pageSize=500`,
                {
                    method: "GET",
                    headers: { 
                        Authorization: `Bearer ${loginToken}`,
                        "X-Empresa-ID": empresaId
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Erro ao obter trabalhadores externos");
            }

            const data = await response.json();
            const lista = Array.isArray(data) ? data : data?.data || [];
            setTrabalhadoresExternos(lista);
        } catch (error) {
            console.error("Erro ao carregar trabalhadores externos:", error.message);
        }
    };

    const fetchEquipasCriadas = async () => {
        try {
            const token = await secureStorage.getItem("loginToken");
            const userId = await secureStorage.getItem("userId");
            const tipoUser = await secureStorage.getItem("tipoUser");
            const empresaId = await secureStorage.getItem("empresa_id");

            const res = await fetch(
                "https://backend.advir.pt/api/equipa-obra/listar-todas",
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "X-Empresa-ID": empresaId,
                    },
                },
            );

            const data = await res.json();
            if (res.ok) {
                if (tipoUser === "Administrador") {
                    setEquipasCriadas(data);
                } else {
                    const equipasDoEncarregado = data.filter(
                        (e) => e.encarregado?.id == userId,
                    );
                    setEquipasCriadas(equipasDoEncarregado);
                }
            } else {
                console.error("Erro ao carregar equipas:", data.message);
            }
        } catch (err) {
            console.error("Erro ao carregar equipas criadas:", err);
        }
    };

    const obterIdDaEmpresa = async () => {
        const empresaNome = secureStorage.getItem("empresaSelecionada");
        const loginToken = secureStorage.getItem("loginToken");

        try {
            const response = await fetch(
                `https://backend.advir.pt/api/empresas/nome/${empresaNome}`,
                {
                    headers: {
                        Authorization: `Bearer ${loginToken}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error("Erro ao obter ID da empresa");
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error("Erro ao obter o ID da empresa:", error);
            return null;
        }
    };

    const fetchUtilizadores = async () => {
        try {
            const loginToken = secureStorage.getItem("loginToken");
            const empresaId = await obterIdDaEmpresa();

            if (!empresaId) {
                throw new Error("ID da empresa não encontrado");
            }

            const response = await fetch(
                `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${loginToken}` },
                },
            );

            if (!response.ok) {
                throw new Error("Erro ao obter utilizadores");
            }

            const data = await response.json();
            setUtilizadores(data);
        } catch (error) {
            console.error("Erro ao carregar utilizadores:", error.message);
        }
    };

    const toggleMembro = (id) => {
        if (membrosSelecionados.includes(id)) {
            setMembrosSelecionados(membrosSelecionados.filter((m) => m !== id));
        } else {
            setMembrosSelecionados([...membrosSelecionados, id]);
        }
    };

    const toggleExterno = (id) => {
        if (externosSelecionados.includes(id)) {
            setExternosSelecionados(externosSelecionados.filter((m) => m !== id));
        } else {
            setExternosSelecionados([...externosSelecionados, id]);
        }
    };

    const toggleTeamExpansion = (teamName) => {
        setExpandedTeams((prev) => ({
            ...prev,
            [teamName]: !prev[teamName],
        }));
    };

    const criarEquipa = async () => {
        if (!nomeEquipa || (membrosSelecionados.length === 0 && externosSelecionados.length === 0)) {
            Alert.alert("Erro", "Preenche o nome da equipa e seleciona pelo menos um membro.");
            return;
        }

        try {
            setLoading(true);
            const token = await secureStorage.getItem("loginToken");
            const empresaId = await secureStorage.getItem("empresa_id");
            
            const res = await fetch(
                "https://backend.advir.pt/api/equipa-obra",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "X-Empresa-ID": empresaId,
                    },
                    body: JSON.stringify({
                        nome: nomeEquipa,
                        membros: membrosSelecionados,
                        membrosExternos: externosSelecionados,
                        empresa_id: empresaId,
                    }),
                },
            );

            const data = await res.json();
            if (res.ok) {
                Alert.alert("Sucesso", "Equipa criada com sucesso!");
                setNomeEquipa("");
                setMembrosSelecionados([]);
                setExternosSelecionados([]);
                fetchEquipasCriadas();
            } else {
                Alert.alert("Erro", data.message || "Erro ao criar equipa.");
            }
        } catch (err) {
            console.error("Erro ao criar equipa:", err);
            Alert.alert("Erro", "Erro ao criar equipa.");
        } finally {
            setLoading(false);
        }
    };

    const removerEquipaInteira = async () => {
        if (!equipaParaRemover) return;

        try {
            const token = await secureStorage.getItem("loginToken");
            const res = await fetch(
                "https://backend.advir.pt/api/equipa-obra/remover-equipa",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nomeEquipa: equipaParaRemover.nome,
                    }),
                },
            );

            if (res.ok) {
                fetchEquipasCriadas();
                setModalConfirmDelete(false);
                setEquipaParaRemover(null);
            } else {
                console.error("Erro ao remover a equipa");
            }
        } catch (err) {
            console.error("Erro ao remover equipa:", err);
        }
    };

    const confirmarRemocaoEquipa = (nomeEquipa) => {
        setEquipaParaRemover({ nome: nomeEquipa });
        setModalConfirmDelete(true);
    };

    const iniciarEdicao = (equipa) => {
        setEquipaSelecionadaEditar(equipa);
        setNovoNomeEquipa(equipa.nome);
        
        const internos = equipa.membros.filter(m => m.tipo === 'interno').map(m => m.id);
        const externos = equipa.membros.filter(m => m.tipo === 'externo').map(m => m.id);
        
        setMembrosSelecionados(internos);
        setExternosSelecionados(externos);
        setModalEditar(true);
    };

    const salvarEdicaoEquipa = async () => {
        if (!novoNomeEquipa.trim() || (membrosSelecionados.length === 0 && externosSelecionados.length === 0)) {
            Alert.alert("Erro", "Preenche o nome e seleciona pelo menos um membro.");
            return;
        }

        try {
            const token = await secureStorage.getItem("loginToken");
            const res = await fetch(
                `https://backend.advir.pt/api/equipa-obra/editar-equipa/${equipaSelecionadaEditar.nome}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nomeAnterior: equipaSelecionadaEditar.nome,
                        novoNome: novoNomeEquipa,
                        novosMembros: membrosSelecionados,
                        novosMembrosExternos: externosSelecionados,
                    }),
                },
            );

            if (res.ok) {
                Alert.alert("Sucesso", "Equipa editada com sucesso!");
                setModalEditar(false);
                setEquipaSelecionadaEditar(null);
                setNovoNomeEquipa("");
                setMembrosSelecionados([]);
                setExternosSelecionados([]);
                fetchEquipasCriadas();
            } else {
                const data = await res.json();
                Alert.alert("Erro", data.message || "Erro ao editar equipa.");
            }
        } catch (err) {
            console.error("Erro ao editar equipa:", err);
            Alert.alert("Erro", "Erro ao editar equipa.");
        }
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
                        name="users"
                        size={32}
                        color="#FFFFFF"
                        style={styles.headerIcon}
                    />
                    <Text style={styles.headerTitle}>Gestão de Equipas</Text>
                    <Text style={styles.headerSubtitle}>
                        Criar e gerir equipas de trabalho
                    </Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );

    const renderFormSection = () => (
        <Animated.View
            style={[
                styles.formSection,
                {
                    opacity: formOpacity,
                    transform: [{ translateY: formTranslateY }],
                },
            ]}
        >
            <LinearGradient
                colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
                style={styles.formGradient}
            >
                <View style={styles.sectionHeader}>
                    <FontAwesome name="plus-circle" size={24} color="#1792FE" />
                    <Text style={styles.sectionTitle}>Criar Nova Equipa</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        <FontAwesome name="tag" size={16} color="#1792FE" />{" "}
                        Nome da Equipa
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={nomeEquipa}
                        onChangeText={setNomeEquipa}
                        placeholder="Insere o nome da equipa"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.membersHeader}
                        onPress={() => {
                            setMembersExpanded(!membersExpanded);
                            if (membersExpanded) {
                                setSearchMembros("");
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.label}>
                            <FontAwesome
                                name="users"
                                size={16}
                                color="#1792FE"
                            />{" "}
                            Membros da Equipa
                        </Text>
                        <View style={styles.membersCounter}>
                            <Text style={styles.selectedCount}>
                                {membrosSelecionados.length} de{" "}
                                {utilizadores.length}
                            </Text>
                            <Animated.View
                                style={{
                                    transform: [
                                        {
                                            rotate: membersExpanded
                                                ? "180deg"
                                                : "0deg",
                                        },
                                    ],
                                }}
                            >
                                <Ionicons
                                    name="chevron-down"
                                    size={20}
                                    color="#1792FE"
                                />
                            </Animated.View>
                        </View>
                    </TouchableOpacity>

                    {membersExpanded && (
                        <View style={styles.membersContainer}>
                            <TextInput
                                style={styles.searchInput}
                                value={searchMembros}
                                onChangeText={setSearchMembros}
                                placeholder="Pesquisar membro..."
                                placeholderTextColor="#999"
                            />
                            <ScrollView
                                style={styles.membersScrollView}
                                nestedScrollEnabled={true}
                            >
                                {utilizadores
                                    .filter((user) => {
                                        const searchLower = searchMembros.toLowerCase();
                                        const nome = (user.nome || user.name || user.username || "").toLowerCase();
                                        const email = (user.email || "").toLowerCase();
                                        return nome.includes(searchLower) || email.includes(searchLower);
                                    })
                                    .map((user) => (
                                    <TouchableOpacity
                                        key={`user-${user.id}`}
                                        style={[
                                            styles.memberItem,
                                            membrosSelecionados.includes(
                                                user.id,
                                            ) && styles.memberSelected,
                                        ]}
                                        onPress={() => toggleMembro(user.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.memberContent}>
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    membrosSelecionados.includes(
                                                        user.id,
                                                    ) && styles.checkedBox,
                                                ]}
                                            >
                                                {membrosSelecionados.includes(
                                                    user.id,
                                                ) && (
                                                    <FontAwesome
                                                        name="check"
                                                        size={12}
                                                        color="#FFFFFF"
                                                    />
                                                )}
                                            </View>
                                            <FontAwesome
                                                name="user"
                                                size={16}
                                                color="#1792FE"
                                                style={styles.userIcon}
                                            />
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberName}>
                                                    {user.nome ||
                                                        user.name ||
                                                        user.username ||
                                                        user.email.split(
                                                            "@",
                                                        )[0]}
                                                </Text>
                                                
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {!membersExpanded && membrosSelecionados.length > 0 && (
                        <View style={styles.selectedMembersPreview}>
                            <Text style={styles.previewTitle}>
                                Membros selecionados:
                            </Text>
                            <View style={styles.selectedMembersList}>
                                {membrosSelecionados
                                    .slice(0, 3)
                                    .map((memberId) => {
                                        const user = utilizadores.find(
                                            (u) => u.id === memberId,
                                        );
                                        return (
                                            <View
                                                key={`preview-${memberId}`}
                                                style={styles.selectedMemberTag}
                                            >
                                                <Text
                                                    style={
                                                        styles.selectedMemberTagText
                                                    }
                                                >
                                                    {user?.nome ||
                                                        user?.name ||
                                                        user?.username ||
                                                        user?.email?.split(
                                                            "@",
                                                        )[0] ||
                                                        "Utilizador"}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                {membrosSelecionados.length > 3 && (
                                    <View style={styles.moreSelectedTag}>
                                        <Text style={styles.moreSelectedText}>
                                            +{membrosSelecionados.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        <FontAwesome name="user-plus" size={16} color="#1792FE" />{" "}
                        Trabalhadores Externos
                    </Text>
                    <Text style={styles.selectedCount}>
                        {externosSelecionados.length} de {trabalhadoresExternos.length} selecionados
                    </Text>
                    <ScrollView style={styles.membersScrollView} nestedScrollEnabled={true}>
                        {trabalhadoresExternos.map((externo) => (
                            <TouchableOpacity
                                key={`externo-${externo.id}`}
                                style={[
                                    styles.memberItem,
                                    externosSelecionados.includes(externo.id) && styles.memberSelected,
                                ]}
                                onPress={() => toggleExterno(externo.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.memberContent}>
                                    <View
                                        style={[
                                            styles.checkbox,
                                            externosSelecionados.includes(externo.id) && styles.checkedBox,
                                        ]}
                                    >
                                        {externosSelecionados.includes(externo.id) && (
                                            <FontAwesome name="check" size={12} color="#FFFFFF" />
                                        )}
                                    </View>
                                    <FontAwesome
                                        name="user-circle"
                                        size={16}
                                        color="#28a745"
                                        style={styles.userIcon}
                                    />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{externo.funcionario}</Text>
                                        <Text style={styles.memberEmail}>
                                            {externo.empresa} • {externo.categoria || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity
                    style={styles.createButton}
                    onPress={criarEquipa}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={
                            loading ? ["#ccc", "#999"] : ["#1792FE", "#0B5ED7"]
                        }
                        style={styles.buttonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <FontAwesome
                                name="plus"
                                size={16}
                                color="#FFFFFF"
                            />
                        )}
                        <Text style={styles.buttonText}>
                            {loading ? "A criar..." : "Criar Equipa"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );

    const renderTeamsSection = () => (
        <View style={styles.teamsSection}>
            <View style={styles.sectionHeader}>
                <FontAwesome name="list" size={24} color="#1792FE" />
                <Text style={styles.sectionTitle}>Equipas Criadas</Text>
                <View style={styles.teamCount}>
                    <Text style={styles.teamCountText}>
                        {equipasCriadas.length}
                    </Text>
                </View>
            </View>

            {equipasCriadas.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome name="users" size={64} color="#ccc" />
                    <Text style={styles.emptyTitle}>Nenhuma equipa criada</Text>
                    <Text style={styles.emptySubtitle}>
                        Cria a tua primeira equipa usando o formulário acima
                    </Text>
                </View>
            ) : (
                equipasCriadas.map((equipa, index) => {
                    const isExpanded = expandedTeams[equipa.nome];
                    return (
                        <View
                            key={`equipa-${equipa.nome}-${index}`}
                            style={styles.teamCard}
                        >
                            <LinearGradient
                                colors={[
                                    "rgba(255,255,255,0.95)",
                                    "rgba(255,255,255,0.85)",
                                ]}
                                style={styles.teamGradient}
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        toggleTeamExpansion(equipa.nome)
                                    }
                                    style={styles.teamHeader}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.teamHeaderLeft}>
                                        <View style={styles.teamIconContainer}>
                                            <FontAwesome
                                                name="users"
                                                size={20}
                                                color="#1792FE"
                                            />
                                        </View>
                                        <View style={styles.teamHeaderText}>
                                            <Text style={styles.teamTitle}>
                                                {equipa.nome}
                                            </Text>
                                            <Text style={styles.teamSubtitle}>
                                                {equipa.membros?.length || 0}{" "}
                                                membro(s)
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.teamHeaderRight}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                iniciarEdicao(equipa)
                                            }
                                            style={styles.editButton}
                                        >
                                            <FontAwesome
                                                name="edit"
                                                size={16}
                                                color="#28a745"
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                confirmarRemocaoEquipa(
                                                    equipa.nome,
                                                )
                                            }
                                            style={styles.deleteButton}
                                        >
                                            <FontAwesome
                                                name="trash"
                                                size={16}
                                                color="#dc3545"
                                            />
                                        </TouchableOpacity>
                                        <Animated.View
                                            style={{
                                                transform: [
                                                    {
                                                        rotate: isExpanded
                                                            ? "180deg"
                                                            : "0deg",
                                                    },
                                                ],
                                            }}
                                        >
                                            <Ionicons
                                                name="chevron-down"
                                                size={20}
                                                color="#1792FE"
                                            />
                                        </Animated.View>
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.teamContent}>
                                        <View style={styles.teamDetail}>
                                            <FontAwesome
                                                name="user-circle"
                                                size={16}
                                                color="#28a745"
                                            />
                                            <Text
                                                style={styles.teamDetailLabel}
                                            >
                                                Encarregado:
                                            </Text>
                                            <Text
                                                style={styles.teamDetailValue}
                                            >
                                                {equipa.encarregado?.nome ||
                                                    "Não definido"}
                                            </Text>
                                        </View>

                                        <View style={styles.membersSection}>
                                            <Text style={styles.membersTitle}>
                                                <FontAwesome
                                                    name="users"
                                                    size={16}
                                                    color="#1792FE"
                                                />{" "}
                                                Membros (
                                                {equipa.membros?.length || 0})
                                            </Text>
                                            {equipa.membros?.map(
                                                (membro, memberIndex) => (
                                                    <View
                                                        key={`member-${membro.id}-${memberIndex}`}
                                                        style={styles.memberRow}
                                                    >
                                                        <FontAwesome
                                                            name={membro.tipo === 'externo' ? 'user-circle' : 'user'}
                                                            size={14}
                                                            color={membro.tipo === 'externo' ? '#28a745' : '#666'}
                                                        />
                                                        <Text
                                                            style={
                                                                styles.memberName
                                                            }
                                                        >
                                                            {membro.nome || membro.email}
                                                            {membro.tipo === 'externo' && membro.empresa && 
                                                                ` (${membro.empresa})`
                                                            }
                                                        </Text>
                                                    </View>
                                                ),
                                            )}
                                        </View>
                                    </View>
                                )}
                            </LinearGradient>
                        </View>
                    );
                })
            )}
        </View>
    );

    return (
        <LinearGradient
            colors={["#e3f2fd", "#bbdefb", "#90caf9"]}
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {renderHeader()}
                {renderFormSection()}
                {renderTeamsSection()}
            </ScrollView>

            <Modal
                visible={modalEditar}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalEditar(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={["#1792FE", "#0B5ED7"]}
                            style={styles.modalHeader}
                        >
                            <FontAwesome
                                name="edit"
                                size={24}
                                color="#FFFFFF"
                            />
                            <Text
                                style={[styles.modalTitle, { marginLeft: 10 }]}
                            >
                                Editar Equipa
                            </Text>
                        </LinearGradient>

                        <ScrollView
                            style={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>
                                    <FontAwesome
                                        name="tag"
                                        size={16}
                                        color="#1792FE"
                                    />{" "}
                                    Nome da Equipa
                                </Text>
                                <TextInput
                                    value={novoNomeEquipa}
                                    onChangeText={setNovoNomeEquipa}
                                    style={styles.modalInput}
                                    placeholder="Nome da equipa"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>
                                    <FontAwesome
                                        name="users"
                                        size={16}
                                        color="#1792FE"
                                    />{" "}
                                    Membros da Equipa
                                </Text>
                                <Text style={styles.selectedCount}>
                                    {membrosSelecionados.length} de{" "}
                                    {utilizadores.length} selecionados
                                </Text>

                                <View style={styles.modalMembersWrapper}>
                                    <TextInput
                                        style={styles.searchInput}
                                        value={searchMembros}
                                        onChangeText={setSearchMembros}
                                        placeholder="Pesquisar membro..."
                                        placeholderTextColor="#999"
                                    />
                                    <ScrollView
                                        style={styles.modalMembersContainer}
                                        nestedScrollEnabled={true}
                                    >
                                        {utilizadores
                                            .filter((user) => {
                                                const searchLower = searchMembros.toLowerCase();
                                                const nome = (user.nome || user.name || user.username || "").toLowerCase();
                                                const email = (user.email || "").toLowerCase();
                                                return nome.includes(searchLower) || email.includes(searchLower);
                                            })
                                            .map((user) => (
                                            <TouchableOpacity
                                                key={`modal-user-${user.id}`}
                                                style={[
                                                    styles.modalMemberItem,
                                                    membrosSelecionados.includes(
                                                        user.id,
                                                    ) && styles.modalMemberSelected,
                                                ]}
                                                onPress={() =>
                                                    toggleMembro(user.id)
                                                }
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.memberContent}>
                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            membrosSelecionados.includes(
                                                                user.id,
                                                            ) && styles.checkedBox,
                                                        ]}
                                                    >
                                                        {membrosSelecionados.includes(
                                                            user.id,
                                                        ) && (
                                                            <FontAwesome
                                                                name="check"
                                                                size={12}
                                                                color="#FFFFFF"
                                                            />
                                                        )}
                                                    </View>
                                                    <FontAwesome
                                                        name="user"
                                                        size={16}
                                                        color="#1792FE"
                                                        style={styles.userIcon}
                                                    />
                                                    <View style={styles.memberInfo}>
                                                        <Text
                                                            style={
                                                                styles.memberName
                                                            }
                                                        >
                                                            {user.nome ||
                                                                user.name ||
                                                                user.username ||
                                                                user.email.split(
                                                                    "@",
                                                                )[0]}
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.memberEmail
                                                            }
                                                        >
                                                            {user.email}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>
                                    <FontAwesome
                                        name="user-plus"
                                        size={16}
                                        color="#1792FE"
                                    />{" "}
                                    Trabalhadores Externos
                                </Text>
                                <Text style={styles.selectedCount}>
                                    {externosSelecionados.length} de{" "}
                                    {trabalhadoresExternos.length} selecionados
                                </Text>

                                <View style={styles.modalMembersWrapper}>
                                    <ScrollView
                                        style={styles.modalMembersContainer}
                                        nestedScrollEnabled={true}
                                    >
                                        {trabalhadoresExternos.map((externo) => (
                                            <TouchableOpacity
                                                key={`modal-externo-${externo.id}`}
                                                style={[
                                                    styles.modalMemberItem,
                                                    externosSelecionados.includes(externo.id) && styles.modalMemberSelected,
                                                ]}
                                                onPress={() => toggleExterno(externo.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.memberContent}>
                                                    <View
                                                        style={[
                                                            styles.checkbox,
                                                            externosSelecionados.includes(externo.id) && styles.checkedBox,
                                                        ]}
                                                    >
                                                        {externosSelecionados.includes(externo.id) && (
                                                            <FontAwesome
                                                                name="check"
                                                                size={12}
                                                                color="#FFFFFF"
                                                            />
                                                        )}
                                                    </View>
                                                    <FontAwesome
                                                        name="user-circle"
                                                        size={16}
                                                        color="#28a745"
                                                        style={styles.userIcon}
                                                    />
                                                    <View style={styles.memberInfo}>
                                                        <Text style={styles.memberName}>
                                                            {externo.funcionario}
                                                        </Text>
                                                        <Text style={styles.memberEmail}>
                                                            {externo.empresa} • {externo.categoria || 'N/A'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalEditar(false);
                                    setEquipaSelecionadaEditar(null);
                                    setNovoNomeEquipa("");
                                    setMembrosSelecionados([]);
                                    setExternosSelecionados([]);
                                    setSearchMembros("");
                                }}
                                style={styles.cancelButton}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={salvarEdicaoEquipa}
                                style={styles.saveButton}
                            >
                                <LinearGradient
                                    colors={["#28a745", "#20c997"]}
                                    style={styles.saveButtonGradient}
                                >
                                    <Text style={styles.saveButtonText}>
                                        Guardar
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={modalConfirmDelete}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalConfirmDelete(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={["#dc3545", "#c82333"]}
                            style={styles.modalHeader}
                        >
                            <FontAwesome
                                name="exclamation-triangle"
                                size={24}
                                color="#FFFFFF"
                            />
                            <Text
                                style={[styles.modalTitle, { marginLeft: 10 }]}
                            >
                                Confirmar Eliminação
                            </Text>
                        </LinearGradient>

                        <View style={styles.modalBody}>
                            <Text style={styles.confirmText}>
                                Tens a certeza que queres remover a equipa{" "}
                                <Text style={styles.teamNameText}>
                                    "{equipaParaRemover?.nome}"
                                </Text>
                                ?
                            </Text>
                            <Text style={styles.warningText}>
                                Esta ação não pode ser desfeita.
                            </Text>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setModalConfirmDelete(false);
                                        setEquipaParaRemover(null);
                                    }}
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={removerEquipaInteira}
                                    style={styles.deleteConfirmButton}
                                >
                                    <LinearGradient
                                        colors={["#dc3545", "#c82333"]}
                                        style={styles.saveButtonGradient}
                                    >
                                        <Text
                                            style={[
                                                styles.saveButtonText,
                                                { marginLeft: 8 },
                                            ]}
                                        >
                                            Eliminar
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

export default CriarEquipa;
