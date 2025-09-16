
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

                // Se tiver exatamente 2 picagens (entrada de manhã e saída final)
                if (registosHoje.length === 2) {
                    const primeiroRegisto = registosHoje[0];
                    const segundoRegisto = registosHoje[1];

                    // Verificar se é uma entrada seguida de uma saída
                    if (primeiroRegisto.tipo === 'entrada' && segundoRegisto.tipo === 'saida') {
                        console.log(`🍽️ Adicionando pontos de almoço para ${utilizador.nome}`);

                        // Criar horários de almoço
                        const saidaAlmoco = new Date(`${dataAtual}T12:00:00.000Z`);
                        const entradaAlmoco = new Date(`${dataAtual}T13:00:00.000Z`);

                        // Criar registo de saída para almoço (às 13:00)
                        const registoSaidaAlmoco = await RegistoPontoObra.create({
                            user_id: utilizador.id,
                            obra_id: primeiroRegisto.obra_id, // Usar a mesma obra da entrada
                            tipo: 'saida',
                            timestamp: saidaAlmoco,
                            latitude: primeiroRegisto.latitude,
                            longitude: primeiroRegisto.longitude,
                            is_confirmed: true,
                            justificacao: 'Saída automática para almoço'
                        });

                        // Criar registo de entrada pós-almoço (às 14:00)
                        const registoEntradaAlmoco = await RegistoPontoObra.create({
                            user_id: utilizador.id,
                            obra_id: primeiroRegisto.obra_id, // Usar a mesma obra
                            tipo: 'entrada',
                            timestamp: entradaAlmoco,
                            latitude: primeiroRegisto.latitude,
                            longitude: primeiroRegisto.longitude,
                            is_confirmed: true,
                            justificacao: 'Entrada automática pós-almoço'
                        });

                        pontosAdicionados += 2; // Saída + Entrada
                        relatorio.push({
                            utilizador: utilizador.nome,
                            acao: 'Pontos de almoço adicionados',
                            saidaAlmoco: saidaAlmoco.toLocaleTimeString('pt-PT'),
                            entradaAlmoco: entradaAlmoco.toLocaleTimeString('pt-PT'),
                            obraId: primeiroRegisto.obra_id,
                            registoSaidaId: registoSaidaAlmoco.id,
                            registoEntradaId: registoEntradaAlmoco.id,
                            registosOriginais: registosHoje.length
                        });

                        console.log(`✅ Pontos de almoço adicionados para ${utilizador.nome}`);
                    } else {
                        console.log(`⚠️ ${utilizador.nome} tem 2 registos mas não são entrada->saída`);
                        relatorio.push({
                            utilizador: utilizador.nome,
                            acao: 'Ignorado - sequência incorreta',
                            detalhes: `Tipos: ${primeiroRegisto.tipo} -> ${segundoRegisto.tipo}`
                        });
                    }
                } else if (registosHoje.length === 0) {
                    console.log(`⚠️ ${utilizador.nome} não tem registos hoje`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - sem registos',
                        detalhes: 'Nenhum registo encontrado para hoje'
                    });
                } else if (registosHoje.length < 2) {
                    console.log(`⚠️ ${utilizador.nome} tem apenas ${registosHoje.length} registo(s)`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - registos insuficientes',
                        detalhes: `Apenas ${registosHoje.length} registo(s) encontrado(s)`
                    });
                } else {
                    console.log(`ℹ️ ${utilizador.nome} já tem ${registosHoje.length} registos (suficientes)`);
                    relatorio.push({
                        utilizador: utilizador.nome,
                        acao: 'Ignorado - já tem registos suficientes',
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
