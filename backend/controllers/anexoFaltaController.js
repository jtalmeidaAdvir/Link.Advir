
const AnexoFalta = require('../models/anexoFalta');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuração do multer para upload de arquivos de faltas
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/anexos-faltas');
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Diretório de uploads de faltas criado:', uploadDir);
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
            console.log('Arquivo de falta será salvo como:', filename);
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
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: function (req, file, cb) {
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
            return cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido!'));
        }
    }
}).single('arquivo');

// Upload temporário (antes do pedido de falta ser criado)
const uploadAnexoFaltaTemp = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('❌ Multer Error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Arquivo muito grande (máx 10MB)' });
            }
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            console.error('❌ Erro desconhecido:', err);
            return res.status(500).json({ error: `Erro: ${err.message}` });
        }

        console.log('=== UPLOAD TEMP FALTA INICIADO ===');
        console.log('Headers recebidos:', {
            'content-type': req.headers['content-type'],
            'content-length': req.headers['content-length']
        });
        console.log('File presente:', !!req.file);

        if (!req.file) {
            console.error('❌ Nenhum arquivo encontrado no request');
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        const arquivo = req.file;
        
        console.log('✅ Arquivo processado:', {
            originalname: arquivo.originalname,
            filename: arquivo.filename,
            mimetype: arquivo.mimetype,
            size: arquivo.size,
            path: arquivo.path
        });

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
    });
};

// Associar anexos temporários a um pedido de falta
const associarAnexosFaltaTemp = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Body vazio' });
        }

        const { pedido_falta_id, anexos_temp } = req.body;

        if (!pedido_falta_id || !Array.isArray(anexos_temp) || anexos_temp.length === 0) {
            return res.status(400).json({ error: 'Dados inválidos: pedido_falta_id e anexos_temp obrigatórios' });
        }

        const anexosCriados = [];

        for (const anexoTemp of anexos_temp) {
            const anexo = await AnexoFalta.create({
                pedido_falta_id: pedido_falta_id,
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
        console.error('Erro ao associar anexos de falta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar anexos de uma falta
const listarAnexosFalta = async (req, res) => {
    try {
        const { pedido_falta_id } = req.params;

        const anexos = await AnexoFalta.findAll({
            where: { pedido_falta_id },
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

// Download de anexo de falta
const downloadAnexoFalta = async (req, res) => {
    try {
        const { id } = req.params;

        const anexo = await AnexoFalta.findByPk(id);

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

// Deletar anexo de falta
const deletarAnexoFalta = async (req, res) => {
    try {
        const { id } = req.params;

        const anexo = await AnexoFalta.findByPk(id);

        if (!anexo) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }

        if (fs.existsSync(anexo.caminho)) {
            fs.unlinkSync(anexo.caminho);
        }

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

module.exports = {
    uploadAnexoFaltaTemp,
    associarAnexosFaltaTemp,
    listarAnexosFalta,
    downloadAnexoFalta,
    deletarAnexoFalta
};
