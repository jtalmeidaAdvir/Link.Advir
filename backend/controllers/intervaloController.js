const Intervalo  = require('../models/intervalo');
const RegistoPonto = require('../models/registoPonto');

const iniciarIntervalo = async (req, res) => {
    const { id: userId } = req.user;

    try {
        const dataAtual = new Date().toISOString().split('T')[0];
        
        const registoPonto = await RegistoPonto.findOne({
            where: { user_id: userId, data: dataAtual }
        });

        if (!registoPonto) {
            return res.status(404).json({ message: "Registo de ponto não encontrado para hoje." });
        }

        const intervaloAberto = await Intervalo.findOne({
            where: { registoPontoId: registoPonto.id, horaRetorno: null }
        });

        if (intervaloAberto) {
            return res.status(400).json({ message: "Já existe um intervalo aberto." });
        }

        const horaPausa = new Date().toLocaleTimeString('en-GB', { hour12: false });
        await Intervalo.create({
            horaPausa,  // Grava `HH:mm:ss` diretamente
            registoPontoId: registoPonto.id
        });

        res.status(201).json({ message: "Intervalo iniciado com sucesso." });
    } catch (error) {
        console.error("Erro ao iniciar intervalo:", error);
        res.status(500).json({ message: "Erro ao iniciar intervalo." });
    }
};




const finalizarIntervalo = async (req, res) => {
    const { id: userId } = req.user;
    try {
        const dataAtual = new Date().toISOString().split('T')[0];

        const registoPonto = await RegistoPonto.findOne({
            where: { user_id: userId, data: dataAtual }
        });

        if (!registoPonto) {
            return res.status(404).json({ message: "Registo de ponto não encontrado para hoje." });
        }

        const intervaloAberto = await Intervalo.findOne({
            where: { registoPontoId: registoPonto.id, horaRetorno: null }
        });

        if (!intervaloAberto) {
            return res.status(400).json({ message: "Nenhum intervalo aberto para finalizar." });
        }

        // Atualiza `horaRetorno` com o horário atual no formato `HH:mm:ss`
        intervaloAberto.horaRetorno = new Date().toLocaleTimeString('en-GB', { hour12: false });
        await intervaloAberto.save();

        const horaPausaString = intervaloAberto.horaPausa;
        const horaRetornoString = intervaloAberto.horaRetorno;

        // Logs para verificar `horaPausa` e `horaRetorno` após a leitura da BD
        console.log("Data Atual:", dataAtual);
        console.log("Hora Pausa (string após leitura):", horaPausaString);
        console.log("Hora Retorno (string):", horaRetornoString);

        if (!horaPausaString || !horaRetornoString) {
            console.error("Erro ao calcular tempo de intervalo: horaPausa ou horaRetorno inválido.");
            return res.status(500).json({ message: "Erro ao calcular tempo de intervalo: hora inválida." });
        }

        const horaPausa = new Date(`${dataAtual}T${horaPausaString}`);
        const horaRetorno = new Date(`${dataAtual}T${horaRetornoString}`);

        console.log("Hora Pausa (Date):", horaPausa);
        console.log("Hora Retorno (Date):", horaRetorno);

        if (isNaN(horaPausa.getTime()) || isNaN(horaRetorno.getTime())) {
            console.error("Erro ao calcular tempo de intervalo: horário inválido.");
            return res.status(500).json({ message: "Erro ao calcular tempo de intervalo: horário inválido." });
        }

        const tempoIntervaloHoras = (horaRetorno - horaPausa) / (1000 * 60 * 60);
        console.log("Tempo de Intervalo Calculado (horas):", tempoIntervaloHoras);

        intervaloAberto.duracaoIntervalo = tempoIntervaloHoras;
        await intervaloAberto.save();

        registoPonto.totalTempoIntervalo += tempoIntervaloHoras;
        await registoPonto.save();

        console.log("Total de Tempo de Intervalo no Registo Ponto:", registoPonto.totalTempoIntervalo);

        res.status(200).json({ message: "Intervalo finalizado com sucesso." });
    } catch (error) {
        console.error('Erro ao finalizar intervalo:', error);
        res.status(500).json({ message: "Erro ao finalizar intervalo." });
    }
};



module.exports = {
    iniciarIntervalo,
    finalizarIntervalo,
};
