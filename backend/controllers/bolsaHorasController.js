const BolsaHorasAnual = require('../models/bolsaHorasAnual');
const User = require('../models/user');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Obter bolsa de horas de um utilizador para um ano específico
 */
exports.obterBolsaHorasAnual = async (req, res) => {
    try {
        const { userId, ano } = req.params;

        let bolsaHoras = await BolsaHorasAnual.findOne({
            where: {
                user_id: userId,
                ano: ano
            },
            include: [{
                model: User,
                as: 'utilizador',
                attributes: ['id', 'nome', 'email']
            }]
        });

        // Se não existe, criar um registo novo com valores padrão
        if (!bolsaHoras) {
            bolsaHoras = await BolsaHorasAnual.create({
                user_id: userId,
                ano: ano,
                horas_iniciais: 0,
                horas_calculadas: 0,
                criado_por: req.user?.id
            });

            // Recarregar com associações
            bolsaHoras = await BolsaHorasAnual.findByPk(bolsaHoras.id, {
                include: [{
                    model: User,
                    as: 'utilizador',
                    attributes: ['id', 'nome', 'email']
                }]
            });
        }

        res.json({
            success: true,
            data: bolsaHoras
        });
    } catch (error) {
        console.error('Erro ao obter bolsa de horas anual:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter bolsa de horas anual',
            error: error.message
        });
    }
};

/**
 * Obter todas as bolsas de horas para um ano (todos os utilizadores de uma empresa)
 */
