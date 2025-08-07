
import React, { useState, useEffect } from 'react';

const WhatsAppWebConfig = () => {
    const [status, setStatus] = useState({
        status: 'disconnected',
        isReady: false,
        qrCode: null,
        hasQrCode: false
    });
    const [loading, setLoading] = useState(false);
    const [testMessage, setTestMessage] = useState({
        to: '',
        message: '',
        priority: 'normal'
    });

    // Estados para agendamento
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        message: '',
        contactList: [],
        frequency: 'daily', // daily, weekly, monthly, custom
        time: '09:00',
        days: [], // Para frequência semanal
        startDate: '',
        enabled: true,
        priority: 'normal'
    });

    // Estados para gestão de contactos
    const [contactLists, setContactLists] = useState([]);
    const [newContactList, setNewContactList] = useState({
        name: '',
        contacts: ''
    });
    const [selectedContactList, setSelectedContactList] = useState('');

    // Estados para visualização
    const [activeTab, setActiveTab] = useState('connection'); // connection, schedule, contacts, logs

    // Estados para logs
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [logFilter, setLogFilter] = useState({ scheduleId: '', type: '', limit: 50 });

    // Estados para informações do utilizador conectado
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        checkStatus();
        loadScheduledMessages();
        loadContactLists();
        loadLogs();
        loadStats();
        // Verificar status a cada 3 segundos
        const interval = setInterval(() => {
            checkStatus();
            loadUserInfo();
            if (activeTab === 'logs') {
                loadLogs();
                loadStats();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const checkStatus = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/status');
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    };

    const loadScheduledMessages = () => {
        const saved = localStorage.getItem('whatsapp_scheduled_messages');
        if (saved) {
            setScheduledMessages(JSON.parse(saved));
        }
    };

    const loadContactLists = () => {
        const saved = localStorage.getItem('whatsapp_contact_lists');
        if (saved) {
            setContactLists(JSON.parse(saved));
        }
    };

    const saveScheduledMessages = (messages) => {
        localStorage.setItem('whatsapp_scheduled_messages', JSON.stringify(messages));
        setScheduledMessages(messages);
    };

    const saveContactLists = (lists) => {
        localStorage.setItem('whatsapp_contact_lists', JSON.stringify(lists));
        setContactLists(lists);
    };

    const loadLogs = async () => {
        try {
            const params = new URLSearchParams();
            if (logFilter.scheduleId) params.append('scheduleId', logFilter.scheduleId);
            if (logFilter.type) params.append('type', logFilter.type);
            params.append('limit', logFilter.limit);

            const response = await fetch(`https://backend.advir.pt/api/whatsapp-web/logs?${params}`);
            const data = await response.json();
            setLogs(data.logs || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const loadUserInfo = async () => {
        if (status.isReady) {
            try {
                const response = await fetch('https://backend.advir.pt/api/whatsapp-web/me');
                if (response.ok) {
                    const data = await response.json();
                    setUserInfo(data);
                } else {
                    setUserInfo(null);
                }
            } catch (error) {
                console.error('Erro ao carregar informações do utilizador:', error);
                setUserInfo(null);
            }
        } else {
            setUserInfo(null);
        }
    };

    const clearLogs = async (scheduleId = null) => {
        try {
            const url = scheduleId
                ? `https://backend.advir.pt/api/whatsapp-web/logs?scheduleId=${scheduleId}`
                : 'https://backend.advir.pt/api/whatsapp-web/logs';

            await fetch(url, { method: 'DELETE' });
            loadLogs();
            loadStats();
            alert('Logs removidos com sucesso!');
        } catch (error) {
            console.error('Erro ao remover logs:', error);
            alert('Erro ao remover logs');
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert('Iniciando conexão... Aguarde o QR Code aparecer!');
                checkStatus();
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro ao conectar:', error);
            alert('Erro ao iniciar conexão WhatsApp Web');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert('WhatsApp Web desconectado com sucesso!');
                setUserInfo(null);
                checkStatus();
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            alert('Erro ao desconectar WhatsApp Web');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeAccount = async () => {
        if (confirm('Tem certeza que deseja trocar de conta WhatsApp? Isso irá limpar completamente a sessão atual.')) {
            setLoading(true);
            try {
                // Primeiro limpar a sessão completamente
                const clearResponse = await fetch('https://backend.advir.pt/api/whatsapp-web/clear-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (clearResponse.ok) {
                    const clearData = await clearResponse.json();
                    console.log('Sessão limpa:', clearData);

                    // Aguardar um pouco e depois tentar conectar novamente
                    setTimeout(async () => {
                        try {
                            const connectResponse = await fetch('https://backend.advir.pt/api/whatsapp-web/connect', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (connectResponse.ok) {
                                alert('Sessão limpa! Aguarde o novo QR Code aparecer para conectar com uma conta diferente.');
                                setUserInfo(null);
                                checkStatus();
                            } else {
                                alert('Erro ao iniciar nova conexão');
                            }
                        } catch (error) {
                            console.error('Erro ao conectar após limpeza:', error);
                            alert('Erro ao iniciar nova conexão');
                        } finally {
                            setLoading(false);
                        }
                    }, 2000);
                } else {
                    const errorData = await clearResponse.json();
                    alert(`Erro ao limpar sessão: ${errorData.error}`);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Erro ao limpar sessão:', error);
                alert('Erro ao limpar sessão WhatsApp');
                setLoading(false);
            }
        }
    };

    const handleTestMessage = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testMessage)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Mensagem enviada com sucesso!');
                setTestMessage({ to: '', message: '', priority: 'normal' });
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContactList = (e) => {
        e.preventDefault();
        if (!newContactList.name || !newContactList.contacts) {
            alert('Nome da lista e contactos são obrigatórios');
            return;
        }

        const contacts = newContactList.contacts
            .split('\n')
            .map(contact => contact.trim())
            .filter(contact => contact.length > 0)
            .map(phone => phone.replace(/\D/g, '')); // Limpar caracteres não numéricos

        if (contacts.length === 0) {
            alert('Adicione pelo menos um contacto válido');
            return;
        }

        const newList = {
            id: Date.now(),
            name: newContactList.name,
            contacts: contacts,
            createdAt: new Date().toISOString()
        };

        const updatedLists = [...contactLists, newList];
        saveContactLists(updatedLists);
        setNewContactList({ name: '', contacts: '' });
        alert('Lista de contactos criada com sucesso!');
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedule.message || newSchedule.contactList.length === 0) {
            alert('Mensagem e lista de contactos são obrigatórios');
            return;
        }

        const contactListWithNames = newSchedule.contactList.map(contact => {
            // Se contact já é um objeto com phone, usa ele diretamente
            if (typeof contact === 'object' && contact.phone) {
                return contact;
            }
            // Se contact é uma string (número de telefone), cria objeto
            if (typeof contact === 'string') {
                return {
                    name: `Contacto ${contact.slice(-4)}`,
                    phone: contact
                };
            }
            // Fallback para casos inesperados
            return {
                name: `Contacto ${String(contact).slice(-4)}`,
                phone: String(contact)
            };
        });

        const schedule = {
            id: Date.now(),
            ...newSchedule,
            contactList: contactListWithNames,
            createdAt: new Date().toISOString(),
            lastSent: null,
            nextSend: calculateNextSend()
        };

        try {
            // Criar no backend
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(schedule)
            });

            if (response.ok) {
                const updatedSchedules = [...scheduledMessages, schedule];
                saveScheduledMessages(updatedSchedules);

                // Sincronizar com backend
                await syncSchedulesWithBackend(updatedSchedules);

                setNewSchedule({
                    message: '',
                    contactList: [],
                    frequency: 'daily',
                    time: '09:00',
                    days: [],
                    startDate: '',
                    enabled: true,
                    priority: 'normal'
                });
                alert('Agendamento criado e sincronizado com sucesso!');
            } else {
                const error = await response.json();
                alert(`Erro ao criar agendamento no backend: ${error.error}`);
            }
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            alert('Erro ao criar agendamento. Verificar logs.');
        }
    };

    const calculateNextSend = () => {
        const now = new Date();
        const [hours, minutes] = newSchedule.time.split(':');
        let nextSend = new Date();
        nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (newSchedule.startDate) {
            const startDate = new Date(newSchedule.startDate);
            if (startDate > now) {
                nextSend = startDate;
                nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
        }

        if (nextSend <= now) {
            nextSend.setDate(nextSend.getDate() + 1);
        }

        return nextSend.toISOString();
    };

    const deleteSchedule = (id) => {
        if (confirm('Tem certeza que deseja eliminar este agendamento?')) {
            const updatedSchedules = scheduledMessages.filter(schedule => schedule.id !== id);
            saveScheduledMessages(updatedSchedules);
        }
    };

    const deleteContactList = (id) => {
        if (confirm('Tem certeza que deseja eliminar esta lista de contactos?')) {
            const updatedLists = contactLists.filter(list => list.id !== id);
            saveContactLists(updatedLists);
        }
    };

    const syncSchedulesWithBackend = async (schedules = scheduledMessages) => {
        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/sync-schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schedules })
            });

            if (response.ok) {
                console.log('Agendamentos sincronizados com backend');
                return true;
            } else {
                console.error('Erro ao sincronizar com backend');
                return false;
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            return false;
        }
    };

    const testScheduleNow = async () => {
        if (scheduledMessages.length === 0) {
            alert('Crie pelo menos um agendamento primeiro');
            return;
        }

        const schedule = scheduledMessages[0];

        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/test-schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: schedule.message,
                    contacts: schedule.contactList,
                    priority: schedule.priority
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Teste executado! Verificar logs para detalhes.');
            } else {
                alert(`Erro no teste: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro no teste:', error);
            alert('Erro ao executar teste');
        }
    };

    const forceScheduleExecution = async (scheduleId) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/whatsapp-web/schedule/${scheduleId}/execute`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                alert('Agendamento executado manualmente! Verificar logs.');
                loadLogs();
            } else {
                alert(`Erro: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro ao executar agendamento:', error);
            alert('Erro ao executar agendamento');
        }
    };

    const simulateTimeExecution = async () => {
        const time = prompt('Digite a hora para simular (formato HH:MM):');
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
            alert('Formato de hora inválido. Use HH:MM');
            return;
        }

        try {
            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/simulate-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ time })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Simulação para ${time} concluída! Verificar logs para detalhes.`);
                loadLogs();
            } else {
                alert(`Erro na simulação: ${result.error}`);
            }
        } catch (error) {
            console.error('Erro na simulação:', error);
            alert('Erro na simulação de tempo');
        }
    };

    const renderLogsTab = () => (
        <div>
            <div style={styles.grid}>
                {/* Estatísticas */}
                <div style={styles.form}>
                    <h3>📊 Estatísticas dos Agendamentos</h3>
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <h4>📅 Total de Agendamentos</h4>
                            <p style={styles.statNumber}>{stats.totalSchedules || 0}</p>
                        </div>
                        <div style={styles.statCard}>
                            <h4>🟢 Agendamentos Ativos</h4>
                            <p style={styles.statNumber}>{stats.activeSchedules || 0}</p>
                        </div>
                        <div style={styles.statCard}>
                            <h4>📝 Total de Logs</h4>
                            <p style={styles.statNumber}>{stats.totalLogs || 0}</p>
                        </div>
                    </div>

                    {stats.logsByType && (
                        <div style={styles.logsTypeGrid}>
                            <div style={{ ...styles.statCard, backgroundColor: '#e3f2fd' }}>
                                <span>ℹ️ Info: {stats.logsByType.info}</span>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#e8f5e8' }}>
                                <span>✅ Sucesso: {stats.logsByType.success}</span>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#fff3e0' }}>
                                <span>⚠️ Avisos: {stats.logsByType.warning}</span>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#ffebee' }}>
                                <span>❌ Erros: {stats.logsByType.error}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filtros e Controles */}
                <div style={styles.form}>
                    <h3>🔍 Filtros de Logs</h3>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Agendamento</label>
                        <select
                            style={styles.select}
                            value={logFilter.scheduleId}
                            onChange={(e) => setLogFilter({ ...logFilter, scheduleId: e.target.value })}
                        >
                            <option value="">Todos os agendamentos</option>
                            {scheduledMessages.map(schedule => (
                                <option key={schedule.id} value={schedule.id}>
                                    {schedule.message.substring(0, 30)}...
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tipo</label>
                        <select
                            style={styles.select}
                            value={logFilter.type}
                            onChange={(e) => setLogFilter({ ...logFilter, type: e.target.value })}
                        >
                            <option value="">Todos os tipos</option>
                            <option value="info">ℹ️ Informação</option>
                            <option value="success">✅ Sucesso</option>
                            <option value="warning">⚠️ Aviso</option>
                            <option value="error">❌ Erro</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Limite</label>
                        <select
                            style={styles.select}
                            value={logFilter.limit}
                            onChange={(e) => setLogFilter({ ...logFilter, limit: parseInt(e.target.value) })}
                        >
                            <option value={50}>50 logs</option>
                            <option value={100}>100 logs</option>
                            <option value={200}>200 logs</option>
                            <option value={500}>500 logs</option>
                        </select>
                    </div>

                    <div style={styles.buttonGroup}>
                        <button onClick={loadLogs} style={styles.button}>
                            🔄 Atualizar Logs
                        </button>
                        <button onClick={() => clearLogs()} style={{ ...styles.button, backgroundColor: '#f44336' }}>
                            🗑️ Limpar Todos
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Logs */}
            <div style={styles.form}>
                <h3>📋 Logs dos Agendamentos ({logs.length})</h3>
                <div style={styles.logsContainer}>
                    {logs.length === 0 ? (
                        <p>Nenhum log encontrado.</p>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} style={{
                                ...styles.logItem,
                                borderLeft: `4px solid ${getLogColor(log.type)}`
                            }}>
                                <div style={styles.logHeader}>
                                    <span style={styles.logType}>
                                        {getLogIcon(log.type)} {log.type.toUpperCase()}
                                    </span>
                                    <span style={styles.logTime}>
                                        {new Date(log.timestamp).toLocaleString('pt-PT')}
                                    </span>
                                </div>
                                <div style={styles.logMessage}>{log.message}</div>
                                {log.details && (
                                    <details style={styles.logDetails}>
                                        <summary>Ver detalhes</summary>
                                        <pre style={styles.logDetailsContent}>
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const getLogColor = (type) => {
        switch (type) {
            case 'success': return '#4caf50';
            case 'error': return '#f44336';
            case 'warning': return '#ff9800';
            case 'info': default: return '#2196f3';
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': default: return 'ℹ️';
        }
    };

    const toggleSchedule = (id) => {
        const updatedSchedules = scheduledMessages.map(schedule =>
            schedule.id === id ? { ...schedule, enabled: !schedule.enabled } : schedule
        );
        saveScheduledMessages(updatedSchedules);
    };

    const getStatusColor = () => {
        switch (status.status) {
            case 'ready': return '#25D366';
            case 'qr_received': return '#FFA500';
            case 'authenticated': return '#4CAF50';
            case 'auth_failure': return '#f44336';
            default: return '#f44336';
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case 'ready': return '✅ Conectado e Pronto';
            case 'qr_received': return '📱 QR Code Disponível - Escaneie!';
            case 'authenticated': return '🔐 Autenticado';
            case 'auth_failure': return '❌ Falha na Autenticação';
            default: return '⚫ Desconectado';
        }
    };

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden'
        },
        header: {
            textAlign: 'center',
            marginBottom: '30px',
            color: '#25D366'
        },
        tabContainer: {
            display: 'flex',
            marginBottom: '20px',
            borderBottom: '2px solid #eee'
        },
        tab: {
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            borderBottom: '3px solid transparent'
        },
        activeTab: {
            borderBottom: '3px solid #25D366',
            color: '#25D366',
            fontWeight: 'bold'
        },
        statusCard: {
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: `3px solid ${getStatusColor()}`,
            textAlign: 'center'
        },
        statusText: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: getStatusColor(),
            marginBottom: '10px'
        },
        qrContainer: {
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '2px solid #FFA500'
        },
        qrCode: {
            maxWidth: '300px',
            margin: '0 auto 15px',
            display: 'block'
        },
        form: {
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
        },
        formGroup: {
            marginBottom: '15px'
        },
        label: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px',
            minHeight: '80px',
            resize: 'vertical'
        },
        select: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
        },
        button: {
            background: '#25D366',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            margin: '5px'
        },
        buttonSecondary: {
            background: '#f44336',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            margin: '5px'
        },
        buttonSmall: {
            background: '#25D366',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer',
            margin: '2px'
        },
        buttonDanger: {
            background: '#f44336',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer',
            margin: '2px'
        },
        buttonDisabled: {
            background: '#ccc',
            cursor: 'not-allowed'
        },
        instructions: {
            background: '#e3f2fd',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '14px',
            lineHeight: '1.5'
        },
        controls: {
            textAlign: 'center',
            marginBottom: '20px'
        },
        listItem: {
            background: 'white',
            padding: '15px',
            marginBottom: '10px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        listContent: {
            flex: 1
        },
        listActions: {
            display: 'flex',
            gap: '5px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
        },
        statCard: {
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #ddd'
        },
        statNumber: {
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '5px 0',
            color: '#333'
        },
        logsTypeGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px'
        },
        logsContainer: {
            maxHeight: '500px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px'
        },
        logItem: {
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9',
            borderRadius: '5px',
            borderLeft: '4px solid #2196f3'
        },
        logHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '5px'
        },
        logType: {
            fontWeight: 'bold',
            fontSize: '12px'
        },
        logTime: {
            fontSize: '11px',
            color: '#666'
        },
        logMessage: {
            fontSize: '14px',
            lineHeight: '1.4'
        },
        logDetails: {
            marginTop: '10px'
        },
        logDetailsContent: {
            background: '#f0f0f0',
            padding: '10px',
            borderRadius: '3px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '200px'
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            marginTop: '10px'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
        },
        checkboxGroup: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '5px'
        },
        checkbox: {
            marginRight: '5px'
        },
        testButtonsContainer: {
            backgroundColor: '#f0f8ff',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #2196f3'
        },
        userInfoCard: {
            background: '#f0f8ff',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: '2px solid #25D366'
        },
        userInfoContent: {
            marginBottom: '15px'
        },
        userInfoItem: {
            padding: '8px 0',
            borderBottom: '1px solid #e0e0e0',
            fontSize: '14px'
        },
        userInfoActions: {
            textAlign: 'center',
            marginBottom: '15px'
        },
        userInfoNote: {
            backgroundColor: '#fff3cd',
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ffeaa7',
            lineHeight: '1.4'
        },
        dayLabel: {
            display: 'flex',
            alignItems: 'center',
            padding: '5px 10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '3px',
            margin: '2px'
        },
        helpText: {
            color: '#666',
            fontSize: '12px',
            marginTop: '8px',
            display: 'block',
            fontStyle: 'italic'
        }
    };

    const renderConnectionTab = () => (
        <div>
            <div style={styles.statusCard}>
                <div style={styles.statusText}>{getStatusText()}</div>
                <div>Status: <strong>{status.status}</strong></div>
            </div>

            <div style={styles.instructions}>
                <h3>📋 Como usar o WhatsApp Web API:</h3>
                <ol>
                    <li>Clique em "Conectar WhatsApp Web"</li>
                    <li>Aguarde o QR Code aparecer</li>
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Vá em Configurações → Dispositivos conectados → Conectar dispositivo</li>
                    <li>Escaneie o QR Code que aparece abaixo</li>
                    <li>Aguarde a confirmação de conexão</li>
                    <li>Teste enviando mensagens!</li>
                </ol>
                <p><strong>✅ Vantagens:</strong> Totalmente gratuito, ilimitado, sem configuração de tokens!</p>
            </div>

            <div style={styles.controls}>
                {!status.isReady ? (
                    <div>
                        <button
                            onClick={handleConnect}
                            style={{
                                ...styles.button,
                                ...(loading ? styles.buttonDisabled : {})
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Conectando...' : 'Conectar WhatsApp Web'}
                        </button>

                        <button
                            onClick={async () => {
                                if (confirm('Isso irá limpar completamente qualquer sessão existente. Continuar?')) {
                                    setLoading(true);
                                    try {
                                        const response = await fetch('https://backend.advir.pt/api/whatsapp-web/clear-session', {
                                            method: 'POST'
                                        });

                                        if (response.ok) {
                                            alert('Sessão limpa! Agora pode conectar com qualquer conta.');
                                            setTimeout(() => handleConnect(), 1000);
                                        } else {
                                            alert('Erro ao limpar sessão');
                                        }
                                    } catch (error) {
                                        alert('Erro ao limpar sessão');
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            style={{
                                ...styles.button,
                                backgroundColor: '#ff9800',
                                ...(loading ? styles.buttonDisabled : {})
                            }}
                            disabled={loading}
                        >
                            🗑️ Limpar Sessão e Conectar
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleDisconnect}
                        style={{
                            ...styles.buttonSecondary,
                            ...(loading ? styles.buttonDisabled : {})
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Desconectando...' : 'Desconectar'}
                    </button>
                )}
            </div>

            {/* Debug do status */}
            <div style={{ ...styles.form, backgroundColor: '#f0f8ff', border: '1px solid #0066cc' }}>
                <h4>🔍 Debug - Status da Conexão</h4>
                <pre style={{ fontSize: '12px', background: '#fff', padding: '10px', borderRadius: '5px' }}>
                    {JSON.stringify(status, null, 2)}
                </pre>
            </div>

            {/* QR Code com melhor detecção */}
            {(status.status === 'qr_received' || status.hasQrCode || status.qrCode) && (
                <div style={styles.qrContainer}>
                    <h3>📱 Escaneie este QR Code com seu WhatsApp:</h3>
                    {status.qrCode ? (
                        <div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(status.qrCode)}`}
                                alt="QR Code WhatsApp"
                                style={styles.qrCode}
                                onError={(e) => {
                                    console.error('Erro ao carregar QR Code:', e);
                                    e.target.style.display = 'none';
                                }}
                            />
                            <p><strong>⏱️ Aguardando escaneamento...</strong></p>
                            <p>O QR Code é atualizado automaticamente a cada 3 segundos</p>

                            {/* QR Code alternativo usando canvas */}
                            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                                <small><strong>QR Code Data:</strong></small>
                                <div style={{
                                    wordBreak: 'break-all',
                                    fontSize: '10px',
                                    maxHeight: '100px',
                                    overflow: 'auto',
                                    backgroundColor: 'white',
                                    padding: '5px',
                                    border: '1px solid #ddd'
                                }}>
                                    {status.qrCode.substring(0, 200)}...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                            <p>⚠️ QR Code não disponível. Status: {status.status}</p>
                            <button onClick={() => {
                                console.log('Forçando nova verificação de status...');
                                checkStatus();
                            }} style={styles.button}>
                                🔄 Tentar Novamente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Botão para forçar obtenção de QR Code */}
            {status.status === 'disconnected' && (
                <div style={{ ...styles.form, backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
                    <h4>🔧 Ferramentas de Debug</h4>
                    <button onClick={async () => {
                        try {
                            const response = await fetch('https://backend.advir.pt/api/whatsapp-web/qr');
                            const data = await response.json();
                            console.log('QR Response:', data);
                            alert(`QR Status: ${data.status}\nQR Available: ${!!data.qrCode}`);
                        } catch (error) {
                            console.error('Erro ao obter QR:', error);
                            alert('Erro ao obter QR Code');
                        }
                    }} style={styles.button}>
                        🔍 Verificar QR Code Diretamente
                    </button>
                </div>
            )}

            {status.isReady && userInfo && (
                <div style={styles.userInfoCard}>
                    <h3>👤 Contacto Principal Conectado</h3>
                    <div style={styles.userInfoContent}>
                        <div style={styles.userInfoItem}>
                            <strong>📱 Nome:</strong> {userInfo.pushname || 'Utilizador WhatsApp'}
                        </div>
                        <div style={styles.userInfoItem}>
                            <strong>🔢 Número:</strong> {userInfo.formattedNumber || userInfo.wid || 'Não disponível'}
                        </div>
                        <div style={styles.userInfoItem}>
                            <strong>💻 Plataforma:</strong> {userInfo.platform || 'WhatsApp Web'}
                        </div>
                        <div style={styles.userInfoItem}>
                            <strong>⚡ Status:</strong> ✅ Conectado e ativo
                        </div>
                    </div>
                    <div style={styles.userInfoActions}>
                        <button
                            onClick={handleChangeAccount}
                            style={{ ...styles.button, backgroundColor: '#ff9800' }}
                            disabled={loading}
                        >
                            🔄 Trocar Conta WhatsApp
                        </button>
                    </div>
                    <div style={styles.userInfoNote}>
                        <small>
                            📝 <strong>Nota:</strong> Todas as mensagens serão enviadas a partir desta conta WhatsApp.
                            Para usar uma conta diferente, clique em "Trocar Conta WhatsApp".
                        </small>
                    </div>
                </div>
            )}

            {status.isReady && (
                <form onSubmit={handleTestMessage} style={styles.form}>
                    <h3>📱 Enviar Mensagem de Teste</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Número de Destino *</label>
                        <input
                            type="tel"
                            style={styles.input}
                            value={testMessage.to}
                            onChange={(e) => setTestMessage({ ...testMessage, to: e.target.value })}
                            placeholder="351912345678 (com código do país)"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mensagem *</label>
                        <textarea
                            style={styles.textarea}
                            value={testMessage.message}
                            onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                            placeholder="Digite sua mensagem aqui..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={testMessage.priority}
                            onChange={(e) => setTestMessage({ ...testMessage, priority: e.target.value })}
                        >
                            <option value="normal">Normal</option>
                            <option value="info">Informação</option>
                            <option value="warning">Aviso</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...(loading ? styles.buttonDisabled : {}),
                            width: '100%'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Enviando...' : 'Enviar Mensagem de Teste'}
                    </button>
                </form>
            )}
        </div>
    );

    const renderContactsTab = () => (
        <div>
            <div style={styles.grid}>
                <form onSubmit={handleCreateContactList} style={styles.form}>
                    <h3>👥 Criar Lista de Contactos</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nome da Lista *</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={newContactList.name}
                            onChange={(e) => setNewContactList({ ...newContactList, name: e.target.value })}
                            placeholder="Ex: Clientes VIP, Equipa Vendas..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Contactos (um por linha) *</label>
                        <textarea
                            style={{ ...styles.textarea, minHeight: '120px' }}
                            value={newContactList.contacts}
                            onChange={(e) => setNewContactList({ ...newContactList, contacts: e.target.value })}
                            placeholder="351912345678&#10;351923456789&#10;351934567890"
                            required
                        />
                        <small>Insira um número por linha, com código do país (ex: 351912345678)</small>
                    </div>

                    <button type="submit" style={{ ...styles.button, width: '100%' }}>
                        Criar Lista de Contactos
                    </button>
                </form>

                <div style={styles.form}>
                    <h3>📋 Listas de Contactos ({contactLists.length})</h3>
                    {contactLists.length === 0 ? (
                        <p>Nenhuma lista de contactos criada ainda.</p>
                    ) : (
                        contactLists.map(list => (
                            <div key={list.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <strong>{list.name}</strong>
                                    <br />
                                    <small>{list.contacts.length} contactos</small>
                                    <br />
                                    <small>Criada: {new Date(list.createdAt).toLocaleDateString()}</small>
                                </div>
                                <div style={styles.listActions}>
                                    <button
                                        onClick={() => alert(`Contactos:\n${list.contacts.join('\n')}`)}
                                        style={styles.buttonSmall}
                                    >
                                        Ver
                                    </button>
                                    <button
                                        onClick={() => deleteContactList(list.id)}
                                        style={styles.buttonDanger}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    const renderScheduleTab = () => (
        <div>
            <div style={styles.grid}>
                <form onSubmit={handleCreateSchedule} style={styles.form}>
                    <h3>⏰ Agendar Mensagens</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mensagem *</label>
                        <textarea
                            style={styles.textarea}
                            value={newSchedule.message}
                            onChange={(e) => setNewSchedule({ ...newSchedule, message: e.target.value })}
                            placeholder="Digite a mensagem a ser enviada periodicamente..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lista de Contactos *</label>
                        <select
                            style={styles.select}
                            value={selectedContactList}
                            onChange={(e) => {
                                setSelectedContactList(e.target.value);
                                const list = contactLists.find(l => l.id.toString() === e.target.value);
                                // Converter array de strings para array de objetos
                                const formattedContacts = list ? list.contacts.map(phone => ({
                                    name: `Contacto ${phone.slice(-4)}`,
                                    phone: phone
                                })) : [];
                                setNewSchedule({ ...newSchedule, contactList: formattedContacts });
                            }}
                            required
                        >
                            <option value="">Selecione uma lista...</option>
                            {contactLists.map(list => (
                                <option key={list.id} value={list.id}>
                                    {list.name} ({list.contacts.length} contactos)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Frequência</label>
                        <select
                            style={styles.select}
                            value={newSchedule.frequency}
                            onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value, days: [] })}
                        >
                            <option value="daily">Diariamente</option>
                            <option value="custom">Dias Específicos</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Hora</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={newSchedule.time}
                            onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                        />
                    </div>

                    {(newSchedule.frequency === 'weekly' || newSchedule.frequency === 'custom') && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                {newSchedule.frequency === 'weekly' ? 'Dias da Semana' : 'Escolher Dias (excluir fins de semana, feriados, etc.)'}
                            </label>
                            <div style={styles.checkboxGroup}>
                                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => (
                                    <label key={index} style={styles.dayLabel}>
                                        <input
                                            type="checkbox"
                                            style={styles.checkbox}
                                            checked={newSchedule.days.includes(index + 1)}
                                            onChange={(e) => {
                                                const days = [...newSchedule.days];
                                                if (e.target.checked) {
                                                    days.push(index + 1);
                                                } else {
                                                    const i = days.indexOf(index + 1);
                                                    if (i > -1) days.splice(i, 1);
                                                }
                                                setNewSchedule({ ...newSchedule, days });
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                            {newSchedule.frequency === 'custom' && (
                                <small style={styles.helpText}>
                                    💡 Dica: Selecione apenas os dias em que deseja que as mensagens sejam enviadas.
                                    Por exemplo, exclua sábados e domingos para envios apenas em dias úteis.
                                </small>
                            )}
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Data de Início (opcional)</label>
                        <input
                            type="date"
                            style={styles.input}
                            value={newSchedule.startDate}
                            onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={newSchedule.priority}
                            onChange={(e) => setNewSchedule({ ...newSchedule, priority: e.target.value })}
                        >
                            <option value="normal">Normal</option>
                            <option value="info">Informação</option>
                            <option value="warning">Aviso</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <button type="submit" style={{ ...styles.button, width: '100%' }}>
                        Agendar Mensagens
                    </button>
                </form>

                <div style={styles.form}>
                    <h3>📅 Mensagens Agendadas ({scheduledMessages.length})</h3>

                    {/* Botões de Teste */}
                    <div style={styles.testButtonsContainer}>
                        <h4>🧪 Ferramentas de Teste</h4>
                        <div style={styles.buttonGroup}>
                            <button onClick={testScheduleNow} style={styles.buttonSmall}>
                                🚀 Testar Primeiro Agendamento
                            </button>
                            <button onClick={simulateTimeExecution} style={styles.buttonSmall}>
                                ⏰ Simular Hora
                            </button>
                            <button onClick={() => syncSchedulesWithBackend()} style={styles.buttonSmall}>
                                🔄 Sincronizar Backend
                            </button>
                        </div>
                    </div>

                    {scheduledMessages.length === 0 ? (
                        <p>Nenhuma mensagem agendada ainda.</p>
                    ) : (
                        scheduledMessages.map(schedule => (
                            <div key={schedule.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <strong>{schedule.message.substring(0, 50)}...</strong>
                                    <br />
                                    <small>
                                        Frequência: {schedule.frequency === 'daily' ? 'Diária' :
                                            schedule.frequency === 'weekly' ? 'Semanal' :
                                                schedule.frequency === 'custom' ? 'Dias Específicos' : 'Mensal'} às {schedule.time}
                                        {schedule.days && schedule.days.length > 0 && (
                                            <span> - Dias: {schedule.days.map(d =>
                                                ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d === 7 ? 0 : d]
                                            ).join(', ')}</span>
                                        )}
                                    </small>
                                    <br />
                                    <small>{schedule.contactList.length} contactos</small>
                                    <br />
                                    <small>
                                        Status: {schedule.enabled ? '✅ Ativo' : '⏸️ Pausado'}
                                    </small>
                                </div>
                                <div style={styles.listActions}>
                                    <button
                                        onClick={() => forceScheduleExecution(schedule.id)}
                                        style={{ ...styles.buttonSmall, backgroundColor: '#2196f3' }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => toggleSchedule(schedule.id)}
                                        style={schedule.enabled ? styles.buttonDanger : styles.buttonSmall}
                                    >
                                        {schedule.enabled ? 'Pausar' : 'Ativar'}
                                    </button>
                                    <button
                                        onClick={() => deleteSchedule(schedule.id)}
                                        style={styles.buttonDanger}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>📱 WhatsApp Web API - Sistema Completo</h1>

            <div style={styles.tabContainer}>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'connection' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('connection')}
                >
                    🔗 Conexão
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'contacts' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('contacts')}
                >
                    👥 Contactos
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'schedule' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('schedule')}
                >
                    ⏰ Agendamento
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'logs' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('logs')}
                >
                    📋 Logs
                </button>
            </div>

            {activeTab === 'connection' && renderConnectionTab()}
            {activeTab === 'contacts' && renderContactsTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
            {activeTab === 'logs' && renderLogsTab()}
        </div>
    );
};

export default WhatsAppWebConfig;
