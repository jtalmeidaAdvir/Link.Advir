import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    ActivityIndicator,
    Animated,
    Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { secureStorage } from '../../utils/secureStorage';

const GestaoPOS = () => {
    const [posList, setPosList] = useState([]);
    const [obras, setObras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPOS, setEditingPOS] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fadeAnimation] = useState(new Animated.Value(0));
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        email: '',
        password: '',
        obra_predefinida_id: '',
        ativo: true
    });

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        fetchPOS();
        fetchObras();
    }, []);

    const fetchPOS = async () => {
        try {
            setLoading(true);
            const token = secureStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/pos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const empresaId = secureStorage.getItem('empresa_id');
                const posDaEmpresa = data.filter(pos => pos.empresa_id == empresaId);
                setPosList(posDaEmpresa);
            }
        } catch (error) {
            console.error('Erro ao carregar POS:', error);
            setErrorMessage('Erro ao carregar lista de terminais');
        } finally {
            setLoading(false);
        }
    };

    const fetchObras = async () => {
        try {
            const token = secureStorage.getItem('loginToken');
            const response = await fetch('https://backend.advir.pt/api/obra', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const empresaId = secureStorage.getItem('empresa_id');
                const obrasDaEmpresa = data.filter(o => o.empresa_id == empresaId);
                setObras(obrasDaEmpresa);
            }
        } catch (error) {
            console.error('Erro ao carregar obras:', error);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const url = editingPOS
                ? `https://backend.advir.pt/api/pos/${editingPOS.id}`
                : 'https://backend.advir.pt/api/pos';

            const method = editingPOS ? 'PUT' : 'POST';

            const body = {
                ...formData,
                empresa_id: empresaId
            };

            if (editingPOS && !formData.password) {
                delete body.password;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setSuccessMessage(editingPOS ? 'Terminal atualizado com sucesso!' : 'Terminal criado com sucesso!');
                setTimeout(() => {
                    setShowModal(false);
                    resetForm();
                    fetchPOS();
                    setSuccessMessage('');
                }, 1500);
            } else {
                const error = await response.json();
                setErrorMessage(error.message || 'Erro ao salvar Terminal');
            }
        } catch (error) {
            console.error('Erro ao salvar Terminal:', error);
            setErrorMessage('Erro ao salvar Terminal');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pos) => {
        setEditingPOS(pos);
        setFormData({
            nome: pos.nome,
            codigo: pos.codigo,
            email: pos.email,
            password: '',
            obra_predefinida_id: pos.obra_predefinida_id,
            ativo: pos.ativo
        });
        setShowModal(true);
    };

    const handleDelete = async (id, nome) => {
        if (!window.confirm(`Tem certeza que deseja eliminar o terminal "${nome}"?`)) return;

        try {
            const token = secureStorage.getItem('loginToken');
            const response = await fetch(`https://backend.advir.pt/api/pos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setSuccessMessage('Terminal eliminado com sucesso!');
                fetchPOS();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage('Erro ao eliminar terminal');
            }
        } catch (error) {
            console.error('Erro ao eliminar POS:', error);
            setErrorMessage('Erro ao eliminar terminal');
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            codigo: '',
            email: '',
            password: '',
            obra_predefinida_id: '',
            ativo: true
        });
        setEditingPOS(null);
        setErrorMessage('');
        setSuccessMessage('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const renderPOSItem = ({ item }) => (
        <View style={styles.posCard}>
            <View style={styles.posHeader}>
                <View style={styles.posIconContainer}>
                    <MaterialCommunityIcons
                        name="tablet-dashboard"
                        size={28}
                        color={item.ativo ? "#4481EB" : "#95a5a6"}
                    />
                </View>
                <View style={styles.posInfo}>
                    <Text style={styles.posNome}>{item.nome}</Text>
                    <View style={styles.posDetails}>
                        <MaterialCommunityIcons name="barcode" size={14} color="#7f8c8d" />
                        <Text style={styles.posCodigo}>{item.codigo}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, item.ativo ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                    <Text style={styles.statusBadgeText}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
                </View>
            </View>

            <View style={styles.posBody}>
                <View style={styles.posDetailRow}>
                    <MaterialCommunityIcons name="email-outline" size={16} color="#7f8c8d" />
                    <Text style={styles.posDetailText}>{item.email}</Text>
                </View>
                <View style={styles.posDetailRow}>
                    <MaterialCommunityIcons name="office-building" size={16} color="#7f8c8d" />
                    <Text style={styles.posDetailText}>{item.ObraPredefinida?.nome || 'Sem obra definida'}</Text>
                </View>
            </View>

            <View style={styles.posActions}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(item)}
                >
                    <MaterialCommunityIcons name="pencil" size={18} color="#4481EB" />
                    <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id, item.nome)}
                >
                    <MaterialCommunityIcons name="delete-outline" size={18} color="#ff6b6b" />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContentWrapper}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <MaterialCommunityIcons name="tablet-dashboard" size={48} color="#ffffff" />
                    <Text style={styles.headerTitle}>Gestão de Terminais</Text>
                    <Text style={styles.headerSubtitle}>Gerencie os terminais POS da empresa</Text>
                </View>
            </LinearGradient>

            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnimation,
                        transform: [{
                            translateY: fadeAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            }),
                        }],
                    },
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

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowModal(true)}
                >
                    <LinearGradient
                        colors={['#4481EB', '#04BEFE']}
                        style={styles.addButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <MaterialCommunityIcons name="plus-circle" size={22} color="#ffffff" />
                        <Text style={styles.addButtonText}>Novo Terminal</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>A carregar terminais...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={posList}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderPOSItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="tablet-dashboard" size={64} color="#d1dbed" />
                                <Text style={styles.emptyTitle}>Nenhum terminal encontrado</Text>
                                <Text style={styles.emptyText}>Adicione um novo terminal para começar</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            {/* Modal */}
            <Modal
                visible={showModal}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingPOS ? 'Editar Terminal' : 'Novo Terminal'}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal}>
                                <Ionicons name="close" size={28} color="#2c3e50" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Nome */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <MaterialCommunityIcons name="tablet" size={16} color="#2c3e50" />
                                    {' '}Nome do Terminal *
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="tablet" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ex: Terminal Obra 1"
                                        value={formData.nome}
                                        onChangeText={(text) => setFormData({...formData, nome: text})}
                                        placeholderTextColor="#95a5a6"
                                    />
                                </View>
                            </View>

                            {/* Código */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <MaterialCommunityIcons name="barcode" size={16} color="#2c3e50" />
                                    {' '}Código *
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="barcode" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ex: TERM001"
                                        value={formData.codigo}
                                        onChangeText={(text) => setFormData({...formData, codigo: text})}
                                        placeholderTextColor="#95a5a6"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <MaterialCommunityIcons name="email-outline" size={16} color="#2c3e50" />
                                    {' '}Email *
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="email" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="terminal@exemplo.com"
                                        value={formData.email}
                                        onChangeText={(text) => setFormData({...formData, email: text})}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor="#95a5a6"
                                    />
                                </View>
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <MaterialCommunityIcons name="lock-outline" size={16} color="#2c3e50" />
                                    {' '}Password {editingPOS && '(deixe vazio para manter)'}
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, { flex: 1 }]}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChangeText={(text) => setFormData({...formData, password: text})}
                                        secureTextEntry={!showPassword}
                                        placeholderTextColor="#95a5a6"
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color="#7f8c8d"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Obra Predefinida */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    <MaterialCommunityIcons name="office-building" size={16} color="#2c3e50" />
                                    {' '}Obra Predefinida *
                                </Text>
                                <View style={styles.pickerWrapper}>
                                    <MaterialCommunityIcons name="office-building" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <Picker
                                        selectedValue={formData.obra_predefinida_id}
                                        onValueChange={(value) => setFormData({...formData, obra_predefinida_id: value})}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Selecione uma obra" value="" />
                                        {obras.map(obra => (
                                            <Picker.Item key={obra.id} label={obra.nome} value={obra.id} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            {/* Status Ativo */}
                            <View style={styles.switchGroup}>
                                <View style={styles.switchLabelContainer}>
                                    <MaterialCommunityIcons name="power" size={20} color="#2c3e50" />
                                    <Text style={styles.switchLabel}>Terminal Ativo</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#dfe6e9", true: "#b2d7ff" }}
                                    thumbColor={formData.ativo ? "#4481EB" : "#bdc3c7"}
                                    ios_backgroundColor="#dfe6e9"
                                    onValueChange={(value) => setFormData({...formData, ativo: value})}
                                    value={formData.ativo}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={['#4481EB', '#04BEFE']}
                                    style={styles.saveButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Salvar</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    scrollContentWrapper: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        width: '100%',
        paddingTop: 50,
        paddingBottom: 50,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 12,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '500',
    },
    contentContainer: {
        marginTop: 30,
        paddingHorizontal: 16,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee',
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#ff6b6b',
    },
    errorText: {
        color: '#ff6b6b',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4edda',
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#28A745',
    },
    successText: {
        color: '#28A745',
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    addButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    addButtonGradient: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.5,
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
        color: '#7f8c8d',
        fontWeight: '500',
    },
    listContainer: {
        paddingBottom: 10,
    },
    posCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e8eef5',
    },
    posHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fafbfd',
        borderBottomWidth: 1,
        borderBottomColor: '#e8eef5',
    },
    posIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#e6f2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    posInfo: {
        flex: 1,
    },
    posNome: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    posDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    posCodigo: {
        fontSize: 13,
        color: '#7f8c8d',
        marginLeft: 6,
        fontFamily: 'monospace',
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusBadgeActive: {
        backgroundColor: '#d4edda',
    },
    statusBadgeInactive: {
        backgroundColor: '#f8d7da',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2c3e50',
    },
    posBody: {
        padding: 16,
    },
    posDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    posDetailText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 10,
        fontWeight: '500',
    },
    posActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e8eef5',
        padding: 12,
        gap: 10,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e6f2ff',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#4481EB',
    },
    editButtonText: {
        color: '#4481EB',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#ff6b6b',
    },
    deleteButtonText: {
        color: '#ff6b6b',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2c3e50',
        marginTop: 15,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        maxWidth: '80%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 62, 80, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1.5,
        borderBottomColor: '#e8eef5',
        backgroundColor: '#fafbfd',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2c3e50',
        letterSpacing: 0.3,
    },
    modalBody: {
        padding: 24,
        maxHeight: 500,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#d1dbed',
        borderRadius: 14,
        backgroundColor: '#f9fafc',
        paddingHorizontal: 14,
        paddingVertical: 4,
    },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#d1dbed',
        borderRadius: 14,
        backgroundColor: '#f9fafc',
        paddingLeft: 14,
        overflow: 'hidden',
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#2c3e50',
        paddingVertical: 12,
        fontWeight: '500',
    },
    picker: {
        flex: 1,
        height: 50,
        color: '#2c3e50',
    },
    eyeIcon: {
        padding: 8,
    },
    switchGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafc',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#d1dbed',
        marginBottom: 10,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2c3e50',
        marginLeft: 10,
        letterSpacing: 0.3,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 24,
        borderTopWidth: 1.5,
        borderTopColor: '#e8eef5',
        backgroundColor: '#fafbfd',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#ecf0f1',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#d1dbed',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#7f8c8d',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    saveButton: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#4481EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default GestaoPOS;
