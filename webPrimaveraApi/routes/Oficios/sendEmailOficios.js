//sendEmailOficios.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const sendmailoficios = async (req, res) => {
    console.log('Corpo da requisição:', req.body);

    const { emailDestinatario, assunto, texto, remetente, anexos } = req.body;

    if (!emailDestinatario || !assunto || !texto) {
        return res.status(400).send('Dados obrigatórios estão em falta.');
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.advir@gmail.com',
                pass: 'ihpgedswadmqtceh', // Usar variável de ambiente
            },
        });

        const mailOptions = {
            from: remetente || 'noreply.advir@gmail.com',
            to: emailDestinatario,
            replyTo: 'jpvale@advir.pt',
            subject: assunto,
            html: `
                <div style="font-family: Arial, sans-serif; color: #004580; line-height: 1.5;">
                    <h2 style="color: #004580; text-align: center;">Advir Support Space</h2>
                    <p>${texto}</p>
                    <p>Com os melhores cumprimentos,</p>
                    <p>${remetente || 'Advir Consultoria'}</p>
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




