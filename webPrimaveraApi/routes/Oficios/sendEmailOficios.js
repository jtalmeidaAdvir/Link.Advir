//sendEmailOficios.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const sendmailoficios = async (req, res) => {
    console.log('Corpo da requisi��o:', req.body);

    const { emailCC,emailDestinatario, assunto, texto, remetente, anexos } = req.body;

    if (!emailDestinatario || !assunto || !texto) {
        return res.status(400).send('Dados obrigat�rios est�o em falta.');
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'Office365',
            host: 'smtp.office365.com', // Servidor SMTP do Office365
            port: 587,  // Porta para TLS
            secure: false, // Não usar SSL, mas usar TLS
            auth: {
                user: 'oficio@jpaconstrutora.com', // Novo e-mail de envio
                pass: 'K%355647331570on', // Nova senha
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });

        const mailOptions = {
            from: remetente || 'oficio@jpaconstrutora.com',
            to: emailDestinatario,
            cc: emailCC, 
            replyTo: emailCC.split(',')[0].trim(), // Pega apenas o primeiro email
            subject: assunto,
            html: `
                <div>
                    <p>${texto}</p>
                    
                </div>
            `,
            attachments: anexos?.map((anexo) => ({
                filename: anexo.name,
                content: Buffer.from(anexo.content, 'base64'),
            })),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso:', info.response);
        return res.status(200).send('Email enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar email:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = sendmailoficios;

