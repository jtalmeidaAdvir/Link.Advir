
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshTokensOnAppFocus, startTokenValidation, stopTokenValidation } from './authUtils';

// Componente global para gerenciar tokens em qualquer página
export const TokenManager = ({ children }) => {
    useEffect(() => {
        // Verificar tokens imediatamente quando o componente monta
        const checkTokensOnMount = async () => {
            try {
                await refreshTokensOnAppFocus();
            } catch (error) {
                console.error('Erro ao verificar tokens na montagem:', error);
            }
        };

        checkTokensOnMount();

        // Iniciar verificação automática periódica
        startTokenValidation();

        // Configurar listener para mudanças no estado do app (mobile)
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('App voltou ao primeiro plano, verificando tokens...');
                refreshTokensOnAppFocus();
            }
        };

        // Listener para quando a janela/tab ganha foco (web)
        const handleAppFocus = () => {
            console.log('App ganhou foco, verificando tokens...');
            refreshTokensOnAppFocus();
        };

        // Adicionar listeners
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        window.addEventListener('focus', handleAppFocus);

        // Para mobile - quando a página se torna visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                handleAppFocus();
            }
        });

        // Cleanup
        return () => {
            stopTokenValidation();
            subscription?.remove();
            window.removeEventListener('focus', handleAppFocus);
            document.removeEventListener('visibilitychange', handleAppFocus);
        };
    }, []);

    return children;
};

// Hook simples para usar em qualquer componente
export const useTokenManager = () => {
    useEffect(() => {
        const checkTokensOnMount = async () => {
            try {
                await refreshTokensOnAppFocus();
            } catch (error) {
                console.error('Erro ao verificar tokens:', error);
            }
        };

        checkTokensOnMount();
    }, []);
};

export default TokenManager;
