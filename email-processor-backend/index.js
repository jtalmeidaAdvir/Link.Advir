
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const emailService = require('./services/emailService');
const pdfProcessor = require('./services/pdfProcessor');
const pedidoCreator = require('./services/pedidoCreator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Estado do processamento
let processingStatus = {
    isRunning: false,
    lastRun: null,
    emailsProcessed: 0,
    errors: []
};

// Função principal de processamento
async function processEmails() {
    if (processingStatus.isRunning) {
        console.log('⏳ Processamento já está em execução...');
        return;
    }

    processingStatus.isRunning = true;
    processingStatus.lastRun = new Date();
    console.log('📧 Iniciando processamento de emails...');

    try {
        // 1. Conectar ao email e buscar novos emails não lidos
        const emails = await emailService.fetchUnreadEmails();
        console.log(`📨 Encontrados ${emails.length} emails não lidos`);

        for (const email of emails) {
            try {
                console.log(`\n📩 Processando email de: ${email.from.text}`);
                console.log(`   Assunto: ${email.subject}`);

                // 2. Verificar se tem anexos PDF
                const pdfAttachments = email.attachments.filter(att =>
                    att.contentType === 'application/pdf' ||
                    att.filename?.toLowerCase().endsWith('.pdf')
                );

                if (pdfAttachments.length === 0) {
                    console.log('   ⚠️ Email sem anexos PDF, marcando como lido');
                    await emailService.markAsRead(email.uid);
                    continue;
                }

                // 3. Processar cada PDF
                for (const pdfAttachment of pdfAttachments) {
                    console.log(`   📄 Processando PDF: ${pdfAttachment.filename}`);

                    // 4. Extrair texto do PDF
                    const pdfData = await pdfProcessor.extractPdfData(pdfAttachment.content);
                    console.log('   ✅ Texto extraído do PDF');

                    // 5. Parsear informações estruturadas
                    const parsedData = pdfProcessor.parseOrdemTrabalho(pdfData.text);
                    console.log('   ✅ Dados parseados:', JSON.stringify(parsedData, null, 2));

                    // Validar dados essenciais
                    if (!parsedData.numeroOrdem) {
                        console.warn('   ⚠️ Número de ordem não encontrado no PDF');
                    }
                    if (!parsedData.cliente.nome && !parsedData.fornecedor.nome) {
                        console.warn('   ⚠️ Nenhum cliente ou fornecedor identificado');
                    }

                    // 6. Criar pedido no sistema
                    const pedidoResult = await pedidoCreator.createPedido({
                        ...parsedData,
                        emailOrigem: email.from.text,
                        assuntoEmail: email.subject,
                        dataRecebimento: email.date,
                        anexoOriginal: pdfAttachment.filename,
                        pdfTextoCompleto: pdfData.text // Guardar texto completo para debug
                    });

                    if (pedidoResult.warning) {
                        console.warn(`   ⚠️ ${pedidoResult.warning}`);
                    }
                    console.log('   ✅ Pedido criado:', pedidoResult.pedidoId || 'ID não confirmado');
                    console.log('   📝 Mensagem:', pedidoResult.message);
                    processingStatus.emailsProcessed++;

                    // 7. Salvar PDF como anexo do pedido
                    if (pedidoResult.pedidoId && pdfAttachment.content) {
                        try {
                            const FormData = require('form-data');
                            const axios = require('axios');
                            const formData = new FormData();

                            formData.append('arquivo', pdfAttachment.content, {
                                filename: pdfAttachment.filename,
                                contentType: 'application/pdf'
                            });

                            const backendUrl = process.env.BACKEND_API_URL || 'https://backend.advir.pt';

                            console.log(`   📤 Enviando PDF para ${backendUrl}/api/anexo-pedido/upload-temp`);

                            const anexoResponse = await axios.post(
                                `${backendUrl}/api/anexo-pedido/upload-temp`,
                                formData,
                                {
                                    headers: formData.getHeaders(),
                                    timeout: 30000
                                }
                            );

                            if (anexoResponse.status === 200 || anexoResponse.status === 201) {
                                const { arquivo_temp } = anexoResponse.data;

                                console.log('   ✅ PDF carregado, associando ao pedido...');

                                // Associar anexo ao pedido
                                await axios.post(
                                    `${backendUrl}/api/anexo-pedido/associar-temp`,
                                    {
                                        pedido_id: String(pedidoResult.pedidoId),
                                        anexos_temp: [arquivo_temp]
                                    },
                                    {
                                        headers: { 'Content-Type': 'application/json' },
                                        timeout: 30000
                                    }
                                );
                                console.log('   📎 PDF anexado ao pedido com sucesso');
                            }
                        } catch (anexoError) {
                            console.warn('   ⚠️ Não foi possível anexar PDF:', anexoError.message);
                            if (anexoError.response) {
                                console.warn('   Status:', anexoError.response.status);
                                console.warn('   Data:', anexoError.response.data);
                            }
                        }
                    }
                }

                // 8. Marcar email como lido
                await emailService.markAsRead(email.uid);
                console.log('   ✉️ Email marcado como processado');

            } catch (error) {
                console.error(`   ❌ Erro ao processar email:`, error.message);
                processingStatus.errors.push({
                    email: email.from.text,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        }

        console.log('\n✅ Processamento concluído!');

    } catch (error) {
        console.error('❌ Erro no processamento de emails:', error);
        processingStatus.errors.push({
            error: error.message,
            timestamp: new Date()
        });
    } finally {
        processingStatus.isRunning = false;
    }
}

// Agendar verificação de emails a cada 5 minutos
cron.schedule('*/5 * * * *', () => {
    console.log('\n⏰ Executando verificação agendada de emails...');
    processEmails();
});

// Rotas da API
app.get('/status', (req, res) => {
    res.json(processingStatus);
});

app.post('/process-now', async (req, res) => {
    console.log('🔄 Processamento manual iniciado via API');
    processEmails();
    res.json({ message: 'Processamento iniciado', status: processingStatus });
});

app.get('/test-connection', async (req, res) => {
    try {
        await emailService.testConnection();
        res.json({ success: true, message: 'Conexão com email OK' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/test-primavera-auth', async (req, res) => {
    try {
        const primaveraAuth = require('./services/primaveraAuth');
        const token = await primaveraAuth.getToken();
        res.json({
            success: true,
            message: 'Token Primavera obtido com sucesso',
            token: token.substring(0, 20) + '...' // Mostra apenas início do token
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/list-recent-emails', async (req, res) => {
    try {
        const emails = await emailService.fetchAllRecentEmails(20);
        const emailList = emails.map(email => ({
            from: email.from?.text,
            subject: email.subject,
            date: email.date,
            hasAttachments: email.attachments?.length > 0,
            attachments: email.attachments?.map(a => a.filename),
            hasPDF: email.attachments?.some(a =>
                a.contentType === 'application/pdf' ||
                a.filename?.toLowerCase().endsWith('.pdf')
            )
        }));
        res.json({ success: true, count: emails.length, emails: emailList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/mark-email-unread/:index', async (req, res) => {
    try {
        const { index } = req.params;
        res.json({
            success: false,
            message: 'Por favor, marque manualmente o email como não lido no Gmail para testar'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Email Processor Backend rodando na porta ${PORT}`);
    console.log(`📧 Monitorando: ${process.env.EMAIL_USER}`);
    console.log(`⏰ Verificação agendada a cada 5 minutos`);

    // Processar emails na inicialização
    setTimeout(() => {
        console.log('\n🔄 Executando primeira verificação...');
        processEmails();
    }, 5000);
});
