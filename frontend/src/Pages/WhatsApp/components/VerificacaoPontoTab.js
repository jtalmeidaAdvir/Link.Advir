
import React, { useState, useEffect } from "react";
import { secureStorage } from '../../../utils/secureStorage';

const VerificacaoPontoTab = ({ styles, API_BASE_URL }) => {
    const [configuracoes, setConfiguracoes] = useState([]);
    const [contactLists, setContactLists] = useState([]);
    const [loading, setLoading] = useState(false);

    const [novaConfiguracao, setNovaConfiguracao] = useState({
        nome: "",
        lista_contactos_id: "",
        horario_verificacao: "18:00",
        mensagem_template: "⚠️ Olá! Notamos que ainda não registou o seu ponto de hoje. Por favor, regularize a situação o mais breve possível.",
        dias_semana: [1, 2, 3, 4, 5], // Segunda a Sexta
        ativo: true
    });

    useEffect(() => {
        carregarConfiguracoes();
        carregarListasContactos();
    }, []);

    const carregarConfiguracoes = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/verificacao-ponto/listar`);
            if (response.ok) {
                const data = await response.json();
                setConfiguracoes(data.configuracoes || []);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        }
    };

    const carregarListasContactos = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/contacts`);
            if (response.ok) {
                const data = await response.json();
                setContactLists(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Erro ao carregar listas de contactos:", error);
        }
    };

    const handleCriarConfiguracao = async (e) => {
        e.preventDefault();

        if (!novaConfiguracao.nome || !novaConfiguracao.lista_contactos_id) {
            alert("Nome e lista de contactos são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/verificacao-ponto/criar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`
                },
                body: JSON.stringify(novaConfiguracao)
            });

            if (response.ok) {
                alert("Configuração criada com sucesso!");
                setNovaConfiguracao({
                    nome: "",
                    lista_contactos_id: "",
                    horario_verificacao: "18:00",
                    mensagem_template: "⚠️ Olá! Notamos que ainda não registou o seu ponto de hoje. Por favor, regularize a situação o mais breve possível.",
                    dias_semana: [1, 2, 3, 4, 5],
                    ativo: true
                });
                carregarConfiguracoes();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.error || "Erro ao criar configuração"}`);
            }
        } catch (error) {
            console.error("Erro ao criar configuração:", error);
            alert("Erro ao criar configuração");
        } finally {
            setLoading(false);
        }
    };

    const toggleConfiguracao = async (id, ativo) => {
        try {
            const response = await fetch(`${API_BASE_URL}/verificacao-ponto/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ativo: !ativo })
            });

            if (response.ok) {
                carregarConfiguracoes();
            }
        } catch (error) {
            console.error("Erro ao alternar configuração:", error);
        }
    };

    const eliminarConfiguracao = async (id) => {
        if (!confirm("Tem certeza que deseja eliminar esta configuração?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/verificacao-ponto/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Configuração eliminada com sucesso!");
                carregarConfiguracoes();
            }
        } catch (error) {
            console.error("Erro ao eliminar configuração:", error);
            alert("Erro ao eliminar configuração");
        }
    };

    const executarVerificacao = async (id) => {
        if (!confirm("Deseja executar a verificação agora e enviar mensagens para quem não registou ponto?")) {
            return;
        }

        setLoading(true);
        const url = `${API_BASE_URL}/verificacao-ponto/${id}/executar`;
        console.log(`🔄 Executando verificação - URL: ${url}`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📡 Response status: ${response.status}`);
            
            const data = await response.json();
            console.log('📦 Response data:', data);
            
            if (response.ok) {
                alert(`Verificação executada!\n\nMensagens enviadas: ${data.mensagensEnviadas}\nSem registo: ${data.semRegisto}\nErros: ${data.erros}`);
            } else {
                alert(`Erro: ${data.error || "Erro ao executar verificação"}`);
            }
        } catch (error) {
            console.error("❌ Erro ao executar verificação:", error);
            alert(`Erro ao executar verificação: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.grid}>
            {/* Criar Configuração */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚠️ Nova Verificação de Ponto</h3>
                <form onSubmit={handleCriarConfiguracao}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nome da Configuração *</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={novaConfiguracao.nome}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                nome: e.target.value
                            })}
                            placeholder="Ex: Verificação Diária Equipa A"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lista de Contactos *</label>
                        <select
                            style={styles.select}
                            value={novaConfiguracao.lista_contactos_id}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                lista_contactos_id: e.target.value
                            })}
                            required
                        >
                            <option value="">Selecione uma lista...</option>
                            {contactLists.map((list) => (
                                <option key={list.id} value={list.id}>
                                    {list.name} ({list.contacts?.length || 0} contactos)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Horário de Verificação</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={novaConfiguracao.horario_verificacao}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                horario_verificacao: e.target.value
                            })}
                        />
                        <small style={{ color: '#666', fontSize: '0.85rem' }}>
                            Hora em que será verificado se os utilizadores registaram ponto
                        </small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mensagem a Enviar</label>
                        <textarea
                            style={styles.textarea}
                            value={novaConfiguracao.mensagem_template}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                mensagem_template: e.target.value
                            })}
                            rows="4"
                            placeholder="Digite a mensagem que será enviada..."
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Dias da Semana</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => (
                                <label
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        backgroundColor: novaConfiguracao.dias_semana.includes(index + 1) ? '#007bff' : '#f8f9fa',
                                        color: novaConfiguracao.dias_semana.includes(index + 1) ? '#fff' : '#495057',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        style={{ marginRight: '8px' }}
                                        checked={novaConfiguracao.dias_semana.includes(index + 1)}
                                        onChange={(e) => {
                                            const days = [...novaConfiguracao.dias_semana];
                                            if (e.target.checked) {
                                                days.push(index + 1);
                                            } else {
                                                const i = days.indexOf(index + 1);
                                                if (i > -1) days.splice(i, 1);
                                            }
                                            setNovaConfiguracao({
                                                ...novaConfiguracao,
                                                dias_semana: days
                                            });
                                        }}
                                    />
                                    {day}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: "100%",
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? "⏳ Criando..." : "✅ Criar Configuração"}
                    </button>
                </form>
            </div>

            {/* Lista de Configurações */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Verificações Ativas ({configuracoes.length})</h3>

                {configuracoes.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Nenhuma verificação configurada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                        {configuracoes.map((config) => (
                            <div key={config.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        {config.nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📋 Lista: {config.lista_nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        ⏰ Horário: {config.horario_verificacao}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📅 Dias: {config.dias_semana_texto}
                                    </div>
                                    <div style={styles.listMeta}>
                                        {config.ativo ? "✅ Ativo" : "⏸️ Pausado"}
                                    </div>
                                    {config.ultima_execucao && (
                                        <div style={styles.listMeta}>
                                            📤 Última execução: {new Date(config.ultima_execucao).toLocaleString('pt-PT')}
                                        </div>
                                    )}
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => executarVerificacao(config.id)}
                                        disabled={loading}
                                        style={{
                                            ...styles.button,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem"
                                        }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => toggleConfiguracao(config.id, config.ativo)}
                                        style={{
                                            ...styles.button,
                                            ...(config.ativo ? styles.buttonWarning : styles.buttonSuccess),
                                            padding: "6px 10px",
                                            fontSize: "0.8rem"
                                        }}
                                    >
                                        {config.ativo ? "⏸️ Pausar" : "▶️ Ativar"}
                                    </button>
                                    <button
                                        onClick={() => eliminarConfiguracao(config.id)}
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem"
                                        }}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Informações */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>ℹ️ Como Funciona</h3>
                <div style={{ padding: "10px 0" }}>
                    <h5 style={{ color: "#1976d2", marginBottom: "15px" }}>Sistema de Verificação de Ponto</h5>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>🎯 Objetivo:</strong>
                        <p style={{ margin: "5px 0", color: "#666" }}>
                            Enviar mensagens automáticas via WhatsApp para utilizadores que não registaram ponto no dia.
                        </p>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>⏰ Funcionamento:</strong>
                        <ul style={{ marginLeft: "20px", color: "#666" }}>
                            <li>Executa no horário configurado</li>
                            <li>Verifica apenas os dias da semana selecionados</li>
                            <li>Consulta os utilizadores da lista de contactos</li>
                            <li>Envia mensagem apenas para quem não tem registo de ponto no dia</li>
                        </ul>
                    </div>

                    <div style={{
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffeaa7",
                        borderRadius: "6px",
                        padding: "10px",
                        marginTop: "15px"
                    }}>
                        <strong style={{ color: "#856404" }}>💡 Dica:</strong>
                        <p style={{ margin: "5px 0 0 0", color: "#856404" }}>
                            Use o botão "Executar" para testar a verificação manualmente antes de ativar o agendamento automático.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificacaoPontoTab;
