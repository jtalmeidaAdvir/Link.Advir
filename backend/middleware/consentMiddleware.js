
const UserConsent = require('../models/userConsent');

const requireConsent = (consentType) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Utilizador não autenticado' 
                });
            }

            const consent = await UserConsent.findOne({
                where: {
                    user_id: userId,
                    consent_type: consentType,
                    consent_given: true,
                    is_active: true
                }
            });

            if (!consent) {
                return res.status(403).json({
                    success: false,
                    error: `Consentimento necessário para ${consentType}`,
                    consent_required: consentType,
                    message: 'Por favor, autorize o tratamento destes dados nas definições de privacidade.'
                });
            }

            next();
        } catch (error) {
            console.error('Erro ao verificar consentimento:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };
};

module.exports = { requireConsent };
