import React, { useState, useEffect } from "react";
import { secureStorage } from '../../../utils/secureStorage';
const ConfiguracaoAutomaticaTab = ({
    styles,
}) => {
    const [configuracoes, setConfiguracoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [novaConfiguracao, setNovaConfiguracao] = useState({
        empresa_id: "",
        horario: "15:00",
        ativo: true
    });
    const [empresas, setEmpresas] = useState([]);

    // API base URL
    const API_BASE_URL = "https://backend.advir.pt/whatsapi/api";

    // Carregar configurações existentes
    const loadConfiguracoes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/configuracao-automatica/listar-configuracoes`);

            if (response.ok) {
                const data = await response.json();
                setConfiguracoes(data.configuracoes || []);
            } else {
                console.error("Erro ao carregar configurações");
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        } finally {
            setLoading(false);
        }
    };

    // Verificar status dos agendamentos
    const verificarStatusAgendamentos = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/configuracao-automatica/status-agendamentos`);
            
            if (response.ok) {
                const data = await response.json();
                
                let statusMessage = `📊 Status dos Agendamentos:\n\n`;
                statusMessage += `🕐 Hora atual: ${new Date(data.horaAtual).toLocaleString('pt-PT')}\n`;
                statusMessage += `📋 Total de agendamentos: ${data.totalAgendamentos}\n\n`;
                
                if (data.agendamentosAtivos.length > 0) {
                    statusMessage += `📅 Próximas execuções:\n`;
                    data.agendamentosAtivos.forEach(ag => {
                        statusMessage += `\n🏢 Empresa ${ag.empresa_id}:\n`;
                        statusMessage += `  ⏰ Horário: ${ag.horario}\n`;
                        statusMessage += `  📅 Próxima: ${new Date(ag.proximaExecucao).toLocaleString('pt-PT')}\n`;
                        statusMessage += `  ⏳ Em ${ag.minutosParaProxima} minutos\n`;
                        statusMessage += `  ✅ Executada hoje: ${ag.jaExecutouHoje ? 'Sim' : 'Não'}\n`;
                        statusMessage += `  📊 Total execuções: ${ag.totalExecucoes}\n`;
                    });
                } else {
                    statusMessage += `⚠️ Nenhum agendamento ativo encontrado`;
                }
                
                alert(statusMessage);
            } else {
                alert("Erro ao verificar status dos agendamentos");
            }
        } catch (error) {
            console.error("Erro ao verificar status:", error);
            alert("Erro ao verificar status dos agendamentos");
        }
    };

    // Forçar execução de um agendamento (usa exatamente a mesma lógica do botão testar)
    const executarAgendamentoAgora = async (empresaId) => {
        try {
            setLoading(true);
            const response = await fetch(`https://backend.advir.pt/api/verificacao-automatica/verificacao-manual?empresa_id=${empresaId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                // Atualizar as estatísticas do agendamento no whatsapp-backend
                try {
                    await fetch(`${API_BASE_URL}/configuracao-automatica/atualizar-estatisticas/${empresaId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (updateError) {
                    console.warn("Erro ao atualizar estatísticas:", updateError);
                }

                alert(`✅ Execução concluída!\n\nUtilizadores processados: ${result.estatisticas?.utilizadoresProcessados || 0}\nPontos adicionados: ${result.estatisticas?.pontosAdicionados || 0}`);
                loadConfiguracoes(); // Recarregar dados
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            console.error("Erro ao executar agendamento:", error);
            alert("Erro ao executar agendamento");
        } finally {
            setLoading(false);
        }
    };

    // Carregar empresas disponíveis
    const loadEmpresas = async () => {
        try {
            const loginToken = secureStorage.getItem('loginToken');
            if (!loginToken) return;

            const response = await fetch('https://backend.advir.pt/api/empresas/listar', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Ensure data is an array
                setEmpresas(Array.isArray(data) ? data : []);
            } else {
                setEmpresas([]);
            }
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
            setEmpresas([]);
        }
    };

    useEffect(() => {
        loadConfiguracoes();
        loadEmpresas();
    }, []);

    // Criar nova configuração
    const handleCreateConfiguracao = async (e) => {
        e.preventDefault();

        if (!novaConfiguracao.empresa_id) {
            alert("Selecione uma empresa");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/configuracao-automatica/configurar-empresa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novaConfiguracao)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                setNovaConfiguracao({
                    empresa_id: "",
                    horario: "15:00",
                    ativo: true
                });
                loadConfiguracoes();
            } else {
                alert(`Erro: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar configuração:", error);
            alert("Erro ao criar configuração");
        } finally {
            setLoading(false);
        }
    };

    // Ativar/Desativar configuração
    const toggleConfiguracao = async (empresaId, ativo) => {
        try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/configuracao-automatica/toggle-empresa/${empresaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ativo: !ativo })
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                loadConfiguracoes();
            } else {
                alert(`Erro: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao alterar configuração:", error);
            alert("Erro ao alterar configuração");
        } finally {
            setLoading(false);
        }
    };

    // Testar verificação manual
    const testarVerificacao = async (empresaId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/verificacao-automatica/verificacao-manual?empresa_id=${empresaId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Teste concluído!\n\nUtilizadores processados: ${result.estatisticas?.utilizadoresProcessados || 0}\nPontos adicionados: ${result.estatisticas?.pontosAdicionados || 0}`);
            } else {
                alert(`Erro no teste: ${result.message}`);
            }
        } catch (error) {
            console.error("Erro ao testar verificação:", error);
            alert("Erro ao executar teste");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.grid}>
            {/* Criar Nova Configuração */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚙️ Nova Configuração Automática</h3>
                <form onSubmit={handleCreateConfiguracao}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Empresa *</label>
                        <select
                            style={styles.select}
                            value={novaConfiguracao.empresa_id}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                empresa_id: e.target.value
                            })}
                            required
                        >
                            <option value="">Selecione uma empresa...</option>
                            {Array.isArray(empresas) && empresas.map((empresa) => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.empresa}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Horário de Verificação</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={novaConfiguracao.horario}
                            onChange={(e) => setNovaConfiguracao({
                                ...novaConfiguracao,
                                horario: e.target.value
                            })}
                        />
                        <small style={{ color: '#666', fontSize: '0.85rem' }}>
                            Hora em que será verificado se os utilizadores têm pelo menos 4 picagens
                        </small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={novaConfiguracao.ativo}
                                onChange={(e) => setNovaConfiguracao({
                                    ...novaConfiguracao,
                                    ativo: e.target.checked
                                })}
                            />
                            <span style={styles.label}>Ativar imediatamente</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: "100%"
                        }}
                        disabled={loading}
                    >
                        {loading ? "Criando..." : "⚙️ Criar Configuração"}
                    </button>
                </form>
            </div>

            {/* Lista de Configurações */}
            <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={styles.cardTitle}>📋 Configurações Ativas ({configuracoes.length})</h3>
                    <button
                        onClick={verificarStatusAgendamentos}
                        style={{
                            ...styles.button,
                            backgroundColor: "#2196F3",
                            color: "white",
                            padding: "8px 12px",
                            fontSize: "0.9rem",
                        }}
                        disabled={loading}
                    >
                        📊 Ver Status Global
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Carregando...</span>
                        </div>
                    </div>
                ) : configuracoes.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Nenhuma configuração criada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                        {configuracoes.map((config) => (
                            <div key={config.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        🏢 Empresa ID: {config.empresa_id}
                                    </div>
                                    <div style={styles.listMeta}>
                                        ⏰ Horário: {config.horario}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📅 Frequência: {config.frequencia}
                                    </div>
                                    <div style={styles.listMeta}>
                                        {config.ativo ? "✅ Ativo" : "⏸️ Inativo"}
                                    </div>
                                    {config.ultimaExecucao && (
                                        <div style={styles.listMeta}>
                                            📊 Última execução: {new Date(config.ultimaExecucao).toLocaleString('pt-PT')}
                                        </div>
                                    )}
                                    <div style={styles.listMeta}>
                                        🔢 Total de execuções: {config.totalExecucoes || 0}
                                    </div>
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => testarVerificacao(config.empresa_id)}
                                        style={{
                                            ...styles.button,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                        disabled={loading}
                                    >
                                        🧪 Testar
                                    </button>
                                    <button
                                        onClick={() => executarAgendamentoAgora(config.empresa_id)}
                                        style={{
                                            ...styles.button,
                                            backgroundColor: "#4CAF50",
                                            color: "white",
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                        disabled={loading}
                                    >
                                        ▶️ Executar Agora
                                    </button>
                                    <button
                                        onClick={() => toggleConfiguracao(config.empresa_id, config.ativo)}
                                        style={{
                                            ...styles.button,
                                            ...(config.ativo ? styles.buttonWarning : styles.buttonSuccess),
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                        disabled={loading}
                                    >
                                        {config.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Informações sobre o Sistema */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>ℹ️ Como Funciona</h3>
                <div style={{ padding: "10px 0" }}>
                    <h5 style={{ color: "#1976d2", marginBottom: "15px" }}>Sistema de Verificação Automática de Almoços</h5>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>🎯 Objetivo:</strong>
                        <p style={{ margin: "5px 0", color: "#666" }}>
                            Verificar diariamente se os utilizadores registaram pelo menos 4 picagens de ponto.
                            Se tiverem apenas 2 picagens (entrada de manhã e saída final), o sistema adiciona automaticamente:
                        </p>
                        <ul style={{ marginLeft: "20px", color: "#666" }}>
                            <li>Saída às 13:00 (início do almoço)</li>
                            <li>Entrada às 14:00 (fim do almoço)</li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>⏰ Quando funciona:</strong>
                        <ul style={{ marginLeft: "20px", color: "#666" }}>
                            <li>Executa diariamente no horário configurado</li>
                            <li>Apenas em dias úteis (Segunda a Sexta)</li>
                            <li>Só processa utilizadores com <code>naotratapontosalmoco = false</code></li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>👥 Utilizadores afetados:</strong>
                        <ul style={{ marginLeft: "20px", color: "#666" }}>
                            <li>Utilizadores ativos na empresa</li>
                            <li>Com campo <code>naotratapontosalmoco = false</code> (padrão)</li>
                            <li>Que tenham exatamente 2 picagens no dia</li>
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
                            Use o botão "Testar" para executar a verificação manualmente e ver quantos pontos seriam adicionados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracaoAutomaticaTab;