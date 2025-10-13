
const Visitante = require('../models/visitante');
const RegistoPontoVisitante = require('../models/registoPontoVisitante');
const Obra = require('../models/obra');
const { Op } = require('sequelize');

// Criar ficha de visitante
const criarVisitante = async (req, res) => {
    try {
        const { primeiroNome, ultimoNome, numeroContribuinte, nomeEmpresa, nifEmpresa, empresa_id } = req.body;
        const empresaId = empresa_id || req.user?.empresa_id;

        console.log('📝 Tentando criar visitante:', { primeiroNome, ultimoNome, numeroContribuinte, nomeEmpresa, nifEmpresa, empresaId });

        if (!primeiroNome || !ultimoNome || !numeroContribuinte || !empresaId) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios, incluindo empresa_id' });
        }

        // Verificar se já existe
        const existente = await Visitante.findOne({
            where: { numeroContribuinte, empresa_id: empresaId }
        });

        if (existente) {
            console.log('⚠️ Visitante já existe:', existente.id);
            return res.status(400).json({ message: 'Já existe um visitante com este número de contribuinte' });
        }

        const visitante = await Visitante.create({
            primeiroNome,
            ultimoNome,
            numeroContribuinte,
            nomeEmpresa,
            nifEmpresa,
            empresa_id: empresaId
        });

        console.log('✅ Visitante criado com sucesso:', visitante.id);
        res.status(201).json({ message: 'Visitante criado com sucesso', visitante });
    } catch (error) {
        console.error('❌ Erro ao criar visitante:', error);
        res.status(500).json({ message: 'Erro ao criar visitante', error: error.message });
    }
};

// Buscar visitante por número de contribuinte
const buscarVisitantePorContribuinte = async (req, res) => {
    try {
        const { numeroContribuinte } = req.params;
        const empresaId = req.query.empresa_id;

        if (!empresaId) {
            return res.status(400).json({ message: 'empresa_id é obrigatório' });
        }

        console.log(`🔍 Buscando visitante: ${numeroContribuinte} na empresa: ${empresaId}`);

        const visitante = await Visitante.findOne({
            where: { numeroContribuinte, empresa_id: empresaId }
        });

        if (!visitante) {
            console.log(`❌ Visitante não encontrado: ${numeroContribuinte}`);
            return res.status(404).json({
                message: 'Visitante não encontrado',
                found: false
            });
        }

        console.log(`✅ Visitante encontrado:`, visitante.id);
        res.json(visitante);
    } catch (error) {
        console.error('Erro ao buscar visitante:', error);
        res.status(500).json({ message: 'Erro ao buscar visitante', error: error.message });
    }
};

// Registar ponto de visitante
const registarPontoVisitante = async (req, res) => {
    try {
        const { visitante_id, obra_id, empresa_id, latitude, longitude } = req.body;

        if (!visitante_id || !obra_id || !empresa_id) {
            return res.status(400).json({ message: 'Dados incompletos' });
        }

        // Verificar última entrada/saída
        const hoje = new Date().toISOString().split('T')[0];
        const ultimoRegisto = await RegistoPontoVisitante.findOne({
            where: {
                visitante_id,
                obra_id,
                timestamp: {
                    [Op.gte]: new Date(hoje)
                }
            },
            order: [['timestamp', 'DESC']]
        });

        const tipo = !ultimoRegisto || ultimoRegisto.tipo === 'saida' ? 'entrada' : 'saida';

        const registo = await RegistoPontoVisitante.create({
            visitante_id,
            obra_id,
            empresa_id,
            tipo,
            timestamp: new Date(),
            latitude,
            longitude
        });

        const visitante = await Visitante.findByPk(visitante_id);
        const obra = await Obra.findByPk(obra_id);

        res.status(201).json({
            message: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registada com sucesso`,
            registo,
            visitante,
            obra,
            action: tipo
        });
    } catch (error) {
        console.error('Erro ao registar ponto visitante:', error);
        res.status(500).json({ message: 'Erro ao registar ponto' });
    }
};

// Listar todos os visitantes
const listarVisitantes = async (req, res) => {
    try {
        const empresaId = req.query.empresa_id;
        const visitantes = await Visitante.findAll({
            where: { empresa_id: empresaId },
            order: [['createdAt', 'DESC']]
        });
        res.json(visitantes);
    } catch (error) {
        console.error('Erro ao listar visitantes:', error);
        res.status(500).json({ message: 'Erro ao listar visitantes' });
    }
};

// Obter resumo de visitantes por obra
const obterResumoObraVisitantes = async (req, res) => {
    try {
        const { obra_id, empresa_id } = req.query;

        if (!obra_id || !empresa_id) {
            return res.status(400).json({ message: 'obra_id e empresa_id são obrigatórios' });
        }

        console.log('📊 Obtendo resumo de visitantes - obra:', obra_id, 'empresa:', empresa_id);

        const hoje = new Date();
        const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const fimDia = new Date(inicioDia);
        fimDia.setDate(fimDia.getDate() + 1);

        // Buscar todos os registos de hoje
        const registosHoje = await RegistoPontoVisitante.findAll({
            where: {
                obra_id: obra_id,
                empresa_id: empresa_id,
                timestamp: {
                    [Op.gte]: inicioDia,
                    [Op.lt]: fimDia
                }
            },
            include: [{
                model: Visitante,
                attributes: ['id', 'primeiroNome', 'ultimoNome', 'numeroContribuinte']
            }],
            order: [['timestamp', 'DESC']]
        });

        console.log(`📋 ${registosHoje.length} registos de visitantes encontrados`);

        // Agrupar por visitante para determinar quem está a trabalhar
        const visitantesMap = new Map();

        registosHoje.forEach(registo => {
            const visitanteId = registo.visitante_id;

            if (!visitantesMap.has(visitanteId)) {
                visitantesMap.set(visitanteId, {
                    visitante: registo.Visitante,
                    registos: []
                });
            }

            visitantesMap.get(visitanteId).registos.push(registo);
        });

        // Contar visitantes a trabalhar (última entrada sem saída)
        let visitantesATrabalhar = 0;

        visitantesMap.forEach(({ registos }) => {
            registos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (registos.length > 0 && registos[0].tipo === 'entrada') {
                visitantesATrabalhar++;
            }
        });

        console.log(`👥 ${visitantesATrabalhar} visitantes a trabalhar`);

        // Formatar registos para exibição
        const entradasSaidas = registosHoje.slice(0, 10).map(r => ({
            id: r.id,
            visitante_id: r.visitante_id,
            nome: `${r.Visitante.primeiroNome} ${r.Visitante.ultimoNome}`,
            numeroContribuinte: r.Visitante.numeroContribuinte,
            tipo: r.tipo,
            timestamp: r.timestamp,
            latitude: r.latitude,
            longitude: r.longitude
        }));

        res.json({
            visitantesATrabalhar,
            entradasSaidas
        });
    } catch (error) {
        console.error('❌ Erro ao obter resumo de visitantes:', error);
        res.status(500).json({
            message: 'Erro ao obter resumo de visitantes',
            error: error.message
        });
    }
};

module.exports = {
    criarVisitante,
    buscarVisitantePorContribuinte,
    registarPontoVisitante,
    listarVisitantes,
    obterResumoObraVisitantes
};
