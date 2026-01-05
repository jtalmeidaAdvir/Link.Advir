const POS = require('../models/pos');
const Obra = require('../models/obra');
const Empresa = require('../models/empresa');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Criar novo POS
const criarPOS = async (req, res) => {
    try {
        const { nome, codigo, email, password, empresa_id, obra_predefinida_id, latitude, longitude } = req.body;

        console.log('Dados recebidos para criar POS:', { nome, codigo, email, empresa_id, obra_predefinida_id, latitude, longitude });

        // Validar dados obrigatórios
        if (!nome || !codigo || !email || !password || !empresa_id) {
            return res.status(400).json({
                message: 'Todos os campos obrigatórios devem ser preenchidos'
            });
        }

        // Verificar se já existe um POS com o mesmo código ou email
        const posExistente = await POS.findOne({
            where: {
                [Op.or]: [
                    { codigo },
                    { email }
                ]
            }
        });

        if (posExistente) {
            return res.status(400).json({
                message: 'Já existe um POS com este código ou email'
            });
        }

        // Hash da password usando a mesma encriptação do User
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar o POS
        const novoPOS = await POS.create({
            nome,
            codigo,
            email,
            password: hashedPassword,
            empresa_id,
            obra_predefinida_id: obra_predefinida_id || null,
            ativo: true,
            latitude: latitude || null,
            longitude: longitude || null
        });

        res.status(201).json({
            message: 'POS criado com sucesso',
            pos: {
                id: novoPOS.id,
                nome: novoPOS.nome,
                codigo: novoPOS.codigo,
                email: novoPOS.email,
                empresa_id: novoPOS.empresa_id,
                obra_predefinida_id: novoPOS.obra_predefinida_id,
                ativo: novoPOS.ativo,
                latitude: novoPOS.latitude,
                longitude: novoPOS.longitude
            }
        });
    } catch (error) {
        console.error('Erro ao criar POS:', error);
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Login do POS
const loginPOS = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar POS por email
        const pos = await POS.findOne({
            where: { email, ativo: true },
            include: [
                { model: Obra, as: 'ObraPredefinida' },
                { model: Empresa, as: 'Empresa' }
            ]
        });

        if (!pos) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Verificar password
        const passwordValida = await bcrypt.compare(password, pos.password);
        if (!passwordValida) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Gerar token
        const token = jwt.sign(
            { 
                posId: pos.id,
                isPOS: true,
                empresa_id: pos.empresa_id,
                obra_predefinida_id: pos.obra_predefinida_id
            },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '365d' }
        );

        res.json({
            success: true,
            token,
            isPOS: true,
            posId: pos.id,
            posNome: pos.nome,
            posCodigo: pos.codigo,
            email: pos.email,
            empresa_id: pos.empresa_id,
            empresa_areacliente: pos.Empresa.empresa,
            obra_predefinida_id: pos.obra_predefinida_id,
            obra_predefinida_nome: pos.ObraPredefinida ? pos.ObraPredefinida.nome : null,
            latitude: pos.latitude,
            longitude: pos.longitude
        });
    } catch (error) {
        console.error('Erro no login do POS:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Listar todos os POS
const listarPOS = async (req, res) => {
    try {
        const posList = await POS.findAll({
            attributes: ['id', 'nome', 'codigo', 'email', 'obra_predefinida_id', 'empresa_id', 'ativo', 'latitude', 'longitude', 'createdAt', 'updatedAt'],
            include: [
                { model: Obra, as: 'ObraPredefinida' },
                { model: Empresa, as: 'Empresa' }
            ],
            order: [['nome', 'ASC']]
        });

        console.log('📋 Listando POS - Primeiro item:', posList[0] ? {
            id: posList[0].id,
            nome: posList[0].nome,
            latitude: posList[0].latitude,
            longitude: posList[0].longitude
        } : 'Nenhum POS encontrado');

        res.json(posList);
    } catch (error) {
        console.error('Erro ao listar POS:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Atualizar POS
const atualizarPOS = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, codigo, email, password, empresa_id, obra_predefinida_id, ativo, latitude, longitude } = req.body;

        console.log('Dados recebidos para atualizar POS:', { id, nome, codigo, email, empresa_id, obra_predefinida_id, ativo, latitude, longitude });

        const pos = await POS.findByPk(id);
        if (!pos) {
            return res.status(404).json({
                message: 'POS não encontrado'
            });
        }

        // Se uma nova password foi fornecida, fazer hash dela usando a mesma encriptação do User
        let hashedPassword = pos.password;
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Atualizar o POS
        const updateData = {
            nome: nome || pos.nome,
            codigo: codigo || pos.codigo,
            email: email || pos.email,
            password: hashedPassword,
            empresa_id: empresa_id || pos.empresa_id,
            obra_predefinida_id: obra_predefinida_id !== undefined ? obra_predefinida_id : pos.obra_predefinida_id,
            ativo: ativo !== undefined ? ativo : pos.ativo,
            latitude: latitude !== undefined ? latitude : pos.latitude,
            longitude: longitude !== undefined ? longitude : pos.longitude
        };

        console.log('Dados para atualizar:', updateData);

        await pos.update(updateData);

        console.log('POS após atualização:', {
            id: pos.id,
            latitude: pos.latitude,
            longitude: pos.longitude
        });

        res.json({
            message: 'POS atualizado com sucesso',
            pos: {
                id: pos.id,
                nome: pos.nome,
                codigo: pos.codigo,
                email: pos.email,
                empresa_id: pos.empresa_id,
                obra_predefinida_id: pos.obra_predefinida_id,
                ativo: pos.ativo,
                latitude: pos.latitude,
                longitude: pos.longitude
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar POS:', error);
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Eliminar POS
const eliminarPOS = async (req, res) => {
    try {
        const { id } = req.params;

        const pos = await POS.findByPk(id);
        if (!pos) {
            return res.status(404).json({ message: 'POS não encontrado' });
        }

        await pos.destroy();
        res.json({ message: 'POS eliminado com sucesso' });
    } catch (error) {
        console.error('Erro ao eliminar POS:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

module.exports = {
    criarPOS,
    loginPOS,
    listarPOS,
    atualizarPOS,
    eliminarPOS
};