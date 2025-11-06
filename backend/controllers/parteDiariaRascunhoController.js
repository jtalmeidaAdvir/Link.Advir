
const ParteDiariaRascunho = require('../models/parteDiariaRascunho');

// Guardar ou atualizar rascunho
exports.guardarRascunho = async (req, res) => {
    try {
        const { mes, ano, dadosProcessados, linhasExternos, linhasPessoalEquip, diasEditadosManualmente } = req.body;
        const userId = req.user.id;

        // Verificar se já existe rascunho para este utilizador/mês/ano
        let rascunho = await ParteDiariaRascunho.findOne({
            where: { userId, mes, ano }
        });

        if (rascunho) {
            // Atualizar existente
            await rascunho.update({
                dadosProcessados,
                linhasExternos,
                linhasPessoalEquip,
                diasEditadosManualmente,
                timestamp: new Date()
            });
        } else {
            // Criar novo
            rascunho = await ParteDiariaRascunho.create({
                userId,
                mes,
                ano,
                dadosProcessados,
                linhasExternos,
                linhasPessoalEquip,
                diasEditadosManualmente
            });
        }

        res.json({
            success: true,
            message: 'Rascunho guardado com sucesso',
            rascunho
        });
    } catch (error) {
        console.error('Erro ao guardar rascunho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao guardar rascunho',
            error: error.message
        });
    }
};

// Obter rascunho
exports.obterRascunho = async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const userId = req.user.id;

        const rascunho = await ParteDiariaRascunho.findOne({
            where: { userId, mes, ano }
        });

        if (!rascunho) {
            return res.json({
                success: true,
                rascunho: null
            });
        }

        res.json({
            success: true,
            rascunho
        });
    } catch (error) {
        console.error('Erro ao obter rascunho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter rascunho',
            error: error.message
        });
    }
};

// Eliminar rascunho
exports.eliminarRascunho = async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const userId = req.user.id;

        await ParteDiariaRascunho.destroy({
            where: { userId, mes, ano }
        });

        res.json({
            success: true,
            message: 'Rascunho eliminado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao eliminar rascunho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar rascunho',
            error: error.message
        });
    }
};
