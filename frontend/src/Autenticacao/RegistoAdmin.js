import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native'; // Importa o hook para navegação
import { Modal, View, Text, Button, StyleSheet } from 'react-native'; // Importar os componentes necessários

const RegistoAdmin = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [empresaAreacliente, setEmpresaAreacliente] = useState('');

    const [password, setPassword] = useState('');
    const [showModal, setShowModal] = useState(false); // Estado para controlar a exibição do modal
    const navigation = useNavigation(); // Hook para navegação

    const handleRegister = async (e) => {
        e.preventDefault();
        const newUser = {
            username,
            nome: "teste",
            email,
            password,
            isAdmin: true,
            empresa_areacliente: empresaAreacliente,
        };
    
        console.log(newUser); // Verifique os valores aqui
    
        try {
            const response = await fetch('https://backend.advir.pt/api/users/criarUtilizadorAdmin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser),
            });
    
            if (response.ok) {
                setShowModal(true);
            } else {
                console.error('Erro ao criar o utilizador');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
        }
    };
    

    const handleCloseModal = () => {
        setShowModal(false);
        navigation.navigate('Login');  // Redirecionar para a página de login
    };

    return (
        <div
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
            <div
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
                    Registo de Administrador
                </h1>
                <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Empresa ou Área de Cliente"
                            value={empresaAreacliente}
                            onChange={(e) => setEmpresaAreacliente(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '1.1rem',
                            backgroundColor: '#0022FF',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                        }}
                    >
                        Registar
                    </button>
                </form>

                {/* Modal para mostrar a mensagem */}
                <Modal
                    visible={showModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}  // Fecha o modal se o utilizador clicar fora
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                Email enviado para verificar a conta. Por favor, verifique a sua caixa de entrada.
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo semi-transparente
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

export default RegistoAdmin;
