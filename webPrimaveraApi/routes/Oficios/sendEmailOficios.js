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
            service: 'gmail',
            auth: {
                user: 'noreply.advir@gmail.com',
                pass: 'ihpgedswadmqtceh', // Usar vari�vel de ambiente
            },
        });

        const mailOptions = {
            from: remetente || 'noreply.advir@gmail.com',
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




