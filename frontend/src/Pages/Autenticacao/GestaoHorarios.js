
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../../utils/secureStorage';
import { motion } from 'framer-motion';
import { FaClock, FaPlus, FaEdit, FaTrash, FaUsers, FaHistory } from 'react-icons/fa';

const GestaoHorarios = () => {
    const [activeTab, setActiveTab] = useState('horarios');
    const [horarios, setHorarios] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showPlanoModal, setShowPlanoModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedHorario, setSelectedHorario] = useState(null);
    const [historico, setHistorico] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [novoHorario, setNovoHorario] = useState({
        descricao: '',
        horasPorDia: 8.00,
        horasSemanais: 40.00,
        diasSemana: [1, 2, 3, 4, 5],
        horaEntrada: '09:00',
        horaSaida: '18:00',
        intervaloAlmoco: 1.00,
        observacoes: ''
    });

    const [novoPlano, setNovoPlano] = useState({
        user_id: '',
        horario_id: '',
        dataInicio: new Date().toISOString().split('T')[0],
        observacoes: ''
    });

    const diasSemanaLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    useEffect(() => {
        fetchHorarios();
        fetchUsers();
    }, []);

    const fetchHorarios = async () => {
        setLoading(true);
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const response = await fetch(`https://backend.advir.pt/api/horarios/empresa/${empresaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHorarios(data);
            }
        } catch (error) {
            console.error('Erro ao carregar horários:', error);
            setErrorMessage('Erro ao carregar horários');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const response = await fetch(`https://backend.advir.pt/api/users/empresa/${empresaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Erro ao carregar utilizadores:', error);
        }
    };

    const handleCriarHorario = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const response = await fetch(`https://backend.advir.pt/api/horarios/empresa/${empresaId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoHorario)
            });

            if (response.ok) {
                setSuccessMessage('Horário criado com sucesso!');
                setShowModal(false);
                resetNovoHorario();
                fetchHorarios();
            } else {
                const error = await response.json();
                setErrorMessage(error.message || 'Erro ao criar horário');
            }
        } catch (error) {
            console.error('Erro ao criar horário:', error);
            setErrorMessage('Erro ao criar horário');
        } finally {
            setLoading(false);
        }
    };

    const handleAtribuirHorario = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = secureStorage.getItem('loginToken');

            const response = await fetch(`https://backend.advir.pt/api/horarios/atribuir`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoPlano)
            });

            if (response.ok) {
                setSuccessMessage('Horário atribuído com sucesso!');
                setShowPlanoModal(false);
                resetNovoPlano();
            } else {
                const error = await response.json();
                setErrorMessage(error.message || 'Erro ao atribuir horário');
            }
        } catch (error) {
            console.error('Erro ao atribuir horário:', error);
            setErrorMessage('Erro ao atribuir horário');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminarHorario = async (horarioId) => {
        if (!window.confirm('Tem certeza que deseja eliminar este horário?')) return;

        try {
            const token = secureStorage.getItem('loginToken');

            const response = await fetch(`https://backend.advir.pt/api/horarios/${horarioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setSuccessMessage('Horário eliminado com sucesso!');
                fetchHorarios();
            } else {
                const error = await response.json();
                setErrorMessage(error.message || 'Erro ao eliminar horário');
            }
        } catch (error) {
            console.error('Erro ao eliminar horário:', error);
            setErrorMessage('Erro ao eliminar horário');
        }
    };

    const verHistorico = async (userId) => {
        try {
            const token = secureStorage.getItem('loginToken');

            const response = await fetch(`https://backend.advir.pt/api/horarios/user/${userId}/historico`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHistorico(data);
                setSelectedUser(users.find(u => u.id === userId));
                setActiveTab('historico');
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    const resetNovoHorario = () => {
        setNovoHorario({
            descricao: '',
            horasPorDia: 8.00,
            horasSemanais: 40.00,
            diasSemana: [1, 2, 3, 4, 5],
            horaEntrada: '09:00',
            horaSaida: '18:00',
            intervaloAlmoco: 1.00,
            observacoes: ''
        });
    };

    const resetNovoPlano = () => {
        setNovoPlano({
            user_id: '',
            horario_id: '',
            dataInicio: new Date().toISOString().split('T')[0],
            observacoes: ''
        });
    };

    const toggleDiaSemana = (dia) => {
        setNovoHorario(prev => ({
            ...prev,
            diasSemana: prev.diasSemana.includes(dia)
                ? prev.diasSemana.filter(d => d !== dia)
                : [...prev.diasSemana, dia].sort()
        }));
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <FaClock style={styles.titleIcon} />
                    Gestão de Horários
                </h1>
            </div>

            {/* Messages */}
            {errorMessage && (
                <div style={styles.errorMessage}>{errorMessage}</div>
            )}
            {successMessage && (
                <div style={styles.successMessage}>{successMessage}</div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    style={activeTab === 'horarios' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('horarios')}
                >
                    <FaClock /> Horários
                </button>
                <button
                    style={activeTab === 'atribuir' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('atribuir')}
                >
                    <FaUsers /> Atribuir Horários
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'horarios' && (
                <div style={styles.content}>
                    <div style={styles.actionBar}>
                        <button
                            style={styles.btnPrimary}
                            onClick={() => setShowModal(true)}
                        >
                            <FaPlus /> Novo Horário
                        </button>
                    </div>

                    <div style={styles.grid}>
                        {horarios.map(horario => (
                            <motion.div
                                key={horario.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={styles.card}
                            >
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>{horario.descricao}</h3>
                                    <div style={styles.cardActions}>
                                        <button
                                            style={styles.btnIcon}
                                            onClick={() => {
                                                setSelectedHorario(horario);
                                                setNovoHorario(horario);
                                                setShowModal(true);
                                            }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            style={styles.btnIconDanger}
                                            onClick={() => handleEliminarHorario(horario.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Horas/Dia:</span>
                                        <span style={styles.value}>{horario.horasPorDia}h</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Horas/Semana:</span>
                                        <span style={styles.value}>{horario.horasSemanais}h</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Horário:</span>
                                        <span style={styles.value}>
                                            {horario.horaEntrada} - {horario.horaSaida}
                                        </span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Intervalo:</span>
                                        <span style={styles.value}>{horario.intervaloAlmoco}h</span>
                                    </div>
                                    <div style={styles.diasSemana}>
                                        {diasSemanaLabels.map((dia, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    ...styles.diaBadge,
                                                    ...(horario.diasSemana?.includes(idx + 1)
                                                        ? styles.diaAtivo
                                                        : styles.diaInativo)
                                                }}
                                            >
                                                {dia}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'atribuir' && (
                <div style={styles.content}>
                    <div style={styles.actionBar}>
                        <button
                            style={styles.btnPrimary}
                            onClick={() => setShowPlanoModal(true)}
                        >
                            <FaPlus /> Atribuir Horário
                        </button>
                    </div>

                    <div style={styles.usersList}>
                        {users.map(user => (
                            <div key={user.id} style={styles.userCard}>
                                <div style={styles.userInfo}>
                                    <h4>{user.username}</h4>
                                    <p style={styles.userEmail}>{user.email}</p>
                                </div>
                                <button
                                    style={styles.btnSecondary}
                                    onClick={() => verHistorico(user.id)}
                                >
                                    <FaHistory /> Ver Histórico
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'historico' && selectedUser && (
                <div style={styles.content}>
                    <div style={styles.actionBar}>
                        <h3>Histórico de {selectedUser.username}</h3>
                        <button
                            style={styles.btnSecondary}
                            onClick={() => setActiveTab('atribuir')}
                        >
                            Voltar
                        </button>
                    </div>

                    <div style={styles.historicoList}>
                        {historico.map(plano => (
                            <div key={plano.id} style={styles.historicoCard}>
                                <div style={styles.historicoHeader}>
                                    <h4>{plano.Horario?.descricao}</h4>
                                    <span style={plano.ativo ? styles.badgeAtivo : styles.badgeInativo}>
                                        {plano.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                <div style={styles.historicoBody}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Data Início:</span>
                                        <span style={styles.value}>
                                            {new Date(plano.dataInicio).toLocaleDateString('pt-PT')}
                                        </span>
                                    </div>
                                    {plano.dataFim && (
                                        <div style={styles.infoRow}>
                                            <span style={styles.label}>Data Fim:</span>
                                            <span style={styles.value}>
                                                {new Date(plano.dataFim).toLocaleDateString('pt-PT')}
                                            </span>
                                        </div>
                                    )}
                                    {plano.observacoes && (
                                        <div style={styles.observacoes}>
                                            <span style={styles.label}>Observações:</span>
                                            <p>{plano.observacoes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Criar/Editar Horário */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>
                            {selectedHorario ? 'Editar Horário' : 'Novo Horário'}
                        </h2>
                        <form onSubmit={handleCriarHorario}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Descrição *</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={novoHorario.descricao}
                                    onChange={e => setNovoHorario({ ...novoHorario, descricao: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Horas/Dia *</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={styles.formInput}
                                        value={novoHorario.horasPorDia}
                                        onChange={e => setNovoHorario({ ...novoHorario, horasPorDia: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Horas/Semana *</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={styles.formInput}
                                        value={novoHorario.horasSemanais}
                                        onChange={e => setNovoHorario({ ...novoHorario, horasSemanais: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Hora Entrada</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaEntrada}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaEntrada: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Hora Saída</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaSaida}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaSaida: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Intervalo (horas)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={styles.formInput}
                                        value={novoHorario.intervaloAlmoco}
                                        onChange={e => setNovoHorario({ ...novoHorario, intervaloAlmoco: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Dias da Semana</label>
                                <div style={styles.diasSemanaSelector}>
                                    {diasSemanaLabels.map((dia, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            style={{
                                                ...styles.diaButton,
                                                ...(novoHorario.diasSemana.includes(idx + 1)
                                                    ? styles.diaButtonAtivo
                                                    : {})
                                            }}
                                            onClick={() => toggleDiaSemana(idx + 1)}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Observações</label>
                                <textarea
                                    style={styles.formTextarea}
                                    value={novoHorario.observacoes}
                                    onChange={e => setNovoHorario({ ...novoHorario, observacoes: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    style={styles.btnSecondary}
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedHorario(null);
                                        resetNovoHorario();
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                                    {loading ? 'A guardar...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Atribuir Horário */}
            {showPlanoModal && (
                <div style={styles.modalOverlay} onClick={() => setShowPlanoModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Atribuir Horário</h2>
                        <form onSubmit={handleAtribuirHorario}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Utilizador *</label>
                                <select
                                    style={styles.formInput}
                                    value={novoPlano.user_id}
                                    onChange={e => setNovoPlano({ ...novoPlano, user_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione um utilizador</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} - {user.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Horário *</label>
                                <select
                                    style={styles.formInput}
                                    value={novoPlano.horario_id}
                                    onChange={e => setNovoPlano({ ...novoPlano, horario_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione um horário</option>
                                    {horarios.map(horario => (
                                        <option key={horario.id} value={horario.id}>
                                            {horario.descricao} ({horario.horasSemanais}h/semana)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Data Início *</label>
                                <input
                                    type="date"
                                    style={styles.formInput}
                                    value={novoPlano.dataInicio}
                                    onChange={e => setNovoPlano({ ...novoPlano, dataInicio: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Observações</label>
                                <textarea
                                    style={styles.formTextarea}
                                    value={novoPlano.observacoes}
                                    onChange={e => setNovoPlano({ ...novoPlano, observacoes: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    style={styles.btnSecondary}
                                    onClick={() => {
                                        setShowPlanoModal(false);
                                        resetNovoPlano();
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                                    {loading ? 'A atribuir...' : 'Atribuir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        fontFamily: 'Poppins, sans-serif'
    },
    header: {
        marginBottom: '30px'
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1976D2',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    titleIcon: {
        fontSize: '28px'
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e0e0e0'
    },
    tab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        color: '#757575',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
    },
    activeTab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid #1976D2',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1976D2',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    actionBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e0e0e0'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: 0
    },
    cardActions: {
        display: 'flex',
        gap: '8px'
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    label: {
        fontSize: '14px',
        color: '#757575',
        fontWeight: '500'
    },
    value: {
        fontSize: '14px',
        color: '#333',
        fontWeight: '600'
    },
    diasSemana: {
        display: 'flex',
        gap: '5px',
        marginTop: '10px'
    },
    diaBadge: {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
    },
    diaAtivo: {
        backgroundColor: '#1976D2',
        color: '#fff'
    },
    diaInativo: {
        backgroundColor: '#e0e0e0',
        color: '#999'
    },
    usersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    userCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
    },
    userInfo: {
        flex: 1
    },
    userEmail: {
        fontSize: '14px',
        color: '#757575',
        margin: '5px 0 0 0'
    },
    historicoList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    historicoCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '15px',
        border: '1px solid #e0e0e0'
    },
    historicoHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    historicoBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    badgeAtivo: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#4caf50',
        color: '#fff'
    },
    badgeInativo: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#999',
        color: '#fff'
    },
    observacoes: {
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#fff',
        borderRadius: '6px'
    },
    btnPrimary: {
        padding: '10px 20px',
        backgroundColor: '#1976D2',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    btnSecondary: {
        padding: '10px 20px',
        backgroundColor: '#fff',
        color: '#1976D2',
        border: '1px solid #1976D2',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    btnIcon: {
        padding: '8px',
        backgroundColor: '#1976D2',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    btnIconDanger: {
        padding: '8px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    formLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#555',
        marginBottom: '8px'
    },
    formInput: {
        width: '100%',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px'
    },
    formTextarea: {
        width: '100%',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px',
        resize: 'vertical'
    },
    diasSemanaSelector: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    diaButton: {
        padding: '8px 16px',
        backgroundColor: '#f0f0f0',
        color: '#555',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    diaButtonAtivo: {
        backgroundColor: '#1976D2',
        color: '#fff',
        borderColor: '#1976D2'
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px'
    },
    errorMessage: {
        padding: '15px',
        backgroundColor: '#ffebee',
        color: '#c62828',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffcdd2'
    },
    successMessage: {
        padding: '15px',
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #c8e6c9'
    }
};

export default GestaoHorarios;
