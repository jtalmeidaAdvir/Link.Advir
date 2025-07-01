
const PartesDiarias = require('../models/partesDiarias');
const User = require('../models/user');
const Obra = require('../models/obra');
const EquipaObra = require('../models/equipaObra');

// Criar parte diária
const criarParteDiaria = async (req, res) => {
    try {
        const { categoria, quantidade, especialidade, unidade, designacao, data, horas, nome, obra_id } = req.body;
        const user_id = req.user.id;
        
        // Verificar se a obra existe
        const obra = await Obra.findByPk(obra_id);
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada.' });
        }
        
        const parteDiaria = await PartesDiarias.create({
            categoria,
            quantidade,
            especialidade,
            unidade,
            designacao,
            data,
            horas,
            nome,
            user_id,
            obra_id
        });
        
        res.status(201).json(parteDiaria);
    } catch (error) {
        console.error('Erro ao criar parte diária:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar partes diárias do utilizador
const listarMinhasPartesDiarias = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { obra_id, data_inicio, data_fim } = req.query;
        
        let whereClause = { user_id };
        
        if (obra_id) {
            whereClause.obra_id = obra_id;
        }
        
        if (data_inicio && data_fim) {
            whereClause.data = {
                [Op.between]: [data_inicio, data_fim]
            };
        }
        
        const partesDiarias = await PartesDiarias.findAll({
            where: whereClause,
            include: [
                { model: User, attributes: ['id', 'nome'] },
                { model: Obra, attributes: ['id', 'nome', 'codigo'] }
            ],
            order: [['data', 'DESC']]
        });
        
        res.status(200).json(partesDiarias);
    } catch (error) {
        console.error('Erro ao listar partes diárias:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar partes diárias da equipa (para encarregados/diretores)
const listarPartesDiariasEquipa = async (req, res) => {
    try {
        const encarregado_id = req.user.id;
        const { obra_id } = req.params;
        
        // Verificar se o utilizador é encarregado ou diretor
        const user = await User.findByPk(encarregado_id);
        if (!user || !['Encarregado', 'Diretor'].includes(user.tipoUser)) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        
        // Obter membros da equipa
        const equipas = await EquipaObra.findAll({
            where: { 
                encarregado_id,
                obra_id 
            },
            attributes: ['user_id']
        });
        
        const membrosIds = equipas.map(equipa => equipa.user_id);
        
        const partesDiarias = await PartesDiarias.findAll({
            where: { 
                user_id: membrosIds,
                obra_id 
            },
            include: [
                { model: User, attributes: ['id', 'nome'] },
                { model: Obra, attributes: ['id', 'nome', 'codigo'] }
            ],
            order: [['data', 'DESC']]
        });
        
        res.status(200).json(partesDiarias);
    } catch (error) {
        console.error('Erro ao listar partes diárias da equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Atualizar parte diária
const atualizarParteDiaria = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        
        const parteDiaria = await PartesDiarias.findByPk(id);
        if (!parteDiaria) {
            return res.status(404).json({ message: 'Parte diária não encontrada.' });
        }
        
        // Verificar se o utilizador pode editar (próprio registo ou encarregado)
        const user = await User.findByPk(user_id);
        const podeEditar = parteDiaria.user_id === user_id || 
                          ['Encarregado', 'Diretor'].includes(user.tipoUser);
        
        if (!podeEditar) {
            return res.status(403).json({ message: 'Não tem permissão para editar esta parte diária.' });
        }
        
        await parteDiaria.update(req.body);
        res.status(200).json(parteDiaria);
    } catch (error) {
        console.error('Erro ao atualizar parte diária:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    criarParteDiaria,
    listarMinhasPartesDiarias,
    listarPartesDiariasEquipa,
    atualizarParteDiaria
};
