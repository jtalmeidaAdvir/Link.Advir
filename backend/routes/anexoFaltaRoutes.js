
const express = require('express');
const router = express.Router();
const {
    uploadAnexoFaltaTemp,
    associarAnexosFaltaTemp,
    listarAnexosFalta,
    downloadAnexoFalta,
    deletarAnexoFalta
} = require('../controllers/anexoFaltaController'); 

// NÃO usar express.json() ou urlencoded() aqui - interfere com Multer
// Upload temporário (antes de criar o pedido de falta)
router.post('/upload-temp', uploadAnexoFaltaTemp);

// Associar anexos temporários a um pedido de falta criado
router.post('/associar-temp',  associarAnexosFaltaTemp);

// Listar anexos de uma falta
router.get('/falta/:pedido_falta_id', listarAnexosFalta);

// Download de anexo
router.get('/download/:id', downloadAnexoFalta);

// Deletar anexo
router.delete('/:id', deletarAnexoFalta);

module.exports = router;
