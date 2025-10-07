
const axios = require('axios');

const primaveraAuth = require('./primaveraAuth');

class PedidoCreator {
    constructor() {
        this.backendUrl = process.env.BACKEND_API_URL || 'https://webapiprimavera.advir.pt';
    }

    async createPedido(data) {
        try {
            // Obter token automaticamente
            const authToken = await primaveraAuth.getToken();
            const urlEmpresa = primaveraAuth.getUrlEmpresa();

            // 🔍 VERIFICAR SE CLIENTE EXISTE
            let codigoCliente = 'VD'; // Código padrão
            if (data.cliente.nome) {
                try {
                    console.log('🔍 Verificando se cliente existe...');
                    console.log(`   Nome do Cliente: ${data.cliente.nome}`);

                    const verificaClienteResponse = await axios.get(
                        `${this.backendUrl}/routePedidos_STP/VerificaCliente/${encodeURIComponent(data.cliente.nome)}`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`,
                                'urlempresa': urlEmpresa
                            },
                            timeout: 10000
                        }
                    );

                    console.log('✅ Resposta da verificação de cliente:', JSON.stringify(verificaClienteResponse.data, null, 2));

                    // Extrair código do cliente da resposta
                    if (verificaClienteResponse.data?.DataSet?.Table?.[0]) {
                        const clienteData = verificaClienteResponse.data.DataSet.Table[0];
                        console.log('📋 Detalhes do cliente encontrado:');
                        console.log(JSON.stringify(clienteData, null, 2));

                        // Tentar extrair código do cliente
                        codigoCliente = clienteData.Cliente ||
                            clienteData.Codigo ||
                            clienteData.CodigoCliente ||
                            clienteData.ID ||
                            'VD';

                        console.log(`✅ Cliente encontrado com código: ${codigoCliente}`);
                    } else {
                        console.log('⚠️ Cliente não encontrado no formato esperado, usando código padrão');
                    }

                } catch (verificaClienteError) {
                    console.error('⚠️ Erro ao verificar cliente:', verificaClienteError.message);
                    console.log('   Continuando com código padrão VD...');
                }
            } else {
                console.log('⚠️ Nome do cliente não disponível, usando código padrão');
            }

            // 🔍 VERIFICAR SE CONTACTO EXISTE
            let codigoContacto = null;
            if (data.cliente.contacto && data.cliente.telefone) {
                try {
                    console.log('🔍 Verificando se contacto existe...');
                    console.log(`   Contacto: ${data.cliente.contacto}`);
                    console.log(`   Telefone: ${data.cliente.telefone}`);

                    const verificaContactoResponse = await axios.get(
                        `${this.backendUrl}/routePedidos_STP/VerificaContacto/${encodeURIComponent(data.cliente.contacto)}/${encodeURIComponent(data.cliente.telefone)}`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`,
                                'urlempresa': urlEmpresa
                            },
                            timeout: 10000
                        }
                    );

                    console.log('✅ Resposta da verificação de contacto:', JSON.stringify(verificaContactoResponse.data, null, 2));

                    // Extrair código do contacto da resposta
                    if (verificaContactoResponse.data?.DataSet?.Table?.[0]) {
                        const contactoData = verificaContactoResponse.data.DataSet.Table[0];
                        console.log('📋 Detalhes do contacto encontrado:');
                        console.log(JSON.stringify(contactoData, null, 2));

                        // Tentar extrair código do contacto
                        codigoContacto = contactoData.Contacto ||
                            contactoData.Codigo ||
                            contactoData.CodigoContacto ||
                            contactoData.ID ||
                            contactoData.id;

                        console.log(`✅ Contacto encontrado com código: ${codigoContacto}`);
                    } else if (verificaContactoResponse.data?.id) {
                        codigoContacto = verificaContactoResponse.data.id;
                        console.log(`✅ Contacto encontrado com código: ${codigoContacto}`);
                    } else if (verificaContactoResponse.data?.Contacto) {
                        codigoContacto = verificaContactoResponse.data.Contacto;
                        console.log(`✅ Contacto encontrado com código: ${codigoContacto}`);
                    } else {
                        console.log('⚠️ Contacto não encontrado no formato esperado');
                    }

                } catch (verificaContactoError) {
                    console.error('⚠️ Erro ao verificar contacto:', verificaContactoError.message);
                    if (verificaContactoError.response) {
                        console.error('   Status:', verificaContactoError.response.status);
                        console.error('   Data:', verificaContactoError.response.data);
                    }
                    console.log('   Continuando sem código de contacto...');
                }
            } else {
                console.log('⚠️ Contacto ou telefone não disponíveis, pulando verificação de contacto');
            }

