import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, Modal, TouchableOpacity } from 'react-native';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';


const Perfil = ({ user }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [userNome, setUserNome] = useState(''); // Novo estado para UserNome
  

    const fileInput = useRef(null);
    const { t } = useTranslation();
    useEffect(() => {
        const userNomeFromStorage = localStorage.getItem('userNome');
        setUserNome(userNomeFromStorage);
        loadProfileImage(); // Carrega a imagem de perfil ao abrir a página
        

    }, []);

    // Função para carregar a imagem de perfil do servidor
    const loadProfileImage = async () => {
        try {
            const userId = localStorage.getItem('userId');
            const token = localStorage.getItem('loginToken');
            
            
            if (!userId || !token) {
                alert("Autenticação necessária.");
                return;
            }

            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/profileImage`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const imageBlob = await response.blob();
                setProfileImage(URL.createObjectURL(imageBlob)); // Define a imagem carregada
            } else {
                console.error("Erro ao carregar a imagem do perfil:", await response.json());
            }
        } catch (error) {
            console.error("Erro ao carregar a imagem do perfil:", error);
        }
    };

    // Função para fazer o upload da imagem de perfil
    const uploadProfileImage = async (file) => {
        const token = localStorage.getItem('loginToken');
        const userId = localStorage.getItem('userId');
        
        if (!token || !userId) {
            alert("Autenticação necessária.");
            return;
        }

        const formData = new FormData();
        formData.append('profileImage', file); // Adiciona o ficheiro diretamente

        try {
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/uploadProfileImage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message || t("Perfil.Alerta.1"));
            } else {
                console.error("Erro do servidor:", data);
                alert(data.error || t("Perfil.Error.1"));
            }
        } catch (error) {
            console.error(t("Perfil.Error.1"), error);
            alert(t("Perfil.Error.1"));
        }
    };

    // Função para selecionar uma imagem do dispositivo
    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(URL.createObjectURL(file)); // Mostra a imagem carregada
            uploadProfileImage(file); // Envia o ficheiro
        }
    };

    // Função para abrir o modal de confirmação para alterar a password
    const handleSavePassword = () => {
        if (newPassword !== confirmPassword) {
            alert(t("Perfil.Alerta.2"));
            return;
        }
        setModalVisible(true); // Abre o modal de confirmação
    };

    // Função para alterar a password
    const alterarPassword = async () => {
        setModalVisible(false); // Fecha o modal
        try {
            const token = localStorage.getItem('loginToken');
            if (!token) {
                alert("Token de autenticação não encontrado.");
                return;
            }

            const response = await fetch('https://backend.advir.pt/api/users/alterarPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newPassword: newPassword,
                    confirmNewPassword: confirmPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || t("Perfil.Alerta.3"));
                setNewPassword('');
                setConfirmPassword('');
            } else {
                alert(data.error || t("Perfil.Error.2"));
            }
        } catch (error) {
            console.error(t("Perfil.Error.2"), error);
            alert(t("Perfil.Error.2"));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.welcomeText}>{t("Perfil.Title")}, {userNome}</Text>

            <View style={styles.profileContainer}>
                <View style={styles.infoContainer}>
                    <Text style={styles.userName}>{userNome}</Text>
                    <Text style={styles.userCompany}>{user?.company}</Text>
                </View>
                <TouchableOpacity style={styles.avatarContainer} onPress={() => fileInput.current.click()}>
                    <Image
                        style={styles.avatar}
                        source={profileImage ? { uri: profileImage } : require('../assets/icon.png')}
                    />
                    <Text style={styles.uploadText}>{t("Perfil.Carregar")}</Text>
                </TouchableOpacity>
                {/* Input invisível para carregar imagem */}
                <input
                    type="file"
                    ref={fileInput}
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                />
            </View>

            <Text style={styles.changePasswordText}>{t("Perfil.Alterar")}</Text>

            <TextInput
                style={styles.input}
                placeholder={t("Perfil.Novapass")}
                value={newPassword}
                secureTextEntry
                onChangeText={setNewPassword}
            />
            <TextInput
                style={styles.input}
                placeholder={t("Perfil.Confirmarpass")}
                value={confirmPassword}
                secureTextEntry
                onChangeText={setConfirmPassword}
            />

            <Button title={t("Perfil.Gravar")} onPress={handleSavePassword} color="#1792FE" />

            {/* Modal de confirmação */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>{t("Perfil.ModalPergunta")}</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>{t("Perfil.ModalCancelar")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={alterarPassword}
                            >
                                <Text style={styles.buttonText}>{t("Perfil.ModalSim")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#D4E4FF',
        paddingHorizontal: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1792FE',
        marginBottom: 20,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e5efff',
        padding: 20,
        borderRadius: 15,
        marginBottom: 30,
        width: '100%',
        maxWidth: 400,
    },
    infoContainer: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1792FE',
    },
    userCompany: {
        fontSize: 16,
        color: '#555',
    },
    avatarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: '#1792FE',
    },
    changePasswordText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1792FE',
        marginBottom: 10,
    },
    input: {
        width: '100%',
        maxWidth: 400,
        padding: 10,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        backgroundColor: 'white',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    confirmButton: {
        backgroundColor: '#1792FE',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default Perfil;
