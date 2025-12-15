const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// Endpoint para criar nova configuração de relatórios de pontos
router.post('/criar-configuracao', async (req, res) => {
    try {
        const { empresa_id, horario = "17:00", ativo = true, diasSemana = [1, 2, 3, 4, 5] } = req.body;

        if (!empresa_id) {
            return res.status(400).json({
                error: "ID da empresa é obrigatório"
            });
        }

        // Verificar se já existe configuração para esta empresa
        const configuracaoExistente = await Schedule.findOne({
            where: {
                tipo: "relatorio_pontos_email",
                empresa_id: empresa_id
            }
        });

        if (configuracaoExistente) {
            return res.status(400).json({
                error: "Já existe uma configuração para esta empresa. Use o endpoint de atualização."
            });
        }

        // Criar nova configuração
        const novaConfiguracao = await Schedule.create({
            message: `Relatório automático de pontos por email - Empresa ${empresa_id}`,
            contact_list: JSON.stringify([{
                name: "Sistema Automático - Relatórios",
                phone: "system"
            }]),
            frequency: "custom", // Custom porque tem dias específicos
            time: new Date(`1970-01-01T${horario}:00Z`),
            days: JSON.stringify(diasSemana),
            start_date: new Date(),
            enabled: ativo,
            priority: "normal",
            tipo: "relatorio_pontos_email",
            empresa_id: empresa_id
        });

        return res.json({
            success: true,
            message: "Configuração de relatórios criada com sucesso",
            configuracao: {
                id: novaConfiguracao.id,
                empresa_id: empresa_id,
                horario: horario,
                diasSemana: diasSemana,
                ativo: ativo
            }
        });

    } catch (error) {
        console.error("Erro ao criar configuração de relatórios:", error);
        res.status(500).json({
            error: "Erro interno ao criar configuração"
        });
    }
});

// Endpoint para listar todas as configurações
router.get('/listar-configuracoes', async (req, res) => {
    try {
        const configuracoes = await Schedule.findAll({
            where: {
                tipo: "relatorio_pontos_email"
            },
            order: [['empresa_id', 'ASC']]
        });

        const configuracoesFormatadas = configuracoes.map(config => ({
            id: config.id,
            empresa_id: config.empresa_id,
            horario: new Date(config.time).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            diasSemana: JSON.parse(config.days || '[1,2,3,4,5]'),
            ativo: config.enabled,
            ultimaExecucao: config.last_sent,
            totalExecucoes: config.total_sent || 0,
            proximaExecucao: calcularProximaExecucao(config)
        }));

        res.json({
            success: true,
            configuracoes: configuracoesFormatadas
        });

    } catch (error) {
        console.error("Erro ao listar configurações:", error);
        res.status(500).json({
            error: "Erro ao listar configurações"
        });
    }
});

// Endpoint para ativar/desativar configuração
router.patch('/toggle-configuracao/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        const configuracao = await Schedule.findByPk(id);

        if (!configuracao || configuracao.tipo !== 'relatorio_pontos_email') {
            return res.status(404).json({
                error: "Configuração não encontrada"
            });
        }

        await configuracao.update({ enabled: ativo });

        res.json({
            success: true,
            message: `Configuração ${ativo ? 'ativada' : 'desativada'} com sucesso`,
            configuracao: {
                id: configuracao.id,
                empresa_id: configuracao.empresa_id,
                ativo: ativo
            }
        });

    } catch (error) {
        console.error("Erro ao alterar configuração:", error);
        res.status(500).json({
            error: "Erro ao alterar configuração"
        });
    }
});

// Endpoint para eliminar configuração
router.delete('/eliminar-configuracao/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const configuracao = await Schedule.findByPk(id);

        if (!configuracao || configuracao.tipo !== 'relatorio_pontos_email') {
            return res.status(404).json({
                error: "Configuração não encontrada"
            });
        }

        await configuracao.destroy();

        res.json({
            success: true,
            message: "Configuração eliminada com sucesso"
        });

    } catch (error) {
        console.error("Erro ao eliminar configuração:", error);
        res.status(500).json({
            error: "Erro ao eliminar configuração"
        });
    }
});

