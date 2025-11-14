
const RegistoPontoObra = require('../models/registoPontoObra');
const Obra = require('../models/obra');
const { Op } = require('sequelize');

/**
 * Divide as horas de uma obra em múltiplas obras, reconstruindo as picagens
 */
const dividirHorasObra = async (req, res) => {
    try {
        const userId = req.user.id;
        const { dia, obraOrigemId, divisoes } = req.body;

        // Validações
        if (!dia || !obraOrigemId || !Array.isArray(divisoes) || divisoes.length === 0) {
            return res.status(400).json({ 
                message: 'Dados inválidos. É necessário fornecer dia, obra de origem e divisões.' 
            });
        }

        // Verificar se a obra de origem existe
        const obraOrigem = await Obra.findByPk(obraOrigemId);
        if (!obraOrigem) {
            return res.status(404).json({ message: 'Obra de origem não encontrada.' });
        }

        // Verificar se todas as obras de destino existem
        for (const div of divisoes) {
            if (!div.obra_id) {
                return res.status(400).json({ message: 'Todas as divisões devem ter uma obra associada.' });
            }
            const obraDestino = await Obra.findByPk(div.obra_id);
            if (!obraDestino) {
                return res.status(404).json({ 
                    message: `Obra de destino ${div.obra_id} não encontrada.` 
                });
            }
        }

        // Verificar se há pelo menos uma divisão com uma obra diferente da original
        const temObraDiferente = divisoes.some(div => parseInt(div.obra_id) !== parseInt(obraOrigemId));
        if (!temObraDiferente) {
            return res.status(400).json({ 
                message: 'Deve haver pelo menos uma divisão com uma obra diferente da original.' 
            });
        }

        // Buscar todos os registos da obra origem no dia especificado
        const dataInicio = new Date(dia + 'T00:00:00.000Z');
        const dataFim = new Date(dia + 'T23:59:59.999Z');

        const registosOrigem = await RegistoPontoObra.findAll({
            where: {
                user_id: userId,
                obra_id: obraOrigemId,
                timestamp: {
                    [Op.between]: [dataInicio, dataFim]
                }
            },
            order: [['timestamp', 'ASC']]
        });

        if (registosOrigem.length === 0) {
            return res.status(404).json({ 
                message: 'Nenhum registo encontrado para a obra no dia especificado.' 
            });
        }

        // Calcular o tempo total registado na obra origem
        let totalMinutosOrigem = 0;
        let ultimaEntrada = null;

        registosOrigem.forEach(registo => {
            if (registo.tipo === 'entrada') {
                ultimaEntrada = new Date(registo.timestamp);
            } else if (registo.tipo === 'saida' && ultimaEntrada) {
                const saida = new Date(registo.timestamp);
                const minutos = (saida - ultimaEntrada) / 60000;
                totalMinutosOrigem += minutos;
                ultimaEntrada = null;
            }
        });

        // Calcular total de minutos a dividir
        const totalMinutosDivisoes = divisoes.reduce((acc, div) => {
            return acc + (div.horas * 60 + div.minutos);
        }, 0);

        // Verificar se a soma das divisões corresponde ao total
        if (Math.abs(totalMinutosOrigem - totalMinutosDivisoes) > 1) {
            return res.status(400).json({ 
                message: `A soma das divisões (${totalMinutosDivisoes} min) não corresponde ao total registado (${Math.round(totalMinutosOrigem)} min).` 
            });
        }

        // Cancelar/Eliminar todos os registos da obra origem
        await RegistoPontoObra.destroy({
            where: {
                user_id: userId,
                obra_id: obraOrigemId,
                timestamp: {
                    [Op.between]: [dataInicio, dataFim]
                }
            }
        });

        // Criar novos registos para cada divisão
        const primeiraEntrada = new Date(registosOrigem[0].timestamp);
        let horaAtual = new Date(primeiraEntrada);

        const novosRegistos = [];

        for (const div of divisoes) {
            const minutosTrabalho = div.horas * 60 + div.minutos;
            
            // Buscar informação da obra de destino
            const obraDestino = await Obra.findByPk(div.obra_id);

            // Criar entrada
            const entrada = await RegistoPontoObra.create({
                user_id: userId,
                obra_id: div.obra_id,
                tipo: 'entrada',
                timestamp: new Date(horaAtual),
                is_confirmed: false,
                justificacao: parseInt(div.obra_id) === parseInt(obraOrigemId) 
                    ? `Divisão de horas - Mantido em ${obraOrigem.nome}`
                    : `Divisão de horas - Original: ${obraOrigem.nome}`
            });

            // Calcular saída
            horaAtual = new Date(horaAtual.getTime() + minutosTrabalho * 60000);

            const saida = await RegistoPontoObra.create({
                user_id: userId,
                obra_id: div.obra_id,
                tipo: 'saida',
                timestamp: new Date(horaAtual),
                is_confirmed: false,
                justificacao: parseInt(div.obra_id) === parseInt(obraOrigemId)
                    ? `Divisão de horas - Mantido em ${obraOrigem.nome}`
                    : `Divisão de horas - Original: ${obraOrigem.nome}`
            });

            novosRegistos.push({ entrada, saida });
        }

        return res.status(200).json({
            message: 'Horas divididas com sucesso entre as obras.',
            totalRegistosOrigemEliminados: registosOrigem.length,
            totalNovasEntradas: novosRegistos.length * 2,
            detalhes: novosRegistos.map((nr, idx) => ({
                obra_id: divisoes[idx].obra_id,
                entrada: nr.entrada.timestamp,
                saida: nr.saida.timestamp,
                horas: divisoes[idx].horas,
                minutos: divisoes[idx].minutos
            }))
        });

    } catch (error) {
        console.error('Erro ao dividir horas por obra:', error);
        return res.status(500).json({ 
            message: 'Erro ao dividir horas por obra.',
            error: error.message 
        });
    }
};

module.exports = {
    dividirHorasObra
};
