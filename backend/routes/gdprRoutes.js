const express = require('express');
const router = express.Router();
const UserConsent = require('../models/userConsent');
const DataProcessingLog = require('../models/dataProcessingLog');
const User = require('../models/user');

const authMiddleware = require('../middleware/authMiddleware'); // <— sem {}
const { requireConsent } = require('../middleware/consentMiddleware'); // <— com {}, e CHAMA

// POST /api/gdpr/consent — registar/retirar consentimento
router.post('/consent', authMiddleware, async (req, res) => {
  try {
    const { consent_type, consent_given, consent_text } = req.body;
    const user_id = req.user.id;

    const consent = await UserConsent.create({
      user_id,
      consent_type,
      consent_given,
      consent_date: new Date(),
      consent_method: 'web',
      ip_address: req.ip,
      consent_text,
      is_active: consent_given
    });

    await DataProcessingLog.create({
      user_id,
      action_type: consent_given ? 'consent_given' : 'consent_withdrawn',
      data_category: consent_type,
      action_description: `Consentimento ${consent_given ? 'dado' : 'retirado'} para ${consent_type}`,
      ip_address: req.ip,
      performed_by: user_id,
      legal_basis: 'Art. 6(1)(a) GDPR - Consent'
    });

    return res.json({ success:true, message:`Consentimento ${consent_given ? 'registado' : 'retirado'} com sucesso`, consent });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
});

// GET /api/gdpr/consents — lista de consentimentos ativos
router.get('/consents', authMiddleware, async (req, res) => {
  try {
    const consents = await UserConsent.findAll({ where: { user_id: req.user.id, is_active: true } });
    return res.json({ success:true, consents });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
});

// GET /api/gdpr/export-data — portabilidade (requer consentimento data_processing)
router.get('/export-data', authMiddleware, requireConsent('data_processing'), async (req, res) => {
  try {
    const user_id = req.user.id;

    const userData = await User.findByPk(user_id, { include: ['empresas','modulos','submodulos'] });

    const RegistoPontoObra = require('../models/registoPontoObra');
    // Atenção ao nome do ficheiro/modelo: se o teu ficheiro é `faltasFerias.js`, usa esse:
    const FaltasFerias = require('../models/faltas_ferias'); // ← evita `faltas_ferias` se o ficheiro não existe assim

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

    return res.json({ success:true, message:'Dados exportados com sucesso', data: exportData });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
});

// POST /api/gdpr/request-deletion — direito ao apagamento (podes exigir também consentimento se quiseres)
router.post('/request-deletion', authMiddleware, async (req, res) => {
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

    return res.json({ success:true, message:'Pedido registado. Será processado nos próximos 30 dias.' });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
});

// GET /api/gdpr/processing-history — histórico de tratamentos
router.get('/processing-history', authMiddleware, async (req, res) => {
  try {
    const logs = await DataProcessingLog.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt','DESC']],
      limit: 100
    });
    return res.json({ success:true, logs });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
});

module.exports = router;
