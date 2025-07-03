import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';



const ADHome = () => {
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [empresaModulos, setEmpresaModulos] = useState([]);
    const [allModulos, setAllModulos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [confirmationVisible, setConfirmationVisible] = useState(false); // Estado para modal de confirmação
    const [selectedModulo, setSelectedModulo] = useState(null);
    const [isAdding, setIsAdding] = useState(true);
    const [maxUsers, setMaxUsers] = useState('');
    const [tempoIntervaloPadrao, setTempoIntervaloPadrao] = useState('');


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
        }
    };


    const fetchEmpresaInfo = async (empresaId) => {
    try {
        const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}`);
        const data = await response.json();
        setMaxUsers(data.maxUsers || '');
        setTempoIntervaloPadrao(data.tempoIntervaloPadrao?.toString() || '');
    } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
    }
};


    const fetchAllModulos = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/modulos/listar');
            const data = await response.json();
            setAllModulos(data.modulos);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    };

    const fetchEmpresaModulos = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}/modulos`);
            const data = await response.json();
            setEmpresaModulos(data.modulos);
        } catch (error) {
            console.error('Erro ao carregar módulos da empresa:', error);
        }
    };

    const fetchMaxUsers = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${empresaId}`);
            const data = await response.json();
            setMaxUsers(data.maxUsers || ''); // Definir o valor inicial do campo `maxUsers`
        } catch (error) {
            console.error('Erro ao carregar limite de utilizadores:', error);
        }
    };

    const handleEmpresaSelect = (empresa) => {
    setSelectedEmpresa(empresa);
    fetchEmpresaModulos(empresa.id);
    fetchEmpresaInfo(empresa.id); // <- aqui
    };

    const updateEmpresaInfo = async () => {
    try {
        const response = await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/updateEmpresaInfo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                maxUsers,
                tempoIntervaloPadrao: parseFloat(tempoIntervaloPadrao),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar dados da empresa.');
        }

        const data = await response.json();
        console.log(data.message);
        setConfirmationVisible(true);
    } catch (error) {
        console.error('Erro ao atualizar dados da empresa:', error);
    }
};



    const updateMaxUsers = async () => {
        console.log("ID da Empresa:", selectedEmpresa.id);
        console.log("Novo Limite de Utilizadores:", maxUsers);

        try {
            const response = await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/updateMaxUsers`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ maxUsers: maxUsers }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao atualizar o limite de utilizadores.');
            }

            const data = await response.json();
            console.log(data.message); // Mensagem de sucesso
            setConfirmationVisible(true); // Mostrar modal de confirmação após sucesso
        } catch (error) {
            console.error('Erro ao atualizar o limite de utilizadores:', error);
        }
    };

    const toggleModal = (modulo, isAdding) => {
        setIsAdding(isAdding);
        setSelectedModulo(modulo);
        setModalVisible(true);
    };

    const confirmAction = async () => {
        if (isAdding) {
            await addModuloToEmpresa(selectedModulo.id);
        } else {
            await removeModuloFromEmpresa(selectedModulo.id);
        }
        setModalVisible(false);
    };

    const addModuloToEmpresa = async (moduloId) => {
        try {
            await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/modulos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ moduloId }),
            });
            fetchEmpresaModulos(selectedEmpresa.id);
        } catch (error) {
            console.error('Erro ao associar módulo:', error);
        }
    };

    const removeModuloFromEmpresa = async (moduloId) => {
        try {
            await fetch(`https://backend.advir.pt/api/empresas/${selectedEmpresa.id}/modulos/${moduloId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            fetchEmpresaModulos(selectedEmpresa.id);
        } catch (error) {
            console.error('Erro ao remover módulo:', error);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Gestão de Módulos e Limite de Utilizadores por Empresa</Text>
            <View style={styles.selectorContainer}>
                <Text style={styles.subTitle}>Empresas</Text>
                {empresas.map((empresa) => (
                    <TouchableOpacity
                        key={empresa.id}
                        style={[
                            styles.empresaButton,
                            selectedEmpresa?.id === empresa.id && styles.selectedButton
                        ]}
                        onPress={() => handleEmpresaSelect(empresa)}
                    >
                        <Text style={styles.empresaText}>{empresa.empresa || "Empresa sem nome"}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {selectedEmpresa && (
                <View style={styles.detailContainer}>
                    <Text style={styles.subTitle}>Definir Limite de Utilizadores</Text>
                    <TextInput
                        placeholder="Número máximo de utilizadores"
                        keyboardType="numeric"
                        value={maxUsers.toString()}
                        onChangeText={setMaxUsers}
                        style={styles.input}
                    />
                    <TouchableOpacity style={styles.updateButton} onPress={updateMaxUsers}>
                        <Text style={styles.updateButtonText}>ATUALIZAR LIMITE</Text>
                    </TouchableOpacity>

                    <Text style={styles.subTitle}>Definir Intervalo Padrão (em horas)</Text>
                    <TextInput
                        placeholder="Definir intervalo padrão"
                        keyboardType="decimal-pad"
                        value={tempoIntervaloPadrao}
                        onChangeText={setTempoIntervaloPadrao}
                        style={styles.input}
                    />

                    <TouchableOpacity style={styles.updateButton} onPress={updateEmpresaInfo}>
                        <Text style={styles.updateButtonText}>ATUALIZAR DADOS</Text>
                    </TouchableOpacity>


                    <Text style={styles.subTitle}>Módulos Associados a {selectedEmpresa.empresa}</Text>
                    {empresaModulos.map((modulo) => (
                        <View key={modulo.id} style={styles.moduleContainer}>
                            <Text style={styles.moduleText}>{modulo.nome}</Text>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => toggleModal(modulo, false)}
                            >
                                <Text style={styles.buttonText}>REMOVER</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <Text style={styles.subTitle}>Adicionar Módulo</Text>
                    {allModulos
                        .filter((modulo) => !empresaModulos.some((em) => em.id === modulo.id))
                        .map((modulo) => (
                            <View key={modulo.id} style={styles.moduleContainer}>
                                <Text style={styles.moduleText}>{modulo.nome}</Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => toggleModal(modulo, true)}
                                >
                                    <Text style={styles.buttonText}>ADICIONAR</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                </View>
            )}

            {/* Modal para confirmar ação de adicionar/remover módulo */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>
                            {isAdding ? "Adicionar" : "Remover"} o módulo "{selectedModulo?.nome}"?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmAction}
                            >
                                <Text style={styles.buttonText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de confirmação de atualização de limite */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={confirmationVisible}
                onRequestClose={() => setConfirmationVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>Limite de utilizadores atualizado com sucesso!</Text>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.confirmButton]}
                            onPress={() => setConfirmationVisible(false)}
                        >
                            <Text style={styles.buttonText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1792FE',
        textAlign: 'center',
        marginBottom: 20,
    },
    selectorContainer: {
        marginBottom: 20,
    },
    subTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1792FE',
        marginBottom: 10,
    },
    empresaButton: {
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#1792FE',
        marginVertical: 5,
    },
    selectedButton: {
        backgroundColor: '#0022FA',
    },
    empresaText: {
        color: '#FFF',
        fontWeight: '600',
    },
    detailContainer: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        marginBottom: 20,
    },
    input: {
        borderColor: '#BDC3C7',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    updateButton: {
        backgroundColor: '#1792FE',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    updateButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    moduleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
    },
    moduleText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    addButton: {
        backgroundColor: '#2ECC71',
        borderRadius: 10,
        padding: 8,
    },
    removeButton: {
        backgroundColor: '#E74C3C',
        borderRadius: 10,
        padding: 8,
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
        borderRadius: 15,
        alignItems: 'center',
    },
    modalText: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: '#2C3E50',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    modalButton: {
        flex: 1,
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#BDC3C7',
    },
    confirmButton: {
        backgroundColor: '#3498DB',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});

export default ADHome;
