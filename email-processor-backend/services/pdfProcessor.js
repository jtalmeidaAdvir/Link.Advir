const pdfParse = require('pdf-parse');

class PdfProcessor {
    async extractPdfData(pdfBuffer) {
        try {
            const data = await pdfParse(pdfBuffer);
            return data;
        } catch (error) {
            console.error('Erro ao extrair PDF:', error);
            throw error;
        }
    }

    parseOrdemTrabalho(text) {
        const data = {
            numeroOrdem: null,
            data: null,
            dataLimite: null,
            titulo: null,
            autor: null,
            categoria: null,
            mpk: null,
            fornecedor: {
                nome: null,
                email: null,
                telefone: null
            },
            cliente: {
                nome: null,
                contacto: null,
                loja: null,
                morada: null,
                telefone: null
            },
            descricao: null,
            equipamentos: []
        };

        // Extrair número da ordem com padrões mais flexíveis
        const ordemPatterns = [
            /Ordem de Trabalho N[ºo°]?\s*[:.]?\s*([A-Z0-9]+)/i,
            /OTG\s*(\d+)/i,
            /N[ºo°]\s*Ordem\s*[:.]?\s*([A-Z0-9]+)/i,
            /Ordem\s*[:.]?\s*([A-Z0-9]+)/i
        ];

        for (const pattern of ordemPatterns) {
            const match = text.match(pattern);
            if (match) {
                data.numeroOrdem = match[1].trim();
                break;
            }
        }

        // Debug: mostrar primeira parte do texto para verificar formato
        console.log('🔍 Debug - Primeiras 500 caracteres do PDF:');
        console.log(text.substring(0, 500));
        console.log('---');

        // Extrair Data (primeira) com múltiplos padrões
        const dataPatterns = [
            /Data:\s*(\d{4}-\d{2}-\d{2})/i,
            /Data:(\d{4}-\d{2}-\d{2})/i, // Sem espaço após :
            /Data\s*:\s*(\d{4}-\d{2}-\d{2})/i,
            /Data:\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
            /Data:(\d{2}[-\/]\d{2}[-\/]\d{4})/i, // Sem espaço
            /Data:\s*(\d{2}\.\d{2}\.\d{4})/i,
            /(?:^|\n)\s*Data\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/im,
            /(?:^|\n)\s*Data\s*[:.]?(\d{4}-\d{2}-\d{2})/im, // Sem espaço
            /(?:^|\n)\s*Data\s*[:.]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/im,
            /Data[:\s]+(\d{4}-\d{2}-\d{2})/i,
            /Data\s*(\d{4}-\d{2}-\d{2})/i,
            // Padrão mais agressivo: procurar primeira data no formato YYYY-MM-DD antes de "Data Limite"
            /Data[:\s]*(\d{4}-\d{2}-\d{2})(?=[\s\S]*?Data\s+Limite)/i
        ];

        for (const pattern of dataPatterns) {
            const match = text.match(pattern);
            if (match) {
                // Verificar se não é a Data Limite
                const matchIndex = text.indexOf(match[0]);
                const dataLimiteIndex = text.indexOf('Data Limite');

                // Se encontramos uma data e ela vem ANTES de "Data Limite", é a data certa
                if (dataLimiteIndex === -1 || matchIndex < dataLimiteIndex) {
                    data.data = match[1].trim();
                    console.log('✅ Data encontrada:', match[1].trim(), '(usando padrão:', pattern, ')');
                    break;
                }
            }
        }

        if (!data.data) {
            console.warn('⚠️ Nenhum padrão de data correspondeu');
            // Tentar encontrar qualquer data no formato YYYY-MM-DD que apareça antes de "Data Limite"
            const allDates = text.match(/(\d{4}-\d{2}-\d{2})/g);
            if (allDates && allDates.length > 0) {
                console.log('🔍 Datas encontradas no texto:', allDates);
                // A primeira data geralmente é a "Data"
                data.data = allDates[0];
                console.log('✅ Usando primeira data encontrada:', data.data);
            }
        }

        // Extrair Data Limite (segunda) - mais específico para evitar capturar a primeira data
        const dataLimitePatterns = [
            /Data\s+Limite:\s*(\d{4}-\d{2}-\d{2})/i,
            /Data\s+Limite:\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
            /(?:^|\n)\s*Data\s+Limite\s*[:.]?\s*(\d{4}-\d{2}-\d{2})/im,
            /(?:^|\n)\s*Data\s+Limite\s*[:.]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/im,
            /Limite:\s*(\d{4}-\d{2}-\d{2})/i
        ];

        for (const pattern of dataLimitePatterns) {
            const match = text.match(pattern);
            if (match) {
                data.dataLimite = match[1].trim();
                console.log('✅ Data Limite encontrada:', match[1].trim());
                break;
            }
        }

        // Extrair título
        const tituloMatch = text.match(/T[ií]tulo:\s*(.+?)(?:\n|Autor:)/);
        if (tituloMatch) {
            data.titulo = tituloMatch[1].trim();
        }

        // Extrair autor
        const autorMatch = text.match(/Autor:\s*(.+?)(?:\n|Categoria:)/);
        if (autorMatch) {
            data.autor = autorMatch[1].trim();
        }

        // Extrair categoria
        const categoriaMatch = text.match(/Categoria:\s*(.+?)(?:\n|Fornecedor)/);
        if (categoriaMatch) {
            data.categoria = categoriaMatch[1].trim();
        }

        // Extrair dados do fornecedor
        const fornecedorNomeMatch = text.match(/Fornecedor[\s\S]*?Nome:\s*(.+?)(?:\n|e-mail:)/);
        if (fornecedorNomeMatch) {
            data.fornecedor.nome = fornecedorNomeMatch[1].trim();
        }

        const fornecedorEmailMatch = text.match(/e-mail:\s*(.+?)(?:\n|Telefone:)/);
        if (fornecedorEmailMatch) {
            data.fornecedor.email = fornecedorEmailMatch[1].trim();
        }

        const fornecedorTelMatch = text.match(/Telefone:\s*(\d+)/);
        if (fornecedorTelMatch) {
            data.fornecedor.telefone = fornecedorTelMatch[1].trim();
        }

        // Extrair dados do cliente/loja
        const clienteMatch = text.match(/Cliente:\s*(.+?)(?:\n|Contacto:)/);
        if (clienteMatch) {
            data.cliente.nome = clienteMatch[1].trim();
        }

        const contactoMatch = text.match(/Contacto:\s*(.+?)(?:\n|Loja:)/);
        if (contactoMatch) {
            data.cliente.contacto = contactoMatch[1].trim();
        }

        const lojaMatch = text.match(/Loja:\s*(.+?)(?:\n|Telefone:)/);
        if (lojaMatch) {
            data.cliente.loja = lojaMatch[1].trim();
        }

        const moradaMatch = text.match(/Morada:\s*(.+?)(?:\n|Descrição)/);
        if (moradaMatch) {
            data.cliente.morada = moradaMatch[1].trim();
        }

        const clienteTelMatch = text.match(/Loja:[\s\S]*?Telefone:\s*(\d+)/);
        if (clienteTelMatch) {
            data.cliente.telefone = clienteTelMatch[1].trim();
        }

        // Extrair MPK da tabela
        const mpkPatterns = [
            // Padrão principal: capturar número de 3-4 dígitos entre o nome da loja e "IST"
            /(?:Instituto Superior\s+Técnico|IST)[^\d]*(\d{3,4})\s+(?:IST|[A-Z])/i,
            // Padrão alternativo: número após fechar parênteses
            /\(IST\)\s*(\d{3,4})\s+IST/i,
            // Padrão genérico: MPK seguido de número
            /MPK[:\s]*(\d{3,4})/i,
            // Padrão para linha da tabela: nome + número + local
            /(?:Técnico|Instituto)[^\n]*?(\d{3,4})\s+(?:IST|[A-Z][a-z]+)\s*-/i,
            // Padrão muito específico para o formato mostrado
            /\)\s*(\d{3,4})(?:IST\s*-\s*Restaurante|IST)/i,
            // Último recurso: número de 3-4 dígitos antes de "IST - "
            /(\d{3,4})\s+IST\s*-/i
        ];

