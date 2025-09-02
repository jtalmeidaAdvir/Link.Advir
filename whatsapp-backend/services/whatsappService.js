
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isClientReady = false;
        this.qrCodeData = null;
        this.clientStatus = 'disconnected';
        this.activeConversations = new Map();
        this.userStates = {};
    }

    async initialize() {
        if (this.client) {
            console.log('Cliente WhatsApp já existe, destruindo primeiro...');
            try {
                await this.client.destroy();
            } catch (error) {
                console.log('Erro ao destruir cliente anterior:', error.message);
            }
            this.client = null;
            this.isClientReady = false;
            this.clientStatus = 'disconnected';
            this.qrCodeData = null;
        }

        try {
            const isProduction = process.env.NODE_ENV === 'production';

            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './whatsapp-session'
                }),
                puppeteer: {
                    headless: true,
                    executablePath: isProduction ? '/usr/bin/chromium-browser' : undefined,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            this.client.on('qr', (qr) => {
                this.qrCodeData = qr;
                this.clientStatus = 'qr_received';
                console.log('📱 QR Code recebido!');
                qrcode.generate(qr, { small: true });
            });

            this.client.on('ready', () => {
                console.log('WhatsApp Web Cliente conectado!');
                this.isClientReady = true;
                this.clientStatus = 'ready';
                this.qrCodeData = null;
            });

            this.client.on('authenticated', () => {
                console.log('WhatsApp Web autenticado!');
                this.clientStatus = 'authenticated';
            });

            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp Web desconectado:', reason);
                this.isClientReady = false;
                this.clientStatus = 'disconnected';
                setTimeout(() => this.initialize(), 5000);
            });

            this.client.on('auth_failure', (msg) => {
                console.error('Falha na autenticação:', msg);
                this.clientStatus = 'auth_failure';
            });

            await this.client.initialize();
        } catch (error) {
            console.error('Erro ao inicializar cliente WhatsApp:', error);
            this.client = null;
            this.isClientReady = false;
            this.clientStatus = 'error';
            this.qrCodeData = null;
        }
    }

    getStatus() {
        return {
            status: this.clientStatus,
            isReady: this.isClientReady,
            qrCode: this.qrCodeData,
            hasQrCode: !!this.qrCodeData,
            timestamp: new Date().toISOString()
        };
    }

    async sendMessage(phoneNumber, message) {
        if (!this.isClientReady || !this.client) {
            throw new Error('WhatsApp Web não está conectado');
        }

        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (!formattedNumber.includes('@')) {
            formattedNumber = formattedNumber + '@c.us';
        }

        const isValidNumber = await this.client.isRegisteredUser(formattedNumber);
        if (!isValidNumber) {
            throw new Error('Número não está registrado no WhatsApp');
        }

        return await this.client.sendMessage(formattedNumber, message);
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.destroy();
            }
            this.client = null;
            this.isClientReady = false;
            this.clientStatus = 'disconnected';
            this.qrCodeData = null;
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            this.client = null;
            this.isClientReady = false;
            this.clientStatus = 'disconnected';
            this.qrCodeData = null;
        }
    }
}

module.exports = WhatsAppService;
