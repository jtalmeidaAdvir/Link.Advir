const express = require('express');
const PedidoAlteracaoController = require('../controllers/pedidoAlteracaoController');

const router = express.Router();

// Criar novo pedido de alteração
router.post('/pedidos-alteracao', PedidoAlteracaoController.criarPedido);

// Listar todos os pedidos
router.get('/pedidos-alteracao', PedidoAlteracaoController.listarPedidos);

// Atualizar um pedido de alteração
router.put('/pedidos-alteracao/:id', PedidoAlteracaoController.atualizarPedido);

// Eliminar um pedido de alteração
router.delete('/pedidos-alteracao/:id', PedidoAlteracaoController.eliminarPedido);

router.put('/aprovar/:id', PedidoAlteracaoController.aprovarPedido);

router.put('/rejeitar/:id', PedidoAlteracaoController.rejeitarPedido);

router.get('/pedidos-alteracao/:user_id', PedidoAlteracaoController.listarPedidosDoUtilizador);


module.exports = router;
