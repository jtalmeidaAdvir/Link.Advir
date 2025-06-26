
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const UserModulesManagement = ({ route }) => {
    const { userId } = route.params;
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [userModulos, setUserModulos] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState({});
    const [fadeAnimation] = useState(new Animated.Value(0));
    const { t } = useTranslation();

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    useEffect(() => {
        fetchEmpresaModulos();
        fetchUserModulos(userId);
    }, [userId]);

    const fetchEmpresaModulos = async () => {
        try {
            setLoading(true);
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/empresa-modulos`);
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar módulos da empresa.');
            }
    
            setEmpresaModulos(data.modulos || []);
            
            // Initialize expanded state for all modules
            const initialExpandState = {};
            (data.modulos || []).forEach(module => {
                initialExpandState[module.id] = false;
            });
            setExpandedModules(initialExpandState);
            
            setErrorMessage('');
        } catch (error) {
            setErrorMessage('Erro ao carregar módulos da empresa.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchUserModulos = async (userId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos`);
            const data = await response.json();
            setUserModulos(data.modulos || []);
        } catch (error) {
            setErrorMessage('Erro ao carregar módulos do utilizador.');
        }
    };

    const isModuloChecked = (moduloId) => {
        return userModulos.some((m) => m.id === moduloId);
    };

    const isSubmoduloChecked = (moduloId, submoduloId) => {
        const modulo = userModulos.find((m) => m.id === moduloId);
        return modulo?.submodulos?.some((sm) => sm.id === submoduloId) || false;
    };

    const handleToggleModulo = async (moduloId, isChecked) => {
        const url = isChecked 
            ? 'https://backend.advir.pt/api/modulos/associar' 
            : 'https://backend.advir.pt/api/modulos/remover';

        try {
            setSuccessMessage('');
            setErrorMessage('');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                },
                body: JSON.stringify({ userid: userId, moduloid: moduloId }),
            });
            
            if (response.ok) {
                fetchUserModulos(userId);
                setSuccessMessage(isChecked ? 'Módulo associado com sucesso!' : 'Módulo removido com sucesso!');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                setErrorMessage('Falha ao atualizar módulo.');
            }
        } catch (error) {
            console.error('Error toggling module:', error);
            setErrorMessage('Erro ao atualizar módulo.');
        }
    };

    const handleToggleSubmodulo = async (moduloId, submoduloId, isCurrentlyChecked) => {
        const url = isCurrentlyChecked 
            ? 'https://backend.advir.pt/api/submodulos/remover' 
            : 'https://backend.advir.pt/api/submodulos/associar';

        try {
            setSuccessMessage('');
            setErrorMessage('');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
                },
                body: JSON.stringify({ userid: userId, submoduloid: submoduloId }),
            });
            
            if (response.ok) {
                fetchUserModulos(userId);
                setSuccessMessage(isCurrentlyChecked ? 'Submódulo removido com sucesso!' : 'Submódulo associado com sucesso!');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            } else {
                setErrorMessage('Falha ao atualizar submódulo.');
            }
        } catch (error) {
            console.error('Error toggling submodule:', error);
            setErrorMessage('Erro ao atualizar submódulo.');
        }
    };

    const toggleModuleExpand = (moduleId) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const renderSubmoduleItem = (submodulo, moduleId) => {
        const isChecked = isSubmoduloChecked(moduleId, submodulo.id);
        
        return (
            <View style={styles.submoduleItem} key={submodulo.id}>
                <View style={styles.submoduleContent}>
                    <MaterialCommunityIcons 
                        name="subdirectory-arrow-right" 
                        size={18} 
                        color="#4481EB" 
                    />
                    <Text style={styles.submoduleText}>{submodulo.nome}</Text>
                </View>
                
                <Switch
                    trackColor={{ false: "#e0e0e0", true: "#c4dafa" }}
                    thumbColor={isChecked ? "#4481EB" : "#f4f3f4"}
                    ios_backgroundColor="#e0e0e0"
                    onValueChange={() => handleToggleSubmodulo(moduleId, submodulo.id, isChecked)}
                    value={isChecked}
                />
            </View>
        );
    };

    const renderModuleItem = ({ item }) => {
        const isExpanded = expandedModules[item.id];
        const isChecked = isModuloChecked(item.id);
        
        return (
            <View style={styles.moduleCard}>
                <TouchableOpacity 
                    style={styles.moduleHeader} 
                    onPress={() => toggleModuleExpand(item.id)}
                >
                    <View style={styles.moduleTitle}>
                        <MaterialCommunityIcons 
                            name="view-dashboard-outline" 
                            size={22} 
                            color="#4481EB" 
                        />
                        <Text style={styles.moduleName}>{item.nome}</Text>
                    </View>
                    
                    <View style={styles.moduleControls}>
                        <Switch
                            trackColor={{ false: "#e0e0e0", true: "#c4dafa" }}
                            thumbColor={isChecked ? "#4481EB" : "#f4f3f4"}
                            ios_backgroundColor="#e0e0e0"
                            onValueChange={(value) => handleToggleModulo(item.id, value)}
                            value={isChecked}
                            style={styles.moduleSwitch}
                        />
                        
                        <Ionicons 
                            name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"} 
                            size={22} 
                            color="#4481EB" 
                        />
                    </View>
                </TouchableOpacity>
                
                {isExpanded && item.submodulos && item.submodulos.length > 0 && (
                    <View style={styles.submodulesContainer}>
                        {item.submodulos.map(submodulo => 
                            renderSubmoduleItem(submodulo, item.id)
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{t("UserModulesManagement.Title")}</Text>
                    <Text style={styles.headerSubtitle}>Gira os módulos do utilizador</Text>
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

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>A carregar módulos...</Text>
                    </View>
                ) : (
                    <View style={styles.modulesContainer}>
                        
                        
                        <FlatList
                            data={empresaModulos}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderModuleItem}
                            contentContainerStyle={styles.moduleList}
                            scrollEnabled={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons name="view-dashboard-outline" size={60} color="#d1dbed" />
                                    <Text style={styles.emptyTitle}>Sem módulos disponíveis</Text>
                                    <Text style={styles.emptyText}>Não foram encontrados módulos para esta empresa.</Text>
                                </View>
                            }
                        />
                    </View>
                )}
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    scrollContent: {
        flexGrow: 1,
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
        paddingBottom: 20,
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#777',
    },
    modulesContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    moduleList: {
        paddingBottom: 10,
    },
    moduleCard: {
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
    moduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    moduleTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    moduleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 10,
    },
    moduleControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    moduleSwitch: {
        marginRight: 10,
    },
    submodulesContainer: {
        backgroundColor: '#f9fafc',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingVertical: 8,
    },
    submoduleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    submoduleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    submoduleText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 8,
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
});

export default UserModulesManagement;
