
const Contact = require('../models/contact');

// Listar todos os contactos
const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            order: [['name', 'ASC']]
        });
        res.json(contacts);
    } catch (error) {
        console.error('Erro ao buscar contactos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar contacto
const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Se obrasAutorizadas for um array, converter para string JSON
        if (Array.isArray(updateData.obrasAutorizadas)) {
            updateData.obrasAutorizadas = JSON.stringify(updateData.obrasAutorizadas);
        }

        const [updatedRowsCount] = await Contact.update(updateData, {
            where: { id: id }
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({ error: 'Contacto não encontrado' });
        }

        const updatedContact = await Contact.findByPk(id);
        
        // Converter obrasAutorizadas de volta para array se necessário
        if (updatedContact.obrasAutorizadas) {
            try {
                updatedContact.obrasAutorizadas = JSON.parse(updatedContact.obrasAutorizadas);
            } catch (e) {
                // Se não for JSON válido, manter como string
            }
        }

        res.json(updatedContact);
    } catch (error) {
        console.error('Erro ao atualizar contacto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Criar novo contacto
const createContact = async (req, res) => {
    try {
        const contactData = req.body;

        // Se obrasAutorizadas for um array, converter para string JSON
        if (Array.isArray(contactData.obrasAutorizadas)) {
            contactData.obrasAutorizadas = JSON.stringify(contactData.obrasAutorizadas);
        }

        const newContact = await Contact.create(contactData);
        
        // Converter obrasAutorizadas de volta para array se necessário
        if (newContact.obrasAutorizadas) {
            try {
                newContact.obrasAutorizadas = JSON.parse(newContact.obrasAutorizadas);
            } catch (e) {
                // Se não for JSON válido, manter como string
            }
        }

        res.status(201).json(newContact);
    } catch (error) {
        console.error('Erro ao criar contacto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    getContacts,
    updateContact,
    createContact
};
