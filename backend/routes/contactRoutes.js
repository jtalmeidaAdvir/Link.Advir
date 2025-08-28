
const express = require('express');
const router = express.Router();
const { getContacts, updateContact, createContact } = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rotas
router.get('/', getContacts);
router.put('/:id', updateContact);
router.post('/', createContact);

module.exports = router;
