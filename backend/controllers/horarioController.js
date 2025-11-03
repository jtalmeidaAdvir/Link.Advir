
const Horario = require('../models/horario');
const PlanoHorario = require('../models/planoHorario');
const User = require('../models/user');
const Empresa = require('../models/empresa');

// Listar todos os horários de uma empresa
const listarHorarios = async (req, res) => {
    const { empresaId } = req.params;

    try {
        const horarios = await Horario.findAll({
            where: { empresa_id: empresaId },
            order: [['descricao', 'ASC']]
        });

        res.status(200).json(horarios);
    } catch (error) {
        console.error('Erro ao listar horários:', error);
        res.status(500).json({ message: 'Erro ao listar horários.' });
    }
};

// Criar novo horário
const criarHorario = async (req, res) => {
    const { empresaId } = req.params;
    const { descricao, horasPorDia, horasSemanais, diasSemana, horaEntrada, horaSaida, intervaloAlmoco, observacoes } = req.body;

    try {
        const novoHorario = await Horario.create({
            empresa_id: empresaId,
            descricao,
            horasPorDia,
            horasSemanais,
            diasSemana,
            horaEntrada,
            horaSaida,
            intervaloAlmoco,
            observacoes
        });

        res.status(201).json({ message: 'Horário criado com sucesso!', horario: novoHorario });
    } catch (error) {
        console.error('Erro ao criar horário:', error);
        res.status(500).json({ message: 'Erro ao criar horário.' });
    }
};

// Atualizar horário
const atualizarHorario = async (req, res) => {
    const { horarioId } = req.params;
    const dadosAtualizacao = req.body;

    try {
        const horario = await Horario.findByPk(horarioId);
        
        if (!horario) {
            return res.status(404).json({ message: 'Horário não encontrado.' });
        }

        await horario.update(dadosAtualizacao);

        res.status(200).json({ message: 'Horário atualizado com sucesso!', horario });
    } catch (error) {
        console.error('Erro ao atualizar horário:', error);
        res.status(500).json({ message: 'Erro ao atualizar horário.' });
    }
};

// Eliminar horário
const eliminarHorario = async (req, res) => {
    const { horarioId } = req.params;

    try {
        // Verificar se existem utilizadores com este horário
        const planosAtivos = await PlanoHorario.count({
            where: { horario_id: horarioId, ativo: true }
        });

        if (planosAtivos > 0) {
            return res.status(400).json({ 
                message: `Não é possível eliminar este horário. Existem ${planosAtivos} utilizadores atribuídos.` 
            });
        }

        const horario = await Horario.findByPk(horarioId);
        
        if (!horario) {
            return res.status(404).json({ message: 'Horário não encontrado.' });
        }

        await horario.destroy();

        res.status(200).json({ message: 'Horário eliminado com sucesso!' });
    } catch (error) {
        console.error('Erro ao eliminar horário:', error);
        res.status(500).json({ message: 'Erro ao eliminar horário.' });
    }
};

// Atribuir horário a utilizador
const atribuirHorarioUser = async (req, res) => {
    const { userId, horarioId, dataInicio, observacoes } = req.body;

    try {
        // Desativar planos anteriores do utilizador
        await PlanoHorario.update(
            { ativo: false, dataFim: new Date() },
            { where: { user_id: userId, ativo: true } }
        );

        // Criar novo plano
        const novoPlano = await PlanoHorario.create({
            user_id: userId,
            horario_id: horarioId,
            dataInicio: dataInicio || new Date(),
            ativo: true,
            observacoes
        });

        const planoComHorario = await PlanoHorario.findByPk(novoPlano.id, {
            include: [{ model: Horario }]
        });

        res.status(201).json({ 
            message: 'Horário atribuído com sucesso!', 
            plano: planoComHorario 
        });
    } catch (error) {
        console.error('Erro ao atribuir horário:', error);
        res.status(500).json({ message: 'Erro ao atribuir horário.' });
    }
};

// Obter horário atual do utilizador
const obterHorarioUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const planoAtivo = await PlanoHorario.findOne({
            where: { user_id: userId, ativo: true },
            include: [{ 
                model: Horario,
                include: [{ model: Empresa }]
            }],
            order: [['dataInicio', 'DESC']]
        });

        if (!planoAtivo) {
            return res.status(404).json({ message: 'Utilizador sem horário atribuído.' });
        }

        res.status(200).json(planoAtivo);
    } catch (error) {
        console.error('Erro ao obter horário do utilizador:', error);
        res.status(500).json({ message: 'Erro ao obter horário do utilizador.' });
    }
};

// Listar histórico de horários de um utilizador
const historicoHorariosUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const historico = await PlanoHorario.findAll({
            where: { user_id: userId },
            include: [{ model: Horario }],
            order: [['dataInicio', 'DESC']]
        });

        res.status(200).json(historico);
    } catch (error) {
        console.error('Erro ao obter histórico de horários:', error);
        res.status(500).json({ message: 'Erro ao obter histórico de horários.' });
    }
};

module.exports = {
    listarHorarios,
    criarHorario,
    atualizarHorario,
    eliminarHorario,
    atribuirHorarioUser,
    obterHorarioUser,
    historicoHorariosUser
};