// Endpoint para verificar status dos agendamentos
router.get('/status-agendamentos', async (req, res) => {
    try {
        const configuracoes = await Schedule.findAll({
            where: {
                tipo: "relatorio_pontos_email",
                enabled: true
            },
            order: [['empresa_id', 'ASC']]
        });

        const agora = new Date();
        const statusDetalhado = configuracoes.map(config => {
            const horarioConfig = new Date(config.time);
            const diasSemana = JSON.parse(config.days || '[1,2,3,4,5]');

            // Calcular próxima execução
            const proximaExecucao = calcularProximaExecucaoCompleta(config, agora);

            return {
                id: config.id,
                empresa_id: config.empresa_id,
                horario: horarioConfig.toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                diasSemana: diasSemana,
                proximaExecucao: proximaExecucao.toISOString(),
                minutosParaProxima: Math.ceil((proximaExecucao - agora) / (1000 * 60)),
                ultimaExecucao: config.last_sent,
                totalExecucoes: config.total_sent || 0,
                ativo: config.enabled,
                jaExecutouHoje: config.last_sent &&
                    new Date(config.last_sent).toDateString() === agora.toDateString()
            };
        });

        res.json({
            success: true,
            totalAgendamentos: configuracoes.length,
            agendamentosAtivos: statusDetalhado,
            horaAtual: agora.toISOString(),
            proximaVerificacao: statusDetalhado.length > 0 ?
                Math.min(...statusDetalhado.map(s => s.minutosParaProxima)) : null
        });

    } catch (error) {
        console.error("Erro ao verificar status dos agendamentos:", error);
        res.status(500).json({
            error: "Erro ao verificar status dos agendamentos"
        });
    }
});

// Endpoint para atualizar estatísticas
router.post('/atualizar-estatisticas/:empresa_id', async (req, res) => {
    try {
        const { empresa_id } = req.params;

        const configuracao = await Schedule.findOne({
            where: {
                tipo: "relatorio_pontos_email",
                empresa_id: empresa_id
            }
        });

        if (configuracao) {
            await configuracao.update({
                last_sent: new Date(),
                total_sent: (configuracao.total_sent || 0) + 1
            });

            res.json({
                success: true,
                message: "Estatísticas atualizadas"
            });
        } else {
            res.status(404).json({
                error: "Configuração não encontrada"
            });
        }

    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
        res.status(500).json({
            error: "Erro ao atualizar estatísticas"
        });
    }
});

// Funções auxiliares
function calcularProximaExecucao(config) {
    try {
        const agora = new Date();
        const horario = new Date(config.time);
        const diasSemana = JSON.parse(config.days || '[1,2,3,4,5]');

        const proximaExecucao = new Date();
        proximaExecucao.setHours(horario.getHours());
        proximaExecucao.setMinutes(horario.getMinutes());
        proximaExecucao.setSeconds(0);
        proximaExecucao.setMilliseconds(0);

        // Se já passou a hora hoje, começar a procurar amanhã
        if (proximaExecucao <= agora) {
            proximaExecucao.setDate(proximaExecucao.getDate() + 1);
        }

        // Encontrar próximo dia válido
        let tentativas = 0;
        while (!diasSemana.includes(proximaExecucao.getDay()) && tentativas < 7) {
            proximaExecucao.setDate(proximaExecucao.getDate() + 1);
            tentativas++;
        }

        return proximaExecucao.toISOString();
    } catch (error) {
        return null;
    }
}

function calcularProximaExecucaoCompleta(config, agora) {
    const horario = new Date(config.time);
    const diasSemana = JSON.parse(config.days || '[1,2,3,4,5]');

    const proximaExecucao = new Date();
    proximaExecucao.setHours(horario.getHours());
    proximaExecucao.setMinutes(horario.getMinutes());
    proximaExecucao.setSeconds(0);
    proximaExecucao.setMilliseconds(0);

    // Se já passou a hora hoje, começar a procurar amanhã
    if (proximaExecucao <= agora) {
        proximaExecucao.setDate(proximaExecucao.getDate() + 1);
    }

    // Encontrar próximo dia válido
    let tentativas = 0;
    while (!diasSemana.includes(proximaExecucao.getDay()) && tentativas < 7) {
        proximaExecucao.setDate(proximaExecucao.getDate() + 1);
        tentativas++;
    }

    return proximaExecucao;
}

module.exports = router;
