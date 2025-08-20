
const AnexoPedido = require('../models/anexoPedido');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/anexos-pedidos');
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Diretório de uploads criado:', uploadDir);
            }
            cb(null, uploadDir);
        } catch (error) {
            console.error('Erro ao criar diretório de uploads:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        try {
            const uniqueSuffix = crypto.randomBytes(16).toString('hex');
            const ext = path.extname(file.originalname);
            const filename = uniqueSuffix + ext;
            console.log('Arquivo será salvo como:', filename);
            cb(null, filename);
        } catch (error) {
            console.error('Erro ao gerar nome do arquivo:', error);
            cb(error);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limite
        files: 1, // Apenas 1 arquivo por vez
        fieldSize: 1024 * 1024, // 1MB para campos de texto
        fieldNameSize: 100, // 100 bytes para nome dos campos
        fields: 10 // máximo 10 campos não-arquivo
    },
    fileFilter: function (req, file, cb) {
        console.log('Verificando tipo de arquivo:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            fieldname: file.fieldname
        });

        // Aceitar imagens, PDFs e documentos
        const allowedMimeTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i;
        const extname = allowedExtensions.test(file.originalname);
        const mimetype = allowedMimeTypes.includes(file.mimetype);

        if (mimetype && extname) {
            console.log('Arquivo aceito:', file.originalname);
            return cb(null, true);
        } else {
            console.log('Arquivo rejeitado:', file.originalname, 'Tipo:', file.mimetype);
            cb(new Error('Tipo de arquivo não permitido! Aceitos: JPEG, PNG, GIF, PDF, DOC, DOCX, TXT'));
        }
    }
});

// Upload temporário (antes do pedido ser criado)
const uploadAnexoTemp = async (req, res) => {
    try {
        const arquivo = req.file;

        if (!arquivo) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        // Retorna informações do arquivo para usar quando criar o pedido
        res.status(201).json({
            success: true,
            arquivo_temp: {
                nome_arquivo: arquivo.originalname,
                nome_arquivo_sistema: arquivo.filename,
                tipo_arquivo: arquivo.mimetype,
                tamanho: arquivo.size,
                caminho: arquivo.path
            }
        });

    } catch (error) {
        console.error('Erro ao fazer upload temporário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Upload de anexo
const uploadAnexo = async (req, res) => {
    try {
        console.log('Upload request received:', {
            body: req.body,
            file: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : null,
            headers: {
                'content-type': req.headers['content-type']
            }
        });

        const { pedido_id } = req.body;
        const arquivo = req.file;

        if (!pedido_id) {
            console.error('ID do pedido não foi fornecido');
            return res.status(400).json({ error: 'ID do pedido é obrigatório' });
        }

        if (!arquivo) {
            console.error('Nenhum arquivo foi enviado');
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        // Verificar se o arquivo foi salvo corretamente
        if (!fs.existsSync(arquivo.path)) {
            console.error('Arquivo não foi salvo corretamente:', arquivo.path);
            return res.status(500).json({ error: 'Erro ao salvar arquivo' });
        }

        const anexo = await AnexoPedido.create({
            pedido_id: pedido_id,
            nome_arquivo: arquivo.originalname,
            nome_arquivo_sistema: arquivo.filename,
            tipo_arquivo: arquivo.mimetype,
            tamanho: arquivo.size,
            caminho: arquivo.path,
            usuario_upload: req.user?.id || null
        });

        console.log('Anexo criado com sucesso:', anexo.id);

        res.status(201).json({
            success: true,
            anexo: {
                id: anexo.id,
                nome_arquivo: anexo.nome_arquivo,
                tipo_arquivo: anexo.tipo_arquivo,
                tamanho: anexo.tamanho,
                data_upload: anexo.data_upload
            }
        });

    } catch (error) {
        console.error('Erro ao fazer upload do anexo:', error);

        // Se houve erro, tentar deletar o arquivo se existe
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('Arquivo deletado após erro:', req.file.path);
            } catch (deleteError) {
                console.error('Erro ao deletar arquivo após falha:', deleteError);
            }
        }

        res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
    }
};

// Listar anexos de um pedido
const listarAnexosPedido = async (req, res) => {
    try {
        const { pedido_id } = req.params;

        const anexos = await AnexoPedido.findAll({
            where: { pedido_id },
            attributes: ['id', 'nome_arquivo', 'tipo_arquivo', 'tamanho', 'data_upload'],
            order: [['data_upload', 'DESC']]
        });

        res.json({
            success: true,
            anexos
        });

    } catch (error) {
        console.error('Erro ao listar anexos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Download de anexo
const downloadAnexo = async (req, res) => {
    try {
        const { id } = req.params;

        const anexo = await AnexoPedido.findByPk(id);

        if (!anexo) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }

        const filePath = anexo.caminho;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${anexo.nome_arquivo}"`);
        res.setHeader('Content-Type', anexo.tipo_arquivo);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Erro ao fazer download do anexo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Deletar anexo
const deletarAnexo = async (req, res) => {
    try {
        const { id } = req.params;

        const anexo = await AnexoPedido.findByPk(id);

        if (!anexo) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }

        // Deletar arquivo do sistema
        if (fs.existsSync(anexo.caminho)) {
            fs.unlinkSync(anexo.caminho);
        }

        // Deletar registro do banco
        await anexo.destroy();

        res.json({
            success: true,
            message: 'Anexo deletado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar anexo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Associar anexos temporários a um pedido
const associarAnexosTemp = async (req, res) => {
    try {
           const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
           const { pedido_id, anexos_temp } = body;

        if (!pedido_id || !anexos_temp || !Array.isArray(anexos_temp)) {
            return res.status(400).json({ error: 'Dados inválidos' });
        }
           console.log('Associar anexos TEMP -> pedido_id:', pedido_id, 'qtde:', anexos_temp.length);
           // valida cada item para evitar undefined
               for (const [i, ax] of anexos_temp.entries()) {
                    if (!ax?.nome_arquivo || !ax?.nome_arquivo_sistema || !ax?.tipo_arquivo || !ax?.tamanho || !ax?.caminho) {
                           return res.status(400).json({ error: `Anexo inválido no índice ${i}` });
                         }
                   }
        const anexosCriados = [];

        for (const anexoTemp of anexos_temp) {
            const anexo = await AnexoPedido.create({
                pedido_id: pedido_id,
                nome_arquivo: anexoTemp.nome_arquivo,
                nome_arquivo_sistema: anexoTemp.nome_arquivo_sistema,
                tipo_arquivo: anexoTemp.tipo_arquivo,
                tamanho: anexoTemp.tamanho,
                caminho: anexoTemp.caminho,
                usuario_upload: req.user?.id || null
            });

            anexosCriados.push({
                id: anexo.id,
                nome_arquivo: anexo.nome_arquivo,
                tipo_arquivo: anexo.tipo_arquivo,
                tamanho: anexo.tamanho,
                data_upload: anexo.data_upload
            });
        }

        res.status(201).json({
            success: true,
            anexos: anexosCriados
        });

    } catch (error) {
        console.error('Erro ao associar anexos temporários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    
    uploadAnexo,
    uploadAnexoTemp,
    associarAnexosTemp,
    listarAnexosPedido,
    downloadAnexo,
    deletarAnexo,
    upload
};