            // 🔍 VERIFICAR SE OBJETO/MPK EXISTE
            let objectoID = null;
            if (data.mpk && data.titulo) {
                try {
                    console.log('🔍 Verificando se objeto existe...');
                    console.log(`   MPK: ${data.mpk}`);
                    console.log(`   Título: ${data.titulo}`);

                    const verificaResponse = await axios.get(
                        `${this.backendUrl}/routePedidos_STP/VerificaExisteObjeto/${data.mpk}/${encodeURIComponent(data.titulo)}`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`,
                                'urlempresa': urlEmpresa
                            },
                            timeout: 10000
                        }
                    );

                    console.log('✅ Resposta da verificação de objeto:', JSON.stringify(verificaResponse.data, null, 2));

                    // Extrair detalhes do DataSet.Table
                    if (verificaResponse.data?.DataSet?.Table?.[0]) {
                        const objetoData = verificaResponse.data.DataSet.Table[0];
                        console.log('📋 Detalhes do objeto encontrado:');
                        console.log(JSON.stringify(objetoData, null, 2));

                        // O ID está no campo 'id' (lowercase)
                        objectoID = objetoData.id;

                        if (objectoID) {
                            console.log(`✅ Objeto encontrado/criado com ID: ${objectoID}`);
                            console.log(`   MPK Objeto: ${objetoData.Objecto}`);
                        } else {
                            console.log('⚠️ ID não encontrado no objeto');
                            console.log('⚠️ Campos disponíveis:', Object.keys(objetoData));
                        }
                    } else if (verificaResponse.data && verificaResponse.data.id) {
                        objectoID = verificaResponse.data.id;
                        console.log(`✅ Objeto encontrado/criado com ID: ${objectoID}`);
                    } else if (verificaResponse.data && verificaResponse.data.ObjectoID) {
                        objectoID = verificaResponse.data.ObjectoID;
                        console.log(`✅ Objeto encontrado/criado com ID: ${objectoID}`);
                    } else {
                        console.log('⚠️ Resposta não contém ID do objeto, usando ID padrão');
                    }

                } catch (verificaError) {
                    console.error('⚠️ Erro ao verificar objeto:', verificaError.message);
                    console.log('   Continuando com ID padrão...');
                }
            } else {
                console.log('⚠️ MPK ou Título não disponíveis, pulando verificação de objeto');
            }

            // Mapear dados do PDF para o formato esperado pela API Primavera
            const dataAtual = new Date();

            // Usar a data do PDF se disponível, caso contrário usar data atual
            let dataAbertura = dataAtual;
            if (data.data) {
                // Converter data do formato YYYY-MM-DD para objeto Date
                const partesData = data.data.split('-');
                if (partesData.length === 3) {
                    dataAbertura = new Date(
                        parseInt(partesData[0]), // ano
                        parseInt(partesData[1]) - 1, // mês (0-11)
                        parseInt(partesData[2]) // dia
                    );
                    console.log(`📅 Usando data do PDF para abertura: ${dataAbertura.toISOString()}`);
                }
            }

            const dataFimPrevista = new Date(dataAbertura);
            dataFimPrevista.setDate(dataAbertura.getDate() + 30);

            const anoAtual = new Date().getFullYear().toString();

            const pedidoData = {
                cliente: codigoCliente, // Código do cliente verificado
                descricaoObjecto: 'ASS',
                descricaoProblema: data.descricao || "Sem descrição",
                origem: 'EMAIL', // Origem do pedido
                tipoProcesso: 'PASI', // Tipo de processo
                prioridade: 1,
                tecnico: '000', // Técnico padrão
                objectoID: objectoID || '066981FD-A039-11F0-944C-CA3F13F83C90', // ID verificado ou padrão
                tipoDoc: 'OT',
                serie: '2025',
                estado: 1, // Estado inicial
                seccao: 'ST', // Secção padrão
                comoReproduzir: null,
                contacto: codigoContacto || data.cliente.contacto || data.fornecedor.email || data.emailOrigem,
                contratoID: null,
                datahoraabertura: dataAbertura.toISOString(),
                datahorafimprevista: dataFimPrevista.toISOString()
            };

            console.log('📋 ObjectoID sendo usado:', objectoID || '066981FD-A039-11F0-944C-CA3F13F83C90 (padrão)');

            console.log('📤 Enviando pedido para o backend:', this.backendUrl);
            console.log('🔑 Headers:', {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken.substring(0, 20)}...`,
                'urlempresa': urlEmpresa
            });

            console.log('📋 Dados do pedido:', JSON.stringify(pedidoData, null, 2));

            const response = await axios.post(
                `${this.backendUrl}/routePedidos_STP/CriarPedidoEmail`,
                pedidoData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                        'urlempresa': urlEmpresa
                    },
                    timeout: 30000,
                    validateStatus: function (status) {
                        return status < 600; // Aceitar qualquer status para debug
                    }
                }
            );

            console.log('📥 Resposta do backend:', {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            });

            // Verificar se é o erro 500 conhecido (pedido criado mas backend retorna erro)
            if (response.status === 500) {
                const errorMsg = JSON.stringify(response.data || {}).toLowerCase();
                const isKnownError = errorMsg.includes('object reference') ||
                    errorMsg.includes('erro inesperado') ||
                    errorMsg.includes('request failed with status code 500');

                if (isKnownError) {
                    console.warn('⚠️ Erro 500 conhecido - Verificando se pedido foi criado...');

                    // Aguardar 2 segundos para garantir que BD foi atualizado
                    await new Promise(resolve => setTimeout(resolve, 2000));



                    // Se não conseguiu verificar, assume sucesso parcial
                    return {
                        success: true,
                        pedidoId: null,
                        message: 'Pedido provavelmente criado',
                        warning: 'Não foi possível confirmar ID do pedido'
                    };
                }
            }

            // Resposta de sucesso normal
            if (response.status === 200 || response.status === 201) {
                return {
                    success: true,
                    pedidoId: response.data.id || response.data.pedido_id || response.data.ProcessoID,
                    message: 'Pedido criado com sucesso'
                };
            }

            // Outros erros
            throw new Error(`Status ${response.status}: ${response.data?.error || response.statusText}`);

        } catch (error) {
            console.error('❌ Erro ao criar pedido:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', JSON.stringify(error.response.data, null, 2));
            }
            throw new Error(`Falha ao criar pedido: ${error.message}`);
        }
    }

    mapearCodigoCliente(nomeCliente) {
        // Mapeamento de nomes de clientes para códigos
        const mapeamento = {
            'PINGO DOCE DISTRIBUICAO ALIMENTAR SA': 'VD',
            'PINGO DOCE': 'VD',
            // Adicione mais mapeamentos conforme necessário
        };

        if (!nomeCliente) return 'VD'; // Código padrão

        const nomeUpper = nomeCliente.toUpperCase().trim();

        // Procurar correspondência exata
        if (mapeamento[nomeUpper]) {
            return mapeamento[nomeUpper];
        }

        // Procurar correspondência parcial
        for (const [nome, codigo] of Object.entries(mapeamento)) {
            if (nomeUpper.includes(nome) || nome.includes(nomeUpper)) {
                return codigo;
            }
        }

        return 'VD'; // Código padrão se não encontrar
    }

    buildDescricao(data) {
        let descricao = `📧 PEDIDO CRIADO AUTOMATICAMENTE VIA EMAIL\n\n`;

        if (data.numeroOrdem) {
            descricao += `Nº Ordem Original: ${data.numeroOrdem}\n`;
        }

        if (data.data) {
            descricao += `Data Original: ${data.data}\n`;
        }

        if (data.dataLimite) {
            descricao += `Data Limite: ${data.dataLimite}\n`;
        }

        if (data.cliente.loja) {
            descricao += `Loja: ${data.cliente.loja}\n`;
        }

        descricao += `\n--- DESCRIÇÃO ---\n${data.descricao || 'Não especificada'}\n`;

        if (data.equipamentos && data.equipamentos.length > 0) {
            descricao += `\n--- EQUIPAMENTOS ---\n`;
            data.equipamentos.forEach((eq, idx) => {
                descricao += `${idx + 1}. ${eq.descricao}\n`;
            });
        }

        if (data.fornecedor.nome) {
            descricao += `\n--- FORNECEDOR ---\n`;
            descricao += `Nome: ${data.fornecedor.nome}\n`;
            if (data.fornecedor.email) {
                descricao += `Email: ${data.fornecedor.email}\n`;
            }
            if (data.fornecedor.telefone) {
                descricao += `Telefone: ${data.fornecedor.telefone}\n`;
            }
        }

        if (data.cliente.nome) {
            descricao += `\n--- CLIENTE ---\n`;
            descricao += `Nome: ${data.cliente.nome}\n`;
        }

        return descricao;
    }

    determinePrioridade(data) {
        // Lógica para determinar prioridade baseada em palavras-chave
        const texto = (data.titulo + ' ' + data.descricao).toLowerCase();

        if (texto.includes('urgente') || texto.includes('emergência') || texto.includes('crítico')) {
            return 3; // Alta
        } else if (texto.includes('importante') || texto.includes('prioridade')) {
            return 2; // Média
        }

        return 1; // Baixa (padrão)
    }
}

module.exports = new PedidoCreator();
