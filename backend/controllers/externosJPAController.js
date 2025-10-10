
const { sequelize } = require('../config/db');

// POST /api/externos-jpa
const criar = async (req, res) => {
    try {
        const { Nome, Qrcode, Empresa } = req.body;

        // Validação básica
        if (!Nome || !Qrcode) {
            return res.status(400).json({ 
                success: false,
                message: 'Nome e Qrcode são obrigatórios.' 
            });
        }

        // Insert direto na tabela usando SQL
        const query = `
            INSERT INTO ExternosJPA (nome, Qrcode, empresa)
            VALUES (:nome, :qrcode, :empresa)
        `;

        await sequelize.query(query, {
            replacements: {
                nome: Nome,
                qrcode: Qrcode,
                empresa: Empresa || null
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            message: 'Registo criado com sucesso',
            data: {
                Nome,
                Qrcode,
                Empresa: Empresa || null
            }
        });
    } catch (error) {
        console.error('Erro ao criar registo ExternosJPA:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor.',
            error: error.message 
        });
    }
};

// GET /api/externos-jpa (opcional - listar todos)
const listar = async (req, res) => {
    try {
        const query = 'SELECT * FROM ExternosJPA ORDER BY id DESC';
        const [results] = await sequelize.query(query);

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Erro ao listar ExternosJPA:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor.',
            error: error.message 
        });
    }
};

module.exports = {
    criar,
    listar
};
