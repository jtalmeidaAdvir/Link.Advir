import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import { secureStorage } from '../../../utils/secureStorage';
const RegistoUser = () => {
    const [username, setUsername] = useState('');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [empresaId, setEmpresaId] = useState('');  // Estado para armazenar o ID da empresa
    const [empresas, setEmpresas] = useState([]);    // Estado para armazenar a lista de empresas
    const [maxUsers, setMaxUsers] = useState(0);     // Estado para o limite máximo de utilizadores da empresa
    const [currentUsers, setCurrentUsers] = useState(0); // Estado para o número atual de utilizadores da empresa
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [empresaAreacliente, setEmpresaAreacliente] = useState('');
    const { t } = useTranslation();
    // Função para buscar as empresas associadas ao utilizador autenticado
    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
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
                }
            } catch (error) {
                console.error('Erro de rede:', error);
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

    const handleEmpresaChange = (e) => {
        const selectedEmpresaId = e.target.value;
        setEmpresaId(selectedEmpresaId);
        fetchEmpresaInfo(selectedEmpresaId); // Buscar o limite e o número atual de utilizadores
    };

    const handleRegister = async (e) => {
        e.preventDefault();

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
            const response = await fetch('https://backend.advir.pt/api/users', { //https://backend.advir.pt/api/users
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
                setShowSuccessModal(true);
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
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h1 style={styles.title}>{t("RegistoUser.Title")}</h1>
                <form onSubmit={handleRegister}>
                    

                <div style={styles.inputContainer}>
                        <input
                            type="username"
                            placeholder={t("Username")}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>



                    <div style={styles.inputContainer}>
                        <input
                            type="nome"
                            placeholder={t("RegistoUser.TxtNome")}
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={styles.inputContainer}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={styles.inputContainer}>
                        <input
                            type="password"
                            placeholder={t("RegistoUser.TxtPass")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder={t("RegistoUser.TxtEmpresaArea")}
                            value={empresaAreacliente}
                            onChange={(e) => setEmpresaAreacliente(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    {/* Campo de seleção da empresa */}
                    <div style={styles.inputContainer}>
                        <select
                            value={empresaId}
                            onChange={handleEmpresaChange}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        >
                            <option value="">{t("RegistoUser.CBSelecionarEmpresa")}</option>
                            {empresas.map((empresa) => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.empresa}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" style={styles.registerButton}>
                        {t("RegistoUser.BtRegistar")}
                    </button>
                </form>
                
                {/* Modal de sucesso */}
                <Modal
                    visible={showSuccessModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowSuccessModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                {t("RegistoUser.Alert.1")}
                            </Text>
                            <Button title="OK" onPress={handleCloseSuccessModal} />
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
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>{errorMessage}</Text>
                            <Button title="OK" onPress={handleCloseErrorModal} />
                        </View>
                    </View>
                </Modal>
            </div>
        </div>
    );
};

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#d4e4ff',
        margin: '0',
        padding: '0',
    },
    formContainer: {
        maxWidth: '400px',
        width: '100%',
        padding: '20px',
        borderRadius: '15px',
    },
    title: {
        textAlign: 'center',
        color: '#1792FE',
        fontWeight: '600',
        fontSize: '2rem',
        marginBottom: '50px',
    },
    inputContainer: {
        marginBottom: '20px',
    },
    input: {
        borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
    },
    registerButton: {
        borderRadius: '10px',
        padding: '12px',
        fontSize: '1.5rem',
        backgroundColor: '#1792FE',
        color: 'white',
        width: '100%',
        border: 'none',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: {
        marginBottom: 20,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default RegistoUser;
