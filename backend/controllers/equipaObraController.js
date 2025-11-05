const EquipaObra = require('../models/equipaObra');
const User = require('../models/user');

// Criar equipa (Encarregado, Diretor e Administrador podem criar)
const criarEquipa = async (req, res) => {
    try {
        const { nome, membros, membrosExternos, empresa_id } = req.body;
        const encarregado_id = req.user.id;

        // Obter empresa_id do header se não vier no body
        const empresaId = empresa_id || req.headers['x-empresa-id'];

        if (!empresaId) {
            return res.status(400).json({ message: 'empresa_id é obrigatório.' });
        }

        const user = await User.findByPk(encarregado_id);
        if (!user || !['Encarregado', 'Diretor', 'Administrador'].includes(user.tipoUser)) {
            return res.status(403).json({ message: 'Apenas Encarregados, Diretores e Administradores podem criar equipas.' });
        }

        const equipaPromises = [];

        // Adicionar membros internos
        if (membros && membros.length > 0) {
            membros.forEach(user_id => {
                equipaPromises.push(
                    EquipaObra.create({
                        nome,
                        encarregado_id,
                        user_id,
                        trabalhador_externo_id: null,
                        tipo_membro: 'interno',
                        empresa_id: empresaId
                    })
                );
            });
        }

        // Adicionar membros externos
        if (membrosExternos && membrosExternos.length > 0) {
            membrosExternos.forEach(externo_id => {
                equipaPromises.push(
                    EquipaObra.create({
                        nome,
                        encarregado_id,
                        user_id: null,
                        trabalhador_externo_id: externo_id,
                        tipo_membro: 'externo',
                        empresa_id: empresaId
                    })
                );
            });
        }

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
        console.error('Erro ao remover membro da equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar todas as equipas com os seus membros agrupadas
const listarTodasEquipasAgrupadas = async (req, res) => {
    try {
        const empresaId = req.headers['x-empresa-id'] || req.query.empresa_id;

        let whereClause = {};
        if (empresaId) {
            whereClause.empresa_id = empresaId;
        }

        const registos = await EquipaObra.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'membro', attributes: ['id', 'email', 'nome', 'username'], required: false },
                { model: User, as: 'encarregado', attributes: ['id', 'nome', 'username'] }
            ]
        });

        // Buscar trabalhadores externos separadamente
        const TrabalhadorExterno = require('../models/trabalhadorExterno');
        const externosIds = registos
            .filter(r => r.tipo_membro === 'externo' && r.trabalhador_externo_id)
            .map(r => r.trabalhador_externo_id);

        let externosMap = {};
        if (externosIds.length > 0) {
            const externos = await TrabalhadorExterno.findAll({
                where: { id: externosIds }
            });
            externos.forEach(ext => {
                externosMap[ext.id] = ext;
            });
        }

        const equipasAgrupadas = {};
        for (const reg of registos) {
            if (!equipasAgrupadas[reg.nome]) {
                equipasAgrupadas[reg.nome] = {
                    nome: reg.nome,
                    encarregado: reg.encarregado,
                    empresa_id: reg.empresa_id,
                    membros: []
                };
            }

            if (reg.tipo_membro === 'interno' && reg.membro) {
                equipasAgrupadas[reg.nome].membros.push({
                    ...reg.membro.toJSON(),
                    tipo: 'interno'
                });
            } else if (reg.tipo_membro === 'externo' && externosMap[reg.trabalhador_externo_id]) {
                const externo = externosMap[reg.trabalhador_externo_id];
                equipasAgrupadas[reg.nome].membros.push({
                    id: externo.id,
                    nome: externo.funcionario,
                    empresa: externo.empresa,
                    categoria: externo.categoria,
                    tipo: 'externo'
                });
            }
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
        const empresaId = req.headers['x-empresa-id'] || req.query.empresa_id;

        let whereClause = { encarregado_id: encarregadoId };
        if (empresaId) {
            whereClause.empresa_id = empresaId;
        }

        const registos = await EquipaObra.findAll({
            where: whereClause,
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
                    empresa_id: reg.empresa_id,
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

// Editar equipa (Adicionar/Remover Membros, Renomear Equipa)
const editarEquipa = async (req, res) => {
    try {
        const { equipa_id } = req.params;
        const { nomeAnterior, novoNome, novosMembros, novosMembrosExternos } = req.body;
        const encarregado_id = req.user.id;

        const equipa = await EquipaObra.findOne({
            where: { nome: equipa_id },
            include: [{ model: User, as: 'membro' }]
        });

        if (!equipa) {
            return res.status(404).json({ message: 'Equipa não encontrada.' });
        }

        // Verificar se o utilizador é o encarregado ou administrador
        if (equipa.encarregado_id !== encarregado_id && req.user.tipoUser !== 'Administrador') {
            return res.status(403).json({ message: 'Apenas o encarregado ou administrador pode editar a equipa.' });
        }

        // Remover todos os membros existentes da equipa
        await EquipaObra.destroy({
            where: { nome: equipa.nome, empresa_id: equipa.empresa_id }
        });

        // Adicionar os novos membros com o nome atualizado
        const nomeEquipa = novoNome || equipa.nome;
        const novasEntradas = [];
        
        // Membros internos
        if (novosMembros && novosMembros.length > 0) {
            novosMembros.forEach(user_id => {
                novasEntradas.push({
                    nome: nomeEquipa,
                    encarregado_id: equipa.encarregado_id,
                    user_id,
                    trabalhador_externo_id: null,
                    tipo_membro: 'interno',
                    empresa_id: equipa.empresa_id
                });
            });
        }

        // Membros externos
        if (novosMembrosExternos && novosMembrosExternos.length > 0) {
            novosMembrosExternos.forEach(externo_id => {
                novasEntradas.push({
                    nome: nomeEquipa,
                    encarregado_id: equipa.encarregado_id,
                    user_id: null,
                    trabalhador_externo_id: externo_id,
                    tipo_membro: 'externo',
                    empresa_id: equipa.empresa_id
                });
            });
        }
        
        await EquipaObra.bulkCreate(novasEntradas);

        res.status(200).json({ message: 'Equipa editada com sucesso.' });

    } catch (error) {
        console.error('Erro ao editar equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
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
    listarMinhasEquipasAgrupadas,
    editarEquipa
};