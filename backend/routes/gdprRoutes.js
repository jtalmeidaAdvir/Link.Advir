// routes/rgpdRoutes.js
const express = require('express');
const router = express.Router();

const UserConsent = require('../models/userConsent');
const DataProcessingLog = require('../models/dataProcessingLog');
const User = require('../models/user');

const authMiddleware = require('../middleware/authMiddleware');
const { requireConsent } = require('../middleware/consentMiddleware');

// Helper: require tolerante
const safeRequire = (path) => {
  try {
    return require(path);
  } catch (e) {
    console.warn(`[GDPR] Módulo não encontrado: ${path}`);
    return null;
  }
};

// GET /api/gdpr/export-data
router.get('/export-data', 
  authMiddleware, 
  // se quiseres MESMO obrigar consentimento, deixa a linha seguinte:
  requireConsent('data_processing'),
  async (req, res) => {
    try {
      const user_id = req.user.id;

      // 1) Montar includes apenas se os aliases existirem
      const wantedAliases = ['empresas', 'modulos', 'submodulos'];
      const includes = [];
      for (const as of wantedAliases) {
        if (User.associations && User.associations[as]) {
          includes.push({ association: User.associations[as] });
        }
      }

      // 2) Buscar dados do utilizador com/sem includes conforme existam
      let userData;
      if (includes.length > 0) {
        userData = await User.findByPk(user_id, { include: includes });
      } else {
        userData = await User.findByPk(user_id);
      }
      const userJson = userData ? userData.toJSON() : null;

      // 3) Carregar modelos opcionais em segurança
      const RegistoPontoObra = safeRequire('../models/registoPontoObra');
      const FaltasFerias = safeRequire('../models/faltasFerias') 
                        || safeRequire('../models/faltas_ferias');

      // 4) Pedidos em paralelo, caindo para [] se o modelo não existir
      const [registosPonto, faltasOuFerias, consents] = await Promise.all([
        RegistoPontoObra ? RegistoPontoObra.findAll({ where: { user_id } }) : Promise.resolve([]),
        FaltasFerias ? FaltasFerias.findAll({ where: { user_id } }) : Promise.resolve([]),
        UserConsent.findAll({ where: { user_id } })
      ]);

      const exportData = {
        user_data: userJson,
        time_records: registosPonto?.map(r => r.toJSON ? r.toJSON() : r) || [],
        absences_holidays: faltasOuFerias?.map(f => f.toJSON ? f.toJSON() : f) || [],
        consents: consents?.map(c => c.toJSON ? c.toJSON() : c) || [],
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

      return res.json({ success: true, message: 'Dados exportados com sucesso', data: exportData });
    } catch (e) {
      console.error('[GDPR] export-data falhou:', e);
      return res
        .status(500)
        .json({ success: false, error: e.message || 'Erro interno', code: 'EXPORT_DATA_FAIL' });
    }
  }
);

module.exports = router;
