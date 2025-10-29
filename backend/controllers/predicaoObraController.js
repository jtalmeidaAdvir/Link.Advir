
const predicaoService = require('../services/predicaoObraService');

// Obter predição para uma obra específica
const obterPredicaoObra = async (req, res) => {
    try {
        const { obraId } = req.params;
        const { diasPrevistos } = req.query;

        if (!obraId) {
            return res.status(400).json({ 
                erro: 'ObraID é obrigatório' 
            });
        }

        const dias = diasPrevistos ? parseInt(diasPrevistos) : 30;
        const resultado = await predicaoService.preverExecucaoObra(obraId, dias);

        if (!resultado.sucesso) {
            return res.status(404).json(resultado);
        }

        res.json(resultado);
    } catch (error) {
        console.error('Erro ao obter predição:', error);
        res.status(500).json({ 
            erro: 'Erro ao processar predição',
            detalhes: error.message 
        });
    }
};

// Obter histórico de métricas
const obterMetricasHistoricas = async (req, res) => {
    try {
        const { obraId } = req.params;

        if (!obraId) {
            return res.status(400).json({ 
                erro: 'ObraID é obrigatório' 
            });
        }

        const cabecalhos = await predicaoService.obterDadosHistoricos(obraId);
        const metricas = predicaoService.calcularMetricas(cabecalhos);

        res.json({
            obraId,
            totalDias: metricas.length,
            metricas
        });
    } catch (error) {
        console.error('Erro ao obter métricas:', error);
        res.status(500).json({ 
            erro: 'Erro ao obter métricas',
            detalhes: error.message 
        });
    }
};

module.exports = {
    obterPredicaoObra,
    obterMetricasHistoricas
};
