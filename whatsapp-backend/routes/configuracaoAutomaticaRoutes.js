
const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// Endpoint para configurar verificação automática de uma empresa
router.post('/configurar-empresa', async (req, res) => {
    try {
        const { empresa_id, horario = "15:00", ativo = true } = req.body;

        if (!empresa_id) {
            return res.status(400).json({
                error: "ID da empresa é obrigatório"
            });
        }

        // Verificar se já existe agendamento para esta empresa
        const agendamentoExistente = await Schedule.findOne({
            where: {
                tipo: "verificacao_pontos_almoco",
                empresa_id: empresa_id
            }
        });

        if (agendamentoExistente) {
            // Atualizar agendamento existente
            await agendamentoExistente.update({
                time: new Date(`1970-01-01T${horario}:00Z`),
                enabled: ativo
            });

            return res.json({
                success: true,
                message: "Configuração atualizada com sucesso",
                agendamento: {
                    id: agendamentoExistente.id,
                    empresa_id: empresa_id,
                    horario: horario,
                    ativo: ativo,
                    tipo: "atualização"
                }
            });
        } else {
            // Criar novo agendamento
            const novoAgendamento = await Schedule.create({
                message: `Verificação automática de pontos de almoço - Empresa ${empresa_id}`,
                contact_list: JSON.stringify([{
                    name: "Sistema Automático",
                    phone: "system"
                }]),
                frequency: "daily",
                time: new Date(`1970-01-01T${horario}:00Z`),
                days: JSON.stringify([1, 2, 3, 4, 5]), // Segunda a Sexta
                start_date: new Date(),
                enabled: ativo,
                priority: "normal",
                tipo: "verificacao_pontos_almoco",
                empresa_id: empresa_id
            });

            return res.json({
                success: true,
                message: "Configuração criada com sucesso",
                agendamento: {
                    id: novoAgendamento.id,
                    empresa_id: empresa_id,
                    horario: horario,
                    ativo: ativo,
                    tipo: "criação"
                }
            });
        }

    } catch (error) {
        console.error("Erro ao configurar verificação automática:", error);
        res.status(500).json({
            error: "Erro interno ao configurar verificação automática"
        });
    }
});

// Endpoint para listar configurações por empresa
router.get('/listar-configuracoes', async (req, res) => {
    try {
        const agendamentos = await Schedule.findAll({
            where: {
                tipo: "verificacao_pontos_almoco"
            },
            order: [['empresa_id', 'ASC']]
        });

        const configuracoes = agendamentos.map(agendamento => ({
            id: agendamento.id,
            empresa_id: agendamento.empresa_id,
            horario: new Date(agendamento.time).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            ativo: agendamento.enabled,
            frequencia: "Dias úteis",
            ultimaExecucao: agendamento.last_sent,
            totalExecucoes: agendamento.total_sent
        }));

        res.json({
            success: true,
            configuracoes: configuracoes
        });

    } catch (error) {
        console.error("Erro ao listar configurações:", error);
        res.status(500).json({
            error: "Erro ao listar configurações"
        });
    }
});

// Endpoint para ativar/desativar verificação de uma empresa
router.put('/toggle-empresa/:empresa_id', async (req, res) => {
    try {
        const { empresa_id } = req.params;
        const { ativo } = req.body;

        const agendamento = await Schedule.findOne({
            where: {
                tipo: "verificacao_pontos_almoco",
                empresa_id: empresa_id
            }
        });

        if (!agendamento) {
            return res.status(404).json({
                error: "Configuração não encontrada para esta empresa"
            });
        }

        await agendamento.update({ enabled: ativo });

        res.json({
            success: true,
            message: `Verificação automática ${ativo ? 'ativada' : 'desativada'} para empresa ${empresa_id}`,
            configuracao: {
                empresa_id: empresa_id,
                ativo: ativo
            }
        });

    } catch (error) {
        console.error("Erro ao alterar estado:", error);
        res.status(500).json({
            error: "Erro ao alterar estado da verificação automática"
        });
    }
});

