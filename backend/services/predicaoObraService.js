
const ParteDiariaItem = require('../models/parteDiariaItem');
const ParteDiariaCabecalho = require('../models/parteDiariaCabecalho');
const { Op } = require('sequelize');

/**
 * Serviço de Predição de Obras usando análise de tendências
 * Modelo simplificado baseado em regressão linear das horas trabalhadas
 */

// Função auxiliar para calcular média
const calcularMedia = (valores) => {
    if (!valores || valores.length === 0) return 0;
    return valores.reduce((sum, val) => sum + val, 0) / valores.length;
};

// Função auxiliar para regressão linear simples
const regressaoLinear = (pontos) => {
    const n = pontos.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    pontos.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
};

// Obter dados históricos da obra
const obterDadosHistoricos = async (obraId) => {
    try {
        const cabecalhos = await ParteDiariaCabecalho.findAll({
            where: { 
                ObraID: obraId,
                IntegradoERP: true 
            },
            include: [{
                model: ParteDiariaItem,
                as: 'ParteDiariaItems'
            }],
            order: [['Data', 'ASC']]
        });

        return cabecalhos;
    } catch (error) {
        console.error('Erro ao obter dados históricos:', error);
        throw error;
    }
};

// Calcular métricas de produtividade
const calcularMetricas = (cabecalhos) => {
    const metricasPorDia = [];
    let horasAcumuladas = 0;
    let custoAcumulado = 0;

    cabecalhos.forEach((cab, index) => {
        const itens = cab.ParteDiariaItems || [];
        
        const horasDia = itens.reduce((sum, item) => {
            return sum + (Number(item.NumHoras) || 0);
        }, 0);

        const custoDia = itens.reduce((sum, item) => {
            const horas = Number(item.NumHoras) || 0;
            const preco = Number(item.PrecoUnit) || 0;
            return sum + (horas * preco);
        }, 0);

        horasAcumuladas += horasDia;
        custoAcumulado += custoDia;

        metricasPorDia.push({
            dia: index + 1,
            data: cab.Data,
            horasDia,
            custoDia,
            horasAcumuladas,
            custoAcumulado,
            produtividadeMedia: horasAcumuladas / (index + 1)
        });
    });

    return metricasPorDia;
};

// Fazer predição usando IA simples
const preverExecucaoObra = async (obraId, diasPrevistos = 30) => {
    try {
        // 1. Obter dados históricos
        const cabecalhos = await obterDadosHistoricos(obraId);
        
        if (cabecalhos.length === 0) {
            return {
                sucesso: false,
                mensagem: 'Sem dados históricos suficientes para predição'
            };
        }

        // 2. Calcular métricas
        const metricas = calcularMetricas(cabecalhos);
        
        // 3. Preparar dados para regressão linear
        const pontosHoras = metricas.map(m => ({
            x: m.dia,
            y: m.horasAcumuladas
        }));

        const pontosCusto = metricas.map(m => ({
            x: m.dia,
            y: m.custoAcumulado
        }));

        // 4. Calcular tendências
        const tendenciaHoras = regressaoLinear(pontosHoras);
        const tendenciaCusto = regressaoLinear(pontosCusto);

        // 5. Fazer predições
        const ultimoDia = metricas[metricas.length - 1].dia;
        const diaFinal = ultimoDia + diasPrevistos;

        const horasPrevistoFinal = tendenciaHoras.slope * diaFinal + tendenciaHoras.intercept;
        const custoPrevistoFinal = tendenciaCusto.slope * diaFinal + tendenciaCusto.intercept;

        // 6. Calcular métricas adicionais
        const horasAtual = metricas[metricas.length - 1].horasAcumuladas;
        const custoAtual = metricas[metricas.length - 1].custoAcumulado;
        
        const mediaHorasPorDia = calcularMedia(metricas.map(m => m.horasDia));
        const mediaCustoPorDia = calcularMedia(metricas.map(m => m.custoDia));

        // 7. Calcular confiança da predição (R²)
        const calcularR2 = (pontos, tendencia) => {
            const media = calcularMedia(pontos.map(p => p.y));
            let ssTotal = 0, ssResidual = 0;
            
            pontos.forEach(p => {
                const previsto = tendencia.slope * p.x + tendencia.intercept;
                ssTotal += Math.pow(p.y - media, 2);
                ssResidual += Math.pow(p.y - previsto, 2);
            });
            
            return 1 - (ssResidual / ssTotal);
        };

        const confiancaHoras = calcularR2(pontosHoras, tendenciaHoras);
        const confiancaCusto = calcularR2(pontosCusto, tendenciaCusto);

        return {
            sucesso: true,
            obraId,
            analiseHistorica: {
                diasAnalisados: metricas.length,
                horasAcumuladas: horasAtual,
                custoAcumulado: custoAtual,
                mediaHorasPorDia: mediaHorasPorDia.toFixed(2),
                mediaCustoPorDia: mediaCustoPorDia.toFixed(2)
            },
            predicao: {
                diasPrevistos,
                diaFinalEstimado: diaFinal,
                horasPrevistoFinal: horasPrevistoFinal.toFixed(2),
                custoPrevistoFinal: custoPrevistoFinal.toFixed(2),
                horasRestantes: (horasPrevistoFinal - horasAtual).toFixed(2),
                custoRestante: (custoPrevistoFinal - custoAtual).toFixed(2)
            },
            confianca: {
                nivelConfiancaHoras: (confiancaHoras * 100).toFixed(2) + '%',
                nivelConfiancaCusto: (confiancaCusto * 100).toFixed(2) + '%',
                qualidade: confiancaCusto > 0.7 ? 'Alta' : confiancaCusto > 0.4 ? 'Média' : 'Baixa'
            },
            tendencias: {
                crescimentoDiarioHoras: tendenciaHoras.slope.toFixed(2),
                crescimentoDiarioCusto: tendenciaCusto.slope.toFixed(2)
            }
        };

    } catch (error) {
        console.error('Erro na predição:', error);
        throw error;
    }
};

module.exports = {
    preverExecucaoObra,
    obterDadosHistoricos,
    calcularMetricas
};
