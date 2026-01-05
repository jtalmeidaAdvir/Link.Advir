import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Animated,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { secureStorage } from '../../utils/secureStorage';

const PainelAdmin = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [urlempresa, setUrlEmpresa] = useState("");
    const [linha, setLinha] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [token, setToken] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [fadeAnimation] = useState(new Animated.Value(0));

    React.useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const criarEmpresa = async (loginToken) => {
        const payload = {
            username,
            password,
            urlempresa,
            empresa,
            linha,
        };

        try {
            const response = await fetch(
                "https://backend.advir.pt/api/empresas",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                        Authorization: `Bearer ${loginToken}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Empresa criada:", data);
                setShowModal(true);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || "Erro ao criar a empresa");
                console.error("Erro ao criar a empresa:", errorData);
            }
        } catch (error) {
            console.error("Erro de rede ao criar a empresa:", error);
            setErrorMessage("Erro de rede, tente novamente mais tarde.");
        }
    };

    const handleSubmit = async () => {
        const loginToken = secureStorage.getItem("loginToken");
        if (!loginToken) {
            setErrorMessage("Utilizador não autenticado.");
            return;
        }

        // Validar campos
        if (!username || !password || !empresa || !urlempresa || !linha) {
            setErrorMessage("Por favor, preencha todos os campos.");
            return;
        }

        // Guardar o urlempresa no secureStorage antes de iniciar a criação da empresa
        secureStorage.setItem("urlempresa", urlempresa);

        setLoading(true);
        setErrorMessage("");

        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/connect-database/token`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        company: empresa,
                        instance: "DEFAULT",
                        line: linha,
                        forceRefresh: true,
                        urlempresa: urlempresa,
                    }),
                },
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Token de base de dados recebido:", data.token);

                secureStorage.setItem("painelAdminToken", data.token);
                setToken(data.token);

                await criarEmpresa(loginToken);
            } else {
                const errorData = await response.json();
                setErrorMessage(
                    errorData.message ||
                        "Erro ao obter o token de base de dados",
                );
            }
        } catch (error) {
            console.error(
                "Erro de rede ao obter o token de base de dados:",
                error,
            );
            setErrorMessage("Erro de rede, tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        // Reset form
        setUsername("");
        setPassword("");
        setEmpresa("");
        setUrlEmpresa("");
        setLinha("");
        setErrorMessage("");
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContentWrapper}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <MaterialCommunityIcons name="office-building-plus" size={48} color="#ffffff" />
                    <Text style={styles.headerTitle}>Painel Admin</Text>
                    <Text style={styles.headerSubtitle}>Conecte a sua empresa ao sistema</Text>
                </View>
            </LinearGradient>

            <Animated.View
                style={[
                    styles.formContainer,
                    {
                        opacity: fadeAnimation,
                        transform: [{
                            translateY: fadeAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            }),
                        }],
                    },
                ]}
            >
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={22} color="#ff6b6b" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {/* Username */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        <MaterialCommunityIcons name="account-outline" size={16} color="#2c3e50" />
                        {' '}Username *
                    </Text>
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="account" size={20} color="#7f8c8d" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Digite o username"
                            value={username}
                            onChangeText={setUsername}
                            placeholderTextColor="#95a5a6"
                        />
                    </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        <MaterialCommunityIcons name="lock-outline" size={16} color="#2c3e50" />
                        {' '}Password *
                    </Text>
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.textInput, { flex: 1 }]}
                            placeholder="Digite a password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#95a5a6"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color="#7f8c8d"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Nome da Empresa */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        <MaterialCommunityIcons name="office-building" size={16} color="#2c3e50" />
                        {' '}Nome da Empresa *
                    </Text>
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="office-building" size={20} color="#7f8c8d" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Digite o nome da empresa"
                            value={empresa}
                            onChangeText={setEmpresa}
                            placeholderTextColor="#95a5a6"
                        />
                    </View>
                </View>

                {/* URL da Empresa */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        <MaterialCommunityIcons name="web" size={16} color="#2c3e50" />
                        {' '}URL da Empresa *
                    </Text>
                    <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="web" size={20} color="#7f8c8d" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ex: 192.168.1.1:3000"
                            value={urlempresa}
                            onChangeText={setUrlEmpresa}
                            placeholderTextColor="#95a5a6"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Linha */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        <MaterialCommunityIcons name="format-list-bulleted" size={16} color="#2c3e50" />
                        {' '}Linha *
                    </Text>
                    <View style={styles.pickerWrapper}>
                        <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#7f8c8d" style={styles.inputIcon} />
                        <Picker
                            selectedValue={linha}
                            onValueChange={setLinha}
                            style={styles.picker}
                        >
                            <Picker.Item label="Selecione a Linha" value="" />
                            <Picker.Item label="Evolution" value="Evolution" />
                            <Picker.Item label="Professional" value="Professional" />
                            <Picker.Item label="Executive" value="Executive" />
                        </Picker>
                    </View>
                </View>

                {/* Botão Conectar */}
                <TouchableOpacity
                    style={styles.connectButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#4481EB', '#04BEFE']}
                        style={styles.connectButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="connection" size={22} color="#ffffff" />
                                <Text style={styles.connectButtonText}>Conectar</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Modal de Sucesso */}
            <Modal
                visible={showModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <MaterialCommunityIcons name="check-circle" size={64} color="#28A745" />
                        </View>
                        <Text style={styles.modalTitle}>Sucesso!</Text>
                        <Text style={styles.modalText}>Empresa conectada com sucesso.</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleCloseModal}>
                            <Text style={styles.modalButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    scrollContentWrapper: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        width: '100%',
        paddingTop: 50,
        paddingBottom: 50,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 12,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '500',
    },
    formContainer: {
        marginTop: 30,
        marginHorizontal: 20,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee',
        padding: 14,
        borderRadius: 14,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#ff6b6b',
    },
    errorText: {
        color: '#ff6b6b',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#d1dbed',
        borderRadius: 14,
        backgroundColor: '#f9fafc',
        paddingHorizontal: 14,
        paddingVertical: 4,
    },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#d1dbed',
        borderRadius: 14,
        backgroundColor: '#f9fafc',
        paddingLeft: 14,
        overflow: 'hidden',
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#2c3e50',
        paddingVertical: 12,
        fontWeight: '500',
    },
    picker: {
        flex: 1,
        height: 50,
        color: '#2c3e50',
    },
    eyeIcon: {
        padding: 8,
    },
    connectButton: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    connectButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 62, 80, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconContainer: {
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    modalText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        fontWeight: '500',
    },
    modalButton: {
        backgroundColor: '#4481EB',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default PainelAdmin;
