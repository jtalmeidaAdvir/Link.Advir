import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddPartesDiarias = (route,navigation) => {
    const [rows, setRows] = useState([
        { id: '1', data: '', recurso: '', horasReais: '', precoUnitario: '', total: '', especialidade: '' },
    ]);

    const handleRowChange = (id, field, value) => {
        const updatedRows = rows.map((row) =>
            row.id === id
                ? {
                      ...row,
                      [field]: value,
                      total:
                          field === 'horasReais' || field === 'precoUnitario'
                              ? (parseFloat(row.horasReais || 0) * parseFloat(value || 0)).toFixed(2)
                              : row.total,
                  }
                : row
        );
        setRows(updatedRows);
    };

    const addRow = () => {
        setRows([
            ...rows,
            { id: Math.random().toString(), data: '', recurso: '', horasReais: '', precoUnitario: '', total: '', especialidade: '' },
        ]);
    };

    const removeRow = (id) => {
        setRows(rows.filter((row) => row.id !== id));
    };


 
    

   const handleSubmit = async () => {
    const payload = rows.map(row => ({
        ID: NewGuid(), // Deve ser gerado dinamicamente com `Guid.NewGuid()` ou equivalente
        Numero: "26", // Número do documento
        ObraID: "8E41E79E-0378-419F-9602-2D846BC1FCE3", // ID da obra
        Data: "2025-01-12 12:00:00.000", // Data do documento
        Encarregado: "", // Encarregado, pode ser vazio
        Notas: "JVALE", // Notas, com valor padrão
        CabecMovCBLID: "", // Cabeçalho do movimento CBL, pode ser vazio
        LigaCBL: 0, // Liga CBL, valor padrão 0
        CriadoPor: "jvale", // Criado por
        Utilizador: "jvale", // Utilizador
        DataUltimaActualizacao: "2025-01-12 12:00:00.000", // Data da última atualização (ISO format)
        DocumentoID:  "", // ID do documento, pode ser vazio
        TipoEntidade: "O", // Tipo de entidade, valor padrão "P"
        SubEmpreiteiroID:  "1", // ID do subempreiteiro
        ColaboradorID: "", // ID do colaborador, pode ser nulo
        Validado: 0, // Status de validação, 0 para não validado
    
        // Campos para COP_FichasPessoalItems
        FichasPessoalID: ID, // ID da ficha de pessoal
        ComponenteID: "1", // ID do componente
        Funcionario: "", // Nome do funcionário, pode ser vazio
        ClasseID: "", // ID da classe
        Fornecedor: "", // Nome do fornecedor, pode ser vazio
        SubEmpID: "", // ID do subempreiteiro
        NumHoras: "", // Número de horas
        PrecoUnit: "", // Preço unitário
        SEPessoalID: "", // ID do SE pessoal, pode ser vazio
        ManhaInicio: null, // Início da manhã, pode ser nulo
        ManhaFim:  null, // Fim da manhã, pode ser nulo
        TardeInicio: null, // Início da tarde, pode ser nulo
        TardeFim:  null, // Fim da tarde, pode ser nulo
        TotalHoras:  0, // Total de horas
        Integrado:  0, // Status de integração
        TipoHoraID:  null, // ID do tipo de hora, pode ser nulo
        FuncaoID:  null, // ID da função, pode ser nulo
        ItemId:  null, // ID do item, pode ser nulo
    }));
    

    try {
        const token = await AsyncStorage.getItem('painelAdminToken');
        const urlempresa = await AsyncStorage.getItem('urlempresa');

        if (!token || !urlempresa) {
            console.error('Token ou URL da empresa não fornecidos.');
            return;
        }

        const response = await fetch(`https://webapiprimavera.advir.pt/detalhesObra/InsertPartesDiarias`, {  
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'urlempresa': urlempresa,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Parte diária submetida com sucesso:', data);
            alert('Submissão realizada com sucesso!');
        } else {
            const errorData = await response.json();
            console.error('Erro na requisição:', errorData);
            alert(`Erro ao submeter: ${errorData.error || 'Erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro ao submeter parte diária:', error);
        alert('Erro inesperado ao submeter. Tente novamente.');
    }
};

    

    const renderItem = ({ item }) => (
        <View style={styles.rowContainer}>
            <TextInput
                style={styles.input}
                placeholder="Data"
                value={item.data}
                onChangeText={(value) => handleRowChange(item.id, 'data', value)}
            />
            <TextInput
                style={styles.input}
                placeholder="Recurso"
                value={item.recurso}
                onChangeText={(value) => handleRowChange(item.id, 'recurso', value)}
            />
            <TextInput
                style={styles.input}
                placeholder="Horas Reais"
                keyboardType="numeric"
                value={item.horasReais}
                onChangeText={(value) => handleRowChange(item.id, 'horasReais', value)}
            />
            <TextInput
                style={styles.input}
                placeholder="Preço Unitário (€)"
                keyboardType="numeric"
                value={item.precoUnitario}
                onChangeText={(value) => handleRowChange(item.id, 'precoUnitario', value)}
            />
            <TextInput
                style={[styles.input, styles.readOnlyInput]}
                placeholder="Total (€)"
                value={item.total}
                editable={false}
            />
            <TextInput
                style={styles.input}
                placeholder="Especialidade"
                value={item.especialidade}
                onChangeText={(value) => handleRowChange(item.id, 'especialidade', value)}
            />
            <TouchableOpacity onPress={() => removeRow(item.id)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remover</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Partes Diárias</Text>
            <FlatList
                data={rows}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
            />
            <TouchableOpacity onPress={addRow} style={styles.addButton}>
                <Text style={styles.addButtonText}>Adicionar Linha</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Submeter</Text>
            </TouchableOpacity>
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
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    rowContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 10,
        elevation: 3,
    },
    input: {
        flex: 1,
        margin: 5,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    readOnlyInput: {
        backgroundColor: '#f0f0f0',
    },
    addButton: {
        backgroundColor: '#007BFF',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    removeButton: {
        backgroundColor: '#FF4C4C',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
    },
    removeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    list: {
        marginBottom: 20,
    },
});

export default AddPartesDiarias;
