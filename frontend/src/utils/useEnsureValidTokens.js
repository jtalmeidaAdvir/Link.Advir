
import { useEffect } from 'react';
import { refreshTokensOnAppFocus } from './authUtils';

// Hook simples para garantir tokens válidos em páginas específicas
export const useEnsureValidTokens = () => {
    useEffect(() => {
        const ensureTokensValid = async () => {
            try {
                console.log('Verificando validade dos tokens...');
                await refreshTokensOnAppFocus();
            } catch (error) {
                console.error('Erro ao verificar tokens:', error);
            }
        };

        ensureTokensValid();
    }, []);
};

export default useEnsureValidTokens;
