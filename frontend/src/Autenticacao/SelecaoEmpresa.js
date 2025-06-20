import React, { useState, useEffect } from "react";
import {
    ActivityIndicator,
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Dimensions,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import backgroundImage from "../../images/ImagemFundo.png";

const SelecaoEmpresa = ({ setEmpresa }) => {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState("");
    const [empresaPredefinida, setEmpresaPredefinida] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const navigation = useNavigation();
    const { t } = useTranslation();
    const windowWidth = Dimensions.get("window").width;

    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                const loginToken = localStorage.getItem("loginToken");
                const userId = localStorage.getItem("userId");

                // Verificar se há uma empresa predefinida no servidor primeiro
                const empresaPredefinidaResponse = await fetch(
                    `https://backend.advir.pt/api/users/${userId}/empresa-predefinida`, //${userId}
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${loginToken}`,
                        },
                    },
                );

                let empresaPredefinidaServidor = null;
                if (empresaPredefinidaResponse.ok) {
                    const data = await empresaPredefinidaResponse.json();
                    empresaPredefinidaServidor = data.empresaPredefinida;
                }

                const response = await fetch(
                    "https://backend.advir.pt/api/users/empresas",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${loginToken}`,
                        },
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    setEmpresas(data);

                    // Verificar se há uma empresa predefinida no servidor
                    if (empresaPredefinidaServidor) {
                        const empresaExiste = data.find(
                            (emp) => emp.empresa === empresaPredefinidaServidor,
                        );
                        if (empresaExiste) {
                            setEmpresaSelecionada(empresaPredefinidaServidor);
                            setEmpresaPredefinida(true);
                            localStorage.setItem(
                                "empresaPredefinida",
                                empresaPredefinidaServidor,
                            );
                            await handleEntrarEmpresa(
                                empresaPredefinidaServidor,
                            );
                            return;
                        }
                    }

                    // Fallback: verificar localStorage (para compatibilidade)
                    const empresaPredefinidaStorage =
                        localStorage.getItem("empresaPredefinida");
                    if (empresaPredefinidaStorage) {
                        const empresaExiste = data.find(
                            (emp) => emp.empresa === empresaPredefinidaStorage,
                        );
                        if (empresaExiste) {
                            setEmpresaSelecionada(empresaPredefinidaStorage);
                            setEmpresaPredefinida(true);
                            await handleEntrarEmpresa(
                                empresaPredefinidaStorage,
                            );
                            return;
                        } else {
                            // Remove empresa predefinida se não existir mais
                            localStorage.removeItem("empresaPredefinida");
                        }
                    }

                    // Verificar se só há uma empresa
                    if (data.length === 1) {
                        setEmpresaSelecionada(data[0].empresa);
                        await handleEntrarEmpresa(data[0].empresa);
                    }
                } else {
                    setErrorMessage(t("SelecaoEmpresa.Error.1"));
                }
            } catch (error) {
                console.error("Erro de rede:", error);
                setErrorMessage("Erro de rede, tente novamente mais tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchEmpresas();
    }, []);

    const handlePredefinirEmpresa = async (checked) => {
        setEmpresaPredefinida(checked);
        const userId = localStorage.getItem("userId");
        const loginToken = localStorage.getItem("loginToken");

        try {
            const response = await fetch(
                `https://backend.advir.pt/api/users/${userId}/empresa-predefinida`, //${userId}
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${loginToken}`,
                    },
                    body: JSON.stringify({
                        empresaPredefinida: checked ? empresaSelecionada : null,
                    }),
                },
            );

            if (response.ok) {
                if (checked && empresaSelecionada) {
                    localStorage.setItem(
                        "empresaPredefinida",
                        empresaSelecionada,
                    );
                } else {
                    localStorage.removeItem("empresaPredefinida");
                }
            } else {
                console.error("Erro ao salvar empresa predefinida no servidor");
                // Reverter o estado se houver erro
                setEmpresaPredefinida(!checked);
            }
        } catch (error) {
            console.error("Erro de rede ao salvar empresa predefinida:", error);
            // Reverter o estado se houver erro
            setEmpresaPredefinida(!checked);
        }
    };

    const handleEntrarEmpresa = async (empresaForcada) => {
        const empresa = empresaForcada || empresaSelecionada;

        if (!empresa) {
            setErrorMessage(t("SelecaoEmpresa.Aviso.1"));
            return;
        }

        console.log("Empresa enviada para a API:", empresa);

        setLoadingButton(true);

        try {
            const loginToken = localStorage.getItem("loginToken");

            const credenciaisResponse = await fetch(
                `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresa)}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${loginToken}`,
                    },
                },
            );

            if (credenciaisResponse.ok) {
                const credenciais = await credenciaisResponse.json();

                localStorage.setItem("urlempresa", credenciais.urlempresa);

                const response = await fetch(
                    "https://webapiprimavera.advir.pt/connect-database/token",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${loginToken}`,
                        },
                        body: JSON.stringify({
                            username: credenciais.username,
                            password: credenciais.password,
                            company: credenciais.empresa,
                            line: credenciais.linha,
                            instance: "DEFAULT",
                            urlempresa: credenciais.urlempresa,
                            forceRefresh: true,
                        }),
                    },
                );

                if (response.ok) {
                    const data = await response.json();

                    localStorage.setItem("painelAdminToken", data.token);
                    console.log("Token atualizado e guardado:", data.token);

                    localStorage.setItem("empresaSelecionada", empresa);
                    setEmpresa(empresa);

                    navigation.navigate("Home");
                } else {
                    const errorData = await response.json();
                    setErrorMessage(
                        errorData.message ||
                        "Erro ao obter o token da empresa.",
                    );
                }
            } else {
                const errorData = await credenciaisResponse.json();
                setErrorMessage(
                    errorData.message || t("SelecaoEmpresa.Error.1"),
                );
            }
        } catch (error) {
            console.error("Erro de rede:", error);
            setErrorMessage("Erro de rede, tente novamente mais tarde.");
        } finally {
            setLoadingButton(false);
        }
    };

    // Renderizar empresas como botões individuais
    const renderEmpresasButtons = () => {
        if (empresas.length === 0) {
            return (
                <Text style={styles.infoText}>Nenhuma empresa disponível</Text>
            );
        }

        return (
            <View style={styles.empresasGrid}>
                {empresas.map((empresa, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.empresaButton,
                            empresaSelecionada === empresa.empresa &&
                            styles.empresaButtonSelected,
                        ]}
                        onPress={() => {
                            setEmpresaSelecionada(empresa.empresa);
                            // Atualizar checkbox se esta empresa já está predefinida
                            const empresaPredefinidaStorage =
                                localStorage.getItem("empresaPredefinida");
                            setEmpresaPredefinida(
                                empresaPredefinidaStorage === empresa.empresa,
                            );
                        }}
                    >
                        <Text
                            style={[
                                styles.empresaButtonText,
                                empresaSelecionada === empresa.empresa &&
                                styles.empresaButtonTextSelected,
                            ]}
                        >
                            {empresa.empresa}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{t("SelecaoEmpresa.Title")}</Text>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" />
                        <Text style={styles.loadingText}>
                            Carregando empresas...
                        </Text>
                    </View>
                ) : (
                    <View style={styles.contentContainer}>
                        {renderEmpresasButtons()}
                        {empresaSelecionada && (
                            <View style={styles.checkboxContainer}>
                                <TouchableOpacity
                                    style={styles.checkboxWrapper}
                                    onPress={() =>
                                        handlePredefinirEmpresa(
                                            !empresaPredefinida,
                                        )
                                    }
                                >
                                    <View
                                        style={[
                                            styles.checkbox,
                                            empresaPredefinida &&
                                            styles.checkboxChecked,
                                        ]}
                                    >
                                        {empresaPredefinida && (
                                            <Text style={styles.checkboxCheck}>
                                                ✓
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.checkboxLabel}>
                                        Predefinir esta empresa como padrão
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {errorMessage ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                styles.entrarButton,
                                !empresaSelecionada &&
                                styles.entrarButtonDisabled,
                            ]}
                            onPress={() => handleEntrarEmpresa()}
                            disabled={loadingButton || !empresaSelecionada}
                        >
                            {loadingButton ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#ffffff"
                                />
                            ) : (
                                <Text style={styles.entrarButtonText}>
                                    {t("SelecaoEmpresa.BtEntrar")}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundColor: "#d4e4ff",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        padding: 20,
    },
    card: {
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        borderRadius: 24,
        padding: 30,
        width: "100%",
        maxWidth: 480,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1792FE",
        textAlign: "center",
        marginBottom: 30,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#555",
        marginBottom: 16,
        textAlign: "center",
    },
    contentContainer: {
        width: "100%",
    },
    empresasGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 24,
    },
    empresaButton: {
        backgroundColor: "#f0f7ff",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        margin: 6,
        minWidth: 140,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#e0e9f7",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        transition: "all 0.2s ease",
    },
    empresaButtonSelected: {
        backgroundColor: "#1792FE",
        borderColor: "#1792FE",
        transform: [{ scale: 1.05 }],
    },
    empresaButtonText: {
        color: "#444",
        fontWeight: "600",
        fontSize: 15,
    },
    empresaButtonTextSelected: {
        color: "#fff",
    },
    loadingContainer: {
        alignItems: "center",
        marginVertical: 30,
    },
    loadingText: {
        marginTop: 12,
        color: "#666",
        fontSize: 16,
    },
    errorContainer: {
        backgroundColor: "#fff1f0",
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: "#ff4d4f",
    },
    errorText: {
        color: "#cf1322",
        fontSize: 14,
    },
    entrarButton: {
        backgroundColor: "#1792FE",
        borderRadius: 12,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
        shadowColor: "#1792FE",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    entrarButtonDisabled: {
        backgroundColor: "#a0c8f0",
        shadowOpacity: 0,
    },
    entrarButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    infoText: {
        textAlign: "center",
        color: "#888",
        fontSize: 15,
        marginBottom: 20,
        fontStyle: "italic",
    },
    checkboxContainer: {
        marginBottom: 20,
        alignItems: "center",
    },
    checkboxWrapper: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: "#1792FE",
        borderRadius: 4,
        marginRight: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    checkboxChecked: {
        backgroundColor: "#1792FE",
    },
    checkboxCheck: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    checkboxLabel: {
        color: "#555",
        fontSize: 14,
        fontWeight: "500",
    },
});

export default SelecaoEmpresa;