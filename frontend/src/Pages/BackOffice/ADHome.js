
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { styles } from './Css/ADHomeStyles';

const ADHome = () => {
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [allModulos, setAllModulos] = useState([]);
    const [activeTab, setActiveTab] = useState('config');
    const [selectedModuloForSubmodules, setSelectedModuloForSubmodules] = useState(null);
    const [allSubmodulosForSelectedModule, setAllSubmodulosForSelectedModule] = useState([]);
    const [empresaSubmodulosForSelectedModule, setEmpresaSubmodulosForSelectedModule] = useState([]);
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
            setEmpresas(Array.isArray(data) ? data : (data.empresas || []));
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

    const fetchAllSubmodulosForModule = async (moduloId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/submodulos/modulo/${moduloId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            setAllSubmodulosForSelectedModule(data.submodulos || []);
        } catch (error) {
            console.error('Erro ao carregar todos os submódulos do módulo:', error);
            setAllSubmodulosForSelectedModule([]);
        }
    };

    const fetchEmpresaSubmodulosForModule = async (empresaId, moduloId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}/modulos/${moduloId}/submodulos`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            setEmpresaSubmodulosForSelectedModule(data.submodulos || []);
        } catch (error) {
            console.error('Erro ao carregar submódulos da empresa para o módulo:', error);
            setEmpresaSubmodulosForSelectedModule([]);
        }
    };

    const handleEmpresaSelect = (empresa) => {
        setSelectedEmpresa(empresa);
        fetchEmpresaModulos(empresa.id);
        fetchEmpresaInfo(empresa.id);
        setActiveTab('config');
        setSelectedModuloForSubmodules(null);
        setAllSubmodulosForSelectedModule([]);
        setEmpresaSubmodulosForSelectedModule([]);
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

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            if (!response.ok) throw new Error('Erro na operação');

            fetchEmpresaModulos(selectedEmpresa.id);

            // Se estamos removendo o módulo que está selecionado para submódulos, limpar a seleção
            if (!adding && selectedModuloForSubmodules?.id === modulo.id) {
                setSelectedModuloForSubmodules(null);
                setAllSubmodulosForSelectedModule([]);
                setEmpresaSubmodulosForSelectedModule([]);
            }

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

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            if (!response.ok) throw new Error('Erro na operação');

            // Recarregar os submódulos da empresa para o módulo selecionado
            await fetchEmpresaSubmodulosForModule(selectedEmpresa.id, selectedModuloForSubmodules.id);

            Alert.alert('Sucesso', `Submódulo ${adding ? 'adicionado' : 'removido'} com sucesso!`);
        } catch (error) {
            Alert.alert('Erro', 'Operação falhou');
        } finally {
            setLoading(false);
        }
    };

    const handleModuleSelectionForSubmodules = async (modulo) => {
        setSelectedModuloForSubmodules(modulo);
        await Promise.all([
            fetchAllSubmodulosForModule(modulo.id),
            fetchEmpresaSubmodulosForModule(selectedEmpresa.id, modulo.id)
        ]);
    };

    const isSubmoduloAvailableForEmpresa = (submodulo) => {
        return !empresaSubmodulosForSelectedModule.some(empresaSubmodulo => empresaSubmodulo.id === submodulo.id);
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
                        onPress={() => handleModuleSelectionForSubmodules(modulo)}
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

                    {empresaSubmodulosForSelectedModule.length > 0 && (
                        <View style={styles.subsection}>
                            <Text style={styles.label}>Submódulos Ativos:</Text>
                            {empresaSubmodulosForSelectedModule.map((submodulo) => (
                                <View key={submodulo.id} style={styles.moduleItem}>
                                    <Text style={styles.moduleText}>{submodulo.nome}</Text>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => toggleSubmodulo(submodulo, false)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.buttonText}>Remover</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {allSubmodulosForSelectedModule.filter(sub => isSubmoduloAvailableForEmpresa(sub)).length > 0 && (
                        <View style={styles.subsection}>
                            <Text style={styles.label}>Submódulos Disponíveis:</Text>
                            {allSubmodulosForSelectedModule
                                .filter(sub => isSubmoduloAvailableForEmpresa(sub))
                                .map((submodulo) => (
                                    <View key={submodulo.id} style={styles.moduleItem}>
                                        <Text style={styles.moduleText}>{submodulo.nome}</Text>
                                        <TouchableOpacity
                                            style={styles.addButton}
                                            onPress={() => toggleSubmodulo(submodulo, true)}
                                            disabled={loading}
                                        >
                                            <Text style={styles.buttonText}>Adicionar</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                        </View>
                    )}

                    {allSubmodulosForSelectedModule.length === 0 && (
                        <View style={styles.subsection}>
                            <Text style={styles.label}>Este módulo não possui submódulos disponíveis.</Text>
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



export default ADHome;
