import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, CheckBox } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const UserModulesManagement = ({ route }) => {
    const { userId } = route.params;
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [userModulos, setUserModulos] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const { t } = useTranslation();
    useEffect(() => {
        fetchEmpresaModulos();
        fetchUserModulos(userId);
    }, [userId]);

    const fetchEmpresaModulos = async () => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/users/${userId}/empresa-modulos`);
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar módulos da empresa.');
            }
    
            setEmpresaModulos(data.modulos || []);
        } catch (error) {
            setErrorMessage('Erro ao carregar módulos da empresa.');
            console.error(error);
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
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userid: userId, moduloid: moduloId }),
            });
            fetchUserModulos(userId);
        } catch {
            setErrorMessage('Erro ao atualizar módulo.');
        }
    };

    const handleToggleSubmodulo = async (moduloId, submoduloId) => {
        const isCurrentlyChecked = isSubmoduloChecked(moduloId, submoduloId);
        const url = isCurrentlyChecked 
            ? 'https://backend.advir.pt/api/submodulos/remover' 
            : 'https://backend.advir.pt/api/submodulos/associar';

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userid: userId, submoduloid: submoduloId }),
            });
            fetchUserModulos(userId);
        } catch {
            setErrorMessage('Erro ao atualizar submódulo.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.innerContainer}>
                <Text style={styles.title}>{t("UserModulesManagement.Title")}</Text>
                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                
                <FlatList
                    data={empresaModulos}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: modulo }) => (
                        <View style={styles.moduleContainer}>
                            <CheckBox
                                value={isModuloChecked(modulo.id)}
                                onValueChange={(isChecked) => handleToggleModulo(modulo.id, isChecked)}
                            />
                            <Text style={styles.moduleText}>{modulo.nome}</Text>

                            {/* Renderizar lista de submódulos se existirem */}
                            {Array.isArray(modulo.submodulos) && modulo.submodulos.length > 0 && (
                                <FlatList
                                    data={modulo.submodulos}
                                    keyExtractor={(subItem) => subItem.id.toString()}
                                    renderItem={({ item: submodulo }) => (
                                        <View style={styles.submoduleContainer}>
                                            <CheckBox
                                                value={isSubmoduloChecked(modulo.id, submodulo.id)}
                                                onValueChange={() => handleToggleSubmodulo(modulo.id, submodulo.id)}
                                            />
                                            <Text style={styles.submoduleText}>{submodulo.nome}</Text>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#d4e4ff',
    },
    innerContainer: {
        width: '90%',
        padding: 20,
        borderRadius: 15,
        backgroundColor: '#F5F9FF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        textAlign: 'center',
        color: '#1792FE',
        fontWeight: '600',
        fontSize: 22,
        marginBottom: 20,
    },
    error: {
        color: 'red',
        marginBottom: 20,
        textAlign: 'center',
    },
    moduleContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginVertical: 5,
        backgroundColor: '#d4e4ff',
        borderRadius: 8,
    },
    moduleText: {
        fontSize: 18,
        color: '#1792FE',
        marginBottom: 10,
    },
    submoduleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 20,
        marginLeft: 20,
        backgroundColor: '#e0ecff',
        borderRadius: 8,
    },
    submoduleText: {
        fontSize: 16,
        color: '#1792FE',
        marginLeft: 10,
    },
});

export default UserModulesManagement;
