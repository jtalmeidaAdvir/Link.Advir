import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SelecaoEmpresa = ({ setEmpresa }) => {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false); // Novo estado para controlar o loading do botão
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                const loginToken = localStorage.getItem('loginToken');
                const response = await fetch('http://backend.advir.pt/api/users/empresas', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${loginToken}`,
                    },
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setEmpresas(data);
    
                    // Verificar se só há uma empresa
                    if (data.length === 1) {
                        setEmpresaSelecionada(data[0].empresa); // Define a empresa no estado
                        await handleEntrarEmpresa(data[0].empresa); // Passa a empresa explicitamente
                    }
                } else {
                    setErrorMessage('Erro ao obter as empresas.');
                }
            } catch (error) {
                console.error('Erro de rede:', error);
                setErrorMessage('Erro de rede, tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };
    
        fetchEmpresas();
    }, []);
    
    const handleEntrarEmpresa = async (empresaForcada) => {
        const empresa = empresaForcada || empresaSelecionada; // Usa o valor forçado ou selecionado
    
        if (!empresa) {
            setErrorMessage('Por favor, selecione uma empresa.');
            return;
        }
    
        console.log("Empresa enviada para a API:", empresa); // Para debug
    
        setLoadingButton(true);
    
        try {
            const loginToken = localStorage.getItem('loginToken');
    
            const credenciaisResponse = await fetch(`http://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresa)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${loginToken}`,
                },
            });
    
            if (credenciaisResponse.ok) {
                const credenciais = await credenciaisResponse.json();
    
                localStorage.setItem('urlempresa', credenciais.urlempresa);
    
                const response = await fetch('https://webapiprimavera.advir.pt/connect-database/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${loginToken}`,
                    },
                    body: JSON.stringify({
                        username: credenciais.username,
                        password: credenciais.password,
                        company: credenciais.empresa,
                        line: credenciais.linha,
                        instance: "DEFAULT",
                        urlempresa: credenciais.urlempresa,
                        forceRefresh: true,
                    }),
                });
    
                if (response.ok) {
                    const data = await response.json();
    
                    localStorage.setItem('painelAdminToken', data.token);
                    console.log("Token atualizado e guardado:", data.token);
    
                    localStorage.setItem('empresaSelecionada', empresa);
                    setEmpresa(empresa);
    
                    navigation.navigate('Home');
                } else {
                    const errorData = await response.json();
                    setErrorMessage(errorData.message || 'Erro ao obter o token da empresa.');
                }
            } else {
                const errorData = await credenciaisResponse.json();
                setErrorMessage(errorData.message || 'Empresa não encontrada.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de rede, tente novamente mais tarde.');
        } finally {
            setLoadingButton(false);
        }
    };
    
    
    
    

    return (
        <View
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                backgroundColor: '#d4e4ff',
                margin: '0',
                padding: '0',
            }}
        >
            <View
                style={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '20px',
                    borderRadius: '15px',
                }}
            >
                <h1
                    style={{
                        textAlign: 'center',
                        color: '#0022FF',
                        fontWeight: '600',
                        fontSize: '2rem',
                        marginBottom: '50px',
                    }}
                >
                    Selecione a Empresa
                </h1>

                {loading ? (
                    <View style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <ActivityIndicator size="large" color="#0022FF" />
                    </View>
                ) : (
                    <>
                        <View style={{ marginBottom: '20px' }}>
                        <select
                            value={empresaSelecionada}
                            onChange={(e) => {
                                const valorSelecionado = e.target.value.trim(); // Remove espaços desnecessários
                                console.log("Empresa selecionada:", valorSelecionado); // Para debug
                                setEmpresaSelecionada(valorSelecionado); // Atualiza o estado
                            }}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        >
                            <option value="">Selecione a Empresa</option>
                            {empresas.map((empresa, index) => (
                                <option key={index} value={empresa.empresa}>
                                    {empresa.empresa}
                                </option>
                            ))}
                        </select>

                        </View>

                       

                        {errorMessage && (
                            <View style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
                                {errorMessage}
                            </View>
                        )}

                        <button
                            onClick={() => handleEntrarEmpresa()} // Garante que não estás a passar o evento
                            style={{
                                borderRadius: '10px',
                                padding: '12px',
                                fontSize: '1.1rem',
                                backgroundColor: '#0022FF',
                                color: 'white',
                                width: '100%',
                                border: 'none',
                                alignContent: 'center',
                            }}
                            disabled={loadingButton} // Desabilita o botão enquanto carrega
                        >
                            {loadingButton ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                'Entrar na Empresa'
                            )}
                        </button>

                    </>
                )}
            </View>
        </View>
    );
};

export default SelecaoEmpresa;
