const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/trabalhadorExternoController');

// Listagem + filtros/paginação
router.get('/', authMiddleware, ctrl.listar);

// Listas auxiliares (para combos) — continuam na mesma tabela
router.get('/distintos/empresas', authMiddleware, ctrl.listarEmpresasDistintas);
router.get('/distintos/categorias', authMiddleware, ctrl.listarCategoriasDistintas);

// CRUD
router.post('/', authMiddleware, ctrl.criar);
router.get('/:id', authMiddleware, ctrl.obter);
router.put('/:id', authMiddleware, ctrl.atualizar);
router.delete('/:id', authMiddleware, ctrl.eliminar);

// Estados rápidos
router.post('/:id/anular', authMiddleware, ctrl.anular);
router.post('/:id/restaurar', authMiddleware, ctrl.restaurar);
router.post('/:id/ativar', authMiddleware, ctrl.ativar);
router.post('/:id/desativar', authMiddleware, ctrl.desativar);

module.exports = router;
