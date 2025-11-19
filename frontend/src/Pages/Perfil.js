import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import FacialScannerModal from "./Autenticacao/components/FacialScannerModal";
import QRCode from 'react-native-qrcode-svg';
import { secureStorage } from '../utils/secureStorage';

const Perfil = ({ user }) => {
    const [activeTab, setActiveTab] = useState("informacoes");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [userNome, setUserNome] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [isFacialRegistered, setIsFacialRegistered] = useState(false);
    const [isCameraAvailable, setIsCameraAvailable] = useState(false);
    const [facialScannerVisible, setFacialScannerVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mostrarQRCode, setMostrarQRCode] = useState(false);
    const [userId, setUserId] = useState(null);

    const fileInput = useRef(null);
    const { t } = useTranslation();

    useEffect(() => {
        const userNomeFromStorage = secureStorage.getItem("userNome");
        const userEmailFromStorage = secureStorage.getItem("userEmail");
        const userIdFromStorage = secureStorage.getItem("userId");
        setUserNome(userNomeFromStorage);
        setUserEmail(userEmailFromStorage);
        setUserId(userIdFromStorage);
        loadProfileImage();
    }, []);

    useEffect(() => {
        checkCameraAvailability();
        checkFacialBiometricStatus();
    }, []);

    const checkCameraAvailability = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setIsCameraAvailable(true);
            } catch (error) {
                console.error("Erro ao acessar a câmera:", error);
                setIsCameraAvailable(false);
            }
        } else {
            setIsCameraAvailable(false);
        }
    };

    const checkFacialBiometricStatus = async () => {
        try {
            const userEmail = secureStorage.getItem("userEmail");
            const response = await fetch(`https://backend.advir.pt/api/auth/biometric/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: userEmail, type: 'facial' }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsFacialRegistered(data.hasBiometric || false);
            }
        } catch (error) {
            console.error("Erro ao verificar o status da biometria facial:", error);
        }
    };

    const registerFacialBiometric = async () => {
        setIsLoading(true);
        try {
            const userId = parseInt(secureStorage.getItem("userId"));
            const userEmail = secureStorage.getItem("userEmail");

            if (!userEmail) throw new Error("Email do utilizador não encontrado");

            setFacialScannerVisible(true);

        } catch (error) {
            console.error("Erro ao iniciar registo de biometria facial:", error);
            showMessage(
                "Ocorreu um erro ao iniciar o registo facial: " + error.message,
                true,
            );
        } finally {
        }
    };

    const handleFacialScanComplete = async (facialData) => {
        if (!facialData) {
            showMessage("Nenhum dado facial recebido.", true);
            setFacialScannerVisible(false);
            return;
        }

        setIsLoading(true);
        try {
            const userId = parseInt(secureStorage.getItem("userId"));
            const userEmail = secureStorage.getItem("userEmail");
            const token = secureStorage.getItem("loginToken");

            const challengeResponse = await fetch(
                "https://backend.advir.pt/api/auth/biometric/register-challenge",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId: userId, userEmail: userEmail }),
                }
            );

            const challengeData = await challengeResponse.json();

            if (!challengeResponse.ok) {
                throw new Error(challengeData.message || "Erro ao obter challenge");
            }

            const response = await fetch(`https://backend.advir.pt/api/auth/biometric/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: userId,
                    type: 'facial',
                    facialData: facialData
                }),
            });

            if (response.ok) {
                setIsFacialRegistered(true);
                showMessage("Biometria facial registada com sucesso!");
            } else {
                const errorData = await response.json();
                showMessage(
                    `Falha ao registar biometria facial: ${errorData.message || response.statusText}`,
                    true,
                );
            }
        } catch (error) {
            console.error("Erro durante o registo da biometria facial:", error);
            showMessage("Ocorreu um erro ao registar a biometria facial: " + error.message, true);
        } finally {
            setIsLoading(false);
            setFacialScannerVisible(false);
        }
    };

    const unregisterFacialBiometric = async () => {
        setIsLoading(true);
        try {
            const userEmail = secureStorage.getItem("userEmail");

            const response = await fetch(`https://backend.advir.pt/api/auth/biometric/remove`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: userEmail, type: 'facial' }),
            });

            if (response.ok) {
                setIsFacialRegistered(false);
                showMessage("Biometria facial removida com sucesso!");
            } else {
                const errorData = await response.json();
                showMessage(
                    `Falha ao remover biometria facial: ${errorData.message || response.statusText}`,
                    true,
                );
            }
        } catch (error) {
            console.error("Erro durante a remoção da biometria facial:", error);
            showMessage("Ocorreu um erro ao remover a biometria facial: " + error.message, true);
        } finally {
            setIsLoading(false);
        }
    };

    const showMessage = (message, isError = false) => {
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        setTimeout(() => {
            setShowSuccessMessage(false);
            setSuccessMessage("");
        }, 3000);
    };

    const handleSavePassword = () => {
        if (newPassword === confirmPassword && newPassword.length >= 6) {
            setModalVisible(true);
        } else if (newPassword.length < 6) {
            showMessage(
                "A nova palavra-passe deve ter pelo menos 6 caracteres.",
                true,
            );
        } else {
            showMessage(
                "As palavras-passe não coincidem. Por favor, confirme.",
                true,
            );
        }
    };

    const alterarPassword = async () => {
        setModalVisible(false);
        setIsLoading(true);

        try {
            const token = secureStorage.getItem("loginToken");
            if (!token) {
                showMessage("Sessão expirada. Por favor, inicia sessão novamente.", true);
                return;
            }

            if (!newPassword || newPassword.length < 8) {
                showMessage("A nova palavra-passe deve ter pelo menos 8 caracteres.", true);
                return;
            }
            if (newPassword !== confirmPassword) {
                showMessage("As palavras-passe não coincidem.", true);
                return;
            }

            const resp = await fetch("https://backend.advir.pt/api/users/alterarPassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    newPassword: newPassword,
                    confirmNewPassword: confirmPassword,
                }),
            });

            let data = {};
            try { data = await resp.json(); } catch { }

            if (resp.ok) {
                showMessage(data.message || "Palavra-passe alterada com sucesso!");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                const msg = data.error || data.message || resp.statusText;

                if (resp.status === 401) {
                    showMessage("Sessão expirada. Por favor, inicia sessão novamente.", true);
                } else if (resp.status === 404) {
                    showMessage("Utilizador não encontrado.", true);
                } else if (resp.status === 400) {
                    showMessage(msg || "Pedido inválido.", true);
                } else {
                    showMessage(`Falha ao alterar palavra-passe: ${msg}`, true);
                }
            }
        } catch (e) {
            console.error("Erro ao alterar palavra-passe:", e);
            showMessage("Ocorreu um erro ao alterar a palavra-passe.", true);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProfileImage = () => {
        const savedImage = secureStorage.getItem("profileImage");
        if (savedImage) {
            setProfileImage(savedImage);
        }
    };

    const handleFileInput = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                setProfileImage(imageData);
                secureStorage.setItem("profileImage", imageData);
                showMessage("Imagem de perfil atualizada com sucesso!");
            };
            reader.readAsDataURL(file);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "informacoes":
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.profileHeader}>
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => fileInput.current.click()}
                            >
                                <Image
                                    style={styles.avatar}
                                    source={
                                        profileImage
                                            ? { uri: profileImage }
                                            : require("../../assets/icon.png")
                                    }
                                />
                                <View style={styles.avatarOverlay}>
                                    <Text style={styles.uploadIcon}>📷</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{userNome}</Text>
                                <Text style={styles.userEmail}>{userEmail}</Text>
                                <Text style={styles.userCompany}>
                                    {user?.company || secureStorage.getItem("empresaSelecionada")}
                                </Text>
                            </View>
                        </View>

                        <input
                            type="file"
                            ref={fileInput}
                            style={{ display: "none" }}
                            onChange={handleFileInput}
                            accept="image/*"
                        />

                        <View style={styles.infoSection}>
                            <Text style={styles.infoLabel}>👤 Nome Completo</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoValue}>{userNome}</Text>
                            </View>

                            <Text style={styles.infoLabel}>✉️ Email</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoValue}>{userEmail}</Text>
                            </View>

                            <Text style={styles.infoLabel}>🏢 Empresa</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoValue}>
                                    {user?.company || secureStorage.getItem("empresaSelecionada")}
                                </Text>
                            </View>

                            <Text style={styles.infoLabel}>🆔 ID de Utilizador</Text>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoValue}>{userId}</Text>
                            </View>
                        </View>
                    </View>
                );

            case "seguranca":
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.securitySection}>
                            <Text style={styles.sectionTitle}>🔐 Alterar Palavra-passe</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Nova Palavra-passe</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Digite a nova palavra-passe"
                                    value={newPassword}
                                    secureTextEntry
                                    onChangeText={setNewPassword}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirmar Palavra-passe</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirme a nova palavra-passe"
                                    value={confirmPassword}
                                    secureTextEntry
                                    onChangeText={setConfirmPassword}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleSavePassword}
                            >
                                <Text style={styles.primaryButtonText}>💾 Gravar Alterações</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.biometricSection}>
                            <Text style={styles.sectionTitle}>👤 Reconhecimento Facial</Text>

                            <View style={styles.statusBadge}>
                                <Text style={styles.statusLabel}>Estado:</Text>
                                <View
                                    style={[
                                        styles.statusIndicator,
                                        isFacialRegistered ? styles.statusActive : styles.statusInactive,
                                    ]}
                                >
                                    <Text style={styles.statusText}>
                                        {isFacialRegistered ? "✅ Ativa" : "⚪ Inativa"}
                                    </Text>
                                </View>
                            </View>

                            {!isFacialRegistered && isCameraAvailable ? (
                                <TouchableOpacity
                                    style={[styles.primaryButton, styles.successButton]}
                                    onPress={registerFacialBiometric}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isLoading ? "⏳ A configurar..." : "📷 Configurar Facial"}
                                    </Text>
                                </TouchableOpacity>
                            ) : isFacialRegistered ? (
                                <TouchableOpacity
                                    style={[styles.primaryButton, styles.dangerButton]}
                                    onPress={unregisterFacialBiometric}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {isLoading ? "⏳ A remover..." : "🗑️ Remover Facial"}
                                    </Text>
                                </TouchableOpacity>
                            ) : !isCameraAvailable ? (
                                <Text style={styles.errorText}>
                                    📷 Câmera não disponível neste dispositivo
                                </Text>
                            ) : null}

                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    💡 A biometria utiliza a segurança do seu dispositivo
                                    para autenticação rápida e segura
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            case "qrcode":
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.qrSection}>
                            <Text style={styles.sectionTitle}>📱 QR Code Pessoal</Text>

                            <Text style={styles.description}>
                                Este QR Code é único e identifica-o no sistema. Use-o para registar
                                o seu ponto de forma rápida e segura.
                            </Text>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => setMostrarQRCode(!mostrarQRCode)}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {mostrarQRCode ? "🔒 Ocultar QR Code" : "📱 Mostrar QR Code"}
                                </Text>
                            </TouchableOpacity>

                            {mostrarQRCode && userId && (
                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={userId}
                                        size={200}
                                        color="#1792FE"
                                        backgroundColor="white"
                                    />
                                    <Text style={styles.qrInfo}>
                                        ID: {userId} • {userNome}
                                    </Text>
                                    <Text style={styles.qrWarning}>
                                        ⚠️ Não partilhe este QR Code com outras pessoas
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
            {showSuccessMessage && (
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>{successMessage}</Text>
                </View>
            )}

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.headerTitle}>👤 Meu Perfil</Text>
                </View>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "informacoes" && styles.activeTab]}
                        onPress={() => setActiveTab("informacoes")}
                    >
                        <Text style={[styles.tabText, activeTab === "informacoes" && styles.activeTabText]}>
                            ℹ️ Informações
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "seguranca" && styles.activeTab]}
                        onPress={() => setActiveTab("seguranca")}
                    >
                        <Text style={[styles.tabText, activeTab === "seguranca" && styles.activeTabText]}>
                            🔐 Segurança
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "qrcode" && styles.activeTab]}
                        onPress={() => setActiveTab("qrcode")}
                    >
                        <Text style={[styles.tabText, activeTab === "qrcode" && styles.activeTabText]}>
                            📱 QR Code
                        </Text>
                    </TouchableOpacity>
                </View>

                {renderTabContent()}
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {t("Perfil.ModalTitulo")}
                            </Text>
                        </View>
                        <Text style={styles.modalText}>
                            {t("Perfil.ModalPergunta")}
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>
                                    {t("Perfil.ModalCancelar")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={alterarPassword}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {t("Perfil.ModalSim")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <FacialScannerModal
                visible={facialScannerVisible}
                onClose={() => setFacialScannerVisible(false)}
                onScanComplete={handleFacialScanComplete}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: "#f0f4f8",
        width: "100%",
    },
    container: {
        flexGrow: 1,
        padding: 20,
        minHeight: "100vh",
    },
    messageContainer: {
        position: "absolute",
        top: 20,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        backgroundColor: "#1792FE",
        padding: 15,
        borderRadius: 12,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        minWidth: 300,
        maxWidth: "90%",
    },
    messageText: {
        color: "white",
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
    },
    card: {
        width: "100%",
        maxWidth: 900,
        backgroundColor: "white",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 15,
        overflow: "hidden",
        alignSelf: "center",
    },
    cardHeader: {
        backgroundColor: "#1792FE",
        padding: 25,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: "white",
    },
    tabsContainer: {
        flexDirection: "row",
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 2,
        borderBottomColor: "#e0e0e0",
    },
    tab: {
        flex: 1,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 3,
        borderBottomColor: "transparent",
        transition: "all 0.3s ease",
    },
    activeTab: {
        borderBottomColor: "#1792FE",
        backgroundColor: "white",
    },
    tabText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#666",
    },
    activeTabText: {
        color: "#1792FE",
        fontWeight: "700",
    },
    tabContent: {
        padding: 25,
    },
    profileHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 30,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    avatarContainer: {
        position: "relative",
        marginRight: 25,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: "#1792FE",
    },
    avatarOverlay: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#1792FE",
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "white",
    },
    uploadIcon: {
        fontSize: 18,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 6,
    },
    userEmail: {
        fontSize: 16,
        color: "#666",
        marginBottom: 4,
    },
    userCompany: {
        fontSize: 14,
        color: "#999",
    },
    infoSection: {
        gap: 15,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        marginBottom: 6,
        marginTop: 10,
    },
    infoBox: {
        backgroundColor: "#f8f9ff",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e7ff",
    },
    infoValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    infoText: {
        fontSize: 13,
        color: "#666",
        lineHeight: 20,
        textAlign: "center",
    },
    securitySection: {
        marginBottom: 30,
    },
    biometricSection: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#555",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#f8f9ff",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e7ff",
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: "#1792FE",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#1792FE",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    successButton: {
        backgroundColor: "#4CAF50",
    },
    dangerButton: {
        backgroundColor: "#FF4757",
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 15,
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    statusLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#555",
    },
    statusIndicator: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
    },
    statusActive: {
        backgroundColor: "#e8f5e9",
        borderColor: "#4CAF50",
    },
    statusInactive: {
        backgroundColor: "#ffebee",
        borderColor: "#FF4757",
    },
    statusText: {
        fontSize: 14,
        fontWeight: "700",
    },
    errorText: {
        color: "#FF4757",
        textAlign: "center",
        marginTop: 15,
        fontWeight: "500",
        fontSize: 14,
    },
    qrSection: {
        alignItems: "center",
    },
    description: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 22,
    },
    qrContainer: {
        alignItems: "center",
        marginTop: 25,
        padding: 25,
        backgroundColor: "#f8f9ff",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#1792FE",
    },
    qrInfo: {
        marginTop: 15,
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
    },
    qrWarning: {
        marginTop: 8,
        fontSize: 12,
        color: "#FF4757",
        fontStyle: "italic",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
        width: "90%",
        maxWidth: 400,
        backgroundColor: "white",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        backgroundColor: "#1792FE",
        padding: 20,
    },
    modalTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    modalText: {
        fontSize: 16,
        padding: 25,
        textAlign: "center",
        color: "#555",
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    modalButton: {
        flex: 1,
        padding: 18,
        alignItems: "center",
    },
    cancelButton: {
        borderRightWidth: 1,
        borderRightColor: "#eee",
    },
    confirmButton: {
        backgroundColor: "#1792FE",
    },
    cancelButtonText: {
        color: "#666",
        fontWeight: "bold",
        fontSize: 16,
    },
    confirmButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});

export default Perfil;