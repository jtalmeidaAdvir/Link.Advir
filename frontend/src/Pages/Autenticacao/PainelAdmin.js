import React, { useState, useEffect } from "react";
import {
    FaUsers,
    FaUserShield,
    FaCog,
    FaChartLine,
    FaFileAlt,
} from "react-icons/fa";
import { FaComputer } from "react-icons/fa6";
import { secureStorage } from '../../utils/secureStorage';
const PainelAdmin = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [urlempresa, setUrlEmpresa] = useState("");
    const [linha, setLinha] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [token, setToken] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const criarEmpresa = async (loginToken) => {
        const payload = {
            username,
            password,
            urlempresa,
            empresa,
            linha,
        };

        try {
            const response = await fetch(
                "https://backend.advir.pt/api/empresas",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                        Authorization: `Bearer ${loginToken}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Empresa criada:", data);
                setShowModal(true);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.message || "Erro ao criar a empresa");
                console.error("Erro ao criar a empresa:", errorData);
            }
        } catch (error) {
            console.error("Erro de rede ao criar a empresa:", error);
            setErrorMessage("Erro de rede, tente novamente mais tarde.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const loginToken = secureStorage.getItem("loginToken");
        if (!loginToken) {
            setErrorMessage("Utilizador não autenticado.");
            return;
        }

        // Guardar o urlempresa no secureStorage antes de iniciar a criação da empresa
        secureStorage.setItem("urlempresa", urlempresa);

        setLoading(true);

        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/connect-database/token`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        company: empresa,
                        instance: "DEFAULT",
                        line: linha,
                        forceRefresh: true,
                        urlempresa: urlempresa,
                    }),
                },
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Token de base de dados recebido:", data.token);

                secureStorage.setItem("painelAdminToken", data.token);
                setToken(data.token);

                await criarEmpresa(loginToken);
            } else {
                const errorData = await response.json();
                setErrorMessage(
                    errorData.message ||
                        "Erro ao obter o token de base de dados",
                );
            }
        } catch (error) {
            console.error(
                "Erro de rede ao obter o token de base de dados:",
                error,
            );
            setErrorMessage("Erro de rede, tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        // Assuming navigation is available via react-router-dom for SPA navigation
        // If this is a React Native app, you would use navigation from react-navigation
        // For this example, we'll assume a web context and use Link or navigate programmatically
        // If this component is rendered within a React Router context:
        // history.push('/some-page');
        // Or if using useNavigate hook:
        // navigate('/some-page');
        // For simplicity, we'll just close the modal and assume navigation is handled elsewhere or implicitly.
    };
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                width: "100vw",
                backgroundColor: "#d4e4ff",
                margin: "0",
                padding: "0",
            }}
        >
            <div
                style={{
                    maxWidth: "400px",
                    width: "100%",
                    padding: "20px",
                    borderRadius: "15px",
                }}
            >
                <h1
                    style={{
                        textAlign: "center",
                        color: "#1792FE",
                        fontWeight: "600",
                        fontSize: "2rem",
                        marginBottom: "50px",
                    }}
                >
                    Conecte a Sua Empresa
                </h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "20px" }}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                borderRadius: "30px",
                                padding: "10px 20px",
                                width: "100%",
                                marginBottom: "10px",
                                fontSize: "1rem",
                                border: "1px solid #ccc",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: "30px",
                                padding: "10px 20px",
                                width: "100%",
                                fontSize: "1rem",
                                border: "1px solid #ccc",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <input
                            type="text"
                            placeholder="Nome da Empresa"
                            value={empresa}
                            onChange={(e) => setEmpresa(e.target.value)}
                            required
                            style={{
                                borderRadius: "30px",
                                padding: "10px 20px",
                                width: "100%",
                                fontSize: "1rem",
                                border: "1px solid #ccc",
                                marginBottom: "10px",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <input
                            type="text"
                            placeholder="URL da Empresa ex.:192.16.1.1:3000"
                            value={urlempresa}
                            onChange={(e) => setUrlEmpresa(e.target.value)}
                            required
                            style={{
                                borderRadius: "30px",
                                padding: "10px 20px",
                                width: "100%",
                                fontSize: "1rem",
                                border: "1px solid #ccc",
                                marginBottom: "10px",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <select
                            value={linha}
                            onChange={(e) => setLinha(e.target.value)}
                            required
                            style={{
                                borderRadius: "30px",
                                padding: "10px 20px",
                                width: "100%",
                                fontSize: "1rem",
                                border: "1px solid #ccc",
                            }}
                        >
                            <option value="">Selecione a Linha</option>
                            <option value="Evolution">Evolution</option>
                            <option value="Professional">Professional</option>
                            <option value="Executive">Executive</option>
                        </select>
                    </div>

                    {errorMessage && (
                        <div
                            style={{
                                color: "red",
                                marginBottom: "20px",
                                textAlign: "center",
                            }}
                        >
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            borderRadius: "10px",
                            padding: "12px",
                            fontSize: "1.1rem",
                            backgroundColor: "#1792FE",
                            color: "white",
                            width: "100%",
                            border: "none",
                        }}
                        disabled={loading}
                    >
                        {loading ? "Aguarde..." : "Conectar"}
                    </button>
                </form>
                {showModal && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "10px",
                                textAlign: "center",
                                maxWidth: "400px",
                            }}
                        >
                            <p
                                style={{
                                    marginBottom: "1.5rem",
                                    fontSize: "16px",
                                }}
                            >
                                Empresa conectada com sucesso.
                            </p>
                            <button
                                onClick={handleCloseModal}
                                style={{
                                    backgroundColor: "#1792FE",
                                    color: "white",
                                    border: "none",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}
            </div>

            
        </div>
    );
};

export default PainelAdmin;
