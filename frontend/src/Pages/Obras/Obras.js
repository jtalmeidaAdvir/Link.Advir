import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCode, faClipboard, faCalendar, faInfoCircle,faMoneyBillAlt } from '@fortawesome/free-solid-svg-icons';
import { Image } from 'react-native';

const ListarObras = ({ navigation }) => {
    const [obras, setObras] = useState([]);
    const [filteredObras, setFilteredObras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [obrasImportadas, setObrasImportadas] = useState([]);


    useEffect(() => {
        

        fetchObras();
    }, []);

const fetchObras = async () => {
            try {
                const token = await AsyncStorage.getItem('painelAdminToken');
                const urlempresa = await AsyncStorage.getItem('urlempresa');
        
                if (!token || !urlempresa) {
                    setErrorMessage('Token ou URL da empresa não encontrados.');
                    setLoading(false);
                    return;
                }
        
                const response = await fetch(`https://webapiprimavera.advir.pt/listarObras/listarObras`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                });
        
                if (!response.ok) {
                    throw new Error(`Erro: ${response.statusText}`);
                }
        
                const data = await response.json();
        
                // Certifique-se de acessar a tabela correta na resposta
                if (data.DataSet && data.DataSet.Table) {
                    setObras(data.DataSet.Table);
                    setFilteredObras(data.DataSet.Table); // Inicializa o filtro com todas as obras
                } else {
                    setErrorMessage('Estrutura da resposta inválida.');
                }
            } catch (error) {
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };


        const importarObra = async (obra) => {
  try {
    const token = localStorage.getItem('loginToken');
    const empresaId = await AsyncStorage.getItem('empresa_id'); // 👈 adicionar esta linha

    const response = await fetch('https://backend.advir.pt/api/obra', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo: obra.Codigo,
        nome: obra.Titulo,
        estado: 'Ativo',
        localizacao: obra.Localizacao || 'Desconhecida',
        empresa_id: empresaId, // 👈 incluir aqui
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Obra importada com sucesso!');
      fetchObrasImportadas(); // Atualizar lista de obras importadas com o novo QR
    } else {
      alert(`Erro ao importar obra: ${data.message}`);
    }
  } catch (error) {
    console.error('Erro ao importar obra:', error);
    alert('Erro ao importar obra');
  }
};


const fetchObrasImportadas = async () => {
  try {
    const token = localStorage.getItem('loginToken');
    const response = await fetch('https://backend.advir.pt/api/obra', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      setObrasImportadas(data); // data é o array de obras com .codigo
    } else {
      console.warn('Erro ao carregar obras importadas');
    }
  } catch (error) {
    console.error('Erro ao buscar obras importadas:', error);
  }
};

useEffect(() => {
    fetchObras();
    fetchObrasImportadas();
}, []);





    const handleSearch = (text) => {
        setSearchTerm(text);

        if (text.trim() === '') {
            setFilteredObras(obras);
            return;
        }

        const filtered = obras.filter(
            (obra) =>
                obra.Codigo.toLowerCase().includes(text.toLowerCase()) ||
                obra.Titulo.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredObras(filtered);
    };

    const renderObra = ({ item }) => {
    const obraExistente = obrasImportadas.find(o => o.codigo === item.Codigo);

    return (
        <TouchableOpacity
            style={styles.obraContainer}
            onPress={() => navigation.navigate('DetalhesObra', { obraId: item.ID, obraCodigo: item.Codigo })}
        >
            <View style={styles.row}>
                <FontAwesomeIcon icon={faCode} style={styles.icon} />
                <Text style={styles.obraDetail}>Código: {item.Codigo}</Text>
            </View>
            <View style={styles.row}>
                <FontAwesomeIcon icon={faClipboard} style={styles.icon} />
                <Text style={styles.obraDetail}>Título: {item.Titulo}</Text>
            </View>
            <View style={styles.row}>
                <FontAwesomeIcon icon={faInfoCircle} style={styles.icon} />
                <Text style={styles.obraDetail}>Situação: {item.Situacao}</Text>
            </View>
            <View style={styles.row}>
                <FontAwesomeIcon icon={faMoneyBillAlt} style={styles.icon} />
                <Text style={styles.obraDetail}>Valor: {item.ValorAdjudicacao}</Text>
            </View>
            <View style={styles.row}>
                <FontAwesomeIcon icon={faCalendar} style={styles.icon} />
                <Text style={styles.obraDetail}>Data: {new Date(item.DataAdjudicacao).toLocaleDateString()}</Text>
            </View>

            {obraExistente ? (
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>QR Code:</Text>
                    <Image
                        source={{ uri: obraExistente.qrCode }}
                        style={{ width: 120, height: 120 }}
                        resizeMode="contain"
                    />
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.importButton}
                    onPress={() => importarObra(item)}
                >
                    <Text style={styles.importButtonText}>Importar Obra</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};


    return (
        
        <View style={styles.container}>
            <Text style={styles.title}>Obras</Text>
            <View>
            <TextInput
                style={styles.searchInput}
                placeholder="🔍 Procurar por código ou título"
                value={searchTerm}
                onChangeText={handleSearch}
            /></View>
            
            {loading ? (
                <ActivityIndicator size="large" color="#1792FE" style={styles.loadingIndicator} />
            ) : errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
                <FlatList
                    data={filteredObras}
                    renderItem={renderObra}
                    keyExtractor={(item) => item.ID}
                    ListEmptyComponent={
                        <Text style={styles.emptyMessage}>Nenhuma obra encontrada.</Text>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 24,
        color: '#1792FE',
        fontWeight: '600',
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    searchInput: {
        marginBottom: 20,
        flex: 1,
        padding: 10,
        borderColor: '#1792FE',
        borderWidth: 1,
        borderRadius: 30,
        marginRight: 10,
    },
    obraContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    icon: {
        color: '#1792FE',
        marginRight: 10,
    },
    obraDetail: {
        fontSize: 16,
        color: '#333',
    },
    loadingIndicator: {
        marginTop: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    emptyMessage: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
    importButton: {
    marginTop: 10,
    backgroundColor: '#1792FE',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
},
importButtonText: {
    color: 'white',
    fontWeight: 'bold',
},

});

export default ListarObras;
