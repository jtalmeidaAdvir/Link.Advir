import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Animated,
    ScrollView,
    TextInput,
    Modal,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";

const UserModulesManagement = ({ route }) => {
    const { userId } = route.params;
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [userModulos, setUserModulos] = useState([]);
    const [availableSubmodules, setAvailableSubmodules] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState({});
    const [fadeAnimation] = useState(new Animated.Value(0));
    const [showUserDataModal, setShowUserDataModal] = useState(false);
    const [userData, setUserData] = useState({
        empresa_areacliente: "",
        id_tecnico: "",
        tipoUser: "Trabalhador",
        codFuncionario: "",
        codRecursosHumanos: "",
        naotratapontosalmoco: false, // Initialize the new field
    });

    const { t } = useTranslation();

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        console.log("🚀 useEffect chamado com userId:", userId);
        fetchEmpresaModulos();
        fetchUserModulos(userId);
        fetchUserData();
    }, [userId]);

    const fetchEmpresaModulos = async () => {
        try {
            console.log("📋 Iniciando fetchEmpresaModulos para userId:", userId);
            setLoading(true);

            const empresaId = localStorage.getItem("empresa_id");
            if (!empresaId) {
                throw new Error("Empresa não selecionada");
            }

            // Buscar módulos da empresa
            const response = await fetch(
                `https://backend.advir.pt/api/empresas/${empresaId}/modulos`,
            );
            const data = await response.json();
            console.log("📋 Resposta de empresa-modulos:", data);

            if (!response.ok) {
                throw new Error(
                    data.message || "Erro ao carregar módulos da empresa.",
                );
            }

            const modulos = data.modulos || [];
            console.log("📋 Módulos encontrados:", modulos);
            setEmpresaModulos(modulos);

            // Initialize expanded state for all modules
            const initialExpandState = {};
            modulos.forEach((module) => {
                initialExpandState[module.id] = false;
            });
            setExpandedModules(initialExpandState);

            // Fetch available submodules for each module
            await fetchAvailableSubmodules(empresaId, modulos);

            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Erro ao carregar módulos da empresa.");
            console.error("❌ Erro em fetchEmpresaModulos:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserModulos = async (userId) => {
        try {
            const empresaId = localStorage.getItem("empresa_id");
            if (!empresaId) {
                throw new Error("Empresa não selecionada");
            }

            const url = `https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos?empresa_id=${empresaId}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("loginToken")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Erro ao buscar módulos do utilizador");
            }

            const data = await response.json();
            console.log("👤 Módulos do utilizador:", data);
            setUserModulos(data.modulos || []);
        } catch (error) {
            console.error("❌ Erro ao carregar módulos do utilizador:", error);
            setErrorMessage("Erro ao carregar módulos do utilizador.");
        }
    };

    const fetchAvailableSubmodules = async (empresaId, modulos) => {
        try {
            console.log("🎯 fetchAvailableSubmodules INICIADO com:", {
                empresaId,
                modulos,
            });
            const availableSubmodulesData = {};

            for (const modulo of modulos) {
                console.log(
                    `🔍 Buscando submódulos para módulo ${modulo.id} (${modulo.nome}), empresaId: ${empresaId}`,
                );

                // Busca os submódulos que a empresa tem associados a este módulo
                const empresaSubmodulosResponse = await fetch(
                    `https://backend.advir.pt/api/empresas/${empresaId}/modulos/${modulo.id}/submodulos`,
                );

                if (empresaSubmodulosResponse.ok) {
                    const empresaSubmodulosData = await empresaSubmodulosResponse.json();
                    console.log(
                        `📊 Submódulos disponíveis na empresa para módulo ${modulo.nome}:`,
                        empresaSubmodulosData,
                    );
                    availableSubmodulesData[modulo.id] = empresaSubmodulosData.submodulos || [];
                } else {
                    console.log(
                        `⚠️ Erro ao buscar submódulos da empresa para o módulo ${modulo.nome}`,
                    );
                    availableSubmodulesData[modulo.id] = [];
                }
            }

            console.log("✅ setAvailableSubmodules chamado com:", availableSubmodulesData);
            setAvailableSubmodules(availableSubmodulesData);
        } catch (error) {
            console.error("❌ Erro ao carregar submódulos disponíveis:", error);
            const emptySubmodules = {};
            modulos.forEach((modulo) => {
                emptySubmodules[modulo.id] = [];
            });
            setAvailableSubmodules(emptySubmodules);
        }
    };

    const isModuloChecked = (moduloId) => {
        return userModulos.some((m) => m.id === moduloId);
    };

    const isSubmoduloChecked = (moduloId, submoduloId) => {
        const modulo = userModulos.find((m) => m.id === moduloId);
        return modulo?.submodulos?.some((sm) => sm.id === submoduloId) || false;
    };

    const handleToggleModulo = async (moduloId, isChecked) => {
        const url = isChecked
            ? "https://backend.advir.pt/api/modulos/associar"
            : "https://backend.advir.pt/api/modulos/remover";

        try {
            setSuccessMessage("");
            setErrorMessage("");

            const empresaId = localStorage.getItem("empresa_id");

            console.log("🔄 Toggle módulo:", { userId, moduloId, empresaId, isChecked });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("loginToken")}`,
                },
                body: JSON.stringify({
                    userid: userId,
                    moduloid: moduloId,
                    empresaId: empresaId,
                }),
            });

            const responseData = await response.json();
            console.log("📡 Resposta do toggle módulo:", responseData);

            if (response.ok) {
                await fetchUserModulos(userId);
                setSuccessMessage(
                    isChecked
                        ? "Módulo associado com sucesso!"
                        : "Módulo removido com sucesso!",
                );

                setTimeout(() => {
                    setSuccessMessage("");
                }, 3000);
            } else {
                console.error("❌ Erro na resposta:", responseData);
                setErrorMessage(responseData.message || "Falha ao atualizar módulo.");
            }
        } catch (error) {
            console.error("❌ Error toggling module:", error);
            setErrorMessage("Erro ao atualizar módulo.");
        }
    };

    const handleToggleSubmodulo = async (
        moduloId,
        submoduloId,
        isCurrentlyChecked,
    ) => {
        const url = isCurrentlyChecked
            ? "https://backend.advir.pt/api/submodulos/remover"
            : "https://backend.advir.pt/api/submodulos/associar";

        try {
            setSuccessMessage("");
            setErrorMessage("");

            const empresaId = localStorage.getItem("empresa_id");

            console.log("🔄 Toggle submódulo:", { userId, submoduloId, empresaId, isCurrentlyChecked });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("loginToken")}`,
                },
                body: JSON.stringify({
                    userid: userId,
                    submoduloid: submoduloId,
                    empresaId: empresaId,
                }),
            });

            const responseData = await response.json();
            console.log("📡 Resposta do toggle submódulo:", responseData);

            if (response.ok) {
                await fetchUserModulos(userId);
                setSuccessMessage(
                    isCurrentlyChecked
                        ? "Submódulo removido com sucesso!"
                        : "Submódulo associado com sucesso!",
                );

                setTimeout(() => {
                    setSuccessMessage("");
                }, 3000);
            } else {
                console.error("❌ Erro na resposta:", responseData);
                setErrorMessage(responseData.message || "Falha ao atualizar submódulo.");
            }
        } catch (error) {
            console.error("❌ Error toggling submodule:", error);
            setErrorMessage("Erro ao atualizar submódulo.");
        }
    };

    const fetchUserData = async () => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/users/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("loginToken")}`,
                    },
                },
            );

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("❌ Resposta inesperada:", text); // Mostra o HTML de erro
                setErrorMessage(
                    "Erro inesperado ao obter dados do utilizador.",
                );
                return;
            }

            const data = await response.json();

            if (response.ok) {
                setUserData({
                    empresa_areacliente: data.empresa_areacliente || "",
                    id_tecnico: data.id_tecnico || "",
                    tipoUser: data.tipoUser || "Trabalhador",
                    codFuncionario: data.codFuncionario || "",
                    codRecursosHumanos: data.codRecursosHumanos || "",
                    naotratapontosalmoco: data.naotratapontosalmoco || false, // Set the new field from API
                });
            } else {
                setErrorMessage("Erro ao obter dados do utilizador.");
                console.error("❌ Resposta da API:", data);
            }
        } catch (error) {
            console.error("Erro ao carregar dados do utilizador:", error);
            setErrorMessage("Erro ao carregar dados do utilizador.");
        }
    };

    const handleSaveUserData = async () => {
        try {
            setSuccessMessage("");
            setErrorMessage("");

            const response = await fetch(
                `https://backend.advir.pt/api/users/${userId}/dados-utilizador`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("loginToken")}`,
                    },
                    body: JSON.stringify(userData),
                },
            );

            if (response.ok) {
                setSuccessMessage(
                    "Dados do utilizador atualizados com sucesso!",
                );
                setShowUserDataModal(false);

                setTimeout(() => {
                    setSuccessMessage("");
                }, 3000);
            } else {
                setErrorMessage("Erro ao atualizar dados do utilizador.");
            }
        } catch (error) {
            console.error("Erro ao atualizar dados do utilizador:", error);
            setErrorMessage("Erro ao atualizar dados do utilizador.");
        }
    };

    const toggleModuleExpand = (moduleId) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleId]: !prev[moduleId],
        }));
    };

    const renderSubmoduleItem = (submodulo, moduleId) => {
        const isChecked = isSubmoduloChecked(moduleId, submodulo.id);

        return (
            <View style={styles.submoduleItem} key={submodulo.id}>
                <View style={styles.submoduleContent}>
                    <MaterialCommunityIcons
                        name="subdirectory-arrow-right"
                        size={18}
                        color="#4481EB"
                    />
                    <Text style={styles.submoduleText}>{submodulo.nome}</Text>
                </View>

                <Switch
                    trackColor={{ false: "#e0e0e0", true: "#c4dafa" }}
                    thumbColor={isChecked ? "#4481EB" : "#f4f3f4"}
                    ios_backgroundColor="#e0e0e0"
                    onValueChange={() =>
                        handleToggleSubmodulo(moduleId, submodulo.id, isChecked)
                    }
                    value={isChecked}
                />
            </View>
        );
    };

    const renderModuleItem = ({ item }) => {
        const isExpanded = expandedModules[item.id];
        const isChecked = isModuloChecked(item.id);

        // Always render the module - it may have no submodules or submodules may be loading
        // if (!availableSubmodules[item.id] || availableSubmodules[item.id].length === 0) {
        //     return null;
        // }

        return (
            <View style={styles.moduleCard}>
                <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={() => toggleModuleExpand(item.id)}
                >
                    <View style={styles.moduleTitle}>
                        <MaterialCommunityIcons
                            name="view-dashboard-outline"
                            size={22}
                            color="#4481EB"
                        />
                        <Text style={styles.moduleName}>{item.nome}</Text>
                    </View>

                    <View style={styles.moduleControls}>
                        <Switch
                            trackColor={{ false: "#e0e0e0", true: "#c4dafa" }}
                            thumbColor={isChecked ? "#4481EB" : "#f4f3f4"}
                            ios_backgroundColor="#e0e0e0"
                            onValueChange={(value) =>
                                handleToggleModulo(item.id, value)
                            }
                            value={isChecked}
                            style={styles.moduleSwitch}
                        />

                        <Ionicons
                            name={
                                isExpanded
                                    ? "chevron-up-circle"
                                    : "chevron-down-circle"
                            }
                            size={22}
                            color="#4481EB"
                        />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.submodulesContainer}>
                        {(() => {
                            // Get all available submodules for this module from the company
                            const availableSubmodulesForModule =
                                availableSubmodules[item.id] || [];

                            console.log(
                                `🔧 Renderizando submódulos para módulo ${item.nome} (ID: ${item.id}):`,
                                availableSubmodulesForModule,
                            );
                            console.log(
                                "🔧 Estado completo availableSubmodules:",
                                availableSubmodules,
                            );
                            console.log(
                                "🔧 Chaves disponíveis:",
                                Object.keys(availableSubmodules),
                            );
                            console.log(
                                `🔧 availableSubmodules[${item.id}]:`,
                                availableSubmodules[item.id],
                            );

                            if (availableSubmodulesForModule.length > 0) {
                                return availableSubmodulesForModule.map(
                                    (submodulo) =>
                                        renderSubmoduleItem(submodulo, item.id),
                                );
                            } else {
                                // This case should ideally not be reached due to the filter above,
                                // but kept for safety and debugging.
                                return (
                                    <View style={styles.noSubmodulesContainer}>
                                        <Text style={styles.noSubmodulesText}>
                                            {Object.keys(availableSubmodules)
                                                .length === 0
                                                ? "A carregar submódulos..."
                                                : `Nenhum submódulo disponível para o módulo ${item.nome}`}
                                        </Text>
                                        {Object.keys(availableSubmodules)
                                            .length > 0 && (
                                                <Text style={styles.debugText}>
                                                    Debug: availableSubmodules[
                                                    {item.id}] ={" "}
                                                    {JSON.stringify(
                                                        availableSubmodules[
                                                        item.id
                                                        ],
                                                    )}
                                                </Text>
                                            )}
                                    </View>
                                );
                            }
                        })()}
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={["#4481EB", "#04BEFE"]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>
                        {t("UserModulesManagement.Title")}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Gira os módulos do utilizador
                    </Text>
                    <TouchableOpacity
                        style={styles.editUserButton}
                        onPress={() => setShowUserDataModal(true)}
                    >
                        <MaterialCommunityIcons
                            name="account-edit"
                            size={18}
                            color="#ffffff"
                        />
                        <Text style={styles.editUserButtonText}>
                            Editar Dados
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnimation,
                        transform: [
                            {
                                translateY: fadeAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [50, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={22}
                            color="#ff6b6b"
                        />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <MaterialCommunityIcons
                            name="check-circle"
                            size={22}
                            color="#28A745"
                        />
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>
                            A carregar módulos...
                        </Text>
                    </View>
                ) : (
                    <View style={styles.modulesContainer}>
                        <FlatList
                            data={empresaModulos}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderModuleItem}
                            contentContainerStyle={styles.moduleList}
                            scrollEnabled={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons
                                        name="view-dashboard-outline"
                                        size={60}
                                        color="#d1dbed"
                                    />
                                    <Text style={styles.emptyTitle}>
                                        Sem módulos disponíveis
                                    </Text>
                                    <Text style={styles.emptyText}>
                                        Não foram encontrados módulos para esta
                                        empresa.
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                )}
            </Animated.View>

            <Modal
                visible={showUserDataModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUserDataModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Editar Dados do Utilizador
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowUserDataModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Empresa/Área Cliente:
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={userData.empresa_areacliente}
                                    onChangeText={(text) =>
                                        setUserData({
                                            ...userData,
                                            empresa_areacliente: text,
                                        })
                                    }
                                    placeholder="Digite a empresa ou área cliente"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    ID Técnico:
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={userData.id_tecnico}
                                    onChangeText={(text) =>
                                        setUserData({
                                            ...userData,
                                            id_tecnico: text,
                                        })
                                    }
                                    placeholder="Digite o ID do técnico"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Código de Funcionário:
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={userData.codFuncionario}
                                    onChangeText={(text) =>
                                        setUserData({
                                            ...userData,
                                            codFuncionario: text,
                                        })
                                    }
                                    placeholder="Digite o código do funcionário"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Código Recursos Humanos:
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={userData.codRecursosHumanos}
                                    onChangeText={(text) =>
                                        setUserData({
                                            ...userData,
                                            codRecursosHumanos: text,
                                        })
                                    }
                                    placeholder="Digite o código de RH"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Tipo de Utilizador:
                                </Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={userData.tipoUser}
                                        onValueChange={(value) =>
                                            setUserData({
                                                ...userData,
                                                tipoUser: value,
                                            })
                                        }
                                        style={styles.picker}
                                    >
                                        <Picker.Item
                                            label="Trabalhador"
                                            value="Trabalhador"
                                        />
                                        <Picker.Item
                                            label="Encarregado"
                                            value="Encarregado"
                                        />
                                        <Picker.Item
                                            label="Diretor"
                                            value="Diretor"
                                        />
                                        <Picker.Item
                                            label="Orçamentista"
                                            value="Orçamentista"
                                        />
                                        <Picker.Item
                                            label="Externo"
                                            value="Externo"
                                        />
                                        <Picker.Item
                                            label="Administrador"
                                            value="Administrador"
                                        />
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.checkboxContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.checkbox,
                                            userData.naotratapontosalmoco && styles.checkboxChecked
                                        ]}
                                        onPress={() =>
                                            setUserData({
                                                ...userData,
                                                naotratapontosalmoco: !userData.naotratapontosalmoco,
                                            })
                                        }
                                    >
                                        {userData.naotratapontosalmoco && (
                                            <Ionicons name="checkmark" size={16} color="#ffffff" />
                                        )}
                                    </TouchableOpacity>
                                    <Text style={styles.checkboxLabel}>
                                        Não tratar pontos de almoço automaticamente
                                    </Text>
                                </View>
                                <Text style={styles.checkboxDescription}>
                                    Se ativado, este utilizador não será incluído na verificação automática de pontos de almoço
                                </Text>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowUserDataModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSaveUserData}
                                >
                                    <Text style={styles.saveButtonText}>
                                        Guardar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#d4e4ff",
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        width: "100%",
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerContent: {
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.9)",
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8d7da",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: "#ff6b6b",
        marginLeft: 10,
        fontSize: 14,
        fontWeight: "500",
    },
    successContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#d4edda",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    successText: {
        color: "#28A745",
        marginLeft: 10,
        fontSize: 14,
        fontWeight: "500",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: "#777",
    },
    modulesContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 5,
    },
    sectionDescription: {
        fontSize: 14,
        color: "#666",
        marginBottom: 20,
    },
    moduleList: {
        paddingBottom: 10,
    },
    moduleCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    moduleHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
    },
    moduleTitle: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    moduleName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginLeft: 10,
    },
    moduleControls: {
        flexDirection: "row",
        alignItems: "center",
    },
    moduleSwitch: {
        marginRight: 10,
    },
    submodulesContainer: {
        backgroundColor: "#f9fafc",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingVertical: 8,
    },
    submoduleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    submoduleContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    submoduleText: {
        fontSize: 14,
        color: "#555",
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginTop: 15,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#777",
        textAlign: "center",
        maxWidth: "80%",
    },
    noSubmodulesContainer: {
        padding: 16,
        alignItems: "center",
    },
    noSubmodulesText: {
        fontSize: 14,
        color: "#888",
        fontStyle: "italic",
        textAlign: "center",
    },
    debugText: {
        fontSize: 12,
        color: "#666",
        fontStyle: "italic",
        textAlign: "center",
        marginTop: 5,
        paddingHorizontal: 10,
    },
    editUserButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
    },
    editUserButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 20,
        width: "100%",
        maxWidth: 400,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f9fafc",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 12,
        backgroundColor: "#f9fafc",
    },
    picker: {
        height: 50,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        alignItems: "center",
        marginRight: 10,
    },
    cancelButtonText: {
        fontSize: 16,
        color: "#666",
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#4481EB",
        alignItems: "center",
        marginLeft: 10,
    },
    saveButtonText: {
        fontSize: 16,
        color: "#ffffff",
        fontWeight: "600",
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 4,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: '#4481EB',
        borderColor: '#4481EB',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    checkboxDescription: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginLeft: 32,
        lineHeight: 16,
    },
});

export default UserModulesManagement;