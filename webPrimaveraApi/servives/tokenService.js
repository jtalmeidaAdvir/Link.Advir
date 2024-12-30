const nodemailer = require('nodemailer');

async function sendEmail(req, res) {
    const { emailDestinatario, dadosIntervencao } = req.body;  // Recebe os dados da requisição

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'adviremailtestes@gmail.com',
                pass: 'hpfdapdpacvcdnks',  // Lembre-se de usar variáveis de ambiente para segurança
            },
        });

        const mailOptions = {
            from: 'adviremailtestes@gmail.com',
            to: emailDestinatario,
            subject: `Nova Intervenção: ${dadosIntervencao.processoID} / intervencaoID`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #004580; line-height: 1.5; ">
                    <div style=" padding: 10px; color: #fff; display: flex; align-items: center;">
                        <div>
                            <h2 style=" color:#004580; text-align: center;">Advir Support Space</h2>
                        </div>
                    </div>
                    <div style="padding: 15px; border: 1px solid #004580;">
                        <p><strong>Caro(a) Cliente, </strong></p>
                        <p>${dadosIntervencao.clienteFinal || 'Não especificado'}</p>

                        <p>Informamos que, o ticket ${dadosIntervencao.processoID} aberto no dia ${dadosIntervencao.DataHoraInicio} foi intervencionado pelo 
                        técnico ${dadosIntervencao.tecnico}</p>
                        
                        <hr>
                        <p><strong>Intervenção:</strong></p>
                        <p>${dadosIntervencao.descricaoResposta}</p>
                        <p>A mesma intervenção foi colocada como ${dadosIntervencao.estado} no dia ${dadosIntervencao.DataHoraFim}</p>

                        <h5><strong>Se precisar de alguma informação adicional não hesite em contactar.</strong></h5>
                        <h5><strong>Email:</strong> support@advir.pt</h5> 
                        <h5><strong>Tel.:</strong> +351 253 176 493</h5>
                    </div>
                    <div style="background-color: #f7f7f7; padding: 10px; text-align: center; font-size: 12px; color: #004580;">
                        <p>Advir Plan Consultoria</p>
                    </div>
                    <img src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png" alt="Logo Advir" style="height: 40px; width: auto; margin-right: 15px;">
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso:', info.response);

        return res.status(200).json({ message: 'Email enviado com sucesso!', response: info.response });
    } catch (error) {
        console.error('Erro ao enviar email:', error.message);
        return res.status(500).json({ error: 'Erro ao enviar o email' });
    }
}

module.exports = sendEmail;
