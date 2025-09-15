
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

module.exports = router;
