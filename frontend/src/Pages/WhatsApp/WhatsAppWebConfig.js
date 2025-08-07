
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

    useEffect(() => {
        checkStatus();
        loadScheduledMessages();
        loadContactLists();
        loadLogs();
        loadStats();
        // Verificar status a cada 3 segundos
        const interval = setInterval(() => {
            checkStatus();
            if (activeTab === 'logs') {
                loadLogs();
                loadStats();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const checkStatus = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/whatsapp-web/status');
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

            const response = await fetch(`http://localhost:5000/api/whatsapp-web/logs?${params}`);
            const data = await response.json();
            setLogs(data.logs || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/whatsapp-web/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const clearLogs = async (scheduleId = null) => {
        try {
            const url = scheduleId 
                ? `http://localhost:5000/api/whatsapp-web/logs?scheduleId=${scheduleId}`
                : 'http://localhost:5000/api/whatsapp-web/logs';
                
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
            const response = await fetch('http://localhost:5000/api/whatsapp-web/connect', {
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
            const response = await fetch('http://localhost:5000/api/whatsapp-web/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('WhatsApp Web desconectado com sucesso!');
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

    const handleTestMessage = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await fetch('http://localhost:5000/api/whatsapp-web/send', {
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
            .filter(contact => contact.length > 0);

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

    const handleCreateSchedule = (e) => {
        e.preventDefault();
        if (!newSchedule.message || newSchedule.contactList.length === 0) {
            alert('Mensagem e lista de contactos são obrigatórios');
            return;
        }

        const schedule = {
            id: Date.now(),
            ...newSchedule,
            createdAt: new Date().toISOString(),
            lastSent: null,
            nextSend: calculateNextSend()
        };

        const updatedSchedules = [...scheduledMessages, schedule];
        saveScheduledMessages(updatedSchedules);
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
        alert('Agendamento criado com sucesso!');
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
                            <div style={{...styles.statCard, backgroundColor: '#e3f2fd'}}>
                                <span>ℹ️ Info: {stats.logsByType.info}</span>
                            </div>
                            <div style={{...styles.statCard, backgroundColor: '#e8f5e8'}}>
                                <span>✅ Sucesso: {stats.logsByType.success}</span>
                            </div>
                            <div style={{...styles.statCard, backgroundColor: '#fff3e0'}}>
                                <span>⚠️ Avisos: {stats.logsByType.warning}</span>
                            </div>
                            <div style={{...styles.statCard, backgroundColor: '#ffebee'}}>
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
                            onChange={(e) => setLogFilter({...logFilter, scheduleId: e.target.value})}
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
                            onChange={(e) => setLogFilter({...logFilter, type: e.target.value})}
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
                            onChange={(e) => setLogFilter({...logFilter, limit: parseInt(e.target.value)})}
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
                        <button onClick={() => clearLogs()} style={{...styles.button, backgroundColor: '#f44336'}}>
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
            fontFamily: 'Arial, sans-serif'
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

            {status.hasQrCode && status.qrCode && (
                <div style={styles.qrContainer}>
                    <h3>📱 Escaneie este QR Code com seu WhatsApp:</h3>
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(status.qrCode)}`}
                        alt="QR Code WhatsApp"
                        style={styles.qrCode}
                    />
                    <p><strong>⏱️ Aguardando escaneamento...</strong></p>
                    <p>O QR Code é atualizado automaticamente a cada 3 segundos</p>
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
                            onChange={(e) => setTestMessage({...testMessage, to: e.target.value})}
                            placeholder="351912345678 (com código do país)"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mensagem *</label>
                        <textarea
                            style={styles.textarea}
                            value={testMessage.message}
                            onChange={(e) => setTestMessage({...testMessage, message: e.target.value})}
                            placeholder="Digite sua mensagem aqui..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={testMessage.priority}
                            onChange={(e) => setTestMessage({...testMessage, priority: e.target.value})}
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
                            onChange={(e) => setNewContactList({...newContactList, name: e.target.value})}
                            placeholder="Ex: Clientes VIP, Equipa Vendas..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Contactos (um por linha) *</label>
                        <textarea
                            style={{...styles.textarea, minHeight: '120px'}}
                            value={newContactList.contacts}
                            onChange={(e) => setNewContactList({...newContactList, contacts: e.target.value})}
                            placeholder="351912345678&#10;351923456789&#10;351934567890"
                            required
                        />
                        <small>Insira um número por linha, com código do país (ex: 351912345678)</small>
                    </div>

                    <button type="submit" style={{...styles.button, width: '100%'}}>
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
                            onChange={(e) => setNewSchedule({...newSchedule, message: e.target.value})}
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
                                setNewSchedule({...newSchedule, contactList: list ? list.contacts : []});
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
                            onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value})}
                        >
                            <option value="daily">Diariamente</option>
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
                            onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                        />
                    </div>

                    {newSchedule.frequency === 'weekly' && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Dias da Semana</label>
                            <div style={styles.checkboxGroup}>
                                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, index) => (
                                    <label key={index}>
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
                                                setNewSchedule({...newSchedule, days});
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Data de Início (opcional)</label>
                        <input
                            type="date"
                            style={styles.input}
                            value={newSchedule.startDate}
                            onChange={(e) => setNewSchedule({...newSchedule, startDate: e.target.value})}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={newSchedule.priority}
                            onChange={(e) => setNewSchedule({...newSchedule, priority: e.target.value})}
                        >
                            <option value="normal">Normal</option>
                            <option value="info">Informação</option>
                            <option value="warning">Aviso</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <button type="submit" style={{...styles.button, width: '100%'}}>
                        Agendar Mensagens
                    </button>
                </form>

                <div style={styles.form}>
                    <h3>📅 Mensagens Agendadas ({scheduledMessages.length})</h3>
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
                                                   schedule.frequency === 'weekly' ? 'Semanal' : 'Mensal'} às {schedule.time}
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
