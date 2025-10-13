
import React, { useState, useEffect } from "react";

const RelatoriosTab = ({
    styles,
    API_BASE_URL
}) => {
    const [relatorios, setRelatorios] = useState([]);
    const [obras, setObras] = useState([]);
    const [loading, setLoading] = useState(false);

    const [novoRelatorio, setNovoRelatorio] = useState({
        nome: "",
        tipo: "registos_obra_dia", // registos_obra_dia, resumo_mensal, mapa_registos
        obra_id: "",
        emails: "",
        frequency: "daily",
        time: "10:00",
        days: [1, 2, 3, 4, 5], // Segunda a Sexta por defeito
        enabled: true
    });

    useEffect(() => {
        carregarRelatorios();
        carregarObras();
    }, []);

    const carregarRelatorios = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/relatorios-agendados`);
            const data = await response.json();
            setRelatorios(data);
        } catch (error) {
            console.error("Erro ao carregar relatórios:", error);
        }
    };

    const carregarObras = async () => {
        try {
            const token = localStorage.getItem('loginToken');
            const empresaId = localStorage.getItem('empresa_id');

            if (!empresaId) {
                console.warn('empresaId não encontrado no localStorage');
                setObras([]);
                return;
            }

            const response = await fetch('https://backend.advir.pt/api/obra', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-empresa-id': empresaId
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar obras: ${response.status}`);
            }

            const data = await response.json();
            // Filtrar apenas obras ativas da empresa
            setObras(data.filter(o => o.estado === 'Ativo' && o.empresa_id.toString() === empresaId.toString()));
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
            setObras([]);
        }
    };

    const handleCriarRelatorio = async (e) => {
        e.preventDefault();

        if (!novoRelatorio.nome || !novoRelatorio.emails) {
            alert("Nome e destinatários de email são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/relatorios-agendados`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoRelatorio)
            });

            if (response.ok) {
                alert("Relatório agendado com sucesso!");
                setNovoRelatorio({
                    nome: "",
                    tipo: "registos_obra_dia",
                    obra_id: "",
                    emails: "",
                    frequency: "daily",
                    time: "10:00",
                    days: [1, 2, 3, 4, 5],
                    enabled: true
                });
                carregarRelatorios();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.error || 'Erro ao criar relatório'}`);
            }
        } catch (error) {
            console.error("Erro ao criar relatório:", error);
            alert("Erro ao criar relatório agendado");
        } finally {
            setLoading(false);
        }
    };

    const toggleRelatorio = async (id, enabled) => {
        try {
            const response = await fetch(`${API_BASE_URL}/relatorios-agendados/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled: !enabled })
            });

            if (response.ok) {
                carregarRelatorios();
            }
        } catch (error) {
            console.error("Erro ao alternar relatório:", error);
        }
    };

    const eliminarRelatorio = async (id) => {
        if (!confirm("Tem certeza que deseja eliminar este relatório agendado?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/relatorios-agendados/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Relatório eliminado com sucesso!");
                carregarRelatorios();
            }
        } catch (error) {
            console.error("Erro ao eliminar relatório:", error);
            alert("Erro ao eliminar relatório");
        }
    };

    const executarAgora = async (id) => {
        if (!confirm("Deseja executar este relatório agora e enviar por email?")) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/relatorios-agendados/${id}/executar`, {
                method: 'POST'
            });

            const data = await response.json();
            if (response.ok) {
                alert("Relatório executado e enviado com sucesso!");
            } else {
                alert(`Erro: ${data.error || 'Erro ao executar relatório'}`);
            }
        } catch (error) {
            console.error("Erro ao executar relatório:", error);
            alert("Erro ao executar relatório");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.grid}>
            {/* Criar Relatório */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📧 Agendar Relatório por Email</h3>
                <form onSubmit={handleCriarRelatorio}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nome do Relatório *</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={novoRelatorio.nome}
                            onChange={(e) => setNovoRelatorio({ ...novoRelatorio, nome: e.target.value })}
                            placeholder="Ex: Relatório Diário Obra X"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tipo de Relatório *</label>
                        <select
                            style={styles.select}
                            value={novoRelatorio.tipo}
                            onChange={(e) => setNovoRelatorio({ ...novoRelatorio, tipo: e.target.value })}
                        >
                            <option value="registos_obra_dia">Registos de Ponto por Obra (Dia)</option>
                            <option value="resumo_mensal">Resumo Mensal de Horas</option>
                            <option value="mapa_registos">Mapa de Registos Geral</option>
                            <option value="obras_ativas">Resumo de Obras Ativas</option>
                        </select>
                    </div>

                    {(novoRelatorio.tipo === "registos_obra_dia" || novoRelatorio.tipo === "resumo_mensal") && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Obra (opcional)</label>
                            <select
                                style={styles.select}
                                value={novoRelatorio.obra_id}
                                onChange={(e) => setNovoRelatorio({ ...novoRelatorio, obra_id: e.target.value })}
                            >
                                <option value="">Todas as obras</option>
                                {obras.map(obra => (
                                    <option key={obra.id} value={obra.id}>
                                        {obra.codigo} - {obra.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Destinatários (Emails) *</label>
                        <textarea
                            style={styles.textarea}
                            value={novoRelatorio.emails}
                            onChange={(e) => setNovoRelatorio({ ...novoRelatorio, emails: e.target.value })}
                            placeholder="email1@exemplo.com, email2@exemplo.com"
                            rows="3"
                            required
                        />
                        <small style={{ color: '#6c757d' }}>Separar múltiplos emails por vírgula</small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Frequência</label>
                        <select
                            style={styles.select}
                            value={novoRelatorio.frequency}
                            onChange={(e) => setNovoRelatorio({
                                ...novoRelatorio,
                                frequency: e.target.value,
                                days: e.target.value === 'daily' ? [1, 2, 3, 4, 5] : []
                            })}
                        >
                            <option value="daily">Diariamente</option>
                            <option value="custom">Dias Específicos</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Hora de Envio</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={novoRelatorio.time}
                            onChange={(e) => setNovoRelatorio({ ...novoRelatorio, time: e.target.value })}
                        />
                    </div>

                    {(novoRelatorio.frequency === 'weekly' || novoRelatorio.frequency === 'custom') && (
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
                                            backgroundColor: novoRelatorio.days.includes(index + 1) ? '#007bff' : '#f8f9fa',
                                            color: novoRelatorio.days.includes(index + 1) ? '#fff' : '#495057',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            style={{ marginRight: '8px' }}
                                            checked={novoRelatorio.days.includes(index + 1)}
                                            onChange={(e) => {
                                                const days = [...novoRelatorio.days];
                                                if (e.target.checked) {
                                                    days.push(index + 1);
                                                } else {
                                                    const i = days.indexOf(index + 1);
                                                    if (i > -1) days.splice(i, 1);
                                                }
                                                setNovoRelatorio({ ...novoRelatorio, days });
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: '100%',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? '⏳ A criar...' : '📧 Agendar Relatório'}
                    </button>
                </form>
            </div>

            {/* Lista de Relatórios */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📊 Relatórios Agendados ({relatorios.length})</h3>

                {relatorios.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                        Nenhum relatório agendado ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {relatorios.map((relatorio) => (
                            <div key={relatorio.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        {relatorio.nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📋 {relatorio.tipo === 'registos_obra_dia' ? 'Registos Diários' :
                                            relatorio.tipo === 'resumo_mensal' ? 'Resumo Mensal' :
                                                relatorio.tipo === 'mapa_registos' ? 'Mapa de Registos' :
                                                    'Obras Ativas'}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📧 {relatorio.emails.split(',').length} destinatário(s)
                                    </div>
                                    <div style={styles.listMeta}>
                                        🕐 {relatorio.frequency === 'daily' ? 'Diário' :
                                            relatorio.frequency === 'weekly' ? 'Semanal' :
                                                relatorio.frequency === 'custom' ? 'Dias Específicos' :
                                                    'Mensal'} às {relatorio.time}
                                    </div>
                                    <div style={styles.listMeta}>
                                        {relatorio.enabled ? '✅ Ativo' : '⏸️ Pausado'}
                                    </div>
                                    {relatorio.last_sent && (
                                        <div style={styles.listMeta}>
                                            📤 Último envio: {new Date(relatorio.last_sent).toLocaleString('pt-PT')}
                                        </div>
                                    )}
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => executarAgora(relatorio.id)}
                                        disabled={loading}
                                        style={{
                                            ...styles.button,
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => toggleRelatorio(relatorio.id, relatorio.enabled)}
                                        style={{
                                            ...styles.button,
                                            ...(relatorio.enabled ? styles.buttonWarning : styles.buttonSuccess),
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        {relatorio.enabled ? '⏸️ Pausar' : '▶️ Ativar'}
                                    </button>
                                    <button
                                        onClick={() => eliminarRelatorio(relatorio.id)}
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
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
        </div>
    );
};

export default RelatoriosTab;
