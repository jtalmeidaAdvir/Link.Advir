const axios = require('axios');
const { getAuthToken } = require('./tokenService');

/**
 * Serviço que busca relatório de pontos e envia emails para responsáveis das obras
 * Este serviço integra:
 * 1. Backend (relatório de pontos)
 * 2. webPrimaveraApi (email do responsável)
 * 3. Envio de email
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://backend.advir.pt';
const WEBAPI_URL = process.env.WEBAPI_URL || 'https://webapiprimavera.advir.pt';

    // Estados principais
/**
 * Helper para obter token do Primavera
 */
async function obterTokenPrimavera(empresaData, urlempresa) {
    console.log('🔐 Buscando credenciais da empresa do Primavera...');
    console.log('🏢 Empresa encontrada:', empresaData.empresa);

    // Verificar se a password está encriptada (contém ':' indicando hash)
    let primaveraPassword = empresaData.password;
    if (primaveraPassword && primaveraPassword.includes(':')) {
        console.log('⚠️ Password encriptada detectada, usando variável de ambiente');
        // Password está encriptada, tentar usar variável de ambiente
        primaveraPassword = 'Code495@';
        if (!primaveraPassword) {
            throw new Error('Password do Primavera não disponível. Configure PRIMAVERA_PASSWORD ou forneça credenciais válidas.');
        }
    }

    // Obter token do Primavera
    const primaveraToken = await getAuthToken(
        {
            username: empresaData.username,
            password: primaveraPassword,
            company: empresaData.empresa,
            instance: 'DEFAULT',
            line: empresaData.linha || 'PROFISSIONAL'
        },
        urlempresa || empresaData.urlempresa
    );
    console.log('✅ Token do Primavera obtido com sucesso');
    return primaveraToken;
}

/**
 * Envia relatórios de pontos para todas as obras com pontos registados
 */
