
const RegistoPontoObra = require('../models/registoPontoObra');
const User = require('../models/user');
const Obra = require('../models/obra');
const { Op } = require('sequelize');

const obterRegistosParaMapa = async (req, res) => {
    try {
        console.log('=== OBTER REGISTOS PARA MAPA ===');
        console.log('Parâmetros recebidos:', req.query);
        console.log('Headers de autorização:', req.headers.authorization ? 'Presente' : 'Ausente');

        const { data, obra_id, empresa_id, user_id } = req.query;

        // Verificar se as tabelas existem
        console.log('Verificando modelos...');
        console.log('RegistoPontoObra existe:', !!RegistoPontoObra);
        console.log('User existe:', !!User);
        console.log('Obra existe:', !!Obra);

        // Construir filtros básicos
        let whereClause = {
            latitude: {
                [Op.and]: [
                    { [Op.not]: null },
                    { [Op.ne]: '' },
                    { [Op.ne]: '0' }
                ]
            },
            longitude: {
                [Op.and]: [
                    { [Op.not]: null },
                    { [Op.ne]: '' },
                    { [Op.ne]: '0' }
                ]
            }
        };

        console.log('Filtros básicos criados:', JSON.stringify(whereClause, null, 2));

        // Filtrar por data se fornecida
        if (data) {
            try {
                console.log('Processando data:', data);
                const dataObj = new Date(data);
                if (isNaN(dataObj.getTime())) {
                    console.error('Data inválida:', data);
                    return res.status(400).json({ message: 'Data inválida.' });
                }

                // Criar datas de início e fim do dia em UTC
                const dataInicio = new Date(data + 'T00:00:00.000Z');
                const dataFim = new Date(data + 'T23:59:59.999Z');

                console.log('Intervalo de datas:', { dataInicio, dataFim });
                whereClause.timestamp = { [Op.between]: [dataInicio, dataFim] };
            } catch (dateError) {
                console.error('Erro ao processar data:', dateError);
                return res.status(400).json({ message: 'Formato de data inválido.' });
            }
        } else {
            console.log('Usando data atual...');
            // Por defeito, mostrar registos do dia atual
            const hoje = new Date();
            const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
            const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
            console.log('Data atual - intervalo:', { dataInicio, dataFim });
            whereClause.timestamp = { [Op.between]: [dataInicio, dataFim] };
        }

        // Filtrar por obra se fornecida
        if (obra_id) {
            console.log('Filtrando por obra_id:', obra_id);
            whereClause.obra_id = obra_id;
        }

        // Filtrar por utilizador se fornecido
        if (user_id) {
            console.log('Filtrando por user_id:', user_id);
            whereClause.user_id = user_id;
        }

        console.log('WhereClause final:', JSON.stringify(whereClause, null, 2));

        // Incluir filtro de empresa através da obra
        let includeObra = {
            model: Obra,
            attributes: ['id', 'nome', 'localizacao', 'empresa_id'],
            required: true // Força INNER JOIN
        };

        if (empresa_id) {
            console.log('Filtrando por empresa_id:', empresa_id);
            includeObra.where = { empresa_id: empresa_id };
        }

        console.log('Include da obra:', JSON.stringify(includeObra, null, 2));

        console.log('Executando query...');
        const registos = await RegistoPontoObra.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['id', 'nome', 'email'],
                    required: false // Mudar para false para debug
                },
                includeObra
            ],
            order: [['timestamp', 'DESC']],
            limit: 1000 // Limitar para performance
        });

        console.log(`Query executada com sucesso. Encontrados ${registos.length} registos`);

        // Agrupar registos por utilizador e obra
        const registosFormatados = registos.map(registo => {
            try {
                return {
                    id: registo.id,
                    user: {
                        id: registo.User?.id,
                        nome: registo.User?.nome,
                        email: registo.User?.email
                    },
                    obra: {
                        id: registo.Obra?.id,
                        nome: registo.Obra?.nome,
                        localizacao: registo.Obra?.localizacao
                    },
                    tipo: registo.tipo,
                    timestamp: registo.timestamp,
                    latitude: parseFloat(registo.latitude) || 0,
                    longitude: parseFloat(registo.longitude) || 0,
                    is_confirmed: registo.is_confirmed,
                    justificacao: registo.justificacao
                };
            } catch (formatError) {
                console.error('Erro ao formatar registo:', registo.id, formatError);
                return null;
            }
        }).filter(r => r !== null);

        res.status(200).json(registosFormatados);

    } catch (error) {
        console.error('Erro detalhado ao obter registos para mapa:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            message: 'Erro interno ao obter dados do mapa.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obterEstatisticasMapa = async (req, res) => {
    try {
        console.log('=== OBTER ESTATÍSTICAS DO MAPA ===');
        console.log('Parâmetros recebidos:', req.query);
        const { data, empresa_id, user_id, obra_id } = req.query;

        let whereClause = {
            latitude: {
                [Op.and]: [
                    { [Op.not]: null },
                    { [Op.ne]: '' },
                    { [Op.ne]: '0' }
                ]
            },
            longitude: {
                [Op.and]: [
                    { [Op.not]: null },
                    { [Op.ne]: '' },
                    { [Op.ne]: '0' }
                ]
            }
        };

        console.log('Filtros básicos para estatísticas:', JSON.stringify(whereClause, null, 2));

        // Filtrar por data
        if (data) {
            try {
                console.log('Processando data para estatísticas:', data);
                const dataObj = new Date(data);
                if (isNaN(dataObj.getTime())) {
                    console.error('Data inválida para estatísticas:', data);
                    return res.status(400).json({ message: 'Data inválida.' });
                }

                const dataInicio = new Date(data + 'T00:00:00.000Z');
                const dataFim = new Date(data + 'T23:59:59.999Z');
                console.log('Intervalo de datas para estatísticas:', { dataInicio, dataFim });
                whereClause.timestamp = { [Op.between]: [dataInicio, dataFim] };
            } catch (dateError) {
                console.error('Erro ao processar data nas estatísticas:', dateError);
                return res.status(400).json({ message: 'Formato de data inválido.' });
            }
        } else {
            console.log('Usando data atual para estatísticas...');
            const hoje = new Date();
            const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
            const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
            console.log('Data atual para estatísticas - intervalo:', { dataInicio, dataFim });
            whereClause.timestamp = { [Op.between]: [dataInicio, dataFim] };
        }

        // Aplicar filtros adicionais nas estatísticas
        if (obra_id) {
            console.log('Filtrando estatísticas por obra_id:', obra_id);
            whereClause.obra_id = obra_id;
        }
        
        if (user_id) {
            console.log('Filtrando estatísticas por user_id:', user_id);
            whereClause.user_id = user_id;
        }
        
        console.log('Filtrando estatísticas por empresa_id:', empresa_id || 'Todas');

        console.log('Executando query de estatísticas por tipo...');
        // Obter estatísticas por tipo
        const estatisticas = await RegistoPontoObra.findAll({
            where: whereClause,
            include: [{
                model: Obra,
                attributes: [], // Não incluir atributos da obra no SELECT
                required: true,
                where: empresa_id ? { empresa_id: empresa_id } : undefined
            }],
            attributes: [
                'tipo',
                [RegistoPontoObra.sequelize.fn('COUNT', RegistoPontoObra.sequelize.col('RegistoPontoObra.id')), 'total']
            ],
            group: ['tipo'],
            raw: true
        });

        console.log('Estatísticas por tipo obtidas:', estatisticas);

        console.log('Executando query para total de utilizadores únicos...');
        // Obter total de utilizadores únicos
        const totalUtilizadoresResult = await RegistoPontoObra.findAll({
            where: whereClause,
            include: [{
                model: Obra,
                attributes: [], // Não incluir atributos da obra no SELECT
                required: true,
                where: empresa_id ? { empresa_id: empresa_id } : undefined
            }],
            attributes: [
                [RegistoPontoObra.sequelize.fn('COUNT', RegistoPontoObra.sequelize.fn('DISTINCT', RegistoPontoObra.sequelize.col('RegistoPontoObra.user_id'))), 'total']
            ],
            raw: true
        });

        console.log('Total utilizadores resultado:', totalUtilizadoresResult);

        console.log('Executando query para total de obras únicas...');
        // Obter total de obras únicas
        const totalObrasResult = await RegistoPontoObra.findAll({
            where: whereClause,
            include: [{
                model: Obra,
                attributes: [], // Não incluir atributos da obra no SELECT
                required: true,
                where: empresa_id ? { empresa_id: empresa_id } : undefined
            }],
            attributes: [
                [RegistoPontoObra.sequelize.fn('COUNT', RegistoPontoObra.sequelize.fn('DISTINCT', RegistoPontoObra.sequelize.col('RegistoPontoObra.obra_id'))), 'total']
            ],
            raw: true
        });

        console.log('Total obras resultado:', totalObrasResult);

        res.status(200).json({
            registosPorTipo: estatisticas,
            totalUtilizadores: totalUtilizadoresResult[0]?.total || 0,
            totalObras: totalObrasResult[0]?.total || 0
        });

    } catch (error) {
        console.error('Erro detalhado ao obter estatísticas do mapa:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            message: 'Erro interno ao obter estatísticas.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obterRegistosParaMapa,
    obterEstatisticasMapa
};
