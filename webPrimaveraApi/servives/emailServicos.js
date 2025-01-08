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
                <div style="font-family: Arial, sans-serif; color: #004580; line-height: 1.5;">
                    <div style="padding: 10px; color: #fff; display: flex; align-items: center;">
                        <div>
                            <h2 style="color:#004580; text-align: center;">Advir Support Space</h2>
                        </div>
                    </div>
                    <div style="padding: 15px; border: 1px solid #004580;">
                        <p><strong>Caro(a) Cliente, </strong></p>
                        <p>${dadosIntervencao.Contacto || 'Não especificado'}</p>
                        <p>Informamos que, o ticket ${dadosIntervencao.processoID} aberto no dia ${dadosIntervencao.HoraInicioPedido} foi intervencionado pelo 
                        técnico ${dadosIntervencao.tecnico}.</p>
                        <hr>
                        <p><strong>Intervenção:</strong></p>
                        <p>${dadosIntervencao.descricaoResposta}</p>
                        <p>A mesma intervenção foi colocada como "${dadosIntervencao.Estadointer}" no dia  ${dadosIntervencao.HoraInicioIntervencao}</p>
                        <h5><strong>Se precisar de alguma informação adicional não hesite em contactar.</strong></h5>
                        <h5><strong>Email:</strong> support@advir.pt</h5> 
                        <h5><strong>Tel.:</strong> +351 253 176 493</h5>
                    </div>
                    <div style="background-color: #f7f7f7; padding: 10px; text-align: center; font-size: 12px; color: #004580;">
                        <p>Advir Plan Consultoria</p>
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