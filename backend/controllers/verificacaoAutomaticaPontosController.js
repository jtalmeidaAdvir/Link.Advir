
const RegistoPontoObra = require('../models/registoPontoObra');
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
        const utilizadores = await User.findAll({
            include: [{
                model: Empresa,
                where: {
                    id: empresa_id
                },
                through: {
                    attributes: []
                },
                attributes: []
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

        // Definir intervalo do dia atual
        const dataInicio = new Date(`${dataAtual}T00:00:00.000Z`);
        const dataFim = new Date(`${dataAtual}T23:59:59.999Z`);

        for (const utilizador of utilizadores) {
            try {
                // Buscar registos do utilizador para hoje na tabela registo_ponto_obra
                const registosHoje = await RegistoPontoObra.findAll({
                    where: {
                        user_id: utilizador.id,
                        timestamp: {
                            [Op.between]: [dataInicio, dataFim]
                        }
                    },
                    order: [['timestamp', 'ASC']]
                });

                console.log(`👤 ${utilizador.nome}: ${registosHoje.length} registos encontrados`);

                if (registosHoje.length === 0) {
                    console.log(`⚠️ ${utilizador.nome} não tem registos hoje`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - sem registos',
                        detalhes: 'Nenhum registo encontrado para hoje'
                    });
                    continue;
                }

                // Verificar se já tem ponto de almoço (saída às 13:00 e entrada às 14:00)
                const temAlmocoRegistado = registosHoje.some(r => {
                    const hora = new Date(r.timestamp).getUTCHours();
                    const minuto = new Date(r.timestamp).getUTCMinutes();
                    return (hora === 13 && minuto === 0) || (hora === 14 && minuto === 0);
                });

                if (temAlmocoRegistado) {
                    console.log(`ℹ️ ${utilizador.nome} já tem pontos de almoço registados`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - já tem almoço registado',
                        detalhes: 'Pontos de almoço já existem'
                    });
                    continue;
                }

                // Calcular total de horas trabalhadas
                let totalHoras = 0;
                const entradas = registosHoje.filter(r => r.tipo === 'entrada');
                const saidas = registosHoje.filter(r => r.tipo === 'saida');

                // Calcular horas entre pares de entrada/saída completos
                for (let i = 0; i < Math.min(entradas.length, saidas.length); i++) {
                    const entrada = new Date(entradas[i].timestamp);
                    const saida = new Date(saidas[i].timestamp);
                    const diferencaMs = saida - entrada;
                    const diferencaHoras = diferencaMs / (1000 * 60 * 60);
                    totalHoras += diferencaHoras;
                }

                // Se há mais entradas do que saídas, significa que há uma entrada ativa (ainda não deu saída)
                // Calcular horas desde a última entrada até agora
                if (entradas.length > saidas.length) {
                    const ultimaEntrada = new Date(entradas[entradas.length - 1].timestamp);
                    const agora = new Date();
                    const diferencaMs = agora - ultimaEntrada;
                    const diferencaHoras = diferencaMs / (1000 * 60 * 60);
                    totalHoras += diferencaHoras;
                    console.log(`⏰ ${utilizador.nome}: Entrada ativa há ${diferencaHoras.toFixed(2)}h (sem saída ainda)`);
                }

                console.log(`⏱️ ${utilizador.nome}: ${totalHoras.toFixed(2)} horas trabalhadas até ao momento`);

                // Verificar se tem mais de 6 horas de trabalho
                if (totalHoras > 6) {
                    console.log(`🍽️ Adicionando pontos de almoço para ${utilizador.nome}`);

                    // Usar a obra do primeiro registo
                    const obraId = registosHoje[0].obra_id;
                    const latitude = registosHoje[0].latitude;
                    const longitude = registosHoje[0].longitude;

                    // Criar horários de almoço
                    const saidaAlmoco = new Date(`${dataAtual}T12:00:00.000Z`);
                    const entradaAlmoco = new Date(`${dataAtual}T13:00:00.000Z`);

                    // Criar registo de saída para almoço (às 13:00)
                    const registoSaidaAlmoco = await RegistoPontoObra.create({
                        user_id: utilizador.id,
                        obra_id: obraId,
                        tipo: 'saida',
                        timestamp: saidaAlmoco,
                        latitude: latitude,
                        longitude: longitude,
                        is_confirmed: true,
                        justificacao: 'Saída automática para almoço'
                    });

                    // Criar registo de entrada pós-almoço (às 14:00)
                    const registoEntradaAlmoco = await RegistoPontoObra.create({
                        user_id: utilizador.id,
                        obra_id: obraId,
                        tipo: 'entrada',
                        timestamp: entradaAlmoco,
                        latitude: latitude,
                        longitude: longitude,
                        is_confirmed: true,
                        justificacao: 'Entrada automática pós-almoço'
                    });

                    pontosAdicionados += 2; // Saída + Entrada
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Pontos de almoço adicionados',
                        horasTrabalhadas: totalHoras.toFixed(2),
                        saidaAlmoco: '12:00',
                        entradaAlmoco: '13:00',
                        obraId: obraId,
                        registoSaidaId: registoSaidaAlmoco.id,
                        registoEntradaId: registoEntradaAlmoco.id,
                        registosOriginais: registosHoje.length
                    });

                    console.log(`✅ Pontos de almoço adicionados para ${utilizador.nome}`);
                } else {
                    console.log(`⚠️ ${utilizador.nome} tem apenas ${totalHoras.toFixed(2)}h (< 6h)`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - menos de 6h de trabalho',
                        horasTrabalhadas: totalHoras.toFixed(2),
                        detalhes: 'Critério de 6h não cumprido'
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
                attributes: []
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
