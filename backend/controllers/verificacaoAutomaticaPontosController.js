
const RegistoPonto = require('../models/registoPonto');
const User = require('../models/user');
const Empresa = require('../models/empresa');
const { Op } = require('sequelize');

const verificarEAdicionarPontosAlmoco = async (req, res) => {
    try {
        console.log('🍽️ Iniciando verificação automática de pontos de almoço...');

        const { empresa_id } = req.query;

        if (!empresa_id) {
            return res.status(400).json({
                message: 'ID da empresa é obrigatório',
                success: false
            });
        }

        // Verificar se a empresa existe
        const empresa = await Empresa.findByPk(empresa_id);
        if (!empresa) {
            return res.status(404).json({
                message: 'Empresa não encontrada',
                success: false
            });
        }

        const dataAtual = new Date().toISOString().split('T')[0];
        console.log(`📅 Verificando pontos para a data: ${dataAtual}`);

        // Buscar todos os utilizadores da empresa através da tabela user_empresa
        const User_Empresa = require('../models/user_empresa');

        const utilizadores = await User.findAll({
            include: [{
                model: User_Empresa,
                where: {
                    empresa_id: empresa_id
                },
                required: true,
                attributes: [] // Não precisamos dos dados da tabela de junção
            }],
            where: {
                naotratapontosalmoco: false, // Apenas utilizadores que devem ter tratamento automático
                isActive: true
            }
        });

        console.log(`👥 Encontrados ${utilizadores.length} utilizadores para verificação`);

        let utilizadoresProcessados = 0;
        let pontosAdicionados = 0;
        const relatorio = [];

        for (const utilizador of utilizadores) {
            try {
                // Buscar registos do utilizador para hoje na empresa
                const registosHoje = await RegistoPonto.findAll({
                    where: {
                        user_id: utilizador.id,
                        empresa_id: empresa.id,
                        data: dataAtual
                    },
                    order: [['horaEntrada', 'ASC']]
                });

                console.log(`👤 ${utilizador.nome}: ${registosHoje.length} registos encontrados`);

                // Se tiver exatamente 2 picagens (entrada de manhã e saída final)
                if (registosHoje.length === 1) {
                    const registo = registosHoje[0];

                    // Verificar se já tem entrada e saída
                    if (registo.horaEntrada && registo.horaSaida) {
                        console.log(`🍽️ Adicionando pontos de almoço para ${utilizador.nome}`);

                        // Criar horários de almoço
                        const saidaAlmoco = new Date(`${dataAtual}T13:00:00`);
                        const entradaAlmoco = new Date(`${dataAtual}T14:00:00`);

                        // Atualizar o registo existente para terminar às 13:00
                        const horaEntradaOriginal = registo.horaEntrada;
                        await registo.update({
                            horaSaida: saidaAlmoco.toISOString(),
                            totalHorasTrabalhadas: calcularHorasTrabalhadas(horaEntradaOriginal, saidaAlmoco.toISOString())
                        });

                        // Criar novo registo para o período da tarde
                        const horaSaidaOriginal = registo.horaSaida;
                        const novoRegisto = await RegistoPonto.create({
                            user_id: utilizador.id,
                            empresa_id: empresa.id,
                            data: dataAtual,
                            horaEntrada: entradaAlmoco.toISOString(),
                            horaSaida: horaSaidaOriginal,
                            latitude: registo.latitude,
                            longitude: registo.longitude,
                            endereco: registo.endereco || 'Registo automático de almoço',
                            obra_id: registo.obra_id,
                            totalHorasTrabalhadas: calcularHorasTrabalhadas(entradaAlmoco.toISOString(), horaSaidaOriginal),
                            totalTempoIntervalo: empresa.tempoIntervaloPadrao || 60 // 1 hora de almoço por defeito
                        });

                        pontosAdicionados += 2; // Saída + Entrada
                        relatorio.push({
                            utilizador: utilizador.nome,
                            acao: 'Pontos de almoço adicionados',
                            saidaAlmoco: saidaAlmoco.toLocaleTimeString('pt-PT'),
                            entradaAlmoco: entradaAlmoco.toLocaleTimeString('pt-PT'),
                            registoOriginalId: registo.id,
                            novoRegistoId: novoRegisto.id
                        });

                        console.log(`✅ Pontos de almoço adicionados para ${utilizador.nome}`);
                    } else {
                        console.log(`⚠️ ${utilizador.nome} não tem entrada e saída completas`);
                        relatorio.push({
                            utilizador: utilizador.nome,
                            acao: 'Ignorado - registo incompleto',
                            detalhes: 'Não tem entrada e saída no mesmo registo'
                        });
                    }
                } else if (registosHoje.length === 0) {
                    console.log(`⚠️ ${utilizador.nome} não tem registos hoje`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - sem registos',
                        detalhes: 'Nenhum registo encontrado para hoje'
                    });
                } else {
                    console.log(`ℹ️ ${utilizador.nome} já tem ${registosHoje.length} registos (não precisa de ajuste)`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - já tem múltiplos registos',
                        detalhes: `${registosHoje.length} registos encontrados`
                    });
                }

                utilizadoresProcessados++;
            } catch (error) {
                console.error(`❌ Erro ao processar ${utilizador.nome}:`, error);
                relatorio.push({
                    utilizador: utilizador.nome,
                    acao: 'Erro',
                    detalhes: error.message
                });
            }
        }

        const resultado = {
            success: true,
            message: 'Verificação automática de pontos de almoço concluída',
            empresa: empresa.empresa,
            data: dataAtual,
            estatisticas: {
                utilizadoresProcessados,
                pontosAdicionados,
                utilizadoresTotais: utilizadores.length
            },
            relatorio
        };

        console.log('✅ Verificação concluída:', resultado.estatisticas);

        res.json(resultado);

    } catch (error) {
        console.error('❌ Erro na verificação automática de pontos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno na verificação automática de pontos',
            error: error.message
        });
    }
};

