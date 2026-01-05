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
import { secureStorage } from '../../utils/secureStorage';

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
        //console.log("🚀 useEffect chamado com userId:", userId);
        fetchEmpresaModulos();
        fetchUserModulos(userId);
        fetchUserData();
    }, [userId]);

    const fetchEmpresaModulos = async () => {
        try {
            //console.log("📋 Iniciando fetchEmpresaModulos para userId:", userId);
            setLoading(true);

            const empresaId = secureStorage.getItem("empresa_id");
            if (!empresaId) {
                throw new Error("Empresa não selecionada");
            }

            // Buscar módulos da empresa
            const response = await fetch(
                `https://backend.advir.pt/api/empresas/${empresaId}/modulos`,
            );
            const data = await response.json();
            //console.log("📋 Resposta de empresa-modulos:", data);

            if (!response.ok) {
                throw new Error(
                    data.message || "Erro ao carregar módulos da empresa.",
                );
            }

            const modulos = data.modulos || [];
            //console.log("📋 Módulos encontrados:", modulos);
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
            const empresaId = secureStorage.getItem("empresa_id");
            if (!empresaId) {
                throw new Error("Empresa não selecionada");
            }

            const url = `https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos?empresa_id=${empresaId}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${secureStorage.getItem("loginToken")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Erro ao buscar módulos do utilizador");
            }

            const data = await response.json();
            //console.log("👤 Módulos do utilizador:", data);
            setUserModulos(data.modulos || []);
        } catch (error) {
            console.error("❌ Erro ao carregar módulos do utilizador:", error);
            setErrorMessage("Erro ao carregar módulos do utilizador.");
        }
    };

    const fetchAvailableSubmodules = async (empresaId, modulos) => {
        try {
            
            const availableSubmodulesData = {};

            for (const modulo of modulos) {
               

                // Busca os submódulos que a empresa tem associados a este módulo
                const empresaSubmodulosResponse = await fetch(
                    `https://backend.advir.pt/api/empresas/${empresaId}/modulos/${modulo.id}/submodulos`,
                );

                if (empresaSubmodulosResponse.ok) {
                    const empresaSubmodulosData = await empresaSubmodulosResponse.json();
                   
                    availableSubmodulesData[modulo.id] = empresaSubmodulosData.submodulos || [];
                } else {
                   
                    availableSubmodulesData[modulo.id] = [];
                }
            }

            //console.log("✅ setAvailableSubmodules chamado com:", availableSubmodulesData);
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

            const empresaId = secureStorage.getItem("empresa_id");

            //console.log("🔄 Toggle módulo:", { userId, moduloId, empresaId, isChecked });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${secureStorage.getItem("loginToken")}`,
                },
                body: JSON.stringify({
                    userid: userId,
                    moduloid: moduloId,
                    empresaId: empresaId,
                }),
            });

            const responseData = await response.json();
            //console.log("📡 Resposta do toggle módulo:", responseData);

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

            const empresaId = secureStorage.getItem("empresa_id");

            //console.log("🔄 Toggle submódulo:", { userId, submoduloId, empresaId, isCurrentlyChecked });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${secureStorage.getItem("loginToken")}`,
                },
                body: JSON.stringify({
                    userid: userId,
                    submoduloid: submoduloId,
                    empresaId: empresaId,
                }),
            });

            const responseData = await response.json();
            //console.log("📡 Resposta do toggle submódulo:", responseData);

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
                        Authorization: `Bearer ${secureStorage.getItem("loginToken")}`,
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
                        Authorization: `Bearer ${secureStorage.getItem("loginToken")}`,
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
            <TouchableOpacity
                style={[styles.submoduleItem, isChecked && styles.submoduleItemActive]}
                key={submodulo.id}
                onPress={() => handleToggleSubmodulo(moduleId, submodulo.id, isChecked)}
                activeOpacity={0.7}
            >
                <View style={styles.submoduleContent}>
                    <View style={[styles.submoduleIndicator, isChecked && styles.submoduleIndicatorActive]} />
                    <MaterialCommunityIcons
                        name={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                        size={20}
                        color={isChecked ? "#4481EB" : "#95a5a6"}
                        style={styles.submoduleIcon}
                    />
                    <Text style={[styles.submoduleText, isChecked && styles.submoduleTextActive]}>
                        {submodulo.nome}
                    </Text>
                </View>

                <Switch
                    trackColor={{ false: "#dfe6e9", true: "#b2d7ff" }}
                    thumbColor={isChecked ? "#4481EB" : "#bdc3c7"}
                    ios_backgroundColor="#dfe6e9"
                    onValueChange={() =>
                        handleToggleSubmodulo(moduleId, submodulo.id, isChecked)
                    }
                    value={isChecked}
                />
            </TouchableOpacity>
        );
    };

    const renderModuleItem = ({ item }) => {
        const isExpanded = expandedModules[item.id];
        const isChecked = isModuloChecked(item.id);
        const availableSubmodulesForModule = availableSubmodules[item.id] || [];
        const submodulesCount = availableSubmodulesForModule.length;

        return (
            <View style={styles.moduleCard}>
                <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={() => toggleModuleExpand(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.moduleLeftSection}>
                        <View style={[styles.moduleIconContainer, isChecked && styles.moduleIconContainerActive]}>
                            <MaterialCommunityIcons
                                name="view-dashboard-outline"
                                size={24}
                                color={isChecked ? "#4481EB" : "#95a5a6"}
                            />
                        </View>
                        <View style={styles.moduleInfo}>
                            <Text style={styles.moduleName}>{item.nome}</Text>
                            {submodulesCount > 0 && (
                                <View style={styles.submoduleBadge}>
                                    <MaterialCommunityIcons name="folder-outline" size={12} color="#7f8c8d" />
                                    <Text style={styles.submoduleBadgeText}>
                                        {submodulesCount} {submodulesCount === 1 ? 'submódulo' : 'submódulos'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.moduleControls}>
                        <View style={styles.switchContainer}>
                            <Switch
                                trackColor={{ false: "#dfe6e9", true: "#b2d7ff" }}
                                thumbColor={isChecked ? "#4481EB" : "#bdc3c7"}
                                ios_backgroundColor="#dfe6e9"
                                onValueChange={(value) =>
                                    handleToggleModulo(item.id, value)
                                }
                                value={isChecked}
                            />
                        </View>

                        <Ionicons
                            name={
                                isExpanded
                                    ? "chevron-up-circle"
                                    : "chevron-down-circle"
                            }
                            size={26}
                            color={isChecked ? "#4481EB" : "#95a5a6"}
                        />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.submodulesContainer}>
                        {submodulesCount > 0 ? (
                            <>
                                <View style={styles.submodulesHeader}>
                                    <MaterialCommunityIcons name="folder-multiple-outline" size={16} color="#4481EB" />
                                    <Text style={styles.submodulesHeaderText}>Submódulos Disponíveis</Text>
                                </View>
                                {availableSubmodulesForModule.map((submodulo) =>
                                    renderSubmoduleItem(submodulo, item.id)
                                )}
                            </>
                        ) : (
                            <View style={styles.noSubmodulesContainer}>
                                <MaterialCommunityIcons
                                    name="folder-remove-outline"
                                    size={32}
                                    color="#d1dbed"
                                />
                                <Text style={styles.noSubmodulesText}>
                                    {Object.keys(availableSubmodules).length === 0
                                        ? "A carregar submódulos..."
                                        : "Sem submódulos disponíveis"}
                                </Text>
                            </View>
                        )}
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
        borderRadius: 18,
        marginBottom: 18,
        overflow: "hidden",
        shadowColor: "#4481EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#e8eef5",
    },
    moduleHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 18,
        backgroundColor: "#fff",
    },
    moduleLeftSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    moduleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#f5f7fa",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
        borderWidth: 1.5,
        borderColor: "#e8eef5",
    },
    moduleIconContainerActive: {
        backgroundColor: "#e6f2ff",
        borderColor: "#b2d7ff",
    },
    moduleInfo: {
        flex: 1,
    },
    moduleTitle: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    moduleName: {
        fontSize: 17,
        fontWeight: "700",
        color: "#2c3e50",
        letterSpacing: 0.3,
    },
    submoduleBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        backgroundColor: "#f5f7fa",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        alignSelf: "flex-start",
    },
    submoduleBadgeText: {
        fontSize: 11,
        color: "#7f8c8d",
        marginLeft: 4,
        fontWeight: "500",
    },
    moduleControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    switchContainer: {
        padding: 4,
    },
    moduleSwitch: {
        marginRight: 10,
    },
    submodulesContainer: {
        backgroundColor: "#fafbfd",
        borderTopWidth: 2,
        borderTopColor: "#e8eef5",
        paddingVertical: 12,
    },
    submodulesHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: "#f0f4f8",
    },
    submodulesHeaderText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#4481EB",
        marginLeft: 8,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    submoduleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
        paddingLeft: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f4f8",
        backgroundColor: "#fff",
    },
    submoduleItemActive: {
        backgroundColor: "#f8fbff",
    },
    submoduleContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    submoduleIndicator: {
        width: 3,
        height: 24,
        backgroundColor: "#e8eef5",
        borderRadius: 2,
        marginRight: 12,
    },
    submoduleIndicatorActive: {
        backgroundColor: "#4481EB",
    },
    submoduleIcon: {
        marginRight: 10,
    },
    submoduleText: {
        fontSize: 15,
        color: "#7f8c8d",
        fontWeight: "500",
        flex: 1,
    },
    submoduleTextActive: {
        color: "#2c3e50",
        fontWeight: "600",
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
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fbff",
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#e8eef5",
        borderStyle: "dashed",
    },
    noSubmodulesText: {
        fontSize: 14,
        color: "#95a5a6",
        fontWeight: "500",
        textAlign: "center",
        marginTop: 8,
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
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        marginTop: 12,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.4)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    editUserButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(44, 62, 80, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        width: "100%",
        maxWidth: 420,
        maxHeight: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 24,
        borderBottomWidth: 1.5,
        borderBottomColor: "#e8eef5",
        backgroundColor: "#fafbfd",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2c3e50",
        letterSpacing: 0.3,
    },
    modalBody: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 22,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2c3e50",
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: "#d1dbed",
        borderRadius: 14,
        padding: 14,
        fontSize: 16,
        backgroundColor: "#f9fafc",
        color: "#2c3e50",
    },
    pickerContainer: {
        borderWidth: 1.5,
        borderColor: "#d1dbed",
        borderRadius: 14,
        backgroundColor: "#f9fafc",
        overflow: "hidden",
    },
    picker: {
        height: 50,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 24,
        borderTopWidth: 1.5,
        borderTopColor: "#e8eef5",
        backgroundColor: "#fafbfd",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "#ecf0f1",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#d1dbed",
    },
    cancelButtonText: {
        fontSize: 16,
        color: "#7f8c8d",
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    saveButton: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "#4481EB",
        alignItems: "center",
        shadowColor: "#4481EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        fontSize: 16,
        color: "#ffffff",
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#f9fafc',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e8eef5',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#d1dbed',
        borderRadius: 6,
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
        color: '#2c3e50',
        fontWeight: '600',
        flex: 1,
        letterSpacing: 0.2,
    },
    checkboxDescription: {
        fontSize: 12,
        color: '#7f8c8d',
        lineHeight: 18,
        marginTop: 8,
        paddingLeft: 12,
        paddingRight: 8,
        backgroundColor: '#f0f4f8',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#4481EB',
    },
});

export default UserModulesManagement;