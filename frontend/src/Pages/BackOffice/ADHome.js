
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';

const ADHome = () => {
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [allModulos, setAllModulos] = useState([]);
    const [activeTab, setActiveTab] = useState('config'); // config, modules, submodules
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedModulo, setSelectedModulo] = useState(null);
    const [selectedModuloForSubmodules, setSelectedModuloForSubmodules] = useState(null);
    const [allSubmodulos, setAllSubmodulos] = useState([]);
    const [isAdding, setIsAdding] = useState(true);
    const [maxUsers, setMaxUsers] = useState('');
    const [tempoIntervaloPadrao, setTempoIntervaloPadrao] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEmpresas();
        fetchAllModulos();
    }, []);

    const fetchEmpresas = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/empresas/listar');
            const data = await response.json();
            setEmpresas(data);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            Alert.alert('Erro', 'Não foi possível carregar as empresas');
        }
    };

    const fetchEmpresaInfo = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}`);
            const data = await response.json();
            setMaxUsers(data.maxUsers?.toString() || '');
            setTempoIntervaloPadrao(data.tempoIntervaloPadrao?.toString() || '');
        } catch (error) {
            console.error('Erro ao carregar dados da empresa:', error);
        }
    };

    const fetchAllModulos = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/modulos/listar');
            const data = await response.json();
            setAllModulos(data.modulos || []);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    };

    const fetchEmpresaModulos = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}/modulos`);
            const data = await response.json();
            setEmpresaModulos(data.modulos || []);
        } catch (error) {
            console.error('Erro ao carregar módulos da empresa:', error);
        }
    };

    const fetchAllSubmodulosByModulo = async (moduloId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/modulos/${moduloId}/submodulos-disponiveis`);
            const data = await response.json();
            setAllSubmodulos(data.submodulos || []);
        } catch (error) {
            console.error('Erro ao carregar submódulos:', error);
        }
    };

    const handleEmpresaSelect = (empresa) => {
        setSelectedEmpresa(empresa);
        fetchEmpresaModulos(empresa.id);
        fetchEmpresaInfo(empresa.id);
        setActiveTab('config');
    };

    const updateEmpresaInfo = async () => {
        if (!maxUsers || !tempoIntervaloPadrao) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/updateEmpresaInfo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maxUsers: parseInt(maxUsers),
                    tempoIntervaloPadrao: parseFloat(tempoIntervaloPadrao),
                }),
            });

            if (!response.ok) throw new Error('Erro ao atualizar');
            
            Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar os dados');
        } finally {
            setLoading(false);
        }
    };

    const toggleModulo = async (modulo, adding) => {
        setLoading(true);
        try {
            const url = `https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/modulos${adding ? '' : `/${modulo.id}`}`;
            const method = adding ? 'POST' : 'DELETE';
            const body = adding ? JSON.stringify({ moduloId: modulo.id }) : null;

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            fetchEmpresaModulos(selectedEmpresa.id);
            Alert.alert('Sucesso', `Módulo ${adding ? 'adicionado' : 'removido'} com sucesso!`);
        } catch (error) {
            Alert.alert('Erro', 'Operação falhou');
        } finally {
            setLoading(false);
        }
    };

    const toggleSubmodulo = async (submodulo, adding) => {
        setLoading(true);
        try {
            const url = `https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/submodulos${adding ? '' : `/${submodulo.id}`}`;
            const method = adding ? 'POST' : 'DELETE';
            const body = adding ? JSON.stringify({ submoduloId: submodulo.id }) : null;

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            fetchEmpresaModulos(selectedEmpresa.id);
            if (selectedModuloForSubmodules) {
                fetchAllSubmodulosByModulo(selectedModuloForSubmodules.id);
            }
            Alert.alert('Sucesso', `Submódulo ${adding ? 'adicionado' : 'removido'} com sucesso!`);
        } catch (error) {
            Alert.alert('Erro', 'Operação falhou');
        } finally {
            setLoading(false);
        }
    };

    const renderEmpresaSelector = () => (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Selecionar Empresa</Text>
            <View style={styles.empresaGrid}>
                {empresas.map((empresa) => (
                    <TouchableOpacity
                        key={empresa.id}
                        style={[
                            styles.empresaCard,
                            selectedEmpresa?.id === empresa.id && styles.empresaCardSelected
                        ]}
                        onPress={() => handleEmpresaSelect(empresa)}
                    >
                        <Text style={[
                            styles.empresaText,
                            selectedEmpresa?.id === empresa.id && styles.empresaTextSelected
                        ]}>
                            {empresa.empresa || "Empresa"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderConfigTab = () => (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Configurações da Empresa</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Limite máximo de utilizadores</Text>
                <TextInput
                    style={styles.input}
                    value={maxUsers}
                    onChangeText={setMaxUsers}
                    keyboardType="numeric"
                    placeholder="Ex: 50"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Intervalo padrão (horas)</Text>
                <TextInput
                    style={styles.input}
                    value={tempoIntervaloPadrao}
                    onChangeText={setTempoIntervaloPadrao}
                    keyboardType="decimal-pad"
                    placeholder="Ex: 8.5"
                />
            </View>

            <TouchableOpacity 
                style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                onPress={updateEmpresaInfo}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'Atualizando...' : 'Salvar Configurações'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderModulesTab = () => {
        const availableModules = allModulos.filter(modulo => 
            !empresaModulos.some(em => em.id === modulo.id)
        );

        return (
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Gestão de Módulos</Text>
                
                {empresaModulos.length > 0 && (
                    <View style={styles.subsection}>
                        <Text style={styles.subsectionTitle}>Módulos Ativos</Text>
                        {empresaModulos.map((modulo) => (
                            <View key={modulo.id} style={styles.moduleItem}>
                                <Text style={styles.moduleText}>{modulo.nome}</Text>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => toggleModulo(modulo, false)}
                                    disabled={loading}
                                >
                                    <Text style={styles.buttonText}>Remover</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {availableModules.length > 0 && (
                    <View style={styles.subsection}>
                        <Text style={styles.subsectionTitle}>Módulos Disponíveis</Text>
                        {availableModules.map((modulo) => (
                            <View key={modulo.id} style={styles.moduleItem}>
                                <Text style={styles.moduleText}>{modulo.nome}</Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => toggleModulo(modulo, true)}
                                    disabled={loading}
                                >
                                    <Text style={styles.buttonText}>Adicionar</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderSubmodulesTab = () => (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Gestão de Submódulos</Text>
            
            <Text style={styles.subsectionTitle}>Selecionar Módulo:</Text>
            <View style={styles.moduleSelector}>
                {empresaModulos.map((modulo) => (
                    <TouchableOpacity
                        key={modulo.id}
                        style={[
                            styles.moduleSelectorButton,
                            selectedModuloForSubmodules?.id === modulo.id && styles.moduleSelectorButtonActive
                        ]}
                        onPress={() => {
                            setSelectedModuloForSubmodules(modulo);
                            fetchAllSubmodulosByModulo(modulo.id);
                        }}
                    >
                        <Text style={[
                            styles.moduleSelectorText,
                            selectedModuloForSubmodules?.id === modulo.id && styles.moduleSelectorTextActive
                        ]}>
                            {modulo.nome}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {selectedModuloForSubmodules && (
                <View style={styles.submodulesContainer}>
                    <Text style={styles.subsectionTitle}>
                        Submódulos de "{selectedModuloForSubmodules.nome}"
                    </Text>
                    
                    {selectedModuloForSubmodules.submodulos?.length > 0 && (
                        <View style={styles.subsection}>
                            <Text style={styles.label}>Ativos:</Text>
                            {selectedModuloForSubmodules.submodulos.map((submodulo) => (
                                <View key={submodulo.id} style={styles.moduleItem}>
                                    <Text style={styles.moduleText}>{submodulo.nome}</Text>
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={() => toggleSubmodulo(submodulo, false)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.buttonText}>Adicionar</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {allSubmodulos.filter(sub => 
                        !selectedModuloForSubmodules.submodulos?.some(es => es.id === sub.id)
                    ).length > 0 && (
                        <View style={styles.subsection}>
                            <Text style={styles.label}>Disponíveis:</Text>
                            {allSubmodulos
                                .filter(sub => !selectedModuloForSubmodules.submodulos?.some(es => es.id === sub.id))
                                .map((submodulo) => (
                                    <View key={submodulo.id} style={styles.moduleItem}>
                                        <Text style={styles.moduleText}>{submodulo.nome}</Text>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => toggleSubmodulo(submodulo, true)}
                                            disabled={loading}
                                        >
                                            <Text style={styles.buttonText}>Remover</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Gestão de Empresas - AdvirLink</Text>
            
            {renderEmpresaSelector()}

            {selectedEmpresa && (
                <>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'config' && styles.tabActive]}
                            onPress={() => setActiveTab('config')}
                        >
                            <Text style={[styles.tabText, activeTab === 'config' && styles.tabTextActive]}>
                                Configurações
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'modules' && styles.tabActive]}
                            onPress={() => setActiveTab('modules')}
                        >
                            <Text style={[styles.tabText, activeTab === 'modules' && styles.tabTextActive]}>
                                Módulos
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'submodules' && styles.tabActive]}
                            onPress={() => setActiveTab('submodules')}
                        >
                            <Text style={[styles.tabText, activeTab === 'submodules' && styles.tabTextActive]}>
                                Submódulos
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'config' && renderConfigTab()}
                    {activeTab === 'modules' && renderModulesTab()}
                    {activeTab === 'submodules' && renderSubmodulesTab()}
                </>
            )}
        </ScrollView>
    );
};

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1976D2',
        textAlign: 'center',
        marginBottom: 24,
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 16,
    },
    empresaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    empresaCard: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        minWidth: 120,
    },
    empresaCardSelected: {
        backgroundColor: '#1976D2',
        borderColor: '#1565C0',
    },
    empresaText: {
        color: '#1976D2',
        fontWeight: '600',
        textAlign: 'center',
    },
    empresaTextSelected: {
        color: '#ffffff',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#1976D2',
    },
    tabText: {
        color: '#666',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    primaryButton: {
        backgroundColor: '#1976D2',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#bbb',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    subsection: {
        marginBottom: 20,
    },
    subsectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#555',
        marginBottom: 8,
    },
    moduleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 8,
    },
    moduleText: {
        flex: 1,
        fontSize: 16,
        color: '#2c3e50',
    },
    addButton: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    removeButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    moduleSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    moduleSelectorButton: {
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bdc3c7',
    },
    moduleSelectorButtonActive: {
        backgroundColor: '#3498db',
        borderColor: '#2980b9',
    },
    moduleSelectorText: {
        color: '#2c3e50',
        fontWeight: '500',
    },
    moduleSelectorTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    submodulesContainer: {
        marginTop: 16,
    },
};

export default ADHome;
