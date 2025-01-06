import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, TouchableOpacity, FlatList, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faTrash, faArrowLeft, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const Intervencoes = (props) => {
    const navigation = useNavigation();
    const [searchTerm, setSearchTerm] = useState('');
    const [intervencoes, setIntervencoes] = useState([]);
    const [expandedIntervencao, setExpandedIntervencao] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedIntervencao, setSelectedIntervencao] = useState(null);
    const { t } = useTranslation();
    const token = localStorage.getItem('painelAdminToken');  // Usando localStorage para obter o token
    const empresaSelecionada = localStorage.getItem('empresaSelecionada'); // Recuperando empresa
    const urlempresa = localStorage.getItem('urlempresa'); // Recuperando urlempresa



    useFocusEffect(
        React.useCallback(() => {
            const fetchIntervencoes = async () => {
                const token = localStorage.getItem('painelAdminToken');
                const id = localStorage.getItem('intervencaoId');

                if (id && token) {
                    try {
                        const response = await fetch(`https://webapiprimavera.advir.pt/listarIntervencoes/${id}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'urlempresa': urlempresa,
                            },
                        });
                        
                        if (!response.ok) {
                            throw new Error(`Server error: ${response.status} ${response.statusText}`);
                        }

                        const data = await response.json();
                        console.log('Response data:', data); // Adiciona o log para verificar a resposta completa

                        if (data?.DataSet?.Table) {
                            setIntervencoes(data.DataSet.Table);
                        } else {
                            console.warn('Estrutura de dados inesperada:', data);
                            Alert.alert('Erro', 'A resposta da API não contém os dados esperados.');
                        }
                    } catch (error) {
                        console.error('Error fetching intervenções:', error);
                    }
                }
            };

            fetchIntervencoes();
        }, [])
    );
    const toggleExpand = (intervencaoId) => {
        setExpandedIntervencao(expandedIntervencao === intervencaoId ? null : intervencaoId);
    };

    const handleDelete = (intervencao) => {
        setSelectedIntervencao(intervencao);
        setModalVisible(true);
    };

    const confirmDelete = async () => {
        if (selectedIntervencao) {
            try {
                const token = localStorage.getItem('painelAdminToken');
                if (!token) throw new Error('Token não encontrado.');

                const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/EliminarIntervencao/${selectedIntervencao.ID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'urlempresa': urlempresa,
                    },
                });

                if (!response.ok) throw new Error('Network response was not ok');

                Alert.alert('Sucesso', 'Intervenção deletada com sucesso!', [{ text: 'OK' }]);
                setIntervencoes(prevIntervencoes =>
                    prevIntervencoes.filter(intervencao => intervencao.ID !== selectedIntervencao.ID)
                );

            } catch (error) {
                console.error('Erro ao deletar intervenção:', error);
            } finally {
                setModalVisible(false);
                setSelectedIntervencao(null);
            }
        }
    };

    const renderIntervencao = ({ item }) => {
        const isExpanded = expandedIntervencao === item.ID;
        return (
            <TouchableOpacity style={styles.listItem} onPress={() => toggleExpand(item.ID)}>
                <View style={styles.itemHeader}>
                    <Text style={styles.listText}>{t("Intervencoes.Intervencao.Title")} {item.Interv}</Text>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity onPress={() => { /* Implementar impressão */ }}>
                            <FontAwesomeIcon icon={faPrint} style={styles.icon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)}>
                            <FontAwesomeIcon icon={faTrash} style={styles.iconDelete} />
                        </TouchableOpacity>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} style={styles.chevronIcon} />
                    </View>
                </View>
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <Text>{t("Intervencoes.Intervencao.TxtInicio")} {new Date(item.DataHoraInicio).toLocaleDateString()} - {new Date(item.DataHoraInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text>{t("Intervencoes.Intervencao.TxtFim")} {new Date(item.DataHoraFim).toLocaleDateString()} - {new Date(item.DataHoraFim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text>{t("Intervencoes.Intervencao.TxtDuracao")} {item.Duracao} min</Text>
                        <Text>{t("Intervencoes.Intervencao.TxtTipo")} {item.TipoInterv}</Text>
                        <Text>{t("Intervencoes.Intervencao.TxtTecnico")} {item.Nome}</Text>
                        <Text>{t("Intervencoes.Intervencao.TxtDescricao")} {item.DescricaoResp}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => props.navigation.navigate('PedidosAssistencia')} style={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} style={{ color: '#0022FF', marginRight: 5 }} />
                    <Text style={{ color: '#0022FF' }}>{t("Intervencoes.BtVoltar")}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.title}>{t("Intervencoes.Title")}</Text>
            <View style={styles.searchContainer}>
                <TextInput
                    placeholder={t("Intervencoes.Procurar")}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    style={styles.searchInput}
                />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('RegistoIntervencao')}
                >
                    <Text style={styles.addButtonText}>{t("Intervencoes.BtCriarIntervencao")}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={intervencoes.filter((item) =>
                    item.DescricaoResp.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                keyExtractor={(item) => item.ID.toString()}
                renderItem={renderIntervencao}
                ListEmptyComponent={<Text style={styles.emptyText}>{t("Intervencoes.Aviso.1")}</Text>}
            />
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>{t("Intervencoes.Aviso.2")}</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.button}>
                                <Text style={styles.buttonText}>{t("Intervencoes.BtCancelar")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDelete} style={styles.button}>
                                <Text style={styles.buttonText}>{t("Intervencoes.BtEliminar")}</Text>
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
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
        borderRadius: 30,
        borderColor: '#0022FF',
        borderWidth: 1,
    },
    title: {
        fontSize: 24,
        color: '#0022FF',
        fontWeight: '600',
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        padding: 10,
        borderColor: '#0022FF',
        borderWidth: 1,
        borderRadius: 30,
        marginRight: 10,
    },
    listItem: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: 'white',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listText: {
        fontSize: 16,
        color: '#333',
    },
    expandedContent: {
        marginTop: 10,
    },
    chevronIcon: {
        color: '#0022FF',
        marginLeft: 10,
    },
    icon: {
        color: '#0022FF',
        marginLeft: 10,
    },
    iconDelete: {
        color: '#FF0000',
        marginLeft: 10,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        alignItems: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 20,
    },
    button: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#0022FF',
        marginHorizontal: 5,
    },
    addButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonText: {
        color: 'white',
    },
});

export default Intervencoes;
