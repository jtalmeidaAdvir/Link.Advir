
import React, { useState, useEffect } from "react";
import { secureStorage } from '../../../utils/secureStorage';

const VerificacaoPontoTab = ({ styles, API_BASE_URL }) => {
    const [configuracoes, setConfiguracoes] = useState([]);
    const [contactLists, setContactLists] = useState([]);
    const [loading, setLoading] = useState(false);

    const [novaConfiguracao, setNovaConfiguracao] = useState({
        nome: "",
        lista_contactos_id: "",
        tipo_verificacao: "entrada", // 'entrada' ou 'saida'
        horario_inicio: "06:00",
        horario_fim: "12:00",
        intervalo_minutos: 1,
        minutos_tolerancia: 10, // Minutos de tolerância após hora de entrada/saída
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
            // Carregar ambos os tipos de verificação
            const [entradaResponse, saidaResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/verificacao-ponto/listar`),
                fetch(`${API_BASE_URL}/verificacao-saida/listar`)
            ]);

            let todasConfiguracoes = [];

            if (entradaResponse.ok) {
                const dataEntrada = await entradaResponse.json();
                const configsEntrada = (dataEntrada.configuracoes || []).map(c => ({
                    ...c,
                    tipo_verificacao: 'entrada'
                }));
                todasConfiguracoes = [...todasConfiguracoes, ...configsEntrada];
            }

            if (saidaResponse.ok) {
                const dataSaida = await saidaResponse.json();
                const configsSaida = (dataSaida.configuracoes || []).map(c => ({
                    ...c,
                    tipo_verificacao: 'saida'
                }));
                todasConfiguracoes = [...todasConfiguracoes, ...configsSaida];
            }

            // Ordenar por ID decrescente
            todasConfiguracoes.sort((a, b) => b.id - a.id);
            setConfiguracoes(todasConfiguracoes);

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
            // Escolher o endpoint baseado no tipo de verificação
            const endpoint = novaConfiguracao.tipo_verificacao === 'saida'
                ? `${API_BASE_URL}/verificacao-saida/criar`
                : `${API_BASE_URL}/verificacao-ponto/criar`;

            const response = await fetch(endpoint, {
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
                    tipo_verificacao: "entrada",
                    horario_inicio: "06:00",
                    horario_fim: "12:00",
                    intervalo_minutos: 1,
                    minutos_tolerancia: 10,
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

    const toggleConfiguracao = async (id, ativo, tipoVerificacao) => {
        try {
            const baseUrl = tipoVerificacao === 'saida' ? 'verificacao-saida' : 'verificacao-ponto';
            const response = await fetch(`${API_BASE_URL}/${baseUrl}/${id}/toggle`, {
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

    const eliminarConfiguracao = async (id, tipoVerificacao) => {
        if (!confirm("Tem certeza que deseja eliminar esta configuração?")) {
            return;
        }

        try {
            const baseUrl = tipoVerificacao === 'saida' ? 'verificacao-saida' : 'verificacao-ponto';
            const response = await fetch(`${API_BASE_URL}/${baseUrl}/${id}`, {
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

    const executarVerificacao = async (id, tipoVerificacao) => {
        const tipoTexto = tipoVerificacao === 'saida' ? 'saída' : 'entrada';
        if (!confirm(`Deseja executar a verificação de ${tipoTexto} agora e enviar mensagens?`)) {
            return;
        }

        setLoading(true);
        const baseUrl = tipoVerificacao === 'saida' ? 'verificacao-saida' : 'verificacao-ponto';
        const url = `${API_BASE_URL}/${baseUrl}/${id}/executar`;
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
                let resultadoMsg;
                if (tipoVerificacao === 'saida') {
                    resultadoMsg = [
                        `📊 Verificação de saída executada com sucesso!`,
                        ``,
                        `📤 Mensagens enviadas: ${data.mensagensEnviadas}`,
                        `✅ Com registo de saída: ${data.comSaida || 0}`,
                        `⚠️ Sem registo de saída: ${data.semSaida || 0}`,
                        `🚪 Sem entrada registada: ${data.semEntrada || 0}`,
                        `⏰ Sem horário associado: ${data.semHorario}`,
                        `📅 Fora do período: ${data.foraDoPeriodo}`,
                        `🔔 Já notificado hoje: ${data.jaNotificado || 0}`,
                        `❌ Erros: ${data.erros}`,
                        ``,
                        `👥 Total de contactos: ${data.totalContactos}`
                    ].join('\n');
                } else {
                    resultadoMsg = [
                        `📊 Verificação de entrada executada com sucesso!`,
                        ``,
                        `📤 Mensagens enviadas: ${data.mensagensEnviadas}`,
                        `✅ Com registo de ponto: ${data.comRegisto}`,
                        `⚠️ Sem registo de ponto: ${data.semRegisto}`,
                        `🏖️ Com falta/férias aprovada: ${data.comFalta || 0}`,
                        `⏰ Sem horário associado: ${data.semHorario}`,
                        `📅 Fora do período: ${data.foraDoPeriodo}`,
                        `🔔 Já notificado hoje: ${data.jaNotificado || 0}`,
                        `❌ Erros: ${data.erros}`,
                        ``,
                        `👥 Total de contactos: ${data.totalContactos}`
                    ].join('\n');
                }

                alert(resultadoMsg);
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
                        <label style={styles.label}>Tipo de Verificação *</label>
                        <select
                            style={styles.select}
                            value={novaConfiguracao.tipo_verificacao}
                            onChange={(e) => {
                                const tipo = e.target.value;
                                const mensagemPadrao = tipo === 'saida'
                                    ? "🚪 Olá! Notamos que ainda não registou a sua saída de hoje. Por favor, regularize a situação o mais breve possível."
                                    : "⚠️ Olá! Notamos que ainda não registou o seu ponto de hoje. Por favor, regularize a situação o mais breve possível.";
                                const horarioInicio = tipo === 'saida' ? "18:00" : "06:00";
                                const horarioFim = tipo === 'saida' ? "23:00" : "12:00";

                                setNovaConfiguracao({
                                    ...novaConfiguracao,
                                    tipo_verificacao: tipo,
                                    mensagem_template: mensagemPadrao,
                                    horario_inicio: horarioInicio,
                                    horario_fim: horarioFim
                                });
                            }}
                            required
                        >
                            <option value="entrada">📥 Verificação de Entrada</option>
                            <option value="saida">🚪 Verificação de Saída</option>
                        </select>
                        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                            {novaConfiguracao.tipo_verificacao === 'entrada'
                                ? "Verifica se os colaboradores registaram a entrada (ponto de início)"
                                : "Verifica se os colaboradores registaram a saída (ponto de fim)"
                            }
                        </small>
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
                        <label style={styles.label}>Período de Verificação Contínua</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', display: 'block' }}>
                                    Início
                                </label>
                                <input
                                    type="time"
                                    style={styles.input}
                                    value={novaConfiguracao.horario_inicio}
                                    onChange={(e) => setNovaConfiguracao({
                                        ...novaConfiguracao,
                                        horario_inicio: e.target.value
                                    })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', display: 'block' }}>
                                    Fim
                                </label>
                                <input
                                    type="time"
                                    style={styles.input}
                                    value={novaConfiguracao.horario_fim}
                                    onChange={(e) => setNovaConfiguracao({
                                        ...novaConfiguracao,
                                        horario_fim: e.target.value
                                    })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', display: 'block' }}>
                                    Intervalo (min)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    style={styles.input}
                                    value={novaConfiguracao.intervalo_minutos}
                                    onChange={(e) => setNovaConfiguracao({
                                        ...novaConfiguracao,
                                        intervalo_minutos: parseInt(e.target.value) || 1
                                    })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', display: 'block' }}>
                                    Tolerância (min)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    style={styles.input}
                                    value={novaConfiguracao.minutos_tolerancia}
                                    onChange={(e) => setNovaConfiguracao({
                                        ...novaConfiguracao,
                                        minutos_tolerancia: parseInt(e.target.value) || 10
                                    })}
                                />
                            </div>
                        </div>
                        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '8px', display: 'block' }}>
                            ⏰ O sistema verificará continuamente durante este período, executando a cada {novaConfiguracao.intervalo_minutos} minuto(s).
                            Aguarda {novaConfiguracao.minutos_tolerancia} min após a hora de {novaConfiguracao.tipo_verificacao === 'saida' ? 'saída' : 'entrada'} antes de notificar.
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
                            <div key={`${config.tipo_verificacao}-${config.id}`} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        {config.tipo_verificacao === 'saida' ? '🚪' : '📥'} {config.nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        <strong>{config.tipo_verificacao === 'saida' ? 'Verificação de Saída' : 'Verificação de Entrada'}</strong>
                                    </div>
                                    <div style={styles.listMeta}>
                                        📋 Lista: {config.lista_nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        ⏰ Período: {config.horario_inicio || config.horario_verificacao} - {config.horario_fim || config.horario_verificacao} (a cada {config.intervalo_minutos || '60'} min)
                                    </div>
                                    <div style={styles.listMeta}>
                                        ⏱️ Tolerância: {config.minutos_tolerancia || 10} minutos após {config.tipo_verificacao === 'saida' ? 'saída' : 'entrada'}
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
                                        onClick={() => executarVerificacao(config.id, config.tipo_verificacao)}
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
                                        onClick={() => toggleConfiguracao(config.id, config.ativo, config.tipo_verificacao)}
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
                                        onClick={() => eliminarConfiguracao(config.id, config.tipo_verificacao)}
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
                    <h5 style={{ color: "#1976d2", marginBottom: "15px" }}>Sistema Inteligente de Verificação de Ponto</h5>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>🎯 Objetivo:</strong>
                        <p style={{ margin: "5px 0", color: "#666" }}>
                            Enviar mensagens automáticas via WhatsApp para utilizadores que não registaram ponto, respeitando os horários individuais de cada funcionário.
                        </p>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>⏰ Lógica de Verificação:</strong>
                        <ul style={{ marginLeft: "20px", color: "#666", lineHeight: "1.8" }}>
                            <li><strong>Horário Obrigatório:</strong> Só envia para quem tem horário associado no sistema</li>
                            <li><strong>Período Válido:</strong> Verifica se o horário está ativo na data atual (dataInicio até dataFim)</li>
                            <li><strong>Dias de Trabalho:</strong> Respeita os dias da semana definidos no horário de cada utilizador</li>
                            <li><strong>Hora de Entrada:</strong> Só envia a mensagem 30 minutos após a hora de entrada configurada</li>
                            <li><strong>Verificação de Ponto:</strong> Confirma se já existe registo antes de enviar</li>
                            <li><strong>Horários Diferentes:</strong> Cada utilizador pode ter horas de entrada diferentes</li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>📋 Processo de Execução:</strong>
                        <ol style={{ marginLeft: "20px", color: "#666", lineHeight: "1.8" }}>
                            <li>Verifica se o utilizador tem user_id associado</li>
                            <li>Consulta o horário ativo do utilizador para a data atual</li>
                            <li>Valida se a data está dentro do período do horário</li>
                            <li>Confirma que hoje é um dia de trabalho para o utilizador</li>
                            <li>Verifica se já passou tempo suficiente desde a hora de entrada</li>
                            <li>Consulta se já existe registo de ponto</li>
                            <li>Envia mensagem apenas se todas as condições forem satisfeitas</li>
                        </ol>
                    </div>

                    <div style={{
                        backgroundColor: "#d1ecf1",
                        border: "1px solid #bee5eb",
                        borderRadius: "6px",
                        padding: "10px",
                        marginTop: "15px"
                    }}>
                        <strong style={{ color: "#0c5460" }}>📊 Estatísticas Detalhadas:</strong>
                        <p style={{ margin: "5px 0 0 0", color: "#0c5460" }}>
                            O sistema fornece estatísticas completas: mensagens enviadas, utilizadores com/sem registo,
                            utilizadores sem horário associado, e utilizadores fora do período de validade do horário.
                        </p>
                    </div>

                    <div style={{
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffeaa7",
                        borderRadius: "6px",
                        padding: "10px",
                        marginTop: "10px"
                    }}>
                        <strong style={{ color: "#856404" }}>💡 Dica:</strong>
                        <p style={{ margin: "5px 0 0 0", color: "#856404" }}>
                            Use o botão "Executar" para testar a verificação manualmente antes de ativar o agendamento automático.
                            Isto permite validar a configuração e verificar quem receberá as mensagens.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificacaoPontoTab;
