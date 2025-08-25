import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Image,
    Modal,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import i18n from "./i18n";
import { useTranslation } from "react-i18next";

const Perfil = ({ user }) => {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [userNome, setUserNome] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const fileInput = useRef(null);
    const { t } = useTranslation();

    useEffect(() => {
        const userNomeFromStorage = localStorage.getItem("userNome");
        const userEmailFromStorage = localStorage.getItem("userEmail");
        setUserNome(userNomeFromStorage);
        setUserEmail(userEmailFromStorage);
        loadProfileImage();
    }, []);

    const loadProfileImage = async () => {
        try {
            const userId = localStorage.getItem("userId");
            const token = localStorage.getItem("loginToken");

            if (!userId || !token) {
                return;
            }

            const response = await fetch(
                `https://backend.advir.pt/api/users/${userId}/profileImage`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.ok) {
                const imageBlob = await response.blob();
                setProfileImage(URL.createObjectURL(imageBlob));
            }
        } catch (error) {
            console.error("Erro ao carregar a imagem do perfil:", error);
        }
    };

    const uploadProfileImage = async (file) => {
        const token = localStorage.getItem("loginToken");
        const userId = localStorage.getItem("userId");

        if (!token || !userId) {
            showMessage(
                "Não foi possível obter os dados do utilizador. Por favor, tente novamente.",
            );
            return;
        }

        const formData = new FormData();
        formData.append("profileImage", file);

        try {
            const response = await fetch(
                `https://backend.advir.pt/api/users/${userId}/uploadProfileImage`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                },
            );

            const data = await response.json();
            if (response.ok) {
                showMessage("A imagem do perfil foi atualizada com sucesso.");
            } else {
                showMessage(
                    "Ocorreu um erro ao carregar a imagem. Por favor, tente novamente.",
                    true,
                );
            }
        } catch (error) {
            showMessage(
                "Ocorreu um erro ao carregar a imagem. Tente novamente.",
                true,
            );
        }
    };

    const showMessage = (message, isError = false) => {
        setSuccessMessage(message);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(URL.createObjectURL(file));
            uploadProfileImage(file);
        }
    };

    const handleSavePassword = () => {
        if (!newPassword || !confirmPassword) {
            showMessage("As passwords devem ter pelo menos 6 carateres.", true);
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage("As passwords não coincidem.", true);
            return;
        }

        if (newPassword.length < 6) {
            showMessage("A sua nova password foi definida com sucesso.", true);
            return;
        }

        setModalVisible(true);
    };

    const alterarPassword = async () => {
        setModalVisible(false);
        try {
            const token = localStorage.getItem("loginToken");
            if (!token) {
                showMessage("Token de autenticação não encontrado.", true);
                return;
            }

            const response = await fetch(
                "https://backend.advir.pt/api/users/alterarPassword",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        newPassword: newPassword,
                        confirmNewPassword: confirmPassword,
                    }),
                },
            );

            const data = await response.json();

            if (response.ok) {
                showMessage("A sua password foi alterada com sucesso.");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                showMessage(
                    "Não foi possível alterar a password. Por favor, tente novamente.",
                    true,
                );
            }
        } catch (error) {
            showMessage(
                "Ocorreu um erro ao alterar a password. Por favor, tente novamente.",
                true,
            );
        }
    };

    // Placeholder for BiometricSetup component
    // In a real scenario, this would be imported and used.
    const BiometricSetup = ({ userId, userEmail, t, onRegistered }) => {
        const [isBiometricRegistered, setIsBiometricRegistered] =
            useState(false);
        const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
        const [isLoading, setIsLoading] = useState(false);

        useEffect(() => {
            // Check for WebAuthn API support
            if (window.PublicKeyCredential) {
                setIsBiometricAvailable(true);
                // Check if user already has biometrics registered
                checkBiometricStatus(userId);
            }
        }, [userId]);

        const checkBiometricStatus = async (userId) => {
            try {
                const userEmail = localStorage.getItem("userEmail");
                const response = await fetch(
                    `https://backend.advir.pt/api/auth/biometric/check`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email: userEmail }),
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    setIsBiometricRegistered(data.hasBiometric || false);
                } else {
                    console.error("Failed to check biometric status");
                }
            } catch (error) {
                console.error("Error checking biometric status:", error);
            }
        };

        const registerBiometric = async () => {
            setIsLoading(true);
            try {
                const userId = parseInt(localStorage.getItem("userId"));
                const userEmail = localStorage.getItem("userEmail");

                // Importar função do módulo de biometria
                const { registerBiometric: registerBio } = await import(
                    "./Autenticacao/utils/biometricAuth"
                );

                await registerBio(userId, userEmail);

                setIsBiometricRegistered(true);
                if (onRegistered) onRegistered();
                showMessage("Biometria registada com sucesso!");
            } catch (error) {
                console.error("Error during biometric registration:", error);
                showMessage(
                    "Ocorreu um erro ao registar a biometria: " + error.message,
                    true,
                );
            } finally {
                setIsLoading(false);
            }
        };

        const unregisterBiometric = async () => {
            setIsLoading(true);
            try {
                const userEmail = localStorage.getItem("userEmail");
                if (!userEmail) {
                    throw new Error("Email do utilizador não encontrado");
                }

                // Importar a função removeBiometric dinamicamente
                const { removeBiometric } = await import('./Autenticacao/utils/biometricAuth');

                await removeBiometric(userEmail);
                setIsBiometricRegistered(false);
                showMessage("Biometria removida com sucesso!");
            } catch (error) {
                console.error("Error during biometric unregistration:", error);
                showMessage("Ocorreu um erro ao remover a biometria: " + error.message, true);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isBiometricAvailable) {
            return null;
        }

        return (
            <View style={styles.biometricSection}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 15,
                    }}
                >
                    <Text style={{ fontSize: 24, marginRight: 8 }}>🔐</Text>
                    <Text
                        style={[
                            styles.sectionTitle,
                            { marginBottom: 0, fontSize: 20 },
                        ]}
                    >
                        Autenticação Biométrica
                    </Text>
                </View>

                <Text style={styles.biometricDescription}>
                    {isBiometricRegistered
                        ? "A sua biometria está configurada e pode ser usada para fazer login de forma rápida e segura."
                        : "Configure a sua biometria para fazer login de forma mais rápida e segura usando a impressão digital ou reconhecimento facial."}
                </Text>

                <View style={styles.biometricStatusContainer}>
                    <View
                        style={[
                            styles.biometricStatusBadge,
                            isBiometricRegistered
                                ? styles.statusActive
                                : styles.statusInactive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.biometricStatusText,
                                isBiometricRegistered
                                    ? styles.statusActive
                                    : styles.statusInactive,
                            ]}
                        >
                            {isBiometricRegistered ? (
                                <Text>
                                    <Text style={{ fontSize: 16, marginRight: 8 }}>✅</Text>
                                    Biometria Ativa
                                </Text>
                            ) : (
                                <Text>
                                    <Text style={{ fontSize: 16, marginRight: 8 }}>⚪</Text>
                                    Biometria Inativa
                                </Text>
                            )}
                        </Text>
                    </View>
                </View>

                {!isBiometricRegistered ? (
                    <TouchableOpacity
                        style={[styles.biometricButton, styles.registerButton]}
                        onPress={registerBiometric}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Text style={styles.biometricButtonIcon}>
                                    ⏳
                                </Text>
                                <Text style={styles.biometricButtonText}>
                                    A configurar...
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.biometricButtonIcon}>
                                    🔧
                                </Text>
                                <Text style={styles.biometricButtonText}>
                                    Configurar Biometria
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.biometricActions}>
                        <TouchableOpacity
                            style={[styles.biometricButton, styles.testButton]}
                            onPress={() =>
                                showMessage(
                                    "Funcionalidade de teste em desenvolvimento",
                                )
                            }
                        >
                            <Text style={styles.biometricButtonIcon}>🧪</Text>
                            <Text style={styles.biometricButtonText}>
                                Testar
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.biometricButton,
                                styles.removeButton,
                            ]}
                            onPress={unregisterBiometric}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Text style={styles.biometricButtonIcon}>
                                        ⏳
                                    </Text>
                                    <Text style={styles.biometricButtonText}>
                                        A remover...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.biometricButtonIcon}>
                                        🗑️
                                    </Text>
                                    <Text style={styles.biometricButtonText}>
                                        Remover
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View
                    style={{
                        marginTop: 20,
                        padding: 15,
                        backgroundColor: "rgba(23, 146, 254, 0.05)",
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: "#1792FE",
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            color: "#666",
                            textAlign: "center",
                            fontStyle: "italic",
                        }}
                    >
                        💡 A biometria utiliza a segurança do seu dispositivo
                        para autenticação rápida e segura
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={styles.scrollViewStyle} contentContainerStyle={styles.container}>
            {showSuccessMessage && (
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>{successMessage}</Text>
                </View>
            )}

            <View style={styles.profileCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.welcomeText}>{"Perfil"}</Text>
                </View>

                <View style={styles.profileSection}>
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
                            <Text style={styles.uploadText}>
                                {t("Perfil.Carregar")}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userName}>{userNome}</Text>
                        <Text style={styles.userEmail}>{userEmail}</Text>
                        <Text style={styles.userCompany}>
                            {user?.company ||
                                localStorage.getItem("empresaSelecionada")}
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

                <View style={styles.divider} />

                <View style={styles.passwordSection}>
                    <Text style={styles.sectionTitle}>
                        {t("Perfil.Alterar")}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                            {t("Perfil.Novapass")}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t("Perfil.Novapass")}
                            value={newPassword}
                            secureTextEntry
                            onChangeText={setNewPassword}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                            {t("Perfil.Confirmarpass")}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t("Perfil.Confirmarpass")}
                            value={confirmPassword}
                            secureTextEntry
                            onChangeText={setConfirmPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSavePassword}
                    >
                        <Text style={styles.saveButtonText}>
                            {t("Perfil.Gravar")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Modal de confirmação */}
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
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                ]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>
                                    {t("Perfil.ModalCancelar")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.confirmButton,
                                ]}
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

            <BiometricSetup
                userId={localStorage.getItem("userId")}
                userEmail={localStorage.getItem("userEmail")}
                t={t}
                onRegistered={() => {
                    // Opcional: atualizar estado ou mostrar mensagem
                    console.log("Biometria configurada com sucesso");
                }}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        backgroundColor: "#d4e4ff",
        padding: 20,
        position: "relative",
        minHeight: "100vh",
    },
    messageContainer: {
        position: "absolute",
        top: 20,
        backgroundColor: "#1792FE",
        padding: 12,
        borderRadius: 8,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    messageText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    profileCard: {
        width: "100%",
        maxWidth: 600,
        backgroundColor: "white",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        overflow: "hidden",
    },
    cardHeader: {
        backgroundColor: "#1792FE",
        padding: 20,
        alignItems: "center",
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "white",
    },
    profileSection: {
        flexDirection: "row",
        padding: 20,
        alignItems: "center",
    },
    avatarContainer: {
        position: "relative",
        marginRight: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: "#1792FE",
    },
    avatarOverlay: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "rgba(23, 146, 254, 0.8)",
        borderRadius: 12,
        padding: 5,
    },
    uploadText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    userInfoContainer: {
        flex: 1,
    },
    userName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: "#666",
        marginBottom: 4,
    },
    userCompany: {
        fontSize: 14,
        color: "#888",
    },
    divider: {
        height: 1,
        backgroundColor: "#e0e0e0",
        marginHorizontal: 20,
    },
    passwordSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: "#555",
        marginBottom: 8,
        fontWeight: "500",
    },
    input: {
        backgroundColor: "#f5f5ff",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: "#1792FE",
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 16,
        shadowColor: "#1792FE",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    saveButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContainer: {
        width: "85%",
        maxWidth: 400,
        backgroundColor: "white",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 15,
    },
    modalHeader: {
        backgroundColor: "#1792FE",
        padding: 15,
    },
    modalTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    modalText: {
        fontSize: 16,
        padding: 20,
        textAlign: "center",
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
    scrollViewStyle: {
        flex: 1,
        backgroundColor: "#d4e4ff",
        width: "100%",
    },
    biometricSection: {
        backgroundColor: "white",
        marginTop: 20,
        borderRadius: 20,
        padding: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(23, 146, 254, 0.1)",
    },
    biometricDescription: {
        fontSize: 15,
        color: "#555",
        lineHeight: 22,
        marginBottom: 20,
        textAlign: "center",
        fontWeight: "400",
    },
    biometricStatusContainer: {
        alignItems: "center",
        marginBottom: 25,
        padding: 15,
        backgroundColor: "#f8f9ff",
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "rgba(23, 146, 254, 0.1)",
    },
    biometricStatusBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 2,
    },
    biometricStatusText: {
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    statusActive: {
        color: "#4CAF50",
        borderColor: "rgba(76, 175, 80, 0.3)",
    },
    statusInactive: {
        color: "#FF6B35",
        borderColor: "rgba(255, 107, 53, 0.3)",
    },
    biometricButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        borderRadius: 15,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 0,
        transform: [{ scale: 1 }],
        transition: "all 0.2s ease-in-out",
    },
    biometricButtonIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    biometricButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
        letterSpacing: 0.5,
    },
    registerButton: {
        backgroundColor: "#4CAF50",
        background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
    },
    testButton: {
        backgroundColor: "#1792FE",
        background: "linear-gradient(135deg, #1792FE 0%, #0d7ce8 100%)",
        flex: 1,
        marginRight: 8,
    },
    removeButton: {
        backgroundColor: "#FF4757",
        background: "linear-gradient(135deg, #FF4757 0%, #ff3742 100%)",
        flex: 1,
        marginLeft: 8,
    },
    biometricActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
});

export default Perfil;
