
const ParteDiariaRascunho = require('../models/parteDiariaRascunho');

// Guardar ou atualizar rascunho
exports.guardarRascunho = async (req, res) => {
    try {
        const { mes, ano, dadosProcessados, linhasExternos, linhasPessoalEquip, diasEditadosManualmente } = req.body;
        const userId = req.user.id;

        console.log('Guardando rascunho para userId:', userId, 'mes:', mes, 'ano:', ano);

        // Verificar se já existe rascunho para este utilizador/mês/ano
        let rascunho = await ParteDiariaRascunho.findOne({
            where: { userId, mes, ano }
        });

        const dadosRascunho = {
            dadosProcessados: dadosProcessados || [],
            linhasExternos: linhasExternos || [],
            linhasPessoalEquip: linhasPessoalEquip || [],
            diasEditadosManualmente: diasEditadosManualmente || []
        };

        if (rascunho) {
            // Atualizar existente
            console.log('Atualizando rascunho existente:', rascunho.id);
            await rascunho.update(dadosRascunho);
        } else {
            // Criar novo
            console.log('Criando novo rascunho');
            rascunho = await ParteDiariaRascunho.create({
                userId,
                mes,
                ano,
                ...dadosRascunho
            });
        }

        console.log('Rascunho guardado com sucesso:', rascunho.id);
        res.json({
            success: true,
            message: 'Rascunho guardado com sucesso',
            rascunho
        });
    } catch (error) {
        console.error('Erro detalhado ao guardar rascunho:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro ao guardar rascunho',
            error: error.message,
            details: error.stack
        });
    }
};

// Obter rascunho
exports.obterRascunho = async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const userId = req.user.id;

        console.log('Buscando rascunho para userId:', userId, 'mes:', mes, 'ano:', ano);

        const rascunho = await ParteDiariaRascunho.findOne({
            where: { userId, mes: parseInt(mes), ano: parseInt(ano) }
        });

        if (!rascunho) {
            console.log('Nenhum rascunho encontrado');
            return res.json({
                success: true,
                rascunho: null
            });
        }

        console.log('Rascunho encontrado:', rascunho.id);
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

        console.log('Eliminando rascunho para userId:', userId, 'mes:', mes, 'ano:', ano);

        const deletedRows = await ParteDiariaRascunho.destroy({
            where: { userId, mes: parseInt(mes), ano: parseInt(ano) }
        });

        console.log('Linhas eliminadas:', deletedRows);

        res.json({
            success: true,
            message: 'Rascunho eliminado com sucesso',
            deletedRows
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
