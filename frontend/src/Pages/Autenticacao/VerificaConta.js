import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native'; // Importa o hook para navegação
import { Modal, View, Text, Button, StyleSheet } from 'react-native'; // Importar os componentes necessários
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import { secureStorage } from '../../utils/secureStorage';
const VerificaConta = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showModal, setShowModal] = useState(false); // Estado para controlar a exibição do modal
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = secureStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/users/alterarPassword', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPassword, confirmNewPassword }),
            });

            if (response.ok) {
                setShowModal(true);  // Mostrar o modal
            } else {
                const data = await response.json();
                console.error('Erro:', data.error);
            }
        } catch (error) {
            console.error('Erro de rede:', error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        navigation.navigate('Home');  
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                backgroundColor: '#d4e4ff',
                margin: '0',
                padding: '0',
            }}
        >
            <div
                style={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '20px',
                    borderRadius: '15px',
                }}
            >
                <h1
                    style={{
                        textAlign: 'center',
                        color: '#1792FE',
                        fontWeight: '600',
                        fontSize: '2rem',
                        marginBottom: '50px',
                    }}
                >
                    {t("VerificaConta.Title")}
                </h1>
                <form onSubmit={handleSubmit}>
                    {/* Campo Nova Password */}
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder={t("VerificaConta.TxtNovaPass")}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>

                    {/* Campo Confirmar Nova Password */}
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder={t("VerificaConta.TxtConfirmar")}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '1.1rem',
                            backgroundColor: '#1792FE',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                        }}
                    >
                        {t("VerificaConta.Btconfirmar")}
                    </button>
                </form>
                <Modal
                    visible={showModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}  // Fecha o modal se o utilizador clicar fora
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                {t("VerificaConta.Aviso.1")}
                            </Text>
                            <Button title="OK" onPress={handleCloseModal} />
                        </View>
                    </View>
                </Modal>
            </div>
        </div>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo semi-transparente
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

export default VerificaConta;
