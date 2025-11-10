const Comunicado = require("../models/comunicado");
const ComunicadoLeitura = require("../models/comunicadoLeitura");
const User = require("../models/user");
const UserEmpresa = require("../models/user_empresa");
const { Op } = require("sequelize");

function toDateOrNull(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

const criarComunicado = async (req, res) => {
    try {
        const {
            titulo,
            mensagem,
            remetente_id,
            destinatarios_tipo,
            destinatarios_ids,
            prioridade,
            data_expiracao,
            empresa_id, // <<< AGORA VEM DO BODY
        } = req.body;

        if (!empresa_id) {
            return res.status(400).json({
                success: false,
                error: "empresa_id é obrigatório.",
            });
        }

        // Buscar remetente
        const remetente = await User.findByPk(remetente_id, {
            attributes: ["id", "nome"],
        });

        if (!remetente) {
            return res.status(400).json({
                success: false,
                error: "Remetente inválido.",
            });
        }

        // Criar comunicado com empresa_id
        const comunicado = await Comunicado.create({
            titulo,
            mensagem,
            remetente_id,
            remetente_nome: remetente.nome,
            destinatarios_tipo,
            destinatarios_ids: destinatarios_ids || [],
            prioridade: prioridade || "normal",
            data_expiracao: toDateOrNull(data_expiracao),
            empresa_id, // <<< GRAVAR AQUI
        });

        // Determinar destinatários
        let destinatarios = [];

        if (destinatarios_tipo === "todos") {
            // Buscar todos os usuários da mesma empresa
            const usersEmpresas = await UserEmpresa.findAll({
                where: { empresa_id },
                attributes: ["user_id"],
            });

            const userIds = usersEmpresas.map((ue) => ue.user_id);

            const users = await User.findAll({
                where: { id: userIds },
                attributes: ["id", "nome"],
            });

            destinatarios = users.map((u) => ({
                usuario_id: u.id,
                usuario_nome: u.nome,
            }));
        } else {
            const users = await User.findAll({
                where: { id: destinatarios_ids },
                attributes: ["id", "nome"],
            });

            destinatarios = users.map((u) => ({
                usuario_id: u.id,
                usuario_nome: u.nome,
            }));
        }

        // Criar registros de leitura
        await Promise.all(
            destinatarios.map((dest) =>
                ComunicadoLeitura.create({
                    comunicado_id: comunicado.id,
                    usuario_id: dest.usuario_id,
                    usuario_nome: dest.usuario_nome,
                    empresa_id, // <<< também associar à empresa
                    lido: false,
                })
            )
        );

        return res.status(201).json({
            success: true,
            data: comunicado,
            message: "Comunicado criado com sucesso",
        });

    } catch (error) {
        console.error("Erro ao criar comunicado:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const listarComunicados = async (req, res) => {
    try {
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        // Buscar comunicados da empresa
        const comunicados = await Comunicado.findAll({
            where: { 
                ativo: true,
                empresa_id: empresaId, // <<< filtro por empresa
            },
            order: [["data_criacao", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            data: comunicados,
        });
    } catch (error) {
        console.error("Erro ao listar comunicados:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const listarComunicadosUsuario = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        const leituras = await ComunicadoLeitura.findAll({
            where: { usuario_id, empresa_id: empresaId },
            include: [
                {
                    model: Comunicado,
                    where: { ativo: true, empresa_id: empresaId },
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            data: leituras,
        });
    } catch (error) {
        console.error("Erro ao listar comunicados do usuário:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const marcarComoLido = async (req, res) => {
    try {
        const { comunicado_id, usuario_id } = req.params;
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        const leitura = await ComunicadoLeitura.findOne({
            where: { comunicado_id, usuario_id, empresa_id: empresaId },
        });

        if (!leitura) {
            return res.status(404).json({
                success: false,
                error: "Registo de leitura não encontrado",
            });
        }

        await leitura.update({
            lido: true,
            data_leitura: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: "Comunicado marcado como lido",
        });
    } catch (error) {
        console.error("Erro ao marcar comunicado como lido:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const obterEstatisticasLeitura = async (req, res) => {
    try {
        const { comunicado_id } = req.params;
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        // Buscar leituras com empresa_id ou NULL (para dados antigos)
        const leituras = await ComunicadoLeitura.findAll({
            where: { 
                comunicado_id,
                [Op.or]: [
                    { empresa_id: empresaId },
                    { empresa_id: null },
                    { empresa_id: 0 }
                ]
            },
        });

        const totalDestinatarios = leituras.length;
        const totalLidos = leituras.filter((l) => l.lido).length;
        const totalNaoLidos = totalDestinatarios - totalLidos;

        const lidos = leituras.filter((l) => l.lido);
        const naoLidos = leituras.filter((l) => !l.lido);

        return res.status(200).json({
            success: true,
            data: {
                total_destinatarios: totalDestinatarios,
                total_lidos: totalLidos,
                total_nao_lidos: totalNaoLidos,
                percentagem_leitura: totalDestinatarios > 0 
                    ? ((totalLidos / totalDestinatarios) * 100).toFixed(2) 
                    : 0,
                lidos: lidos.map((l) => ({
                    usuario_id: l.usuario_id,
                    usuario_nome: l.usuario_nome,
                    data_leitura: l.data_leitura,
                })),
                nao_lidos: naoLidos.map((l) => ({
                    usuario_id: l.usuario_id,
                    usuario_nome: l.usuario_nome,
                })),
            },
        });
    } catch (error) {
        console.error("Erro ao obter estatísticas de leitura:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const contarNaoLidos = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        const count = await ComunicadoLeitura.count({
            where: {
                usuario_id,
                empresa_id: empresaId,
                lido: false,
            },
            include: [
                {
                    model: Comunicado,
                    where: { ativo: true, empresa_id: empresaId },
                },
            ],
        });

        return res.status(200).json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error("Erro ao contar comunicados não lidos:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

const desativarComunicado = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                error: "empresaId é obrigatório",
            });
        }

        const comunicado = await Comunicado.findOne({
            where: { id, empresa_id: empresaId },
        });

        if (!comunicado) {
            return res.status(404).json({
                success: false,
                error: "Comunicado não encontrado",
            });
        }

        await comunicado.update({ ativo: false });

        return res.status(200).json({
            success: true,
            message: "Comunicado desativado com sucesso",
        });
    } catch (error) {
        console.error("Erro ao desativar comunicado:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
            details: error.message,
        });
    }
};

module.exports = {
    criarComunicado,
    listarComunicados,
    listarComunicadosUsuario,
    marcarComoLido,
    obterEstatisticasLeitura,
    contarNaoLidos,
    desativarComunicado,
};
