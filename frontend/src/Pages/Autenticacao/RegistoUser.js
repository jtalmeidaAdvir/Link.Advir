import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import { secureStorage } from '../../utils/secureStorage';
import { useNavigation } from '@react-navigation/native';
const RegistoUser = () => {
    const [username, setUsername] = useState('');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [empresaId, setEmpresaId] = useState('');
    const [empresas, setEmpresas] = useState([]);
    const [maxUsers, setMaxUsers] = useState(0);
    const [currentUsers, setCurrentUsers] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [empresaAreacliente, setEmpresaAreacliente] = useState('');
    const [loading, setLoading] = useState(false);
    const [fadeAnimation] = useState(new Animated.Value(0));
    const { t } = useTranslation();
    const navigation = useNavigation();
    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    // Função para buscar as empresas associadas ao utilizador autenticado
    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://backend.advir.pt/api/users/empresas', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setEmpresas(data);
                } else {
                    const errorData = await response.json();
                    console.error('Erro ao buscar empresas:', errorData.message);
                    setErrorMessage('Erro ao carregar empresas');
                }
            } catch (error) {
                console.error('Erro de rede:', error);
                setErrorMessage('Erro de rede ao carregar empresas');
            } finally {
                setLoading(false);
            }
        };

        fetchEmpresas();
    }, []);

    // Função para buscar o limite de utilizadores e o número atual de utilizadores da empresa selecionada
    const fetchEmpresaInfo = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}`, { //https://backend.advir.pt/api/empresas/${empresaId}
                headers: {
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setMaxUsers(data.maxUsers || 0);
                setCurrentUsers(data.currentUsers || 0);
            } else {
                console.error('Erro ao buscar informações da empresa.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
        }
    };

    const handleEmpresaChange = (selectedEmpresaId) => {
        setEmpresaId(selectedEmpresaId);
        if (selectedEmpresaId) {
            fetchEmpresaInfo(selectedEmpresaId);
        }
    };

    const handleRegister = async () => {
        // Validar campos
        if (!username || !nome || !email || !password || !empresaId) {
            setErrorMessage('Por favor, preencha todos os campos obrigatórios');
            setShowErrorModal(true);
            return;
        }

        // Validar se o número de utilizadores já atingiu o limite
        if (currentUsers >= maxUsers) {
            setErrorMessage(`O limite de utilizadores (${maxUsers}) para esta empresa foi atingido.`);
            setShowErrorModal(true);
            return;
        }

        const newUser = {
            username,
            nome,
            email,
            password,
            empresa_id: empresaId,
            isAdmin: false,
            empresa_areacliente: empresaAreacliente,
        };

        try {
            setLoading(true);
            const response = await fetch('https://backend.advir.pt/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Utilizador criado com sucesso:', data);
                setSuccessMessage('Utilizador criado com sucesso!');
                setShowSuccessModal(true);

                // Limpar formulário
                setUsername('');
                setNome('');
                setEmail('');
                setPassword('');
                setEmpresaId('');
                setEmpresaAreacliente('');
            } else {
                const errorData = await response.json();
                console.error('Erro ao criar o utilizador:', errorData.message);
                setErrorMessage(errorData.message || 'Erro ao criar utilizador');
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de rede ao criar utilizador');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigation.navigate('Login');
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
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
                    <MaterialCommunityIcons name="account-plus-outline" size={48} color="#ffffff" />
                    <Text style={styles.headerTitle}>{t("RegistoUser.Title")}</Text>
                    <Text style={styles.headerSubtitle}>Crie uma nova conta de utilizador</Text>
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

                    {successMessage ? (
                        <View style={styles.successContainer}>
                            <MaterialCommunityIcons name="check-circle" size={22} color="#28A745" />
                            <Text style={styles.successText}>{successMessage}</Text>
                        </View>
                    ) : null}

                    {/* Username */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="account-outline" size={16} color="#2c3e50" />
                            {' '}{t("Username")} *
                        </Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="account" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={t("Username")}
                                value={username}
                                onChangeText={setUsername}
                                placeholderTextColor="#95a5a6"
                            />
                        </View>
                    </View>

                    {/* Nome */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#2c3e50" />
                            {' '}{t("RegistoUser.TxtNome")} *
                        </Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="card-account-details" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={t("RegistoUser.TxtNome")}
                                value={nome}
                                onChangeText={setNome}
                                placeholderTextColor="#95a5a6"
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="email-outline" size={16} color="#2c3e50" />
                            {' '}Email *
                        </Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="exemplo@email.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor="#95a5a6"
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="lock-outline" size={16} color="#2c3e50" />
                            {' '}{t("RegistoUser.TxtPass")} *
                        </Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { flex: 1 }]}
                                placeholder={t("RegistoUser.TxtPass")}
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

                    {/* Empresa/Área Cliente */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="office-building-outline" size={16} color="#2c3e50" />
                            {' '}{t("RegistoUser.TxtEmpresaArea")}
                        </Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="office-building" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={t("RegistoUser.TxtEmpresaArea")}
                                value={empresaAreacliente}
                                onChangeText={setEmpresaAreacliente}
                                placeholderTextColor="#95a5a6"
                            />
                        </View>
                    </View>

                    {/* Selecionar Empresa */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            <MaterialCommunityIcons name="domain" size={16} color="#2c3e50" />
                            {' '}{t("RegistoUser.CBSelecionarEmpresa")} *
                        </Text>
                        <View style={styles.pickerWrapper}>
                            <MaterialCommunityIcons name="domain" size={20} color="#7f8c8d" style={styles.inputIcon} />
                            <Picker
                                selectedValue={empresaId}
                                onValueChange={handleEmpresaChange}
                                style={styles.picker}
                            >
                                <Picker.Item label={t("RegistoUser.CBSelecionarEmpresa")} value="" />
                                {empresas.map((empresa) => (
                                    <Picker.Item key={empresa.id} label={empresa.empresa} value={empresa.id} />
                                ))}
                            </Picker>
                        </View>
                        {empresaId && maxUsers > 0 && (
                            <View style={styles.usersInfoContainer}>
                                <Ionicons name="information-circle" size={16} color="#4481EB" />
                                <Text style={styles.usersInfoText}>
                                    Utilizadores: {currentUsers} / {maxUsers}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Botão Registar */}
                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#4481EB', '#04BEFE']}
                            style={styles.registerButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="account-plus" size={22} color="#ffffff" />
                                    <Text style={styles.registerButtonText}>{t("RegistoUser.BtRegistar")}</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

            {/* Modal de sucesso */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <MaterialCommunityIcons name="check-circle" size={64} color="#28A745" />
                        </View>
                        <Text style={styles.modalTitle}>Sucesso!</Text>
                        <Text style={styles.modalText}>{successMessage || t("RegistoUser.Alert.1")}</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccessModal}>
                            <Text style={styles.modalButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de erro */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseErrorModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <MaterialCommunityIcons name="alert-circle" size={64} color="#ff6b6b" />
                        </View>
                        <Text style={styles.modalTitle}>Erro</Text>
                        <Text style={styles.modalText}>{errorMessage}</Text>
                        <TouchableOpacity style={[styles.modalButton, styles.modalButtonError]} onPress={handleCloseErrorModal}>
                            <Text style={styles.modalButtonText}>Fechar</Text>
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
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4edda',
        padding: 14,
        borderRadius: 14,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#28A745',
    },
    successText: {
        color: '#28A745',
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
    usersInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#e6f2ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    usersInfoText: {
        fontSize: 13,
        color: '#4481EB',
        marginLeft: 6,
        fontWeight: '600',
    },
    registerButton: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    registerButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerButtonText: {
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
    modalButtonError: {
        backgroundColor: '#ff6b6b',
        shadowColor: '#ff6b6b',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default RegistoUser;
