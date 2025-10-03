
const pdf = require('pdf-parse');

class PdfProcessor {
    async extractPdfData(buffer) {
        try {
            const data = await pdf(buffer);
            return {
                text: data.text,
                pages: data.numpages,
                info: data.info
            };
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

        // Extrair datas
        const dataMatch = text.match(/Data:\s*(\d{4}-\d{2}-\d{2})/);
        if (dataMatch) {
            data.data = dataMatch[1];
        }

        const dataLimiteMatch = text.match(/Data Limite:\s*(\d{4}-\d{2}-\d{2})/);
        if (dataLimiteMatch) {
            data.dataLimite = dataLimiteMatch[1];
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

        // Extrair descrição - múltiplos padrões
        let descricaoMatch = text.match(/Descrição e Equipamentos[\s\S]*?\n(.+?)(?:\n\n|Loja\s+MPK)/);
        if (!descricaoMatch) {
            descricaoMatch = text.match(/Descrição:\s*(.+?)(?:\n|$)/);
        }
        if (!descricaoMatch) {
            // Se não encontrar descrição, usar o título como descrição
            descricaoMatch = text.match(/T[ií]tulo:\s*(.+?)(?:\n|$)/);
        }
        if (descricaoMatch) {
            data.descricao = descricaoMatch[1].trim();
        } else {
            // Fallback: usar uma parte do texto
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
