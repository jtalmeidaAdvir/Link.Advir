
const POS = require('../models/pos');
const Obra = require('../models/obra');
const Empresa = require('../models/empresa');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Criar novo POS
const criarPOS = async (req, res) => {
    try {
        const { nome, codigo, email, password, obra_predefinida_id, empresa_id } = req.body;

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
            return res.status(400).json({ message: 'Já existe um POS com este código ou email' });
        }

        // Verificar se a obra existe
        const obra = await Obra.findByPk(obra_predefinida_id);
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada' });
        }

        // Verificar se a empresa existe
        const empresa = await Empresa.findByPk(empresa_id);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }

        // Hash da password
        const hashedPassword = await bcrypt.hash(password, 12);

        const novoPOS = await POS.create({
            nome,
            codigo,
            email,
            password: hashedPassword,
            obra_predefinida_id,
            empresa_id
        });

        res.status(201).json({
            message: 'POS criado com sucesso',
            pos: {
                id: novoPOS.id,
                nome: novoPOS.nome,
                codigo: novoPOS.codigo,
                email: novoPOS.email,
                obra_predefinida_id: novoPOS.obra_predefinida_id,
                empresa_id: novoPOS.empresa_id
            }
        });
    } catch (error) {
        console.error('Erro ao criar POS:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Login do POS
const loginPOS = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar POS por email
        const pos = await POS.findOne({
            where: { email, isActive: true },
            include: [
                { model: Obra, as: 'ObraPredefinida' },
                { model: Empresa }
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
            { expiresIn: '8h' }
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
            obra_predefinida_nome: pos.ObraPredefinida.nome
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
            include: [
                { model: Obra, as: 'ObraPredefinida' },
                { model: Empresa }
            ],
            order: [['nome', 'ASC']]
        });

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
        const { nome, codigo, email, password, obra_predefinida_id, isActive } = req.body;

        const pos = await POS.findByPk(id);
        if (!pos) {
            return res.status(404).json({ message: 'POS não encontrado' });
        }

        const updateData = {
            nome: nome || pos.nome,
            codigo: codigo || pos.codigo,
            email: email || pos.email,
            obra_predefinida_id: obra_predefinida_id || pos.obra_predefinida_id,
            isActive: isActive !== undefined ? isActive : pos.isActive
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 12);
        }

        await pos.update(updateData);

        res.json({ message: 'POS atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar POS:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
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
