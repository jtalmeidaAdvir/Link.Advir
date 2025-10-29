
const express = require('express');
const ComunicadoController = require('../controllers/comunicadoController');

const router = express.Router();

// Criar novo comunicado (apenas admin)
router.post('/comunicados', ComunicadoController.criarComunicado);

// Listar todos os comunicados (admin)
router.get('/comunicados', ComunicadoController.listarComunicados);

// Listar comunicados de um usuário específico
router.get('/comunicados/usuario/:usuario_id', ComunicadoController.listarComunicadosUsuario);

// Marcar comunicado como lido
router.put('/comunicados/:comunicado_id/lido/:usuario_id', ComunicadoController.marcarComoLido);

// Obter estatísticas de leitura de um comunicado
router.get('/comunicados/:comunicado_id/estatisticas', ComunicadoController.obterEstatisticasLeitura);

// Contar comunicados não lidos de um usuário
router.get('/comunicados/usuario/:usuario_id/nao-lidos', ComunicadoController.contarNaoLidos);

// Desativar comunicado
router.put('/comunicados/:id/desativar', ComunicadoController.desativarComunicado);

module.exports = router;
