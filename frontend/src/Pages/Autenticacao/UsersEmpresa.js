
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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
    const [loading, setLoading] = useState(true);
    const [fadeAnimation] = useState(new Animated.Value(0));
    const [expandedUser, setExpandedUser] = useState(null);

    const navigation = useNavigation();
    const { t } = useTranslation();

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    const handleUserClick = (userId) => {
        navigation.navigate('UserModulesManagement', { userId });
    };

    const toggleUserExpand = (userId) => {
        setExpandedUser(expandedUser === userId ? null : userId);
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
        setLoading(true);
        try {
            
            const idDaEmpresa = localStorage.getItem('empresa_id');
const response = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${idDaEmpresa}`, {
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
                setErrorMessage('');
            } else {
                setErrorMessage('Erro ao carregar utilizadores.');
            }
        } catch (error) {
            console.error('Erro ao carregar utilizadores:', error);
            setErrorMessage('Erro de rede ao carregar utilizadores.');
        } finally {
            setLoading(false);
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
        if (!novaEmpresaId) {
            setErrorMessage('Por favor, selecione uma empresa para adicionar.');
            return;
        }

        try {
            setLoading(true);
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
                setErrorMessage('');
                await fetchUsers();
                
                // Reset após um tempo
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao adicionar empresa.');
                setSuccessMessage('');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de comunicação com o servidor.');
            setSuccessMessage('');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveEmpresa = async (userId, empresaId) => {
        if (!empresaId) {
            setErrorMessage('Por favor, selecione uma empresa para remover.');
            return;
        }

        try {
            setLoading(true);
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
                setErrorMessage('');
                await fetchUsers();
                
                // Reset após um tempo
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao remover empresa.');
                setSuccessMessage('');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de comunicação com o servidor.');
            setSuccessMessage('');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (userId, username) => {
        if (!window.confirm(`Tem a certeza que deseja remover o utilizador ${username}? Esta ação não pode ser revertida.`)) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                }
            });

            if (response.ok) {
                setSuccessMessage('Utilizador removido com sucesso!');
                setErrorMessage('');
                await fetchUsers();
                
                // Reset após um tempo
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao remover utilizador.');
                setSuccessMessage('');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de comunicação com o servidor.');
            setSuccessMessage('');
        } finally {
            setLoading(false);
        }
    };

    const loadMoreUsers = () => {
        setShowCount(prevCount => prevCount + 10);
    };

    const filteredUsers = users.filter((user) =>
        user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, showCount);

    const renderUserItem = ({ item }) => (
        <View style={styles.userCard}>
            <TouchableOpacity onPress={() => toggleUserExpand(item.id)} style={styles.userHeader}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: item.profileImage }}
                        style={styles.profileImage}
                    />
                    <View style={styles.userDetails}>
                        <Text style={styles.username}>{item.username}</Text>
                        <Text style={styles.email}>{item.email}</Text>
                        <View style={styles.empresaBadgesContainer}>
                            {item.empresas.map((empresa, index) => (
                                <View key={index} style={styles.empresaBadge}>
                                    <Text style={styles.empresaBadgeText}>{empresa}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
                <Ionicons 
                    name={expandedUser === item.id ? "chevron-up-circle" : "chevron-down-circle"} 
                    size={24} 
                    color="#4481EB" 
                />
            </TouchableOpacity>

            {expandedUser === item.id && (
                <View style={styles.expandedActions}>
                    <Text style={styles.actionTitle}>{"Gerir Empresas"}</Text>
                    
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={empresaSelecionada[item.id]}
                            onValueChange={(value) =>
                                setEmpresaSelecionada((prev) => ({
                                    ...prev,
                                    [item.id]: value,
                                }))
                            }
                            style={styles.empresaPicker}
                            itemStyle={styles.pickerItem}
                        >
                            <Picker.Item label={t("UsersEmpresa.Selecionar")} value="" />
                            {empresas.map((empresa) => (
                                <Picker.Item key={empresa.id} label={empresa.empresa} value={empresa.id} />
                            ))}
                        </Picker>
                    </View>
                    
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            onPress={() => handleAddEmpresa(item.id, empresaSelecionada[item.id])}
                            style={styles.addButton}
                        >
                            <LinearGradient
                                colors={['#4481EB', '#04BEFE']}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />
                                <Text style={styles.buttonText}>{t("UsersEmpresa.BtAdcionar")}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => handleRemoveEmpresa(item.id, empresaSelecionada[item.id])}
                            style={styles.removeButton}
                        >
                            <LinearGradient
                                colors={['#ff6b6b', '#ee5253']}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <MaterialCommunityIcons name="minus-circle-outline" size={18} color="#fff" />
                                <Text style={styles.buttonText}>{t("UsersEmpresa.BtRemover")}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                        onPress={() => handleUserClick(item.id)}
                        style={styles.modulesButton}
                    >
                        <LinearGradient
                            colors={['#6c5ce7', '#a29bfe']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialCommunityIcons name="view-module-outline" size={18} color="#fff" />
                            <Text style={styles.buttonText}>{"Gerir Módulos"}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={() => handleRemoveUser(item.id, item.username)}
                        style={styles.deleteButton}
                    >
                        <LinearGradient
                            colors={['#e17055', '#d63031']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
                            <Text style={styles.buttonText}>{"Remover Utilizador"}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{t("UsersEmpresa.Title")}</Text>
                    <Text style={styles.headerSubtitle}>Gerencie os utilizadores e suas empresas</Text>
                </View>
            </LinearGradient>
            
            <Animated.View 
                style={[
                    styles.contentContainer, 
                    { opacity: fadeAnimation, transform: [{ translateY: fadeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                    })}] }
                ]}
            >
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        
                        <TextInput
                            placeholder={t("UsersEmpresa.procurar")}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            style={styles.searchInput}
                            placeholderTextColor="#999"
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                                <MaterialCommunityIcons name="close-circle" size={18} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <MaterialCommunityIcons name="check-circle" size={22} color="#28A745" />
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}
                
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={22} color="#ff6b6b" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>A carregar utilizadores...</Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={(user) => `${user.id}`}
                            renderItem={renderUserItem}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons name="account-question" size={60} color="#d1dbed" />
                                    <Text style={styles.emptyTitle}>Nenhum utilizador encontrado</Text>
                                    <Text style={styles.emptyText}>Não foram encontrados utilizadores com os critérios de busca.</Text>
                                </View>
                            }
                            ListFooterComponent={
                                filteredUsers.length >= showCount && filteredUsers.length < users.length ? (
                                    <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreUsers}>
                                        <Text style={styles.loadMoreText}>Carregar mais</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={20} color="#4481EB" />
                                    </TouchableOpacity>
                                ) : null
                            }
                        />
                    </>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 16,
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchWrapper: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    clearButton: {
        padding: 4,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4edda',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    successText: {
        color: '#28A745',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8d7da',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#ff6b6b',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#777',
    },
    listContainer: {
        paddingVertical: 10,
    },
    userCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
    },
    userDetails: {
        marginLeft: 15,
        flex: 1,
    },
    username: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    empresaBadgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    empresaBadge: {
        backgroundColor: '#e6f2ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
    },
    empresaBadgeText: {
        fontSize: 12,
        color: '#4481EB',
    },
    expandedActions: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#f9fafc',
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#444',
        marginBottom: 12,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    empresaPicker: {
        width: '100%',
        height: 50,
        color: '#333',
    },
    pickerItem: {
        fontSize: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    addButton: {
        flex: 1,
        marginRight: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    removeButton: {
        flex: 1,
        marginLeft: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modulesButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    deleteButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        maxWidth: '80%',
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        backgroundColor: '#f5f7fa',
        marginVertical: 10,
    },
    loadMoreText: {
        color: '#4481EB',
        fontWeight: '500',
        marginRight: 5,
    },
});

export default UsersEmpresa;
