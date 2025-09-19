
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';
import logo from '../../../../assets/img_logo.png';
import backgroundImage from '../../../../images/ImagemFundo.png';

const LoginPOS = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('https://backend.advir.pt/api/pos/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Guardar dados do POS no localStorage
                localStorage.setItem('loginToken', result.token);
                localStorage.setItem('isPOS', 'true');
                localStorage.setItem('posId', result.posId);
                localStorage.setItem('posNome', result.posNome);
                localStorage.setItem('posCodigo', result.posCodigo);
                localStorage.setItem('email', result.email);
                localStorage.setItem('empresa_id', result.empresa_id);
                localStorage.setItem('empresa_areacliente', result.empresa_areacliente);
                localStorage.setItem('obra_predefinida_id', result.obra_predefinida_id || '');
                localStorage.setItem('obra_predefinida_nome', result.obra_predefinida_nome || '');
                
                // Debug: verificar se os dados foram guardados
                console.log('Dados POS guardados:', {
                    loginToken: localStorage.getItem('loginToken'),
                    isPOS: localStorage.getItem('isPOS'),
                    empresa_id: localStorage.getItem('empresa_id'),
                    empresa_areacliente: localStorage.getItem('empresa_areacliente')
                });

                // Redirecionar para a página de registo facial
                window.location.href = '/registo-ponto-facial';
            } else {
                setErrorMessage(result.message || 'Erro no login do POS');
            }
        } catch (error) {
            console.error('Erro no login POS:', error);
            setErrorMessage('Erro na conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '15px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                width: '100%',
                maxWidth: '400px'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src={logo} alt="Logo" style={{ height: '80px' }} />
                    <h2 className="mt-3 text-primary">Login POS</h2>
                    <p className="text-muted">Sistema de Ponto de Venda</p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleLogin}>
                    {errorMessage && (
                        <div className="alert alert-danger" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <div className="mb-3">
                        <div className="input-group">
                            <span className="input-group-text">
                                <FaUser />
                            </span>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="Email do POS"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="input-group">
                            <span className="input-group-text">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(45deg, #1792FE, #0D7EFE)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '16px',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                A entrar...
                            </>
                        ) : (
                            <>
                                <FaSignInAlt className="me-2" />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-3">
                    <small className="text-muted">
                        Acesso restrito ao sistema POS
                    </small>
                </div>
            </div>
        </div>
    );
};

export default LoginPOS;