// Endpoint para verificar status dos agendamentos ativos
router.get('/status-agendamentos', async (req, res) => {
    try {
        const agendamentos = await Schedule.findAll({
            where: {
                tipo: "verificacao_pontos_almoco",
                enabled: true
            },
            order: [['empresa_id', 'ASC']]
        });

        const agora = new Date();
        const statusDetalhado = agendamentos.map(agendamento => {
            const horarioAgendamento = new Date(agendamento.time);
            const hojeComHorario = new Date();
            hojeComHorario.setHours(horarioAgendamento.getHours());
            hojeComHorario.setMinutes(horarioAgendamento.getMinutes());
            hojeComHorario.setSeconds(0);
            hojeComHorario.setMilliseconds(0);

            // Calcular próxima execução
            let proximaExecucao = new Date(hojeComHorario);
            if (proximaExecucao <= agora) {
                proximaExecucao.setDate(proximaExecucao.getDate() + 1);
            }

            // Verificar se é dia útil
            const diaSemana = proximaExecucao.getDay();
            while (diaSemana === 0 || diaSemana === 6) { // Saltar fins de semana
                proximaExecucao.setDate(proximaExecucao.getDate() + 1);
            }

            return {
                id: agendamento.id,
                empresa_id: agendamento.empresa_id,
                horario: horarioAgendamento.toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                proximaExecucao: proximaExecucao.toISOString(),
                minutosParaProxima: Math.ceil((proximaExecucao - agora) / (1000 * 60)),
                ultimaExecucao: agendamento.last_sent,
                totalExecucoes: agendamento.total_sent || 0,
                ativo: agendamento.enabled,
                jaExecutouHoje: agendamento.last_sent && 
                    new Date(agendamento.last_sent).toDateString() === agora.toDateString()
            };
        });

        res.json({
            success: true,
            totalAgendamentos: agendamentos.length,
            agendamentosAtivos: statusDetalhado,
            horaAtual: agora.toISOString(),
            proximaVerificacao: statusDetalhado.length > 0 ? 
                Math.min(...statusDetalhado.map(s => s.minutosParaProxima)) : null
        });

    } catch (error) {
        console.error("Erro ao verificar status dos agendamentos:", error);
        res.status(500).json({
            error: "Erro interno ao verificar status dos agendamentos"
        });
    }
});

