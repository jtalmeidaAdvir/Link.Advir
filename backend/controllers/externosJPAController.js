
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

// GET /api/externos-jpa/buscar/:qrcode
const buscar = async (req, res) => {
    try {
        const { qrcode } = req.params;
        const { empresa_id } = req.query;

        const query = `
            SELECT * FROM ExternosJPA 
            WHERE Qrcode = :qrcode 
            AND (empresa = :empresa OR empresa IS NULL)
            LIMIT 1
        `;

        const [results] = await sequelize.query(query, {
            replacements: {
                qrcode: qrcode,
                empresa: empresa_id
            }
        });

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Externo não encontrado'
            });
        }

        res.status(200).json(results[0]);
    } catch (error) {
        console.error('Erro ao buscar externo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor.',
            error: error.message
        });
    }
};

// POST /api/externos-jpa/registar-ponto
const registarPonto = async (req, res) => {
    try {
        const { externo_id, obra_id, empresa_id, latitude, longitude } = req.body;

        if (!externo_id || !obra_id || !empresa_id) {
            return res.status(400).json({
                success: false,
                message: 'Externo, obra e empresa são obrigatórios.'
            });
        }

        // Buscar dados do externo
        const queryExterno = 'SELECT * FROM ExternosJPA WHERE id = :id';
        const [externoResults] = await sequelize.query(queryExterno, {
            replacements: { id: externo_id }
        });

        if (externoResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Externo não encontrado'
            });
        }

        const externo = externoResults[0];
        const hoje = new Date().toISOString().split('T')[0];
        const agora = new Date().toISOString();

        // Verificar se já existe entrada hoje
        const queryUltimoRegisto = `
            SELECT * FROM RegistoPontoExternos 
            WHERE externo_id = :externo_id 
            AND obra_id = :obra_id
            AND DATE(timestamp) = :hoje
            ORDER BY timestamp DESC 
            LIMIT 1
        `;

        const [ultimoRegistoResults] = await sequelize.query(queryUltimoRegisto, {
            replacements: {
                externo_id: externo_id,
                obra_id: obra_id,
                hoje: hoje
            }
        });

        let action = 'entrada';

        // Se já existe entrada sem saída, registar saída
        if (ultimoRegistoResults.length > 0 && ultimoRegistoResults[0].tipo === 'entrada') {
            action = 'saida';
        }

        // Criar tabela se não existir
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS RegistoPontoExternos (
                id INT IDENTITY(1,1) PRIMARY KEY,
                externo_id INT NOT NULL,
                obra_id INT NOT NULL,
                empresa_id INT NOT NULL,
                tipo VARCHAR(10) NOT NULL,
                timestamp DATETIME NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                nome VARCHAR(100),
                FOREIGN KEY (externo_id) REFERENCES ExternosJPA(id)
            )
        `);

        // Inserir registo
        const queryInsert = `
            INSERT INTO RegistoPontoExternos (externo_id, obra_id, empresa_id, tipo, timestamp, latitude, longitude, nome)
            VALUES (:externo_id, :obra_id, :empresa_id, :tipo, :timestamp, :latitude, :longitude, :nome)
        `;

        await sequelize.query(queryInsert, {
            replacements: {
                externo_id: externo_id,
                obra_id: obra_id,
                empresa_id: empresa_id,
                tipo: action,
                timestamp: agora,
                latitude: latitude || null,
                longitude: longitude || null,
                nome: externo.nome
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            action: action,
            externo: {
                id: externo.id,
                nome: externo.nome,
                qrcode: externo.Qrcode
            }
        });
    } catch (error) {
        console.error('Erro ao registar ponto externo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor.',
            error: error.message
        });
    }
};

module.exports = {
    criar,
    listar,
    buscar,
    registarPonto
};
