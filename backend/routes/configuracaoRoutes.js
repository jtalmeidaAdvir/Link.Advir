
const express = require('express');
const router = express.Router();
const { obterConfiguracao, atualizarConfiguracao, listarConfiguracoes } = require('../controllers/configuracaoController');


router.get('/listar' , listarConfiguracoes);
router.get('/:chave' , obterConfiguracao);
router.put('/:chave', atualizarConfiguracao);

module.exports = router;
