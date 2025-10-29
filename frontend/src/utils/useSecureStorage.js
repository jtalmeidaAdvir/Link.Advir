
import { useState, useEffect } from 'react';
import { secureStorage } from './secureStorage';

/**
 * Hook para usar secureStorage de forma reativa
 * Similar ao useState mas persiste no localStorage encriptado
 */
export const useSecureStorage = (key, initialValue) => {
    // Estado para armazenar o valor
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = secureStorage.getItem(key);
            return item ? item : initialValue;
        } catch (error) {
            console.error(`Erro ao ler ${key}:`, error);
            return initialValue;
        }
    });

    // Função para atualizar o valor
    const setValue = (value) => {
        try {
            // Permite que value seja uma função (como setState)
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            
            setStoredValue(valueToStore);
            secureStorage.setItem(key, valueToStore);
        } catch (error) {
            console.error(`Erro ao guardar ${key}:`, error);
        }
    };

    return [storedValue, setValue];
};

/**
 * Hook apenas para ler do secureStorage
 */
export const useSecureStorageValue = (key, defaultValue = null) => {
    const [value, setValue] = useState(() => {
        return secureStorage.getItem(key) || defaultValue;
    });

    useEffect(() => {
        const currentValue = secureStorage.getItem(key);
        if (currentValue !== value) {
            setValue(currentValue || defaultValue);
        }
    }, [key, defaultValue]);

    return value;
};

export default useSecureStorage;