// Endpoint para forçar execução de um agendamento específico
router.post('/executar-agora/:empresa_id', async (req, res) => {
    try {
        const { empresa_id } = req.params;

        // Verificar se existe agendamento para esta empresa
        const agendamento = await Schedule.findOne({
            where: {
                tipo: "verificacao_pontos_almoco",
                empresa_id: empresa_id
            }
        });

        if (!agendamento) {
            return res.status(404).json({
                error: "Agendamento não encontrado para esta empresa"
            });
        }

        // Executar verificação
        const response = await fetch(`https://backend.advir.pt/api/verificacao-automatica/verificacao-manual?empresa_id=${empresa_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sistema_automatico'
            }
        });

        const resultado = await response.json();

        if (response.ok && resultado.success) {
            // Atualizar estatísticas do agendamento
            await agendamento.update({
                last_sent: new Date(),
                total_sent: (agendamento.total_sent || 0) + 1
            });

            res.json({
                success: true,
                message: "Execução manual concluída com sucesso",
                resultado: resultado.estatisticas
            });
        } else {
            res.status(400).json({
                error: "Erro na execução da verificação",
                detalhes: resultado.message
            });
        }

    } catch (error) {
        console.error("Erro ao executar verificação manual:", error);
        res.status(500).json({
            error: "Erro interno ao executar verificação"
        });
    }
});

// Endpoint para atualizar estatísticas de um agendamento
router.post('/atualizar-estatisticas/:empresa_id', async (req, res) => {
    try {
        const { empresa_id } = req.params;

        const agendamento = await Schedule.findOne({
            where: {
                tipo: "verificacao_pontos_almoco",
                empresa_id: empresa_id
            }
        });

        if (agendamento) {
            await agendamento.update({
                last_sent: new Date(),
                total_sent: (agendamento.total_sent || 0) + 1
            });

            res.json({
                success: true,
                message: "Estatísticas atualizadas"
            });
        } else {
            res.status(404).json({
                error: "Agendamento não encontrado"
            });
        }

    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
        res.status(500).json({
            error: "Erro interno ao atualizar estatísticas"
        });
    }
});

// Endpoint de debug para verificar se o sistema de agendamentos está ativo
router.get('/debug-agendamentos', async (req, res) => {
    try {
        console.log('🔍 Iniciando debug dos agendamentos...');
        
        // Verificar se existem agendamentos na base de dados
        const todosAgendamentos = await Schedule.findAll({
            where: {
                tipo: "verificacao_pontos_almoco"
            }
        });

        const agendamentosAtivos = await Schedule.findAll({
            where: {
                tipo: "verificacao_pontos_almoco",
                enabled: true
            }
        });

        const agora = new Date();
        const debug = {
            timestamp: agora.toISOString(),
            totalAgendamentos: todosAgendamentos.length,
            agendamentosAtivos: agendamentosAtivos.length,
            detalhesAgendamentos: todosAgendamentos.map(ag => ({
                id: ag.id,
                empresa_id: ag.empresa_id,
                horario: new Date(ag.time).toLocaleTimeString('pt-PT'),
                enabled: ag.enabled,
                last_sent: ag.last_sent,
                total_sent: ag.total_sent || 0,
                created_at: ag.createdAt || ag.created_at
            })),
            verificacoesPendentes: []
        };

        // Para cada agendamento ativo, calcular quando será a próxima execução
        agendamentosAtivos.forEach(ag => {
            const horario = new Date(ag.time);
            const proximaExecucao = new Date();
            proximaExecucao.setHours(horario.getHours());
            proximaExecucao.setMinutes(horario.getMinutes());
            proximaExecucao.setSeconds(0);
            proximaExecucao.setMilliseconds(0);

            if (proximaExecucao <= agora) {
                proximaExecucao.setDate(proximaExecucao.getDate() + 1);
            }

            debug.verificacoesPendentes.push({
                empresa_id: ag.empresa_id,
                proximaExecucao: proximaExecucao.toISOString(),
                minutosRestantes: Math.ceil((proximaExecucao - agora) / (1000 * 60))
            });
        });

        console.log('🔍 Debug completo:', debug);

        // Status do sistema
        const horaAtual = agora.toLocaleTimeString('pt-PT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const statusSistema = {
            sistemaAtivo: true, // Assumindo que está ativo se chegou aqui
            horaAtual: horaAtual,
            dataAtual: agora.toLocaleDateString('pt-PT'),
            servidorRodando: true,
            totalAgendamentosAtivos: agendamentosAtivos.length
        };

        res.json({
            success: true,
            debug: debug,
            statusSistema: statusSistema,
            recomendacoes: [
                "✅ Verificar se o WhatsApp backend está em execução",
                "✅ Confirmar se os agendamentos estão enabled=true",
                "⚠️ Verificar logs do servidor para erros de execução",
                "💡 Testar execução manual primeiro",
                "🔄 Agendamentos verificam a cada minuto se devem executar",
                "⏰ Execuções apenas em dias úteis (Segunda a Sexta)"
            ],
            proximasVerificacoes: debug.verificacoesPendentes.slice(0, 3)
        });

    } catch (error) {
        console.error('❌ Erro no debug:', error);
        res.status(500).json({
            error: "Erro no debug dos agendamentos",
            detalhes: error.message
        });
    }
});

module.exports = router;
