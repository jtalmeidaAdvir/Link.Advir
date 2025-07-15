
import { useEffect } from 'react';
import { startTokenValidation, stopTokenValidation } from './authUtils';

// Hook personalizado para gerenciar verificação automática de token
export const useTokenValidation = (enabled = true) => {
    useEffect(() => {
        if (enabled) {
            startTokenValidation();
        }

        return () => {
            if (enabled) {
                stopTokenValidation();
            }
        };
    }, [enabled]);
};

export default useTokenValidation;
