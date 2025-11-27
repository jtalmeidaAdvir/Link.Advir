
const nodemailer = require('nodemailer');

const sendEmailExternos = async (req, res) => {
    console.log('📧 Recebendo requisição de email para externos');
    console.log('📧 Corpo da requisição:', JSON.stringify(req.body, null, 2));
    
    const { emailDestinatario, assunto, texto, remetente } = req.body;

    if (!emailDestinatario || !assunto || !texto) {
        console.error('❌ Dados obrigatórios estão em falta');
        return res.status(400).json({ 
            success: false, 
            error: 'Dados obrigatórios estão em falta.',
            required: ['emailDestinatario', 'assunto', 'texto']
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

        const mailOptions = {
            from: remetente || 'no.reply.advirplan@gmail.com',
            to: emailDestinatario,
            subject: assunto,
            html: texto,
        };

        console.log('📧 Enviando email com as seguintes opções:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado com sucesso:', info.response);
        console.log('✅ Email ID:', info.messageId);

        return res.status(200).json({ 
            success: true, 
            message: 'Email enviado com sucesso!',
            messageId: info.messageId,
            to: emailDestinatario
        });
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao enviar email', 
            details: error.message 
        });
    }
};

module.exports = sendEmailExternos;