exports.obterBolsasHorasPorAno = async (req, res) => {
    try {
        const { empresaId, ano } = req.params;

        console.log(`[BOLSA] Buscando bolsas para empresa ${empresaId}, ano ${ano}`);

        // Buscar todos os utilizadores da empresa usando JOIN com user_empresa
        const utilizadores = await sequelize.query(`
            SELECT DISTINCT u.id, u.nome, u.email
            FROM [user] u
            INNER JOIN user_empresa ue ON u.id = ue.user_id
            WHERE ue.empresa_id = :empresaId
            ORDER BY u.nome
        `, {
            replacements: { empresaId },
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`[BOLSA] Encontrados ${utilizadores.length} utilizadores`);

        // Se não houver utilizadores, retornar array vazio
        if (!utilizadores || utilizadores.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const userIds = utilizadores.map(u => u.id);
        console.log(`[BOLSA] IDs dos utilizadores:`, userIds.slice(0, 5), '...');

        // Buscar bolsas de horas existentes
        const bolsasExistentes = await BolsaHorasAnual.findAll({
            where: {
                user_id: {
                    [Op.in]: userIds
                },
                ano: ano
            }
        });

        console.log(`[BOLSA] Encontradas ${bolsasExistentes.length} bolsas existentes`);

        // Criar mapa de bolsas por user_id
        const bolsasMap = {};
        bolsasExistentes.forEach(bolsa => {
            bolsasMap[bolsa.user_id] = bolsa;
        });

        // Construir array final com todos os utilizadores
        const resultado = utilizadores.map(user => ({
            user_id: user.id,
            nome: user.nome,
            email: user.email,
            ano: parseInt(ano),
            horas_iniciais: bolsasMap[user.id]?.horas_iniciais || 0,
            horas_calculadas: bolsasMap[user.id]?.horas_calculadas || 0,
            total_horas_extras: bolsasMap[user.id]?.total_horas_extras || 0,
            total_horas_esperadas: bolsasMap[user.id]?.total_horas_esperadas || 0,
            total_horas_descontadas_fbh: bolsasMap[user.id]?.total_horas_descontadas_fbh || 0,
            dias_trabalhados: bolsasMap[user.id]?.dias_trabalhados || 0,
            ultima_atualizacao: bolsasMap[user.id]?.ultima_atualizacao || null,
            existe_registo: !!bolsasMap[user.id]
        }));

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [BOLSA] Erro ao obter bolsas de horas por ano:', error);
        console.error('❌ [BOLSA] Error name:', error.name);
        console.error('❌ [BOLSA] Error message:', error.message);
        console.error('❌ [BOLSA] Stack:', error.stack);
        console.error('❌ [BOLSA] Params:', req.params);
        console.error('❌ [BOLSA] Error original:', error.original);

        res.status(500).json({
            success: false,
            message: 'Erro ao obter bolsas de horas por ano',
            error: error.message || error.toString(),
            errorName: error.name,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Definir horas iniciais para um utilizador em um ano
 */
exports.definirHorasIniciais = async (req, res) => {
    try {
        const { userId, ano } = req.params;
        const { horas_iniciais, observacoes } = req.body;

        if (horas_iniciais === undefined) {
            return res.status(400).json({
                success: false,
                message: 'É necessário fornecer o valor de horas_iniciais'
            });
        }

        // Verificar se já existe registo
        let bolsaHoras = await BolsaHorasAnual.findOne({
            where: {
                user_id: userId,
                ano: ano
            }
        });

        if (bolsaHoras) {
            // Atualizar existente
            bolsaHoras.horas_iniciais = horas_iniciais;
            bolsaHoras.observacoes = observacoes || bolsaHoras.observacoes;
            bolsaHoras.criado_por = req.user?.id;
            await bolsaHoras.save();
        } else {
            // Criar novo
            bolsaHoras = await BolsaHorasAnual.create({
                user_id: userId,
                ano: ano,
                horas_iniciais: horas_iniciais,
                horas_calculadas: 0,
                observacoes: observacoes,
                criado_por: req.user?.id
            });
        }

        res.json({
            success: true,
            message: 'Horas iniciais definidas com sucesso',
            data: bolsaHoras
        });
    } catch (error) {
        console.error('Erro ao definir horas iniciais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao definir horas iniciais',
            error: error.message
        });
    }
};

/**
 * Atualizar horas calculadas (chamado após recálculo)
 */
exports.atualizarHorasCalculadas = async (req, res) => {
    try {
        const { userId, ano } = req.params;
        const { horas_calculadas } = req.body;

        if (horas_calculadas === undefined) {
            return res.status(400).json({
                success: false,
                message: 'É necessário fornecer o valor de horas_calculadas'
            });
        }

        // Verificar se já existe registo
        let bolsaHoras = await BolsaHorasAnual.findOne({
            where: {
                user_id: userId,
                ano: ano
            }
        });

        if (bolsaHoras) {
            // Atualizar existente
            bolsaHoras.horas_calculadas = horas_calculadas;
            bolsaHoras.ultima_atualizacao = new Date();
            await bolsaHoras.save();
        } else {
            // Criar novo com horas_iniciais = 0
            bolsaHoras = await BolsaHorasAnual.create({
                user_id: userId,
                ano: ano,
                horas_iniciais: 0,
                horas_calculadas: horas_calculadas,
                ultima_atualizacao: new Date(),
                criado_por: req.user?.id
            });
        }

        res.json({
            success: true,
            message: 'Horas calculadas atualizadas com sucesso',
            data: bolsaHoras
        });
    } catch (error) {
        console.error('Erro ao atualizar horas calculadas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar horas calculadas',
            error: error.message
        });
    }
};

/**
 * Atualizar múltiplas bolsas de horas (batch update)
 */
exports.atualizarMultiplasBolsas = async (req, res) => {
    try {
        const { bolsas } = req.body; // Array de { userId, ano, horas_calculadas }

        if (!Array.isArray(bolsas) || bolsas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'É necessário fornecer um array de bolsas para atualizar'
            });
        }

        const resultados = [];
        const erros = [];

        for (const bolsa of bolsas) {
            try {
                const {
                    userId,
                    ano,
                    horas_calculadas,
                    total_horas_extras,
                    total_horas_esperadas,
                    total_horas_descontadas_fbh,
                    dias_trabalhados
                } = bolsa;

                let bolsaHoras = await BolsaHorasAnual.findOne({
                    where: {
                        user_id: userId,
                        ano: ano
                    }
                });

                if (bolsaHoras) {
                    bolsaHoras.horas_calculadas = horas_calculadas;
                    bolsaHoras.total_horas_extras = total_horas_extras || 0;
                    bolsaHoras.total_horas_esperadas = total_horas_esperadas || 0;
                    bolsaHoras.total_horas_descontadas_fbh = total_horas_descontadas_fbh || 0;
                    bolsaHoras.dias_trabalhados = dias_trabalhados || 0;
                    bolsaHoras.ultima_atualizacao = new Date();
                    await bolsaHoras.save();
                } else {
                    bolsaHoras = await BolsaHorasAnual.create({
                        user_id: userId,
                        ano: ano,
                        horas_iniciais: 0,
                        horas_calculadas: horas_calculadas,
                        total_horas_extras: total_horas_extras || 0,
                        total_horas_esperadas: total_horas_esperadas || 0,
                        total_horas_descontadas_fbh: total_horas_descontadas_fbh || 0,
                        dias_trabalhados: dias_trabalhados || 0,
                        ultima_atualizacao: new Date(),
                        criado_por: req.user?.id
                    });
                }

                resultados.push({
                    userId,
                    ano,
                    sucesso: true
                });
            } catch (error) {
                erros.push({
                    userId: bolsa.userId,
                    ano: bolsa.ano,
                    erro: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `${resultados.length} bolsas atualizadas com sucesso`,
            resultados,
            erros: erros.length > 0 ? erros : undefined
        });
    } catch (error) {
        console.error('Erro ao atualizar múltiplas bolsas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar múltiplas bolsas',
            error: error.message
        });
    }
};

/**
 * Eliminar registo de bolsa de horas
 */
exports.eliminarBolsaHoras = async (req, res) => {
    try {
        const { userId, ano } = req.params;

        const resultado = await BolsaHorasAnual.destroy({
            where: {
                user_id: userId,
                ano: ano
            }
        });

        if (resultado > 0) {
            res.json({
                success: true,
                message: 'Registo de bolsa de horas eliminado com sucesso'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Registo de bolsa de horas não encontrado'
            });
        }
    } catch (error) {
        console.error('Erro ao eliminar bolsa de horas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar bolsa de horas',
            error: error.message
        });
    }
};

/**
 * Obter histórico de bolsas de horas de um utilizador
 */
exports.obterHistoricoBolsas = async (req, res) => {
    try {
        const { userId } = req.params;

        const historico = await BolsaHorasAnual.findAll({
            where: {
                user_id: userId
            },
            order: [['ano', 'DESC']],
            include: [{
                model: User,
                as: 'criador',
                attributes: ['id', 'nome', 'email']
            }]
        });

        res.json({
            success: true,
            data: historico
        });
    } catch (error) {
        console.error('Erro ao obter histórico de bolsas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter histórico de bolsas',
            error: error.message
        });
    }
};
