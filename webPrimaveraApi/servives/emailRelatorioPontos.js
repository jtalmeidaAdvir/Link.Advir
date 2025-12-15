const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Envia email com relatório de pontos para o responsável da obra
 * @param {Object} req - Request com obra e colaboradores
 * @param {Object} res - Response object
 */
const sendEmailRelatorioPontos = async (req, res) => {
    console.log('📧 Corpo da requisição de relatório de pontos:', JSON.stringify(req.body, null, 2));
    const {
        emailDestinatario,
        nomeResponsavel,
        obraNome,
        obraCodigo,
        obraLocalizacao,
        colaboradores,
        data,
        totalColaboradores
    } = req.body;

    console.log('📧 Email destinatário:', emailDestinatario);
    console.log('📧 Obra:', obraNome);
    console.log('📧 Total colaboradores:', totalColaboradores);

    if (!emailDestinatario || !obraNome || !colaboradores || colaboradores.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Dados incompletos para envio de email'
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'no.reply.advirplan@gmail.com',
                pass: 'jkma hfwy bkxp dfzk',
            },
        });

        // Formatar data para português
        const dataFormatada = new Date(data).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Gerar linhas da tabela de colaboradores
        const linhasColaboradores = colaboradores.map((colab, index) => {
            const horaEntradaFormatada = new Date(colab.horaEntrada).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = colab.estaAtivo
                ? '<span style="background-color: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">ATIVO</span>'
                : '<span style="background-color: #6b7280; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">SAIU</span>';

            const tempoFormatado = `${colab.tempoTrabalhadoHoras.toFixed(2)}h`;

            return `
                <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                    <td style="padding: 12px 8px; color: #374151;">${colab.nome}</td>
                    <td style="padding: 12px 8px; color: #374151; text-align: center;">${horaEntradaFormatada}</td>
                    <td style="padding: 12px 8px; color: #374151; text-align: center; font-weight: bold;">${tempoFormatado}</td>
                    <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                </tr>
            `;
        }).join('');

        const mailOptions = {
            from: 'no.reply.advirplan@gmail.com',
            to: emailDestinatario,
            subject: `Relatório de Assiduidade - ${obraNome} (${dataFormatada})`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 25px; text-align: center;">
                            <h1 style="margin: 0 0 10px 0; font-size: 26px; font-weight: bold;">Relatório de Assiduidade</h1>
                            <p style="margin: 0; font-size: 14px; opacity: 0.9;">${dataFormatada}</p>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px;">
                            <p style="margin: 0 0 10px 0; font-size: 16px; color: #1e3a8a;">
                                Caro(a) <strong>${nomeResponsavel || 'Responsável'}</strong>,
                            </p>

                            <p style="margin: 0 0 25px 0; color: #374151; line-height: 1.6;">
                                Segue o relatório de assiduidade dos colaboradores que registaram pontos na obra.
                            </p>

                            <!-- Detalhes da Obra -->
                            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 18px;">Informações da Obra</h3>

                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr style="border-bottom: 1px solid #bae6fd;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e; width: 30%;">Nome da Obra:</td>
                                        <td style="padding: 8px 0; color: #075985;">${obraNome}</td>
                                    </tr>
                                    ${obraCodigo ? `
                                    <tr style="border-bottom: 1px solid #bae6fd;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e;">Código:</td>
                                        <td style="padding: 8px 0; color: #075985;">${obraCodigo}</td>
                                    </tr>
                                    ` : ''}
                                    ${obraLocalizacao ? `
                                    <tr style="border-bottom: 1px solid #bae6fd;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e;">Localização:</td>
                                        <td style="padding: 8px 0; color: #075985;">${obraLocalizacao}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e;">Total de Colaboradores:</td>
                                        <td style="padding: 8px 0; color: #075985; font-weight: bold; font-size: 18px;">${totalColaboradores}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Tabela de Colaboradores -->
                            <div style="margin: 25px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px;">Registos de Pontos</h3>

                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                                        <thead>
                                            <tr style="background-color: #1e3a8a; color: white;">
                                                <th style="padding: 12px 8px; text-align: left; font-weight: bold;">Colaborador</th>
                                                <th style="padding: 12px 8px; text-align: center; font-weight: bold;">Entrada</th>
                                                <th style="padding: 12px 8px; text-align: center; font-weight: bold;">Tempo Trabalhado</th>
                                                <th style="padding: 12px 8px; text-align: center; font-weight: bold;">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${linhasColaboradores}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Nota Informativa -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>Nota:</strong> Este relatório inclui apenas os colaboradores que registaram ponto de entrada na obra no dia ${dataFormatada}.
                                    O tempo trabalhado é calculado até ao momento do envio deste email.
                                </p>
                            </div>

                            <!-- Contactos -->
                            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #334155; font-weight: bold;">Em caso de dúvidas ou incorreções, contacte:</p>
                                <p style="margin: 5px 0; color: #475569;"><strong>Email:</strong> support@advir.pt</p>
                                <p style="margin: 5px 0; color: #475569;"><strong>Tel.:</strong> +351 253 176 493</p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Este email foi gerado automaticamente pelo sistema Link.Advir</p>
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">Advir Plan Consultoria - Sistema de Gestão de Assiduidade</p>
                        </div>
                    </div>
                </div>
            `,
        };

        console.log('📧 Enviando email de relatório de pontos:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de relatório enviado com sucesso:', info.response);
        console.log('✅ Email ID:', info.messageId);

        return res.status(200).json({
            success: true,
            message: 'Email de relatório enviado com sucesso!',
            messageId: info.messageId,
            to: emailDestinatario,
            obraNome: obraNome,
            totalColaboradores: totalColaboradores
        });
    } catch (error) {
        console.error('❌ Erro ao enviar email de relatório:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Erro ao enviar email de relatório',
            details: error.message
        });
    }
}

module.exports = sendEmailRelatorioPontos;
