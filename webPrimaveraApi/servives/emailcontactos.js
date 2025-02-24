const nodemailer = require('nodemailer');
const axios = require('axios');

const sendEmailContactForm = async (req, res) => {
    console.log('Corpo da requisição:', req.body); // Adicione este log
    const {nome, sobrenome, email, mensagem  } = req.body;

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
                to: 'info@advir.pt',
                subject: `Novo Contacto: ${nome} ${sobrenome}`,
                html: `
                <div style="font-family: Arial, sans-serif; color: #004580; line-height: 1.5;">
                    <div style="padding: 10px; color: #fff; display: flex; align-items: center;">
                        <div>
                            <h2 style="color:#004580; text-align: center;">Advir Support Space</h2>
                        </div>
                    </div>
                    <div style="padding: 15px; border: 1px solid #004580;">
                        <p>Email: ${email || 'Não especificado'}</p>
                        <p>Mensagem: ${mensagem || 'Não especificado'}</p>
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

module.exports = sendEmailContactForm;