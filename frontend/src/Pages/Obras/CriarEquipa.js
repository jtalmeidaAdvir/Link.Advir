import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator, 
    ScrollView, 
    StyleSheet, 
    Alert,
    Animated,
    Dimensions,
    Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

const CriarEquipa = () => {
    const [nomeEquipa, setNomeEquipa] = useState('');
    const [obras, setObras] = useState([]);
    const [utilizadores, setUtilizadores] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [membrosSelecionados, setMembrosSelecionados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [equipasCriadas, setEquipasCriadas] = useState([]);
    const [modalEditar, setModalEditar] = useState(false);
    const [novoNomeEquipa, setNovoNomeEquipa] = useState('');
    const [equipaSelecionadaEditar, setEquipaSelecionadaEditar] = useState(null);
    const [animatedValue] = useState(new Animated.Value(0));
    const [formAnimated] = useState(new Animated.Value(0));
    const [expandedTeams, setExpandedTeams] = useState({});
    const [modalConfirmDelete, setModalConfirmDelete] = useState(false);
    const [equipaParaRemover, setEquipaParaRemover] = useState(null);
    const [membersExpanded, setMembersExpanded] = useState(false);

    // Animação principal
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true
                })
            ])
        ).start();

        // Animação do formulário
        Animated.timing(formAnimated, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    const pulseAnimation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05]
    });

    const formOpacity = formAnimated.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });

    const formTranslateY = formAnimated.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0]
    });

    useEffect(() => {
        fetchObras();
        fetchUtilizadores();
        fetchEquipasCriadas();
    }, []);

    const fetchObras = async () => {
        try {
            const token = await AsyncStorage.getItem('loginToken');
            const empresaNome = localStorage.getItem("empresaSelecionada");

            const empresaRes = await fetch(`https://backend.advir.pt/api/empresas/nome/${empresaNome}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!empresaRes.ok) throw new Error('Erro ao obter ID da empresa');

            const empresaData = await empresaRes.json();
            const empresaId = empresaData.id;

            const res = await fetch(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (res.ok) setObras(data);
            else throw new Error(data.message || 'Erro ao buscar obras');
        } catch (err) {
            console.error('Erro ao carregar obras:', err);
        }
    };

    const fetchEquipasCriadas = async () => {
        try {
            const token = await AsyncStorage.getItem('loginToken');
            const res = await fetch('https://backend.advir.pt/api/equipa-obra/listar-todas', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setEquipasCriadas(data);
        } catch (err) {
            console.error('Erro ao carregar equipas criadas:', err);
        }
    };

    const obterIdDaEmpresa = async () => {
        const empresaNome = localStorage.getItem("empresaSelecionada");
        const loginToken = localStorage.getItem("loginToken");

        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/nome/${empresaNome}`, {
                headers: {
                    Authorization: `Bearer ${loginToken}`,
                },
            });

            if (!response.ok) {
                throw new Error("Erro ao obter ID da empresa");
            }

            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error("Erro ao obter o ID da empresa:", error);
            return null;
        }
    };

    const fetchUtilizadores = async () => {
        try {
            const loginToken = localStorage.getItem("loginToken");
            const empresaId = await obterIdDaEmpresa();

            if (!empresaId) {
                throw new Error("ID da empresa não encontrado");
            }

            const response = await fetch(
                `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${loginToken}` }
                }
            );

            if (!response.ok) {
                throw new Error("Erro ao obter utilizadores");
            }

            const data = await response.json();
            setUtilizadores(data);
        } catch (error) {
            console.error("Erro ao carregar utilizadores:", error.message);
        }
    };

    const toggleMembro = (id) => {
        if (membrosSelecionados.includes(id)) {
            setMembrosSelecionados(membrosSelecionados.filter(m => m !== id));
        } else {
            setMembrosSelecionados([...membrosSelecionados, id]);
        }
    };

    const toggleTeamExpansion = (teamName) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamName]: !prev[teamName]
        }));
    };

    const criarEquipa = async () => {
        if (!nomeEquipa || !obraSelecionada || membrosSelecionados.length === 0) {
            Alert.alert('Erro', 'Preenche todos os campos.');
            return;
        }

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('loginToken');
            const res = await fetch('https://backend.advir.pt/api/equipa-obra', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome: nomeEquipa,
                    obra_id: obraSelecionada,
                    membros: membrosSelecionados,
                }),
            });
            
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Sucesso', 'Equipa criada com sucesso!');
                setNomeEquipa('');
                setObraSelecionada('');
                setMembrosSelecionados([]);
                fetchEquipasCriadas();
            } else {
                Alert.alert('Erro', data.message || 'Erro ao criar equipa.');
            }
        } catch (err) {
            console.error('Erro ao criar equipa:', err);
            Alert.alert('Erro', 'Erro ao criar equipa.');
        } finally {
            setLoading(false);
        }
    };

    const removerEquipaInteira = async () => {
        if (!equipaParaRemover) return;
        
        try {
            const token = await AsyncStorage.getItem('loginToken');
            const res = await fetch('https://backend.advir.pt/api/equipa-obra/remover-equipa', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    nomeEquipa: equipaParaRemover.nome, 
                    obraId: equipaParaRemover.obraId 
                }),
            });

            if (res.ok) {
                fetchEquipasCriadas();
                setModalConfirmDelete(false);
                setEquipaParaRemover(null);
            } else {
                console.error('Erro ao remover a equipa');
            }
        } catch (err) {
            console.error('Erro ao remover equipa:', err);
        }
    };

    const confirmarRemocaoEquipa = (nomeEquipa, obraId) => {
        setEquipaParaRemover({ nome: nomeEquipa, obraId });
        setModalConfirmDelete(true);
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={['#1792FE', '#0B5ED7']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Animated.View style={[styles.headerContent, { transform: [{ scale: pulseAnimation }] }]}>
                    <FontAwesome name="users" size={32} color="#FFFFFF" style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>Gestão de Equipas</Text>
                    <Text style={styles.headerSubtitle}>
                        Criar e gerir equipas de trabalho
                    </Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );

    const renderFormSection = () => (
        <Animated.View 
            style={[
                styles.formSection,
                {
                    opacity: formOpacity,
                    transform: [{ translateY: formTranslateY }]
                }
            ]}
        >
            <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.formGradient}
            >
                <View style={styles.sectionHeader}>
                    <FontAwesome name="plus-circle" size={24} color="#1792FE" />
                    <Text style={styles.sectionTitle}>Criar Nova Equipa</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        <FontAwesome name="tag" size={16} color="#1792FE" /> Nome da Equipa
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={nomeEquipa}
                        onChangeText={setNomeEquipa}
                        placeholder="Insere o nome da equipa"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        <FontAwesome name="building" size={16} color="#1792FE" /> Obra
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={obraSelecionada}
                            onValueChange={(itemValue) => setObraSelecionada(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Seleciona uma obra" value="" />
                            {obras.map((obra) => (
                                <Picker.Item 
                                    key={obra.id} 
                                    label={`${obra.codigo} - ${obra.nome}`} 
                                    value={obra.id} 
                                />
                            ))}
                        </Picker>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <TouchableOpacity 
                        style={styles.membersHeader}
                        onPress={() => setMembersExpanded(!membersExpanded)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.label}>
                            <FontAwesome name="users" size={16} color="#1792FE" /> Membros da Equipa
                        </Text>
                        <View style={styles.membersCounter}>
                            <Text style={styles.selectedCount}>
                                {membrosSelecionados.length} de {utilizadores.length}
                            </Text>
                            <Animated.View style={{
                                transform: [{ rotate: membersExpanded ? '180deg' : '0deg' }]
                            }}>
                                <Ionicons name="chevron-down" size={20} color="#1792FE" />
                            </Animated.View>
                        </View>
                    </TouchableOpacity>
                    
                    {membersExpanded && (
                        <View style={styles.membersContainer}>
                            <ScrollView style={styles.membersScrollView} nestedScrollEnabled={true}>
                                {utilizadores.map((user) => (
                                    <TouchableOpacity
                                        key={`user-${user.id}`}
                                        style={[
                                            styles.memberItem,
                                            membrosSelecionados.includes(user.id) && styles.memberSelected
                                        ]}
                                        onPress={() => toggleMembro(user.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.memberContent}>
                                            <View style={[
                                                styles.checkbox,
                                                membrosSelecionados.includes(user.id) && styles.checkedBox
                                            ]}>
                                                {membrosSelecionados.includes(user.id) && (
                                                    <FontAwesome name="check" size={12} color="#FFFFFF" />
                                                )}
                                            </View>
                                            <FontAwesome name="user" size={16} color="#1792FE" style={styles.userIcon} />
                                            <Text style={styles.memberText}>{user.email}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                    
                    {!membersExpanded && membrosSelecionados.length > 0 && (
                        <View style={styles.selectedMembersPreview}>
                            <Text style={styles.previewTitle}>Membros selecionados:</Text>
                            <View style={styles.selectedMembersList}>
                                {membrosSelecionados.slice(0, 3).map((memberId) => {
                                    const user = utilizadores.find(u => u.id === memberId);
                                    return (
                                        <View key={`preview-${memberId}`} style={styles.selectedMemberTag}>
                                            <Text style={styles.selectedMemberTagText}>
                                                {user?.email?.split('@')[0] || 'Utilizador'}
                                            </Text>
                                        </View>
                                    );
                                })}
                                {membrosSelecionados.length > 3 && (
                                    <View style={styles.moreSelectedTag}>
                                        <Text style={styles.moreSelectedText}>
                                            +{membrosSelecionados.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                <TouchableOpacity 
                    style={styles.createButton} 
                    onPress={criarEquipa} 
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={loading ? ['#ccc', '#999'] : ['#1792FE', '#0B5ED7']}
                        style={styles.buttonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <FontAwesome name="plus" size={16} color="#FFFFFF" />
                        )}
                        <Text style={styles.buttonText}>
                            {loading ? 'A criar...' : 'Criar Equipa'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );

    const renderTeamsSection = () => (
        <View style={styles.teamsSection}>
            <View style={styles.sectionHeader}>
                <FontAwesome name="list" size={24} color="#1792FE" />
                <Text style={styles.sectionTitle}>Equipas Criadas</Text>
                <View style={styles.teamCount}>
                    <Text style={styles.teamCountText}>{equipasCriadas.length}</Text>
                </View>
            </View>

            {equipasCriadas.length === 0 ? (
                <View style={styles.emptyState}>
                    <FontAwesome name="users" size={64} color="#ccc" />
                    <Text style={styles.emptyTitle}>Nenhuma equipa criada</Text>
                    <Text style={styles.emptySubtitle}>
                        Cria a tua primeira equipa usando o formulário acima
                    </Text>
                </View>
            ) : (
                equipasCriadas.map((equipa, index) => {
                    const isExpanded = expandedTeams[equipa.nome];
                    return (
                        <View key={`equipa-${equipa.nome}-${index}`} style={styles.teamCard}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                                style={styles.teamGradient}
                            >
                                <TouchableOpacity
                                    onPress={() => toggleTeamExpansion(equipa.nome)}
                                    style={styles.teamHeader}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.teamHeaderLeft}>
                                        <View style={styles.teamIconContainer}>
                                            <FontAwesome name="users" size={20} color="#1792FE" />
                                        </View>
                                        <View style={styles.teamHeaderText}>
                                            <Text style={styles.teamTitle}>{equipa.nome}</Text>
                                            <Text style={styles.teamSubtitle}>
                                                {equipa.obra?.codigo} - {equipa.obra?.nome}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.teamHeaderRight}>
                                        <TouchableOpacity
                                            onPress={() => confirmarRemocaoEquipa(equipa.nome, equipa.obra?.id)}
                                            style={styles.deleteButton}
                                        >
                                            <FontAwesome name="trash" size={16} color="#dc3545" />
                                        </TouchableOpacity>
                                        <Animated.View style={{
                                            transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                                        }}>
                                            <Ionicons name="chevron-down" size={20} color="#1792FE" />
                                        </Animated.View>
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.teamContent}>
                                        <View style={styles.teamDetail}>
                                            <FontAwesome name="user-circle" size={16} color="#28a745" />
                                            <Text style={styles.teamDetailLabel}>Encarregado:</Text>
                                            <Text style={styles.teamDetailValue}>
                                                {equipa.encarregado?.nome || 'Não definido'}
                                            </Text>
                                        </View>

                                        <View style={styles.membersSection}>
                                            <Text style={styles.membersTitle}>
                                                <FontAwesome name="users" size={16} color="#1792FE" /> 
                                                {' '}Membros ({equipa.membros?.length || 0})
                                            </Text>
                                            {equipa.membros?.map((membro, memberIndex) => (
                                                <View key={`member-${membro.id}-${memberIndex}`} style={styles.memberRow}>
                                                    <FontAwesome name="user" size={14} color="#666" />
                                                    <Text style={styles.memberName}>
                                                        {membro.nome || membro.email}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </LinearGradient>
                        </View>
                    );
                })
            )}
        </View>
    );

    return (
        <LinearGradient
            colors={['#e3f2fd', '#bbdefb', '#90caf9']}
            style={styles.container}
        >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {renderHeader()}
                {renderFormSection()}
                {renderTeamsSection()}
            </ScrollView>

            <Modal
                visible={modalEditar}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalEditar(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={['#1792FE', '#0B5ED7']}
                            style={styles.modalHeader}
                        >
                            <Text style={styles.modalTitle}>Editar Nome da Equipa</Text>
                        </LinearGradient>
                        
                        <View style={styles.modalBody}>
                            <TextInput
                                value={novoNomeEquipa}
                                onChangeText={setNovoNomeEquipa}
                                style={styles.modalInput}
                                placeholder="Novo nome da equipa"
                                placeholderTextColor="#999"
                            />
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    onPress={() => setModalEditar(false)} 
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    onPress={() => {
                                        // editarNomeEquipa(); // Função a implementar
                                        setModalEditar(false);
                                    }}
                                    style={styles.saveButton}
                                >
                                    <LinearGradient
                                        colors={['#28a745', '#20c997']}
                                        style={styles.saveButtonGradient}
                                    >
                                        <Text style={styles.saveButtonText}>Guardar</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={modalConfirmDelete}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalConfirmDelete(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <LinearGradient
                            colors={['#dc3545', '#c82333']}
                            style={styles.modalHeader}
                        >
                            <FontAwesome name="exclamation-triangle" size={24} color="#FFFFFF" />
                            <Text style={[styles.modalTitle, { marginLeft: 10 }]}>Confirmar Eliminação</Text>
                        </LinearGradient>
                        
                        <View style={styles.modalBody}>
                            <Text style={styles.confirmText}>
                                Tens a certeza que queres remover a equipa{' '}
                                <Text style={styles.teamNameText}>"{equipaParaRemover?.nome}"</Text>?
                            </Text>
                            <Text style={styles.warningText}>
                                Esta ação não pode ser desfeita.
                            </Text>
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setModalConfirmDelete(false);
                                        setEquipaParaRemover(null);
                                    }} 
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    onPress={removerEquipaInteira}
                                    style={styles.deleteConfirmButton}
                                >
                                    <LinearGradient
                                        colors={['#dc3545', '#c82333']}
                                        style={styles.saveButtonGradient}
                                    >
                                        <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Eliminar</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    headerContainer: {
        marginBottom: 20,
    },
    headerGradient: {
        borderRadius: 20,
        marginHorizontal: 20,
        marginTop: 20,
    },
    headerContent: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    headerIcon: {
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 0.9,
    },
    formSection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    formGradient: {
        borderRadius: 20,
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    membersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        marginBottom: 10,
    },
    membersCounter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedCount: {
        fontSize: 14,
        color: '#1792FE',
        fontWeight: '600',
        marginRight: 8,
    },
    membersContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        maxHeight: 200,
        marginBottom: 10,
    },
    membersScrollView: {
        maxHeight: 180,
    },
    selectedMembersPreview: {
        backgroundColor: 'rgba(23, 146, 254, 0.05)',
        borderRadius: 12,
        padding: 12,
        marginTop: 5,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    selectedMembersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    selectedMemberTag: {
        backgroundColor: '#1792FE',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    selectedMemberTagText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    moreSelectedTag: {
        backgroundColor: '#666',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    moreSelectedText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    memberItem: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberSelected: {
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
    },
    memberContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#1792FE',
        borderRadius: 4,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedBox: {
        backgroundColor: '#1792FE',
    },
    userIcon: {
        marginRight: 10,
    },
    memberText: {
        fontSize: 16,
        color: '#333',
    },
    createButton: {
        marginTop: 10,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    teamsSection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    teamCount: {
        backgroundColor: '#1792FE',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 4,
        minWidth: 30,
        alignItems: 'center',
    },
    teamCountText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 15,
        marginBottom: 5,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    teamCard: {
        marginBottom: 15,
    },
    teamGradient: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    teamHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    teamHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    teamIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    teamHeaderText: {
        flex: 1,
    },
    teamTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    teamSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    teamHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        padding: 8,
        marginRight: 8,
    },
    teamContent: {
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    teamDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingTop: 10,
    },
    teamDetailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
        marginRight: 8,
    },
    teamDetailValue: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    membersSection: {
        marginTop: 10,
    },
    membersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 4,
    },
    memberName: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
    },
    modalHeader: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    modalBody: {
        padding: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
    saveButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    saveButtonGradient: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 22,
    },
    teamNameText: {
        fontWeight: 'bold',
        color: '#1792FE',
    },
    warningText: {
        fontSize: 14,
        color: '#dc3545',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 20,
    },
    deleteConfirmButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
});

export default CriarEquipa;