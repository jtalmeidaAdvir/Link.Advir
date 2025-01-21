import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Picker, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const UsersEmpresa = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [showCount, setShowCount] = useState(10);
    const [empresas, setEmpresas] = useState([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();
    const handleUserClick = (userId) => {
        navigation.navigate('UserModulesManagement', { userId });
    };

    // Função para obter a imagem de perfil de um utilizador, com tratamento para imagem inexistente
    const fetchUserProfileImage = async (userId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/profileImage`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                }
            });
            if (response.ok) {
                const imageBlob = await response.blob();
                return URL.createObjectURL(imageBlob);
            }
            // Retorna imagem padrão se não existir
            return 'https://via.placeholder.com/60';
        } catch (error) {
            console.error('Erro ao carregar imagem de perfil:', error);
            return 'https://via.placeholder.com/60'; // Imagem padrão em caso de erro
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/users/usersByEmpresa', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Carrega a imagem de perfil para cada utilizador
                const usersWithImages = await Promise.all(data.map(async (user) => {
                    const profileImage = await fetchUserProfileImage(user.id);
                    return { ...user, profileImage };
                }));
                
                // Agrupar utilizadores e empresas
                const groupedUsers = usersWithImages.reduce((acc, curr) => {
                    const user = acc.find(u => u.username === curr.username);
                    if (user) {
                        user.empresas.push(curr.empresa);
                    } else {
                        acc.push({ ...curr, empresas: [curr.empresa] });
                    }
                    return acc;
                }, []);
                
                setUsers(groupedUsers);
            } else {
                setErrorMessage('Erro ao carregar utilizadores.');
            }
        } catch (error) {
            console.error('Erro ao carregar utilizadores:', error);
            setErrorMessage('Erro de rede ao carregar utilizadores.');
        }
    };

    const fetchEmpresas = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/users/empresas', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setEmpresas(data);
            } else {
                setErrorMessage('Erro ao carregar empresas.');
            }
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            setErrorMessage('Erro de rede ao carregar empresas.');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchEmpresas();
    }, []);

    const handleAddEmpresa = async (userId, novaEmpresaId) => {
        try {
            const response = await fetch('https://backend.advir.pt/api/users/adicionar-empresa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                },
                body: JSON.stringify({
                    userId,
                    novaEmpresaId
                })
            });

            if (response.ok) {
                setSuccessMessage('Empresa adicionada com sucesso!');
                fetchUsers();
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao adicionar empresa.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
        }
    };

    const handleRemoveEmpresa = async (userId, empresaId) => {
        try {
            const response = await fetch('https://backend.advir.pt/api/users/remover-empresa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                },
                body: JSON.stringify({
                    userId,
                    empresaId
                })
            });

            if (response.ok) {
                setSuccessMessage('Empresa removida com sucesso!');
                fetchUsers();
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao remover empresa.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
        }
    };

    const filteredUsers = users.filter((user) =>
        user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, showCount);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t("UsersEmpresa.Title")}</Text>

            <TextInput
                placeholder={t("UsersEmpresa.procurar")}
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <FlatList
                data={filteredUsers}
                keyExtractor={(user) => user.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.userCard}>
                        <TouchableOpacity onPress={() => handleUserClick(item.id)} style={styles.userInfo}>
                            <Image
                                source={{ uri: item.profileImage }}
                                style={styles.profileImage}
                            />
                            <View>
                                <Text style={styles.username}>{item.username}</Text>
                                <Text style={styles.email}>{item.email}</Text>
                                <Text style={styles.empresas}>{item.empresas.join(', ')}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.actions}>
                            <Picker
                                selectedValue={empresaSelecionada[item.id]}
                                onValueChange={(value) =>
                                    setEmpresaSelecionada((prev) => ({
                                        ...prev,
                                        [item.id]: value,
                                    }))
                                }
                                style={styles.empresaPicker}
                            >
                                <Picker.Item label={t("UsersEmpresa.Selecionar")} value="" />
                                {empresas.map((empresa) => (
                                    <Picker.Item key={empresa.id} label={empresa.empresa} value={empresa.id} />
                                ))}
                            </Picker>
                            <TouchableOpacity
                                onPress={() => handleAddEmpresa(item.id, empresaSelecionada[item.id])}
                                style={styles.addButton}
                            >
                                <Text style={styles.buttonText}>{t("UsersEmpresa.BtAdcionar")} </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleRemoveEmpresa(item.id, empresaSelecionada[item.id])}
                                style={styles.removeButton}
                            >
                                <Text style={styles.buttonText}>{t("UsersEmpresa.BtRemover")} </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff', // Mantém a cor de fundo original

    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        color: '#1792FE',
        marginBottom: 20,
        alignSelf: 'center',

    },
    searchInput: {
        padding: 15,
        borderRadius: 30,
        borderColor: '#1792FE',
        borderWidth: 1,
        marginBottom: 20,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
 
    },
    userCard: {
        flexDirection: 'column',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
    },
    username: {
        fontSize: 18,
        color: '#1792FE',
        marginBottom: 5,
        fontWeight: '500',

    },
    email: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 5,

    },
    empresas: {
        fontSize: 14,
        color: '#555555',

    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    empresaPicker: {
        flex: 1,
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        fontSize: 14,
        marginRight: 10,
        backgroundColor: '#FFFFFF',
    },
    addButton: {
        backgroundColor: '#1792FE',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginRight: 10,
    },
    removeButton: {
        backgroundColor: '#FF3B3B',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,

    },
    errorText: {
        color: '#FF3B3B',
        marginBottom: 10,

    },
    successText: {
        color: '#28A745',
        marginBottom: 10,

    },
});

export default UsersEmpresa;