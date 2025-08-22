
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshTokensOnAppFocus } from '../../../utils/authUtils';

// Hook para renovar tokens automaticamente quando o app volta ao primeiro plano
export const useAppStateRefresh = () => {
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('App voltou ao primeiro plano, verificando tokens...');
                refreshTokensOnAppFocus();
            }
        };

        // Adicionar listener para mudanças no estado do app
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            // Cleanup do listener
            subscription?.remove();
        };
    }, []);
};

export default useAppStateRefresh;
