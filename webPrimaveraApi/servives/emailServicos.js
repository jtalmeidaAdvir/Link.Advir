const nodemailer = require('nodemailer');
const axios = require('axios');

const sendEmail = async (req, res) => {
    console.log('Corpo da requisição:', req.body); // Adicione este log
    const { emailDestinatario, Pedido, dadosIntervencao } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.advir@gmail.com',
                pass: 'ihpgedswadmqtceh',
            },
        });


        const mailOptions = {
            from: 'noreply.advir@gmail.com',
            to: `${emailDestinatario}`,
            subject: `Nova Intervenção: ${Pedido}  ${dadosIntervencao.processoID}/${dadosIntervencao.NumIntervencao}`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Advir Support Space</h1>
                        </div>
                        
                        <!-- Body -->
                        <div style="padding: 30px;">
                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">Caro(a) Cliente,</p>
                            <p style="margin: 0 0 20px 0; color: #374151;">${dadosIntervencao.Contacto || 'Cliente Indiferenciado'}</p>
                            
                            <p style="margin: 0 0 30px 0; color: #374151; line-height: 1.6;">
                                Informamos que o ticket <strong>${dadosIntervencao.processoID}</strong> aberto no dia <strong>${dadosIntervencao.HoraInicioPedido}</strong> foi intervencionado pelo técnico <strong>${dadosIntervencao.tecnico}</strong>.
                            </p>
                            
                            <!-- Detalhes da Intervenção -->
                            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px;">Detalhes da Intervenção:</h3>
                                
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 25%;">Tipo:</td>
                                        <td style="padding: 8px 0; color: #6b7280;">${dadosIntervencao.TipoIntervencao || 'Remoto'}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #374151;">Duração:</td>
                                        <td style="padding: 8px 0; color: #6b7280;">${dadosIntervencao.Duracao || '0h 1min'}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #374151;">Início:</td>
                                        <td style="padding: 8px 0; color: #6b7280;">${dadosIntervencao.HoraInicioIntervencao || dadosIntervencao.HoraInicioPedido}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <td style="padding: 8px 0; font-weight: bold; color: #374151;">Fim:</td>
                                        <td style="padding: 8px 0; color: #6b7280;">${dadosIntervencao.HoraFimIntervencao || dadosIntervencao.HoraInicioIntervencao}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Descrição da Intervenção -->
                            <div style="margin: 20px 0;">
                                <h3 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 16px;">Descrição da Intervenção:</h3>
                                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                    <p style="margin: 0; color: #374151; line-height: 1.6;">${dadosIntervencao.descricaoResposta || 'Sem descrição disponível'}</p>
                                </div>
                            </div>
                            
                            <!-- Informações do Contrato -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">Informações do Contrato:</h3>
                                ${dadosIntervencao.contratoInfo ? `
                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                                        <tr style="border-bottom: 1px solid #f59e0b;">
                                            <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Horas Contratadas:</td>
                                            <td style="padding: 8px 0; color: #92400e;">${dadosIntervencao.contratoInfo.horasContratadas || 'N/A'}</td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid #f59e0b;">
                                            <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Horas Utilizadas:</td>
                                            <td style="padding: 8px 0; color: #92400e;">${dadosIntervencao.contratoInfo.horasUtilizadas || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Horas Livres:</td>
                                            <td style="padding: 8px 0; color: #92400e; font-weight: bold;">${dadosIntervencao.contratoInfo.horasLivres || 'N/A'}</td>
                                        </tr>
                                    </table>
                                ` : ''}
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    A intervenção foi colocada como "<strong>${dadosIntervencao.Estadointer}</strong>" no dia ${dadosIntervencao.HoraInicioIntervencao || new Date().toLocaleDateString('pt-PT')}.
                                </p>
                                <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px; font-weight: bold;">
                                    ${dadosIntervencao.contratoInfo ?
                    'Verifique acima as horas livres disponíveis no seu contrato.' :
                    'Consulte o seu contrato para verificar as horas livres disponíveis.'
                }
                                </p>
                            </div>
                            
                            <!-- Contactos -->
                            <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #0c4a6e; font-weight: bold;">Se precisar de alguma informação adicional não hesite em contactar:</p>
                                <p style="margin: 5px 0; color: #0c4a6e;"><strong>Email:</strong> support@advir.pt</p>
                                <p style="margin: 5px 0; color: #0c4a6e;"><strong>Tel.:</strong> +351 253 176 493</p>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">Advir Plan Consultoria</p>
                        </div>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso:', info.response);
        return res.status(200).send('Email enviado com sucesso!'); // Retorne uma resposta ao cliente
    } catch (error) {
        console.error('Erro ao enviar email2:', error.message);
        return res.status(500).send('Erro ao enviar email'); // Retorne um erro ao cliente
    }
}

module.exports = sendEmail;