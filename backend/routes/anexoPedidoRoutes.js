
const express = require('express');
const router = express.Router();
const {
    upload,
    uploadAnexo,
    uploadAnexoTemp,
    associarAnexosTemp,
    listarAnexosPedido,
    downloadAnexo,
    deletarAnexo
} = require('../controllers/anexoPedidoController');
// Upload de anexo
// Função para tratar erros de upload
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
const handleUploadError = (err, res) => {
    console.error('Erro no upload:', err);

    // Personalize as mensagens de erro conforme necessário
    let errorMessage = 'Erro no upload do arquivo.';

    if (err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Arquivo muito grande. Máximo permitido: 10MB';
    } else if (err.code === 'LIMIT_FIELD_COUNT') {
        errorMessage = 'Muitos campos no formulário';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        errorMessage = 'Campo de arquivo inesperado';
    } else if (err.message && err.message.includes('Tipo de arquivo não permitido')) {
        errorMessage = err.message;
    } else if (err.message && err.message.includes('Unexpected end of form')) {
        errorMessage = 'Formulário incompleto. Tente novamente.';
    }

    return res.status(400).json({ error: errorMessage });
};

// Integrar a função no seu endpoint de upload
// Upload de anexo
// Upload de anexo
router.post('/upload', (req, res, next) => {
    console.log('=== INÍCIO UPLOAD ===');
    console.log('Headers:', req.headers);
    next();
}, upload.single('arquivo'), uploadAnexo);

// Upload temporário (antes de criar o pedido)
router.post('/upload-temp', upload.single('arquivo'), uploadAnexoTemp);

// Associar anexos temporários a um pedido criado
router.post('/associar-temp', associarAnexosTemp);

// Listar anexos de um pedido
router.get('/pedido/:pedido_id', listarAnexosPedido);

// Download de anexo
router.get('/download/:id', downloadAnexo);

// Deletar anexo
router.delete('/:id', deletarAnexo);

module.exports = router;
