
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
        res.status(500).json({ message: 'Erro ao criar horário.', error: error.message });
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
        res.status(500).json({ message: 'Erro ao atualizar horário.', error: error.message });
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
    // Aceitar tanto userId/horarioId quanto user_id/horario_id
    const userId = req.body.userId || req.body.user_id;
    const horarioId = req.body.horarioId || req.body.horario_id;
    const { dataInicio, observacoes } = req.body;

    try {
        // Validar dados recebidos
        if (!userId || !horarioId) {
            return res.status(400).json({ 
                message: 'userId/user_id e horarioId/horario_id são obrigatórios.',
                recebido: { userId, horarioId, body: req.body }
            });
        }

        // Converter para número
        const userIdNum = parseInt(userId, 10);
        const horarioIdNum = parseInt(horarioId, 10);

        if (isNaN(userIdNum) || isNaN(horarioIdNum)) {
            return res.status(400).json({ 
                message: 'userId e horarioId devem ser números válidos.',
                recebido: { userId, horarioId }
            });
        }

        // Verificar se o utilizador existe
        const user = await User.findByPk(userIdNum);
        if (!user) {
            return res.status(404).json({ 
                message: 'Utilizador não encontrado.',
                userId: userIdNum
            });
        }

        // Verificar se o horário existe
        const horario = await Horario.findByPk(horarioIdNum);
        if (!horario) {
            return res.status(404).json({ 
                message: 'Horário não encontrado.',
                horarioId: horarioIdNum
            });
        }

        // Desativar planos anteriores do utilizador
        const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        await PlanoHorario.update(
            { ativo: false, dataFim: hoje },
            { where: { user_id: userIdNum, ativo: true } }
        );

        // Criar novo plano - usar apenas a data (YYYY-MM-DD)
        let dataInicioFormatted = hoje;
        
        if (dataInicio) {
            const dataInicioDate = new Date(dataInicio);
            
            // Validar se a data é válida
            if (isNaN(dataInicioDate.getTime())) {
                return res.status(400).json({ 
                    message: 'Data de início inválida.',
                    dataInicio
                });
            }
            
            dataInicioFormatted = dataInicioDate.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        console.log('Criando plano com dados:', {
            user_id: userIdNum,
            horario_id: horarioIdNum,
            dataInicio: dataInicioFormatted,
            ativo: true,
            observacoes
        });

        const novoPlano = await PlanoHorario.create({
            user_id: userIdNum,
            horario_id: horarioIdNum,
            dataInicio: dataInicioFormatted,
            ativo: true,
            observacoes
        });

        const planoComHorario = await PlanoHorario.findByPk(novoPlano.id, {
            include: [{ 
                model: Horario,
                as: 'Horario'
            }]
        });

        res.status(201).json({ 
            message: 'Horário atribuído com sucesso!', 
            plano: planoComHorario 
        });
    } catch (error) {
        console.error('Erro ao atribuir horário:', error);
        res.status(500).json({ 
            message: 'Erro ao atribuir horário.',
            error: error.message 
        });
    }
};

// Obter horário atual do utilizador
const obterHorarioUser = async (req, res) => {
    const { userId } = req.params;

    try {
        console.log(`========================================`);
        console.log(`[HORARIO_USER] 🔍 INICIANDO BUSCA`);
        console.log(`[HORARIO_USER] userId recebido: "${userId}" (tipo: ${typeof userId})`);
        console.log(`[HORARIO_USER] req.params:`, req.params);
        console.log(`========================================`);
        
        // Converter userId para número
        const userIdNum = parseInt(userId, 10);
        
        if (isNaN(userIdNum)) {
            console.error(`[HORARIO_USER] ❌ userId inválido: "${userId}"`);
            return res.status(400).json({ message: 'userId inválido' });
        }
        
        console.log(`[HORARIO_USER] userId convertido: ${userIdNum}`);
        
        // Primeiro, verificar se existem planos para este user
        const todosPlanos = await PlanoHorario.findAll({
            where: { user_id: userIdNum },
            attributes: ['id', 'user_id', 'horario_id', 'ativo', 'dataInicio', 'dataFim']
        });
        
        console.log(`[HORARIO_USER] Total de planos encontrados: ${todosPlanos.length}`);
        console.log(`[HORARIO_USER] Planos (todos):`, JSON.stringify(todosPlanos, null, 2));
        
        // Buscar plano ativo (usando userIdNum convertido)
        const planoAtivo = await PlanoHorario.findOne({
            where: { 
                user_id: userIdNum, 
                ativo: true 
            },
            order: [['dataInicio', 'DESC']]
        });

        console.log(`[HORARIO_USER] Plano ativo encontrado:`, planoAtivo ? 'SIM ✅' : 'NÃO ❌');
        
        if (planoAtivo) {
            console.log(`[HORARIO_USER] Detalhes do plano ativo:`, {
                id: planoAtivo.id,
                user_id: planoAtivo.user_id,
                horario_id: planoAtivo.horario_id,
                ativo: planoAtivo.ativo,
                dataInicio: planoAtivo.dataInicio,
                dataFim: planoAtivo.dataFim
            });
        }

        if (!planoAtivo) {
            console.log(`[HORARIO_USER] ❌ Nenhum plano ativo para user ${userIdNum}`);
            console.log(`========================================`);
            return res.status(404).json({ 
                message: 'Utilizador sem horário atribuído.',
                userId: userIdNum,
                todosPlanos: todosPlanos.length
            });
        }

        // Buscar o horário associado manualmente
        const horario = await Horario.findByPk(planoAtivo.horario_id);
        
        if (!horario) {
            console.log(`[HORARIO_USER] ❌ Horário ID ${planoAtivo.horario_id} não encontrado`);
            return res.status(404).json({ message: 'Horário não encontrado.' });
        }

        // Construir resposta com estrutura esperada pelo frontend
        const resposta = {
            id: planoAtivo.id,
            user_id: planoAtivo.user_id,
            horario_id: planoAtivo.horario_id,
            dataInicio: planoAtivo.dataInicio,
            dataFim: planoAtivo.dataFim,
            ativo: planoAtivo.ativo,
            observacoes: planoAtivo.observacoes,
            Horario: {
                id: horario.id,
                empresa_id: horario.empresa_id,
                descricao: horario.descricao,
                horasPorDia: horario.horasPorDia,
                horasSemanais: horario.horasSemanais,
                diasSemana: horario.diasSemana,
                horaEntrada: horario.horaEntrada,
                horaSaida: horario.horaSaida,
                intervaloAlmoco: horario.intervaloAlmoco,
                ativo: horario.ativo,
                observacoes: horario.observacoes
            }
        };

        // Log detalhado para debug
        console.log(`[HORARIO_USER] ✅ SUCESSO - User ${userIdNum}:`);
        console.log(`[HORARIO_USER] Plano ID: ${resposta.id}`);
        console.log(`[HORARIO_USER] Horário ID: ${resposta.horario_id}`);
        console.log(`[HORARIO_USER] Horário:`, {
            descricao: resposta.Horario.descricao,
            horaEntrada: resposta.Horario.horaEntrada,
            horaSaida: resposta.Horario.horaSaida,
            horasPorDia: resposta.Horario.horasPorDia,
            intervaloAlmoco: resposta.Horario.intervaloAlmoco
        });
        console.log(`========================================`);

        res.status(200).json(resposta);
    } catch (error) {
        console.error('[HORARIO_USER] Erro ao obter horário do utilizador:', error);
        res.status(500).json({ message: 'Erro ao obter horário do utilizador.', error: error.message });
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
