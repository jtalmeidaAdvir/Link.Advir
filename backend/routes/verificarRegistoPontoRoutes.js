const express = require('express');
const router = express.Router();
const RegistoPontoObra = require('../models/registoPontoObra');
const { Op } = require('sequelize');

// Endpoint para verificar se utilizador tem registo no dia
router.get('/verificar-registo', async (req, res) => {
    try {
        const { user_id, data } = req.query;

        if (!user_id || !data) {
            return res.status(400).json({
                error: "user_id e data são obrigatórios"
            });
        }

        // Filtrar registros dentro do dia usando timestamp
        const registo = await RegistoPontoObra.findOne({
            where: {
                user_id: user_id,
                timestamp: {
                    [Op.gte]: new Date(`${data}T00:00:00.000Z`),
                    [Op.lt]: new Date(`${data}T23:59:59.999Z`)
                }
            },
            order: [['timestamp', 'ASC']]
        });

        res.json({
            temRegisto: !!registo,
            registo: registo ? {
                id: registo.id,
                horaEntrada: registo.timestamp, // ou ajuste se você armazenar hora de saída separada
                horaSaida: registo.horaSaida || null,
                obra_id: registo.obra_id
            } : null
        });

    } catch (error) {
        console.error("Erro ao verificar registo:", error);
        res.status(500).json({
            error: "Erro ao verificar registo de ponto"
        });
    }
});

// Endpoint para verificar se utilizador tem registo de SAÍDA no dia
router.get('/verificar-saida', async (req, res) => {
    try {
        const { user_id, data } = req.query;

        if (!user_id || !data) {
            return res.status(400).json({
                error: "user_id e data são obrigatórios"
            });
        }

        // Buscar registo de saída do dia
        const registoSaida = await RegistoPontoObra.findOne({
            where: {
                user_id: user_id,
                tipo: 'saida',
                timestamp: {
                    [Op.gte]: new Date(`${data}T00:00:00.000Z`),
                    [Op.lt]: new Date(`${data}T23:59:59.999Z`)
                }
            },
            order: [['timestamp', 'DESC']]
        });

        // Buscar registo de entrada para comparação
        const registoEntrada = await RegistoPontoObra.findOne({
            where: {
                user_id: user_id,
                tipo: 'entrada',
                timestamp: {
                    [Op.gte]: new Date(`${data}T00:00:00.000Z`),
                    [Op.lt]: new Date(`${data}T23:59:59.999Z`)
                }
            },
            order: [['timestamp', 'ASC']]
        });

        res.json({
            temSaida: !!registoSaida,
            temEntrada: !!registoEntrada,
            registoSaida: registoSaida ? {
                id: registoSaida.id,
                timestamp: registoSaida.timestamp,
                obra_id: registoSaida.obra_id
            } : null,
            registoEntrada: registoEntrada ? {
                id: registoEntrada.id,
                timestamp: registoEntrada.timestamp,
                obra_id: registoEntrada.obra_id
            } : null
        });

    } catch (error) {
        console.error("Erro ao verificar saída:", error);
        res.status(500).json({
            error: "Erro ao verificar registo de saída"
        });
    }
});

module.exports = router;
