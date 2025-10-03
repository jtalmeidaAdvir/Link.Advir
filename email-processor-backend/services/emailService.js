
const Imap = require('imap');
const { simpleParser } = require('mailparser');

class EmailService {
    constructor() {
        // Garantir que dotenv está carregado
        require('dotenv').config();

        this.config = {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            host: process.env.EMAIL_HOST || 'imap.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 993,
            tls: process.env.EMAIL_TLS === 'true',
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 30000, // 30 segundos
            authTimeout: 30000  // 30 segundos
        };

        // Validar configuração
        if (!this.config.user || !this.config.password) {
            console.error('⚠️ AVISO: EMAIL_USER ou EMAIL_PASSWORD não configurados no .env');
            console.error('   EMAIL_USER:', this.config.user || 'não definido');
            console.error('   EMAIL_PASSWORD:', this.config.password ? '***definido***' : 'não definido');
        } else {
            console.log('✅ Credenciais de email carregadas com sucesso');
        }
    }

    async testConnection() {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.config);

            imap.once('ready', () => {
                console.log('✅ Conexão IMAP estabelecida com sucesso');
                imap.end();
                resolve(true);
            });

            imap.once('error', (err) => {
                console.error('❌ Erro na conexão IMAP:', err);
                reject(err);
            });

            imap.connect();
        });
    }

    async fetchAllRecentEmails(limit = 10) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.config);
            const emails = [];

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Buscar últimos N emails
                    const fetchRange = `${Math.max(1, box.messages.total - limit + 1)}:*`;
                    const fetch = imap.fetch(fetchRange, {
                        bodies: '',
                        struct: true
                    });

                    fetch.on('message', (msg, seqno) => {
                        msg.on('body', (stream, info) => {
                            simpleParser(stream, async (err, parsed) => {
                                if (err) {
                                    console.error('Erro ao parsear email:', err);
                                    return;
                                }
                                emails.push(parsed);
                            });
                        });
                    });

                    fetch.once('error', (err) => {
                        reject(err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.once('end', () => {
                resolve(emails);
            });

            imap.connect();
        });
    }

    async fetchUnreadEmails() {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.config);
            const emails = [];

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    console.log(`📬 Total de emails na INBOX: ${box.messages.total}`);
                    console.log(`📭 Emails não lidos: ${box.messages.unseen}`);

                    // Buscar emails não lidos com anexos nos últimos 7 dias
                    const last7Days = new Date();
                    last7Days.setDate(last7Days.getDate() - 7);
                    const dateStr = last7Days.toISOString().split('T')[0].replace(/-/g, '-');

                    imap.search(['UNSEEN', ['SINCE', dateStr]], (err, results) => {
                        if (err) {
                            console.warn('⚠️ Erro na busca com data, tentando apenas UNSEEN:', err.message);
                            // Fallback: buscar apenas não lidos
                            imap.search(['UNSEEN'], (err2, results2) => {
                                if (err2) {
                                    reject(err2);
                                    return;
                                }
                                continueWithResults(results2);
                            });
                            return;
                        }
                        continueWithResults(results);
                    });

                    function continueWithResults(results) {
                        if (results.length === 0) {
                            console.log('📭 Nenhum email não lido encontrado');
                            console.log('💡 Dica: Marque um email com anexo PDF como "não lido" para testar');
                            imap.end();
                            resolve([]);
                            return;
                        }

                        console.log(`🔍 Processando ${results.length} emails não lidos...`);

                        const fetch = imap.fetch(results, {
                            bodies: '',
                            markSeen: false
                        });

                        fetch.on('message', (msg, seqno) => {
                            msg.on('body', (stream, info) => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error('Erro ao parsear email:', err);
                                        return;
                                    }

                                    parsed.uid = results[emails.length];
                                    emails.push(parsed);

                                    const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
                                    console.log(`   📧 ${parsed.from?.text || 'Desconhecido'} - ${parsed.subject || 'Sem assunto'} ${hasAttachments ? '📎' : ''}`);
                                });
                            });
                        });

                        fetch.once('error', (err) => {
                            console.error('Fetch error:', err);
                            reject(err);
                        });

                        fetch.once('end', () => {
                            console.log(`✅ Fetch concluído - ${emails.length} emails carregados`);
                            imap.end();
                        });
                    }
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.once('end', () => {
                resolve(emails);
            });

            imap.connect();
        });
    }

    async markAsRead(uid) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.config);

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    imap.addFlags(uid, ['\\Seen'], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(true);
                        }
                        imap.end();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.connect();
        });
    }
}

module.exports = new EmailService();
