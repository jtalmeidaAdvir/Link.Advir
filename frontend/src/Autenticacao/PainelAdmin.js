import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';

const PainelAdmin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [urlempresa, setUrlEmpresa] = useState('');
    const [linha, setLinha] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [token, setToken] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const criarEmpresa = async (loginToken) => {
        const payload = {
            username,
            password,
            urlempresa,
            empresa,
            linha
        };
    
        try {
            const response = await fetch('https://backend.advir.pt/api/empresas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'urlempresa': urlempresa,
                    'Authorization': `Bearer ${loginToken}`
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log('Empresa criada:', data);
                setShowModal(true);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao criar a empresa');
                console.error('Erro ao criar a empresa:', errorData);
            }
        } catch (error) {
            console.error('Erro de rede ao criar a empresa:', error);
            setErrorMessage('Erro de rede, tente novamente mais tarde.');
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const loginToken = localStorage.getItem('loginToken');
        if (!loginToken) {
            setErrorMessage('Utilizador não autenticado.');
            return;
        }

        // Guardar o urlempresa no localStorage antes de iniciar a criação da empresa
        localStorage.setItem('urlempresa', urlempresa);

        setLoading(true);

        try {
            const response = await fetch(`https://webapiprimavera.advir.pt/connect-database/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    company: empresa,
                    instance: 'DEFAULT',
                    line: linha,
                    forceRefresh: true,
                    urlempresa : urlempresa,
                }),
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Token de base de dados recebido:', data.token);
                
                localStorage.setItem('painelAdminToken', data.token);
                setToken(data.token);
            
                await criarEmpresa(loginToken);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || 'Erro ao obter o token de base de dados');
            }
            
        } catch (error) {
            console.error('Erro de rede ao obter o token de base de dados:', error);
            setErrorMessage('Erro de rede, tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        navigation.navigate('Home');
    };
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#d4e4ff', margin: '0', padding: '0' }}>
            <div style={{ maxWidth: '400px', width: '100%', padding: '20px', borderRadius: '15px' }}>
                <h1 style={{ textAlign: 'center', color: '#1792FE', fontWeight: '600', fontSize: '2rem', marginBottom: '50px' }}>
                    Conecte a Sua Empresa
                </h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{ borderRadius: '30px', padding: '10px 20px', width: '100%', marginBottom: '10px', fontSize: '1rem', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ borderRadius: '30px', padding: '10px 20px', width: '100%', fontSize: '1rem', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Nome da Empresa"
                            value={empresa}
                            onChange={(e) => setEmpresa(e.target.value)}
                            required
                            style={{ borderRadius: '30px', padding: '10px 20px', width: '100%', fontSize: '1rem', border: '1px solid #ccc', marginBottom: '10px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="URL da Empresa ex.:192.16.1.1:3000"
                            value={urlempresa}
                            onChange={(e) => setUrlEmpresa(e.target.value)}
                            required
                            style={{ borderRadius: '30px', padding: '10px 20px', width: '100%', fontSize: '1rem', border: '1px solid #ccc', marginBottom: '10px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <select
                            value={linha}
                            onChange={(e) => setLinha(e.target.value)}
                            required
                            style={{ borderRadius: '30px', padding: '10px 20px', width: '100%', fontSize: '1rem', border: '1px solid #ccc' }}
                        >
                            <option value="">Selecione a Linha</option>
                            <option value="Evolution">Evolution</option>
                            <option value="Professional">Professional</option>
                            <option value="Executive">Executive</option>
                        </select>
                    </div>

                    {errorMessage && (
                        <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
                            {errorMessage}
                        </div>
                    )}

                    <button type="submit" style={{ borderRadius: '10px', padding: '12px', fontSize: '1.1rem', backgroundColor: '#1792FE', color: 'white', width: '100%', border: 'none' }} disabled={loading}>
                        {loading ? 'Aguarde...' : 'Conectar'}
                    </button>
                </form>
                <Modal
                    visible={showModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                Empresa conectada com sucesso.
                            </Text>
                            <Button title="OK" onPress={handleCloseModal} />
                        </View>
                    </View>
                </Modal>
            </div>
        </div>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: {
        marginBottom: 20,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default PainelAdmin;
