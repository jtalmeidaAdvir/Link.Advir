const EquipaObra = require('../models/equipaObra');
const User = require('../models/user');

// Criar equipa (Encarregado, Diretor e Administrador podem criar)
const criarEquipa = async (req, res) => {
    try {
        const { nome, membros } = req.body;
        const encarregado_id = req.user.id;

        const user = await User.findByPk(encarregado_id);
        if (!user || !['Encarregado', 'Diretor', 'Administrador'].includes(user.tipoUser)) {
            return res.status(403).json({ message: 'Apenas Encarregados, Diretores e Administradores podem criar equipas.' });
        }

        const equipaPromises = membros.map(user_id =>
            EquipaObra.create({
                nome,
                encarregado_id,
                user_id
            })
        );

        const equipaCriada = await Promise.all(equipaPromises);
        res.status(201).json(equipaCriada);
    } catch (error) {
        console.error('Erro ao criar equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar equipas do utilizador (Administradores veem todas as equipas)
const listarMinhasEquipas = async (req, res) => {
    try {
        const user_id = req.user.id;
        const user = await User.findByPk(user_id);

        if (user.tipoUser === 'Administrador') {
            // Administrador vê todas as equipas, agrupadas por nome
            const todosRegistos = await EquipaObra.findAll({
                include: [
                    { model: User, as: 'membro', attributes: ['id', 'nome', 'email', 'tipoUser'] },
                    { model: User, as: 'encarregado', attributes: ['id', 'nome'] }
                ]
            });

            // Agrupar por nome de equipa
            const equipasAgrupadas = {};
            for (const reg of todosRegistos) {
                if (!equipasAgrupadas[reg.nome]) {
                    equipasAgrupadas[reg.nome] = {
                        nome: reg.nome,
                        encarregado: reg.encarregado,
                        membros: []
                    };
                }
                equipasAgrupadas[reg.nome].membros.push(reg.membro);
            }

            return res.status(200).json(Object.values(equipasAgrupadas));
        }

        // Demais utilizadores só veem as suas próprias equipas
        const equipas = await EquipaObra.findAll({
            where: { user_id },
            include: [
                { model: User, as: 'membro', attributes: ['id', 'nome', 'tipoUser'] },
                { model: User, as: 'encarregado', attributes: ['id', 'nome'] }
            ]
        });

        res.status(200).json(equipas);
    } catch (error) {
        console.error('Erro ao listar minhas equipas:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Remover membro da equipa
const removerMembroEquipa = async (req, res) => {
    try {
        const { equipa_id } = req.params;
        const encarregado_id = req.user.id;

        const equipa = await EquipaObra.findByPk(equipa_id);
        if (!equipa) {
            return res.status(404).json({ message: 'Registo de equipa não encontrado.' });
        }

        if (equipa.encarregado_id !== encarregado_id && req.user.tipoUser !== 'Administrador') {
            return res.status(403).json({ message: 'Apenas o encarregado ou administrador pode remover membros.' });
        }

        await equipa.destroy();
        res.status(200).json({ message: 'Membro removido da equipa com sucesso.' });
    } catch (error) {
}};

// Listar todas as equipas com os seus membros agrupadas
const listarTodasEquipasAgrupadas = async (req, res) => {
    try {
        const registos = await EquipaObra.findAll({
            include: [
                { model: User, as: 'membro', attributes: ['id', 'email', 'nome', 'username'] },
                { model: User, as: 'encarregado', attributes: ['id', 'nome', 'username'] }
            ]
        });

        const equipasAgrupadas = {};
        for (const reg of registos) {
            if (!equipasAgrupadas[reg.nome]) {
                equipasAgrupadas[reg.nome] = {
                    nome: reg.nome,
                    encarregado: reg.encarregado,
                    membros: []
                };
            }
            equipasAgrupadas[reg.nome].membros.push(reg.membro);
        }

        res.status(200).json(Object.values(equipasAgrupadas));
    } catch (error) {
        console.error('Erro ao listar equipas agrupadas:', error);
        res.status(500).json({ message: 'Erro ao listar equipas.' });
    }
};

// Atualizar nome da equipa
const atualizarNomeEquipa = async (req, res) => {
    try {
        const { equipa_id } = req.params;
        const { novoNome } = req.body;

        const equipa = await EquipaObra.findByPk(equipa_id);
        if (!equipa) {
            return res.status(404).json({ message: 'Equipa não encontrada.' });
        }

        await EquipaObra.update(
            { nome: novoNome },
            { where: { nome: equipa.nome } }
        );

        res.status(200).json({ message: 'Nome da equipa atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar nome da equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar equipas por empresa
const listarEquipasPorEmpresa = async (req, res) => {
    try {
        const { empresa_id } = req.query;

        const equipas = await EquipaObra.findAll({
            include: [
                { model: User, as: 'membro', where: { empresa_id }, attributes: ['id', 'nome', 'tipoUser'] },
                { model: User, as: 'encarregado', attributes: ['id', 'nome'] }
            ]
        });

        res.status(200).json(equipas);
    } catch (error) {
        console.error('Erro ao listar equipas por empresa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Remover equipa inteira
const removerEquipaInteira = async (req, res) => {
    try {
        const { nomeEquipa } = req.body;
        const encarregado_id = req.user.id;

        const equipa = await EquipaObra.findOne({ where: { nome: nomeEquipa } });
        if (!equipa) return res.status(404).json({ message: 'Equipa não encontrada.' });

        if (equipa.encarregado_id !== encarregado_id) {
            return res.status(403).json({ message: 'Apenas o encarregado pode apagar a equipa.' });
        }

        await EquipaObra.destroy({ where: { nome: nomeEquipa } });

        res.status(200).json({ message: 'Equipa removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar equipas do encarregado agrupadas
const listarMinhasEquipasAgrupadas = async (req, res) => {
    try {
        const encarregadoId = req.user.id;

        const registos = await EquipaObra.findAll({
            where: { encarregado_id: encarregadoId },
            include: [
                { model: User, as: 'membro', attributes: ['id', 'nome', 'username'] }
            ],
            order: [['nome', 'ASC']]
        });

        const equipasAgrupadas = {};

        for (const reg of registos) {
            const nomeChave = reg.nome;
            if (!equipasAgrupadas[nomeChave]) {
                equipasAgrupadas[nomeChave] = {
                    nome: reg.nome,
                    membros: []
                };
            }

            if (reg.membro) {
                equipasAgrupadas[nomeChave].membros.push({
                    id: reg.membro.id,
                    nome: reg.membro.nome
                });
            }
        }

        res.status(200).json(Object.values(equipasAgrupadas));
    } catch (error) {
        console.error('Erro ao listar equipas agrupadas do encarregado:', error);
        res.status(500).json({ message: 'Erro interno ao listar as tuas equipas.' });
    }
};

module.exports = {
    criarEquipa,
    listarMinhasEquipas,
    removerMembroEquipa,
    listarTodasEquipasAgrupadas,
    atualizarNomeEquipa,
    listarEquipasPorEmpresa,
    removerEquipaInteira,
    listarMinhasEquipasAgrupadas
};
