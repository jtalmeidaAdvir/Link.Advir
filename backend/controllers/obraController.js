
const Obra = require('../models/obra');
const EquipaObra = require('../models/equipaObra');
const User = require('../models/user');
const QRCode = require('qrcode');

// Listar todas as obras
const listarObras = async (req, res) => {
    try {
        const obras = await Obra.findAll();
        res.status(200).json(obras);
    } catch (error) {
        console.error('Erro ao listar obras:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


const listarObrasPorEmpresa = async (req, res) => {
    try {
        const { empresa_id } = req.query;

        if (!empresa_id) {
            return res.status(400).json({ message: 'empresa_id é obrigatório.' });
        }

        const obras = await Obra.findAll({
            where: { empresa_id },
        });

        res.status(200).json(obras);
    } catch (error) {
        console.error('Erro ao listar obras por empresa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


// Criar nova obra
const criarObra = async (req, res) => {
    try {
        const { codigo, nome, estado, localizacao,empresa_id } = req.body;
        
        // Gerar QR Code para a obra
        const qrCodeData = JSON.stringify({ 
            tipo: 'obra', 
            obraId: codigo,
            nome: nome 
        });
        const qrCodeImage = await QRCode.toDataURL(qrCodeData);
        
        const obra = await Obra.create({
            codigo,
            nome,
            estado,
            localizacao,
            qrCode: qrCodeImage,
             empresa_id,
        });
        
        res.status(201).json(obra);
    } catch (error) {
        console.error('Erro ao criar obra:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Obter obra por ID
const obterObra = async (req, res) => {
    try {
        const { id } = req.params;
        const obra = await Obra.findByPk(id, {
            include: [
                {
                    model: EquipaObra,
                    include: [
                        { model: User, as: 'membro', attributes: ['id', 'nome'] },
                        { model: User, as: 'encarregado', attributes: ['id', 'nome'] }
                    ]
                }
            ]
        });
        
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada.' });
        }
        
        res.status(200).json(obra);
    } catch (error) {
        console.error('Erro ao obter obra:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Atualizar obra
const atualizarObra = async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo, nome, estado, localizacao } = req.body;
        
        const obra = await Obra.findByPk(id);
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada.' });
        }
        
        await obra.update({ codigo, nome, estado, localizacao });
        res.status(200).json(obra);
    } catch (error) {
        console.error('Erro ao atualizar obra:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Eliminar obra
const eliminarObra = async (req, res) => {
    try {
        const { id } = req.params;
        const obra = await Obra.findByPk(id);
        
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada.' });
        }
        
        await obra.destroy();
        res.status(200).json({ message: 'Obra eliminada com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar obra:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    listarObras,
    criarObra,
    obterObra,
    atualizarObra,
    eliminarObra,
    listarObrasPorEmpresa
};