        for (const pattern of mpkPatterns) {
            const mpkMatch = text.match(pattern);
            if (mpkMatch) {
                data.mpk = mpkMatch[1].trim();
                console.log('✅ MPK encontrado:', data.mpk, '(padrão:', pattern, ')');
                break;
            }
        }

        if (!data.mpk) {
            console.warn('⚠️ MPK não encontrado. Texto da região da tabela:');
            const tabelaMatch = text.match(/LojaMPKLocal[\s\S]{0,200}/);
            if (tabelaMatch) {
                console.log(tabelaMatch[0]);
            }
        }

        // Extrair descrição completa da seção "Descrição e Equipamentos"
        let descricaoMatch = text.match(/Descrição e Equipamentos\s*\n\s*(.+?)(?=\n\s*\n|\n\s*Loja\s+MPK|\n\s*Subtotal|$)/s);

        if (!descricaoMatch) {
            // Tentar padrão alternativo com quebra de linha
            descricaoMatch = text.match(/Descrição e Equipamentos[\s\S]*?\n(.+?)(?:\n\s*\n|Loja\s+MPK|Subtotal)/);
        }

        if (!descricaoMatch) {
            // Tentar encontrar texto após "Descrição e Equipamentos" até a tabela
            const descSection = text.match(/Descrição e Equipamentos\s*\n([\s\S]+?)(?=\n\s*Loja\s+MPK|\n\s*Subtotal|$)/);
            if (descSection) {
                // Extrair apenas texto, ignorando cabeçalhos de tabela
                const descText = descSection[1].split('\n')
                    .filter(line => !line.match(/Loja\s+MPK\s+Local\s+Ticket|Equipamento|Nº Série/))
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .join(' ');
                data.descricao = descText;
            }
        } else {
            data.descricao = descricaoMatch[1].trim();
        }