const enviarRelatoriosPontosObras = async (req, res) => {
    try {
        const { data, empresa_id, token, urlempresa } = req.body;

        console.log('📊 Iniciando envio de relatórios de pontos');
        console.log('📅 Data:', data || 'hoje');
        console.log('🏢 Empresa ID:', empresa_id || 'todas');
        console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
        console.log('🌐 URL Empresa:', urlempresa || 'Não fornecido');

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token de autenticação é obrigatório'
            });
        }

        // 1. Buscar relatório de pontos do backend
        console.log('🔍 Buscando relatório de pontos...');
        console.log('🌐 Backend URL:', BACKEND_URL);

        const params = {};
        if (data) params.data = data;
        if (empresa_id) params.empresa_id = empresa_id;

        console.log('📋 Parâmetros:', params);

        const url = `${BACKEND_URL}/api/registo-ponto-obra/relatorio-pontos`;
        console.log('🎯 URL completa:', url);

        const relatorioResponse = await axios.get(url,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params
            }
        );

        const relatorioData = relatorioResponse.data;
        console.log(`✅ Relatório obtido: ${relatorioData.totalObras} obras com pontos`);

        if (relatorioData.totalObras === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nenhuma obra com pontos registados hoje',
                totalObras: 0,
                emailsEnviados: 0
            });
        }

        // 2. Obter credenciais da empresa e token do Primavera
        let primaveraToken = null;
        if (empresa_id) {
            try {
                const empresaResponse = await axios.get(
                    `${BACKEND_URL}/api/empresas/${empresa_id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                const empresaData = empresaResponse.data;
                primaveraToken = await obterTokenPrimavera(empresaData, urlempresa);
            } catch (error) {
                console.error('❌ Erro ao obter credenciais/token do Primavera:', error.message);
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao autenticar no Primavera',
                    details: error.message
                });
            }
        }

        // 3. Para cada obra, buscar email do responsável e enviar email
        const resultados = [];
        let emailsEnviados = 0;
        let erros = 0;

        for (const obra of relatorioData.obras) {
            try {
                console.log(`📧 Processando obra: ${obra.obraCodigo} (ID: ${obra.obraId})`);

                // Buscar email do responsável
                let emailResponsavel = null;
                let nomeResponsavel = null;

                if (obra.obraCodigo) {
                    try {
                        const responsavelResponse = await axios.get(
                            `${WEBAPI_URL}/detalhesObra/GetEmailResponsabelObra/${obra.obraCodigo}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${primaveraToken || token}`,
                                    'urlempresa': urlempresa || '' // URL da empresa do localStorage
                                }
                            }
                        );

                        if (responsavelResponse.data?.DataSet?.Table?.[0]) {
                            const responsavelData = responsavelResponse.data.DataSet.Table[0];
                            emailResponsavel = responsavelData.Email;
                            nomeResponsavel = responsavelData.CDU_respobra?.trim();
                            console.log(`✅ Responsável encontrado: ${nomeResponsavel} (${emailResponsavel})`);
                        } else {
                            console.log('⚠️ Responsável não encontrado na API Primavera');
                        }
                    } catch (error) {
                        console.log('⚠️ Erro ao buscar responsável:', error.message);
                    }
                }

                // Se não encontrou email do responsável, skip
                if (!emailResponsavel) {
                    console.log('⏭️ Pulando obra sem email de responsável');
                    resultados.push({
                        obraId: obra.obraId,
                        obraNome: obra.obraNome,
                        status: 'skipped',
                        motivo: 'Email do responsável não encontrado'
                    });
                    continue;
                }

                // Enviar email
                console.log('📨 Enviando email...');
                const emailPayload = {
                    emailDestinatario: emailResponsavel,
                    nomeResponsavel: nomeResponsavel,
                    obraNome: obra.obraNome,
                    obraCodigo: obra.obraCodigo,
                    obraLocalizacao: obra.obraLocalizacao,
                    colaboradores: obra.colaboradores,
                    data: relatorioData.data,
                    totalColaboradores: obra.totalColaboradores
                };

                const emailResponse = await axios.post(
                    `${WEBAPI_URL}/send-email-relatorio-pontos`,
                    emailPayload
                );

                if (emailResponse.data.success) {
                    console.log(`✅ Email enviado com sucesso para ${emailResponsavel}`);
                    emailsEnviados++;
                    resultados.push({
                        obraId: obra.obraId,
                        obraNome: obra.obraNome,
                        emailEnviado: emailResponsavel,
                        status: 'success'
                    });
                } else {
                    throw new Error('Resposta de email sem sucesso');
                }

            } catch (error) {
                console.error(`❌ Erro ao processar obra ${obra.obraNome}:`, error.message);
                erros++;
                resultados.push({
                    obraId: obra.obraId,
                    obraNome: obra.obraNome,
                    status: 'error',
                    erro: error.message
                });
            }
        }

        // Retornar resumo
        console.log(`✅ Processo concluído: ${emailsEnviados} emails enviados, ${erros} erros`);

        return res.status(200).json({
            success: true,
            message: `Relatórios processados com sucesso`,
            totalObras: relatorioData.totalObras,
            emailsEnviados,
            erros,
            resultados
        });

    } catch (error) {
        console.error('❌ Erro geral ao enviar relatórios:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Erro ao enviar relatórios de pontos',
            details: error.message
        });
    }
};

/**
 * Envia relatório de uma obra específica
 */
const enviarRelatorioPontoObra = async (req, res) => {
    try {
        const { obraId, obraCodigo, data, token, urlempresa, empresa_id } = req.body;

        console.log('📊 Enviando relatório para obra específica');
        console.log('🏗️ Obra ID:', obraId);
        console.log('🔢 Código:', obraCodigo);
        console.log('🏢 Empresa ID:', empresa_id);
        console.log('🌐 URL Empresa:', urlempresa || 'Não fornecido');

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token de autenticação é obrigatório'
            });
        }

        if (!obraId && !obraCodigo) {
            return res.status(400).json({
                success: false,
                error: 'obraId ou obraCodigo é obrigatório'
            });
        }

        // 1. Buscar relatório completo
        const params = {};
        if (data) params.data = data;

        const relatorioResponse = await axios.get(
            `${BACKEND_URL}/api/registo-ponto-obra/relatorio-pontos`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params
            }
        );

        // 2. Filtrar obra específica
        const obra = relatorioResponse.data.obras.find(o =>
            (obraId && o.obraId === parseInt(obraId)) ||
            (obraCodigo && o.obraCodigo === obraCodigo)
        );

        if (!obra) {
            return res.status(404).json({
                success: false,
                error: 'Obra não encontrada ou sem pontos registados hoje'
            });
        }

        // 3. Obter token do Primavera
        let primaveraToken = null;
        if (empresa_id) {
            try {
                const empresaResponse = await axios.get(
                    `${BACKEND_URL}/api/empresas/${empresa_id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                const empresaData = empresaResponse.data;
                primaveraToken = await obterTokenPrimavera(empresaData, urlempresa);
            } catch (error) {
                console.error('❌ Erro ao obter credenciais/token do Primavera:', error.message);
            }
        }

        // 4. Buscar email do responsável
        let emailResponsavel = null;
        let nomeResponsavel = null;

        if (obra.obraCodigo) {
            try {
                const responsavelResponse = await axios.get(
                    `${WEBAPI_URL}/detalhesObra/GetEmailResponsabelObra/${obra.obraCodigo}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${primaveraToken || token}`,
                            'urlempresa': urlempresa || ''
                        }
                    }
                );

                if (responsavelResponse.data?.DataSet?.Table?.[0]) {
                    const responsavelData = responsavelResponse.data.DataSet.Table[0];
                    emailResponsavel = responsavelData.Email;
                    nomeResponsavel = responsavelData.CDU_respobra?.trim();
                }
            } catch (error) {
                console.log('⚠️ Erro ao buscar responsável:', error.message);
            }
        }

        if (!emailResponsavel) {
            return res.status(404).json({
                success: false,
                error: 'Email do responsável não encontrado'
            });
        }

        // 4. Enviar email
        const emailPayload = {
            emailDestinatario: emailResponsavel,
            nomeResponsavel: nomeResponsavel,
            obraNome: obra.obraNome,
            obraCodigo: obra.obraCodigo,
            obraLocalizacao: obra.obraLocalizacao,
            colaboradores: obra.colaboradores,
            data: relatorioResponse.data.data,
            totalColaboradores: obra.totalColaboradores
        };

        const emailResponse = await axios.post(
            `${WEBAPI_URL}/send-email-relatorio-pontos`,
            emailPayload
        );

        return res.status(200).json({
            success: true,
            message: 'Relatório enviado com sucesso',
            obraNome: obra.obraNome,
            emailEnviado: emailResponsavel
        });

    } catch (error) {
        console.error('❌ Erro ao enviar relatório da obra:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Erro ao enviar relatório da obra',
            details: error.message
        });
    }
};

module.exports = {
    enviarRelatoriosPontosObras,
    enviarRelatorioPontoObra
};
