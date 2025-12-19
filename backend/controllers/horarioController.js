
const Horario = require('../models/horario');
const PlanoHorario = require('../models/planoHorario');
const User = require('../models/user');
const Empresa = require('../models/empresa');

// Função auxiliar para converter hora ISO para HH:MM
const formatarHora = (hora) => {
    if (!hora) return null;
    // Se já está no formato HH:MM, retornar como está
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
        return hora;
    }
    // Se está no formato ISO, extrair apenas HH:MM
    try {
        const date = new Date(hora);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        return null;
    }
};

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
    const { descricao, horasPorDia, horasSemanais, diasSemana, horaEntrada, horaSaida, intervaloAlmoco, horaInicioAlmoco, horaFimAlmoco, tempoArredondamento, observacoes } = req.body;

    try {
        const novoHorario = await Horario.create({
            empresa_id: empresaId,
            descricao,
            horasPorDia,
            horasSemanais,
            diasSemana,
            horaEntrada: formatarHora(horaEntrada),
            horaSaida: formatarHora(horaSaida),
            intervaloAlmoco,
            horaInicioAlmoco: formatarHora(horaInicioAlmoco),
            horaFimAlmoco: formatarHora(horaFimAlmoco),
            tempoArredondamento: formatarHora(tempoArredondamento),
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
    const dadosAtualizacao = { ...req.body };

    try {
        const horario = await Horario.findByPk(horarioId);

        if (!horario) {
            return res.status(404).json({ message: 'Horário não encontrado.' });
        }

        // Formatar campos de hora se estiverem presentes
        if (dadosAtualizacao.horaEntrada) {
            dadosAtualizacao.horaEntrada = formatarHora(dadosAtualizacao.horaEntrada);
        }
        if (dadosAtualizacao.horaSaida) {
            dadosAtualizacao.horaSaida = formatarHora(dadosAtualizacao.horaSaida);
        }
        if (dadosAtualizacao.horaInicioAlmoco) {
            dadosAtualizacao.horaInicioAlmoco = formatarHora(dadosAtualizacao.horaInicioAlmoco);
        }
        if (dadosAtualizacao.horaFimAlmoco) {
            dadosAtualizacao.horaFimAlmoco = formatarHora(dadosAtualizacao.horaFimAlmoco);
        }
        if (dadosAtualizacao.tempoArredondamento) {
            dadosAtualizacao.tempoArredondamento = formatarHora(dadosAtualizacao.tempoArredondamento);
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
        const hoje = new Date();
        const hojeFormatted = hoje.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS

        await PlanoHorario.update(
            { ativo: false, dataFim: hojeFormatted },
            { where: { user_id: userIdNum, ativo: true } }
        );

        // Criar novo plano
        let dataInicioFormatted = hojeFormatted;

        if (dataInicio) {
            const dataInicioDate = new Date(dataInicio);

            // Validar se a data é válida
            if (isNaN(dataInicioDate.getTime())) {
                return res.status(400).json({
                    message: 'Data de início inválida.',
                    dataInicio
                });
            }

            dataInicioFormatted = dataInicioDate.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
        }

        console.log('Criando plano com dados:', {
            user_id: userIdNum,
            horario_id: horarioIdNum,
            dataInicio: dataInicioFormatted,
            ativo: true,
            observacoes: observacoes || null
        });

        const novoPlano = await PlanoHorario.create({
            user_id: userIdNum,
            horario_id: horarioIdNum,
            dataInicio: dataInicioFormatted,
            ativo: true,
            observacoes: observacoes || null
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
        console.error('========================================');
        console.error('ERRO AO ATRIBUIR HORÁRIO:');
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        console.error('Error stack:', error.stack);

        // Detalhes específicos do Sequelize/SQL
        if (error.sql) {
            console.error('SQL Query:', error.sql);
        }
        if (error.original) {
            console.error('Database Error:', error.original);
            console.error('Database Error Message:', error.original.message);
        }
        if (error.parent) {
            console.error('Parent Error:', error.parent);
        }
        console.error('========================================');

        res.status(500).json({
            message: 'Erro ao atribuir horário.',
            error: error.message,
            sqlError: error.original?.message || null,
            errorName: error.name
        });
    }
};

// Obter horário atual do utilizador
const obterHorarioUser = async (req, res) => {
    const { userId } = req.params;

    try {
        console.log(`\n[HORARIO_USER] ========================================`);
        console.log(`[HORARIO_USER] 🔍 Nova requisição recebida`);
        console.log(`[HORARIO_USER] Request params:`, req.params);
        console.log(`[HORARIO_USER] Request URL:`, req.originalUrl);
        console.log(`[HORARIO_USER] userId recebido: "${userId}" (tipo: ${typeof userId})`);
        
        // Converter para número
        const userIdNum = parseInt(userId, 10);
        console.log(`[HORARIO_USER] userId convertido: ${userIdNum} (isNaN: ${isNaN(userIdNum)})`);
        
        if (isNaN(userIdNum)) {
            console.log(`[HORARIO_USER] ❌ ERRO: userId não é um número válido`);
            return res.status(400).json({ message: 'ID de utilizador inválido' });
        }
        
        // Verificar tabela PlanoHorario
        console.log(`[HORARIO_USER] 📊 Verificando tabela plano_horarios...`);
        const totalPlanosTabela = await PlanoHorario.count();
        console.log(`[HORARIO_USER] Total de registos na tabela plano_horarios: ${totalPlanosTabela}`);
        
        // Buscar TODOS os planos deste user (ativos e inativos)
        console.log(`[HORARIO_USER] 🔎 Buscando TODOS os planos para user_id = ${userIdNum}...`);
        const todosPlanos = await PlanoHorario.findAll({
            where: { user_id: userIdNum },
            raw: true
        });
        
        console.log(`[HORARIO_USER] Total de planos encontrados para user ${userIdNum}: ${todosPlanos.length}`);
        if (todosPlanos.length > 0) {
            console.log(`[HORARIO_USER] Planos encontrados:`, JSON.stringify(todosPlanos, null, 2));
        }
        
        // Buscar plano ativo
        console.log(`[HORARIO_USER] 🎯 Buscando plano ATIVO para user_id = ${userIdNum}...`);
        const planoAtivo = await PlanoHorario.findOne({
            where: { user_id: userIdNum, ativo: true },
            order: [['dataInicio', 'DESC']],
            raw: true
        });

        console.log(`[HORARIO_USER] Plano ativo encontrado:`, planoAtivo ? 'SIM ✅' : 'NÃO ❌');
        if (planoAtivo) {
            console.log(`[HORARIO_USER] Dados do plano ativo:`, JSON.stringify(planoAtivo, null, 2));
        }

        if (!planoAtivo) {
            console.log(`[HORARIO_USER] ❌ RETORNO 404: Nenhum plano ativo para user ${userIdNum}`);
            console.log(`[HORARIO_USER] ========================================\n`);
            return res.status(404).json({ message: 'Utilizador sem horário atribuído.' });
        }

        // Buscar o horário associado
        console.log(`[HORARIO_USER] 📋 Buscando Horario com ID: ${planoAtivo.horario_id}...`);
        const horario = await Horario.findByPk(planoAtivo.horario_id, { raw: true });
        
        console.log(`[HORARIO_USER] Horário encontrado:`, horario ? 'SIM ✅' : 'NÃO ❌');
        
        if (!horario) {
            console.log(`[HORARIO_USER] ❌ RETORNO 404: Horário ID ${planoAtivo.horario_id} não encontrado`);
            console.log(`[HORARIO_USER] ========================================\n`);
            return res.status(404).json({ message: 'Horário não encontrado.' });
        }

        console.log(`[HORARIO_USER] Dados do horário:`, JSON.stringify(horario, null, 2));

        // Construir resposta com estrutura esperada pelo frontend
        const resposta = {
            id: planoAtivo.id,
            user_id: planoAtivo.user_id,
            horario_id: planoAtivo.horario_id,
            dataInicio: planoAtivo.dataInicio,
            dataFim: planoAtivo.dataFim,
            tipoPeriodo: planoAtivo.tipoPeriodo,
            diaEspecifico: planoAtivo.diaEspecifico,
            mesEspecifico: planoAtivo.mesEspecifico,
            anoEspecifico: planoAtivo.anoEspecifico,
            prioridade: planoAtivo.prioridade,
            ativo: planoAtivo.ativo,
            observacoes: planoAtivo.observacoes,
            Horario: {
                id: horario.id,
                empresa_id: horario.empresa_id,
                descricao: horario.descricao,
                horasPorDia: parseFloat(horario.horasPorDia),
                horasSemanais: parseFloat(horario.horasSemanais),
                diasSemana: horario.diasSemana,
                horaEntrada: horario.horaEntrada,
                horaSaida: horario.horaSaida,
                intervaloAlmoco: parseFloat(horario.intervaloAlmoco),
                ativo: horario.ativo,
                observacoes: horario.observacoes
            }
        };

        // Log detalhado para debug
        console.log(`[HORARIO_USER] ✅ Sucesso! User ${userIdNum}:`, {
            planoId: resposta.id,
            horarioId: resposta.horario_id,
            descricao: resposta.Horario.descricao,
            horaEntrada: resposta.Horario.horaEntrada,
            horaSaida: resposta.Horario.horaSaida,
            horasPorDia: resposta.Horario.horasPorDia,
            intervaloAlmoco: resposta.Horario.intervaloAlmoco
        });
        console.log(`[HORARIO_USER] ========================================`);

        res.status(200).json(resposta);
    } catch (error) {
        console.error('[HORARIO_USER] ❌ ERRO CRÍTICO:', error);
        console.error('[HORARIO_USER] Stack:', error.stack);
        console.log(`[HORARIO_USER] ========================================`);
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

// Diagnóstico: Listar todos os users e seus horários
const diagnosticoHorarios = async (req, res) => {
    try {
        const { empresaId } = req.params;
        
        // Buscar todos os users da empresa
        const users = await User.findAll({
            where: { empresa_id: empresaId },
            attributes: ['id', 'nome', 'email'],
            order: [['nome', 'ASC']]
        });

        // Para cada user, verificar se tem horário ativo
        const diagnostico = await Promise.all(users.map(async (user) => {
            const planoAtivo = await PlanoHorario.findOne({
                where: { user_id: user.id, ativo: true },
                include: [{ model: Horario, as: 'Horario' }]
            });

            return {
                userId: user.id,
                nome: user.nome,
                email: user.email,
                temHorario: !!planoAtivo,
                horario: planoAtivo ? planoAtivo.Horario.descricao : null
            };
        }));

        const usersComHorario = diagnostico.filter(u => u.temHorario).length;
        const usersSemHorario = diagnostico.filter(u => !u.temHorario).length;

        res.status(200).json({
            total: diagnostico.length,
            comHorario: usersComHorario,
            semHorario: usersSemHorario,
            utilizadores: diagnostico
        });
    } catch (error) {
        console.error('Erro no diagnóstico:', error);
        res.status(500).json({ message: 'Erro no diagnóstico de horários.' });
    }
};

module.exports = {
    listarHorarios,
    criarHorario,
    atualizarHorario,
    eliminarHorario,
    atribuirHorarioUser,
    obterHorarioUser,
    historicoHorariosUser,
    diagnosticoHorarios
};