        // Limpar a descrição para remover condições de faturação e regras
        if (data.descricao) {
            // Parar antes de "Pagamento", "Faturação", "Condições", números de lista (1., 2., etc.)
            const linhas = data.descricao.split('\n');
            const linhasProblema = [];

            for (const linha of linhas) {
                const linhaLimpa = linha.trim();

                // Parar se encontrar indicadores de condições/faturação
                if (linhaLimpa.match(/^\d+\.|^Pagamento|^Faturação|^Condições|^É obrigatório|^Emitir|^O prestador/i)) {
                    break;
                }

                // Adicionar linha se tiver conteúdo relevante
                if (linhaLimpa.length > 0) {
                    linhasProblema.push(linhaLimpa);
                }
            }

            // Juntar apenas as linhas do problema
            if (linhasProblema.length > 0) {
                data.descricao = linhasProblema.join(' ').trim();
            }
        }

        // Fallback: usar o título se descrição não for encontrada
        if (!data.descricao || data.descricao.length < 10) {
            data.descricao = data.titulo || 'Descrição não disponível';
        }

        // Extrair equipamentos da tabela
        const equipamentoMatch = text.match(/Descrição\s+N[ºo°] Orçamento.*?\n([\s\S]+?)(?:Subtotal|Total|Faturação)/);
        if (equipamentoMatch) {
            const equipLines = equipamentoMatch[1].split('\n').filter(line => line.trim());
            equipLines.forEach(line => {
                const parts = line.trim().split(/\s{2,}/);
                if (parts.length >= 2) {
                    data.equipamentos.push({
                        descricao: parts[parts.length - 1],
                        quantidade: 1,
                        valor: '0.00€'
                    });
                }
            });
        }

        return data;
    }
}

module.exports = new PdfProcessor();