// Função auxiliar para calcular horas trabalhadas
const calcularHorasTrabalhadas = (horaEntrada, horaSaida) => {
    const entrada = new Date(horaEntrada);
    const saida = new Date(horaSaida);

    if (isNaN(entrada.getTime()) || isNaN(saida.getTime())) {
        console.error("Erro: Hora inválida.");
        return "0.00";
    }

    const diferencaMilissegundos = saida.getTime() - entrada.getTime();
    const horasTrabalhadas = diferencaMilissegundos / (1000 * 60 * 60);

    return horasTrabalhadas.toFixed(2);
};

// Endpoint para verificação manual (para testes)
const verificacaoManual = async (req, res) => {
    console.log('🔧 Verificação manual solicitada');
    await verificarEAdicionarPontosAlmoco(req, res);
};

// Endpoint para listar utilizadores que devem ter tratamento automático
const listarUtilizadoresComTratamento = async (req, res) => {
    try {
        const { empresa_id } = req.query;

        if (!empresa_id) {
            return res.status(400).json({ message: 'ID da empresa é obrigatório' });
        }

        const empresa = await Empresa.findByPk(empresa_id);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada' });
        }

        const User_Empresa = require('../models/user_empresa');

        const utilizadores = await User.findAll({
            include: [{
                model: User_Empresa,
                where: {
                    empresa_id: empresa_id
                },
                required: true,
                attributes: [] // Não precisamos dos dados da tabela de junção
            }],
            where: {
                isActive: true
            },
            attributes: ['id', 'nome', 'email', 'naotratapontosalmoco'],
            order: [['nome', 'ASC']]
        });

        const comTratamento = utilizadores.filter(u => !u.naotratapontosalmoco);
        const semTratamento = utilizadores.filter(u => u.naotratapontosalmoco);

        res.json({
            empresa: empresa.empresa,
            total: utilizadores.length,
            comTratamentoAutomatico: {
                count: comTratamento.length,
                utilizadores: comTratamento
            },
            semTratamentoAutomatico: {
                count: semTratamento.length,
                utilizadores: semTratamento
            }
        });

    } catch (error) {
        console.error('Erro ao listar utilizadores:', error);
        res.status(500).json({ message: 'Erro interno', error: error.message });
    }
};

module.exports = {
    verificarEAdicionarPontosAlmoco,
    verificacaoManual,
    listarUtilizadoresComTratamento
};
