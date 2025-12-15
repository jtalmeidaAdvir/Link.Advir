import React, { useState, useEffect } from "react";
import { secureStorage } from '../../../utils/secureStorage';

const RelatoriosPontosTab = ({ styles }) => {
    const [configuracoes, setConfiguracoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [novaConfiguracao, setNovaConfiguracao] = useState({
        empresa_id: "",
        horario: "17:00",
        ativo: true,
        diasSemana: [1, 2, 3, 4, 5] // Segunda a Sexta por padrão
    });
    const [empresas, setEmpresas] = useState([]);

    // API base URL
    const API_BASE_URL = "https://backend.advir.pt/whatsapi/api";

    // Dias da semana
    const diasSemanaOptions = [
        { value: 0, label: "Domingo" },
        { value: 1, label: "Segunda" },
        { value: 2, label: "Terça" },
        { value: 3, label: "Quarta" },
        { value: 4, label: "Quinta" },
        { value: 5, label: "Sexta" },
        { value: 6, label: "Sábado" }
    ];

    // Carregar configurações existentes
    const loadConfiguracoes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/relatorio-pontos/listar-configuracoes`);

            if (response.ok) {
                const data = await response.json();
                setConfiguracoes(data.configuracoes || []);
            } else {
                console.error("Erro ao carregar configurações de relatórios");
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        } finally {
            setLoading(false);
        }
    };

    // Carregar empresas
    const loadEmpresas = async () => {
        try {
            console.log('🔍 Carregando empresas...');
            const BACKEND_URL = 'https://backend.advir.pt';

            const url = `${BACKEND_URL}/api/empresas/listar`;
            console.log('🌐 URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`
                }
            });

            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dados recebidos:', data);

                // Suportar tanto { empresas: [...] } quanto [...]
                const empresasList = Array.isArray(data) ? data : (data.empresas || []);
                console.log('🏢 Empresas processadas:', empresasList);
                setEmpresas(empresasList);
            } else {
                console.error('❌ Erro na resposta:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Corpo do erro:', errorText);
            }
        } catch (error) {
            console.error("❌ Erro ao carregar empresas:", error);
        }
    };

    useEffect(() => {
        loadConfiguracoes();
        loadEmpresas();

        // Atualizar a cada 10 segundos
        const interval = setInterval(() => {
            loadConfiguracoes();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    // Criar nova configuração
    const criarConfiguracao = async () => {
        if (!novaConfiguracao.empresa_id || !novaConfiguracao.horario) {
            alert("Por favor, preencha todos os campos obrigatórios");
            return;
        }

        if (novaConfiguracao.diasSemana.length === 0) {
            alert("Selecione pelo menos um dia da semana");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/relatorio-pontos/criar-configuracao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novaConfiguracao)
            });

            if (response.ok) {
                alert("✅ Configuração criada com sucesso!");
                setNovaConfiguracao({
                    empresa_id: "",
                    horario: "17:00",
                    ativo: true,
                    diasSemana: [1, 2, 3, 4, 5]
                });
                loadConfiguracoes();
            } else {
                const error = await response.json();
                alert(`❌ Erro ao criar configuração: ${error.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao criar configuração:", error);
            alert("❌ Erro ao criar configuração");
        } finally {
            setLoading(false);
        }
    };

    // Alternar estado (ativo/inativo)
    const toggleConfiguracao = async (id, estadoAtual) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/relatorio-pontos/toggle-configuracao/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ativo: !estadoAtual })
            });

            if (response.ok) {
                alert(`✅ Configuração ${!estadoAtual ? 'ativada' : 'desativada'} com sucesso!`);
                loadConfiguracoes();
            } else {
                alert("❌ Erro ao alterar configuração");
            }
        } catch (error) {
            console.error("Erro ao alterar configuração:", error);
            alert("❌ Erro ao alterar configuração");
        } finally {
            setLoading(false);
        }
    };

    // Eliminar configuração
    const eliminarConfiguracao = async (id) => {
        if (!window.confirm("Tem certeza que deseja eliminar esta configuração?")) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/relatorio-pontos/eliminar-configuracao/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("✅ Configuração eliminada com sucesso!");
                loadConfiguracoes();
            } else {
                alert("❌ Erro ao eliminar configuração");
            }
        } catch (error) {
            console.error("Erro ao eliminar configuração:", error);
            alert("❌ Erro ao eliminar configuração");
        } finally {
            setLoading(false);
        }
    };

    // Testar envio manual
    const testarEnvio = async (empresaId) => {
        if (!window.confirm("Enviar relatórios de pontos agora para todas as obras desta empresa?")) {
            return;
        }

        try {
            setLoading(true);
            const WEBAPI_URL = 'https://webapiprimavera.advir.pt';

            const urlempresa = secureStorage.getItem('urlempresa') || secureStorage.getItem('urlempresaAdvir') || '';

            const response = await fetch(`${WEBAPI_URL}/enviar-relatorios-pontos-obras`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empresa_id: empresaId,
                    token: secureStorage.getItem('loginToken'),
                    urlempresa: urlempresa
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Atualizar estatísticas
                try {
                    await fetch(`${API_BASE_URL}/relatorio-pontos/atualizar-estatisticas/${empresaId}`, {
                        method: 'POST'
                    });
                } catch (updateError) {
                    console.warn("Erro ao atualizar estatísticas:", updateError);
                }

                let message = `✅ Envio concluído!\n\n`;
                message += `📊 Total de obras: ${result.totalObras || 0}\n`;
                message += `📧 Emails enviados: ${result.emailsEnviados || 0}\n`;
                message += `❌ Erros: ${result.erros || 0}\n`;

                if (result.resultados && result.resultados.length > 0) {
                    message += `\n📋 Detalhes:\n`;
                    result.resultados.forEach((r, idx) => {
                        if (r.status === 'success') {
                            message += `\n✅ ${r.obraNome}\n   Email: ${r.emailEnviado}`;
                        } else if (r.status === 'error') {
                            message += `\n❌ ${r.obraNome}\n   Erro: ${r.erro}`;
                        } else if (r.status === 'skipped') {
                            message += `\n⏭️ ${r.obraNome}\n   Motivo: ${r.motivo}`;
                        }
                        if (idx < result.resultados.length - 1) message += '\n';
                    });
                }

                alert(message);
                loadConfiguracoes();
            } else {
                alert(`❌ Erro ao enviar relatórios: ${result.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao enviar relatórios:", error);
            alert("❌ Erro ao enviar relatórios");
        } finally {
            setLoading(false);
        }
    };

    // Verificar status dos agendamentos
    const verificarStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/relatorio-pontos/status-agendamentos`);

            if (response.ok) {
                const data = await response.json();

                let statusMessage = `📊 Status dos Agendamentos de Relatórios\n\n`;
                statusMessage += `🕐 Hora atual: ${new Date(data.horaAtual).toLocaleString('pt-PT')}\n`;
                statusMessage += `📋 Total de agendamentos: ${data.totalAgendamentos}\n\n`;

                if (data.agendamentosAtivos.length > 0) {
                    statusMessage += `📅 Próximas execuções:\n`;
                    data.agendamentosAtivos.forEach(ag => {
                        statusMessage += `\n🏢 Empresa ${ag.empresa_id}:\n`;
                        statusMessage += `  ⏰ Horário: ${ag.horario}\n`;
                        statusMessage += `  📅 Dias: ${ag.diasSemana.map(d => diasSemanaOptions[d].label).join(', ')}\n`;
                        statusMessage += `  📅 Próxima: ${new Date(ag.proximaExecucao).toLocaleString('pt-PT')}\n`;
                        statusMessage += `  ⏳ Em ${ag.minutosParaProxima} minutos\n`;
                        statusMessage += `  ✅ Executada hoje: ${ag.jaExecutouHoje ? 'Sim' : 'Não'}\n`;
                        statusMessage += `  📊 Total execuções: ${ag.totalExecucoes}\n`;
                    });
                } else {
                    statusMessage += `⚠️ Nenhum agendamento ativo`;
                }

                alert(statusMessage);
            } else {
                alert("❌ Erro ao verificar status");
            }
        } catch (error) {
            console.error("Erro ao verificar status:", error);
            alert("❌ Erro ao verificar status");
        }
    };

    // Toggle dia da semana
    const toggleDiaSemana = (dia) => {
        setNovaConfiguracao(prev => {
            const diasAtual = [...prev.diasSemana];
            const index = diasAtual.indexOf(dia);

            if (index > -1) {
                diasAtual.splice(index, 1);
            } else {
                diasAtual.push(dia);
            }

            return { ...prev, diasSemana: diasAtual.sort() };
        });
    };

    return (
        <div style={styles.tabContent}>
            <div style={{ marginBottom: "30px" }}>
                <h2 style={{ color: "#1e3a8a", marginBottom: "10px" }}>
                    📧 Configuração de Relatórios de Pontos por Email
                </h2>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                    Configure o envio automático de relatórios de assiduidade para os responsáveis das obras.
                    Os emails serão enviados apenas para obras com pontos registados no dia.
                </p>
            </div>

            {/* Botões de ação global */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <button
                    onClick={verificarStatus}
                    style={{
                        ...styles.button,
                        backgroundColor: "#3b82f6"
                    }}
                    disabled={loading}
                >
                    📊 Verificar Status
                </button>
            </div>

            {/* Nova Configuração */}
            <div style={{
                backgroundColor: "#f0f9ff",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #bae6fd"
            }}>
                <h3 style={{ color: "#0c4a6e", marginBottom: "15px" }}>
                    ➕ Nova Configuração
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {/* Empresa */}
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", color: "#374151", fontWeight: "bold" }}>
                            Empresa:
                        </label>
                        <select
                            value={novaConfiguracao.empresa_id}
                            onChange={(e) => setNovaConfiguracao({ ...novaConfiguracao, empresa_id: e.target.value })}
                            style={{
                                ...styles.input,
                                width: "100%"
                            }}
                        >
                            <option value="">Selecione uma empresa</option>
                            {empresas.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nome || emp.empresa}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Horário */}
                    <div>
                        <label style={{ display: "block", marginBottom: "5px", color: "#374151", fontWeight: "bold" }}>
                            Horário de Envio:
                        </label>
                        <input
                            type="time"
                            value={novaConfiguracao.horario}
                            onChange={(e) => setNovaConfiguracao({ ...novaConfiguracao, horario: e.target.value })}
                            style={{
                                ...styles.input,
                                width: "200px"
                            }}
                        />
                        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "5px" }}>
                            Os relatórios serão enviados automaticamente neste horário
                        </p>
                    </div>

                    {/* Dias da Semana */}
                    <div>
                        <label style={{ display: "block", marginBottom: "10px", color: "#374151", fontWeight: "bold" }}>
                            Dias da Semana:
                        </label>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {diasSemanaOptions.map((dia) => (
                                <button
                                    key={dia.value}
                                    type="button"
                                    onClick={() => toggleDiaSemana(dia.value)}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "6px",
                                        border: "2px solid",
                                        borderColor: novaConfiguracao.diasSemana.includes(dia.value) ? "#3b82f6" : "#d1d5db",
                                        backgroundColor: novaConfiguracao.diasSemana.includes(dia.value) ? "#3b82f6" : "white",
                                        color: novaConfiguracao.diasSemana.includes(dia.value) ? "white" : "#374151",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {dia.label}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "5px" }}>
                            Selecione os dias em que os relatórios devem ser enviados
                        </p>
                    </div>

                    {/* Botão Criar */}
                    <button
                        onClick={criarConfiguracao}
                        style={{
                            ...styles.button,
                            backgroundColor: "#10b981",
                            width: "200px"
                        }}
                        disabled={loading}
                    >
                        {loading ? "Criando..." : "✅ Criar Configuração"}
                    </button>
                </div>
            </div>

            {/* Lista de Configurações */}
            <div>
                <h3 style={{ color: "#1e3a8a", marginBottom: "15px" }}>
                    📋 Configurações Existentes ({configuracoes.length})
                </h3>

                {loading && configuracoes.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>Carregando configurações...</p>
                ) : configuracoes.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>Nenhuma configuração criada ainda.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {configuracoes.map((config) => {
                            const empresa = empresas.find(e => e.id === parseInt(config.empresa_id));

                            return (
                                <div
                                    key={config.id}
                                    style={{
                                        backgroundColor: config.ativo ? "#f0fdf4" : "#fef2f2",
                                        padding: "20px",
                                        borderRadius: "8px",
                                        border: `2px solid ${config.ativo ? "#86efac" : "#fca5a5"}`
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ color: "#1e3a8a", marginBottom: "10px" }}>
                                                {config.ativo ? "✅" : "⏸️"} {empresa?.nome || empresa?.empresa || `Empresa ${config.empresa_id}`}
                                            </h4>

                                            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "14px", color: "#374151" }}>
                                                <div>⏰ <strong>Horário:</strong> {config.horario}</div>
                                                <div>📅 <strong>Dias:</strong> {config.diasSemana?.map(d => diasSemanaOptions[d].label).join(', ') || 'Todos os dias'}</div>
                                                <div>📊 <strong>Execuções:</strong> {config.totalExecucoes || 0}</div>
                                                {config.ultimaExecucao && (
                                                    <div>🕐 <strong>Última execução:</strong> {new Date(config.ultimaExecucao).toLocaleString('pt-PT')}</div>
                                                )}
                                                {config.proximaExecucao && (
                                                    <div>📅 <strong>Próxima execução:</strong> {new Date(config.proximaExecucao).toLocaleString('pt-PT')}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                                            <button
                                                onClick={() => testarEnvio(config.empresa_id)}
                                                style={{
                                                    ...styles.button,
                                                    backgroundColor: "#3b82f6",
                                                    fontSize: "12px",
                                                    padding: "8px 12px"
                                                }}
                                                disabled={loading}
                                            >
                                                🧪 Testar Agora
                                            </button>

                                            <button
                                                onClick={() => toggleConfiguracao(config.id, config.ativo)}
                                                style={{
                                                    ...styles.button,
                                                    backgroundColor: config.ativo ? "#f59e0b" : "#10b981",
                                                    fontSize: "12px",
                                                    padding: "8px 12px"
                                                }}
                                                disabled={loading}
                                            >
                                                {config.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
                                            </button>

                                            <button
                                                onClick={() => eliminarConfiguracao(config.id)}
                                                style={{
                                                    ...styles.button,
                                                    backgroundColor: "#ef4444",
                                                    fontSize: "12px",
                                                    padding: "8px 12px"
                                                }}
                                                disabled={loading}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Informações */}
            <div style={{
                marginTop: "30px",
                padding: "15px",
                backgroundColor: "#fef3c7",
                borderLeft: "4px solid #f59e0b",
                borderRadius: "4px"
            }}>
                <h4 style={{ color: "#92400e", marginBottom: "10px" }}>ℹ️ Informações Importantes</h4>
                <ul style={{ color: "#92400e", fontSize: "13px", lineHeight: "1.8", margin: 0, paddingLeft: "20px" }}>
                    <li>Os emails são enviados apenas para obras que tenham pontos registados no dia</li>
                    <li>O email é enviado para o responsável configurado na obra no Primavera</li>
                    <li>O relatório inclui: colaborador, hora de entrada e tempo trabalhado até ao momento</li>
                    <li>É possível testar o envio manualmente antes de agendar</li>
                    <li>Os agendamentos podem ser ativados/desativados a qualquer momento</li>
                </ul>
            </div>
        </div>
    );
};

export default RelatoriosPontosTab;
