const express = require('express');
const router = express.Router();
const UserConsent = require('../models/userConsent');
const DataProcessingLog = require('../models/dataProcessingLog');
const User = require('../models/user');
const { authenticateToken } = require('../middleware/authMiddleware'); // 🔒 Middleware correto

// ✅ Rota: Registar ou retirar consentimento
router.post('/consent', authenticateToken, async (req, res) => {
    try {
        const { consent_type, consent_given, consent_text } = req.body;
        const user_id = req.user.id;
        const ip_address = req.ip;

        const consent = await UserConsent.create({
            user_id,
            consent_type,
            consent_given,
            consent_date: new Date(),
            consent_method: 'web',
            ip_address,
            consent_text,
            is_active: consent_given
        });

        await DataProcessingLog.create({
            user_id,
            action_type: consent_given ? 'consent_given' : 'consent_withdrawn',
            data_category: consent_type,
            action_description: `Consentimento ${consent_given ? 'dado' : 'retirado'} para ${consent_type}`,
            ip_address,
            performed_by: user_id,
            legal_basis: 'Art. 6(1)(a) GDPR - Consent'
        });

        res.json({
            success: true,
            message: `Consentimento ${consent_given ? 'registado' : 'retirado'} com sucesso`,
            consent
        });
    } catch (error) {
        console.error('Erro ao registar consentimento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Rota: Obter consentimentos ativos do utilizador
router.get('/consents', authenticateToken, async (req, res) => {
    try {
        const consents = await UserConsent.findAll({
            where: { user_id: req.user.id, is_active: true }
        });
        res.json({ success: true, consents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Rota: Exportar dados (Direito à Portabilidade)
router.get('/export-data', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;

        const userData = await User.findByPk(user_id, {
            include: ['empresas', 'modulos', 'submodulos']
        });

        const RegistoPontoObra = require('../models/registoPontoObra');
        const FaltasFerias = require('../models/faltas_ferias');

        const [registosPonto, faltasFerias, consents] = await Promise.all([
            RegistoPontoObra.findAll({ where: { user_id } }),
            FaltasFerias.findAll({ where: { user_id } }),
            UserConsent.findAll({ where: { user_id } })
        ]);

        const exportData = {
            user_data: userData,
            time_records: registosPonto,
            absences_holidays: faltasFerias,
            consents,
            export_date: new Date().toISOString(),
            format: 'JSON'
        };

        await DataProcessingLog.create({
            user_id,
            action_type: 'data_export',
            action_description: 'Exportação completa de dados pessoais',
            ip_address: req.ip,
            performed_by: user_id,
            legal_basis: 'Art. 20 GDPR - Right to data portability'
        });

        res.json({ success: true, message: 'Dados exportados com sucesso', data: exportData });
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Rota: Pedido de eliminação de dados
router.post('/request-deletion', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { reason } = req.body;

        await DataProcessingLog.create({
            user_id,
            action_type: 'data_deletion',
            action_description: `Pedido de eliminação de dados. Motivo: ${reason || 'Não especificado'}`,
            ip_address: req.ip,
            performed_by: user_id,
            legal_basis: 'Art. 17 GDPR - Right to erasure'
        });

        res.json({
            success: true,
            message: 'Pedido de eliminação de dados registado. Será processado nos próximos 30 dias conforme o RGPD.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Rota: Histórico de logs (tratamento de dados)
router.get('/processing-history', authenticateToken, async (req, res) => {
    try {
        const logs = await DataProcessingLog.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
